"use client";

import { useState, useEffect } from "react";
import { GraduationCap, Home, ShieldCheck, ChevronRight, UserCheck } from "lucide-react";
import StudentPage from "../student/page";
import LandlordPage from "../landlord/page";
import { getAuth, AuthUser } from "@/components/KYCModal";

export default function UnifiedPortal() {
  const [role, setRole] = useState<"student" | "landlord" | null>(null);
  const [mounted, setMounted] = useState(false);
  const [studentAuth, setStudentAuth] = useState<AuthUser | null>(null);
  const [landlordAuth, setLandlordAuth] = useState<AuthUser | null>(null);

  useEffect(() => {
    // Check local storage for active sessions
    const sAuth = getAuth("student");
    const lAuth = getAuth("landlord");
    setStudentAuth(sAuth);
    setLandlordAuth(lAuth);

    if (sAuth) {
      setRole("student");
    } else if (lAuth) {
      setRole("landlord");
    }
    setMounted(true);

    // Watch local storage for admin status changes (moderation sync)
    const interval = setInterval(() => {
      const currentStudent = getAuth("student");
      const currentLandlord = getAuth("landlord");
      if (currentStudent && JSON.stringify(currentStudent) !== JSON.stringify(sAuth)) {
        setStudentAuth(currentStudent);
      }
      if (currentLandlord && JSON.stringify(currentLandlord) !== JSON.stringify(lAuth)) {
        setLandlordAuth(currentLandlord);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  if (!mounted) {
    return (
      <div className="min-h-screen bg-[#060613] flex items-center justify-center text-white">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Handle active rendering of student / landlord dashboards
  if (role === "student") {
    // If student is authenticated but has been rejected by the admin
    if (studentAuth?.kycStatus === "rejected") {
      return (
        <div className="min-h-screen bg-[#060613] text-white flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-[#0c0c1e] border border-red-500/30 rounded-2xl p-8 text-center space-y-5 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 inset-x-0 h-1 bg-red-500" />
            <div className="w-16 h-16 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center justify-center mx-auto text-red-400">
              <GraduationCap className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-bold tracking-tight">KYC Verification Rejected</h2>
            <p className="text-sm text-white/60 leading-relaxed">
              Dear <span className="font-semibold text-white">{studentAuth.name}</span>, your student KYC verification was rejected by our administration team.
            </p>
            <div className="bg-red-500/5 border border-red-500/10 rounded-xl p-3 text-xs text-red-400">
              Reason: Submitted document is unclear or details do not match the form.
            </div>
            <button
              onClick={() => {
                localStorage.removeItem("sk_auth_student");
                setStudentAuth(null);
                setRole(null);
              }}
              className="w-full bg-red-600 hover:bg-red-500 text-white py-3 rounded-xl font-semibold transition-all shadow-lg shadow-red-600/10"
            >
              Re-Submit Student KYC
            </button>
          </div>
        </div>
      );
    }
    return <StudentPage />;
  }

  if (role === "landlord") {
    // If landlord is authenticated but has been rejected by the admin
    if (landlordAuth?.kycStatus === "rejected") {
      return (
        <div className="min-h-screen bg-[#060613] text-white flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-[#0c0c1e] border border-red-500/30 rounded-2xl p-8 text-center space-y-5 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 inset-x-0 h-1 bg-red-500" />
            <div className="w-16 h-16 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center justify-center mx-auto text-red-400">
              <Home className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-bold tracking-tight">KYC Verification Rejected</h2>
            <p className="text-sm text-white/60 leading-relaxed">
              Dear <span className="font-semibold text-white">{landlordAuth.name}</span>, your landlord KYC verification was rejected by our administration team.
            </p>
            <div className="bg-red-500/5 border border-red-500/10 rounded-xl p-3 text-xs text-red-400">
              Reason: Invalid property description or ID documents do not match.
            </div>
            <button
              onClick={() => {
                localStorage.removeItem("sk_auth_landlord");
                setLandlordAuth(null);
                setRole(null);
              }}
              className="w-full bg-red-600 hover:bg-red-500 text-white py-3 rounded-xl font-semibold transition-all shadow-lg shadow-red-600/10"
            >
              Re-Submit Landlord KYC
            </button>
          </div>
        </div>
      );
    }
    return <LandlordPage />;
  }

  // Otherwise, show the premium Role Selection screen
  return (
    <div className="min-h-screen bg-[#060613] text-white flex flex-col justify-center items-center p-4 relative overflow-hidden">
      {/* Decorative Glows */}
      <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] rounded-full bg-indigo-500/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] rounded-full bg-emerald-500/5 blur-[120px] pointer-events-none" />

      <div className="max-w-2xl w-full text-center space-y-8 z-10">
        <div className="space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs text-indigo-400 font-semibold tracking-wide uppercase">
            <ShieldCheck className="w-3.5 h-3.5" /> Sakeni Unified Gateway
          </div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
            Select Your <span className="text-gradient">Portal Role</span>
          </h1>
          <p className="text-sm text-white/50 max-w-md mx-auto">
            Choose your account role to complete KYC verification and access tailored features for students or property listings.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
          {/* Student Card */}
          <div
            onClick={() => setRole("student")}
            className="group cursor-pointer bg-[#0c0c1e] hover:bg-[#12122c] border border-white/10 hover:border-emerald-500/40 rounded-2xl p-6 text-left space-y-4 transition-all duration-300 transform hover:-translate-y-1 hover:shadow-2xl hover:shadow-emerald-500/5 flex flex-col"
          >
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 transition-colors group-hover:bg-emerald-500 group-hover:text-white">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div className="space-y-1.5 flex-1">
              <h3 className="font-bold text-lg text-white group-hover:text-emerald-300 transition-colors flex items-center justify-between">
                I am a Student
                <ChevronRight className="w-4 h-4 text-white/30 group-hover:translate-x-1 transition-transform" />
              </h3>
              <p className="text-xs text-white/50 leading-relaxed">
                Search verified housing near Egyptian Universities, send booking requests, and chat directly with verified landlords.
              </p>
            </div>
            <div className="pt-2 flex items-center gap-2 text-[10px] text-emerald-400/80">
              <UserCheck className="w-3.5 h-3.5" /> 14-Digit National ID Required
            </div>
          </div>

          {/* Landlord Card */}
          <div
            onClick={() => setRole("landlord")}
            className="group cursor-pointer bg-[#0c0c1e] hover:bg-[#12122c] border border-white/10 hover:border-amber-500/40 rounded-2xl p-6 text-left space-y-4 transition-all duration-300 transform hover:-translate-y-1 hover:shadow-2xl hover:shadow-amber-500/5 flex flex-col"
          >
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 transition-colors group-hover:bg-amber-500 group-hover:text-white">
              <Home className="w-6 h-6" />
            </div>
            <div className="space-y-1.5 flex-1">
              <h3 className="font-bold text-lg text-white group-hover:text-amber-300 transition-colors flex items-center justify-between">
                I am a Landlord
                <ChevronRight className="w-4 h-4 text-white/30 group-hover:translate-x-1 transition-transform" />
              </h3>
              <p className="text-xs text-white/50 leading-relaxed">
                List apartments, manage tenant requests, track analytics, and communicate with university students looking for units.
              </p>
            </div>
            <div className="pt-2 flex items-center gap-2 text-[10px] text-amber-400/80">
              <UserCheck className="w-3.5 h-3.5" /> Property Location Verification
            </div>
          </div>
        </div>

        <div className="text-xs text-white/30 pt-4">
          All sign-ups are subjected to rigorous review processes in Cairo & Giza.
        </div>
      </div>
    </div>
  );
}
