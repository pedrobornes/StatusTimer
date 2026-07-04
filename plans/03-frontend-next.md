# Phase 3: Frontend Interface (Next.js & Tailwind CSS)

## Objective
Create a modern, highly responsive gaming dashboard using Next.js (App Router) and TypeScript. The interface will display live server statuses, upcoming release countdowns, and AI-generated news feeds. The design will feature a premium dark aesthetic by default, optimize for global SEO in English, and maintain zero friction by requiring no user registration.

## System Constraints & Rules
- **Language:** The user interface, typography, metadata, and labels must be entirely in English.
- **TypeScript:** Strict configuration. The use of `any` is prohibited. Define clear interfaces for all data structures fetched from the backend.
- **React Architecture:** Use Server Components by default for static rendering and SEO. Use Client Components (`use client`) strictly for interactive elements like countdown timers or theme toggles.
- **Styling:** Tailwind CSS with a modern dark theme priority. Avoid bloated inline styles; maintain clean component layouts.

## Tasks to Execute

### 1. Global Layout and Theme Configuration
- [ ] Set up the root layout in `src/app/layout.tsx` with optimized SEO metadata in English.
- [ ] Configure Tailwind CSS to support native Dark/Light mode, establishing the dark theme as the default presentation.
- [ ] Design a clean, sticky navigation bar or sidebar to filter categories seamlessly.

### 2. Service Status Dashboard
- [ ] Create a modular grid system in `src/app/page.tsx` or a dedicated dashboard component.
- [ ] Develop status indicator cards displaying the platform name, category, a live status badge (Online/Offline), and the timestamp of the last check.
- [ ] Group components strictly by their category: Social Networks, Streaming Platforms, and Videojuegos.

### 3. Upcoming Releases and Hype Component
- [ ] Build a countdown timer component that takes a target release date (e.g., for upcoming major titles like GTA 6) and dynamically updates remaining days, hours, and minutes.
- [ ] Include a voting or "Hype Counter" button that safely communicates with the backend to increment engagement metrics.

### 4. AI News Feed Section
- [ ] Design a dedicated side panel or feed section for latest updates.
- [ ] Render the news cards using clean typography optimized for readability, showing the title, game tag, generation date, and a modal or expandable section for the full article body.

### 5. Legal Compliance Footer
- [ ] Implement a mandatory global footer component.
- [ ] Include an explicit disclaimer stating that StatusTimer is an independent tracking platform and is not affiliated, associated, authorized, or endorsed by any company or trademark listed on the site.