# Phase 2: Python Automation and AI Agents

## Objective
Develop a modular Python-based automation system inside the `/agents` folder. This system will feature two distinct tasks: a network/status checker to monitor platforms legally and an AI news writer that synthesizes factual gaming updates into original short articles in English. All gathered and generated data will be pushed to the Spring Boot backend using the secure internal REST endpoints.

## System Constraints & Rules
- **Language:** Python source code, logs, and generated content must be completely in English.
- **Legal Compliance:** No aggressive scraping or brute force. Use public APIs, standard network pings, or open status feeds. Respect rate limiting.
- **Content Originality:** The AI writer must never duplicate text from third-party media. It must intake raw facts (e.g., dates, maintenance notices) and generate entirely original, concise prose to avoid copyright infringement.
- **Security:** Every POST request sent to the backend must include the `X-API-KEY` header matching the backend configuration.

## Tasks to Execute

### 1. Environment Setup
- [ ] Initialize a Python virtual environment (`venv`) inside the `agents/` directory.
- [ ] Create a `requirements.txt` file specifying necessary libraries: `requests`, `pydantic`, and tools for AI orchestration (such as `langchain` or native HTTP clients for Ollama/inference APIs).

### 2. Status Monitoring Agent
- [ ] Create a module `status_checker.py`.
- [ ] Implement legal verification methods for each category:
  - Social & Streaming: HTTP requests to official public health/status endpoints or verified open indicators.
  - Gaming: Ping or connection checks to public matchmaking or login server addresses where available.
- [ ] Structure the output into a standardized object containing: `serviceName`, `category`, and `isUp`.

### 3. AI Gaming News Writer Agent
- [ ] Create a module `news_writer.py`.
- [ ] Implement a data ingestion function that reads factual inputs (official developer blog updates, verified release schedule changes).
- [ ] Set up an LLM prompt template that forces the model to write an original, short, engaging news update in English, focusing purely on facts and gaming tone.
- [ ] Output format must strictly match the backend expectations: `title`, `content`, and `gameTag`.

### 4. Data Synchronizer and Orchestrator
- [ ] Create a central `main.py` script to orchestrate execution schedules.
- [ ] Implement secure HTTP POST utilities using the `requests` library to transmit payloads to `http://localhost:8080/api/v1/internal/status` and `http://localhost:8080/api/v1/internal/news`.
- [ ] Ensure proper error handling and logging so that backend downtime does not crash the Python script.