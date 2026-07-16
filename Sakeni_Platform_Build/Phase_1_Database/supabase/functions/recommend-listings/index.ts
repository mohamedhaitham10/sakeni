import OpenAI from "https://deno.land/x/openai/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import {
  HttpError,
  assertOnlyKeys,
  assertPlainObject,
  assertString,
  assertUuid,
  bearerToken,
  checkRateLimit,
  corsContext,
  errorResponse,
  jsonResponse,
  optionalUuidArray,
  readJsonBody,
  requireEnv,
} from "../_shared/http.ts";

function parseFilters(value: unknown) {
  if (value === undefined) return {};
  const filters = assertPlainObject(value, "filters");
  const entries = Object.entries(filters);
  if (entries.length > 20) throw new HttpError(400, "filters has too many fields");

  const safeFilters: Record<string, string | number | boolean | null> = {};
  for (const [key, rawValue] of entries) {
    if (!/^[a-zA-Z0-9_]{1,40}$/.test(key)) throw new HttpError(400, "filters contains an invalid key");
    if (rawValue === null || typeof rawValue === "boolean") {
      safeFilters[key] = rawValue;
    } else if (typeof rawValue === "number" && Number.isFinite(rawValue) && Math.abs(rawValue) <= 1_000_000) {
      safeFilters[key] = rawValue;
    } else if (typeof rawValue === "string") {
      safeFilters[key] = assertString(rawValue, `filters.${key}`, { max: 200 });
    } else {
      throw new HttpError(400, `filters.${key} has an unsupported value`);
    }
  }
  return safeFilters;
}

function parseRankedIds(content: string | null, candidateIds: Set<string>) {
  if (!content) return [];
  try {
    const parsed = assertPlainObject(JSON.parse(content), "recommendation result");
    const ranked = parsed.ranked_ids;
    if (!Array.isArray(ranked)) return [];
    return ranked
      .filter((id): id is string => typeof id === "string" && candidateIds.has(id))
      .slice(0, 5);
  } catch {
    return [];
  }
}

Deno.serve(async (req) => {
  const cors = corsContext(req);
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: cors.originAllowed ? 200 : 403, headers: cors.headers });
  }
  if (!cors.originAllowed) return jsonResponse({ error: "Forbidden origin" }, { status: 403, headers: cors.headers });
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, { status: 405, headers: cors.headers });

  try {
    const body = assertPlainObject(await readJsonBody(req), "body");
    assertOnlyKeys(body, ["student_id", "viewed_listing_ids", "saved_listing_ids", "filters"]);

    const studentId = assertUuid(body.student_id, "student_id");
    const viewedListingIds = optionalUuidArray(body.viewed_listing_ids, "viewed_listing_ids", 100);
    const savedListingIds = optionalUuidArray(body.saved_listing_ids, "saved_listing_ids", 100);
    const filters = parseFilters(body.filters);

    const supabase = createClient(requireEnv("SUPABASE_URL"), requireEnv("SUPABASE_SERVICE_ROLE_KEY"));
    const token = bearerToken(req);
    const { data: authData, error: authError } = await supabase.auth.getUser(token);
    if (authError || !authData.user) throw new HttpError(401, "Unauthorized");
    if (authData.user.id !== studentId) throw new HttpError(403, "Forbidden");

    const rate = checkRateLimit(`recommend:${authData.user.id}`, 30, 60_000);
    if (!rate.allowed) {
      return jsonResponse(
        { error: "Too many requests" },
        { status: 429, headers: { ...cors.headers, "Retry-After": String(rate.retryAfter) } },
      );
    }

    const { data: profile } = await supabase.from("profiles").select("university").eq("id", studentId).single();

    let query = supabase
      .from("listings")
      .select("id, title, listing_type, monthly_rent, area, nearest_university, distance_to_university_km, is_furnished, has_wifi")
      .eq("status", "active")
      .limit(50);

    if (viewedListingIds.length > 0) {
      query = query.not("id", "in", `(${viewedListingIds.join(",")})`);
    }

    const { data: listings, error: listingsError } = await query;
    if (listingsError) throw new HttpError(500, "Unable to load recommendations");

    const candidateIds = new Set((listings ?? []).map((listing) => String(listing.id)));
    const openAiKey = Deno.env.get("OPENAI_API_KEY")?.trim();
    if (!openAiKey) {
      return jsonResponse({
        ranked_ids: [...candidateIds].slice(0, 5),
        provider: "local",
      }, { headers: cors.headers });
    }

    const openai = new OpenAI({ apiKey: openAiKey });
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      messages: [{
        role: "system",
        content: "Rank student housing listings. Return JSON only: {\"ranked_ids\":[\"uuid\"]}.",
      }, {
        role: "user",
        content: JSON.stringify({
          student: { university: profile?.university, filters },
          saved_ids: savedListingIds,
          candidates: listings,
        }),
      }],
    });

    const rankedIds = parseRankedIds(completion.choices[0].message.content, candidateIds);
    return jsonResponse({ ranked_ids: rankedIds, provider: "openai" }, { headers: cors.headers });
  } catch (error) {
    return errorResponse(error, cors.headers);
  }
});
