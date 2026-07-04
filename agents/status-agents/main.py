"""StatusTimer Python agents orchestrator."""

import logging
import sys

from dotenv import load_dotenv

from agents.news_writer import run_news_writer
from agents.status_checker import StatusChecker
from clients.backend_client import BackendClient

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)],
)

logger = logging.getLogger(__name__)


def sync_service_statuses() -> None:
    checker = StatusChecker()
    backend = BackendClient()
    statuses = checker.run_all_checks()

    logger.info("Collected %s service status results", len(statuses))

    success_count = 0
    for status in statuses:
        if backend.push_service_status(status):
            success_count += 1

    logger.info(
        "Synced %s/%s service statuses to backend",
        success_count,
        len(statuses),
    )


def main() -> None:
    load_dotenv()
    logger.info("Starting StatusTimer agents orchestrator")
    sync_service_statuses()
    run_news_writer()
    logger.info("StatusTimer agents run completed")


if __name__ == "__main__":
    main()
