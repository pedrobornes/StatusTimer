import type { ReactNode } from "react";
import PageShell from "@/components/PageShell";
import { LEGAL_LAST_UPDATED } from "@/config/site";

export interface LegalSection {
  title: string;
  content: ReactNode;
}

interface LegalDocumentProps {
  title: string;
  subtitle: string;
  sections: LegalSection[];
}

export default function LegalDocument({
  title,
  subtitle,
  sections,
}: LegalDocumentProps) {
  return (
    <PageShell badge="Legal" title={title} subtitle={subtitle}>
      <p className="mb-8 text-xs uppercase tracking-[0.2em] text-slate-500">
        Last updated: {LEGAL_LAST_UPDATED}
      </p>

      <div className="space-y-8">
        {sections.map((section) => (
          <section
            key={section.title}
            className="glass-panel rounded-2xl p-6 md:p-8"
          >
            <h2 className="mb-4 text-lg font-semibold text-white">
              {section.title}
            </h2>
            <div className="space-y-4 text-sm leading-7 text-slate-300">
              {section.content}
            </div>
          </section>
        ))}
      </div>
    </PageShell>
  );
}
