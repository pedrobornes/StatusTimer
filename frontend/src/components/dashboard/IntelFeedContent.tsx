import {
  parseIntelContentBlocks,
  parseIntelInlineParts,
  type IntelInlinePart,
} from "@/lib/intelFeed";
import NewsArticleImage from "@/components/dashboard/NewsArticleImage";

interface IntelFeedContentProps {
  content: string;
}

function inlinePartClassName(part: IntelInlinePart): string {
  if (part.type === "link") {
    return "font-semibold text-orange-300 underline decoration-orange-400/60 underline-offset-[3px] decoration-2 transition-colors hover:text-orange-200 hover:decoration-orange-300/80 focus-visible:rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-400/50";
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
            <NewsArticleImage
              key={`image-inline-${index}`}
              src={part.src}
              alt={part.alt}
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
    <div className="mx-auto max-w-3xl space-y-6">
      {blocks.map((block, index) => {
        if (block.kind === "image") {
          return (
            <figure key={`image-${index}`} className="my-2">
              <NewsArticleImage
                src={block.src}
                alt={block.alt}
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
              className="list-disc space-y-2.5 pl-6 text-[15px] leading-8 text-slate-200/90 marker:text-fuchsia-300"
            >
              {block.items.map((item, itemIndex) => (
                <li key={`ul-item-${index}-${itemIndex}`} className="whitespace-pre-wrap">
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
              className="list-decimal space-y-2.5 pl-6 text-[15px] leading-8 text-slate-200/90 marker:text-fuchsia-300"
            >
              {block.items.map((item, itemIndex) => (
                <li key={`ol-item-${index}-${itemIndex}`} className="whitespace-pre-wrap">
                  <IntelInlineText text={item} />
                </li>
              ))}
            </ol>
          );
        }

        return (
          <p
            key={`paragraph-${index}`}
            className="whitespace-pre-wrap text-[15px] leading-8 text-slate-200/90"
          >
            <IntelInlineText text={block.text} />
          </p>
        );
      })}
    </div>
  );
}
