"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Building2, Eye, Users, DollarSign, Plus, Edit, Trash2, ChevronRight, TrendingUp, BarChart2, ImageIcon, X, Upload } from "lucide-react";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Modal } from "@/components/Modal";
import { KYCModal, getAuth, setAuth, AuthUser } from "@/components/KYCModal";
import { ChatPanel } from "@/components/ChatPanel";
import { UserProfileView } from "@/components/UserProfileView";
import { buildPublicUserProfile } from "@/lib/public-profile";
import { imageFileToDataUrl, isSupportedPhotoUrl } from "@/lib/local-upload";

type Locale = "en" | "ar";
type Tab = "listings" | "applications";
type Status = "active" | "pending_review" | "rejected";
type AppStatus = "pending" | "approved" | "declined";

interface Listing {
  id: number;
  name: string;
  city: string;
  district: string;
  price: number;
  sqft: number;
  floorNumber: number;
  beds: number;
  baths: number;
  description: string;
  views: number;
  applicants: number;
  status: Status;
  photos: string[];
  landlordName?: string;
  landlordEmail?: string;
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
  avatar?: string;
  email?: string;
  studentId?: string;
  year?: string;
  submittedAt?: string;
  landlordName?: string;
  landlordEmail?: string;
}

const EN = {
  brand:"Sakeni (سكني)", landlord:"Landlord",
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
  priceLabel:"Price (EGP/mo)", sqftLabel:"Area (m²)", floorLabel:"Floor Number", bedsLabel:"Bedrooms", bathsLabel:"Bathrooms",
  descLabel:"Description", statusLabel:"Status",
  photosLabel:"Apartment Photos", photosHint:"Add up to 15 photos using image upload or direct URLs",
  uploadPhotos:"Upload photos",
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
  nameRequired:"Title is required", priceRequired:"Price is required", floorRequired:"Floor number is required",
  clickBarHint:"Click a bar to see monthly revenue",
  myProfile:"My Profile", signOut:"Sign Out", noPhotos:"No photos yet",
};
const AR: typeof EN = {
  brand:"سكني", landlord:"المالك",
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
  priceLabel:"السعر (جنيه/شهر)", sqftLabel:"المساحة (م²)", floorLabel:"رقم الدور", bedsLabel:"غرف النوم", bathsLabel:"دورات المياه",
  descLabel:"الوصف", statusLabel:"الحالة",
  photosLabel:"صور الشقة", photosHint:"أضف حتى 15 صورة بالرفع أو بروابط مباشرة",
  uploadPhotos:"رفع الصور",
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
  nameRequired:"العنوان مطلوب", priceRequired:"السعر مطلوب", floorRequired:"رقم الدور مطلوب",
  clickBarHint:"انقر على العمود لرؤية الإيراد الشهري",
  myProfile:"ملفي الشخصي", signOut:"تسجيل الخروج", noPhotos:"لا توجد صور بعد",
};

const BAR_H = [40, 55, 45, 70, 60, 80, 65, 90, 75, 95, 85, 100];
const BAR_REV = [6500, 7200, 6800, 8100, 7500, 9000, 8200, 10500, 9200, 11000, 10100, 13500];

const INIT_LISTINGS: Listing[] = [];

const INIT_APPLICANTS: Applicant[] = [];

const EMPTY_FORM = {
  name:"", city:"Cairo", district:"", price:"", sqft:"", floorNumber:"", beds:"1", baths:"1",
  description:"", status:"pending_review" as Status, photosRaw:"",
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function safeText(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim() ? value : fallback;
}

function safeNumber(value: unknown, fallback = 0) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : fallback;
}

function safeListingStatus(value: unknown): Status {
  if (value === "active") return "active";
  if (value === "rejected") return "rejected";
  return "pending_review";
}

function safeApplicationStatus(value: unknown): AppStatus {
  return value === "approved" || value === "declined" || value === "pending" ? value : "pending";
}

function parseStoredListings(value: unknown): Listing[] {
  if (!Array.isArray(value)) return [];

  return value.flatMap((item, index) => {
    const record = asRecord(item);
    if (!record) return [];

    return [{
      id: safeNumber(record.id, index + 1),
      name: safeText(record.name, `Listing ${index + 1}`),
      city: safeText(record.city, "Cairo"),
      district: safeText(record.district),
      price: safeNumber(record.price),
      sqft: safeNumber(record.sqft),
      floorNumber: safeNumber(record.floorNumber),
      beds: safeNumber(record.beds, 1),
      baths: safeNumber(record.baths, 1),
      description: safeText(record.description),
      views: safeNumber(record.views),
      applicants: safeNumber(record.applicants),
      status: safeListingStatus(record.status),
      photos: Array.isArray(record.photos) ? record.photos.filter((photo): photo is string => typeof photo === "string" && isSupportedPhotoUrl(photo)).slice(0, 15) : [],
      landlordName: safeText(record.landlordName) || undefined,
      landlordEmail: safeText(record.landlordEmail) || undefined,
    }];
  });
}

function parseStoredApplicants(value: unknown): Applicant[] {
  if (!Array.isArray(value)) return [];

  return value.flatMap((item, index) => {
    const record = asRecord(item);
    if (!record) return [];

    return [{
      id: safeNumber(record.id, index + 1),
      listingId: safeNumber(record.listingId),
      name: safeText(record.name, "Student applicant"),
      university: safeText(record.university, "Cairo University"),
      phone: safeText(record.phone),
      moveIn: safeText(record.moveIn, new Date().toISOString().slice(0, 10)),
      lease: safeText(record.lease, "12 months"),
      message: safeText(record.message),
      status: safeApplicationStatus(record.status),
      avatar: safeText(record.avatar) || undefined,
      email: safeText(record.email) || undefined,
      studentId: safeText(record.studentId) || undefined,
      year: safeText(record.year) || undefined,
      submittedAt: safeText(record.submittedAt) || undefined,
      landlordName: safeText(record.landlordName) || undefined,
      landlordEmail: safeText(record.landlordEmail) || undefined,
    }];
  });
}

export default function LandlordPage() {
  const [locale,     setLocale]     = useState<Locale>("en");
  const [tab,        setTab]        = useState<Tab>("listings");
  const [listings,   setListings]   = useState<Listing[]>(INIT_LISTINGS);
  const [applicants, setApplicants] = useState<Applicant[]>(INIT_APPLICANTS);
  const [modal,      setModal]      = useState<{ type:string; data?:Listing|Applicant|null } | null>(null);
  const [form,       setForm]       = useState({ ...EMPTY_FORM });
  const [formErrors, setFormErrors] = useState<{ name?:string; price?:string; floorNumber?:string }>({});
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
      if (ls) {
        setListings(parseStoredListings(JSON.parse(ls)));
      }
      const as_ = localStorage.getItem("sk_ll_applicants");
      if (as_) setApplicants(parseStoredApplicants(JSON.parse(as_)));
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { try { localStorage.setItem("sk_ll_listings",   JSON.stringify(listings));   } catch { /* ignore */ } }, [listings]);
  useEffect(() => { try { localStorage.setItem("sk_ll_applicants", JSON.stringify(applicants)); } catch { /* ignore */ } }, [applicants]);

  const t = locale === "ar" ? AR : EN;
  const close     = () => setModal(null);
  const showToast = (msg:string) => { setToast(msg); setTimeout(() => setToast(""), 2400); };

  const authEmail = authUser?.email?.trim().toLowerCase();
  const authName = authUser?.name?.trim().toLowerCase();
  const ownsListing = (listing: Listing) => {
    const listingEmail = listing.landlordEmail?.trim().toLowerCase();
    const listingName = listing.landlordName?.trim().toLowerCase();
    if (!listingEmail && !listingName) return true;
    return (!!authEmail && listingEmail === authEmail) || (!!authName && listingName === authName);
  };
  const ownsApplication = (applicant: Applicant) => {
    const listing = listings.find(l => l.id === applicant.listingId);
    if (listing) return ownsListing(listing);
    const appEmail = applicant.landlordEmail?.trim().toLowerCase();
    const appName = applicant.landlordName?.trim().toLowerCase();
    if (!appEmail && !appName) return true;
    return (!!authEmail && appEmail === authEmail) || (!!authName && appName === authName);
  };
  const ownedListings = listings.filter(ownsListing);
  const landlordApplicants = applicants.filter(ownsApplication);

  const activeCount  = ownedListings.filter(l => l.status === "active").length;
  const totalViews   = ownedListings.reduce((s,l) => s + l.views, 0);
  const pendingCount = landlordApplicants.filter(a => a.status === "pending").length;
  const monthlyRev   = ownedListings.filter(l => l.status === "active").reduce((s,l) => s + l.price, 0);

  const statusCls: Record<Status, string> = {
    active:      "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    pending_review: "bg-amber-500/15 text-amber-400 border-amber-500/30",
    rejected: "bg-rose-500/15 text-rose-400 border-rose-500/30",
  };
  const appCls: Record<AppStatus, string> = {
    pending:  "bg-amber-500/15 text-amber-400 border-amber-500/30",
    approved: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    declined: "bg-rose-500/15 text-rose-400 border-rose-500/30",
  };

  const normalizeStatus = (status: string): Status => {
    if (status === "active") return "active";
    if (status === "rejected") return "rejected";
    return "pending_review";
  };

  const parsePhotos = (raw: string) =>
    raw.split("\n").map(s => s.trim()).filter(isSupportedPhotoUrl).slice(0, 15);

  const openAdd  = () => {
    setForm({ ...EMPTY_FORM });
    setFormErrors({});
    setPhotoInput("");
    setModal({ type:"add" });
  };
  const openEdit = (l:Listing) => {
    setForm({ name:l.name, city:l.city, district:l.district, price:String(l.price), sqft:String(l.sqft), floorNumber:String(l.floorNumber ?? 0), beds:String(l.beds), baths:String(l.baths), description:l.description, status:normalizeStatus(l.status), photosRaw:l.photos.join("\n") });
    setFormErrors({});
    setPhotoInput("");
    setModal({ type:"edit", data:l });
  };

  const addPhotoToForm = () => {
    if (!isSupportedPhotoUrl(photoInput.trim())) return;
    const current = parsePhotos(form.photosRaw);
    if (current.length >= 15) { showToast("Max 15 photos allowed"); return; }
    setForm(f => ({ ...f, photosRaw: [...current, photoInput.trim()].join("\n") }));
    setPhotoInput("");
  };

  const addPhotoFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    const current = parsePhotos(form.photosRaw);
    const availableSlots = 15 - current.length;
    if (availableSlots <= 0) { showToast("Max 15 photos allowed"); return; }

    try {
      const uploads = await Promise.all(
        Array.from(files).slice(0, availableSlots).map(file => imageFileToDataUrl(file))
      );
      setForm(f => ({ ...f, photosRaw: [...parsePhotos(f.photosRaw), ...uploads].slice(0, 15).join("\n") }));
      showToast(`${uploads.length} photo${uploads.length === 1 ? "" : "s"} uploaded.`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Photo upload failed.");
    }
  };

  const removePhoto = (idx: number) => {
    const current = form.photosRaw.split("\n").filter(Boolean);
    current.splice(idx, 1);
    setForm(f => ({ ...f, photosRaw: current.join("\n") }));
  };

  const saveListing = () => {
    const errs: { name?:string; price?:string; floorNumber?:string } = {};
    if (!form.name.trim())  errs.name  = t.nameRequired;
    if (!form.price.trim()) errs.price = t.priceRequired;
    if (form.floorNumber === "" || Number.isNaN(Number(form.floorNumber))) errs.floorNumber = t.floorRequired;
    if (Object.keys(errs).length) { setFormErrors(errs); return; }

    const photos = parsePhotos(form.photosRaw);
    const floorNumber = Number(form.floorNumber);

    if (modal?.type === "add") {
      const newId = Math.max(0, ...listings.map(l => l.id)) + 1;
      setListings(prev => [...prev, { id:newId, name:form.name, city:form.city, district:form.district, price:Number(form.price), sqft:Number(form.sqft), floorNumber, beds:Number(form.beds), baths:Number(form.baths), description:form.description, views:0, applicants:0, status:"pending_review", photos, landlordName: authUser?.name, landlordEmail: authUser?.email }]);
      showToast(t.toastAdded);
    } else if (modal?.type === "edit" && modal.data) {
      const id = (modal.data as Listing).id;
      setListings(prev => prev.map(l => l.id === id ? { ...l, name:form.name, city:form.city, district:form.district, price:Number(form.price), sqft:Number(form.sqft), floorNumber, beds:Number(form.beds), baths:Number(form.baths), description:form.description, status:"pending_review", photos, landlordName: l.landlordName ?? authUser?.name, landlordEmail: l.landlordEmail ?? authUser?.email } : l));
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
    ? landlordApplicants.filter(a => a.listingId === filterListingId)
    : landlordApplicants;

  const handleFormChange = (name: keyof typeof EMPTY_FORM, value: string) => {
    setForm(f => ({ ...f, [name]: value }));
    setFormErrors(fe => ({ ...fe, [name]: "" }));
  };

  const listingStatusLabel = (status: Status) =>
    status === "active" ? t.active : status === "rejected" ? "Rejected" : t.underReview;

  const handleSignOut = () => {
    import("@/components/KYCModal").then(({ clearAuth }) => {
      clearAuth("landlord");
      setAuthUser(null);
      window.location.reload();
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
        <h1 className="min-w-0 truncate text-xl font-bold tracking-tighter">
          <span className="text-gradient">{t.brand}</span>{" "}
          <span className="text-white/60 text-base font-normal">{t.landlord}</span>
        </h1>
        <div className="flex shrink-0 items-center gap-2">
          <LanguageSwitcher currentLocale={locale}/>
          <ThemeToggle />
          {authUser && (
            <button
              onClick={handleSignOut}
              className="inline-flex items-center justify-center px-3 py-1.5 border border-rose-500/30 bg-rose-500/10 text-rose-400 rounded-lg text-xs font-semibold hover:bg-rose-500/20 transition-all mr-1"
            >
              {t.signOut}
            </button>
          )}
          <Link
            href="/landlord/account"
            aria-label={t.myProfile}
            className="inline-flex h-9 items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 pl-1 pr-3 text-sm font-semibold text-amber-100 shadow-lg ring-1 ring-amber-500/30 transition-all hover:bg-amber-500/20"
          >
            <span className="flex h-7 w-7 items-center justify-center overflow-hidden rounded-full bg-gradient-to-tr from-amber-500 to-orange-500 text-xs font-bold text-white">
              {authUser?.selfieUrl ? <img src={authUser.selfieUrl} alt="" className="h-full w-full rounded-full object-cover" /> : authUser?.avatar ?? "LL"}
            </span>
            <span className="hidden sm:inline">{t.myProfile}</span>
          </Link>
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
                <p className="text-xs text-muted-foreground mt-0.5">{activeCount} active · {ownedListings.length} total</p>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground"/>
            </button>
            <button onClick={() => { setFilterListingId(null); setTab("applications"); }} className="glass-card p-4 flex items-center gap-4 hover:border-indigo-500/30 transition-all text-start group">
              <div className="p-3 bg-indigo-500/10 rounded-xl group-hover:bg-indigo-500/20 transition-colors"><Users className="w-5 h-5 text-indigo-400"/></div>
              <div className="flex-1">
                <p className="font-semibold text-sm">{t.viewApplications}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{pendingCount} pending · {landlordApplicants.length} total</p>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground"/>
            </button>
          </div>
        </div>

        {/* ── Tab nav ── */}
        <div className="flex gap-0.5 border-b border-white/8">
          {([["listings",t.myListings],["applications",`${t.applicationsTab} (${landlordApplicants.length})`]] as [Tab,string][]).map(([id,label]) => (
            <button key={id} onClick={() => setTab(id)} className={`px-4 py-2.5 text-sm font-medium transition-all rounded-t-lg ${tab===id ? "text-amber-400 border-b-2 border-amber-500 bg-amber-500/5" : "text-muted-foreground hover:text-white"}`}>{label}</button>
          ))}
        </div>

        {/* ── Listings panel ── */}
        {tab === "listings" && (
          <div ref={listingsRef} className="space-y-4">
            {ownedListings.length === 0 && (
              <div className="glass-card p-12 text-center text-muted-foreground text-sm">No listings yet. Add your first property.</div>
            )}
            {ownedListings.map(l => {
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
                            EGP {l.price.toLocaleString()}/mo · {l.sqft} m² · Floor {l.floorNumber} · {l.beds}bd {l.baths}ba
                          </p>
                        </div>
                      </div>
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-full border shrink-0 ${statusCls[l.status]}`}>
                        {listingStatusLabel(l.status)}
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
              const avatarIsImage = !!a.avatar && (a.avatar.startsWith("data:image/") || /^https?:\/\//.test(a.avatar));
              return (
                <div key={a.id} className="glass-card p-4 hover:border-white/20 transition-all cursor-pointer" onClick={() => setModal({ type:"applicant", data:a })}>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-indigo-500/15 flex items-center justify-center text-indigo-400 font-bold text-sm shrink-0 overflow-hidden">
                      {avatarIsImage ? <img src={a.avatar} alt={a.name} className="w-full h-full object-cover" /> : a.name.split(" ").map(n=>n[0]).join("").slice(0,2)}
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
          <FormField label={t.titleLabel} name="name" placeholder="e.g. Studio – Dokki, Giza" form={form} formErrors={formErrors as Record<string, string>} onChange={handleFormChange} />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-muted-foreground mb-1 font-medium">{t.cityLabel}</label>
              <select
                value={form.city}
                onChange={e => { setForm(f => ({ ...f, city: e.target.value })); }}
                className="w-full bg-[#0d0d22] border border-white/10 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-amber-500/40 transition-all text-white"
              >
                <option value="Cairo" className="bg-[#12122b] text-white">Cairo</option>
                <option value="Giza" className="bg-[#12122b] text-white">Giza</option>
              </select>
            </div>
            <FormField label={t.districtLabel} name="district" placeholder="Zamalek" form={form} formErrors={formErrors as Record<string, string>} onChange={handleFormChange} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <FormField label={t.priceLabel} name="price" type="number" placeholder="4500" form={form} formErrors={formErrors as Record<string, string>} onChange={handleFormChange} />
            <FormField label={t.sqftLabel} name="sqft" type="number" placeholder="60" form={form} formErrors={formErrors as Record<string, string>} onChange={handleFormChange} />
          </div>
          <FormField label={t.floorLabel} name="floorNumber" type="number" placeholder="3" form={form} formErrors={formErrors as Record<string, string>} onChange={handleFormChange} />
          <div className="grid grid-cols-2 gap-3">
            <FormField label={t.bedsLabel} name="beds" type="number" placeholder="1" form={form} formErrors={formErrors as Record<string, string>} onChange={handleFormChange} />
            <FormField label={t.bathsLabel} name="baths" type="number" placeholder="1" form={form} formErrors={formErrors as Record<string, string>} onChange={handleFormChange} />
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1 font-medium">{t.statusLabel}</label>
            <div className="w-full bg-amber-500/10 border border-amber-500/25 rounded-lg px-3 py-2.5 text-sm text-amber-300">
              {t.underReview}
            </div>
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1 font-medium">{t.descLabel}</label>
            <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description:e.target.value }))} rows={2} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-amber-500/40 resize-none transition-all" placeholder="Describe your property..."/>
          </div>

          {/* ── Photo manager ── */}
          <div>
            <label className="block text-xs text-muted-foreground mb-1.5 font-medium flex items-center gap-1.5">
              <ImageIcon className="w-3.5 h-3.5"/> {t.photosLabel}
              <span className="text-white/25 font-normal">({parsePhotos(form.photosRaw).length}/15)</span>
            </label>
            <p className="text-[10px] text-white/30 mb-2">{t.photosHint}</p>
            <label className="mb-2 inline-flex items-center gap-2 cursor-pointer rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs font-semibold text-amber-300 hover:bg-amber-500/15 transition-all">
              <Upload className="w-3.5 h-3.5" />
              {t.uploadPhotos}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                className="hidden"
                onChange={e => { void addPhotoFiles(e.target.files); e.currentTarget.value = ""; }}
              />
            </label>

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
            {parsePhotos(form.photosRaw).length < 15 && (
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
        {ownedListings.map(l => (
          <div key={l.id} className="flex justify-between py-2.5 border-b border-white/6 text-sm last:border-none">
            <span className="text-muted-foreground truncate max-w-[200px]">{l.name}</span>
            <span className="font-bold">{l.views.toLocaleString()} {t.viewsLabel}</span>
          </div>
        ))}
      </Modal>

      {/* ── Analytics modal ── */}
      <Modal open={modal?.type==="analytics"} title={t.analyticsTitle} onClose={close}>
        {modal?.type==="analytics" && modal.data && (() => {
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
                [t.floorLabel,       `${l.floorNumber}`],
                ["Photos",          `${l.photos.length}`],
                ["Monthly Revenue", `EGP ${l.price.toLocaleString()}`],
                ["Annual Revenue",  `EGP ${(l.price*12).toLocaleString()}`],
                ["Status",          listingStatusLabel(l.status)],
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
      <Modal open={modal?.type==="applicant"} title="Student Profile" onClose={close}>
        {modal?.type==="applicant" && modal.data && (() => {
          const a = modal.data as Applicant;
          const listing = listings.find(l => l.id === a.listingId);
          const profile = buildPublicUserProfile("student", a, "Student applicant");
          return (
            <UserProfileView profile={profile}>
              <section className="rounded-xl border border-white/10 bg-white/5 p-5 text-sm">
                <h3 className="text-lg font-semibold">Application Details</h3>
                <div className="mt-4">
                  {[
                    ["Listing", listing?.name ?? "N/A"],
                    [t.moveIn, a.moveIn],
                    [t.lease, a.lease],
                  ].map(([k,v]) => (
                    <div key={k} className="flex justify-between gap-4 border-b border-white/8 py-3 last:border-none">
                      <span className="text-muted-foreground">{k}</span>
                      <span className="max-w-[58%] truncate text-right font-semibold">{v || "N/A"}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-4 rounded-lg border border-white/8 bg-white/4 p-3">
                  <span className="mb-1 block text-xs text-muted-foreground">{t.message}</span>
                  <span className="text-sm italic text-white/75">&quot;{a.message || "No message shared."}&quot;</span>
                </div>
                <div className={`mt-4 w-fit rounded-full border px-3 py-1.5 text-xs font-medium ${appCls[a.status]}`}>
                  {a.status === "pending" ? t.pending : a.status === "approved" ? t.approved : t.declined}
                </div>
              {a.status === "pending" && (
                <div className="flex gap-3 pt-4">
                  <button onClick={() => { setAppStatus(a.id,"approved"); close(); }} className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white py-2.5 rounded-lg font-semibold transition-all">{t.approve}</button>
                  <button onClick={() => { setAppStatus(a.id,"declined"); close(); }} className="flex-1 bg-rose-600/80 hover:bg-rose-500 text-white py-2.5 rounded-lg font-semibold transition-all">{t.decline}</button>
                </div>
              )}
              </section>
            </UserProfileView>
          );
        })()}
      </Modal>

      {/* ── Profile modal ── */}
      <Modal open={profileOpen} title={t.myProfile} onClose={() => setProfileOpen(false)}>
        <div className="space-y-1 text-sm">
          <div className="text-center mb-5">
            <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center font-bold text-xl mx-auto mb-3">
              {authUser?.selfieUrl ? <img src={authUser.selfieUrl} alt="" className="h-full w-full rounded-full object-cover" /> : authUser?.avatar ?? "LL"}
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
            ["Total Applications", String(landlordApplicants.length)],
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

interface FormFieldProps {
  label: string;
  name: keyof typeof EMPTY_FORM;
  type?: string;
  placeholder?: string;
  form: typeof EMPTY_FORM;
  formErrors: Record<string, string>;
  onChange: (name: keyof typeof EMPTY_FORM, value: string) => void;
}

function FormField({ label, name, type = "text", placeholder = "", form, formErrors, onChange }: FormFieldProps) {
  return (
    <div>
      <label className="block text-xs text-muted-foreground mb-1 font-medium">{label}</label>
      <input
        type={type}
        value={form[name] as string}
        onChange={e => onChange(name, e.target.value)}
        placeholder={placeholder}
        className={`w-full bg-white/5 border rounded-lg px-3 py-2.5 text-sm focus:outline-none transition-all ${formErrors[name] ? "border-rose-500/60" : "border-white/10 focus:border-amber-500/40"}`}
      />
      {formErrors[name] && <p className="text-rose-400 text-xs mt-1">{formErrors[name]}</p>}
    </div>
  );
}
