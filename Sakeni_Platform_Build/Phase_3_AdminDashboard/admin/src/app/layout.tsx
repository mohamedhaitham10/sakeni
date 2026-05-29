import type { Metadata } from "next";
import { Inter, Cairo } from "next/font/google";
import { cookies } from "next/headers";
import "./globals.css";
import type { Locale } from "@/lib/i18n";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const cairo = Cairo({ subsets: ["arabic", "latin"], variable: "--font-cairo" });

export const metadata: Metadata = {
  title: "Sakeni | Premium Dashboard",
  description: "Next-generation admin dashboard and platform built for speed and aesthetics.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = cookies();
  const locale = (cookieStore.get("locale")?.value ?? "en") as Locale;
  const dir = locale === "ar" ? "rtl" : "ltr";

  return (
    <html lang={locale} dir={dir} className="dark">
      <body
        className={`${inter.variable} ${cairo.variable} ${
          locale === "ar" ? "font-cairo" : "font-inter"
        }`}
      >
        {children}
      </body>
    </html>
  );
}
