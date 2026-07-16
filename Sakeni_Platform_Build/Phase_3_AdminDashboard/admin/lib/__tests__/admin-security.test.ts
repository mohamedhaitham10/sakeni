import { describe, expect, it } from "vitest";
import {
  AuthorizationError,
  ValidationError,
  adminAuditActor,
  assertAdminProfile,
  assertUuid,
  sanitizeModerationReason,
  toPublicActionError,
} from "../admin-security";

describe("admin moderation security helpers", () => {
  it("given a forged listing id when validating an admin action then it is rejected before database access", () => {
    expect(() => assertUuid("not-a-uuid", "listingId")).toThrow(ValidationError);
  });

  it("given an inactive or non-admin profile when checking admin access then it is denied", () => {
    expect(() => assertAdminProfile({ role: "landlord", is_active: true })).toThrow(AuthorizationError);
    expect(() => assertAdminProfile({ role: "admin", is_active: false })).toThrow(AuthorizationError);
  });

  it("given a noisy rejection reason when sanitizing then it is trimmed and bounded", () => {
    const longReason = `  ${"unclear\n".repeat(120)}  `;

    expect(sanitizeModerationReason(longReason)).toHaveLength(500);
    expect(sanitizeModerationReason("  unclear document  ")).toBe("unclear document");
  });

  it("given an internal authorization error when returning to the client then it exposes only a safe message", () => {
    expect(toPublicActionError(new AuthorizationError("role lookup failed")).message).toBe("Forbidden");
    expect(toPublicActionError(new Error("database password leaked in message")).message).toBe(
      "Unable to complete this administrative action",
    );
  });

  it("given an admin id when writing moderation notes then only a short actor label is used", () => {
    expect(adminAuditActor("12345678-1234-4234-9234-123456789abc")).toBe("admin:12345678");
  });
});
