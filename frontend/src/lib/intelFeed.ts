import type { TelemetrySource, TelemetryStatus } from "@/types/telemetry";

export type IntelArticleKind = "INCIDENT" | "PATCH" | "RELEASE" | "GENERAL";

export interface IntelTextSegment {
  type: "text" | "errorCode" | "region" | "emphasis";
  value: string;
}

const ERROR_CODE_PATTERN =
  /\b(?:RIFT-\d+|VAN\s*-?\s*\d+|[A-Z]{2,}-\d+)\b/gi;

const REGION_PATTERN =
  /\b(?:NA|EUW|EUNE|BR|LATAM|APAC|OCE|EMEA|North America|Latin America|Americas)\b/g;

const HIGHLIGHT_PATTERN = new RegExp(
  `(${ERROR_CODE_PATTERN.source}|${REGION_PATTERN.source})`,
  "gi",
);

export function classifyIntelArticle(title: string): IntelArticleKind {
  const normalized = title.toUpperCase();

  if (normalized.includes("[INCIDENT BRIEF]")) {
    return "INCIDENT";
  }

  if (normalized.includes("[RELEASE INTEL]")) {
    return "RELEASE";
  }

  if (
    normalized.includes("PATCH") ||
    normalized.includes("UPDATE") ||
    normalized.includes("BALANCE")
  ) {
    return "PATCH";
  }

  return "GENERAL";
}

export function isIncidentNews(title: string): boolean {
  return classifyIntelArticle(title) === "INCIDENT";
}

export function getDashboardNewsAccent(title: string): {
  borderClass: string;
  badgeClass: string;
  label: string | null;
} {
  if (isIncidentNews(title)) {
    return {
      label: "Incident",
      badgeClass:
        "border-rose-400/30 bg-rose-500/10 text-rose-100",
      borderClass: "hover:border-rose-400/30",
    };
  }

  return {
    label: null,
    badgeClass: "",
    borderClass: "hover:border-violet-400/25",
  };
}

export function getIntelArticleAccent(kind: IntelArticleKind): {
  badgeClass: string;
  borderClass: string;
  label: string;
} {
  if (kind === "INCIDENT") {
    return {
      label: "Incident Brief",
      badgeClass:
        "border-rose-400/30 bg-rose-500/10 text-rose-100",
      borderClass: "hover:border-rose-400/30",
    };
  }

  if (kind === "RELEASE") {
    return {
      label: "Release Intel",
      badgeClass:
        "border-cyan-400/30 bg-cyan-500/10 text-cyan-100",
      borderClass: "hover:border-cyan-400/30",
    };
  }

  if (kind === "PATCH") {
    return {
      label: "Patch Intel",
      badgeClass:
        "border-fuchsia-400/30 bg-fuchsia-500/10 text-fuchsia-100",
      borderClass: "hover:border-fuchsia-400/30",
    };
  }

  return {
    label: "Platform Intel",
    badgeClass:
      "border-violet-400/30 bg-violet-500/10 text-violet-100",
    borderClass: "hover:border-violet-400/30",
  };
}

function classifySegment(value: string): IntelTextSegment["type"] {
  ERROR_CODE_PATTERN.lastIndex = 0;
  REGION_PATTERN.lastIndex = 0;

  if (ERROR_CODE_PATTERN.test(value)) {
    return "errorCode";
  }

  if (REGION_PATTERN.test(value)) {
    return "region";
  }

  return "text";
}

export function splitIntelInlineSegments(line: string): IntelTextSegment[] {
  const parts = line.split(HIGHLIGHT_PATTERN).filter((part) => part.length > 0);

  return parts.map((part) => ({
    type: classifySegment(part),
    value: part,
  }));
}

export function cleanNewsDisplayTitle(title: string, gameTag?: string | null): string {
  let cleaned = title
    .replace(
      /^\[(?:STEAM NEWS|RIOT [A-Z]+|EPIC INCIDENT|INCIDENT BRIEF|RELEASE INTEL|SIMULATION)\]\s*/i,
      "",
    )
    .trim();

  if (!gameTag?.trim()) {
    return cleaned || title.trim();
  }

  const tagLabel = gameTag
    .split("-")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

  for (const candidate of [gameTag, tagLabel]) {
    for (const separator of [": ", " - ", " — "]) {
      const prefix = `${candidate}${separator}`;
      if (cleaned.toLowerCase().startsWith(prefix.toLowerCase())) {
        cleaned = cleaned.slice(prefix.length).trim();
      }
    }
  }

  return cleaned || title.trim();
}

/** Plain-text preview for news cards (no markdown artifacts). */
/** Ensures inline **bold** and [link](url) markers have word boundaries when HTML conversion glues them. */
export function normalizeBoldSpacing(text: string): string {
  const unescaped = text
    .replace(/\\([\[\]])/g, "$1")
    .replace(/\\t/g, "\t");

  const normalized = unescaped.replace(/\*\*([^*]+)\*\*/g, (_, inner: string) => {
    return `**${inner.trim()}**`;
  });

  return normalized
    .replace(/(\S)(\*\*[^*]+\*\*)/g, "$1 $2")
    .replace(/(\*\*[^*]+\*\*)([A-Za-z0-9])/g, "$1 $2");
}

export function normalizeMarkdownSpacing(text: string): string {
  const boldFixed = normalizeBoldSpacing(text);
  return boldFixed
    .replace(/([A-Za-z0-9])(\[([^\]]+)\]\([^)]+\))/g, "$1 $2")
    .replace(/(\[([^\]]+)\]\([^)]+\))([A-Za-z0-9])/g, "$1 $2");
}

/** Truncate without splitting UTF-16 surrogate pairs (e.g. emoji). */
function truncateUtf16Safe(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }

  let end = maxLength;
  const code = text.charCodeAt(end - 1);
  // High surrogate left without its low pair → back up one code unit.
  if (code >= 0xd800 && code <= 0xdbff) {
    end -= 1;
  }

  return text.slice(0, end).trimEnd();
}

export function buildNewsExcerpt(content: string, maxLength = 180): string {
  const plain = normalizeMarkdownSpacing(content)
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/^#{1,3}\s+/gm, "")
    .replace(/^[-*•·]\s+/gm, "")
    .replace(/^\d+[.)]\s+/gm, "")
    .replace(/\*\*/g, "")
    .replace(/\*/g, "")
    .replace(/\s+/g, " ")
    .trim();

  if (plain.length <= maxLength) {
    return plain;
  }

  return `${truncateUtf16Safe(plain, maxLength)}…`;
}

export function resolveNewsGameName(
  article: Pick<GamingNewsLike, "gameName" | "gameTag">,
): string {
  if (article.gameName?.trim()) {
    return article.gameName.trim();
  }

  return article.gameTag
    .split("-")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

interface GamingNewsLike {
  gameName?: string | null;
  gameTag: string;
}

const WALL_OF_TEXT_SECTION_PATTERN =
  /\s+(?=(?:What's New\?|Bug Fixes(?:\s*&\s*Content Updates)?|Known Issues|Maintaining Fair Play|General Updates|Content Updates)\b)/gi;

const WALL_OF_TEXT_BULLET_PATTERN =
  /\s+-\s+(?=Fixed|UI|Resolved|Adjusted|Updated|Improved|Corrected|Added|Removed|Changed|Implemented)\b/g;

const HEADING_LINE_PATTERN = /^(#{1,3})\s+(.+)$/;
const BULLET_LINE_PATTERN = /^[-*•·]\s+(.+)$/;
const NUMBERED_LINE_PATTERN = /^\d+[.)]\s+(.+)$/;
const IMAGE_LINE_PATTERN = /^!\[([^\]]*)\]\(([^)]+)\)$/;
const TABLE_ROW_LINE_PATTERN = /^\|.+\|$/;
const TABLE_DIVIDER_LINE_PATTERN = /^\|(\s*:?-+:?\s*\|)+\s*$/;
const STANDALONE_IMAGE_LINK_LINE_PATTERN =
  /^\[(https?:\/\/[^\]]+\.(?:png|jpe?g|gif|webp|avif)(?:\?[^\]]*)?)\]\([^)]+\)$/i;

const DECORATIVE_IMAGE_HINTS = [
  "bar-red.png",
  "bar_blue.png",
  "spacer",
  "pixel.gif",
  "youtube_16x9_placeholder",
];

const YOUTUBE_VIDEO_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/;
const YOUTUBE_URL_LINE_PATTERN =
  /^(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:watch\?(?:[^#\s]*&)?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{11})(?:[^\s]*)?$/i;

export type IntelContentBlock =
  | { kind: "heading"; level: 1 | 2 | 3; text: string }
  | { kind: "paragraph"; text: string }
  | { kind: "ul"; items: string[] }
  | { kind: "ol"; items: string[] }
  | { kind: "image"; src: string; alt: string }
  | { kind: "youtube"; videoId: string }
  | { kind: "table"; headers: string[]; rows: string[][] };

export type IntelInlinePart =
  | { type: "text"; value: string }
  | { type: "link"; label: string; href: string }
  | { type: "image"; alt: string; src: string }
  | { type: "errorCode"; value: string }
  | { type: "region"; value: string }
  | { type: "emphasis"; value: string };

function decodeSteamLinkfilter(url: string): string {
  try {
    const parsed = new URL(url);
    if (!parsed.pathname.includes("linkfilter")) {
      return url;
    }

    const target = parsed.searchParams.get("u");
    return target ? decodeURIComponent(target) : url;
  } catch {
    return url;
  }
}

export function isImageUrl(url: string): boolean {
  const path = url.toLowerCase().split("?")[0]?.split("#")[0] ?? "";
  return /\.(png|jpe?g|gif|webp|avif)$/.test(path);
}

export function isDecorativeNewsImage(url: string): boolean {
  const lowered = url.toLowerCase();
  return DECORATIVE_IMAGE_HINTS.some((hint) => lowered.includes(hint));
}

export function extractYoutubeVideoId(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const lineMatch = trimmed.match(YOUTUBE_URL_LINE_PATTERN);
  if (lineMatch?.[1] && YOUTUBE_VIDEO_ID_PATTERN.test(lineMatch[1])) {
    return lineMatch[1];
  }

  try {
    const parsed = new URL(trimmed.startsWith("http") ? trimmed : `https://${trimmed}`);
    const host = parsed.hostname.replace(/^www\./, "").toLowerCase();
    if (host === "youtu.be") {
      const id = parsed.pathname.split("/").filter(Boolean)[0] ?? "";
      return YOUTUBE_VIDEO_ID_PATTERN.test(id) ? id : null;
    }

    if (host === "youtube.com" || host === "youtube-nocookie.com" || host === "m.youtube.com") {
      const fromQuery = parsed.searchParams.get("v");
      if (fromQuery && YOUTUBE_VIDEO_ID_PATTERN.test(fromQuery)) {
        return fromQuery;
      }

      const segments = parsed.pathname.split("/").filter(Boolean);
      if (
        segments[0] &&
        ["embed", "shorts", "live", "v"].includes(segments[0]) &&
        segments[1] &&
        YOUTUBE_VIDEO_ID_PATTERN.test(segments[1])
      ) {
        return segments[1];
      }
    }
  } catch {
    return null;
  }

  return null;
}

export function resolveNewsImageUrl(url: string): string {
  const cleaned = cleanNewsImageSrc(url);
  const decoded = decodeSteamLinkfilter(cleaned);
  if (!isImageUrl(decoded)) {
    return cleaned;
  }

  if (/steamstatic\.com/i.test(decoded) && /\/english\.png$/i.test(decoded)) {
    return decoded.replace(/\/english\.png$/i, ".png");
  }

  return decoded;
}

const IMAGE_EXTENSION_URL_PATTERN =
  /^(https?:\/\/\S+?\.(?:png|jpe?g|gif|webp|avif)(?:\?[^\s)#]*)?)/i;

/** Strip leaked HTML `style=` attrs that Facepunch embeds into image src/markdown. */
export function cleanNewsImageSrc(raw: string): string {
  let url = raw.trim().replace(/^["']+|["']+$/g, "");
  const styleIdx = url.search(/\s+style\s*=/i);
  if (styleIdx >= 0) {
    url = url.slice(0, styleIdx).trim();
  }

  const firstToken = url.split(/\s+/)[0] ?? url;
  const extensionMatch = firstToken.match(IMAGE_EXTENSION_URL_PATTERN);
  return extensionMatch?.[1] ?? firstToken;
}

const CORRUPTED_MARKDOWN_IMAGE_PATTERN =
  /!\[([^\]]*)\]\((https?:\/\/\S+?\.(?:png|jpe?g|gif|webp|avif)(?:\?[^\s)]*)?)(?:\s+style\s*=[^\n]*)/gi;

const CSS_RESIDUE_LINE_PATTERN =
  /^(?:[0-9.]+px\b|border-radius\s*:|max-width\s*:|display\s*:\s*block|box-shadow\s*:|transition\s*:|transform\s*:|object-fit\s*:|flex-grow\s*:)/i;

const PREVIEW_YOUTUBE_BB_PATTERN =
  /\[previewyoutube="?([^";\]]+?)(?:;[^\]"]*)?"?\](?:\s*\[\/previewyoutube\])?/gi;

function sanitizeNewsContent(content: string): string {
  const withYoutube = content
    .replace(/\\([\[\]])/g, "$1")
    .replace(/\\t/g, "\t")
    .replace(PREVIEW_YOUTUBE_BB_PATTERN, (_match, rawId: string) => {
      const videoId = String(rawId ?? "")
        .trim()
        .replace(/^["']+|["']+$/g, "");
      return YOUTUBE_VIDEO_ID_PATTERN.test(videoId)
        ? `\n\nhttps://www.youtube.com/watch?v=${videoId}\n\n`
        : "";
    })
    .replace(CORRUPTED_MARKDOWN_IMAGE_PATTERN, (_match, alt: string, rawUrl: string) => {
      const url = cleanNewsImageSrc(rawUrl);
      return `![${alt}](${url})`;
    });

  return withYoutube
    .split(/\r?\n/)
    .filter((line) => {
      const trimmed = line.trim();
      if (trimmed === "-" || trimmed === "*") {
        return false;
      }

      if (
        CSS_RESIDUE_LINE_PATTERN.test(trimmed) &&
        !/^https?:\/\//i.test(trimmed) &&
        !trimmed.startsWith("![")
      ) {
        return false;
      }

      const imageMatch = trimmed.match(IMAGE_LINE_PATTERN);
      if (imageMatch && isDecorativeNewsImage(imageMatch[2].trim())) {
        return false;
      }

      return true;
    })
    .join("\n");
}

function reflowWallOfText(content: string): string[] {
  let normalized = content.replace(/\s+/g, " ").trim();
  normalized = normalized.replace(WALL_OF_TEXT_SECTION_PATTERN, "\n\n## ");
  normalized = normalized.replace(WALL_OF_TEXT_BULLET_PATTERN, "\n- ");

  return normalized
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function normalizeContentLines(content: string): string[] {
  const rawLines = content
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter(Boolean);

  if (rawLines.length > 1) {
    return rawLines;
  }

  if (content.replace(/\s+/g, " ").trim().length > 220) {
    return reflowWallOfText(content);
  }

  return rawLines;
}

function parseTableRow(line: string): string[] {
  const trimmed = line.trim();
  const inner = trimmed.endsWith("|") ? trimmed.slice(1, -1) : trimmed.slice(1);
  return inner.split("|").map((cell) => cell.trim().replace(/\\\|/g, "|"));
}

function isTableDividerLine(line: string): boolean {
  return TABLE_DIVIDER_LINE_PATTERN.test(line.trim());
}

function tryParseTableBlock(
  lines: string[],
  startIndex: number,
): { block: Extract<IntelContentBlock, { kind: "table" }>; nextIndex: number } | null {
  const firstLine = lines[startIndex]?.trim();
  if (!firstLine || !TABLE_ROW_LINE_PATTERN.test(firstLine) || isTableDividerLine(firstLine)) {
    return null;
  }

  const headers = parseTableRow(firstLine);
  let index = startIndex + 1;

  if (index < lines.length && isTableDividerLine(lines[index])) {
    index += 1;
  }

  const rows: string[][] = [];
  while (index < lines.length) {
    const line = lines[index]?.trim();
    if (!line || !TABLE_ROW_LINE_PATTERN.test(line)) {
      break;
    }

    if (isTableDividerLine(line)) {
      index += 1;
      continue;
    }

    rows.push(parseTableRow(line));
    index += 1;
  }

  if (rows.length === 0) {
    return null;
  }

  return {
    block: { kind: "table", headers, rows },
    nextIndex: index,
  };
}

function parseLineKind(line: string): {
  kind: "heading" | "bullet" | "numbered" | "paragraph" | "image" | "youtube";
  level?: 1 | 2 | 3;
  text: string;
  imageSrc?: string;
  imageAlt?: string;
  videoId?: string;
} {
  const youtubeId = extractYoutubeVideoId(line);
  if (youtubeId) {
    return {
      kind: "youtube",
      text: "",
      videoId: youtubeId,
    };
  }

  const imageMatch = line.match(IMAGE_LINE_PATTERN);
  if (imageMatch) {
    const src = resolveNewsImageUrl(imageMatch[2].trim());
    if (isDecorativeNewsImage(src)) {
      return {
        kind: "paragraph",
        text: "",
      };
    }

    return {
      kind: "image",
      text: "",
      imageSrc: src,
      imageAlt: imageMatch[1].trim() || "Patch notes image",
    };
  }

  const standaloneImageLink = line.match(STANDALONE_IMAGE_LINK_LINE_PATTERN);
  if (standaloneImageLink) {
    const src = resolveNewsImageUrl(standaloneImageLink[1].trim());
    if (isDecorativeNewsImage(src)) {
      return {
        kind: "paragraph",
        text: "",
      };
    }

    return {
      kind: "image",
      text: "",
      imageSrc: src,
      imageAlt: "Patch notes image",
    };
  }

  const headingMatch = line.match(HEADING_LINE_PATTERN);
  if (headingMatch) {
    return {
      kind: "heading",
      level: Math.min(headingMatch[1].length, 3) as 1 | 2 | 3,
      text: headingMatch[2].trim(),
    };
  }

  if (line.startsWith("**") && line.endsWith("**")) {
    return { kind: "heading", level: 2, text: line.slice(2, -2).trim() };
  }

  const bulletMatch = line.match(BULLET_LINE_PATTERN);
  if (bulletMatch) {
    return { kind: "bullet", text: bulletMatch[1].trim() };
  }

  const numberedMatch = line.match(NUMBERED_LINE_PATTERN);
  if (numberedMatch) {
    return { kind: "numbered", text: numberedMatch[1].trim() };
  }

  return {
    kind: "paragraph",
    text: normalizeMarkdownSpacing(line).trim(),
  };
}

const combinedPattern = /!\[([^\]]*)\]\(([^)]+)\)|\[([^\]]+)\]\(([^)]+)\)/g;

export function parseIntelContentBlocks(content: string): IntelContentBlock[] {
  const lines = normalizeContentLines(sanitizeNewsContent(normalizeMarkdownSpacing(content)));
  const blocks: IntelContentBlock[] = [];
  let bulletBuffer: string[] = [];
  let numberedBuffer: string[] = [];

  const flushBullets = () => {
    const items = bulletBuffer.map((item) => item.trim()).filter(Boolean);
    if (items.length === 0) {
      bulletBuffer = [];
      return;
    }
    blocks.push({ kind: "ul", items });
    bulletBuffer = [];
  };

  const flushNumbered = () => {
    const items = numberedBuffer.map((item) => item.trim()).filter(Boolean);
    if (items.length === 0) {
      numberedBuffer = [];
      return;
    }
    blocks.push({ kind: "ol", items });
    numberedBuffer = [];
  };

  const flushLists = () => {
    flushBullets();
    flushNumbered();
  };

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
    const line = lines[lineIndex];
    const tableBlock = tryParseTableBlock(lines, lineIndex);
    if (tableBlock) {
      flushLists();
      blocks.push(tableBlock.block);
      lineIndex = tableBlock.nextIndex - 1;
      continue;
    }

    const parsed = parseLineKind(line);

    if (parsed.kind === "youtube" && parsed.videoId) {
      flushLists();
      blocks.push({
        kind: "youtube",
        videoId: parsed.videoId,
      });
      continue;
    }

    if (parsed.kind === "image" && parsed.imageSrc) {
      flushLists();
      blocks.push({
        kind: "image",
        src: parsed.imageSrc,
        alt: parsed.imageAlt ?? "Patch notes image",
      });
      continue;
    }

    if (parsed.kind === "heading") {
      flushLists();
      blocks.push({
        kind: "heading",
        level: parsed.level ?? 2,
        text: parsed.text,
      });
      continue;
    }

    if (parsed.kind === "bullet") {
      flushNumbered();
      bulletBuffer.push(parsed.text);
      continue;
    }

    if (parsed.kind === "numbered") {
      flushBullets();
      numberedBuffer.push(parsed.text);
      continue;
    }

    const paragraphText = parsed.text.trim();
    if (!paragraphText) {
      continue;
    }

    flushLists();
    blocks.push({ kind: "paragraph", text: paragraphText });
  }

  flushLists();
  return blocks;
}

const BOLD_INLINE_PATTERN = /\*\*([^*]+)\*\*/g;

function mapIntelTextSegment(
  segment: IntelTextSegment,
): IntelInlinePart {
  return segment.type === "text"
    ? { type: "text", value: segment.value }
    : { type: segment.type, value: segment.value };
}

function splitTextInlineParts(text: string): IntelInlinePart[] {
  const normalized = normalizeBoldSpacing(text);
  const parts: IntelInlinePart[] = [];
  let lastIndex = 0;

  for (const match of normalized.matchAll(BOLD_INLINE_PATTERN)) {
    const index = match.index ?? 0;
    if (index > lastIndex) {
      parts.push(
        ...splitIntelInlineSegments(normalized.slice(lastIndex, index)).map(
          mapIntelTextSegment,
        ),
      );
    }

    parts.push({ type: "emphasis", value: match[1].trim() });
    lastIndex = index + match[0].length;
  }

  if (lastIndex < normalized.length) {
    parts.push(
      ...splitIntelInlineSegments(normalized.slice(lastIndex)).map(
        mapIntelTextSegment,
      ),
    );
  }

  if (parts.length === 0) {
    return splitIntelInlineSegments(normalized).map(mapIntelTextSegment);
  }

  return parts;
}

export function parseIntelInlineParts(text: string): IntelInlinePart[] {
  const parts: IntelInlinePart[] = [];
  let lastIndex = 0;
  const normalizedText = normalizeMarkdownSpacing(text);

  for (const match of normalizedText.matchAll(combinedPattern)) {
    const index = match.index ?? 0;
    if (index > lastIndex) {
      parts.push(...splitTextInlineParts(normalizedText.slice(lastIndex, index)));
    }

    if (match[1] !== undefined && match[2] !== undefined && match[0].startsWith("![")) {
      const src = resolveNewsImageUrl(match[2].trim());
      if (!isDecorativeNewsImage(src)) {
        parts.push({
          type: "image",
          alt: match[1].trim() || "Patch notes image",
          src,
        });
      }
    } else if (match[3] !== undefined && match[4] !== undefined) {
      const label = match[3].trim();
      const href = match[4].trim();
      const imageSrc = isImageUrl(label)
        ? resolveNewsImageUrl(label)
        : resolveNewsImageUrl(href);

      if (isImageUrl(imageSrc) && !isDecorativeNewsImage(imageSrc)) {
        parts.push({
          type: "image",
          alt: "Patch notes image",
          src: imageSrc,
        });
      } else if (!isDecorativeNewsImage(label) && !isDecorativeNewsImage(href)) {
        parts.push({
          type: "link",
          label,
          href,
        });
      }
    }

    lastIndex = index + match[0].length;
  }

  if (lastIndex < normalizedText.length) {
    parts.push(...splitTextInlineParts(normalizedText.slice(lastIndex)));
  }

  if (parts.length === 0) {
    return splitTextInlineParts(normalizedText);
  }

  return parts;
}

/** @deprecated Use parseIntelContentBlocks for structured rendering. */
export function stripMarkdownEmphasis(line: string): {
  kind: "bullet" | "heading" | "paragraph";
  level: 1 | 2 | 3;
  text: string;
} {
  const parsed = parseLineKind(line);
  if (parsed.kind === "heading") {
    return {
      kind: "heading",
      level: parsed.level ?? 2,
      text: parsed.text,
    };
  }

  if (parsed.kind === "bullet" || parsed.kind === "numbered") {
    return { kind: "bullet", level: 3, text: parsed.text };
  }

  return {
    kind: "paragraph",
    level: 3,
    text: parsed.text,
  };
}

export function getConnectivityBadge(
  status: TelemetryStatus,
  source: TelemetrySource,
): { label: string; className: string } {
  if (status === "DOWN") {
    return {
      label: "Service Disrupted",
      className:
        "border-rose-400/30 bg-rose-500/10 text-rose-200",
    };
  }

  if (status === "MAINTENANCE") {
    return {
      label: "Maintenance Window",
      className:
        "border-amber-400/30 bg-amber-500/10 text-amber-200",
    };
  }

  if (source === "STEAM_API") {
    return {
      label: "Stable Connection",
      className:
        "border-emerald-400/30 bg-emerald-500/10 text-emerald-200",
    };
  }

  if (source === "STATUS_PAGE") {
    return {
      label: "Status Page Sync",
      className:
        "border-cyan-400/30 bg-cyan-500/10 text-cyan-200",
    };
  }

  return {
    label: "Network Probe",
    className:
      "border-violet-400/30 bg-violet-500/10 text-violet-200",
  };
}
