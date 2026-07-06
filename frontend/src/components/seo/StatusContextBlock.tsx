interface StatusContextBlockProps {
  paragraphs: string[];
}

export default function StatusContextBlock({ paragraphs }: StatusContextBlockProps) {
  if (paragraphs.length === 0) {
    return null;
  }

  return (
    <section aria-labelledby="status-context-heading" className="space-y-3">
      <h2
        id="status-context-heading"
        className="heading-section text-xl uppercase text-white"
      >
        Live Status Context
      </h2>
      {paragraphs.map((paragraph) => (
        <p key={paragraph} className="text-sm leading-7 text-slate-300">
          {paragraph}
        </p>
      ))}
    </section>
  );
}
