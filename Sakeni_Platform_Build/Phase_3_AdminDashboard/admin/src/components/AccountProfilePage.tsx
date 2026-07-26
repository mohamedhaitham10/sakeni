"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  BadgeCheck,
  Building2,
  CalendarDays,
  GraduationCap,
  Home,
  Mail,
  Phone,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { AuthUser, clearAuth, getAuth, type AuthRole } from "@/components/KYCModal";
import { ThemeToggle } from "@/components/ThemeToggle";

type AccountRole = AuthRole | "admin";

interface ListingRecord {
  id: number | string;
  name?: string;
  price?: number;
  status?: string;
  views?: number;
  landlordName?: string;
  landlordEmail?: string;
}

interface ApplicationRecord {
  id: number | string;
  listingId?: number | string;
  status?: string;
  name?: string;
  email?: string;
  landlordName?: string;
  landlordEmail?: string;
}

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;

  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
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
  if (status === "verified" || status === "active") {
    return "border-emerald-500/30 bg-emerald-500/10 text-emerald-400";
  }
  if (status === "rejected" || status === "declined") {
    return "border-rose-500/30 bg-rose-500/10 text-rose-400";
  }
  return "border-amber-500/30 bg-amber-500/10 text-amber-400";
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-white/6 py-3 text-sm last:border-none">
      <span className="text-muted-foreground">{label}</span>
      <span className="max-w-[60%] truncate text-right font-semibold">{value || "N/A"}</span>
    </div>
  );
}

function MetricCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: typeof UserRound;
}) {
  return (
    <div className="glass-card flex items-center gap-3 p-4">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center border border-white/10 bg-white/5 text-indigo-400">
        <Icon className="h-4 w-4" strokeWidth={1.5} />
      </div>
      <div className="min-w-0">
        <p className="truncate text-xl font-semibold">{value}</p>
        <p className="mt-1 truncate text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

function defaultUser(role: AccountRole): AuthUser | null {
  if (role === "student") {
    return {
      name: "Ahmed Hassan",
      email: "student@sakeni.eg",
      phone: "01012345678",
      role: "student",
      university: "Cairo University",
      studentId: "CS-2021-0042",
      year: "3rd Year",
      nationalId: "29901011234567",
      kycStatus: "verified",
      avatar: "AH",
      birthdate: "1999-01-01",
      gender: "Male",
      governorate: "Cairo",
    };
  }

  if (role === "landlord") {
    return {
      name: "Mohamed Ali",
      email: "landlord@sakeni.eg",
      phone: "01198765432",
      role: "landlord",
      city: "Cairo",
      propertyType: "Apartments",
      nationalId: "27805151234567",
      kycStatus: "verified",
      avatar: "MA",
      birthdate: "1978-05-15",
      gender: "Male",
      governorate: "Cairo",
    };
  }

  return null;
}

function adminProfile() {
  return {
    name: "Sakeni Admin",
    email: "admin@sakeni.eg",
    phone: "+20 100 000 0000",
    roleLabel: "Admin",
    status: "verified",
    avatar: "SA",
    source: null as AuthUser | null,
  };
}

export function AccountProfilePage({ role }: { role: AccountRole }) {
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [savedCount, setSavedCount] = useState(0);
  const [applications, setApplications] = useState<ApplicationRecord[]>([]);
  const [listings, setListings] = useState<ListingRecord[]>([]);

  useEffect(() => {
    if (role !== "admin") {
      setUser(getAuth(role) ?? defaultUser(role));
    }
    setSavedCount(readJson<number[]>("sk_saved", []).length);
    setApplications(readJson<ApplicationRecord[]>("sk_ll_applicants", []));
    setListings(readJson<ListingRecord[]>("sk_ll_listings", []));
    setMounted(true);
  }, [role]);

  const profile = useMemo(() => {
    if (role === "admin") return adminProfile();
    const source = user ?? defaultUser(role);
    return {
      name: source?.name ?? "Sakeni User",
      email: source?.email ?? "",
      phone: source?.phone ?? "",
      roleLabel: role === "student" ? "Student" : "Landlord",
      status: source?.kycStatus ?? "pending",
      avatar: source?.selfieUrl || source?.avatar || initials(source?.name ?? ""),
      source,
    };
  }, [role, user]);

  const roleListings = useMemo(() => {
    if (role === "admin") return listings;
    if (role !== "landlord") return [];

    const email = profile.email.toLowerCase();
    const name = profile.name.toLowerCase();
    return listings.filter(listing => {
      if (!listing.landlordEmail && !listing.landlordName) return true;
      return listing.landlordEmail?.toLowerCase() === email || listing.landlordName?.toLowerCase() === name;
    });
  }, [listings, profile.email, profile.name, role]);

  const roleApplications = useMemo(() => {
    if (role === "admin") return applications;
    if (role === "student") {
      const email = profile.email.toLowerCase();
      return applications.filter(app => !app.email || app.email.toLowerCase() === email);
    }

    const listingIds = new Set(roleListings.map(listing => String(listing.id)));
    return applications.filter(app => app.listingId !== undefined && listingIds.has(String(app.listingId)));
  }, [applications, profile.email, role, roleListings]);

  const backHref = role === "student" ? "/student" : role === "landlord" ? "/landlord" : "/";
  const accent = role === "student" ? "from-emerald-500 to-cyan-500" : role === "landlord" ? "from-amber-500 to-orange-500" : "from-indigo-500 to-purple-500";
  const AvatarIcon = role === "student" ? GraduationCap : role === "landlord" ? Home : ShieldCheck;
  const avatarIsImage = profile.avatar.startsWith("data:image/") || /^https?:\/\//.test(profile.avatar);

  const metrics =
    role === "student"
      ? [
          { label: "Saved listings", value: String(savedCount), icon: Home },
          { label: "Applications", value: String(roleApplications.length), icon: CalendarDays },
          { label: "Approved", value: String(roleApplications.filter(app => app.status === "approved").length), icon: BadgeCheck },
        ]
      : role === "landlord"
      ? [
          { label: "Listings", value: String(roleListings.length), icon: Building2 },
          { label: "Applications", value: String(roleApplications.length), icon: CalendarDays },
          { label: "Monthly revenue", value: `EGP ${roleListings.filter(listing => listing.status === "active").reduce((sum, listing) => sum + Number(listing.price || 0), 0).toLocaleString()}`, icon: BadgeCheck },
        ]
      : [
          { label: "Students", value: String(readJson<AuthUser[]>("sk_accounts_student", []).length), icon: GraduationCap },
          { label: "Landlords", value: String(readJson<AuthUser[]>("sk_accounts_landlord", []).length), icon: Home },
          { label: "Listings", value: String(listings.length), icon: Building2 },
        ];

  const signOut = () => {
    if (role === "student" || role === "landlord") {
      clearAuth(role);
      window.location.href = role === "student" ? "/student" : "/landlord";
    }
  };

  if (!mounted) {
    return (
      <main className="flex min-h-screen items-center justify-center text-foreground">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
      </main>
    );
  }

  return (
    <main className="min-h-screen text-foreground">
      <header className="glass fixed left-0 top-0 z-40 flex w-full items-center justify-between px-5 py-3.5">
        <Link href={backHref} className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground">
          <ArrowLeft className="h-4 w-4" strokeWidth={1.5} />
          Back
        </Link>
        <ThemeToggle />
      </header>

      <section className="mx-auto max-w-6xl px-4 pb-16 pt-24 sm:px-6">
        <div className="grid gap-5 lg:grid-cols-[360px_minmax(0,1fr)]">
          <aside className="glass-card p-5">
            <div className="flex flex-col items-center text-center">
              <div className={`flex h-24 w-24 items-center justify-center overflow-hidden rounded-full bg-gradient-to-tr ${accent} text-2xl font-bold text-white ring-2 ring-white/20`}>
                {avatarIsImage ? (
                  <img src={profile.avatar} alt={profile.name} className="h-full w-full object-cover" />
                ) : (
                  profile.avatar || <AvatarIcon className="h-8 w-8" strokeWidth={1.5} />
                )}
              </div>
              <h1 className="mt-4 text-2xl font-semibold">{profile.name}</h1>
              <p className="mt-1 text-sm text-muted-foreground">{profile.roleLabel} Account</p>
              <span className={`mt-4 rounded-full border px-3 py-1 text-xs font-semibold capitalize ${statusClasses(profile.status)}`}>
                {profile.status.replace("_", " ")}
              </span>
            </div>

            <div className="mt-6 space-y-3">
              <div className="flex items-center gap-3 rounded-lg border border-white/8 bg-white/5 px-3 py-2 text-sm">
                <Mail className="h-4 w-4 text-indigo-400" strokeWidth={1.5} />
                <span className="min-w-0 truncate">{profile.email}</span>
              </div>
              <div className="flex items-center gap-3 rounded-lg border border-white/8 bg-white/5 px-3 py-2 text-sm">
                <Phone className="h-4 w-4 text-indigo-400" strokeWidth={1.5} />
                <span className="min-w-0 truncate">{profile.phone}</span>
              </div>
            </div>

            {(role === "student" || role === "landlord") && (
              <button
                onClick={signOut}
                className="mt-6 w-full rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-2.5 text-sm font-semibold text-rose-400 transition-colors hover:bg-rose-500/20"
              >
                Sign Out
              </button>
            )}
          </aside>

          <div className="space-y-5">
            <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {metrics.map(metric => (
                <MetricCard key={metric.label} {...metric} />
              ))}
            </section>

            <section className="glass-card p-5">
              <h2 className="text-lg font-semibold">Account Details</h2>
              <div className="mt-4">
                {role === "student" && profile.source && (
                  <>
                    <DetailRow label="University" value={profile.source.university ?? "N/A"} />
                    <DetailRow label="Student ID" value={profile.source.studentId ?? "N/A"} />
                    <DetailRow label="Year" value={profile.source.year ?? "N/A"} />
                  </>
                )}
                {role === "landlord" && profile.source && (
                  <>
                    <DetailRow label="City" value={profile.source.city ?? "N/A"} />
                    <DetailRow label="Property Type" value={profile.source.propertyType ?? "N/A"} />
                  </>
                )}
                {role === "admin" && (
                  <>
                    <DetailRow label="Scope" value="KYC, listings, activity, and platform health" />
                    <DetailRow label="Dashboard" value="Admin Overview" />
                  </>
                )}
                <DetailRow label="Government ID" value={profile.source?.nationalId ?? (role === "admin" ? "Internal admin account" : "N/A")} />
                <DetailRow label="Birthdate" value={profile.source?.birthdate ?? "N/A"} />
                <DetailRow label="Governorate" value={profile.source?.governorate ?? "N/A"} />
                <DetailRow label="Gender" value={profile.source?.gender ?? "N/A"} />
              </div>
            </section>

            <section className="glass-card p-5">
              <h2 className="text-lg font-semibold">Recent Account Activity</h2>
              <div className="mt-4 space-y-2">
                {(role === "student" ? roleApplications : role === "landlord" ? roleApplications : listings).slice(0, 5).map((item, index) => (
                  <div key={`${item.id}-${index}`} className="flex items-center justify-between gap-4 rounded-lg border border-white/8 bg-white/4 px-3 py-2 text-sm">
                    <span className="min-w-0 truncate">
                      {"name" in item && item.name ? item.name : "Listing update"}
                    </span>
                    <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold capitalize ${statusClasses(String(item.status ?? "pending"))}`}>
                      {String(item.status ?? "pending").replace("_", " ")}
                    </span>
                  </div>
                ))}
                {(role === "student" ? roleApplications.length : role === "landlord" ? roleApplications.length : listings.length) === 0 && (
                  <p className="rounded-lg border border-white/8 bg-white/4 px-3 py-6 text-center text-sm text-muted-foreground">
                    No recent account activity yet.
                  </p>
                )}
              </div>
            </section>
          </div>
        </div>
      </section>
    </main>
  );
}
