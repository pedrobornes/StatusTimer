import type { Metadata } from "next";
import { Cinzel, Inter } from "next/font/google";
import Footer from "@/components/Footer";
import "./globals.css";

const cinzel = Cinzel({
  subsets: ["latin"],
  variable: "--font-cinzel",
  weight: ["500", "700"],
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "StatusTimer | Live Gaming Server Status & AI News",
    template: "%s | StatusTimer",
  },
  description:
    "Track live gaming, social, and streaming platform status alongside AI-generated gaming news. Real-time server health monitoring for gamers worldwide.",
  keywords: [
    "gaming server status",
    "platform uptime",
    "Steam status",
    "Discord status",
    "gaming news",
    "live server monitor",
  ],
  openGraph: {
    title: "StatusTimer | Live Gaming Server Status & AI News",
    description:
      "Track live gaming, social, and streaming platform status alongside AI-generated gaming news.",
    url: siteUrl,
    siteName: "StatusTimer",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "StatusTimer | Live Gaming Server Status & AI News",
    description:
      "Track live gaming, social, and streaming platform status alongside AI-generated gaming news.",
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
    <html lang="en" className={`${cinzel.variable} ${inter.variable}`}>
      <body className="flex min-h-screen flex-col">
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
