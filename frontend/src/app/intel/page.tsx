import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { APP_ROUTES } from "@/config/routes";

export const metadata: Metadata = {
  title: "Gaming News Feed",
  robots: { index: false, follow: true },
};

export default function IntelPage() {
  redirect(APP_ROUTES.home);
}
