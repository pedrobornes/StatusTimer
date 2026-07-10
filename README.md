# StatusTimer

StatusTimer es una plataforma full-stack para monitorizar el estado de servicios de videojuegos, su actividad en tiempo real y su fecha de lanzamiento.

La idea del proyecto es sencilla: en lugar de revisar varias fuentes por separado, StatusTimer centraliza estado, incidencias, noticias y releases en una única experiencia.

## Qué incluye el proyecto

- Un **frontend web** centrado en UX de monitorización en tiempo real.
- Un **backend en Spring Boot** con APIs tipadas y lógica de dominio.
- Un **bot/harvester en Python** para ingerir y normalizar datos externos.

## Qué hace la plataforma

- Informa del estado de cada juego (`ONLINE`, `MAINTENANCE`, `DOWN`).
- Muestra métricas de actividad (jugadores en vivo y audiencia).
- Registra incidencias y cambios recientes en "Recent Issues".
- Mantiene páginas por juego para:
  - estado,
  - noticias,
  - media,
  - enlaces externos.
- Mantiene páginas de lanzamiento para títulos no publicados:
  - countdown,
  - ventanas por plataforma,
  - cobertura pre-lanzamiento.
- Aplica rutas según el ciclo de vida:
  - juego no lanzado -> `/release/[slug]`
  - juego lanzado -> `/status/[slug]`

## Estructura del repositorio

- `frontend/` -> interfaz web en Next.js (App Router, TypeScript, Tailwind)
- `backend/` -> API REST en Java/Spring Boot
- `scripts/` -> pipeline de ingestión y sincronización en Python

## Stack técnico

### Frontend
- Next.js 16 (App Router)
- React 19
- TypeScript (modo estricto)
- Tailwind CSS 4

### SEO (implementado en frontend con Next.js)
- Metadatos por ruta (title/description/canonical) usando la API de metadata del App Router.
- JSON-LD en páginas clave para mejorar contexto semántico en buscadores.
- Slugs canónicos y control de rutas indexables según ciclo de vida del juego.
- Páginas de estado y release con estructura orientada a discoverability orgánica.

### Backend
- Java 21
- Spring Boot 3
- Spring Web
- Spring Data JPA
- Caffeine (cache)
- MySQL

### Bot / Ingesta
- Python 3
- Requests
- SQLAlchemy
- Pydantic

## Arquitectura (visión rápida)

1. **Harvester (Python):** consulta fuentes externas y transforma datos a un formato común.
2. **Backend (Spring Boot):** valida, persiste, enriquece y expone respuestas con contratos tipados.
3. **Frontend (Next.js):** renderiza vistas de status/release con navegación según ciclo de vida.

## Módulos principales

- **Status Hub:** tarjetas de estado, timeline e incidencias.
- **Game Status Profile** (`/status/[slug]`): vista completa de estado con contexto.
- **Game News** (`/status/[slug]/news`): listado y detalle de artículos.
- **Release Hub** (`/releases`): filtros, orden, paginación y búsqueda.
- **Release Profile** (`/release/[slug]`): countdown, media y cobertura.
- **Unified Search:** decide si un resultado va a status o release según el estado de publicación del juego.

## Calidad y validación

- Lint en frontend (`next lint`).
- Tests en backend (Maven).
- Tests en scripts Python (`unittest` / `pytest`).
- Contratos tipados entre backend y frontend para reducir drift.

## Deploy a producción

Guía completa de despliegue, variables de entorno y checklist pre-launch: **[docs/DEPLOY.md](docs/DEPLOY.md)**.

Resumen rápido:

| Servicio | Build | Start |
|----------|-------|-------|
| Frontend | `cd frontend && npm ci && npm run build` | `npm start` |
| Backend | `cd backend && ./mvnw.cmd -DskipTests package` | `java -jar target/*.jar` |
| Harvester | `pip install -r scripts/requirements.txt` | `python scripts/main.py` |

Variables críticas: `NEXT_PUBLIC_SITE_URL`, `APP_API_KEY` / `BACKEND_API_KEY`, `SPRING_PROFILES_ACTIVE=prod`, `RIOT_API_KEY` (incidentes Riot).

## Enfoque de portfolio

Este proyecto demuestra:
- diseño y ejecución end-to-end (ingesta + API + frontend),
- trabajo multi-stack real (TypeScript, Java, Python),
- implementación SEO técnica sobre Next.js (metadata, canonical y datos estructurados),
- criterios de producto en escenarios de datos cambiantes,
- iteración orientada a producción (routing, consistencia, hardening progresivo).

