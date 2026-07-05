"""Tests for HTML plain-text extraction."""

import unittest

from scrapers.text_utils import plain_text_from_html


class TextUtilsTests(unittest.TestCase):
    def test_plain_text_from_html_strips_tags(self) -> None:
        raw_html = "<p>Server <strong>maintenance</strong> completed.</p>"
        self.assertEqual(
            plain_text_from_html(raw_html),
            "Server maintenance completed.",
        )


if __name__ == "__main__":
    unittest.main()
