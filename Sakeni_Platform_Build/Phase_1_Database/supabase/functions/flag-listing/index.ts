import OpenAI from "https://deno.land/x/openai/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import {
  HttpError,
  assertOnlyKeys,
  assertPlainObject,
  assertString,
  assertUuid,
  errorResponse,
  jsonResponse,
  readJsonBody,
  requireEnv,
  requestIdFrom,
} from "../_shared/http.ts";

function safeEqual(a: string, b: string) {
  const encoder = new TextEncoder();
  const left = encoder.encode(a);
  const right = encoder.encode(b);
  let diff = left.length ^ right.length;
  for (let i = 0; i < Math.max(left.length, right.length); i += 1) {
    diff |= (left[i] ?? 0) ^ (right[i] ?? 0);
  }
  return diff === 0;
}

function parseWebhookTimestamp(value: string | null) {
  if (!value) throw new HttpError(400, "Missing webhook timestamp");
  const parsed = /^\d+$/.test(value)
    ? Number(value.length > 10 ? value : `${value}000`)
    : Date.parse(value);
  if (!Number.isFinite(parsed)) throw new HttpError(400, "Invalid webhook timestamp");
  if (Math.abs(Date.now() - parsed) > 10 * 60 * 1000) {
    throw new HttpError(401, "Webhook timestamp outside replay window");
  }
}

function parseEventId(value: string | null) {
  if (!value || !/^[a-zA-Z0-9._:-]{1,160}$/.test(value)) {
    throw new HttpError(400, "Missing or invalid webhook event id");
  }
  return value;
}

function parseListingRecord(value: unknown) {
  const record = assertPlainObject(value, "record");
  const id = assertUuid(record.id, "record.id");
  return {
    id,
    title: assertString(record.title, "record.title", { min: 1, max: 180 }),
    description: typeof record.description === "string" ? assertString(record.description, "record.description", { max: 4000 }) : "",
    monthly_rent: Number(record.monthly_rent ?? 0),
    city: typeof record.city === "string" ? assertString(record.city, "record.city", { max: 80 }) : "",
    area: typeof record.area === "string" ? assertString(record.area, "record.area", { max: 120 }) : "",
    listing_type: typeof record.listing_type === "string" ? assertString(record.listing_type, "record.listing_type", { max: 40 }) : "",
  };
}

function parseFraudResult(content: string | null) {
  if (!content) return { score: 0, reasons: [] as string[] };
  const parsed = assertPlainObject(JSON.parse(content), "fraud result");
  const score = Number(parsed.score);
  const reasons = Array.isArray(parsed.reasons)
    ? parsed.reasons
      .filter((reason): reason is string => typeof reason === "string")
      .map((reason) => reason.replace(/\s+/g, " ").trim())
      .filter(Boolean)
      .slice(0, 8)
    : [];

  return {
    score: Number.isFinite(score) ? Math.max(0, Math.min(1, score)) : 0,
    reasons,
  };
}

Deno.serve(async (req) => {
  const headers = { "X-Request-Id": requestIdFrom(req) };
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, { status: 405, headers });

  try {
    const webhookSecret = requireEnv("FLAG_LISTING_WEBHOOK_SECRET");
    const suppliedSecret = req.headers.get("x-sakeni-webhook-secret") ?? "";
    if (!safeEqual(suppliedSecret, webhookSecret)) throw new HttpError(401, "Unauthorized");

    parseWebhookTimestamp(req.headers.get("x-sakeni-timestamp"));
    const eventId = parseEventId(req.headers.get("x-sakeni-event-id"));

    const supabase = createClient(requireEnv("SUPABASE_URL"), requireEnv("SUPABASE_SERVICE_ROLE_KEY"));
    const body = assertPlainObject(await readJsonBody(req, 65_536), "body");
    assertOnlyKeys(body, ["record", "type", "table", "schema", "old_record"]);
    const record = parseListingRecord(body.record);

    const { error: eventError } = await supabase.from("webhook_events").insert({
      event_id: eventId,
      source: "supabase.listings",
      action: "listing.fraud_scan",
      listing_id: record.id,
    });
    if (eventError) {
      if (eventError.code === "23505") {
        return jsonResponse({ success: true, duplicate: true }, { headers });
      }
      throw new HttpError(500, "Unable to record webhook event");
    }

    const openai = new OpenAI({ apiKey: requireEnv("OPENAI_API_KEY") });
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      messages: [{
        role: "system",
        content: "Score this housing listing for fraud risk from 0.00 to 1.00. Return JSON: {\"score\":0.00,\"reasons\":[\"reason\"]}.",
      }, {
        role: "user",
        content: JSON.stringify(record),
      }],
    });

    const result = parseFraudResult(completion.choices[0].message.content);

    if (result.score > 0.7) {
      const { error: updateError } = await supabase
        .from("listings")
        .update({
          status: "flagged",
          ai_flag_score: result.score,
          flagged_reason: result.reasons.join(", ").slice(0, 1000),
        })
        .eq("id", record.id);
      if (updateError) throw new HttpError(500, "Unable to flag listing");
    }

    return jsonResponse({ success: true, ai_flag_score: result.score }, { headers });
  } catch (error) {
    return errorResponse(error, headers);
  }
});
