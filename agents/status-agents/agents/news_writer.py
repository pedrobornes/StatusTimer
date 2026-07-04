"""AI gaming news writer powered by Ollama and LangChain."""

from __future__ import annotations

import json
import logging
import re
from typing import Any

from langchain_core.prompts import ChatPromptTemplate
from langchain_ollama import OllamaLLM
from pydantic import ValidationError

from agents.news_ingestion import NewsIngester
from clients.backend_client import BackendClient
from config.settings import settings
from models.schemas import GamingNewsPayload, RawNewsFact

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """You are StatusTimer's AI gaming news writer.

Your job is to transform factual inputs into an original, concise news update in English.

Rules:
- Use ONLY the provided facts. Do not invent dates, features, platforms, or quotes.
- Never copy or closely paraphrase third-party media wording.
- Write fresh, engaging prose with a professional gaming-news tone.
- Keep the article short: 2 to 4 sentences in the content field.
- The gameTag must be a short tag for filtering (one game/franchise/platform, e.g. "Elden Ring", "Steam", "PlayStation").
- Respond with valid JSON only. No markdown fences, no commentary.

Required JSON schema:
{{
  "title": "Original headline in English",
  "content": "Original short article body in English",
  "gameTag": "Short game or platform tag"
}}"""


class NewsWriterAgent:
    def __init__(self) -> None:
        self._ingester = NewsIngester()
        self._backend = BackendClient()
        self._llm = OllamaLLM(
            base_url=settings.ollama_base_url,
            model=settings.ollama_model,
            temperature=0.4,
        )
        self._prompt = ChatPromptTemplate.from_messages(
            [
                ("system", SYSTEM_PROMPT),
                (
                    "user",
                    "Write an original StatusTimer news update from these verified facts:\n\n{facts}",
                ),
            ]
        )
        self._chain = self._prompt | self._llm

    def run(self) -> None:
        facts = self._ingester.collect_recent_facts()

        if not facts:
            logger.warning("No factual news inputs available. Skipping news writer run.")
            return

        success_count = 0

        for fact in facts:
            try:
                article = self._generate_article(fact)
                if self._backend.push_gaming_news(article):
                    success_count += 1
            except Exception as error:
                logger.error(
                    "Failed to generate or publish article for '%s': %s",
                    fact.headline,
                    error,
                )

        logger.info(
            "Published %s/%s gaming news articles to backend",
            success_count,
            len(facts),
        )

    def _generate_article(self, fact: RawNewsFact) -> GamingNewsPayload:
        logger.info("Generating original article from source: %s", fact.source_name)
        raw_response = self._chain.invoke({"facts": self._format_facts(fact)}).strip()
        payload = self._parse_json_response(raw_response)
        return GamingNewsPayload.model_validate(payload)

    def _format_facts(self, fact: RawNewsFact) -> str:
        return (
            f"Headline: {fact.headline}\n"
            f"Source: {fact.source_name}\n"
            f"Published at: {fact.published_at}\n"
            f"Reference URL: {fact.source_url}\n"
            f"Factual summary: {fact.factual_summary}"
        )

    def _parse_json_response(self, raw_response: str) -> dict[str, Any]:
        cleaned = self._strip_markdown_fences(raw_response)

        try:
            payload = json.loads(cleaned)
        except json.JSONDecodeError as error:
            raise ValueError(f"Model did not return valid JSON: {error}") from error

        if not isinstance(payload, dict):
            raise ValueError("Model JSON response must be an object")

        return payload

    def _strip_markdown_fences(self, raw_response: str) -> str:
        cleaned = raw_response.strip()

        if cleaned.startswith("```"):
            cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned, flags=re.IGNORECASE)
            cleaned = re.sub(r"\s*```$", "", cleaned)

        return cleaned.strip()


def run_news_writer() -> None:
    try:
        NewsWriterAgent().run()
    except ValidationError as error:
        logger.error("Generated article failed schema validation: %s", error)
    except Exception as error:
        logger.error("News writer agent failed: %s", error)
