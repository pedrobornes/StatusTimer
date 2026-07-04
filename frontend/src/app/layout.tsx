import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Footer from "@/components/Footer";
import Navigation from "@/components/Navigation";
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
    "Fortnite status tracker",
    "live countdowns",
    "Valorant network status",
    "multiplayer server monitor",
    "upcoming game release dates",
    "GTA 6 release date countdown",
    "Silksong launcher",
    "Fortnite server status",
    "Valorant server status",
    "League of Legends server status",
    "Call of Duty server status",
    "Apex Legends server status",
    "Minecraft server status",
    "Roblox server status",
    "gaming platform monitor",
    "live gaming telemetry",
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
    <html lang="en" className={inter.variable}>
      <body className="flex min-h-screen flex-col">
        <Navigation />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
