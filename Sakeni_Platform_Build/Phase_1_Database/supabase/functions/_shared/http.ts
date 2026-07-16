export class HttpError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "HttpError";
    this.status = status;
  }
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SAFE_REQUEST_ID_PATTERN = /^[a-zA-Z0-9._:-]{1,120}$/;
const rateBuckets = new Map<string, { count: number; resetAt: number }>();

export function requestIdFrom(req: Request) {
  const incoming = req.headers.get("x-request-id") ?? "";
  if (SAFE_REQUEST_ID_PATTERN.test(incoming)) return incoming;
  return crypto.randomUUID();
}

function allowedOrigins() {
  return (Deno.env.get("ALLOWED_ORIGINS") ?? "http://localhost:3000")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

export function corsContext(req: Request) {
  const requestOrigin = req.headers.get("Origin") ?? "";
  const origins = allowedOrigins();
  const originAllowed = !requestOrigin || origins.includes(requestOrigin);
  const headers: HeadersInit = {
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-request-id",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
    "X-Request-Id": requestIdFrom(req),
  };

  if (requestOrigin && originAllowed) {
    headers["Access-Control-Allow-Origin"] = requestOrigin;
  }

  return { headers, originAllowed };
}

export function jsonResponse(body: unknown, init: { status?: number; headers?: HeadersInit } = {}) {
  return new Response(JSON.stringify(body), {
    status: init.status ?? 200,
    headers: { ...(init.headers ?? {}), "Content-Type": "application/json" },
  });
}

export function errorResponse(error: unknown, headers: HeadersInit = {}) {
  if (error instanceof HttpError) {
    return jsonResponse({ error: error.message }, { status: error.status, headers });
  }
  return jsonResponse({ error: "Internal server error" }, { status: 500, headers });
}

export async function readJsonBody(req: Request, maxChars = 32_768) {
  const contentLength = Number(req.headers.get("content-length") ?? "0");
  if (Number.isFinite(contentLength) && contentLength > maxChars) {
    throw new HttpError(413, "Request body too large");
  }

  const text = await req.text();
  if (text.length > maxChars) throw new HttpError(413, "Request body too large");

  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new HttpError(400, "Malformed JSON");
  }
}

export function assertPlainObject(value: unknown, label = "body") {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new HttpError(400, `${label} must be an object`);
  }
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    throw new HttpError(400, `${label} must be a plain object`);
  }
  return value as Record<string, unknown>;
}

export function assertOnlyKeys(value: Record<string, unknown>, allowedKeys: string[], label = "body") {
  const allowed = new Set(allowedKeys);
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) throw new HttpError(400, `${label} contains unsupported field: ${key}`);
  }
}

export function assertUuid(value: unknown, label = "id") {
  if (typeof value !== "string" || !UUID_PATTERN.test(value.trim())) {
    throw new HttpError(400, `${label} must be a valid UUID`);
  }
  return value.trim();
}

export function assertString(value: unknown, label: string, options: { min?: number; max?: number } = {}) {
  if (typeof value !== "string") throw new HttpError(400, `${label} must be a string`);
  const trimmed = value.trim();
  const min = options.min ?? 0;
  const max = options.max ?? 500;
  if (trimmed.length < min || trimmed.length > max) {
    throw new HttpError(400, `${label} length is invalid`);
  }
  return trimmed;
}

export function assertHttpsUrl(value: unknown, label: string) {
  const input = assertString(value, label, { min: 8, max: 2048 });
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    throw new HttpError(400, `${label} must be a valid URL`);
  }
  if (url.protocol !== "https:" || url.username || url.password) {
    throw new HttpError(400, `${label} must be an HTTPS URL`);
  }
  return url.toString();
}

export function optionalUuidArray(value: unknown, label: string, maxLength = 100) {
  if (value === undefined) return [];
  if (!Array.isArray(value)) throw new HttpError(400, `${label} must be an array`);
  if (value.length > maxLength) throw new HttpError(400, `${label} has too many items`);
  return value.map((item, index) => assertUuid(item, `${label}[${index}]`));
}

export function requireEnv(key: string) {
  const value = Deno.env.get(key)?.trim();
  if (!value) throw new HttpError(500, "Required server configuration is missing");
  return value;
}

export function bearerToken(req: Request) {
  const header = req.headers.get("Authorization") ?? "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  if (!match?.[1]) throw new HttpError(401, "Unauthorized");
  return match[1].trim();
}

export function checkRateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const current = rateBuckets.get(key);
  if (!current || current.resetAt <= now) {
    rateBuckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfter: 0 };
  }

  if (current.count >= limit) {
    return { allowed: false, retryAfter: Math.ceil((current.resetAt - now) / 1000) };
  }

  current.count += 1;
  return { allowed: true, retryAfter: 0 };
}

export async function fetchWithTimeout(input: string, init: RequestInit, timeoutMs: number) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}
