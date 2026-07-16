const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MAX_REJECTION_REASON_LENGTH = 500;

export class AuthorizationError extends Error {
  constructor(message = "Forbidden") {
    super(message);
    this.name = "AuthorizationError";
  }
}

export class ValidationError extends Error {
  constructor(message = "Invalid request") {
    super(message);
    this.name = "ValidationError";
  }
}

export function assertUuid(value: unknown, fieldName = "id") {
  if (typeof value !== "string" || !UUID_PATTERN.test(value.trim())) {
    throw new ValidationError(`${fieldName} must be a valid UUID`);
  }
  return value.trim();
}

export function sanitizeModerationReason(value: unknown) {
  if (typeof value !== "string") {
    throw new ValidationError("Rejection reason is required");
  }

  const reason = value.replace(/\s+/g, " ").trim();
  if (!reason) {
    throw new ValidationError("Rejection reason is required");
  }

  return reason.slice(0, MAX_REJECTION_REASON_LENGTH);
}

export function assertAdminProfile(profile: { role?: string | null; is_active?: boolean | null } | null) {
  if (!profile || profile.role !== "admin" || profile.is_active === false) {
    throw new AuthorizationError();
  }
}

export function adminAuditActor(userId: string) {
  return `admin:${userId.slice(0, 8)}`;
}

export function toPublicActionError(error: unknown) {
  if (error instanceof AuthorizationError) return new Error("Forbidden");
  if (error instanceof ValidationError) return new Error(error.message);
  return new Error("Unable to complete this administrative action");
}
