"use client";

import { useEffect, useState } from "react";
import {
  ChevronRight,
  GraduationCap,
  Home,
  Loader2,
  ShieldCheck,
  UserCheck,
} from "lucide-react";
import { AuthUser, getAuth } from "@/components/KYCModal";
import LandlordPage from "../landlord/page";
import StudentPage from "../student/page";

type Role = "student" | "landlord";

function RejectedState({
  role,
  user,
  onReset,
}: {
  role: Role;
  user: AuthUser;
  onReset: () => void;
}) {
  const Icon = role === "student" ? GraduationCap : Home;

  return (
    <div className="flex min-h-screen items-center justify-center p-4 text-foreground">
      <div className="glass-card max-w-md space-y-5 p-8 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center border border-rose-500/30 bg-rose-500/10 text-rose-400">
          <Icon className="h-8 w-8" strokeWidth={1.5} />
        </div>
        <div>
          <h2 className="text-2xl font-semibold">KYC Verification Rejected</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Dear <span className="font-semibold text-foreground">{user.name}</span>, your verification was rejected by the Sakeni admin team.
          </p>
        </div>
        <div className="border border-rose-500/20 bg-rose-500/10 p-3 text-xs text-rose-500">
          Reason: submitted document is unclear or details do not match the form.
        </div>
        <button onClick={onReset} className="btn-industry btn-industry-primary w-full px-4 py-3">
          Re-submit verification
        </button>
      </div>
    </div>
  );
}

export default function UnifiedPortal() {
  const [role, setRole] = useState<Role | null>(null);
  const [mounted, setMounted] = useState(false);
  const [studentAuth, setStudentAuth] = useState<AuthUser | null>(null);
  const [landlordAuth, setLandlordAuth] = useState<AuthUser | null>(null);

  useEffect(() => {
    const sAuth = getAuth("student");
    const lAuth = getAuth("landlord");
    setStudentAuth(sAuth);
    setLandlordAuth(lAuth);

    if (sAuth) setRole("student");
    else if (lAuth) setRole("landlord");

    setMounted(true);

    const interval = setInterval(() => {
      setStudentAuth(getAuth("student"));
      setLandlordAuth(getAuth("landlord"));
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  if (!mounted) {
    return (
      <div className="flex min-h-screen items-center justify-center text-foreground">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-400" strokeWidth={1.5} />
      </div>
    );
  }

  if (role === "student") {
    if (studentAuth?.kycStatus === "rejected") {
      return (
        <RejectedState
          role="student"
          user={studentAuth}
          onReset={() => {
            localStorage.removeItem("sk_auth_student");
            setStudentAuth(null);
            setRole(null);
          }}
        />
      );
    }
    return <StudentPage />;
  }

  if (role === "landlord") {
    if (landlordAuth?.kycStatus === "rejected") {
      return (
        <RejectedState
          role="landlord"
          user={landlordAuth}
          onReset={() => {
            localStorage.removeItem("sk_auth_landlord");
            setLandlordAuth(null);
            setRole(null);
          }}
        />
      );
    }
    return <LandlordPage />;
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4 text-foreground">
      <main className="w-full max-w-4xl space-y-8">
        <section className="space-y-4 text-center">
          <div className="inline-flex items-center gap-2 border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold uppercase text-indigo-400">
            <ShieldCheck className="h-3.5 w-3.5" strokeWidth={1.5} />
            Sakeni Unified Gateway
          </div>
          <div>
            <h1 className="text-4xl font-semibold sm:text-5xl">Sakeni (سكني)</h1>
            <p className="mx-auto mt-3 max-w-xl text-sm text-muted-foreground">
              Verified student housing workflows for Cairo and Giza: browse, list, approve, and communicate from one trusted platform.
            </p>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <button
            onClick={() => setRole("student")}
            className="glass-card group flex min-h-[220px] flex-col p-6 text-start"
          >
            <div className="mb-5 flex h-12 w-12 items-center justify-center border border-white/10 bg-indigo-500/10 text-indigo-400">
              <GraduationCap className="h-6 w-6" strokeWidth={1.5} />
            </div>
            <div className="flex-1">
              <h2 className="flex items-center justify-between text-2xl font-semibold">
                I am a Student
                <ChevronRight className="h-5 w-5 text-muted-foreground transition-transform group-hover:translate-x-1" strokeWidth={1.5} />
              </h2>
              <p className="mt-3 text-sm text-muted-foreground">
                Find verified apartments near Cairo and Giza universities, apply with your profile, and message landlords safely.
              </p>
            </div>
            <p className="mt-5 flex items-center gap-2 text-xs font-semibold text-indigo-400">
              <UserCheck className="h-3.5 w-3.5" strokeWidth={1.5} />
              Government ID + student verification
            </p>
          </button>

          <button
            onClick={() => setRole("landlord")}
            className="glass-card group flex min-h-[220px] flex-col p-6 text-start"
          >
            <div className="mb-5 flex h-12 w-12 items-center justify-center border border-white/10 bg-indigo-500/10 text-indigo-400">
              <Home className="h-6 w-6" strokeWidth={1.5} />
            </div>
            <div className="flex-1">
              <h2 className="flex items-center justify-between text-2xl font-semibold">
                I am a Landlord
                <ChevronRight className="h-5 w-5 text-muted-foreground transition-transform group-hover:translate-x-1" strokeWidth={1.5} />
              </h2>
              <p className="mt-3 text-sm text-muted-foreground">
                Submit listings for admin review, manage applicant profiles, track activity, and keep communication in Sakeni.
              </p>
            </div>
            <p className="mt-5 flex items-center gap-2 text-xs font-semibold text-indigo-400">
              <UserCheck className="h-3.5 w-3.5" strokeWidth={1.5} />
              Manual approval before listings go live
            </p>
          </button>
        </section>
      </main>
    </div>
  );
}
