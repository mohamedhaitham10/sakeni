type EnvSource = Record<string, string | undefined>;

const LOCALHOST_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

export class ConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConfigurationError";
  }
}

function readRequiredEnv(env: EnvSource, key: string) {
  const value = env[key]?.trim();
  if (!value) {
    throw new ConfigurationError(`Missing required environment variable: ${key}`);
  }
  return value;
}

function assertHttpsUrl(value: string, key: string) {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new ConfigurationError(`${key} must be a valid URL`);
  }

  if (parsed.protocol !== "https:" && !LOCALHOST_HOSTS.has(parsed.hostname)) {
    throw new ConfigurationError(`${key} must use HTTPS outside local development`);
  }

  return parsed.toString().replace(/\/$/, "");
}

function assertPublicAnonKey(value: string) {
  if (/service[_-]?role/i.test(value)) {
    throw new ConfigurationError("NEXT_PUBLIC_SUPABASE_ANON_KEY must not contain a service-role key");
  }
  return value;
}

export function getSupabaseServerEnv(env: EnvSource = process.env) {
  return {
    url: assertHttpsUrl(readRequiredEnv(env, "NEXT_PUBLIC_SUPABASE_URL"), "NEXT_PUBLIC_SUPABASE_URL"),
    anonKey: assertPublicAnonKey(readRequiredEnv(env, "NEXT_PUBLIC_SUPABASE_ANON_KEY")),
  };
}

export function parseAllowedOrigins(
  rawValue: string | undefined,
  options: { nodeEnv?: string } = {},
) {
  const nodeEnv = options.nodeEnv ?? process.env.NODE_ENV ?? "development";
  const rawOrigins = (rawValue ?? (nodeEnv === "production" ? "" : "http://localhost:3000"))
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  if (rawOrigins.length === 0) {
    throw new ConfigurationError("ALLOWED_ORIGINS must include at least one exact origin");
  }

  return rawOrigins.map((origin) => {
    if (origin === "*") {
      throw new ConfigurationError("ALLOWED_ORIGINS must not contain wildcard origins");
    }

    let parsed: URL;
    try {
      parsed = new URL(origin);
    } catch {
      throw new ConfigurationError(`Invalid origin in ALLOWED_ORIGINS: ${origin}`);
    }

    if (parsed.pathname !== "/" || parsed.search || parsed.hash) {
      throw new ConfigurationError(`ALLOWED_ORIGINS entries must be origins only: ${origin}`);
    }

    const isLocalhost = LOCALHOST_HOSTS.has(parsed.hostname);
    if (nodeEnv === "production" && (parsed.protocol !== "https:" || isLocalhost)) {
      throw new ConfigurationError("Production ALLOWED_ORIGINS entries must be HTTPS non-localhost origins");
    }

    return parsed.origin;
  });
}
