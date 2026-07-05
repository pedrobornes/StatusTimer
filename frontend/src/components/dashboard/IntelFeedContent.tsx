import {
  parseIntelContentBlocks,
  splitIntelInlineSegments,
  stripMarkdownEmphasis,
  type IntelTextSegment,
} from "@/lib/intelFeed";

interface IntelFeedContentProps {
  content: string;
}

function segmentClassName(type: IntelTextSegment["type"]): string {
  if (type === "errorCode") {
    return "rounded-sm bg-amber-400/15 px-1 py-0.5 font-mono text-[11px] font-semibold text-amber-200 ring-1 ring-amber-400/25";
  }

  if (type === "region") {
    return "rounded-sm bg-sky-400/15 px-1 py-0.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-sky-200 ring-1 ring-sky-400/25";
  }

  if (type === "emphasis") {
    return "font-semibold text-white";
  }

  return "text-slate-300";
}

function IntelInlineText({ text }: { text: string }) {
  const segments = splitIntelInlineSegments(text);

  return (
    <>
      {segments.map((segment, index) => (
        <span key={`${segment.type}-${index}`} className={segmentClassName(segment.type)}>
          {segment.value}
        </span>
      ))}
    </>
  );
}

export default function IntelFeedContent({ content }: IntelFeedContentProps) {
  const blocks = parseIntelContentBlocks(content);

  return (
    <div className="space-y-3">
      {blocks.map((line, index) => {
        const parsed = stripMarkdownEmphasis(line);

        if (parsed.kind === "heading") {
          return (
            <p
              key={`heading-${index}`}
              className="text-[11px] font-semibold uppercase tracking-[0.16em] text-violet-200/90"
            >
              {parsed.text}
            </p>
          );
        }

        if (parsed.kind === "bullet") {
          return (
            <div
              key={`bullet-${index}`}
              className="flex gap-2 rounded-xl border border-white/6 bg-black/20 px-3 py-2"
            >
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-fuchsia-400 shadow-[0_0_8px_rgba(232,121,249,0.8)]" />
              <p className="text-sm leading-6">
                <IntelInlineText text={parsed.text} />
              </p>
            </div>
          );
        }

        return (
          <p key={`paragraph-${index}`} className="text-sm leading-7">
            <IntelInlineText text={parsed.text} />
          </p>
        );
      })}
    </div>
  );
}
