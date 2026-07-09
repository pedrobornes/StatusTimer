import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Footer from "@/components/Footer";
import Navigation from "@/components/Navigation";
import {
  SITE_DEFAULT_DESCRIPTION,
  SITE_DEFAULT_KEYWORDS,
} from "@/config/seo";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "StatusTimer | Live Gaming Server Status Monitor",
    template: "%s | StatusTimer",
  },
  description: SITE_DEFAULT_DESCRIPTION,
  keywords: [...SITE_DEFAULT_KEYWORDS],
  openGraph: {
    title: "StatusTimer | Live Game & Social Platform Status",
    description: SITE_DEFAULT_DESCRIPTION,
    url: siteUrl,
    siteName: "StatusTimer",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "StatusTimer | Live Game & Social Platform Status",
    description: SITE_DEFAULT_DESCRIPTION,
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="flex min-h-screen flex-col">
        <Navigation />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
