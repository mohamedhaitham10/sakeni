"use client";

export function LanguageSwitcher({ currentLocale }: { currentLocale: string }) {

  const switchLocale = (locale: string) => {
    document.cookie = `locale=${locale}; path=/; max-age=31536000; SameSite=Lax`;
    window.location.reload();
  };

  return (
    <div className="inline-flex items-center overflow-hidden border border-white/10 bg-white/5 p-1">
      <button
        onClick={() => switchLocale("en")}
        className={`px-3 py-1 text-sm font-semibold transition-colors ${
          currentLocale === "en"
            ? "bg-indigo-600 text-white"
            : "text-muted-foreground hover:text-white hover:bg-white/5"
        }`}
        aria-label="Switch to English"
      >
        EN
      </button>
      <button
        onClick={() => switchLocale("ar")}
        className={`px-3 py-1 text-sm font-semibold transition-colors ${
          currentLocale === "ar"
            ? "bg-indigo-600 text-white"
            : "text-muted-foreground hover:text-white hover:bg-white/5"
        }`}
        aria-label="Switch to Arabic"
      >
        AR
      </button>
    </div>
  );
}
