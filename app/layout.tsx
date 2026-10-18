import type { Metadata } from "next";
import { IBM_Plex_Sans_Arabic, Reem_Kufi } from "next/font/google";
import "./globals.css";

const reemKufi = Reem_Kufi({
  variable: "--font-reem-kufi",
  subsets: ["arabic", "latin"],
  weight: "700",
});

const ibmPlexSansArabic = IBM_Plex_Sans_Arabic({
  variable: "--font-ibm-plex-sans-arabic",
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "دفترجي | حسابات محلك",
  description: "تابع مبيعات ومصروفات محلك في مكان واحد.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="ar"
      dir="rtl"
      className={`${reemKufi.variable} ${ibmPlexSansArabic.variable} h-full antialiased`}
    >
      <body className="min-h-full">{children}</body>
    </html>
  );
}
