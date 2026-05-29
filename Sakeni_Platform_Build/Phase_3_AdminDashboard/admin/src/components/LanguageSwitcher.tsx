"use client";

export function LanguageSwitcher({ currentLocale }: { currentLocale: string }) {

  const switchLocale = (locale: string) => {
    document.cookie = `locale=${locale}; path=/; max-age=31536000; SameSite=Lax`;
    window.location.reload();
  };

  return (
    <div className="flex items-center gap-1 bg-white/5 rounded-lg p-1 border border-white/10">
      <button
        onClick={() => switchLocale("en")}
        className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
          currentLocale === "en"
            ? "bg-indigo-600 text-white shadow"
            : "text-muted-foreground hover:text-white"
        }`}
        aria-label="Switch to English"
      >
        EN
      </button>
      <button
        onClick={() => switchLocale("ar")}
        className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
          currentLocale === "ar"
            ? "bg-indigo-600 text-white shadow"
            : "text-muted-foreground hover:text-white"
        }`}
        aria-label="Switch to Arabic"
      >
        AR
      </button>
    </div>
  );
}
