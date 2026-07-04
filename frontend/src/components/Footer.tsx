import { Scale } from "lucide-react";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="mt-auto border-t border-violet-400/10 bg-black/20 backdrop-blur-sm">
      <div className="mx-auto max-w-7xl px-4 py-8 md:px-8">
        <div className="glass-panel rounded-2xl p-6 md:p-8">
          <div className="mb-4 flex items-center gap-2">
            <Scale className="h-4 w-4 shrink-0 text-violet-300/80" />
            <p className="text-xs font-medium uppercase tracking-[0.25em] text-violet-200/70">
              Legal Disclaimer
            </p>
          </div>

          <p className="text-sm leading-relaxed text-violet-200/60">
            StatusTimer is an independent tracking platform. It is not
            affiliated, associated, authorized, or endorsed by any company,
            brand, or trademark listed on this site. All product names, logos,
            and trademarks are the property of their respective owners and are
            used solely for identification and informational purposes.
          </p>

          <div className="mt-6 flex flex-col gap-2 border-t border-white/5 pt-6 sm:flex-row sm:items-center sm:justify-between">
            <p className="font-[family-name:var(--font-cinzel)] text-sm tracking-[0.12em] text-white/90">
              StatusTimer
            </p>
            <p className="text-xs text-violet-200/45">
              &copy; {currentYear} StatusTimer. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
