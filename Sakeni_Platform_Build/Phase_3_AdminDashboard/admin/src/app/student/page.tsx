"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import {
  Search, Heart, Home, BookOpen, Eye, Bed, Bath, Square,
  MapPin, SlidersHorizontal, X, ArrowUpDown, ChevronRight, MessageCircle,
} from "lucide-react";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { Modal } from "@/components/Modal";
import { KYCModal, getAuth, setAuth, AuthUser } from "@/components/KYCModal";
import { ChatPanel, openListingChat } from "@/components/ChatPanel";

type Locale = "en" | "ar";
type Tab = "featured" | "all" | "saved" | "applications";
type AppStatus = "pending" | "approved" | "declined";
type SortKey = "default" | "price-asc" | "price-desc" | "size-desc";

interface Listing {
  id: number;
  name: Record<Locale, string>;
  loc: Record<Locale, string>;
  city: string;
  nearUniversity: string;
  price: number;
  deposit: number;
  beds: number;
  baths: number;
  sqft: number;
  furnished: boolean;
  utilities: boolean;
  gender: "any" | "male" | "female";
  tags: string[];
  accent: string;
  photo: string;
}

interface Application {
  id: number;
  listingId: number;
  status: AppStatus;
  date: string;
  message: string;
  name: string;
  university: string;
  phone: string;
  lease: string;
  moveIn: string;
}



const ACCENT_BG: Record<string, string> = {
  emerald:"from-emerald-500/25 to-teal-500/10",   indigo:"from-indigo-500/25 to-purple-500/10",
  sky:"from-sky-500/25 to-blue-500/10",            amber:"from-amber-500/25 to-orange-500/10",
  blue:"from-blue-500/25 to-indigo-500/10",        violet:"from-violet-500/25 to-purple-500/10",
  rose:"from-rose-500/25 to-pink-500/10",          cyan:"from-cyan-500/25 to-teal-500/10",
  pink:"from-pink-500/25 to-rose-500/10",          teal:"from-teal-500/25 to-emerald-500/10",
  orange:"from-orange-500/25 to-amber-500/10",     fuchsia:"from-fuchsia-500/25 to-pink-500/10",
};

const UNIVERSITIES = [
  "Cairo University","Ain Shams University",
  "American University in Cairo (AUC)","German University in Cairo (GUC)",
  "Helwan University","Mansoura University","October University (MUST)",
  "Misr International University (MIU)","Future University in Egypt (FUE)",
];

const INIT_SAVED: number[] = [];
const INIT_APPS: Application[] = [];

const EN = {
  brand:"SAKENI", student:"Student", findYourHome:"Find Your Perfect Home",
  searchPlaceholder:"Search by city, district or university...",
  search:"Search", filtersBtn:"Filters", sortBtn:"Sort", clearAll:"Clear all",
  maxPrice:"Max Price (EGP/mo)", cityLabel:"City", bedsLabel:"Bedrooms", furnishedLabel:"Furnished",
  uniLabel:"Near University",
  applyFilters:"Apply Filters",
  tabFeatured:"Featured", tabAll:"All Listings", tabSaved:"Saved", tabApps:"Applications",
  available:"Available", saved:"Saved", applications:"Applications", profileViews:"Profile Views",
  perMonth:"/mo", beds:"bed", baths:"ba", sqm:"m²",
  depositLabel:"Deposit",
  applyNow:"Apply Now", appliedBtn:"✓ Applied", chatBtn:"Chat",
  noListings:"No listings match your search.", noSaved:"No saved listings yet. Start exploring!",
  noApps:"No applications sent yet.", browseAll:"Browse Listings",
  fullName:"Full Name", phone:"Phone", university:"University / Institution",
  moveIn:"Move-in Date", lease:"Lease Duration", msgLabel:"Message to Landlord",
  submitApp:"Submit Application", fieldRequired:"This field is required",
  alreadyApplied:"You already applied to this listing",
  appSubmitted:"Application submitted! ✓",
  savedMsg:"Saved ♥", removedMsg:"Removed from saved",
  appsPending:"Pending Review", appsApproved:"Approved", appsDeclined:"Declined",
  sortDefault:"Default order", sortPriceAsc:"Price: Low to High", sortPriceDesc:"Price: High to Low", sortSizeDesc:"Largest first",
  myProfile:"My Profile", editProfile:"Edit Profile",
  pendingNote:"Being reviewed — you'll hear back in 2–3 business days.",
  approvedNote:"Approved! The landlord will contact you shortly.",
  declinedNote:"Not successful this time.",
  viewDetails:"View Details", signOut:"Sign Out",
};
const AR: typeof EN = {
  brand:"ساكني", student:"الطالب", findYourHome:"ابحث عن منزلك المثالي",
  searchPlaceholder:"ابحث بالمدينة أو الحي أو الجامعة...",
  search:"بحث", filtersBtn:"الفلاتر", sortBtn:"ترتيب", clearAll:"مسح الكل",
  maxPrice:"أقصى سعر (جنيه/شهر)", cityLabel:"المدينة", bedsLabel:"غرف النوم", furnishedLabel:"مفروش",
  uniLabel:"قرب الجامعة",
  applyFilters:"تطبيق الفلاتر",
  tabFeatured:"المميزة", tabAll:"كل الوحدات", tabSaved:"المحفوظات", tabApps:"طلباتي",
  available:"المتاحة", saved:"المحفوظات", applications:"الطلبات", profileViews:"مشاهدات الملف",
  perMonth:"/شهر", beds:"غرفة", baths:"حمام", sqm:"م²",
  depositLabel:"التأمين",
  applyNow:"تقدم الآن", appliedBtn:"✓ تقدمت", chatBtn:"محادثة",
  noListings:"لا توجد وحدات تطابق بحثك.", noSaved:"لا توجد وحدات محفوظة بعد.",
  noApps:"لم ترسل طلبات بعد.", browseAll:"تصفح الوحدات",
  fullName:"الاسم الكامل", phone:"الهاتف", university:"الجامعة / المؤسسة",
  moveIn:"تاريخ الانتقال", lease:"مدة الإيجار", msgLabel:"رسالة للمالك",
  submitApp:"إرسال الطلب", fieldRequired:"هذا الحقل مطلوب",
  alreadyApplied:"لقد تقدمت لهذه الوحدة بالفعل",
  appSubmitted:"تم إرسال الطلب! ✓",
  savedMsg:"تم الحفظ ♥", removedMsg:"تمت الإزالة",
  appsPending:"قيد المراجعة", appsApproved:"مقبول", appsDeclined:"مرفوض",
  sortDefault:"الافتراضي", sortPriceAsc:"السعر: من الأقل", sortPriceDesc:"السعر: من الأعلى", sortSizeDesc:"الأكبر أولاً",
  myProfile:"ملفي الشخصي", editProfile:"تعديل الملف",
  pendingNote:"جارٍ المراجعة — ستُخطَر خلال 2–3 أيام عمل.",
  approvedNote:"مقبول! سيتواصل معك المالك قريباً.",
  declinedNote:"لم تنجح هذه المرة.",
  viewDetails:"عرض التفاصيل", signOut:"تسجيل الخروج",
};

const BLANK_FORM = { name:"", phone:"", university:"", moveIn:"", lease:"12 months", message:"" };

export default function StudentPage() {
  const [locale, setLocale] = useState<Locale>("en");
  const [tab, setTab]       = useState<Tab>("featured");
  const [saved,  setSaved]  = useState<Set<number>>(new Set(INIT_SAVED));
  const [apps,   setApps]   = useState<Application[]>(INIT_APPS);
  const [query,  setQuery]  = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [showSort,    setShowSort]    = useState(false);
  const [fPrice,      setFPrice]      = useState("");
  const [fCity,       setFCity]       = useState("");
  const [fBeds,       setFBeds]       = useState("");
  const [fFurnish,    setFFurnish]    = useState("");
  const [fUniversity, setFUniversity] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("default");
  const [applyTarget, setApplyTarget] = useState<Listing | null>(null);
  const [viewTarget,  setViewTarget]  = useState<Listing | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [form,       setForm]   = useState({ ...BLANK_FORM });
  const [formErrors, setFormErrors] = useState<Partial<typeof BLANK_FORM>>({});
  const [toast, setToast] = useState<{ msg:string; green?:boolean } | null>(null);
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [authLoaded, setAuthLoaded] = useState(false);
  const sortRef = useRef<HTMLDivElement>(null);
  const [listingsList, setListingsList] = useState<Listing[]>([]);

  useEffect(() => {
    setLocale((document.documentElement.lang as Locale) || "en");
    setAuthUser(getAuth("student"));
    setAuthLoaded(true);
  }, []);

  useEffect(() => {
    try {
      const ls = localStorage.getItem("sk_ll_listings");
      if (ls) {
        interface LLListing {
          id: number;
          name: string;
          city: string;
          district: string;
          price: number;
          sqft: number;
          beds: number;
          baths: number;
          status: string;
          photos: string[];
        }
        const parsed = (JSON.parse(ls) as LLListing[]).filter(l => l.status === "active");
        const formatted: Listing[] = parsed.map((l: LLListing) => ({
          id: l.id,
          name: { en: l.name, ar: l.name },
          loc: { en: `${l.city}, ${l.district}`, ar: `${l.city === "Cairo" ? "القاهرة" : "الجيزة"}، ${l.district}` },
          city: l.city,
          nearUniversity: "Cairo University",
          price: l.price,
          deposit: l.price,
          beds: l.beds,
          baths: l.baths,
          sqft: l.sqft,
          furnished: true,
          utilities: false,
          gender: "any",
          tags: ["Dynamic"],
          accent: "indigo",
          photo: l.photos[0] || "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=400&h=200&fit=crop"
        }));
        setListingsList(formatted);
      } else {
        setListingsList([]);
      }
    } catch {
      setListingsList([]);
    }
  }, []);

  useEffect(() => {
    try {
      const s = localStorage.getItem("sk_saved");
      if (s) setSaved(new Set(JSON.parse(s)));
      const a = localStorage.getItem("sk_ll_applicants");
      if (a) setApps(JSON.parse(a));
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { try { localStorage.setItem("sk_saved", JSON.stringify(Array.from(saved))); } catch { /* ignore */ } }, [saved]);
  useEffect(() => { try { localStorage.setItem("sk_ll_applicants",  JSON.stringify(apps));       } catch { /* ignore */ } }, [apps]);

  useEffect(() => {
    const fn = (e: MouseEvent) => { if (sortRef.current && !sortRef.current.contains(e.target as Node)) setShowSort(false); };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, []);

  const t = locale === "ar" ? AR : EN;
  const appliedIds = useMemo(() => new Set(apps.map(a => a.listingId)), [apps]);
  const hasFilters  = !!(fPrice || fCity || fBeds || fFurnish || fUniversity);
  const activeFilterCount = [fPrice,fCity,fBeds,fFurnish,fUniversity].filter(Boolean).length;

  const showToast = (msg: string, green = false) => {
    setToast({ msg, green });
    setTimeout(() => setToast(null), 2400);
  };

  const clearFilters = () => { setFPrice(""); setFCity(""); setFBeds(""); setFFurnish(""); setFUniversity(""); setQuery(""); };

  const filtered = useMemo(() => {
    let r = [...listingsList];
    const q = query.toLowerCase().trim();
    if (q) r = r.filter(l =>
      l.name[locale].toLowerCase().includes(q) ||
      l.loc[locale].toLowerCase().includes(q) ||
      l.city.toLowerCase().includes(q) ||
      l.nearUniversity.toLowerCase().includes(q)
    );
    if (fPrice)      r = r.filter(l => l.price  <= Number(fPrice));
    if (fCity)       r = r.filter(l => l.city   === fCity);
    if (fBeds)       r = r.filter(l => fBeds === "3+" ? l.beds >= 3 : l.beds === Number(fBeds));
    if (fFurnish)    r = r.filter(l => fFurnish === "yes" ? l.furnished : !l.furnished);
    if (fUniversity) r = r.filter(l => l.nearUniversity === fUniversity);
    if (sortKey === "price-asc")  r.sort((a,b) => a.price - b.price);
    if (sortKey === "price-desc") r.sort((a,b) => b.price - a.price);
    if (sortKey === "size-desc")  r.sort((a,b) => b.sqft  - a.sqft);
    return r;
  }, [listingsList, query, fPrice, fCity, fBeds, fFurnish, fUniversity, sortKey, locale]);

  const visibleListings = useMemo(() => {
    if (tab === "saved")    return listingsList.filter(l => saved.has(l.id));
    if (tab === "featured") return listingsList.slice(0, 6);
    return filtered;
  }, [listingsList, tab, saved, filtered]);

  const toggleSave = (id: number) => {
    setSaved(prev => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); showToast(t.removedMsg); }
      else              { next.add(id);    showToast(t.savedMsg, true); }
      return next;
    });
  };

  const openApply = (l: Listing) => {
    if (appliedIds.has(l.id)) { showToast(t.alreadyApplied); return; }
    setApplyTarget(l);
    setForm({ ...BLANK_FORM, name: authUser?.name ?? "", university: authUser?.university ?? "", phone: authUser?.phone ?? "" });
    setFormErrors({});
    setViewTarget(null);
  };

  const submitApply = () => {
    const errs: Partial<typeof BLANK_FORM> = {};
    if (!form.name.trim())       errs.name       = t.fieldRequired;
    if (!form.phone.trim())      errs.phone      = t.fieldRequired;
    if (!form.university.trim()) errs.university  = t.fieldRequired;
    if (Object.keys(errs).length) { setFormErrors(errs); return; }
    setApps(prev => [{
      id: Date.now(), listingId: applyTarget!.id, status: "pending",
      date: new Date().toISOString().slice(0,10),
      message: form.message, name: form.name,
      university: form.university, phone: form.phone, lease: form.lease,
      moveIn: form.moveIn || new Date().toISOString().slice(0,10),
    }, ...prev]);
    setApplyTarget(null);
    showToast(t.appSubmitted, true);
  };

  const setField = (key: keyof typeof BLANK_FORM) => (e: React.ChangeEvent<HTMLInputElement|HTMLTextAreaElement|HTMLSelectElement>) => {
    setForm(f => ({ ...f, [key]: e.target.value }));
    setFormErrors(fe => ({ ...fe, [key]: "" }));
  };

  const statusConfig = {
    pending:  { label: t.appsPending,  cls: "bg-amber-500/15 text-amber-400 border-amber-500/30"  },
    approved: { label: t.appsApproved, cls: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" },
    declined: { label: t.appsDeclined, cls: "bg-rose-500/15 text-rose-400 border-rose-500/30"   },
  };

  const handleInputChange = (field: keyof typeof BLANK_FORM, value: string) => {
    setForm(f => ({ ...f, [field]: value }));
    setFormErrors(fe => ({ ...fe, [field]: "" }));
  };

  const handleSignOut = () => {
    import("@/components/KYCModal").then(({ clearAuth }) => {
      clearAuth("student");
      localStorage.removeItem("sk_saved");
      setAuthUser(null);
      window.location.reload();
    });
  };

  return (
    <div className="min-h-screen text-foreground">
      {/* ── KYC Auth Gate ── */}
      {authLoaded && !authUser && (
        <KYCModal role="student" onAuth={user => { setAuth("student", user); setAuthUser(user); }} />
      )}

      {/* ── Header ── */}
      <header className="glass fixed top-0 w-full left-0 z-40 px-5 py-3.5 flex justify-between items-center">
        <h1 className="text-xl font-bold tracking-tighter">
          <span className="text-gradient">{t.brand}</span>{" "}
          <span className="text-white/60 text-base font-normal">{t.student}</span>
        </h1>
        <div className="flex items-center gap-2">
          <LanguageSwitcher currentLocale={locale} />
          {authUser && (
            <button
              onClick={handleSignOut}
              className="inline-flex items-center justify-center px-3 py-1.5 border border-rose-500/30 bg-rose-500/10 text-rose-400 rounded-lg text-xs font-semibold hover:bg-rose-500/20 transition-all mr-1"
            >
              {t.signOut}
            </button>
          )}
          <button onClick={() => setProfileOpen(true)} className="h-9 w-9 rounded-full bg-gradient-to-tr from-emerald-500 to-cyan-500 flex items-center justify-center text-white font-bold text-sm shadow-lg ring-2 ring-emerald-500/40 hover:scale-105 transition-transform">
            {authUser?.avatar ?? "ST"}
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto pt-20 pb-16 px-4 sm:px-6 space-y-5">

        {/* ── Search hero ── */}
        <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-emerald-950/50 to-cyan-950/30 p-5 sm:p-7 space-y-4">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-center">{t.findYourHome}</h2>

          <div className="flex gap-2 max-w-2xl mx-auto">
            <div className="flex-1 relative">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none"/>
              <input
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") setTab("all"); }}
                placeholder={t.searchPlaceholder}
                className="w-full bg-white/5 border border-white/10 rounded-xl ps-10 pe-4 py-2.5 text-sm focus:outline-none focus:border-emerald-500/50 focus:bg-white/8 transition-all"
              />
            </div>
            <button onClick={() => setTab("all")} className="bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2.5 rounded-xl font-semibold transition-all text-sm">{t.search}</button>
          </div>

          {/* Filter / Sort row */}
          <div className="flex items-center gap-2 justify-center flex-wrap">
            <button
              onClick={() => setShowFilters(f => !f)}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border text-sm transition-all ${showFilters || hasFilters ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-400" : "border-white/10 bg-white/5 text-muted-foreground hover:text-white"}`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5"/>
              {t.filtersBtn}
              {activeFilterCount > 0 && <span className="bg-emerald-500 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold">{activeFilterCount}</span>}
            </button>

            <div ref={sortRef} className="relative">
              <button
                onClick={() => setShowSort(s => !s)}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border text-sm transition-all ${sortKey !== "default" ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-400" : "border-white/10 bg-white/5 text-muted-foreground hover:text-white"}`}
              >
                <ArrowUpDown className="w-3.5 h-3.5"/>
                {t.sortBtn}
              </button>
              {showSort && (
                <div className="absolute top-full mt-2 start-0 bg-[#0d0d22] border border-white/12 rounded-xl shadow-2xl z-50 w-48 overflow-hidden py-1">
                  {([["default",t.sortDefault],["price-asc",t.sortPriceAsc],["price-desc",t.sortPriceDesc],["size-desc",t.sortSizeDesc]] as [SortKey,string][]).map(([v,l]) => (
                    <button key={v} onClick={() => { setSortKey(v); setShowSort(false); setTab("all"); }} className={`w-full text-start px-4 py-2.5 text-sm transition-colors hover:bg-white/5 ${sortKey===v ? "text-emerald-400 font-semibold" : "text-muted-foreground"}`}>{l}</button>
                  ))}
                </div>
              )}
            </div>

            {hasFilters && (
              <button onClick={clearFilters} className="flex items-center gap-1 px-3.5 py-1.5 rounded-full border border-rose-500/30 bg-rose-500/10 text-rose-400 text-sm hover:bg-rose-500/20 transition-all">
                <X className="w-3 h-3"/> {t.clearAll}
              </button>
            )}
          </div>

          {/* Inline filter panel */}
          {showFilters && (
            <div className="border-t border-white/8 pt-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs text-muted-foreground mb-1.5 font-medium">{t.maxPrice}</label>
                <input type="number" value={fPrice} onChange={e => setFPrice(e.target.value)} placeholder="e.g. 8000"
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-emerald-500/40 transition-all"/>
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1.5 font-medium">{t.cityLabel}</label>
                <select
                  value={fCity}
                  onChange={e => setFCity(e.target.value)}
                  className="w-full bg-[#0d0d22] border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-emerald-500/40 transition-all text-white"
                >
                  <option value="" className="bg-[#12122b] text-white">All cities</option>
                  <option value="Cairo" className="bg-[#12122b] text-white">Cairo</option>
                  <option value="Giza" className="bg-[#12122b] text-white">Giza</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1.5 font-medium">{t.bedsLabel}</label>
                <select
                  value={fBeds}
                  onChange={e => setFBeds(e.target.value)}
                  className="w-full bg-[#0d0d22] border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-emerald-500/40 transition-all text-white"
                >
                  <option value="" className="bg-[#12122b] text-white">Any</option>
                  <option value="1" className="bg-[#12122b] text-white">1 Bed</option>
                  <option value="2" className="bg-[#12122b] text-white">2 Beds</option>
                  <option value="3+" className="bg-[#12122b] text-white">3+ Beds</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1.5 font-medium">{t.furnishedLabel}</label>
                <select
                  value={fFurnish}
                  onChange={e => setFFurnish(e.target.value)}
                  className="w-full bg-[#0d0d22] border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-emerald-500/40 transition-all text-white"
                >
                  <option value="" className="bg-[#12122b] text-white">Any</option>
                  <option value="yes" className="bg-[#12122b] text-white">Furnished</option>
                  <option value="no" className="bg-[#12122b] text-white">Unfurnished</option>
                </select>
              </div>
              <div className="col-span-2">
                <label className="block text-xs text-muted-foreground mb-1.5 font-medium">{t.uniLabel}</label>
                <select
                  value={fUniversity}
                  onChange={e => setFUniversity(e.target.value)}
                  className="w-full bg-[#0d0d22] border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-emerald-500/40 transition-all text-white"
                >
                  <option value="" className="bg-[#12122b] text-white">All universities</option>
                  {UNIVERSITIES.map(u => (
                    <option key={u} value={u} className="bg-[#12122b] text-white">
                      {u}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-span-2 sm:col-span-3 flex justify-end gap-2">
                <button onClick={clearFilters} className="px-4 py-2 rounded-lg text-sm text-muted-foreground hover:text-white border border-white/10 hover:border-white/20 transition-all">{t.clearAll}</button>
                <button onClick={() => { setTab("all"); setShowFilters(false); }} className="bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2 rounded-lg text-sm font-semibold transition-all">{t.applyFilters}</button>
              </div>
            </div>
          )}
        </div>

        {/* ── Stats row ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label:t.available,    value:String(listingsList.length), color:"text-emerald-400", icon:<Home className="w-4 h-4"/>,     action:()=>setTab("all")          },
            { label:t.saved,        value:String(saved.size), color:"text-rose-400",    icon:<Heart className="w-4 h-4"/>,    action:()=>setTab("saved")        },
            { label:t.applications, value:String(apps.length),color:"text-indigo-400",  icon:<BookOpen className="w-4 h-4"/>, action:()=>setTab("applications") },
            { label:t.profileViews, value:"0",               color:"text-purple-400",  icon:<Eye className="w-4 h-4"/>,      action:()=>{}                     },
          ].map(s => (
            <div key={s.label} onClick={s.action} className="glass-card p-4 flex items-center gap-3 cursor-pointer group hover:border-white/20 transition-all">
              <div className={`${s.color} p-2 bg-white/5 rounded-lg group-hover:bg-white/10 transition-colors`}>{s.icon}</div>
              <div>
                <p className="text-lg font-bold leading-none">{s.value}</p>
                <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* ── University quick-filter chips ── */}
        {tab !== "applications" && (
          <div className="flex gap-2 flex-wrap">
            {UNIVERSITIES.slice(0, 5).map(u => (
              <button
                key={u}
                onClick={() => { setFUniversity(fUniversity === u ? "" : u); setTab("all"); }}
                className={`text-xs px-3 py-1.5 rounded-full border transition-all ${fUniversity === u ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-400" : "border-white/10 bg-white/4 text-white/50 hover:text-white hover:border-white/20"}`}
              >
                {u.split(" ")[0] === "American" ? "AUC" : u.split(" ")[0] === "German" ? "GUC" : u.split(",")[0].replace(" University","").replace(" (MUST)","").trim()}
              </button>
            ))}
            {fUniversity && !UNIVERSITIES.slice(0, 5).includes(fUniversity) && (
              <button className="text-xs px-3 py-1.5 rounded-full border border-emerald-500/50 bg-emerald-500/10 text-emerald-400">
                {fUniversity.length > 20 ? fUniversity.slice(0, 20) + "…" : fUniversity}
              </button>
            )}
          </div>
        )}

        {/* ── Tab nav ── */}
        <div className="flex gap-0.5 border-b border-white/8">
          {([
            ["featured",     `${t.tabFeatured}`],
            ["all",          `${t.tabAll} (${listingsList.length})`],
            ["saved",        `${t.tabSaved} (${saved.size})`],
            ["applications", `${t.tabApps} (${apps.length})`],
          ] as [Tab,string][]).map(([id,label]) => (
            <button
              key={id} onClick={() => setTab(id)}
              className={`px-4 py-2.5 text-sm font-medium transition-all rounded-t-lg whitespace-nowrap ${tab===id ? "text-emerald-400 border-b-2 border-emerald-500 bg-emerald-500/5" : "text-muted-foreground hover:text-white hover:bg-white/4"}`}
            >{label}</button>
          ))}
        </div>

        {/* ── Listings grid ── */}
        {tab !== "applications" && (
          <div className="space-y-4">
            {visibleListings.length === 0 ? (
              <div className="glass-card p-12 text-center space-y-4">
                <Home className="w-10 h-10 text-white/20 mx-auto"/>
                <p className="text-muted-foreground text-sm">{tab === "saved" ? t.noSaved : t.noListings}</p>
                <button onClick={() => { setTab("all"); clearFilters(); }} className="text-sm text-emerald-400 hover:text-emerald-300 underline transition-colors">{t.browseAll}</button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {visibleListings.map(l => (
                  <ListingCard
                    key={l.id}
                    l={l}
                    locale={locale}
                    t={t}
                    appliedIds={appliedIds}
                    saved={saved}
                    toggleSave={toggleSave}
                    openApply={openApply}
                    setViewTarget={setViewTarget}
                  />
                ))}
              </div>
            )}
            {tab === "featured" && (
              <div className="text-center">
                <button onClick={() => setTab("all")} className="inline-flex items-center gap-1 text-sm text-emerald-400 hover:text-emerald-300 border border-emerald-500/30 px-5 py-2 rounded-lg hover:bg-emerald-500/10 transition-all">
                  {t.tabAll} ({listingsList.length}) <ChevronRight className="w-4 h-4"/>
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── Applications tab ── */}
        {tab === "applications" && (
          <div className="space-y-3">
            {apps.length === 0 ? (
              <div className="glass-card p-12 text-center space-y-4">
                <BookOpen className="w-10 h-10 text-white/20 mx-auto"/>
                <p className="text-muted-foreground text-sm">{t.noApps}</p>
                <button onClick={() => setTab("all")} className="text-sm text-emerald-400 hover:underline">{t.browseAll}</button>
              </div>
            ) : apps.map(a => {
              const l = listingsList.find(x => x.id === a.listingId);
              if (!l) return null;
              const sc = statusConfig[a.status];
              const bg = ACCENT_BG[l.accent] ?? ACCENT_BG.emerald;
              return (
                <div key={a.id} className="glass-card p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${bg} flex items-center justify-center shrink-0 overflow-hidden`}>
                      <img src={l.photo} alt="" className="w-full h-full object-cover" onError={e => { (e.target as HTMLImageElement).style.display="none"; }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">{l.name[locale]}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{l.loc[locale]} · EGP {l.price.toLocaleString()}{t.perMonth}</p>
                    </div>
                    <div className="text-right shrink-0 space-y-1">
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-full border block ${sc.cls}`}>{sc.label}</span>
                      <span className="text-xs text-muted-foreground block">{a.date}</span>
                    </div>
                  </div>
                  {a.status === "pending"  && <div className="p-3 bg-amber-500/10   border border-amber-500/20   rounded-lg text-xs text-amber-400">⏳ {t.pendingNote}</div>}
                  {a.status === "approved" && (
                    <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-xs text-emerald-400 flex items-center justify-between gap-2">
                      <span>✅ {t.approvedNote} <span className="font-bold">+20 100 123 4567</span></span>
                      <button onClick={() => openListingChat(l.id, l.name["en"])} className="shrink-0 flex items-center gap-1 bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1 rounded-lg transition-all">
                        <MessageCircle className="w-3 h-3"/> {t.chatBtn}
                      </button>
                    </div>
                  )}
                  {a.status === "declined" && (
                    <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg text-xs text-rose-400 flex items-center justify-between">
                      <span>❌ {t.declinedNote}</span>
                      <button onClick={() => setTab("all")} className="text-emerald-400 hover:underline ml-2 shrink-0">{t.browseAll} →</button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* ── Apply modal ── */}
      <Modal open={!!applyTarget} title={t.applyNow} onClose={() => setApplyTarget(null)}>
        {applyTarget && (
          <div className="space-y-4">
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-sm">
              <p className="font-semibold">{applyTarget.name[locale]}</p>
              <p className="text-emerald-400 mt-0.5">EGP {applyTarget.price.toLocaleString()} {t.perMonth} &nbsp;·&nbsp; {t.depositLabel}: EGP {applyTarget.deposit.toLocaleString()}</p>
            </div>
            <InputField label={t.fullName} field="name" placeholder="e.g. Ahmed Hassan" form={form} formErrors={formErrors} onChange={handleInputChange} />
            <InputField label={t.phone} field="phone" type="tel" placeholder="+20 1xx xxx xxxx" form={form} formErrors={formErrors} onChange={handleInputChange} />
            <InputField label={t.university} field="university" placeholder="e.g. Cairo University" form={form} formErrors={formErrors} onChange={handleInputChange} />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-muted-foreground mb-1 font-medium">{t.moveIn}</label>
                <input type="date" value={form.moveIn} onChange={setField("moveIn")} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-emerald-500/40 transition-all"/>
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1 font-medium">{t.lease}</label>
                <select
                  value={form.lease}
                  onChange={setField("lease")}
                  className="w-full bg-[#0d0d22] border border-white/10 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-emerald-500/40 transition-all text-white"
                >
                  <option value="3 months" className="bg-[#12122b] text-white">3 months</option>
                  <option value="6 months" className="bg-[#12122b] text-white">6 months</option>
                  <option value="12 months" className="bg-[#12122b] text-white">12 months</option>
                  <option value="24 months" className="bg-[#12122b] text-white">24 months</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1 font-medium">{t.msgLabel}</label>
              <textarea value={form.message} onChange={setField("message")} rows={3} placeholder="Tell the landlord about yourself..." className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-emerald-500/40 resize-none transition-all"/>
            </div>
            <button onClick={submitApply} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-3 rounded-xl font-semibold transition-all">{t.submitApp}</button>
          </div>
        )}
      </Modal>

      {/* ── Listing detail modal ── */}
      <Modal open={!!viewTarget} title={viewTarget?.name[locale] ?? ""} onClose={() => setViewTarget(null)}>
        {viewTarget && (() => {
          const bg = ACCENT_BG[viewTarget.accent] ?? ACCENT_BG.emerald;
          return (
            <div className="space-y-4">
              <div className={`h-44 rounded-xl bg-gradient-to-br ${bg} relative overflow-hidden`}>
                <img src={viewTarget.photo} alt={viewTarget.name[locale]} className="absolute inset-0 w-full h-full object-cover opacity-70" onError={e => { (e.target as HTMLImageElement).style.display="none"; }} />
                <Home className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-14 h-14 text-white/15"/>
              </div>
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-2xl font-bold text-emerald-400">EGP {viewTarget.price.toLocaleString()}<span className="text-sm text-muted-foreground font-normal"> {t.perMonth}</span></p>
                  <p className="text-xs text-muted-foreground mt-0.5">{t.depositLabel}: EGP {viewTarget.deposit.toLocaleString()}</p>
                </div>
                <button onClick={() => toggleSave(viewTarget.id)} className={`p-2 rounded-lg border transition-all ${saved.has(viewTarget.id) ? "border-rose-500/40 bg-rose-500/10 text-rose-400" : "border-white/10 text-muted-foreground hover:text-rose-400 hover:border-rose-500/30"}`}>
                  <Heart className={`w-5 h-5 ${saved.has(viewTarget.id) ? "fill-current" : ""}`}/>
                </button>
              </div>
              <p className="text-sm text-muted-foreground flex items-center gap-1"><MapPin className="w-3.5 h-3.5"/>{viewTarget.loc[locale]}</p>
              <div className="flex gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1"><Bed className="w-3.5 h-3.5"/>{viewTarget.beds} {t.beds}</span>
                <span className="flex items-center gap-1"><Bath className="w-3.5 h-3.5"/>{viewTarget.baths} {t.baths}</span>
                <span className="flex items-center gap-1"><Square className="w-3.5 h-3.5"/>{viewTarget.sqft} {t.sqm}</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {viewTarget.tags.map(tag => <span key={tag} className="text-xs bg-white/8 border border-white/10 text-white/60 px-2.5 py-1 rounded-full">{tag}</span>)}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => openApply(viewTarget)}
                  disabled={appliedIds.has(viewTarget.id)}
                  className={`flex-1 py-3 rounded-xl text-sm font-semibold transition-all ${appliedIds.has(viewTarget.id) ? "bg-white/8 text-muted-foreground cursor-default" : "bg-emerald-600 hover:bg-emerald-500 text-white"}`}
                >
                  {appliedIds.has(viewTarget.id) ? t.appliedBtn : t.applyNow}
                </button>
                <button
                  onClick={() => openListingChat(viewTarget.id, viewTarget.name["en"])}
                  className="flex items-center gap-2 border border-indigo-500/30 bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 px-4 py-3 rounded-xl text-sm font-semibold transition-all"
                >
                  <MessageCircle className="w-4 h-4"/> {t.chatBtn}
                </button>
              </div>
            </div>
          );
        })()}
      </Modal>

      {/* ── Profile modal ── */}
      <Modal open={profileOpen} title={t.myProfile} onClose={() => setProfileOpen(false)}>
        <div className="space-y-1 text-sm">
          <div className="text-center mb-5">
            <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-emerald-500 to-cyan-500 flex items-center justify-center font-bold text-xl mx-auto mb-3">
              {authUser?.avatar ?? "ST"}
            </div>
            <p className="font-bold text-lg">{authUser?.name ?? "Student User"}</p>
            <p className="text-xs text-muted-foreground">{authUser?.email ?? "student@sakeni.eg"}</p>
            {authUser?.kycStatus === "pending" && (
              <span className="inline-block mt-2 text-[10px] bg-amber-500/15 text-amber-400 border border-amber-500/20 px-3 py-1 rounded-full">KYC Pending Review</span>
            )}
            {authUser?.kycStatus === "verified" && (
              <span className="inline-block mt-2 text-[10px] bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 px-3 py-1 rounded-full">✓ KYC Verified</span>
            )}
          </div>
          {[
            ["University", authUser?.university ?? "—"],
            ["Student ID", authUser?.studentId ?? "—"],
            ["Year", authUser?.year ?? "—"],
            ["Phone", authUser?.phone ?? "—"],
            ["Saved listings", String(saved.size)],
            ["Applications sent", String(apps.length)],
            ["Profile views", "0"],
          ].map(([k,v]) => (
            <div key={k} className="flex justify-between py-2.5 border-b border-white/6 last:border-none">
              <span className="text-muted-foreground">{k}</span>
              <span className="font-bold">{v}</span>
            </div>
          ))}
          <button onClick={handleSignOut} className="w-full mt-4 bg-rose-600/20 hover:bg-rose-600/30 border border-rose-500/30 text-rose-400 py-2.5 rounded-lg font-semibold transition-all">{t.signOut}</button>
        </div>
      </Modal>

      {/* ── Toast ── */}
      <div className={`fixed bottom-24 left-1/2 -translate-x-1/2 ${toast?.green ? "bg-emerald-900/90" : "bg-[#1a1a35]"} border border-white/15 text-white px-5 py-2.5 rounded-xl text-sm font-semibold shadow-2xl z-[100] transition-all duration-300 whitespace-nowrap ${toast ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3 pointer-events-none"}`}>
        {toast?.msg}
      </div>

      {/* ── Chat Panel ── */}
      <ChatPanel role="student" myName={authUser?.name ?? "Student"} />
    </div>
  );
}

interface ListingCardProps {
  l: Listing;
  locale: Locale;
  t: typeof EN;
  appliedIds: Set<number>;
  saved: Set<number>;
  toggleSave: (id: number) => void;
  openApply: (l: Listing) => void;
  setViewTarget: (l: Listing) => void;
}

function ListingCard({ l, locale, t, appliedIds, saved, toggleSave, openApply, setViewTarget }: ListingCardProps) {
  const bg = ACCENT_BG[l.accent] ?? ACCENT_BG.emerald;
  return (
    <div className="glass-card overflow-hidden flex flex-col">
      {/* Photo / gradient header */}
      <div
        className="h-40 relative overflow-hidden cursor-pointer"
        onClick={() => setViewTarget(l)}
      >
        <img
          src={l.photo}
          alt={l.name[locale]}
          className="absolute inset-0 w-full h-full object-cover"
          onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
        />
        <div className={`absolute inset-0 bg-gradient-to-br ${bg} ${l.photo ? "opacity-40" : "opacity-100"}`} />
        <Home className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 text-white/10 pointer-events-none" />
        <div className="absolute bottom-0 left-0 right-0 p-3 flex gap-1.5 flex-wrap z-10">
          {l.furnished  && <span className="text-[10px] bg-black/50 backdrop-blur-sm border border-white/10 text-white/80 px-2 py-0.5 rounded-full">Furnished</span>}
          {l.utilities  && <span className="text-[10px] bg-black/50 backdrop-blur-sm border border-white/10 text-white/80 px-2 py-0.5 rounded-full">Bills Incl.</span>}
          {l.gender !== "any" && <span className="text-[10px] bg-black/50 backdrop-blur-sm border border-white/10 text-white/80 px-2 py-0.5 rounded-full capitalize">{l.gender} Only</span>}
        </div>
      </div>

      <div className="p-4 flex flex-col gap-3 flex-1">
        <div className="flex justify-between items-start gap-2">
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm leading-snug cursor-pointer hover:text-emerald-400 transition-colors truncate" onClick={() => setViewTarget(l)}>{l.name[locale]}</p>
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1"><MapPin className="w-3 h-3 shrink-0"/>{l.loc[locale]}</p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-emerald-400 font-bold text-sm">EGP {l.price.toLocaleString()}</p>
            <p className="text-muted-foreground text-[11px]">{t.perMonth}</p>
          </div>
        </div>

        <div className="flex gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1"><Bed  className="w-3 h-3"/>{l.beds}  {t.beds}</span>
          <span className="flex items-center gap-1"><Bath className="w-3 h-3"/>{l.baths} {t.baths}</span>
          <span className="flex items-center gap-1"><Square className="w-3 h-3"/>{l.sqft} {t.sqm}</span>
        </div>

        <p className="text-xs text-muted-foreground">{t.depositLabel}: <span className="text-white/60 font-medium">EGP {l.deposit.toLocaleString()}</span></p>

        <div className="flex gap-2 mt-auto">
          <button
            onClick={() => openApply(l)}
            disabled={appliedIds.has(l.id)}
            className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${appliedIds.has(l.id) ? "bg-white/8 text-muted-foreground cursor-default" : "bg-emerald-600 hover:bg-emerald-500 text-white"}`}
          >
            {appliedIds.has(l.id) ? t.appliedBtn : t.applyNow}
          </button>
          <button
            onClick={() => openListingChat(l.id, l.name["en"])}
            className="p-2 rounded-lg border border-indigo-500/30 bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 transition-all"
            title={t.chatBtn}
          >
            <MessageCircle className="w-4 h-4"/>
          </button>
          <button
            onClick={() => toggleSave(l.id)}
            className={`p-2 rounded-lg border transition-all ${saved.has(l.id) ? "border-rose-500/40 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20" : "border-white/10 text-muted-foreground hover:text-rose-400 hover:border-rose-500/30"}`}
          >
            <Heart className={`w-4 h-4 ${saved.has(l.id) ? "fill-current" : ""}`}/>
          </button>
        </div>
      </div>
    </div>
  );
}

interface InputFieldProps {
  label: string;
  field: keyof typeof BLANK_FORM;
  type?: string;
  placeholder?: string;
  form: typeof BLANK_FORM;
  formErrors: Partial<typeof BLANK_FORM>;
  onChange: (field: keyof typeof BLANK_FORM, value: string) => void;
}

function InputField({ label, field, type = "text", placeholder = "", form, formErrors, onChange }: InputFieldProps) {
  return (
    <div>
      <label className="block text-xs text-muted-foreground mb-1 font-medium">{label}</label>
      <input
        type={type}
        value={form[field]}
        onChange={e => onChange(field, e.target.value)}
        placeholder={placeholder}
        className={`w-full bg-white/5 border rounded-lg px-3 py-2.5 text-sm focus:outline-none transition-all ${formErrors[field] ? "border-rose-500/60" : "border-white/10 focus:border-emerald-500/50"}`}
      />
      {formErrors[field] && <p className="text-rose-400 text-xs mt-1">{formErrors[field]}</p>}
    </div>
  );
}
