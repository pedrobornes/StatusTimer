"""Tests for HTML and markdown extraction."""

import unittest

from scrapers.text_utils import (
    clean_news_title,
    is_usable_news_content,
    markdown_from_html,
    plain_text_from_html,
)


class TextUtilsTests(unittest.TestCase):
    def test_plain_text_from_html_strips_tags(self) -> None:
        raw_html = "<p>Server <strong>maintenance</strong> completed.</p>"
        self.assertEqual(
            plain_text_from_html(raw_html),
            "Server maintenance completed.",
        )

    def test_markdown_from_html_preserves_headings_and_bullets(self) -> None:
        raw_html = """
        <p>Intro paragraph.</p>
        <h2>What's New?</h2>
        <ul><li>Fixed reconnect issue.</li></ul>
        """
        markdown = markdown_from_html(raw_html)
        self.assertIn("Intro paragraph.", markdown)
        self.assertIn("## What's New?", markdown)
        self.assertIn("- Fixed reconnect issue.", markdown)

    def test_markdown_from_html_splits_middle_dot_bullets(self) -> None:
        bullet = "\u00b7"
        raw_html = f"""
        <p>{bullet} Implemented countermeasures against a cheat
        {bullet} Implemented countermeasures against rapid-fire cheats
        {bullet} Fixed an issue where players could go out of bounds</p>
        """
        markdown = markdown_from_html(raw_html)
        self.assertIn("- Implemented countermeasures against a cheat", markdown)
        self.assertIn("- Fixed an issue where players could go out of bounds", markdown)

    def test_markdown_from_html_preserves_ordered_lists_and_links(self) -> None:
        raw_html = """
        <h1>Patch Notes</h1>
        <ol><li>First change.</li><li>Second change.</li></ol>
        <p>Read the <a href="https://example.com/patch">full notes</a>.</p>
        """
        markdown = markdown_from_html(raw_html)
        self.assertIn("# Patch Notes", markdown)
        self.assertIn("1. First change.", markdown)
        self.assertIn("2. Second change.", markdown)
        self.assertIn("[full notes](https://example.com/patch)", markdown)

    def test_markdown_from_html_handles_steam_patch_layout(self) -> None:
        raw_html = """
        <p class="bb_paragraph"><img src="https://cdn.example.com/header.png" /></p>
        <div class="bb_h2"><b>Important</b></div>
        <ul class="bb_ul"><li><p class="bb_paragraph">Doctor re-enabled.</p></li></ul>
        <p class="bb_paragraph"><a href="https://steamcommunity.com/linkfilter/?u=https%3A%2F%2Fcdn.example.com%2Fbar-red.png">https://cdn.example.com/bar-red.png</a></p>
        <div class="bb_h2"><b>Bug Fixes</b></div>
        <ul class="bb_ul"><li><p class="bb_paragraph">Fixed reconnect issue.</p></li></ul>
        """
        markdown = markdown_from_html(raw_html)
        self.assertIn("![Patch notes image](https://cdn.example.com/header.png)", markdown)
        self.assertIn("## Important", markdown)
        self.assertIn("- Doctor re-enabled.", markdown)
        self.assertIn("## Bug Fixes", markdown)
        self.assertIn("- Fixed reconnect issue.", markdown)
        self.assertNotIn("bar-red.png", markdown)
        self.assertNotIn("\n-\n", markdown)

    def test_markdown_from_html_spaces_inline_bold_markers(self) -> None:
        raw_html = (
            "<p>Great news!<strong>BOMBANANA Demo</strong>now officially supports"
            "<strong>macOS</strong>!</p>"
        )
        markdown = markdown_from_html(raw_html)
        self.assertIn("Great news! **BOMBANANA Demo** now officially supports **macOS**!", markdown)

    def test_clean_news_title_removes_source_tag_and_duplicate_game_name(self) -> None:
        title = clean_news_title(
            "[STEAM NEWS] PUBG: Battlegrounds: PUBG: BATTLEGROUNDS Weekly Bans Notice",
            "PUBG: Battlegrounds",
        )
        self.assertEqual(title, "PUBG: BATTLEGROUNDS Weekly Bans Notice")

    def test_is_usable_news_content_rejects_placeholder_teasers(self) -> None:
        self.assertFalse(
            is_usable_news_content(
                "Read the full announcement here!",
                min_chars=120,
            )
        )
        self.assertTrue(
            is_usable_news_content(
                "This update includes multiple balance changes and bug fixes across ranked playlists, training modes, and custom lobbies for all supported regions.",
                min_chars=120,
            )
        )


if __name__ == "__main__":
    unittest.main()
