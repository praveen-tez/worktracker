# Technical Architecture Documentation

This document describes the **CURRENT** technical architecture of the Monthly Time Tracker application.

---

## Technical Stack & Infrastructure

- **Framework**: Nuxt 3 (v3.x) with Vue 3 Composition API (`<script setup lang="ts">`)
- **Language**: TypeScript (`lang="ts"`)
- **Build System**: Vite / Nuxt CLI (`npm run dev`, `npm run build`)
- **CSS System**: Vanilla CSS with Design System Tokens (`assets/main.css`, `assets/final-ux.css`, `assets/ux-overrides.css`)

---

## Folder Structure

```text
/
├── app.vue                   # Application shell, screen router, topbar/sidebar, modals, state wiring
├── assets/                   # CSS stylesheets and global design system tokens
│   ├── main.css              # Core typography, resets, grid layouts
│   ├── final-ux.css          # Visual polish, topbar actions, timesheet tables, button standards
│   ├── ux-overrides.css       # Mobile overrides and component styling
│   ├── workspace-overrides.css# Dark theme variable definitions and mini calendar styling
│   └── analytics-ui.css      # SVG analytics chart styling
├── composables/              # Vue composables
│   └── useTracker.ts         # Central state store, persistence, CRUD handlers
├── docs/                     # Project rules, design, architecture, and development guidelines
│   ├── rules.md
│   ├── design.md
│   ├── architecture.md
│   └── development.md
├── plugins/                  # Nuxt client plugins
│   └── welcome-loader.client.ts
├── types/                    # TypeScript interfaces and domain schemas
│   └── tracker.ts
├── nuxt.config.ts            # Nuxt framework configuration & modules
├── package.json              # Project dependencies and script declarations
└── README.md                 # Workspace readme
```

---

## Application State Management

- **Store**: `useTracker()` composables (`composables/useTracker.ts`).
- **Reactive State**: Managed via Nuxt `useState<TrackerData>('tracker-data')` for SSR-safe client rehydration.
- **Persistence**: Browser `localStorage` using key `monthly-time-tracker-v1`.
- **Data Schemas** (`types/tracker.ts`):
  - `Task`: Monthly sprint items (`id`, `month`, `project`, `category`, `task`, `owner`, `owners`, `hours`, `status`, `priority`, `startDate`, `endDate`, `startTime`, `endTime`)
  - `LogEntry`: Time log records (`id`, `date`, `user`, `users`, `text`, `project`, `task`, `hours`, `startTime`, `endTime`, `tags`)
  - `Todo`: Deliverables (`id`, `title`, `detail`, `due`, `status`, `priority`, `link`, `fileName`, `fileData`, `month`, `createdDate`)
  - `NotificationItem`: In-app alerts (`id`, `title`, `message`, `time`, `type`, `read`)

---

## Current Backend & Server Status

- **API Structure**: `Not currently implemented.`
- **Server Structure**: `Not currently implemented.` (Client-side single page app model with Nuxt dev server).
- **Database**: `Not currently implemented.` (Client browser local storage persistence).
- **Authentication**: `Not currently implemented.` (Local active user state `TEZ`).
- **External Integrations**:
  - `jsPDF` & `jspdf-autotable` for dynamic PDF report exports.
  - Native CSV & Word XML (`.docx`) file generators.
  - Optional `sheetsEndpoint` POST webhook helper in `useTracker.ts`.
- **Environment Variables**:
  - `runtimeConfig.public.sheetsEndpoint` defined in `nuxt.config.ts`.
