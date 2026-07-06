import type { GameFaqItem } from "@/lib/seo/gameFaq";

interface GameStatusFaqProps {
  items: GameFaqItem[];
}

export default function GameStatusFaq({ items }: GameStatusFaqProps) {
  if (items.length === 0) {
    return null;
  }

  return (
    <section aria-labelledby="status-faq-heading" className="space-y-4">
      <h2
        id="status-faq-heading"
        className="heading-section text-xl uppercase text-white"
      >
        Frequently Asked Questions
      </h2>
      <div className="space-y-3">
        {items.map((item) => (
          <details
            key={item.question}
            className="rounded-xl border border-white/10 bg-[#1a162b]/40 px-4 py-3"
          >
            <summary className="cursor-pointer text-sm font-medium text-white">
              {item.question}
            </summary>
            <p className="mt-2 text-sm leading-6 text-slate-400">{item.answer}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
