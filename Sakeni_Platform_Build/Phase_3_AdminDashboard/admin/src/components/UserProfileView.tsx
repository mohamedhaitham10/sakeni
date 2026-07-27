"use client";

import { Mail, Phone } from "lucide-react";
import type { PublicUserProfile } from "@/lib/public-profile";

function text(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
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

function statusClasses(status: string) {
  if (status === "verified" || status === "active" || status === "approved") {
    return "border-emerald-500/30 bg-emerald-500/10 text-emerald-400";
  }
  if (status === "rejected" || status === "declined") {
    return "border-rose-500/30 bg-rose-500/10 text-rose-400";
  }
  return "border-sky-500/30 bg-sky-500/10 text-sky-300";
}

function isImage(value: string) {
  return value.startsWith("data:image/") || /^https?:\/\//.test(value);
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-white/8 py-3 text-sm last:border-none">
      <span className="text-muted-foreground">{label}</span>
      <span className="max-w-[58%] truncate text-right font-semibold">{value || "N/A"}</span>
    </div>
  );
}

export function UserProfileView({
  profile,
  children,
}: {
  profile: PublicUserProfile;
  children?: React.ReactNode;
}) {
  const role = profile?.role === "landlord" ? "landlord" : "student";
  const name = text(profile?.name, role === "student" ? "Student User" : "Landlord User");
  const avatar = text(profile?.avatar, initials(name));
  const status = text(profile?.status, "pending");
  const roleLabel = text(profile?.roleLabel, role === "student" ? "Student Account" : "Landlord Account");
  const email = text(profile?.email);
  const phone = text(profile?.phone);
  const details = Array.isArray(profile?.details)
    ? profile.details.map((detail, index) => ({
        label: text(detail?.label, `Detail ${index + 1}`),
        value: text(detail?.value),
      }))
    : [];
  const avatarIsImage = isImage(avatar);
  const accent = role === "student" ? "from-emerald-500 to-cyan-500" : "from-amber-500 to-orange-500";

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-white/10 bg-white/5 p-5 text-center">
        <div className={`mx-auto flex h-24 w-24 items-center justify-center overflow-hidden rounded-full bg-gradient-to-tr ${accent} text-2xl font-bold text-white ring-2 ring-white/20`}>
          {avatarIsImage ? (
            <img src={avatar} alt={name} className="h-full w-full object-cover" />
          ) : (
            avatar
          )}
        </div>
        <h2 className="mt-4 text-2xl font-semibold">{name}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{roleLabel}</p>
        <span className={`mt-4 inline-flex rounded-full border px-4 py-1 text-xs font-semibold capitalize ${statusClasses(status)}`}>
          {status}
        </span>

        <div className="mt-6 space-y-3 text-left">
          <div className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm">
            <Mail className="h-4 w-4 shrink-0 text-sky-300" strokeWidth={1.5} />
            <span className="min-w-0 truncate">{email || "Email not shared"}</span>
          </div>
          <div className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm">
            <Phone className="h-4 w-4 shrink-0 text-sky-300" strokeWidth={1.5} />
            <span className="min-w-0 truncate">{phone || "Phone not shared"}</span>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-white/10 bg-white/5 p-5">
        <h3 className="text-lg font-semibold">Account Details</h3>
        <div className="mt-5">
          {details.map(detail => (
            <DetailRow key={detail.label} label={detail.label} value={detail.value} />
          ))}
        </div>
      </section>

      {children}
    </div>
  );
}
