"""Plain-text and markdown extraction helpers for HTML-heavy platform feeds."""

from __future__ import annotations

import re
from html import unescape
from html.parser import HTMLParser

_SOURCE_TAG_PATTERN = re.compile(
    r"^\[(?:STEAM NEWS|RIOT [A-Z]+|EPIC INCIDENT|INCIDENT BRIEF|RELEASE INTEL|SIMULATION)\]\s*",
    re.IGNORECASE,
)

_WHITESPACE_PATTERN = re.compile(r"[ \t]+")
_BLANK_LINES_PATTERN = re.compile(r"\n{3,}")

_PLACEHOLDER_PHRASES = (
    "read the full announcement",
    "read the full announcement here",
    "click here to read",
    "read more on steam",
    "read more here",
    "view the full patch notes",
)

_MARKDOWN_IMAGE_PATTERN = re.compile(r"!\[[^\]]*\]\([^)]+\)")
_MARKDOWN_LINK_PATTERN = re.compile(r"\[([^\]]+)\]\([^)]+\)")
_MARKDOWN_HEADING_PATTERN = re.compile(r"^#{1,6}\s+", re.MULTILINE)
_MARKDOWN_EMPHASIS_PATTERN = re.compile(r"\*\*([^*]+)\*\*|\*([^*]+)\*")

_BB_CODE_PATTERNS: tuple[tuple[re.Pattern[str], str], ...] = (
    (re.compile(r"\[h([1-6])\](.*?)\[/h\1\]", re.IGNORECASE | re.DOTALL), r"<h\1>\2</h\1>"),
    (re.compile(r"\[b\](.*?)\[/b\]", re.IGNORECASE | re.DOTALL), r"<strong>\1</strong>"),
    (re.compile(r"\[i\](.*?)\[/i\]", re.IGNORECASE | re.DOTALL), r"<em>\1</em>"),
    (re.compile(r"\[u\](.*?)\[/u\]", re.IGNORECASE | re.DOTALL), r"<u>\1</u>"),
    (re.compile(r"\[list\](.*?)\[/list\]", re.IGNORECASE | re.DOTALL), r"<ul>\1</ul>"),
    (re.compile(r"\[\*\]\s*", re.IGNORECASE), "<li>"),
    (re.compile(r"\[url=([^\]]+)\](.*?)\[/url\]", re.IGNORECASE | re.DOTALL), r'<a href="\1">\2</a>'),
    (re.compile(r"\[url\](.*?)\[/url\]", re.IGNORECASE | re.DOTALL), r"\1"),
)

_BB_HEADING_PATTERN = re.compile(
    r'<div class="bb_h([1234])"[^>]*>(.*?)</div>',
    re.DOTALL | re.IGNORECASE,
)
_IMAGE_LINK_LINE_PATTERN = re.compile(r"^\[([^\]]+)\]\(([^)]+)\)\s*$")
_IMAGE_MARKDOWN_LINE_PATTERN = re.compile(r"^!\[([^\]]*)\]\(([^)]+)\)\s*$")
_EMPTY_BULLET_LINE_PATTERN = re.compile(r"^-\s*$")
_DECORATIVE_IMAGE_HINTS = ("bar-red.png", "bar_blue.png", "1x1", "spacer", "pixel.gif")


class _PlainTextExtractor(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self._parts: list[str] = []

    def handle_data(self, data: str) -> None:
        if data.strip():
            self._parts.append(data.strip())

    def get_text(self) -> str:
        return " ".join(self._parts)


class _MarkdownExtractor(HTMLParser):
    _BLOCK_TAGS = {"p", "div", "section", "article", "header", "footer", "main"}
    _HEADING_TAGS = {"h1", "h2", "h3", "h4", "h5", "h6"}
    _LIST_TAGS = {"ul", "ol"}
    _STEAM_DIV_ROLES = {
        "bb_table": "table",
        "bb_table_tr": "tr",
        "bb_table_th": "th",
        "bb_table_td": "td",
    }

    def __init__(self) -> None:
        super().__init__()
        self._chunks: list[str] = []
        self._heading_level: int | None = None
        self._bold_depth = 0
        self._pending_block_break = False
        self._ordered_list_depth = 0
        self._ordered_counters: list[int] = []
        self._link_href: str | None = None
        self._list_item_depth = 0
        self._semantic_stack: list[str] = []
        self._table_rows: list[list[str]] = []
        self._current_row: list[str] = []
        self._in_table_cell = False
        self._cell_parts: list[str] = []

    def _append(self, text: str) -> None:
        if not text:
            return

        if self._in_table_cell:
            self._cell_parts.append(text)
            return

        self._chunks.append(text)

    def _inside_table(self) -> bool:
        return any(role == "table" for role in self._semantic_stack)

    @staticmethod
    def _steam_div_role(attrs: list[tuple[str, str | None]]) -> str | None:
        for key, value in attrs:
            if key != "class" or not value:
                continue

            for token in value.split():
                role = _MarkdownExtractor._STEAM_DIV_ROLES.get(token)
                if role is not None:
                    return role

        return None

    def _start_table(self) -> None:
        self._flush_block_break()
        self._semantic_stack.append("table")
        self._table_rows = []
        self._current_row = []

    def _start_table_row(self) -> None:
        self._current_row = []
        self._semantic_stack.append("tr")

    def _start_table_cell(self, role: str) -> None:
        self._in_table_cell = True
        self._cell_parts = []
        self._semantic_stack.append(role)

    def _finalize_table_cell(self) -> None:
        raw = "".join(self._cell_parts)
        raw = _WHITESPACE_PATTERN.sub(" ", raw)
        raw = re.sub(r"\s*\n+\s*", " / ", raw).strip()
        raw = re.sub(r"\*\*([^*]+)\*\*", lambda match: match.group(1).strip(), raw)
        self._current_row.append(raw)
        self._cell_parts = []
        self._in_table_cell = False

    def _finalize_table_row(self) -> None:
        if self._current_row and any(cell.strip() for cell in self._current_row):
            self._table_rows.append(self._current_row[:])
        self._current_row = []

    def _emit_table_markdown(self) -> None:
        if self._current_row and any(cell.strip() for cell in self._current_row):
            self._table_rows.append(self._current_row[:])
        self._current_row = []

        rows = [row for row in self._table_rows if any(cell.strip() for cell in row)]
        self._table_rows = []
        if not rows:
            return

        column_count = max(len(row) for row in rows)
        lines: list[str] = []

        for index, row in enumerate(rows):
            padded = row + [""] * (column_count - len(row))
            escaped = [cell.replace("|", "\\|").strip() for cell in padded[:column_count]]
            lines.append("| " + " | ".join(escaped) + " |")
            if index == 0:
                lines.append("| " + " | ".join("---" for _ in range(column_count)) + " |")

        self._chunks.append("\n\n" + "\n".join(lines) + "\n\n")

    def _close_semantic(self, role: str) -> None:
        if role in {"th", "td"}:
            self._finalize_table_cell()
            return

        if role == "tr":
            self._finalize_table_row()
            return

        if role == "table":
            self._emit_table_markdown()

    def _flush_block_break(self) -> None:
        if not self._chunks:
            return

        tail = self._chunks[-1]
        if not tail.endswith("\n\n"):
            if tail.endswith("\n"):
                self._append("\n")
            else:
                self._append("\n\n")

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        normalized = tag.lower()
        if normalized in self._HEADING_TAGS:
            if self._in_table_cell:
                return
            self._flush_block_break()
            self._heading_level = int(normalized[1])
            return

        if normalized == "table":
            self._start_table()
            return

        if normalized == "tr":
            self._start_table_row()
            return

        if normalized in {"th", "td"}:
            self._start_table_cell(normalized)
            return

        if normalized == "div":
            steam_role = self._steam_div_role(attrs)
            if steam_role == "table":
                self._start_table()
                return
            if steam_role == "tr":
                self._start_table_row()
                return
            if steam_role in {"th", "td"}:
                self._start_table_cell(steam_role)
                return

        if normalized in self._BLOCK_TAGS:
            if self._in_table_cell or self._inside_table():
                return
            if self._list_item_depth == 0:
                self._flush_block_break()
            return

        if normalized == "img":
            if self._in_table_cell:
                return
            src = next((value for key, value in attrs if key == "src" and value), None)
            if src and not _is_decorative_image_url(src):
                self._flush_block_break()
                alt = next((value for key, value in attrs if key == "alt" and value), "") or "Patch notes image"
                self._append(f"![{alt}]({src.strip()})")
                self._append("\n\n")
            return

        if normalized == "ol":
            if self._in_table_cell:
                return
            self._flush_block_break()
            self._ordered_list_depth += 1
            self._ordered_counters.append(0)
            return

        if normalized == "ul":
            if self._in_table_cell:
                return
            self._flush_block_break()
            return

        if normalized == "br":
            self._append("\n")
            return

        if normalized == "hr":
            if self._in_table_cell:
                return
            self._append("\n\n---\n\n")
            return

        if normalized == "li":
            if self._in_table_cell:
                return
            if self._list_item_depth > 0:
                self._append("\n")
            else:
                self._flush_block_break()
            self._list_item_depth += 1
            if self._ordered_list_depth > 0:
                counter = self._ordered_counters[-1] + 1
                self._ordered_counters[-1] = counter
                self._append(f"{counter}. ")
            else:
                self._append("- ")
            return

        if normalized == "a":
            href = next((value for key, value in attrs if key == "href" and value), None)
            if href:
                self._link_href = href.strip()
                self._append("[")
            return

        if normalized in {"strong", "b"}:
            self._append("**")
            self._bold_depth += 1
            return

        if normalized in {"em", "i"}:
            self._append("*")
            return

    def handle_endtag(self, tag: str) -> None:
        normalized = tag.lower()
        if normalized in self._HEADING_TAGS:
            if self._in_table_cell:
                return
            self._append("\n\n")
            self._heading_level = None
            return

        if normalized == "table" and self._semantic_stack and self._semantic_stack[-1] == "table":
            self._semantic_stack.pop()
            self._close_semantic("table")
            return

        if normalized == "tr" and self._semantic_stack and self._semantic_stack[-1] == "tr":
            self._semantic_stack.pop()
            self._close_semantic("tr")
            return

        if normalized in {"th", "td"} and self._semantic_stack and self._semantic_stack[-1] in {"th", "td"}:
            role = self._semantic_stack.pop()
            self._close_semantic(role)
            return

        if normalized == "div" and self._semantic_stack and self._semantic_stack[-1] in {
            "table",
            "tr",
            "th",
            "td",
        }:
            role = self._semantic_stack.pop()
            self._close_semantic(role)
            return

        if normalized == "ol":
            if self._in_table_cell:
                return
            if self._ordered_list_depth > 0:
                self._ordered_list_depth -= 1
                self._ordered_counters.pop()
            self._append("\n\n")
            return

        if normalized == "li":
            if self._in_table_cell:
                return
            self._list_item_depth = max(0, self._list_item_depth - 1)
            self._append("\n")
            return

        if normalized == "ul":
            if self._in_table_cell:
                return
            self._append("\n\n")
            return

        if normalized in self._BLOCK_TAGS:
            if self._in_table_cell or self._inside_table():
                return
            if self._list_item_depth == 0:
                self._append("\n\n")
            return

        if normalized == "a":
            if self._link_href:
                self._append(f"]({self._link_href})")
                self._link_href = None
            return

        if normalized in {"strong", "b"}:
            if self._bold_depth > 0:
                self._append("**")
                self._bold_depth -= 1
            return

        if normalized in {"em", "i"}:
            self._append("*")
            return

    def handle_startendtag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        if tag.lower() == "img":
            self.handle_starttag(tag, attrs)

    def handle_data(self, data: str) -> None:
        text = unescape(data).replace("\xa0", " ")
        if not text:
            return

        if not text.strip():
            if self._chunks and not self._chunks[-1].endswith(("\n\n", "\n", " ", "[")):
                self._append(" ")
            return

        if self._heading_level is not None:
            level = min(self._heading_level, 3)
            self._append(f"{'#' * level} {text.strip()}")
            self._heading_level = None
            return

        if self._in_table_cell:
            if not text.strip():
                self._append(" ")
                return
            self._append(text.strip())
            return

        self._append(text)

    def get_markdown(self) -> str:
        raw = "".join(self._chunks)
        raw = _WHITESPACE_PATTERN.sub(" ", raw)
        raw = re.sub(r" *\n *", "\n", raw)
        raw = _BLANK_LINES_PATTERN.sub("\n\n", raw)
        return raw.strip()


_MIDDLE_DOT_CHAR_CLASS = r"[\u00b7\u2022]"
_MIDDLE_DOT_BULLET_PATTERN = re.compile(rf"\s*{_MIDDLE_DOT_CHAR_CLASS}\s*")
_LINE_BULLET_PREFIX_PATTERN = re.compile(rf"^{_MIDDLE_DOT_CHAR_CLASS}\s*(.+)$")
_INLINE_DASH_BULLET_PATTERN = re.compile(
    r"(?<=\.)\s+-\s+(?=[A-Z])"
)


def _normalize_markdown_bullets(markdown: str) -> str:
    lines: list[str] = []

    for raw_line in markdown.splitlines():
        line = raw_line.strip()
        if not line:
            lines.append("")
            continue

        if line.startswith(("#", "-", "*", "1.")) or re.match(r"^\d+[.)]\s+", line):
            lines.append(line)
            continue

        if line.startswith("|"):
            lines.append(line)
            continue

        line_bullet = _LINE_BULLET_PREFIX_PATTERN.match(line)
        if line_bullet:
            lines.append(f"- {line_bullet.group(1).strip()}")
            continue

        if re.search(_MIDDLE_DOT_CHAR_CLASS, line):
            parts = [part.strip() for part in _MIDDLE_DOT_BULLET_PATTERN.split(line) if part.strip()]
            if len(parts) > 1:
                lines.extend(f"- {part}" for part in parts)
                continue

        if " - " in line and not line.startswith("-"):
            parts = _INLINE_DASH_BULLET_PATTERN.split(line)
            if len(parts) > 1:
                lines.append(parts[0].strip())
                lines.extend(f"- {part.strip()}" for part in parts[1:] if part.strip())
                continue

        lines.append(line)

    return "\n".join(lines).strip()


def _strip_inner_html_tags(fragment: str) -> str:
    return re.sub(r"<[^>]+>", "", unescape(fragment)).strip()


def _replace_bb_headings(markup: str) -> str:
    def repl(match: re.Match[str]) -> str:
        level = match.group(1)
        text = _strip_inner_html_tags(match.group(2))
        return f"<h{level}>{text}</h{level}>" if text else ""

    return _BB_HEADING_PATTERN.sub(repl, markup)


def _decode_steam_linkfilter(url: str) -> str:
    from urllib.parse import parse_qs, unquote, urlparse

    parsed = urlparse(url.strip())
    if "linkfilter" not in parsed.path:
        return url.strip()

    params = parse_qs(parsed.query)
    candidates = params.get("u", [])
    if candidates:
        return unquote(candidates[0])
    return url.strip()


def _looks_like_image_url(url: str) -> bool:
    lowered = url.lower().split("?", 1)[0].split("#", 1)[0]
    return lowered.endswith((".png", ".jpg", ".jpeg", ".gif", ".webp", ".avif"))


def _is_decorative_image_url(url: str) -> bool:
    lowered = url.lower()
    return any(hint in lowered for hint in _DECORATIVE_IMAGE_HINTS)


def _strip_empty_bullets(markdown: str) -> str:
    lines: list[str] = []
    for raw_line in markdown.splitlines():
        if _EMPTY_BULLET_LINE_PATTERN.match(raw_line.strip()):
            continue
        lines.append(raw_line)
    return "\n".join(lines)


def _promote_image_links(markdown: str) -> str:
    lines: list[str] = []

    for raw_line in markdown.splitlines():
        stripped = raw_line.strip()
        if not stripped:
            lines.append(raw_line)
            continue

        match = _IMAGE_LINK_LINE_PATTERN.match(stripped)
        if match is None:
            lines.append(raw_line)
            continue

        label, href = match.group(1).strip(), match.group(2).strip()
        image_url = label if _looks_like_image_url(label) else None
        if image_url is None:
            decoded_href = _decode_steam_linkfilter(href)
            if _looks_like_image_url(decoded_href):
                image_url = decoded_href

        if image_url and not _is_decorative_image_url(image_url):
            lines.append(f"![Patch notes]({image_url})")
            continue

        if _is_decorative_image_url(label) or _is_decorative_image_url(_decode_steam_linkfilter(href)):
            continue

        lines.append(raw_line)

    return "\n".join(lines)


def _drop_decorative_image_lines(markdown: str) -> str:
    lines: list[str] = []

    for raw_line in markdown.splitlines():
        stripped = raw_line.strip()
        image_match = _IMAGE_MARKDOWN_LINE_PATTERN.match(stripped)
        if image_match and _is_decorative_image_url(image_match.group(2).strip()):
            continue
        lines.append(raw_line)

    return "\n".join(lines)


def _normalize_link_spacing(markdown: str) -> str:
    spaced = re.sub(r"([A-Za-z0-9])(\[)", r"\1 \2", markdown)
    return re.sub(r"(\))([A-Za-z0-9])", r"\1 \2", spaced)


def _normalize_bold_spacing(markdown: str) -> str:
    def wrap(match: re.Match[str]) -> str:
        return f"**{match.group(1).strip()}**"

    normalized = re.sub(r"\*\*([^*]+)\*\*", wrap, markdown)
    normalized = re.sub(r"(\S)(\*\*[^*]+\*\*)", r"\1 \2", normalized)
    return re.sub(r"(\*\*[^*]+\*\*)([A-Za-z0-9])", r"\1 \2", normalized)


def _finalize_markdown(markdown: str) -> str:
    normalized = _normalize_markdown_bullets(markdown)
    normalized = _strip_empty_bullets(normalized)
    normalized = _promote_image_links(normalized)
    normalized = _drop_decorative_image_lines(normalized)
    normalized = _normalize_link_spacing(normalized)
    normalized = _normalize_bold_spacing(normalized)
    return normalized.strip()


def _normalize_feed_markup(value: str) -> str:
    normalized = value.strip()
    if not normalized:
        return ""

    for pattern, replacement in _BB_CODE_PATTERNS:
        normalized = pattern.sub(replacement, normalized)

    normalized = _replace_bb_headings(normalized)
    return normalized


def plain_text_from_html(value: str) -> str:
    """Strip HTML tags and collapse whitespace into readable plain text."""
    normalized = _normalize_feed_markup(value)
    if not normalized:
        return ""

    parser = _PlainTextExtractor()
    parser.feed(normalized)
    parser.close()

    return _WHITESPACE_PATTERN.sub(" ", parser.get_text()).strip()


def markdown_from_html(value: str) -> str:
    """Convert HTML or Steam BBCode into lightweight markdown for the news UI."""
    normalized = _normalize_feed_markup(value)
    if not normalized:
        return ""

    parser = _MarkdownExtractor()
    parser.feed(normalized)
    parser.close()

    markdown = parser.get_markdown()
    if markdown:
        return _finalize_markdown(markdown)

    return _finalize_markdown(plain_text_from_html(normalized))


def normalize_plain_text(value: str) -> str:
    """Normalize already-plain feed text."""
    if not value.strip():
        return ""

    return _WHITESPACE_PATTERN.sub(" ", unescape(value)).strip()


def _strip_leading_game_name(title: str, game_name: str) -> str:
    """Strip a leading game name even when punctuation or casing differs."""
    if not game_name.strip():
        return title

    game_alnum = [char for char in game_name.lower() if char.isalnum()]
    if not game_alnum:
        return title

    title_idx = 0
    game_idx = 0

    while title_idx < len(title) and game_idx < len(game_alnum):
        char = title[title_idx]
        if not char.isalnum():
            title_idx += 1
            continue

        if char.lower() != game_alnum[game_idx]:
            return title

        game_idx += 1
        title_idx += 1

    if game_idx < len(game_alnum):
        return title

    while title_idx < len(title) and title[title_idx] in " :—-":
        title_idx += 1

    stripped = title[title_idx:].strip()
    return stripped or title


def clean_news_title(raw_title: str, game_name: str | None = None) -> str:
    """Remove source tags and duplicate game-name prefixes from feed titles."""
    title = _SOURCE_TAG_PATTERN.sub("", raw_title).strip()
    if not title:
        return raw_title.strip()

    if not game_name:
        return title

    lowered_title = title.lower()
    candidates = {game_name.strip()}
    candidates.add(game_name.strip().upper())
    candidates.add(game_name.strip().title())

    for candidate in sorted(candidates, key=len, reverse=True):
        for separator in (": ", " - ", " — ", ": "):
            prefix = f"{candidate}{separator}"
            if lowered_title.startswith(prefix.lower()):
                title = title[len(prefix) :].strip()
                lowered_title = title.lower()
                break

    title = _strip_leading_game_name(title, game_name)

    return title or raw_title.strip()


def substantive_news_text(text: str) -> str:
    """Readable article text with markdown images/links stripped for validation."""
    if not text.strip():
        return ""

    stripped = text.strip()
    stripped = _MARKDOWN_IMAGE_PATTERN.sub(" ", stripped)
    stripped = _MARKDOWN_LINK_PATTERN.sub(r"\1", stripped)
    stripped = _MARKDOWN_HEADING_PATTERN.sub("", stripped)
    stripped = _MARKDOWN_EMPHASIS_PATTERN.sub(
        lambda match: (match.group(1) or match.group(2) or "").strip(),
        stripped,
    )

    return _WHITESPACE_PATTERN.sub(" ", unescape(stripped)).strip()


def is_placeholder_news_content(text: str, *, min_chars: int) -> bool:
    """Detect teaser-only posts that redirect users to an external announcement."""
    substantive = substantive_news_text(text)
    if not substantive:
        return True

    lowered = substantive.lower().rstrip("!.")
    if any(phrase in lowered for phrase in _PLACEHOLDER_PHRASES):
        remainder = lowered
        for phrase in _PLACEHOLDER_PHRASES:
            remainder = remainder.replace(phrase, " ")
        remainder = _WHITESPACE_PATTERN.sub(" ", remainder).strip()
        if len(remainder) < max(40, min_chars // 3):
            return True

    if len(substantive) < min_chars and len(substantive) < max(40, min_chars // 2):
        return True

    return False


def is_usable_news_content(text: str, *, min_chars: int) -> bool:
    substantive = substantive_news_text(text)
    if not substantive:
        return False

    if is_placeholder_news_content(text, min_chars=min_chars):
        return False

    return len(substantive) >= min_chars


_ALLOW_NEWS_PATTERNS: tuple[re.Pattern[str], ...] = (
    re.compile(r"\bpatch\s*notes?\b", re.IGNORECASE),
    re.compile(r"\bupdates?\b", re.IGNORECASE),
    re.compile(r"\bhotfix\b", re.IGNORECASE),
    re.compile(r"\bmaintenance\b", re.IGNORECASE),
    re.compile(r"\bdowntime\b", re.IGNORECASE),
    re.compile(r"\boutage\b", re.IGNORECASE),
    re.compile(r"\bbalance\b", re.IGNORECASE),
    re.compile(r"\bbug\s*fixes?\b", re.IGNORECASE),
    re.compile(r"\brelease\s+notes?\b", re.IGNORECASE),
    re.compile(r"\binvestigating\b", re.IGNORECASE),
    re.compile(r"\bdegraded\b", re.IGNORECASE),
    re.compile(r"\bresolved\b", re.IGNORECASE),
    re.compile(r"\bpatch\b", re.IGNORECASE),
    re.compile(r"\bfix[\s._-]?\d", re.IGNORECASE),
    re.compile(r"\bfix(?:es|ed|ing)?\b", re.IGNORECASE),
)

_REJECT_NEWS_PHRASES: tuple[str, ...] = (
    "survey",
    "questionnaire",
    "discussions survey",
    "weekly bans notice",
    "weekly ban notice",
    "ban notice",
    "ban wave",
    "player bans",
    "banned players",
    "ban list",
    "tell us what you think",
    "share your feedback",
    "we want your feedback",
    "your feedback on",
    "community survey",
    "steam discussions",
)


def is_relevant_gaming_news(title: str, content: str) -> bool:
    """
    Drop low-signal Steam/community posts at ingestion time.

    Patch/update content is always kept, even when it mentions cheats or
    countermeasures. Surveys, ban roundups, and discussion prompts are rejected.
    """
    title_lower = title.lower()
    if any(phrase in title_lower for phrase in _REJECT_NEWS_PHRASES):
        return False

    if is_placeholder_news_content(content, min_chars=80):
        return False

    haystack = f"{title}\n{content}".lower()

    for pattern in _ALLOW_NEWS_PATTERNS:
        if pattern.search(haystack):
            return True

    return not any(phrase in haystack for phrase in _REJECT_NEWS_PHRASES)
