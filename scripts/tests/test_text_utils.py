"""Tests for HTML and markdown extraction."""

import unittest

from scrapers.text_utils import (
    clean_news_title,
    is_usable_news_content,
    markdown_from_html,
    plain_text_from_html,
    substantive_news_text,
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

    def test_markdown_from_html_handles_steam_bb_tables_and_h1(self) -> None:
        raw_html = """
        <div class="bb_h1">Twitch Drops content</div>
        <div class="bb_table">
          <div class="bb_table_tr">
            <div class="bb_table_th"><p class="bb_paragraph"><b>Quantity</b></p></div>
            <div class="bb_table_th"><p class="bb_paragraph"><b>Watch time</b></p></div>
            <div class="bb_table_th"><p class="bb_paragraph"><b>Reward</b></p></div>
          </div>
          <div class="bb_table_tr">
            <div class="bb_table_td"><p class="bb_paragraph">1st gift</p></div>
            <div class="bb_table_td"><p class="bb_paragraph">1 hour</p></div>
            <div class="bb_table_td"><p class="bb_paragraph">Sheriff charm</p></div>
          </div>
        </div>
        """
        markdown = markdown_from_html(raw_html)
        self.assertIn("# Twitch Drops content", markdown)
        self.assertIn("| Quantity | Watch time | Reward |", markdown)
        self.assertIn("| --- | --- | --- |", markdown)
        self.assertIn("| 1st gift | 1 hour | Sheriff charm |", markdown)
        self.assertNotIn("** Quantity **", markdown)

    def test_markdown_from_html_spaces_inline_bold_markers(self) -> None:
        raw_html = (
            "<p>Great news!<strong>BOMBANANA Demo</strong>now officially supports"
            "<strong>macOS</strong>!</p>"
        )
        markdown = markdown_from_html(raw_html)
        self.assertIn("Great news! **BOMBANANA Demo** now officially supports **macOS**!", markdown)

    def test_markdown_from_html_spaces_inline_links(self) -> None:
        raw_html = (
            "<p>We're pulling back the curtain on "
            '<a class="bb_link" href="http://dota2.com/darkcarnival">the Dark Carnival</a>, '
            "a new ongoing event. There's "
            '<a class="bb_link" href="http://dota2.com/darkcarnivalcomic">a comic</a>'
            "if you're into that.</p>"
        )
        markdown = markdown_from_html(raw_html)
        self.assertIn("on [the Dark Carnival](http://dota2.com/darkcarnival),", markdown)
        self.assertIn("There's [a comic](http://dota2.com/darkcarnivalcomic) if you're", markdown)

    def test_markdown_from_html_emits_steam_rss_hero_image(self) -> None:
        raw_html = (
            '<img src="https://clan.fastly.steamstatic.com/images/3703047/'
            '7942925df6ae43659acf60f2d2ff827461c02485/english.png">'
            "<br><br>Event announcement body."
        )
        markdown = markdown_from_html(raw_html)
        self.assertIn("![Patch notes image](https://clan.fastly.steamstatic.com/images/3703047/", markdown)
        self.assertIn("/english.png)", markdown)
        self.assertIn("Event announcement body.", markdown)

    def test_markdown_from_html_converts_steam_youtube_previews(self) -> None:
        raw_html = """
        <p class="bb_paragraph">Tune in for the reveal.</p>
        <div onclick="javascript:ReplaceWithYouTubeEmbed( this );" data-youtube="&quot;zWUrJCGIp18" class="sharedFilePreviewYouTubeVideo">
          <img class="sharedFilePreviewYouTubeVideo" src="https://steamcommunity.com/public/shared/images/responsive/youtube_16x9_placeholder.gif"/>
          <iframe src="https://www.youtube-nocookie.com/embed/&quot;zWUrJCGIp18?fs=1" allowFullScreen="1"></iframe>
        </div>
        <div class="bb_h2"><b>How to Participate</b></div>
        """
        markdown = markdown_from_html(raw_html)
        self.assertIn("https://www.youtube.com/watch?v=zWUrJCGIp18", markdown)
        self.assertIn("## How to Participate", markdown)
        self.assertNotIn("youtube_16x9_placeholder", markdown)

    def test_markdown_from_html_converts_previewyoutube_bbcode(self) -> None:
        raw = '[previewyoutube="ARFSbodxJZU;full"][/previewyoutube]<p>Expansion trailer.</p>'
        markdown = markdown_from_html(raw)
        self.assertIn("https://www.youtube.com/watch?v=ARFSbodxJZU", markdown)
        self.assertIn("Expansion trailer.", markdown)

    def test_clean_news_title_removes_source_tag_and_duplicate_game_name(self) -> None:
        title = clean_news_title(
            "[STEAM NEWS] PUBG: Battlegrounds: PUBG: BATTLEGROUNDS Weekly Bans Notice",
            "PUBG: Battlegrounds",
        )
        self.assertEqual(title, "Weekly Bans Notice")

    def test_is_usable_news_content_rejects_placeholder_teasers(self) -> None:
        self.assertFalse(
            is_usable_news_content(
                "Read the full announcement here!",
                min_chars=120,
            )
        )
        self.assertFalse(
            is_usable_news_content(
                "![Patch notes image](https://clan.fastly.steamstatic.com/images/27971017/example.png)\n\n"
                "## Read the full announcement here!",
                min_chars=120,
            )
        )
        self.assertEqual(
            substantive_news_text(
                "![Patch notes image](https://example.com/banner.png)\n\n"
                "## Read the full announcement here!"
            ),
            "Read the full announcement here!",
        )
        self.assertTrue(
            is_usable_news_content(
                "This update includes multiple balance changes and bug fixes across ranked playlists, training modes, and custom lobbies for all supported regions.",
                min_chars=120,
            )
        )


if __name__ == "__main__":
    unittest.main()
