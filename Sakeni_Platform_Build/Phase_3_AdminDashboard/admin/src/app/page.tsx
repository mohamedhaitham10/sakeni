"use client";

import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import {
  Activity, CreditCard, DollarSign, Users,
  TrendingUp, Shield, Globe, ArrowUp,
} from "lucide-react";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { Modal } from "@/components/Modal";
import { ChatPanel } from "@/components/ChatPanel";

type Locale = "en" | "ar";

/* ─── i18n ─────────────────────────────────────────────── */
const T = {
  en: {
    brand:"SAKENI", admin:"Admin",
    overview:"Dashboard Overview", welcome:"Welcome back. Here's what's happening today.",
    dlReport:"Download Report",
    totalRev:"Total Revenue",  subs:"Subscriptions", sales:"Sales", activeNow:"Active Now",
    trendRev:"+20.1% from last month", trendSubs:"+180.1% from last month",
    trendSales:"+19% from last month", trendActive:"+201 since last hour",
    revenueChart:"Revenue Growth", recentAct:"Recent Activity",
    newUser:"New user registered", minAgo:"min ago",
    recentSignups:"Recent Sign-ups",
    colName:"Name", colType:"Type", colCity:"City", colJoined:"Joined", colStatus:"Status",
    verified:"Verified", pending:"Pending",
    health:"Platform Health", uptime:"Uptime", respTime:"Avg. Response",
    apiCalls:"API Calls Today", errRate:"Error Rate",
    allSystems:"All systems operational",
    student:"Student", landlord:"Landlord",
    months:["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"],
  },
  ar: {
    brand:"ساكني", admin:"المشرف",
    overview:"نظرة عامة على لوحة التحكم", welcome:"مرحباً بعودتك. إليك ما يحدث اليوم.",
    dlReport:"تحميل التقرير",
    totalRev:"إجمالي الإيرادات", subs:"الاشتراكات", sales:"المبيعات", activeNow:"نشط الآن",
    trendRev:"+20.1% من الشهر الماضي", trendSubs:"+180.1% من الشهر الماضي",
    trendSales:"+19% من الشهر الماضي", trendActive:"+201 منذ الساعة الأخيرة",
    revenueChart:"نمو الإيرادات", recentAct:"النشاط الأخير",
    newUser:"مستخدم جديد مسجّل", minAgo:"د مضت",
    recentSignups:"المسجلون الأخيرون",
    colName:"الاسم", colType:"النوع", colCity:"المدينة", colJoined:"انضم", colStatus:"الحالة",
    verified:"موثق", pending:"معلق",
    health:"صحة المنصة", uptime:"وقت التشغيل", respTime:"متوسط الاستجابة",
    apiCalls:"طلبات API اليوم", errRate:"معدل الأخطاء",
    allSystems:"جميع الأنظمة تعمل",
    student:"طالب", landlord:"مالك",
    months:["يناير","فبراير","مارس","أبريل","مايو","يونيو","يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"],
  },
} as const;

/* ─── Static data ───────────────────────────────────────── */
const BAR_H   = [35,50,42,65,55,72,60,80,70,88,75,95];
const REV_VAL = [28400,31200,35100,39800,42100,45231,0,0,0,0,0,0];

interface Activity { u: string; m: number; }
const ACTIVITY: Activity[] = [
  {u:"Ahmed H.",   m:2},
  {u:"Sara M.",    m:4},
  {u:"Omar K.",    m:6},
  {u:"Nour A.",    m:8},
  {u:"Youssef S.", m:10},
];

/* ─── Sub-components (module-level to avoid parser issues) ─ */
function Field({label, value}: {label:string; value:string}) {
  return (
    <div className="flex justify-between py-2.5 border-b border-white/6 text-sm last:border-none">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-bold">{value}</span>
    </div>
  );
}

interface PlatformUser {
  id: string;
  name: string;
  type: string;
  city: string;
  joined: string;
  status: "verified" | "pending" | "rejected";
  nationalId?: string;
  birthdate?: string;
  gender?: string;
  governorate?: string;
  email?: string;
  isDynamic?: boolean;
  dynamicRole?: "student" | "landlord";
}

/* ─── Page ──────────────────────────────────────────────── */
export default function AdminPage() {
  const [locale, setLocale] = useState<Locale>("en");
  const [modal,  setModal]  = useState<{title:string; body:React.ReactNode}|null>(null);
  const [toast,  setToast]  = useState("");
  const [users,  setUsers]  = useState<PlatformUser[]>([]);

  const [studentCount, setStudentCount] = useState(0);
  const [landlordCount, setLandlordCount] = useState(0);
  const [activeCount, setActiveCount] = useState(0);
  const totalRevenue = landlordCount * 4500;

  // Fetch counts from Supabase DB
  useEffect(() => {
    const fetchStats = async () => {
      const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
      const { data, error } = await supabase.from('profiles').select('type, status');
      if (error) {
        console.error('Error fetching profiles:', error);
        return;
      }
      let sCount = 0, lCount = 0, aCount = 0;
      data?.forEach((p: { type: string; status: string }) => {
        if (p.type === 'student') sCount++;
        if (p.type === 'landlord') lCount++;
        if (p.status === 'verified') aCount++;
      });
      setStudentCount(sCount);
      setLandlordCount(lCount);
      setActiveCount(aCount);
    };
    fetchStats();
  }, []);

  useEffect(() => {
    setLocale((document.documentElement.lang as Locale) || "en");
  }, []);

  const t    = T[locale];
  const close     = () => setModal(null);
  const showToast = (msg:string) => { setToast(msg); setTimeout(() => setToast(""), 2500); };

  const loadUsers = () => {
    const initialSignups: PlatformUser[] = [];

    const savedStatic = localStorage.getItem("sk_admin_users");
    let currentUsers = savedStatic ? JSON.parse(savedStatic) : initialSignups;

    const dynamicStudent = localStorage.getItem("sk_auth_student");
    if (dynamicStudent) {
      const parsed = JSON.parse(dynamicStudent);
      currentUsers = currentUsers.filter((u: PlatformUser) => u.email !== parsed.email);
      currentUsers.unshift({
        id: "dynamic_student",
        name: parsed.name,
        type: parsed.role,
        city: parsed.city || parsed.governorate || "Cairo",
        joined: "Just Now",
        status: parsed.kycStatus,
        nationalId: parsed.nationalId,
        birthdate: parsed.birthdate || "1999-01-01",
        gender: parsed.gender || "Male",
        governorate: parsed.governorate || "Cairo",
        email: parsed.email,
        isDynamic: true,
        dynamicRole: "student"
      });
    }

    const dynamicLandlord = localStorage.getItem("sk_auth_landlord");
    if (dynamicLandlord) {
      const parsed = JSON.parse(dynamicLandlord);
      currentUsers = currentUsers.filter((u: PlatformUser) => u.email !== parsed.email);
      currentUsers.unshift({
        id: "dynamic_landlord",
        name: parsed.name,
        type: parsed.role,
        city: parsed.city || parsed.governorate || "Cairo",
        joined: "Just Now",
        status: parsed.kycStatus,
        nationalId: parsed.nationalId,
        birthdate: parsed.birthdate || "1978-05-15",
        gender: parsed.gender || "Male",
        governorate: parsed.governorate || "Cairo",
        email: parsed.email,
        isDynamic: true,
        dynamicRole: "landlord"
      });
    }

    setUsers(currentUsers);
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleModerate = (userId: string, newStatus: "verified" | "rejected" | "pending") => {
    const updated = users.map(u => {
      if (u.id === userId) {
        if (u.isDynamic) {
          const authKey = `sk_auth_${u.dynamicRole}`;
          const currentAuth = localStorage.getItem(authKey);
          if (currentAuth) {
            const parsed = JSON.parse(currentAuth);
            parsed.kycStatus = newStatus;
            localStorage.setItem(authKey, JSON.stringify(parsed));
          }
        }
        return { ...u, status: newStatus };
      }
      return u;
    });

    setUsers(updated);
    localStorage.setItem("sk_admin_users", JSON.stringify(updated));
    showToast(`User status updated to ${newStatus} ✓`);
    close();
  };

  /* modal bodies */
  const openReport = () => setModal({
    title: t.dlReport,
    body: (
      <div>
        <div className="mb-4 p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-lg text-sm text-indigo-400">
          Sakeni Platform &middot; May 2026 Report
        </div>
        <Field label={t.totalRev}          value={`EGP ${totalRevenue.toLocaleString()}`}/>
        <Field label={t.subs}              value={`${studentCount + landlordCount}`}/>
        <Field label={t.sales}             value={`EGP ${totalRevenue.toLocaleString()}`}/>
        <Field label={t.activeNow}         value={`${activeCount}`}/>
        <Field label="New Listings"        value="—"/>
        <Field label="Avg. Rent (Cairo)"   value="—"/>
        <Field label="Student Sign-ups"    value="—"/>
        <Field label="Landlord Sign-ups"   value="—"/>
        <div className="flex gap-3 mt-5">
          <button
            onClick={() => { showToast("Report downloaded ✓"); close(); }}
            className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white py-2.5 rounded-lg font-semibold transition-all"
          >
            Download PDF
          </button>
          <button
            onClick={() => window.print()}
            className="flex-1 bg-white/8 hover:bg-white/12 text-white py-2.5 rounded-lg font-semibold border border-white/10 transition-all"
          >
            Print
          </button>
        </div>
      </div>
    ),
  });

  const openCard = (title:string, body:React.ReactNode) => setModal({title, body});

  const openActivity = (u:string, m:number) => setModal({
    title: "User Activity",
    body: (
      <div className="text-sm space-y-1">
        <p className="mb-3">
          <span className="font-bold">{u}</span> {t.newUser.toLowerCase()} {m} {t.minAgo}.
        </p>
        <Field label="Platform" value="Student Portal"/>
        <Field label="Location" value="Cairo, Egypt"/>
        <Field label="Device"   value="Mobile"/>
        <Field label="Session"  value="12m 30s"/>
      </div>
    ),
  });

  const openSignup = (u: PlatformUser) => setModal({
    title: u.name,
    body: (
      <div className="text-sm space-y-4">
        <div className="space-y-0.5">
          <Field label={t.colType}   value={u.type === "student" ? t.student : t.landlord}/>
          <Field label={t.colCity}   value={u.city}/>
          <Field label={t.colJoined} value={u.joined}/>
          <Field label={t.colStatus} value={u.status === "verified" ? t.verified : u.status === "rejected" ? "Rejected" : t.pending}/>
          <Field label="Email"       value={u.email || `${u.name.split(" ")[0].toLowerCase()}@sakeni.eg`}/>
          <Field label="National ID" value={u.nationalId || "N/A"}/>
          <Field label="Birth Date"  value={u.birthdate || "N/A"}/>
          <Field label="Gender"      value={u.gender || "N/A"}/>
          <Field label="Governorate" value={u.governorate || "N/A"}/>
        </div>
        
        <div className="flex gap-3 pt-2">
          {u.status !== "verified" && (
            <button
              onClick={() => handleModerate(u.id, "verified")}
              className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white py-2.5 rounded-xl font-semibold transition-all text-xs"
            >
              Approve KYC
            </button>
          )}
          {u.status !== "rejected" && (
            <button
              onClick={() => handleModerate(u.id, "rejected")}
              className="flex-1 bg-rose-600 hover:bg-rose-500 text-white py-2.5 rounded-xl font-semibold transition-all text-xs border border-rose-500/20"
            >
              Reject KYC
            </button>
          )}
          {u.status !== "pending" && (
            <button
              onClick={() => handleModerate(u.id, "pending")}
              className="flex-1 bg-white/6 hover:bg-white/10 text-white py-2.5 rounded-xl font-semibold transition-all text-xs border border-white/10"
            >
              Reset to Pending
            </button>
          )}
        </div>
      </div>
    ),
  });

  return (
    <div className="min-h-screen text-foreground">

      {/* ── Header ── */}
      <header className="glass fixed top-0 w-full left-0 z-40 px-5 py-3.5 flex justify-between items-center">
        <h1 className="text-xl font-bold tracking-tighter">
          <span className="text-gradient">{t.brand}</span>{" "}
          <span className="text-white/60 text-base font-normal">{t.admin}</span>
        </h1>
        <div className="flex items-center gap-2">
          <LanguageSwitcher currentLocale={locale}/>
          <div className="h-9 w-9 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold text-sm shadow-lg ring-2 ring-indigo-500/40 cursor-pointer hover:scale-105 transition-transform">
            SA
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto pt-20 pb-16 px-4 sm:px-6 space-y-6">

        {/* ── Title row ── */}
        <div className="flex justify-between items-end flex-wrap gap-4">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">{t.overview}</h2>
            <p className="text-muted-foreground mt-1 text-sm">{t.welcome}</p>
          </div>
          <button
            onClick={openReport}
            className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2.5 rounded-lg font-semibold shadow-lg shadow-indigo-500/20 transition-all text-sm"
          >
            {t.dlReport}
          </button>
        </div>

        {/* ── Stat cards ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

          {/* Total Revenue */}
          <div
            className="glass-card p-5 group cursor-pointer"
            onClick={() => openCard(t.totalRev, (
              <div className="text-sm">Revenue details are derived from the database.</div>
            ))}
          >
            <div className="flex justify-between items-start mb-3">
              <p className="text-xs font-medium text-muted-foreground group-hover:text-white transition-colors">{t.totalRev}</p>
              <div className="p-2 bg-white/5 rounded-lg group-hover:bg-white/10 transition-colors">
                <DollarSign className="w-5 h-5 text-emerald-400"/>
              </div>
            </div>
            <h3 className="text-2xl font-bold tracking-tight mb-1.5">{`EGP ${totalRevenue.toLocaleString()}`}</h3>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <ArrowUp className="w-3 h-3 text-emerald-400"/> {t.trendRev}
            </p>
          </div>

          {/* Subscriptions */}
          <div
            className="glass-card p-5 group cursor-pointer"
            onClick={() => openCard(t.subs, (
              <div className="text-sm">Subscription statistics are derived from the database.</div>
            ))}
          >
            <div className="flex justify-between items-start mb-3">
              <p className="text-xs font-medium text-muted-foreground group-hover:text-white transition-colors">{t.subs}</p>
              <div className="p-2 bg-white/5 rounded-lg group-hover:bg-white/10 transition-colors">
                <Users className="w-5 h-5 text-indigo-400"/>
              </div>
            </div>
            <h3 className="text-2xl font-bold tracking-tight mb-1.5">{studentCount + landlordCount}</h3>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <ArrowUp className="w-3 h-3 text-emerald-400"/> {t.trendSubs}
            </p>
          </div>

          {/* Sales */}
          <div
            className="glass-card p-5 group cursor-pointer"
            onClick={() => openCard(t.sales, (
              <div className="text-sm">Sales data are derived from the database.</div>
            ))}
          >
            <div className="flex justify-between items-start mb-3">
              <p className="text-xs font-medium text-muted-foreground group-hover:text-white transition-colors">{t.sales}</p>
              <div className="p-2 bg-white/5 rounded-lg group-hover:bg-white/10 transition-colors">
                <CreditCard className="w-5 h-5 text-purple-400"/>
              </div>
            </div>
            <h3 className="text-2xl font-bold tracking-tight mb-1.5">{`EGP ${totalRevenue.toLocaleString()}`}</h3>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <ArrowUp className="w-3 h-3 text-emerald-400"/> {t.trendSales}
            </p>
          </div>

          {/* Active Now */}
          <div
            className="glass-card p-5 group cursor-pointer"
            onClick={() => openCard(t.activeNow, (
              <div className="text-sm">Active user counts are derived from the database.</div>
            ))}
          >
            <div className="flex justify-between items-start mb-3">
              <p className="text-xs font-medium text-muted-foreground group-hover:text-white transition-colors">{t.activeNow}</p>
              <div className="p-2 bg-white/5 rounded-lg group-hover:bg-white/10 transition-colors">
                <Activity className="w-5 h-5 text-rose-400"/>
              </div>
            </div>
            <h3 className="text-2xl font-bold tracking-tight mb-1.5">{activeCount}</h3>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <ArrowUp className="w-3 h-3 text-emerald-400"/> {t.trendActive}
            </p>
          </div>

        </div>

        {/* ── Charts row ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

          {/* Revenue bar chart */}
          <div className="glass-card p-5 lg:col-span-2 flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">{t.revenueChart}</h3>
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-400"/> +20.1%
              </span>
            </div>

            {/* Chart area */}
            <div className="relative flex-1 min-h-[200px]">
              {/* Horizontal grid lines + y-labels */}
              <div className="absolute inset-0 flex flex-col justify-between pointer-events-none" style={{paddingBottom:"24px"}}>
                {[100, 75, 50, 25].map(pct => (
                  <div key={pct} className="flex items-center gap-2">
                    <span className="text-[9px] text-white/30 w-7 text-right shrink-0">{pct}%</span>
                    <div className="flex-1 border-t border-white/8"/>
                  </div>
                ))}
              </div>

              {/* Bars */}
              <div
                className="absolute flex items-end gap-1"
                style={{left:"36px", right:"0", top:"0", bottom:"24px"}}
              >
                {BAR_H.map((h, i) => (
                  <button
                    key={i}
                    className="flex-1 rounded-t-sm bg-gradient-to-t from-indigo-600 to-indigo-400 hover:from-indigo-500 hover:to-violet-400 cursor-pointer transition-colors focus:outline-none"
                    style={{height:`${h}%`}}
                    onClick={() => showToast(`${t.months[i]}: EGP ${REV_VAL[i] ? REV_VAL[i].toLocaleString() : "—"}`)}
                    title={t.months[i]}
                  />
                ))}
              </div>

              {/* Month labels */}
              <div
                className="absolute flex justify-between"
                style={{left:"36px", right:"0", bottom:"0", height:"20px"}}
              >
                {t.months.map(m => (
                  <span key={m} className="text-[9px] text-muted-foreground flex-1 text-center">{m.slice(0,3)}</span>
                ))}
              </div>
            </div>
          </div>

          {/* Recent activity */}
          <div className="glass-card p-5">
            <h3 className="text-lg font-semibold mb-3">{t.recentAct}</h3>
            <div className="space-y-0.5">
              {ACTIVITY.map(a => (
                <div
                  key={a.u}
                  className="flex items-center gap-3 px-2 py-2.5 rounded-lg hover:bg-white/5 cursor-pointer transition-colors"
                  onClick={() => openActivity(a.u, a.m)}
                >
                  <div className="w-2 h-2 rounded-full bg-indigo-500 shrink-0"/>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium">{t.newUser}</p>
                    <p className="text-[11px] text-muted-foreground">{a.u} &middot; {a.m} {t.minAgo}</p>
                  </div>
                  <span className="text-white/20 text-xs">›</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Platform health + Recent sign-ups ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

          {/* Platform health */}
          <div className="glass-card p-5">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Shield className="w-4 h-4 text-emerald-400"/>
              {t.health}
            </h3>
            <div className="space-y-4">
              {([
                [t.uptime,    "99.98%", 99.98, "bg-emerald-500"],
                [t.respTime,  "124 ms", 88,    "bg-indigo-500" ],
                [t.apiCalls,  "84,201", 72,    "bg-purple-500" ],
                [t.errRate,   "0.02%",  2,     "bg-rose-500"   ],
              ] as [string,string,number,string][]).map(([label, value, bar, color]) => (
                <div key={label}>
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="text-muted-foreground">{label}</span>
                    <span className="font-bold">{value}</span>
                  </div>
                  <div className="h-1.5 bg-white/8 rounded-full overflow-hidden">
                    <div className={`h-full ${color} rounded-full`} style={{width:`${bar}%`}}/>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 flex items-center gap-2 text-xs text-emerald-400">
              <Globe className="w-3.5 h-3.5"/>
              {t.allSystems}
            </div>
          </div>

          {/* Recent sign-ups table */}
          <div className="glass-card p-5 lg:col-span-2">
            <h3 className="text-lg font-semibold mb-4">{t.recentSignups}</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-muted-foreground border-b border-white/8">
                    <th className="text-start pb-2.5 font-medium">{t.colName}</th>
                    <th className="text-start pb-2.5 font-medium">{t.colType}</th>
                    <th className="text-start pb-2.5 font-medium hidden sm:table-cell">{t.colCity}</th>
                    <th className="text-start pb-2.5 font-medium hidden md:table-cell">{t.colJoined}</th>
                    <th className="text-start pb-2.5 font-medium">{t.colStatus}</th>
                    <th className="text-start pb-2.5 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((s, i) => (
                    <tr
                      key={s.id || i}
                      className="border-b border-white/4 hover:bg-white/4 cursor-pointer transition-colors last:border-none"
                      onClick={() => openSignup(s)}
                    >
                      <td className="py-2.5 pr-3">
                        <div className="flex items-center gap-2">
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${s.type==="student" ? "bg-emerald-500/20 text-emerald-400" : "bg-amber-500/20 text-amber-400"}`}>
                            {s.name.split(" ").map((n: string)=>n[0]).join("").slice(0,2)}
                          </div>
                          <span className="font-medium text-xs truncate max-w-[90px]">{s.name}</span>
                        </div>
                      </td>
                      <td className="py-2.5 pr-3">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full border ${s.type==="student" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-amber-500/10 text-amber-400 border-amber-500/20"}`}>
                          {s.type==="student" ? t.student : t.landlord}
                        </span>
                      </td>
                      <td className="py-2.5 pr-3 text-xs text-muted-foreground hidden sm:table-cell">{s.city}</td>
                      <td className="py-2.5 pr-3 text-xs text-muted-foreground hidden md:table-cell">{s.joined}</td>
                      <td className="py-2.5 pr-3">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full border ${s.status==="verified" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : s.status === "rejected" ? "bg-rose-500/10 text-rose-400 border-rose-500/20" : "bg-amber-500/10 text-amber-400 border-amber-500/20"}`}>
                          {s.status==="verified" ? t.verified : s.status === "rejected" ? "Rejected" : t.pending}
                        </span>
                      </td>
                      <td className="py-2.5">
                        <div className="flex gap-1.5" onClick={e => e.stopPropagation()}>
                          {s.status === "pending" ? (
                            <>
                              <button
                                onClick={() => handleModerate(s.id, "verified")}
                                className="bg-emerald-600 hover:bg-emerald-500 text-white px-2 py-1 rounded text-[10px] font-semibold transition-all"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => handleModerate(s.id, "rejected")}
                                className="bg-rose-600 hover:bg-rose-500 text-white px-2 py-1 rounded text-[10px] font-semibold transition-all"
                              >
                                Reject
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => handleModerate(s.id, "pending")}
                              className="bg-white/8 hover:bg-white/12 text-white px-2 py-1 rounded text-[10px] border border-white/10 transition-all"
                            >
                              Reset
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

      </main>

      <Modal open={!!modal} title={modal?.title ?? ""} onClose={close}>
        {modal?.body}
      </Modal>

      <ChatPanel role="admin" myName="Admin" />

      {/* Toast */}
      <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 bg-[#1a1a35] border border-white/15 text-white px-5 py-2.5 rounded-xl text-sm font-semibold shadow-2xl z-50 transition-all duration-300 whitespace-nowrap ${toast ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3 pointer-events-none"}`}>
        {toast}
      </div>
    </div>
  );
}
