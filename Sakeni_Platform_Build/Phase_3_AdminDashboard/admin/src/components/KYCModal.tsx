"use client";

import { useState } from "react";
import { Shield, Upload, ChevronRight, Eye, EyeOff, CheckCircle2, GraduationCap, Home } from "lucide-react";

export type AuthRole = "student" | "landlord";

export interface AuthUser {
  name: string;
  email: string;
  phone: string;
  role: AuthRole;
  university?: string;
  studentId?: string;
  year?: string;
  city?: string;
  propertyType?: string;
  nationalId: string;
  kycStatus: "verified" | "pending" | "rejected";
  avatar: string;
  birthdate?: string;
  gender?: string;
  governorate?: string;
}

const STORAGE_KEY = (role: AuthRole) => `sk_auth_${role}`;

export function getAuth(role: AuthRole): AuthUser | null {
  try {
    const s = localStorage.getItem(STORAGE_KEY(role));
    return s ? JSON.parse(s) : null;
  } catch { return null; }
}

export function setAuth(role: AuthRole, user: AuthUser) {
  try { localStorage.setItem(STORAGE_KEY(role), JSON.stringify(user)); } catch { /* ignore */ }
}

export function clearAuth(role: AuthRole) {
  try { localStorage.removeItem(STORAGE_KEY(role)); } catch { /* ignore */ }
}

const DEMO_ACCOUNTS: Record<AuthRole, { email: string; password: string; user: AuthUser }> = {
  student: {
    email: "student@sakeni.eg",
    password: "demo123",
    user: {
      name: "Ahmed Hassan", email: "student@sakeni.eg", phone: "01012345678",
      role: "student", university: "Cairo University", studentId: "CS-2021-0042",
      year: "3rd Year", nationalId: "29901011234567", kycStatus: "verified",
      avatar: "AH", birthdate: "1999-01-01", gender: "Male", governorate: "Cairo"
    },
  },
  landlord: {
    email: "landlord@sakeni.eg",
    password: "demo123",
    user: {
      name: "Mohamed Ali", email: "landlord@sakeni.eg", phone: "01198765432",
      role: "landlord", city: "Cairo", propertyType: "Apartments",
      nationalId: "27805151234567", kycStatus: "verified",
      avatar: "MA", birthdate: "1978-05-15", gender: "Male", governorate: "Cairo"
    },
  },
};

const EGYPTIAN_UNIVERSITIES = [
  "Cairo University", "Ain Shams University", "Alexandria University",
  "American University in Cairo (AUC)", "German University in Cairo (GUC)",
  "Helwan University", "Mansoura University", "Assiut University",
  "Zagazig University", "Benha University", "Suez Canal University",
  "Misr International University (MIU)", "Modern Sciences & Arts University (MSA)",
  "Future University in Egypt (FUE)", "October University (MUST)",
];

const GOVERNORATES: Record<string, string> = {
  "01": "Cairo",
  "02": "Alexandria",
  "03": "Port Said",
  "04": "Suez",
  "11": "Damietta",
  "12": "Dakahlia",
  "13": "Sharkia",
  "14": "Qalyubia",
  "15": "Kafr El Sheikh",
  "16": "Gharbia",
  "17": "Monufia",
  "18": "Beheira",
  "19": "Ismailia",
  "21": "Giza",
  "22": "Beni Suef",
  "23": "Faiyum",
  "24": "Minya",
  "25": "Asyut",
  "26": "Sohag",
  "27": "Qena",
  "28": "Aswan",
  "29": "Luxor",
  "31": "Red Sea",
  "32": "New Valley",
  "33": "Matrouh",
  "34": "North Sinai",
  "35": "South Sinai",
  "88": "Outside Egypt",
};

export interface ParsedID {
  isValid: boolean;
  birthdate?: string;
  governorate?: string;
  gender?: "Male" | "Female";
  error?: string;
}

export function parseEgyptianNationalID(id: string): ParsedID {
  if (!id) return { isValid: false };
  if (id.length !== 14) return { isValid: false, error: "Must be exactly 14 digits." };
  if (!/^\d+$/.test(id)) return { isValid: false, error: "Must contain only digits." };

  const centuryDigit = id[0];
  if (centuryDigit !== "2" && centuryDigit !== "3") {
    return { isValid: false, error: "First digit must be 2 (born 1900-1999) or 3 (born 2000-2099)." };
  }

  const century = centuryDigit === "2" ? "19" : "20";
  const yy = id.slice(1, 3);
  const mm = id.slice(3, 5);
  const dd = id.slice(5, 7);

  const year = parseInt(century + yy, 10);
  const month = parseInt(mm, 10);
  const day = parseInt(dd, 10);

  if (month < 1 || month > 12) {
    return { isValid: false, error: "Invalid birth month." };
  }
  
  const daysInMonth = new Date(year, month, 0).getDate();
  if (day < 1 || day > daysInMonth) {
    return { isValid: false, error: "Invalid birth day." };
  }

  const govCode = id.slice(7, 9);
  const governorate = GOVERNORATES[govCode];
  if (!governorate) {
    return { isValid: false, error: "Invalid governorate code." };
  }
  if (govCode !== "01" && govCode !== "21") {
    return { isValid: false, error: "Currently only Cairo (01) & Giza (21) governorates are supported." };
  }

  const genderDigit = parseInt(id[12], 10);
  const gender = genderDigit % 2 === 0 ? "Female" : "Male";

  return {
    isValid: true,
    birthdate: `${year}-${mm}-${dd}`,
    governorate,
    gender,
  };
}

interface Props {
  role: AuthRole;
  onAuth: (user: AuthUser) => void;
}

export function KYCModal({ role, onAuth }: Props) {
  const [tab,        setTab]        = useState<"signin" | "signup">("signin");
  const [step,       setStep]       = useState(1);
  const [showPw,     setShowPw]     = useState(false);
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState("");
  const [idUploaded, setIdUploaded] = useState(false);
  const [done,       setDone]       = useState(false);
  const [fileName, setFileName] = useState("");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setIsUploading(true);
    setUploadProgress(0);
    setError("");
    let progress = 0;
    const interval = setInterval(() => {
      progress += 10;
      setUploadProgress(progress);
      if (progress >= 100) {
        clearInterval(interval);
        setIsUploading(false);
        setIdUploaded(true);
      }
    }, 120);
  };

  const [form, setForm] = useState({
    name: "", email: "", phone: "", password: "",
    university: "", studentId: "", year: "",
    city: "", propertyType: "",
    nationalId: "",
  });

  const set = (k: string, v: string) => { setForm(f => ({ ...f, [k]: v })); setError(""); };

  const accentCls = role === "student"
    ? { btn: "bg-emerald-600 hover:bg-emerald-500", ring: "focus:border-emerald-500/50", badge: "bg-emerald-500/15 text-emerald-300 border-emerald-500/20" }
    : { btn: "bg-amber-600 hover:bg-amber-500",   ring: "focus:border-amber-500/50",   badge: "bg-amber-500/15 text-amber-300 border-amber-500/20" };

  const RoleIcon = role === "student" ? GraduationCap : Home;
  const roleLabel = role === "student" ? "Student" : "Landlord";

  function handleSignIn() {
    setError("");
    const demo = DEMO_ACCOUNTS[role];
    if (form.email === demo.email && form.password === demo.password) {
      setAuth(role, demo.user);
      onAuth(demo.user);
      return;
    }
    const stored = getAuth(role);
    if (stored && stored.email === form.email) {
      onAuth(stored);
      return;
    }
    setError("Invalid credentials. Use demo account or your registered email.");
  }

  function handleSignUpStep1() {
    if (!form.name.trim() || !form.email.trim() || !form.phone.trim() || !form.password.trim()) {
      setError("Please fill in all fields."); return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      setError("Invalid email address."); return;
    }
    if (form.password.length < 6) {
      setError("Password must be at least 6 characters."); return;
    }
    setStep(2); setError("");
  }

  function handleSignUpStep2() {
    if (role === "student" && (!form.university || !form.studentId.trim() || !form.year)) {
      setError("Please fill in all student details."); return;
    }
    if (role === "landlord" && (!form.city.trim() || !form.propertyType)) {
      setError("Please fill in all landlord details."); return;
    }
    setStep(3); setError("");
  }

  function handleSignUpStep3() {
    const parserResult = parseEgyptianNationalID(form.nationalId);
    if (!parserResult.isValid) {
      setError(parserResult.error || "Enter a valid 14-digit National ID.");
      return;
    }
    if (!idUploaded) { setError("Please upload your ID document."); return; }

    setLoading(true);
    setTimeout(() => {
      const initials = form.name.trim().split(" ").slice(0, 2).map(w => w[0]).join("").toUpperCase();
      const user: AuthUser = {
        name: form.name.trim(), email: form.email.trim(),
        phone: form.phone.trim(), role,
        university: form.university || undefined,
        studentId: form.studentId || undefined,
        year: form.year || undefined,
        city: form.city || undefined,
        propertyType: form.propertyType || undefined,
        nationalId: form.nationalId.trim(),
        kycStatus: "pending",
        avatar: initials || roleLabel[0],
        birthdate: parserResult.birthdate,
        gender: parserResult.gender,
        governorate: parserResult.governorate,
      };
      setAuth(role, user);
      setLoading(false);
      setDone(true);
      setTimeout(() => onAuth(user), 1600);
    }, 1200);
  }

  const inputCls = `w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none ${accentCls.ring} transition-all placeholder:text-white/25`;
  const labelCls = "block text-xs text-white/50 mb-1.5 font-medium";

  if (done) return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-[#0c0c1e] border border-white/12 rounded-2xl p-8 max-w-sm w-full text-center space-y-4">
        <CheckCircle2 className="w-14 h-14 text-emerald-400 mx-auto" />
        <h2 className="text-xl font-bold">KYC Submitted!</h2>
        <p className="text-sm text-muted-foreground">
          Your identity is being verified. You now have <span className="text-white font-semibold">pending access</span> while we review your documents (usually within 24 hours).
        </p>
        <div className={`text-xs px-3 py-1.5 rounded-full border ${accentCls.badge} inline-block`}>
          Logging you in…
        </div>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-[#0c0c1e] border border-white/12 rounded-2xl shadow-2xl w-full max-w-md flex flex-col max-h-[90vh] overflow-y-auto">

        {/* Header */}
        <div className="flex items-center gap-3 px-6 pt-6 pb-4 border-b border-white/8 shrink-0">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${role === "student" ? "bg-emerald-500/15" : "bg-amber-500/15"}`}>
            <RoleIcon className={`w-5 h-5 ${role === "student" ? "text-emerald-400" : "text-amber-400"}`} />
          </div>
          <div>
            <h2 className="font-bold text-base leading-tight">Sakeni {roleLabel} Portal</h2>
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
              <Shield className="w-3 h-3 text-indigo-400" /> KYC-verified access
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-white/8 shrink-0">
          {(["signin", "signup"] as const).map(t => (
            <button
              key={t}
              onClick={() => { setTab(t); setStep(1); setError(""); }}
              className={`flex-1 py-3 text-sm font-semibold transition-all ${tab === t ? `border-b-2 ${role === "student" ? "border-emerald-500 text-emerald-400" : "border-amber-500 text-amber-400"}` : "text-white/40 hover:text-white/70"}`}
            >
              {t === "signin" ? "Sign In" : "Sign Up"}
            </button>
          ))}
        </div>

        <div className="p-6 space-y-5">
          {/* ── SIGN IN ── */}
          {tab === "signin" && (
            <>
              <div className="space-y-1">
                <label className={labelCls}>Email</label>
                <input className={inputCls} type="email" placeholder={DEMO_ACCOUNTS[role].email}
                  value={form.email} onChange={e => set("email", e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className={labelCls}>Password</label>
                <div className="relative">
                  <input className={`${inputCls} pe-10`} type={showPw ? "text" : "password"} placeholder="••••••••"
                    value={form.password} onChange={e => set("password", e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") handleSignIn(); }} />
                  <button onClick={() => setShowPw(p => !p)} className="absolute end-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors">
                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              {error && <p className="text-rose-400 text-xs bg-rose-500/10 border border-rose-500/20 rounded-lg px-3 py-2">{error}</p>}
              <div className={`text-xs px-3 py-2.5 rounded-xl border ${accentCls.badge} space-y-0.5`}>
                <p className="font-semibold">Demo account</p>
                <p>Email: {DEMO_ACCOUNTS[role].email}</p>
                <p>Password: demo123</p>
              </div>
              <button onClick={handleSignIn} className={`w-full ${accentCls.btn} text-white py-2.5 rounded-xl text-sm font-semibold transition-all`}>
                Sign In
              </button>
            </>
          )}

          {/* ── SIGN UP ── */}
          {tab === "signup" && (
            <>
              {/* Step indicator */}
              <div className="flex items-center gap-2 mb-1">
                {[1, 2, 3].map(s => (
                  <div key={s} className="flex items-center gap-2">
                    <div className={`w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center transition-all ${step >= s ? (role === "student" ? "bg-emerald-600" : "bg-amber-600") : "bg-white/10 text-white/30"}`}>
                      {s}
                    </div>
                    {s < 3 && <div className={`flex-1 h-px w-8 transition-all ${step > s ? (role === "student" ? "bg-emerald-600" : "bg-amber-600") : "bg-white/10"}`} />}
                  </div>
                ))}
                <span className="text-xs text-white/40 ms-1">
                  {step === 1 ? "Basic Info" : step === 2 ? "Verification" : "ID Check"}
                </span>
              </div>

              {/* Step 1 */}
              {step === 1 && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2 space-y-1">
                      <label className={labelCls}>Full Name</label>
                      <input className={inputCls} placeholder="Ahmed Hassan" value={form.name} onChange={e => set("name", e.target.value)} />
                    </div>
                    <div className="col-span-2 space-y-1">
                      <label className={labelCls}>Email</label>
                      <input className={inputCls} type="email" placeholder="you@example.com" value={form.email} onChange={e => set("email", e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <label className={labelCls}>Phone</label>
                      <input className={inputCls} placeholder="010xxxxxxxx" value={form.phone} onChange={e => set("phone", e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <label className={labelCls}>Password</label>
                      <div className="relative">
                        <input className={`${inputCls} pe-9`} type={showPw ? "text" : "password"} placeholder="min 6 chars"
                          value={form.password} onChange={e => set("password", e.target.value)} />
                        <button onClick={() => setShowPw(p => !p)} className="absolute end-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60">
                          {showPw ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                  </div>
                  {error && <p className="text-rose-400 text-xs bg-rose-500/10 border border-rose-500/20 rounded-lg px-3 py-2">{error}</p>}
                  <button onClick={handleSignUpStep1} className={`w-full ${accentCls.btn} text-white py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2`}>
                    Continue <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Step 2 */}
              {step === 2 && (
                <div className="space-y-4">
                  {role === "student" ? (
                    <>
                      <div className="space-y-1">
                        <label className={labelCls}>University</label>
                        <select className={inputCls} value={form.university} onChange={e => set("university", e.target.value)}>
                          <option value="">Select your university</option>
                          {EGYPTIAN_UNIVERSITIES.map(u => <option key={u} value={u}>{u}</option>)}
                        </select>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className={labelCls}>Student ID</label>
                          <input className={inputCls} placeholder="CS-2021-0042" value={form.studentId} onChange={e => set("studentId", e.target.value)} />
                        </div>
                        <div className="space-y-1">
                          <label className={labelCls}>Year</label>
                          <select className={inputCls} value={form.year} onChange={e => set("year", e.target.value)}>
                            <option value="">Select year</option>
                            {["1st Year", "2nd Year", "3rd Year", "4th Year", "5th Year", "Postgraduate"].map(y => <option key={y} value={y}>{y}</option>)}
                          </select>
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="space-y-1">
                        <label className={labelCls}>City</label>
                        <select className={inputCls} value={form.city} onChange={e => set("city", e.target.value)}>
                          <option value="">Select city</option>
                          {["Cairo", "Giza"].map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className={labelCls}>Property Type</label>
                        <select className={inputCls} value={form.propertyType} onChange={e => set("propertyType", e.target.value)}>
                          <option value="">Select type</option>
                          {["Apartments", "Studios", "Rooms", "Villas", "Mixed"].map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                      </div>
                    </>
                  )}
                  {error && <p className="text-rose-400 text-xs bg-rose-500/10 border border-rose-500/20 rounded-lg px-3 py-2">{error}</p>}
                  <div className="flex gap-3">
                    <button onClick={() => setStep(1)} className="flex-1 bg-white/6 hover:bg-white/10 text-white py-2.5 rounded-xl text-sm font-semibold transition-all">Back</button>
                    <button onClick={handleSignUpStep2} className={`flex-1 ${accentCls.btn} text-white py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2`}>
                      Continue <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* Step 3 */}
              {step === 3 && (
                <div className="space-y-4">
                  <div className="bg-indigo-500/8 border border-indigo-500/20 rounded-xl p-3 text-xs text-indigo-300 flex gap-2">
                    <Shield className="w-4 h-4 shrink-0 mt-0.5" />
                    <p>Your ID is encrypted and used only for verification. Sakeni is compliant with Egypt&apos;s data protection guidelines.</p>
                  </div>
                  <div className="space-y-1">
                    <label className={labelCls}>National ID Number (14 digits)</label>
                    <input className={inputCls} placeholder="29901011234567" maxLength={14} value={form.nationalId}
                      onChange={e => set("nationalId", e.target.value.replace(/\D/g, ""))} />
                  </div>
                  {form.nationalId && (
                    <div className="mt-2 text-xs">
                      {(() => {
                        const parsed = parseEgyptianNationalID(form.nationalId);
                        if (form.nationalId.length < 14) {
                          return (
                            <div className="text-white/40 italic">
                              Waiting for {14 - form.nationalId.length} more digits...
                            </div>
                          );
                        }
                        if (!parsed.isValid) {
                          return (
                            <div className="text-rose-400 font-medium bg-rose-500/10 border border-rose-500/20 rounded-xl p-3">
                              ✕ {parsed.error}
                            </div>
                          );
                        }
                        return (
                          <div className="bg-gradient-to-br from-[#121235] to-[#1a1a45] border border-white/10 rounded-xl p-4 space-y-3 relative overflow-hidden shadow-xl">
                            {/* Watermark/Decorative element */}
                            <div className="absolute right-0 bottom-0 text-[100px] text-white/5 font-bold select-none leading-none translate-x-6 translate-y-6">
                              EGY
                            </div>
                            
                            <div className="flex justify-between items-center border-b border-white/10 pb-2">
                              <span className="font-bold text-[10px] text-indigo-400 tracking-wider">EGYPTIAN ID DECODER</span>
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">Format Verified</span>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-3 relative z-10">
                              <div>
                                <span className="block text-[9px] text-white/40">NAME</span>
                                <span className="font-semibold text-white text-xs truncate block">{form.name || "N/A"}</span>
                              </div>
                              <div>
                                <span className="block text-[9px] text-white/40">NATIONAL ID</span>
                                <span className="font-semibold text-white text-xs tracking-wider block">{form.nationalId}</span>
                              </div>
                              <div>
                                <span className="block text-[9px] text-white/40">BIRTH DATE</span>
                                <span className="font-semibold text-white text-xs block">{parsed.birthdate}</span>
                              </div>
                              <div>
                                <span className="block text-[9px] text-white/40">GENDER</span>
                                <span className="font-semibold text-white text-xs block">{parsed.gender}</span>
                              </div>
                              <div className="col-span-2">
                                <span className="block text-[9px] text-white/40">GOVERNORATE OF BIRTH</span>
                                <span className="font-semibold text-white text-xs block">{parsed.governorate}</span>
                              </div>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  )}
                  <div className="space-y-1">
                    <label className={labelCls}>Upload ID Document</label>
                    <input
                      type="file"
                      id="kyc-file-upload"
                      accept="image/*,application/pdf"
                      onChange={handleFileChange}
                      className="hidden"
                      disabled={isUploading}
                    />
                    <label
                      htmlFor="kyc-file-upload"
                      className={`w-full border-2 border-dashed rounded-xl py-5 flex flex-col items-center gap-2 text-sm transition-all cursor-pointer ${
                        idUploaded
                          ? "border-emerald-500/40 bg-emerald-500/8 text-emerald-400"
                          : isUploading
                          ? "border-indigo-500/40 bg-indigo-500/5 text-indigo-400"
                          : "border-white/10 hover:border-white/20 text-white/40 hover:text-white/60"
                      }`}
                    >
                      {idUploaded ? (
                        <>
                          <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                          <span className="font-semibold">Document uploaded</span>
                          <span className="text-xs text-emerald-500/80 truncate max-w-[90%]">{fileName}</span>
                        </>
                      ) : isUploading ? (
                        <>
                          <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                          <span className="font-semibold">Uploading... {uploadProgress}%</span>
                          <div className="w-[80%] h-1.5 bg-white/8 rounded-full overflow-hidden mt-1">
                            <div className="h-full bg-indigo-500 rounded-full transition-all duration-150" style={{ width: `${uploadProgress}%` }} />
                          </div>
                        </>
                      ) : (
                        <>
                          <Upload className="w-6 h-6" />
                          <span>Click to upload National ID photo</span>
                          <span className="text-[10px] text-white/25">JPG, PNG or PDF — max 5MB</span>
                        </>
                      )}
                    </label>
                  </div>
                  {error && <p className="text-rose-400 text-xs bg-rose-500/10 border border-rose-500/20 rounded-lg px-3 py-2">{error}</p>}
                  <div className="flex gap-3">
                    <button onClick={() => setStep(2)} className="flex-1 bg-white/6 hover:bg-white/10 text-white py-2.5 rounded-xl text-sm font-semibold transition-all">Back</button>
                    <button onClick={handleSignUpStep3} disabled={loading} className={`flex-1 ${accentCls.btn} text-white py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-50`}>
                      {loading ? "Verifying…" : "Submit KYC"}
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
