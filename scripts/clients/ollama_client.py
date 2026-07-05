"""HTTP client for local Ollama inference."""

from __future__ import annotations

import logging

import requests

from config.settings import settings

logger = logging.getLogger(__name__)


class OllamaClient:
    def __init__(self) -> None:
        self._base_url = settings.ollama_base_url.rstrip("/")
        self._model = settings.ollama_model
        self._timeout = settings.ollama_timeout_seconds
        self._session = requests.Session()

    def generate_json(self, prompt: str) -> str:
        if not settings.ollama_enabled:
            raise RuntimeError("Ollama integration is disabled by configuration.")

        url = f"{self._base_url}/api/generate"
        payload = {
            "model": self._model,
            "prompt": prompt,
            "stream": False,
            "format": "json",
        }

        try:
            response = self._session.post(url, json=payload, timeout=self._timeout)
            response.raise_for_status()
            body = response.json()
        except (requests.RequestException, ValueError) as error:
            logger.warning("Ollama generate request failed: %s", error)
            raise RuntimeError("Ollama generate request failed.") from error

        raw_text = body.get("response", "")
        if not isinstance(raw_text, str) or not raw_text.strip():
            raise RuntimeError("Ollama returned an empty response.")

        return raw_text.strip()
