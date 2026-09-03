# StatusTimer — Frontend

Next.js 16 (App Router) + TypeScript + Tailwind CSS 4.

## Desarrollo local

```bash
npm install
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000). El backend debe estar en `http://localhost:8080` (ver `backend/run-local.ps1` y `docker-compose.yml` para MySQL).

Variables opcionales en desarrollo (defaults en código):

| Variable | Default local |
|----------|----------------|
| `NEXT_PUBLIC_SITE_URL` | `http://localhost:3000` |
| `API_BASE_URL` | `http://localhost:8080` |
| `NEXT_PUBLIC_API_BASE_URL` | `http://localhost:8080` |

## Scripts

| Comando | Descripción |
|---------|-------------|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Build de producción |
| `npm start` | Servir build |
| `npm run lint` | ESLint (Next.js) |

## Producción (Vercel)

- **Root directory:** `frontend`
- **Dominio canónico:** `https://www.status-timer.com`
- Redirects apex → `www` en `vercel.json`

Variables en Vercel (Production):

```
NEXT_PUBLIC_SITE_URL=https://www.status-timer.com
API_BASE_URL=https://<backend-railway>
NEXT_PUBLIC_API_BASE_URL=https://<backend-railway>
NEXT_PUBLIC_CONTACT_EMAIL=info@status-timer.com
```

## Estructura relevante

```
src/app/          # Rutas App Router (status, release, games, news…)
src/components/   # UI modular
src/lib/seo/      # Metadata, JSON-LD, indexabilidad
src/services/     # Cliente HTTP hacia Spring Boot
src/config/       # Rutas, SEO, site URL canónico (getSiteUrl)
```

## SEO

- `getSiteUrl()` en `src/config/site.ts` normaliza apex → `www` en sitemap, robots y metadata.
- Páginas legales/hubs: `noindex`. Status indexables, releases y news cualificadas: indexables según backend.
