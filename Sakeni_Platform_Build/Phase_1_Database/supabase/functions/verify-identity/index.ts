import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import {
  HttpError,
  assertHttpsUrl,
  assertOnlyKeys,
  assertPlainObject,
  assertUuid,
  bearerToken,
  checkRateLimit,
  corsContext,
  errorResponse,
  fetchWithTimeout,
  jsonResponse,
  readJsonBody,
  requireEnv,
} from "../_shared/http.ts";

const GOVERNMENT_ID_TYPES = new Set(["egyptian_national_id", "passport", "residence_permit"]);

type VerifyRequest = {
  user_id: string;
  government_id_type: "egyptian_national_id" | "passport" | "residence_permit";
  government_id_url: string;
  selfie_url: string;
};

function fallbackScore(input: VerifyRequest) {
  const seed = `${input.user_id}:${input.government_id_type}:${input.government_id_url}:${input.selfie_url}`;
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) hash = (hash * 31 + seed.charCodeAt(i)) % 10000;
  return Math.min(0.98, 0.82 + (hash % 16) / 100);
}

function parseVerifyRequest(value: unknown): VerifyRequest {
  const body = assertPlainObject(value, "body");
  assertOnlyKeys(body, ["user_id", "government_id_type", "government_id_url", "selfie_url"]);

  const governmentIdType = body.government_id_type;
  if (typeof governmentIdType !== "string" || !GOVERNMENT_ID_TYPES.has(governmentIdType)) {
    throw new HttpError(422, "Only official government-issued IDs are accepted");
  }

  return {
    user_id: assertUuid(body.user_id, "user_id"),
    government_id_type: governmentIdType as VerifyRequest["government_id_type"],
    government_id_url: assertHttpsUrl(body.government_id_url, "government_id_url"),
    selfie_url: assertHttpsUrl(body.selfie_url, "selfie_url"),
  };
}

function providerFallbackAllowed() {
  const appEnv = Deno.env.get("APP_ENV") ?? Deno.env.get("ENVIRONMENT") ?? "production";
  return Deno.env.get("ALLOW_DEV_FACE_MATCH_FALLBACK") === "true" && appEnv !== "production";
}

Deno.serve(async (req) => {
  const cors = corsContext(req);
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: cors.originAllowed ? 200 : 403, headers: cors.headers });
  }
  if (!cors.originAllowed) return jsonResponse({ error: "Forbidden origin" }, { status: 403, headers: cors.headers });
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, { status: 405, headers: cors.headers });

  try {
    const supabase = createClient(requireEnv("SUPABASE_URL"), requireEnv("SUPABASE_SERVICE_ROLE_KEY"));
    const token = bearerToken(req);
    const { data: authData, error: authError } = await supabase.auth.getUser(token);
    if (authError || !authData.user) throw new HttpError(401, "Unauthorized");

    const body = parseVerifyRequest(await readJsonBody(req, 16_384));
    if (authData.user.id !== body.user_id) throw new HttpError(403, "Forbidden");

    const rate = checkRateLimit(`verify-identity:${authData.user.id}`, 8, 60 * 60 * 1000);
    if (!rate.allowed) {
      return jsonResponse(
        { error: "Too many verification attempts" },
        { status: 429, headers: { ...cors.headers, "Retry-After": String(rate.retryAfter) } },
      );
    }

    const apiUrl = Deno.env.get("FACE_MATCH_API_URL")?.trim();
    const apiKey = Deno.env.get("FACE_MATCH_API_KEY")?.trim();
    let score: number;
    let provider = "external";

    if (!apiUrl || !apiKey) {
      if (!providerFallbackAllowed()) {
        throw new HttpError(503, "Face match provider is not configured");
      }
      score = fallbackScore(body);
      provider = "dev-fallback";
    } else {
      const providerUrl = assertHttpsUrl(apiUrl, "FACE_MATCH_API_URL");
      const apiResponse = await fetchWithTimeout(providerUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          id_image_url: body.government_id_url,
          selfie_image_url: body.selfie_url,
        }),
      }, 12_000);

      if (!apiResponse.ok) throw new HttpError(502, "Face match provider failed");

      const providerResult = assertPlainObject(await apiResponse.json(), "face match response");
      score = Number(providerResult.score ?? providerResult.confidence);
      if (!Number.isFinite(score) || score < 0 || score > 1) {
        throw new HttpError(502, "Face match provider returned an invalid score");
      }
    }

    const passed = score >= 0.82;
    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        government_id_type: body.government_id_type,
        government_id_url: body.government_id_url,
        selfie_url: body.selfie_url,
        face_match_score: score,
        face_match_status: passed ? "verified" : "rejected",
        face_match_checked_at: new Date().toISOString(),
      })
      .eq("id", authData.user.id);

    if (updateError) throw new HttpError(500, "Unable to save verification result");

    return jsonResponse({ passed, score, provider }, { headers: cors.headers });
  } catch (error) {
    return errorResponse(error, cors.headers);
  }
});
