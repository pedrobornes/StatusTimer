"""Tests for lightweight sparse embeddings."""

import unittest

from pipeline.embeddings import cosine_similarity, embed_text


class EmbeddingTests(unittest.TestCase):
    def test_similar_texts_have_higher_cosine_score(self) -> None:
        left = embed_text("Valorant login outage in North America")
        right = embed_text("Login failures for Valorant NA servers")
        unrelated = embed_text("Fortnite creative mode patch notes")

        similar_score = cosine_similarity(left, right)
        unrelated_score = cosine_similarity(left, unrelated)

        self.assertGreater(similar_score, unrelated_score)


if __name__ == "__main__":
    unittest.main()
