"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "./supabase-server";
import {
  adminAuditActor,
  assertAdminProfile,
  assertUuid,
  sanitizeModerationReason,
  toPublicActionError,
} from "./admin-security";
import { redactSensitive } from "./security-log";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

async function requireAdmin(supabase: SupabaseServerClient) {
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) throw new Error("Unauthorized");

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role,is_active")
    .eq("id", authData.user.id)
    .single();

  if (profileError) throw new Error("Forbidden");
  assertAdminProfile(profile);
  return authData.user.id;
}

async function recordAuditEvent(
  supabase: SupabaseServerClient,
  event: {
    actorId: string;
    action: string;
    targetId: string;
    outcome: "success" | "failure";
    metadata?: Record<string, unknown>;
  },
) {
  await supabase.from("audit_events").insert({
    actor_id: event.actorId,
    action: event.action,
    target_type: "listing",
    target_id: event.targetId,
    outcome: event.outcome,
    metadata: redactSensitive(event.metadata ?? {}),
  });
}

export async function approveListing(listingId: string) {
  const supabase = await createClient();
  let adminId = "";
  let id = "";

  try {
    id = assertUuid(listingId, "listingId");
    adminId = await requireAdmin(supabase);

    const { error } = await supabase
      .from("listings")
      .update({
        status: "active",
        admin_notes: `Approved by ${adminAuditActor(adminId)}`,
      })
      .eq("id", id)
      .in("status", ["pending_review", "flagged", "rejected"]);

    if (error) throw error;
    await recordAuditEvent(supabase, {
      actorId: adminId,
      action: "listing.approve",
      targetId: id,
      outcome: "success",
    });
    revalidatePath("/");
  } catch (error) {
    if (adminId && id) {
      await recordAuditEvent(supabase, {
        actorId: adminId,
        action: "listing.approve",
        targetId: id,
        outcome: "failure",
        metadata: { reason: error instanceof Error ? error.message : "unknown" },
      }).catch(() => undefined);
    }
    throw toPublicActionError(error);
  }
}

export async function rejectListing(listingId: string, reason: string) {
  const supabase = await createClient();
  let adminId = "";
  let id = "";

  try {
    id = assertUuid(listingId, "listingId");
    const safeReason = sanitizeModerationReason(reason);
    adminId = await requireAdmin(supabase);

    const { error } = await supabase
      .from("listings")
      .update({
        status: "rejected",
        flagged_reason: safeReason,
        admin_notes: `Rejected by ${adminAuditActor(adminId)}`,
      })
      .eq("id", id)
      .in("status", ["pending_review", "flagged", "active"]);

    if (error) throw error;
    await recordAuditEvent(supabase, {
      actorId: adminId,
      action: "listing.reject",
      targetId: id,
      outcome: "success",
      metadata: { reason: safeReason },
    });
    revalidatePath("/");
  } catch (error) {
    if (adminId && id) {
      await recordAuditEvent(supabase, {
        actorId: adminId,
        action: "listing.reject",
        targetId: id,
        outcome: "failure",
        metadata: { reason: error instanceof Error ? error.message : "unknown" },
      }).catch(() => undefined);
    }
    throw toPublicActionError(error);
  }
}
