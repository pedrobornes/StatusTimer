import {
  parseIntelContentBlocks,
  parseIntelInlineParts,
  type IntelInlinePart,
} from "@/lib/intelFeed";

interface IntelFeedContentProps {
  content: string;
}

function inlinePartClassName(part: IntelInlinePart): string {
  if (part.type === "link") {
    return "font-medium text-violet-200 underline decoration-violet-400/40 underline-offset-2 transition hover:text-violet-100";
  }

  if (part.type === "image") {
    return "";
  }

  if (part.type === "errorCode") {
    return "rounded-sm bg-amber-400/15 px-1 py-0.5 font-mono text-[11px] font-semibold text-amber-200 ring-1 ring-amber-400/25";
  }

  if (part.type === "region") {
    return "rounded-sm bg-sky-400/15 px-1 py-0.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-sky-200 ring-1 ring-sky-400/25";
  }

  if (part.type === "emphasis") {
    return "font-semibold text-white";
  }

  return "text-slate-300";
}

function headingClassName(level: 1 | 2 | 3): string {
  if (level === 1) {
    return "text-xl font-bold tracking-tight text-white";
  }

  if (level === 2) {
    return "text-lg font-semibold text-violet-100";
  }

  return "text-sm font-semibold uppercase tracking-[0.14em] text-violet-200/90";
}

function IntelInlineText({ text }: { text: string }) {
  const parts = parseIntelInlineParts(text);

  return (
    <>
      {parts.map((part, index) => {
        if (part.type === "image") {
          return (
            <img
              key={`image-inline-${index}`}
              src={part.src}
              alt={part.alt}
              loading="lazy"
              className="my-3 max-w-full rounded-xl border border-white/10"
            />
          );
        }

        if (part.type === "link") {
          return (
            <a
              key={`link-${index}`}
              href={part.href}
              target="_blank"
              rel="noopener noreferrer"
              className={inlinePartClassName(part)}
            >
              {part.label}
            </a>
          );
        }

        return (
          <span key={`${part.type}-${index}`} className={inlinePartClassName(part)}>
            {part.type === "text" ? part.value : part.value}
          </span>
        );
      })}
    </>
  );
}

export default function IntelFeedContent({ content }: IntelFeedContentProps) {
  const blocks = parseIntelContentBlocks(content);

  return (
    <div className="space-y-5">
      {blocks.map((block, index) => {
        if (block.kind === "image") {
          return (
            <figure key={`image-${index}`} className="my-2">
              <img
                src={block.src}
                alt={block.alt}
                loading="lazy"
                className="max-w-full rounded-xl border border-white/10"
              />
            </figure>
          );
        }

        if (block.kind === "heading") {
          const HeadingTag =
            block.level === 1 ? "h2" : block.level === 2 ? "h3" : "h4";

          return (
            <HeadingTag
              key={`heading-${index}`}
              className={`${headingClassName(block.level)} ${index > 0 ? "pt-1" : ""}`}
            >
              {block.text}
            </HeadingTag>
          );
        }

        if (block.kind === "ul") {
          return (
            <ul
              key={`ul-${index}`}
              className="list-disc space-y-2 pl-5 text-sm leading-7 text-slate-300 marker:text-fuchsia-300"
            >
              {block.items.map((item, itemIndex) => (
                <li key={`ul-item-${index}-${itemIndex}`}>
                  <IntelInlineText text={item} />
                </li>
              ))}
            </ul>
          );
        }

        if (block.kind === "ol") {
          return (
            <ol
              key={`ol-${index}`}
              className="list-decimal space-y-2 pl-5 text-sm leading-7 text-slate-300 marker:text-fuchsia-300"
            >
              {block.items.map((item, itemIndex) => (
                <li key={`ol-item-${index}-${itemIndex}`}>
                  <IntelInlineText text={item} />
                </li>
              ))}
            </ol>
          );
        }

        return (
          <p key={`paragraph-${index}`} className="text-sm leading-7 text-slate-300">
            <IntelInlineText text={block.text} />
          </p>
        );
      })}
    </div>
  );
}
