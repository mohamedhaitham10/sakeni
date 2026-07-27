export type PublicProfileRole = "student" | "landlord";

export interface PublicProfileDetail {
  label: string;
  value: string;
}

export interface PublicUserProfile {
  role: PublicProfileRole;
  roleLabel: string;
  name: string;
  email: string;
  phone: string;
  avatar: string;
  status: string;
  details: PublicProfileDetail[];
}

type AnyRecord = Record<string, unknown>;

function asRecord(value: unknown): AnyRecord | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as AnyRecord : null;
}

function safeText(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function readJson(value: string | null): unknown {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function readStoredRecords(role: PublicProfileRole): AnyRecord[] {
  if (typeof window === "undefined") return [];

  const session = asRecord(readJson(localStorage.getItem(`sk_auth_${role}`)));
  const accountsValue = readJson(localStorage.getItem(`sk_accounts_${role}`));
  const accounts = Array.isArray(accountsValue)
    ? accountsValue.map(asRecord).filter((record): record is AnyRecord => record !== null)
    : [];

  return [session, ...accounts].filter((record): record is AnyRecord => record !== null);
}

function findStoredProfile(role: PublicProfileRole, source: AnyRecord) {
  const email = safeText(source.email).toLowerCase();
  const name = safeText(source.name).toLowerCase();

  return readStoredRecords(role).find(record => {
    const recordEmail = safeText(record.email).toLowerCase();
    const recordName = safeText(record.name).toLowerCase();
    return (!!email && recordEmail === email) || (!!name && recordName === name);
  }) ?? null;
}

function firstText(...values: unknown[]) {
  for (const value of values) {
    const text = safeText(value);
    if (text) return text;
  }
  return "";
}

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0])
    .join("")
    .toUpperCase() || "SA";
}

function statusText(value: unknown) {
  const status = safeText(value, "pending").replace("_", " ");
  return status || "pending";
}

export function buildPublicUserProfile(
  role: PublicProfileRole,
  sourceValue: unknown,
  fallbackName = role === "student" ? "Student User" : "Landlord User",
): PublicUserProfile {
  const source = asRecord(sourceValue) ?? {};
  const stored = findStoredProfile(role, source) ?? {};

  const name = firstText(source.name, stored.name, fallbackName);
  const email = firstText(source.email, stored.email);
  const phone = firstText(source.phone, stored.phone);
  const avatar = firstText(source.selfieUrl, stored.selfieUrl, source.avatar, stored.avatar, initials(name));
  const status = statusText(firstText(source.kycStatus, stored.kycStatus, source.status, stored.status));

  const details =
    role === "student"
      ? [
          { label: "University", value: firstText(source.university, stored.university) },
          { label: "Student ID", value: firstText(source.studentId, stored.studentId) },
          { label: "Year", value: firstText(source.year, stored.year) },
          { label: "Government ID", value: firstText(source.nationalId, stored.nationalId) },
          { label: "Birthdate", value: firstText(source.birthdate, stored.birthdate) },
          { label: "Governorate", value: firstText(source.governorate, stored.governorate) },
          { label: "Gender", value: firstText(source.gender, stored.gender) },
        ]
      : [
          { label: "City", value: firstText(source.city, stored.city) },
          { label: "Property Type", value: firstText(source.propertyType, stored.propertyType) },
          { label: "Government ID", value: firstText(source.nationalId, stored.nationalId) },
          { label: "Birthdate", value: firstText(source.birthdate, stored.birthdate) },
          { label: "Governorate", value: firstText(source.governorate, stored.governorate) },
          { label: "Gender", value: firstText(source.gender, stored.gender) },
        ];

  return {
    role,
    roleLabel: role === "student" ? "Student Account" : "Landlord Account",
    name,
    email,
    phone,
    avatar,
    status,
    details,
  };
}
