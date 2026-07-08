"""Tests for gaming news relevance filtering at ingestion."""

import unittest

from scrapers.text_utils import is_relevant_gaming_news


class NewsRelevanceFilterTests(unittest.TestCase):
    def test_rejects_surveys(self) -> None:
        self.assertFalse(
            is_relevant_gaming_news(
                "Battlefield 6 Steam Discussions Survey",
                "Please take this 9-question survey about the Steam Discussions community space.",
            )
        )

    def test_rejects_weekly_ban_notices(self) -> None:
        self.assertFalse(
            is_relevant_gaming_news(
                "PUBG: BATTLEGROUNDS Weekly Bans Notice",
                "This week we banned thousands of accounts for cheating.",
            )
        )

    def test_allows_patch_notes_even_with_cheat_mentions(self) -> None:
        self.assertTrue(
            is_relevant_gaming_news(
                "FIX2.5.1",
                "- Implemented countermeasures against a cheat that grants recommendations\n"
                "- Fixed an issue where players could go out of bounds",
            )
        )

    def test_allows_balance_updates(self) -> None:
        self.assertTrue(
            is_relevant_gaming_news(
                "Balance Update",
                "Weapon damage and recoil adjustments across ranked playlists.",
            )
        )

    def test_allows_generic_patch_news(self) -> None:
        self.assertTrue(
            is_relevant_gaming_news(
                "Patch 1.2.3",
                "Stability fixes across competitive matchmaking and training modes.",
            )
        )

    def test_allows_unknown_but_not_blacklisted_news(self) -> None:
        self.assertTrue(
            is_relevant_gaming_news(
                "New seasonal event",
                "A limited-time event is now live with new rewards and challenges.",
            )
        )


if __name__ == "__main__":
    unittest.main()
