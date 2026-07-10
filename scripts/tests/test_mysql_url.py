"""Tests for MySQL SQLAlchemy URL normalization."""

import unittest

from config.mysql_url import normalize_mysql_sqlalchemy_url


class NormalizeMysqlSqlalchemyUrlTests(unittest.TestCase):
    def test_railway_mysql_url_uses_pymysql_driver(self) -> None:
        url = normalize_mysql_sqlalchemy_url(
            "mysql://user:pass@containers.railway.internal:3306/railway"
        )

        self.assertTrue(url.startswith("mysql+pymysql://"))
        self.assertIn("charset=utf8mb4", url)

    def test_mysqldb_prefix_is_replaced(self) -> None:
        url = normalize_mysql_sqlalchemy_url(
            "mysql+mysqldb://user:pass@localhost:3306/statustimer"
        )

        self.assertTrue(url.startswith("mysql+pymysql://"))

    def test_existing_pymysql_url_is_preserved(self) -> None:
        original = (
            "mysql+pymysql://user:pass@localhost:3307/statustimer?charset=utf8mb4"
        )

        self.assertEqual(normalize_mysql_sqlalchemy_url(original), original)


if __name__ == "__main__":
    unittest.main()
