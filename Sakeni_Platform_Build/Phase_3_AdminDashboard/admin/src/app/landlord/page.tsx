"use client";

import { useState, useEffect, useRef } from "react";
import { Building2, Eye, Users, DollarSign, Plus, Edit, Trash2, ChevronRight, TrendingUp, BarChart2, ImageIcon, X } from "lucide-react";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { Modal } from "@/components/Modal";
import { KYCModal, getAuth, setAuth, AuthUser } from "@/components/KYCModal";
import { ChatPanel } from "@/components/ChatPanel";

type Locale = "en" | "ar";
type Tab = "listings" | "applications";
type Status = "active" | "underReview";
type AppStatus = "pending" | "approved" | "declined";

interface Listing {
  id: number;
  name: string;
  city: string;
  district: string;
  price: number;
  sqft: number;
  beds: number;
  baths: number;
  description: string;
  views: number;
  applicants: number;
  status: Status;
  photos: string[];
}

interface Applicant {
  id: number;
  listingId: number;
  name: string;
  university: string;
  phone: string;
  moveIn: string;
  lease: string;
  message: string;
  status: AppStatus;
}

const EN = {
  brand:"SAKENI", landlord:"Landlord",
  myListings:"My Listings", welcomeBack:"Manage your properties and applications below.",
  addNewListing:"Add New Listing",
  activeListings:"Active Listings", totalViews:"Total Views",
  pendingApps:"Pending Applications", monthlyRevenue:"Monthly Revenue",
  quickActions:"Quick Actions", manageListings:"Manage Listings", viewApplications:"View Applications",
  revenueOverview:"Revenue Overview", totalEarned:"Total Earned", thisMonth:"This Month",
  active:"Active", underReview:"Under Review",
  editListing:"Edit", removeListing:"Remove", listingAnalytics:"Analytics",
  viewsLabel:"views", applicantsLabel:"apps",
  addListingTitle:"Add New Listing", editListingTitle:"Edit Listing",
  titleLabel:"Title", cityLabel:"City", districtLabel:"District",
  priceLabel:"Price (EGP/mo)", sqftLabel:"Area (m²)", bedsLabel:"Bedrooms", bathsLabel:"Bathrooms",
  descLabel:"Description", statusLabel:"Status",
  photosLabel:"Apartment Photos", photosHint:"Add up to 5 photo URLs (one per line)",
  addPhotoUrl:"Paste photo URL here…",
  saveListing:"Save Listing", cancel:"Cancel",
  removeConfirm:"Remove this listing?",
  removeDesc:"This action cannot be undone. All associated applications will be removed.",
  confirmRemove:"Yes, Remove", keepListing:"Keep Listing",
  applicationsTab:"Applications", noApps:"No applications yet.",
  approve:"Approve", decline:"Decline", approved:"Approved", declined:"Declined", pending:"Pending",
  backToListings:"All Applications", applicantDetails:"Applicant Details",
  university:"University", phone:"Phone", moveIn:"Move-in", lease:"Lease", message:"Message",
  convRate:"Conversion", analyticsTitle:"Listing Analytics",
  months:["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"],
  toastAdded:"Listing added!", toastUpdated:"Listing updated!", toastRemoved:"Listing removed.",
  toastApproved:"Application approved.", toastDeclined:"Application declined.",
  nameRequired:"Title is required", priceRequired:"Price is required",
  clickBarHint:"Click a bar to see monthly revenue",
  myProfile:"My Profile", signOut:"Sign Out", noPhotos:"No photos yet",
};
const AR: typeof EN = {
  brand:"ساكني", landlord:"المالك",
  myListings:"قوائمي", welcomeBack:"أدر عقاراتك وطلباتك أدناه.",
  addNewListing:"إضافة إعلان",
  activeListings:"الإعلانات النشطة", totalViews:"إجمالي المشاهدات",
  pendingApps:"الطلبات المعلقة", monthlyRevenue:"الإيراد الشهري",
  quickActions:"إجراءات سريعة", manageListings:"إدارة الإعلانات", viewApplications:"عرض الطلبات",
  revenueOverview:"نظرة عامة على الإيرادات", totalEarned:"الإجمالي المكتسب", thisMonth:"هذا الشهر",
  active:"نشط", underReview:"قيد المراجعة",
  editListing:"تعديل", removeListing:"حذف", listingAnalytics:"تحليلات",
  viewsLabel:"مشاهدة", applicantsLabel:"طلب",
  addListingTitle:"إضافة إعلان جديد", editListingTitle:"تعديل الإعلان",
  titleLabel:"العنوان", cityLabel:"المدينة", districtLabel:"الحي",
  priceLabel:"السعر (جنيه/شهر)", sqftLabel:"المساحة (م²)", bedsLabel:"غرف النوم", bathsLabel:"دورات المياه",
  descLabel:"الوصف", statusLabel:"الحالة",
  photosLabel:"صور الشقة", photosHint:"أضف حتى 5 روابط صور (رابط في كل سطر)",
  addPhotoUrl:"الصق رابط الصورة هنا…",
  saveListing:"حفظ", cancel:"إلغاء",
  removeConfirm:"حذف هذا الإعلان؟",
  removeDesc:"لا يمكن التراجع. ستُحذف جميع الطلبات المرتبطة.",
  confirmRemove:"نعم، احذف", keepListing:"إلغاء",
  applicationsTab:"الطلبات", noApps:"لا توجد طلبات بعد.",
  approve:"قبول", decline:"رفض", approved:"مقبول", declined:"مرفوض", pending:"معلق",
  backToListings:"كل الطلبات", applicantDetails:"تفاصيل المتقدم",
  university:"الجامعة", phone:"الهاتف", moveIn:"الانتقال", lease:"مدة الإيجار", message:"الرسالة",
  convRate:"التحويل", analyticsTitle:"تحليلات الإعلان",
  months:["يناير","فبراير","مارس","أبريل","مايو","يونيو","يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"],
  toastAdded:"تمت إضافة الإعلان!", toastUpdated:"تم تحديث الإعلان!", toastRemoved:"تم حذف الإعلان.",
  toastApproved:"تم قبول الطلب.", toastDeclined:"تم رفض الطلب.",
  nameRequired:"العنوان مطلوب", priceRequired:"السعر مطلوب",
  clickBarHint:"انقر على العمود لرؤية الإيراد الشهري",
  myProfile:"ملفي الشخصي", signOut:"تسجيل الخروج", noPhotos:"لا توجد صور بعد",
};

const BAR_H: number[] = [];
const BAR_REV: number[] = [];

const INIT_LISTINGS: Listing[] = [];

const INIT_APPLICANTS: Applicant[] = [];

const EMPTY_FORM = {
  name:"", city:"Cairo", district:"", price:"", sqft:"", beds:"1", baths:"1",
  description:"", status:"underReview" as Status, photosRaw:"",
};

export default function LandlordPage() {
  const [locale,     setLocale]     = useState<Locale>("en");
  const [tab,        setTab]        = useState<Tab>("listings");
  const [listings,   setListings]   = useState<Listing[]>(INIT_LISTINGS);
  const [applicants, setApplicants] = useState<Applicant[]>(INIT_APPLICANTS);
  const [modal,      setModal]      = useState<{ type:string; data?:Listing|Applicant|null } | null>(null);
  const [form,       setForm]       = useState({ ...EMPTY_FORM });
  const [formErrors, setFormErrors] = useState<{ name?:string; price?:string }>({});
  const [toast,      setToast]      = useState("");
  const [filterListingId, setFilterListingId] = useState<number|null>(null);
  const [authUser,   setAuthUser]   = useState<AuthUser | null>(null);
  const [authLoaded, setAuthLoaded] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [photoInput, setPhotoInput] = useState("");
  const listingsRef = useRef<HTMLDivElement>(null);
  const chartRef    = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLocale((document.documentElement.lang as Locale) || "en");
    setAuthUser(getAuth("landlord"));
    setAuthLoaded(true);
  }, []);

  useEffect(() => {
    try {
      const ls = localStorage.getItem("sk_ll_listings");
      if (ls) setListings(JSON.parse(ls));
      const as_ = localStorage.getItem("sk_ll_applicants");
      if (as_) setApplicants(JSON.parse(as_));
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { try { localStorage.setItem("sk_ll_listings",   JSON.stringify(listings));   } catch { /* ignore */ } }, [listings]);
  useEffect(() => { try { localStorage.setItem("sk_ll_applicants", JSON.stringify(applicants)); } catch { /* ignore */ } }, [applicants]);

  const t = locale === "ar" ? AR : EN;
  const close     = () => setModal(null);
  const showToast = (msg:string) => { setToast(msg); setTimeout(() => setToast(""), 2400); };

  const activeCount  = listings.filter(l => l.status === "active").length;
  const totalViews   = listings.reduce((s,l) => s + l.views, 0);
  const pendingCount = applicants.filter(a => a.status === "pending").length;
  const monthlyRev   = listings.filter(l => l.status === "active").reduce((s,l) => s + l.price, 0);

  const statusCls: Record<Status, string> = {
    active:      "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    underReview: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  };
  const appCls: Record<AppStatus, string> = {
    pending:  "bg-amber-500/15 text-amber-400 border-amber-500/30",
    approved: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    declined: "bg-rose-500/15 text-rose-400 border-rose-500/30",
  };

  const parsePhotos = (raw: string) =>
    raw.split("\n").map(s => s.trim()).filter(s => s.startsWith("http"));

  const openAdd  = () => {
    setForm({ ...EMPTY_FORM });
    setFormErrors({});
    setPhotoInput("");
    setModal({ type:"add" });
  };
  const openEdit = (l:Listing) => {
    setForm({ name:l.name, city:l.city, district:l.district, price:String(l.price), sqft:String(l.sqft), beds:String(l.beds), baths:String(l.baths), description:l.description, status:l.status, photosRaw:l.photos.join("\n") });
    setFormErrors({});
    setPhotoInput("");
    setModal({ type:"edit", data:l });
  };

  const addPhotoToForm = () => {
    if (!photoInput.trim().startsWith("http")) return;
    const current = form.photosRaw ? form.photosRaw.split("\n").filter(Boolean) : [];
    if (current.length >= 5) { showToast("Max 5 photos allowed"); return; }
    setForm(f => ({ ...f, photosRaw: [...current, photoInput.trim()].join("\n") }));
    setPhotoInput("");
  };

  const removePhoto = (idx: number) => {
    const current = form.photosRaw.split("\n").filter(Boolean);
    current.splice(idx, 1);
    setForm(f => ({ ...f, photosRaw: current.join("\n") }));
  };

  const saveListing = () => {
    const errs: { name?:string; price?:string } = {};
    if (!form.name.trim())  errs.name  = t.nameRequired;
    if (!form.price.trim()) errs.price = t.priceRequired;
    if (Object.keys(errs).length) { setFormErrors(errs); return; }

    const photos = parsePhotos(form.photosRaw);

    if (modal?.type === "add") {
      const newId = Math.max(0, ...listings.map(l => l.id)) + 1;
      setListings(prev => [...prev, { id:newId, name:form.name, city:form.city, district:form.district, price:Number(form.price), sqft:Number(form.sqft), beds:Number(form.beds), baths:Number(form.baths), description:form.description, views:0, applicants:0, status:form.status, photos }]);
      showToast(t.toastAdded);
    } else if (modal?.type === "edit" && modal.data) {
      const id = (modal.data as Listing).id;
      setListings(prev => prev.map(l => l.id === id ? { ...l, name:form.name, city:form.city, district:form.district, price:Number(form.price), sqft:Number(form.sqft), beds:Number(form.beds), baths:Number(form.baths), description:form.description, status:form.status, photos } : l));
      showToast(t.toastUpdated);
    }
    close();
  };

  const removeListing = () => {
    if (!modal?.data) return;
    const id = (modal.data as Listing).id;
    setListings(prev => prev.filter(l => l.id !== id));
    setApplicants(prev => prev.filter(a => a.listingId !== id));
    showToast(t.toastRemoved);
    close();
  };

  const setAppStatus = (id:number, status:AppStatus) => {
    setApplicants(prev => prev.map(a => a.id === id ? { ...a, status } : a));
    showToast(status === "approved" ? t.toastApproved : t.toastDeclined);
    close();
  };

  const visibleApps = filterListingId
    ? applicants.filter(a => a.listingId === filterListingId)
    : applicants;

  function FormField({ label, name, type="text", placeholder="" }: { label:string; name:keyof typeof EMPTY_FORM; type?:string; placeholder?:string }) {
    return (
      <div>
        <label className="block text-xs text-muted-foreground mb-1 font-medium">{label}</label>
        <input
          type={type}
          value={form[name] as string}
          onChange={e => { setForm(f => ({ ...f, [name]:e.target.value })); setFormErrors(fe => ({ ...fe, [name]:"" })); }}
          placeholder={placeholder}
          className={`w-full bg-white/5 border rounded-lg px-3 py-2.5 text-sm focus:outline-none transition-all ${(formErrors as Record<string,string>)[name] ? "border-rose-500/60" : "border-white/10 focus:border-amber-500/40"}`}
        />
        {(formErrors as Record<string,string>)[name] && <p className="text-rose-400 text-xs mt-1">{(formErrors as Record<string,string>)[name]}</p>}
      </div>
    );
  }

  const handleSignOut = () => {
    import("@/components/KYCModal").then(({ clearAuth }) => {
      clearAuth("landlord");
      setAuthUser(null);
    });
  };

  return (
    <div className="min-h-screen text-foreground">

      {/* ── KYC Auth Gate ── */}
      {authLoaded && !authUser && (
        <KYCModal role="landlord" onAuth={user => { setAuth("landlord", user); setAuthUser(user); }} />
      )}

      {/* ── Header ── */}
      <header className="glass fixed top-0 w-full left-0 z-40 px-5 py-3.5 flex justify-between items-center">
        <h1 className="text-xl font-bold tracking-tighter">
          <span className="text-gradient">{t.brand}</span>{" "}
          <span className="text-white/60 text-base font-normal">{t.landlord}</span>
        </h1>
        <div className="flex items-center gap-2">
          <LanguageSwitcher currentLocale={locale}/>
          <button
            onClick={() => setProfileOpen(true)}
            className="h-9 w-9 rounded-full bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center text-white font-bold text-sm shadow-lg ring-2 ring-amber-500/40 cursor-pointer hover:scale-105 transition-transform"
          >
            {authUser?.avatar ?? "LL"}
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto pt-20 pb-16 px-4 sm:px-6 space-y-5">

        {/* ── Title row ── */}
        <div className="flex justify-between items-end flex-wrap gap-4">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">{t.myListings}</h2>
            <p className="text-muted-foreground mt-1 text-sm">{t.welcomeBack}</p>
          </div>
          <button onClick={openAdd} className="flex items-center gap-2 bg-amber-600 hover:bg-amber-500 text-white px-5 py-2.5 rounded-lg font-semibold shadow-lg shadow-amber-500/20 transition-all text-sm">
            <Plus className="w-4 h-4"/>{t.addNewListing}
          </button>
        </div>

        {/* ── Stats ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label:t.activeListings,  value:String(activeCount),            color:"text-emerald-400", icon:<Building2 className="w-4 h-4"/>, action:()=>{ setTab("listings"); setTimeout(()=>listingsRef.current?.scrollIntoView({behavior:"smooth"}),100); } },
            { label:t.totalViews,      value:totalViews.toLocaleString(),    color:"text-cyan-400",    icon:<Eye className="w-4 h-4"/>,      action:()=>setModal({ type:"viewsBreakdown" }) },
            { label:t.pendingApps,     value:String(pendingCount),           color:"text-amber-400",   icon:<Users className="w-4 h-4"/>,    action:()=>{ setFilterListingId(null); setTab("applications"); } },
            { label:t.monthlyRevenue,  value:`EGP ${monthlyRev.toLocaleString()}`, color:"text-purple-400", icon:<DollarSign className="w-4 h-4"/>, action:()=>setTimeout(()=>chartRef.current?.scrollIntoView({behavior:"smooth"}),100) },
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

        {/* ── Quick actions ── */}
        <div>
          <h3 className="text-xs font-semibold mb-3 text-muted-foreground uppercase tracking-wider">{t.quickActions}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button onClick={() => { setTab("listings"); setTimeout(()=>listingsRef.current?.scrollIntoView({behavior:"smooth"}),100); }} className="glass-card p-4 flex items-center gap-4 hover:border-amber-500/30 transition-all text-start group">
              <div className="p-3 bg-amber-500/10 rounded-xl group-hover:bg-amber-500/20 transition-colors"><Building2 className="w-5 h-5 text-amber-400"/></div>
              <div className="flex-1">
                <p className="font-semibold text-sm">{t.manageListings}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{activeCount} active · {listings.length} total</p>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground"/>
            </button>
            <button onClick={() => { setFilterListingId(null); setTab("applications"); }} className="glass-card p-4 flex items-center gap-4 hover:border-indigo-500/30 transition-all text-start group">
              <div className="p-3 bg-indigo-500/10 rounded-xl group-hover:bg-indigo-500/20 transition-colors"><Users className="w-5 h-5 text-indigo-400"/></div>
              <div className="flex-1">
                <p className="font-semibold text-sm">{t.viewApplications}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{pendingCount} pending · {applicants.length} total</p>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground"/>
            </button>
          </div>
        </div>

        {/* ── Tab nav ── */}
        <div className="flex gap-0.5 border-b border-white/8">
          {([["listings",t.myListings],["applications",`${t.applicationsTab} (${applicants.length})`]] as [Tab,string][]).map(([id,label]) => (
            <button key={id} onClick={() => setTab(id)} className={`px-4 py-2.5 text-sm font-medium transition-all rounded-t-lg ${tab===id ? "text-amber-400 border-b-2 border-amber-500 bg-amber-500/5" : "text-muted-foreground hover:text-white"}`}>{label}</button>
          ))}
        </div>

        {/* ── Listings panel ── */}
        {tab === "listings" && (
          <div ref={listingsRef} className="space-y-4">
            {listings.length === 0 && (
              <div className="glass-card p-12 text-center text-muted-foreground text-sm">No listings yet. Add your first property.</div>
            )}
            {listings.map(l => {
              const convRate = l.views > 0 ? ((l.applicants / l.views) * 100).toFixed(1) : "0.0";
              return (
                <div key={l.id} className="glass-card overflow-hidden">
                  {/* Photo strip */}
                  {l.photos.length > 0 ? (
                    <div className="flex gap-1 h-28 overflow-hidden">
                      {l.photos.slice(0, 3).map((photo, i) => (
                        <div key={i} className={`relative overflow-hidden ${l.photos.length === 1 ? "flex-1" : i === 0 ? "flex-[2]" : "flex-1"}`}>
                          <img src={photo} alt="" className="w-full h-full object-cover" onError={e => { (e.target as HTMLImageElement).parentElement!.style.display="none"; }} />
                          {i === 2 && l.photos.length > 3 && (
                            <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white font-bold text-lg">
                              +{l.photos.length - 3}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="h-16 bg-gradient-to-r from-amber-500/10 to-orange-500/5 flex items-center justify-center gap-2 text-amber-500/40 text-xs border-b border-white/5">
                      <ImageIcon className="w-4 h-4"/> {t.noPhotos}
                    </div>
                  )}

                  <div className="p-4">
                    <div className="flex flex-wrap gap-3 items-start justify-between">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0">
                          <Building2 className="w-5 h-5 text-amber-400"/>
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-sm truncate">{l.name}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            EGP {l.price.toLocaleString()}/mo · {l.sqft} m² · {l.beds}bd {l.baths}ba
                          </p>
                        </div>
                      </div>
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-full border shrink-0 ${statusCls[l.status]}`}>
                        {l.status === "active" ? t.active : t.underReview}
                      </span>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><Eye className="w-3.5 h-3.5"/> {l.views.toLocaleString()} {t.viewsLabel}</span>
                      <button
                        onClick={() => { setFilterListingId(l.id); setTab("applications"); }}
                        className="flex items-center gap-1 hover:text-indigo-400 transition-colors"
                      >
                        <Users className="w-3.5 h-3.5"/> {l.applicants} {t.applicantsLabel}
                      </button>
                      <span className="flex items-center gap-1"><TrendingUp className="w-3.5 h-3.5 text-emerald-400"/> {convRate}% {t.convRate}</span>
                      <span className="flex items-center gap-1 text-amber-400/70"><ImageIcon className="w-3.5 h-3.5"/> {l.photos.length} photos</span>
                    </div>

                    <div className="mt-3 flex gap-2 flex-wrap">
                      <button onClick={() => openEdit(l)} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-white border border-white/10 hover:border-white/20 px-3 py-1.5 rounded-lg transition-all">
                        <Edit className="w-3 h-3"/> {t.editListing}
                      </button>
                      <button
                        onClick={() => setModal({ type:"analytics", data:l })}
                        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-amber-400 border border-white/10 hover:border-amber-500/30 px-3 py-1.5 rounded-lg transition-all"
                      >
                        <BarChart2 className="w-3 h-3"/> {t.listingAnalytics}
                      </button>
                      <button onClick={() => setModal({ type:"remove", data:l })} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-rose-400 border border-white/10 hover:border-rose-500/30 px-3 py-1.5 rounded-lg transition-all">
                        <Trash2 className="w-3 h-3"/> {t.removeListing}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── Applications panel ── */}
        {tab === "applications" && (
          <div className="space-y-3">
            {filterListingId && (
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Showing for: <span className="text-white font-medium">{listings.find(l => l.id === filterListingId)?.name}</span>
                </p>
                <button onClick={() => setFilterListingId(null)} className="text-xs text-amber-400 hover:underline">{t.backToListings}</button>
              </div>
            )}

            {visibleApps.length === 0 ? (
              <div className="glass-card p-12 text-center text-muted-foreground text-sm">{t.noApps}</div>
            ) : visibleApps.map(a => {
              const listing = listings.find(l => l.id === a.listingId);
              return (
                <div key={a.id} className="glass-card p-4 hover:border-white/20 transition-all cursor-pointer" onClick={() => setModal({ type:"applicant", data:a })}>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-indigo-500/15 flex items-center justify-center text-indigo-400 font-bold text-sm shrink-0">
                      {a.name.split(" ").map(n=>n[0]).join("").slice(0,2)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm">{a.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{a.university} · {listing?.name}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${appCls[a.status]}`}>
                        {a.status === "pending" ? t.pending : a.status === "approved" ? t.approved : t.declined}
                      </span>
                      {a.status === "pending" && (
                        <>
                          <button onClick={e => { e.stopPropagation(); setAppStatus(a.id,"approved"); }} className="text-xs bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1 rounded-lg transition-all">{t.approve}</button>
                          <button onClick={e => { e.stopPropagation(); setAppStatus(a.id,"declined"); }} className="text-xs bg-rose-600/80 hover:bg-rose-500 text-white px-3 py-1 rounded-lg transition-all">{t.decline}</button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── Revenue chart ── */}
        <div ref={chartRef} className="glass-card p-5">
          <div className="flex justify-between items-start mb-5 flex-wrap gap-4">
            <h3 className="text-lg font-semibold">{t.revenueOverview}</h3>
            <div className="flex gap-6 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">{t.totalEarned}</p>
                <p className="font-bold text-xl text-amber-400 mt-0.5">EGP {(monthlyRev * 2).toLocaleString()}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{t.thisMonth}</p>
                <p className="font-bold text-xl text-emerald-400 mt-0.5">EGP {monthlyRev.toLocaleString()}</p>
              </div>
            </div>
          </div>

          <div className="relative h-36">
            <div className="absolute inset-0 flex flex-col justify-between pointer-events-none pb-6">
              {[100,75,50,25].map(pct => (
                <div key={pct} className="flex items-center gap-2">
                  <span className="text-[9px] text-white/20 w-6 text-right shrink-0">{pct}%</span>
                  <div className="flex-1 border-t border-white/8"/>
                </div>
              ))}
            </div>
            <div className="absolute inset-x-8 bottom-6 top-0 flex items-end gap-1">
              {BAR_H.map((h, i) => (
                <div
                  key={i}
                  className="flex-1 rounded-t-sm bg-gradient-to-t from-amber-600 to-amber-400 hover:from-amber-500 hover:to-yellow-300 cursor-pointer transition-colors"
                  style={{ height:`${h}%` }}
                  onClick={() => showToast(`${t.months[i]}: EGP ${BAR_REV[i].toLocaleString()}`)}
                  title={t.months[i]}
                />
              ))}
            </div>
            <div className="absolute inset-x-8 bottom-0 flex justify-between">
              {t.months.map(m => (
                <span key={m} className="text-[9px] text-muted-foreground flex-1 text-center">{m.slice(0,3)}</span>
              ))}
            </div>
          </div>
          <p className="text-xs text-muted-foreground text-center mt-3">{t.clickBarHint}</p>
        </div>
      </main>

      {/* ── Add / Edit modal ── */}
      <Modal open={modal?.type==="add" || modal?.type==="edit"} title={modal?.type==="add" ? t.addListingTitle : t.editListingTitle} onClose={close}>
        <div className="space-y-3">
          <FormField label={t.titleLabel}    name="name"       placeholder="e.g. Studio – Dokki, Giza"/>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-muted-foreground mb-1 font-medium">{t.cityLabel}</label>
              <select
                value={form.city}
                onChange={e => { setForm(f => ({ ...f, city: e.target.value })); }}
                className="w-full bg-[#0d0d22] border border-white/10 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-amber-500/40 transition-all text-white"
              >
                <option value="Cairo">Cairo</option>
                <option value="Giza">Giza</option>
              </select>
            </div>
            <FormField label={t.districtLabel} name="district"   placeholder="Zamalek"/>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <FormField label={t.priceLabel}    name="price"      type="number" placeholder="4500"/>
            <FormField label={t.sqftLabel}     name="sqft"       type="number" placeholder="60"/>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <FormField label={t.bedsLabel}     name="beds"       type="number" placeholder="1"/>
            <FormField label={t.bathsLabel}    name="baths"      type="number" placeholder="1"/>
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1 font-medium">{t.statusLabel}</label>
            <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as Status }))} className="w-full bg-[#0d0d22] border border-white/10 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-amber-500/40 transition-all">
              <option value="underReview">{t.underReview}</option>
              <option value="active">{t.active}</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1 font-medium">{t.descLabel}</label>
            <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description:e.target.value }))} rows={2} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-amber-500/40 resize-none transition-all" placeholder="Describe your property..."/>
          </div>

          {/* ── Photo manager ── */}
          <div>
            <label className="block text-xs text-muted-foreground mb-1.5 font-medium flex items-center gap-1.5">
              <ImageIcon className="w-3.5 h-3.5"/> {t.photosLabel}
              <span className="text-white/25 font-normal">({parsePhotos(form.photosRaw).length}/5)</span>
            </label>
            <p className="text-[10px] text-white/30 mb-2">{t.photosHint}</p>

            {/* Existing photos */}
            {parsePhotos(form.photosRaw).length > 0 && (
              <div className="flex gap-2 mb-2 flex-wrap">
                {parsePhotos(form.photosRaw).map((url, i) => (
                  <div key={i} className="relative w-20 h-16 rounded-lg overflow-hidden border border-white/10 group">
                    <img src={url} alt="" className="w-full h-full object-cover" onError={e => { (e.target as HTMLImageElement).src = ""; }} />
                    <button
                      onClick={() => removePhoto(i)}
                      className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
                    >
                      <X className="w-4 h-4 text-rose-400"/>
                    </button>
                    {i === 0 && <span className="absolute bottom-0 left-0 right-0 text-center text-[9px] bg-amber-500/80 text-white py-0.5">Cover</span>}
                  </div>
                ))}
              </div>
            )}

            {/* Add photo URL */}
            {parsePhotos(form.photosRaw).length < 5 && (
              <div className="flex gap-2">
                <input
                  value={photoInput}
                  onChange={e => setPhotoInput(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addPhotoToForm(); } }}
                  placeholder={t.addPhotoUrl}
                  className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500/40 transition-all"
                />
                <button
                  onClick={addPhotoToForm}
                  className="bg-amber-600 hover:bg-amber-500 text-white px-3 py-2 rounded-lg text-sm font-semibold transition-all shrink-0"
                >
                  Add
                </button>
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-1">
            <button onClick={saveListing} className="flex-1 bg-amber-600 hover:bg-amber-500 text-white py-2.5 rounded-lg font-semibold transition-all">{t.saveListing}</button>
            <button onClick={close}       className="flex-1 bg-white/8 hover:bg-white/12 text-white py-2.5 rounded-lg font-semibold border border-white/10 transition-all">{t.cancel}</button>
          </div>
        </div>
      </Modal>

      {/* ── Remove confirm ── */}
      <Modal open={modal?.type==="remove"} title={t.removeConfirm} onClose={close}>
        <p className="text-sm text-muted-foreground mb-2">{t.removeDesc}</p>
        <p className="font-semibold mb-5 text-sm">{(modal?.data as Listing)?.name}</p>
        <div className="flex gap-3">
          <button onClick={removeListing} className="flex-1 bg-rose-600 hover:bg-rose-500 text-white py-2.5 rounded-lg font-semibold transition-all">{t.confirmRemove}</button>
          <button onClick={close}         className="flex-1 bg-white/8 hover:bg-white/12 text-white py-2.5 rounded-lg font-semibold border border-white/10 transition-all">{t.keepListing}</button>
        </div>
      </Modal>

      {/* ── Views breakdown ── */}
      <Modal open={modal?.type==="viewsBreakdown"} title={t.totalViews} onClose={close}>
        {listings.map(l => (
          <div key={l.id} className="flex justify-between py-2.5 border-b border-white/6 text-sm last:border-none">
            <span className="text-muted-foreground truncate max-w-[200px]">{l.name}</span>
            <span className="font-bold">{l.views.toLocaleString()} {t.viewsLabel}</span>
          </div>
        ))}
      </Modal>

      {/* ── Analytics modal ── */}
      <Modal open={modal?.type==="analytics"} title={t.analyticsTitle} onClose={close}>
        {modal?.data && (() => {
          const l = modal.data as Listing;
          const conv = l.views > 0 ? ((l.applicants/l.views)*100).toFixed(1) : "0.0";
          return (
            <div className="space-y-1 text-sm">
              {l.photos.length > 0 && (
                <div className="flex gap-1.5 mb-4 overflow-x-auto pb-1">
                  {l.photos.map((p, i) => (
                    <img key={i} src={p} alt="" className="h-20 w-32 object-cover rounded-lg shrink-0 border border-white/10" onError={e => { (e.target as HTMLImageElement).style.display="none"; }} />
                  ))}
                </div>
              )}
              <p className="font-semibold mb-3">{l.name}</p>
              {[
                [t.viewsLabel,      `${l.views.toLocaleString()}`],
                [t.applicantsLabel, `${l.applicants}`],
                [t.convRate,        `${conv}%`],
                ["Photos",          `${l.photos.length}`],
                ["Monthly Revenue", `EGP ${l.price.toLocaleString()}`],
                ["Annual Revenue",  `EGP ${(l.price*12).toLocaleString()}`],
                ["Status",          l.status === "active" ? t.active : t.underReview],
              ].map(([k,v]) => (
                <div key={k} className="flex justify-between py-2.5 border-b border-white/6 last:border-none">
                  <span className="text-muted-foreground">{k}</span>
                  <span className="font-bold">{v}</span>
                </div>
              ))}
            </div>
          );
        })()}
      </Modal>

      {/* ── Applicant detail modal ── */}
      <Modal open={modal?.type==="applicant"} title={t.applicantDetails} onClose={close}>
        {modal?.data && (() => {
          const a = modal.data as Applicant;
          const listing = listings.find(l => l.id === a.listingId);
          return (
            <div className="space-y-1 text-sm">
              {[
                ["Listing",      listing?.name ?? ""],
                [t.university,   a.university],
                [t.phone,        a.phone],
                [t.moveIn,       a.moveIn],
                [t.lease,        a.lease],
              ].map(([k,v]) => (
                <div key={k} className="flex justify-between py-2.5 border-b border-white/6">
                  <span className="text-muted-foreground">{k}</span>
                  <span className="font-bold">{v}</span>
                </div>
              ))}
              <div className="py-2.5 border-b border-white/6">
                <span className="text-muted-foreground block mb-1">{t.message}</span>
                <span className="text-white/70 italic text-xs">&quot;{a.message}&quot;</span>
              </div>
              <div className={`mt-1 text-xs font-medium px-3 py-1.5 rounded-full border w-fit ${appCls[a.status]}`}>
                {a.status === "pending" ? t.pending : a.status === "approved" ? t.approved : t.declined}
              </div>
              {a.status === "pending" && (
                <div className="flex gap-3 pt-4">
                  <button onClick={() => setAppStatus(a.id,"approved")} className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white py-2.5 rounded-lg font-semibold transition-all">{t.approve}</button>
                  <button onClick={() => setAppStatus(a.id,"declined")} className="flex-1 bg-rose-600/80 hover:bg-rose-500 text-white py-2.5 rounded-lg font-semibold transition-all">{t.decline}</button>
                </div>
              )}
            </div>
          );
        })()}
      </Modal>

      {/* ── Profile modal ── */}
      <Modal open={profileOpen} title={t.myProfile} onClose={() => setProfileOpen(false)}>
        <div className="space-y-1 text-sm">
          <div className="text-center mb-5">
            <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center font-bold text-xl mx-auto mb-3">
              {authUser?.avatar ?? "LL"}
            </div>
            <p className="font-bold text-lg">{authUser?.name ?? "Landlord User"}</p>
            <p className="text-xs text-muted-foreground">{authUser?.email ?? "landlord@sakeni.eg"}</p>
            {authUser?.kycStatus === "pending" && (
              <span className="inline-block mt-2 text-[10px] bg-amber-500/15 text-amber-400 border border-amber-500/20 px-3 py-1 rounded-full">KYC Pending Review</span>
            )}
            {authUser?.kycStatus === "verified" && (
              <span className="inline-block mt-2 text-[10px] bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 px-3 py-1 rounded-full">✓ KYC Verified</span>
            )}
          </div>
          {[
            ["City", authUser?.city ?? "—"],
            ["Property Type", authUser?.propertyType ?? "—"],
            ["Phone", authUser?.phone ?? "—"],
            ["Active Listings", String(activeCount)],
            ["Total Applications", String(applicants.length)],
            ["Monthly Revenue", `EGP ${monthlyRev.toLocaleString()}`],
          ].map(([k,v]) => (
            <div key={k} className="flex justify-between py-2.5 border-b border-white/6 last:border-none">
              <span className="text-muted-foreground">{k}</span>
              <span className="font-bold">{v}</span>
            </div>
          ))}
          <button onClick={handleSignOut} className="w-full mt-4 bg-rose-600/20 hover:bg-rose-600/30 border border-rose-500/30 text-rose-400 py-2.5 rounded-lg font-semibold transition-all">{t.signOut}</button>
        </div>
      </Modal>

      {/* Toast */}
      <div className={`fixed bottom-24 left-1/2 -translate-x-1/2 bg-[#1a1a35] border border-white/15 text-white px-5 py-2.5 rounded-xl text-sm font-semibold shadow-2xl z-[100] transition-all duration-300 whitespace-nowrap ${toast ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3 pointer-events-none"}`}>
        {toast}
      </div>

      {/* ── Chat Panel ── */}
      <ChatPanel role="landlord" myName={authUser?.name ?? "Landlord"} />
    </div>
  );
}
