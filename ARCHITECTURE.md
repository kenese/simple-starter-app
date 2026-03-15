# Canva Clone — Current Architecture

## Architecture
- **Monorepo**: Turborepo with `apps/web`, `apps/server`, `packages/shared`
- **Frontend**: React 19 + Vite + React Router + Zustand
- **Backend**: Express REST server with in-memory document persistence
- **Shared Package**: `@starter/shared` defines canvas element and document API contracts
- **Testing & UI Tooling**: Vitest (unit/component + storybook integration), Playwright (E2E), Storybook

## Project Structure
```
apps/web/src/
  api/documents.ts         — load/save document client
  components/
    TopNav.tsx             — editor top bar with current document context
    Editor.tsx             — sidebar + design canvas + document load/save actions
  store/
    appStore.ts            — Zustand store for theme and canvas elements
  App.tsx                  — route setup (`/` redirect, `/:documentId` editor)
  main.tsx                 — React entry point with BrowserRouter
apps/web/tests/
  example.spec.ts          — Playwright editor interaction flows

apps/server/src/
  index.ts                 — Express server and document version endpoints

packages/shared/src/
  index.ts                 — shared canvas/document/domain contracts
```

## Routing And Frontend Data Flow
- Visiting `/` generates a new UUID and redirects to `/:documentId`.
- `App` reads `documentId` from the route and renders `TopNav` + `Editor` for that document.
- `Editor` loads `GET /api/documents/:documentId` on route change:
  - if found, it hydrates canvas elements from the latest saved snapshot
  - if not found, it initializes an empty unsaved document
- Sidebar tool buttons and drag-drop interactions still add design elements via `useAppStore`.
- `Editor` renders ordered `elementIds`, and each `CanvasElement` subscribes directly to `elementsById[id]` so element updates stay scoped to the changed id.
- Clicking **Save design** posts current canvas elements to `POST /api/documents/:documentId/versions`.

## State Model
- **Client (Zustand)**:
  - `theme`: dark/light UI preference
  - normalized canvas state:
    - `elementIds`: ordered list of element ids for render/save order
    - `elementsById`: map of `id -> DesignElement` for O(1) single-element updates
  - actions: `setElements`, `addElement`, `updateTextElement`, `updateElementFrame`, `toggleTheme`
- **Server (in-memory)**:
  - `Map<documentId, DesignDocument>`
  - each `DesignDocument` tracks `latestVersion` and retained `versions`

## Backend API
- `GET /api/health` returns `{ status: "ok" }`
- `GET /api/documents/:documentId` returns `{ document }` or `404` when missing
- `POST /api/documents/:documentId/versions` validates snapshot payload, creates a new version, and returns updated `{ document }`

## Versioning Rules
- Each save creates a new immutable version with:
  - incremented `version`
  - `savedAt` timestamp
  - full `snapshot` of canvas elements
- Only the latest 10 versions are retained per document
- `latestVersion` continues incrementing even when older versions are trimmed

## Commands (Root)
- `pnpm dev` — starts frontend and backend with Turborepo
- `pnpm build` — production build for all workspaces
- `pnpm test` — runs workspace Vitest suites
- `pnpm test:e2e` — runs Playwright tests
- `pnpm storybook` — starts Storybook
