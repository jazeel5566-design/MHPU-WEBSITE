import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans, Barlow, Barlow_Semi_Condensed } from "next/font/google";
import { getLang } from "@/lib/i18n";
import { a11yBootScript } from "@/components/a11y-bar";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-jakarta", display: "swap" });
const barlow = Barlow({ subsets: ["latin"], variable: "--font-barlow", display: "swap", weight: ["500", "600", "700", "800"] });
const wordmark = Barlow_Semi_Condensed({ subsets: ["latin"], variable: "--font-wordmark", display: "swap", weight: ["300", "600"] });

export const metadata: Metadata = {
  title: { default: "MHPU — Maldives Health Professionals Union", template: "%s · MHPU" },
  description: "The trade union federation for nurses, doctors, allied-health and support staff across the Maldives.",
};

export const viewport: Viewport = { themeColor: "#2c2f3b" };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const lang = await getLang();
  return (
    <html lang={lang} dir={lang === "dv" ? "rtl" : "ltr"} className={`${jakarta.variable} ${barlow.variable} ${wordmark.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: a11yBootScript }} />
        {lang === "dv" && <link rel="preload" href="/fonts/Faruma.ttf" as="font" type="font/ttf" crossOrigin="anonymous" />}
      </head>
      <body className="min-h-screen font-sans">
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:start-3 focus:top-3 focus:z-[100] focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:shadow-lg">
          Skip to content
        </a>
        {children}
      </body>
    </html>
  );
}
