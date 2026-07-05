"""Tests for LLM JSON extraction."""

import unittest

from pipeline.json_utils import extract_json_object


class JsonUtilsTests(unittest.TestCase):
    def test_extract_json_object_from_fenced_response(self) -> None:
        raw = """```json
        {"summary": "Outage detected", "status": "DOWN", "actionable": true}
        ```"""
        parsed = extract_json_object(raw)
        self.assertEqual(parsed["status"], "DOWN")


if __name__ == "__main__":
    unittest.main()
