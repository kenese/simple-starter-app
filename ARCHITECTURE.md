# Starter App — Template

## Architecture
- **Monorepo**: Turborepo with `apps/web`, `apps/server`, `packages/shared`
- **Frontend**: React 19 + Vite + Zustand + TanStack Query + React Router
- **Backend**: Express (REST API setup, easily extensible for WebSockets)
- **Shared**: TypeScript types for basic payloads (e.g. `AppState`) and canvas elements (`CanvasElement`, `CanvasElementKind`) in `@starter/shared`
- **Testing & UI Tooling**: Vitest (Unit/Component), Playwright (E2E), Storybook (UI Explorer)

## Project Structure
```
apps/web/src/
  components/    — React components (TopNav, Counter, EditorSidebar, EditorCanvas)
  hooks/         — Custom hooks (useCounter - TanStack Query)
  store/         — Zustand stores (appStore, canvasStore) + canvasDB (IndexedDB persistence)
  App.tsx        — Root layout with routing
  main.tsx       — Entry point with QueryClientProvider
apps/web/tests/  — Playwright E2E tests (counter, editor)

apps/server/src/
  index.ts       — Express REST server

packages/shared/src/
  index.ts       — Shared types (AppState, CanvasElement, CanvasElementKind) for frontend and backend
```

## Key Patterns
- Data fetching is handled by **TanStack Query** (React Query) against the Express backend.
- The `apps/server` exposes a simple REST API (e.g., `/api/counter`). This server is kept deliberately simple and can be quickly upgraded with `socket.io` during an interview if real-time features are required.
- **Zustand** is used for local client state: `appStore` (e.g., theme), `canvasStore` (editor elements, selected tool, selected element, and version history). Server state goes through React Query.
- **IndexedDB persistence**: The latest saved canvas version is persisted to IndexedDB via `canvasDB.ts`. On app startup, the store hydrates from the persisted snapshot so users resume where they left off. Persistence is fire-and-forget (errors are logged, never block the UI).
- **Editor**: The canvas editor has a sidebar (palette: circle, square, text) and a canvas. Elements are added via native DOM drag-and-drop (dataTransfer) or by clicking a palette item (adds at fixed position) or by selecting a tool and clicking the canvas. Canvas state is normalized as `elementIds` + `elementsById` in `canvasStore`. A **Save** button in the top nav (on the editor route) calls `saveVersion()`, which pushes a snapshot of the current canvas state into `versionHistory`; at most 10 versions are kept in memory (oldest dropped when exceeding).
- **Element interactions**: Click an element to select it (shows selection ring and corner resize handles). Drag an element to move it. Drag a corner handle to resize. Double-click a text element to edit its content in place. Click empty canvas to deselect. All drag/resize interactions use Pointer Events with `setPointerCapture` for reliable tracking across touch and mouse input.
- Shared types in `@starter/shared` should be mapped cleanly to API endpoints to avoid duplication. Keep it clean to make adding features during interviews fast.

## Commands (Root)
- `pnpm dev` — starts both frontend (5173) and backend (3001) via Turborepo
- `pnpm build` — production build for all packages
- `pnpm test` — runs Vitest unit and component tests
- `pnpm test:e2e` — runs Playwright E2E tests
- `pnpm storybook` — starts Storybook development server (6006)
- `pnpm clean` — removes build directories

## Commands (Workspace Specific)
- `pnpm --filter @starter/web dev` — frontend only
- `pnpm --filter @starter/server dev` — backend only

## Conventions
- Zustand for client state (not Redux/Context)
- CSS Modules or plain CSS for styling (co-located with components)
- Inter font from Google Fonts
- Dark theme: bg `#0f0f1a`/`#1a1a2e`, text `#e2e8f0`, accent `#6366f1`
- Use `.stories.tsx` files alongside components for Storybook documentation
- Use `.test.tsx` for unit/component tests in Vitest
