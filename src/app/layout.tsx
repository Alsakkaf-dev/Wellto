import type { Metadata, Viewport } from "next";

export const preferredRegion = "sin1";
import { Fraunces, IBM_Plex_Sans_Arabic, Outfit } from "next/font/google";
import { readLocaleCookie } from "@/server/auth";
import "./globals.css";

const sans = Outfit({ subsets: ["latin"], variable: "--font-sans", display: "swap" });
const display = Fraunces({ subsets: ["latin"], variable: "--font-display", display: "swap" });
const arabic = IBM_Plex_Sans_Arabic({
  subsets: ["arabic"],
  weight: ["400", "500", "600"],
  variable: "--font-arabic",
  display: "swap",
  preload: false,
});

export const metadata: Metadata = {
  title: "Mahfaza",
  description: "Personal money automation.",
  applicationName: "Mahfaza",
  robots: { index: false, follow: false },
  appleWebApp: { capable: true, title: "Mahfaza", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: "#f3eee4",
  colorScheme: "light",
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = (await readLocaleCookie()) ?? "en";
  if (process.env.VERCEL && !process.env.DATABASE_URL) {
    return (
      <html lang="en">
        <body className="bg-[#f3eee4] p-8 text-[#1c1915]">
          <main className="mx-auto max-w-lg">
            <h1 className="text-3xl">Mahfaza needs a database</h1>
            <p className="mt-3">Add DATABASE_URL from Neon (Vercel Marketplace → Neon), then redeploy. The table is created on the first request.</p>
            <p className="mt-3" dir="rtl">أضف DATABASE_URL من Neon ثم أعد النشر. الجدول يُنشأ عند أول طلب.</p>
          </main>
        </body>
      </html>
    );
  }
  return (
    <html lang={locale === "ar" ? "ar" : "en"} dir={locale === "ar" ? "rtl" : "ltr"} className="light">
      <body className={`${sans.variable} ${display.variable} ${locale === "ar" ? `${arabic.variable} font-arabic` : "font-sans"} antialiased`}>
        {children}
      </body>
    </html>
  );
}
