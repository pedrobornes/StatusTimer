# Phase 1: Backend Core API (Spring Boot)

## Objective
Build a lightweight, high-performance, and secure REST API using Java and Spring Boot. This backend will act as the data hub, storing and serving server statuses, AI-generated gaming news, and countdowns for upcoming game releases. All data structures, endpoints, and database fields must be strictly in English to support global SEO.

## System Constraints & Rules
- **Language:** Code, variables, database schema, and API responses must be entirely in English.
- **Authentication:** Public endpoints (`GET`) require NO authentication or registration. Internal modification endpoints (`POST`, `PUT`) used by Python agents must be protected via a simple API Key verification in the request headers (`X-API-KEY`).
- **CORS:** Explicitly enable CORS to allow requests originating from the frontend (`http://localhost:3000`).
- **Database:** Configure an H2 in-memory database for development environment via `application.yml`.
- **Architecture:** Use a standard clean layered architecture: Entity -> Repository -> Service -> DTO -> Controller.

## Tasks to Execute

### 1. Project Setup & Configuration
- [ ] Verify `pom.xml` includes dependencies for: Spring Web, Spring Data JPA, H2 Database, and Lombok.
- [ ] Configure `src/main/resources/application.yml`:
  - Set server port to `8080`.
  - Configure H2 database path and enable the H2 console at `/h2-console`.
  - Define an internal API key property: `app.security.api-key=your-local-secret-key`.

### 2. Domain Models & Repositories
- [ ] **ServerStatus Entity & Repository:**
  - Fields: `Long id`, `String serviceName`, `String category` (Use String or Enum: GAMING, SOCIAL, STREAMING), `Boolean isUp`, `LocalDateTime lastChecked`.
- [ ] **GamingNews Entity & Repository:**
  - Fields: `Long id`, `String title`, `String content`, `String gameTag`, `LocalDateTime createdAt`.
- [ ] **UpcomingRelease Entity & Repository:**
  - Fields: `Long id`, `String gameName`, `LocalDateTime releaseDate`, `Long hypeCount`.

### 3. Data Transfer Objects (DTOs)
- [ ] Create clean, immutable DTO records or classes for returning data to the frontend, ensuring database entity structures are decoupled from the API contracts.

### 4. Security Layer (Internal API Key Protection)
- [ ] Implement a custom `HandlerInterceptor` or a Filter that extracts the `X-API-KEY` header and validates it against the value defined in `application.yml`.
- [ ] Register the interceptor to apply **ONLY** to endpoints under the `/api/v1/internal/**` path.

### 5. REST Controllers
- [ ] **Public Endpoints (No Auth Required):**
  - `GET /api/v1/status` -> Returns a list of all tracked server statuses.
  - `GET /api/v1/news` -> Returns the latest gaming news articles ordered by `createdAt` descending.
  - `GET /api/v1/releases` -> Returns all upcoming game releases and countdown data.
- [ ] **Internal Endpoints (Protected by X-API-KEY):**
  - `POST /api/v1/internal/status` -> Upserts (inserts or updates) the status of a specific service.
  - `POST /api/v1/internal/news` -> Inserts a new news article freshly written by the Python agent.

### 6. Verification & Smoke Test
- [ ] Ensure the application builds and boots up smoothly on port 8080.
- [ ] Test public endpoints via cURL or browser to confirm they respond with status `200 OK` and empty JSON arrays `[]` instead of throw authorization errors.