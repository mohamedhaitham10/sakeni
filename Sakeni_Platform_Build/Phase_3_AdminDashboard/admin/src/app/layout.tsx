import type { Metadata } from "next";
import { Barlow, Barlow_Condensed, Cairo } from "next/font/google";
import { cookies } from "next/headers";
import "./globals.css";
import type { Locale } from "@/lib/i18n";

const barlow = Barlow({ subsets: ["latin"], weight: ["400", "500", "700"], variable: "--font-barlow" });
const barlowCondensed = Barlow_Condensed({ subsets: ["latin"], weight: ["400", "600"], variable: "--font-barlow-condensed" });
const cairo = Cairo({ subsets: ["arabic", "latin"], variable: "--font-cairo" });

const themeInitScript = `
(() => {
  try {
    const storageKey = "sakeni-theme";
    const saved = localStorage.getItem(storageKey);
    const systemDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
    const theme = saved === "light" || saved === "dark" ? saved : systemDark ? "dark" : "light";
    const root = document.documentElement;
    root.dataset.theme = theme;
    root.classList.toggle("dark", theme === "dark");
    root.style.colorScheme = theme;
  } catch {
    document.documentElement.dataset.theme = "light";
  }
})();
`;

export const metadata: Metadata = {
  title: "Sakeni (سكني) | Housing Platform",
  description: "Verified student housing platform for Cairo and Giza.",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const locale = (cookieStore.get("locale")?.value ?? "en") as Locale;
  const dir = locale === "ar" ? "rtl" : "ltr";

  return (
    <html lang={locale} dir={dir} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body
        className={`${barlow.variable} ${barlowCondensed.variable} ${cairo.variable} ${
          locale === "ar" ? "font-cairo" : "font-barlow"
        }`}
      >
        {children}
      </body>
    </html>
  );
}
