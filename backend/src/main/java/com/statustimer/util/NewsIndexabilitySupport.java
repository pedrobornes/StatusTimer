package com.statustimer.util;

import java.util.List;
import java.util.regex.Pattern;

/**
 * Mirrors frontend {@code newsIndexability.ts} so sitemap entries stay consistent
 * with article {@code robots} directives.
 */
public final class NewsIndexabilitySupport {

    private static final int MIN_INDEXABLE_NEWS_CHARS = 120;
    private static final List<String> PLACEHOLDER_PHRASES = List.of(
            "read the full announcement",
            "read the full announcement here",
            "click here to read",
            "read more on steam",
            "read more here",
            "view the full patch notes"
    );

    private static final Pattern MARKDOWN_IMAGE = Pattern.compile("!\\[[^\\]]*\\]\\([^)]+\\)");
    private static final Pattern MARKDOWN_LINK = Pattern.compile("\\[([^\\]]+)\\]\\([^)]+\\)");
    private static final Pattern MARKDOWN_HEADING = Pattern.compile("(?m)^#{1,6}\\s+");
    private static final Pattern EMPHASIS = Pattern.compile("\\*+");
    private static final Pattern WHITESPACE = Pattern.compile("\\s+");

    private NewsIndexabilitySupport() {
    }

    public static String substantiveNewsText(String content) {
        if (content == null || content.isBlank()) {
            return "";
        }

        String text = MARKDOWN_IMAGE.matcher(content).replaceAll(" ");
        text = MARKDOWN_LINK.matcher(text).replaceAll("$1");
        text = MARKDOWN_HEADING.matcher(text).replaceAll("");
        text = EMPHASIS.matcher(text).replaceAll("");
        return WHITESPACE.matcher(text).replaceAll(" ").trim();
    }

    public static boolean isIndexableNewsContent(String content) {
        String substantive = substantiveNewsText(content);
        if (substantive.isEmpty()) {
            return false;
        }

        String lowered = substantive.toLowerCase().replaceAll("[!?.]+$", "");
        boolean hasPlaceholder = false;
        for (String phrase : PLACEHOLDER_PHRASES) {
            if (lowered.contains(phrase)) {
                hasPlaceholder = true;
                break;
            }
        }

        if (hasPlaceholder) {
            String remainder = lowered;
            for (String phrase : PLACEHOLDER_PHRASES) {
                remainder = remainder.replace(phrase, " ");
            }
            remainder = WHITESPACE.matcher(remainder).replaceAll(" ").trim();
            if (remainder.length() < 40) {
                return false;
            }
        }

        if (substantive.length() < MIN_INDEXABLE_NEWS_CHARS) {
            return substantive.length() >= 60 && !hasPlaceholder;
        }

        return true;
    }
}
