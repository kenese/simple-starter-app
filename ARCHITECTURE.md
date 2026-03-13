# Canva Clone

## Architecture
- **Monorepo**: Turborepo with `apps/web`, `apps/server`, `packages/shared`
- **Frontend**: React 19 + Vite + Zustand + TanStack Query + React Router
- **Backend**: Express (REST API for document persistence) + Socket.IO (real-time multi-user collaboration)
- **Shared**: TypeScript types for canvas elements, documents, users, and socket event payloads in `@starter/shared`
- **Testing & UI Tooling**: Vitest (Unit/Component), Playwright (E2E), Storybook (UI Explorer)

## Project Structure
```
apps/web/src/
  api/           — API client functions (documents.ts) for REST calls
  components/    — React components (TopNav, Sidebar, Canvas)
  hooks/         — Custom hooks (useDocumentLoader for URL ↔ document sync)
  store/         — Zustand stores (canvasStore for canvas + document + user state, appStore for UI state)
  utils/         — Pure utility functions (canvasRenderer for drawing/hit-testing)
  socket.ts      — Socket.IO client singleton, emit helpers (joinDocument, leaveDocument, emitSaveDocument)
  socketListeners.ts — Socket event listeners that write remote updates into canvasStore
  App.tsx        — Root layout with React Router: /:documentId? routes
  main.tsx       — Entry point with QueryClientProvider + BrowserRouter + socket listener init
apps/web/tests/  — Playwright E2E tests

apps/server/src/
  index.ts       — Express REST server + Socket.IO server (rooms, user sessions, real-time sync)

packages/shared/src/
  index.ts       — Shared types (CanvasElement, ElementType, CanvasDocument, User, socket event payloads, etc.)
```

## Document Persistence
The app uses document-based persistence with an in-memory store on the server.

**Data model:**
- Each `CanvasDocument` has a unique `id`, `name`, and an array of `DocumentVersion`s (max 10 per document).
- Each `DocumentVersion` contains a full snapshot of the element array and a timestamp.
- `DocumentMeta` is the lightweight list-view projection (id, name, timestamps, no versions).

**REST API (`/api/documents`):**
- `GET /` — list all document metadata
- `POST /` — create a new document (auto-generates unique "Untitled (X)" names)
- `GET /:id` — get full document with versions
- `PUT /:id` — save elements as a new version (trims to 10 versions). Accepts optional `afterVersionId` to truncate future versions before appending (used for undo-then-edit branching).
- `GET /:id/versions/:versionId` — get a specific version's elements (used by undo/redo)
- `PATCH /:id` — rename document (enforces unique names, returns 409 on conflict)
- `DELETE /:id` — delete document

**Naming:** Document names must be unique. New documents receive auto-incremented names: "Untitled", "Untitled (2)", "Untitled (3)", etc. Renaming rejects duplicate names.

**Client-side document management:**
- `useDocumentLoader` hook reads `:documentId` from the URL. If absent, creates a new document and redirects. If present, loads the document. Invalid IDs fall back to creation.
- `canvasStore` holds `documentId`, `documentName`, `versionId`, `isDirty`, `isSaving`, `versionHistory`, `currentVersionIndex`, `currentUser`, `connectedUsers`, and exposes `loadDocument`, `saveDocument`, `createDocument`, `renameDocument`, `undo`, `redo`, `canUndo`, `canRedo`.

**Save triggers:**
- **On add element**: clicking a sidebar button or dragging onto canvas
- **On delete element**: Delete/Backspace key
- **On move-drop**: when an element drag ends with movement
- **On resize-drop**: when a resize drag ends with movement
- **On text-blur**: when text editing is committed
- **Periodic**: every 2 minutes if dirty
- **Manual**: "Save" button in TopNav

## Multi-User Collaboration
Real-time multi-user editing via Socket.IO. Each browser session is treated as a unique user (no auth required).

**User identity:**
- Each socket connection is assigned a UUID, auto-incremented display name ("User 1", "User 2", ...), and a rotating color from a 10-color palette.
- The server emits `user-identity` on connect, which the client stores as `currentUser`.

**Document rooms:**
- When a client loads or creates a document, it joins a Socket.IO room (`doc:<documentId>`).
- Switching documents leaves the old room and joins the new one.
- The server broadcasts `users-updated` (user list) to the room on join/leave/disconnect.

**Real-time sync flow:**
1. **Initial load**: REST `GET /api/documents/:id` — unchanged from single-user.
2. **Save**: Client emits `save-document` via socket (with elements + optional `afterVersionId`). Server persists the version and acks with `{ versionId, savedAt }`.
3. **Broadcast**: Server broadcasts `elements-updated` to all OTHER clients in the room. Receiving clients update their local elements and version history without setting `isDirty` or triggering a re-save (prevents loops).

**Presence:**
- Connected users for the current document are displayed as colored avatars in the TopNav.
- The current user's avatar has a white border to distinguish it.

## Undo/Redo
Version-based undo/redo that navigates the server's version history.

- **Undo** (Cmd+Z / Ctrl+Z): If there are unsaved changes, discards them and reloads the current saved version. Otherwise, loads the previous version from the server.
- **Redo** (Cmd+Shift+Z / Ctrl+Shift+Z): Loads the next version from the server. Only available when not dirty and not at the latest version.
- **Branching**: Editing after undo truncates all future versions. Saving sends `afterVersionId` to the server, which drops versions after that point before appending the new one.
- **State tracking**: `versionHistory` (array of `VersionMeta`) and `currentVersionIndex` are populated on document load and updated on save/undo/redo.

## Canvas — Two-Layer Architecture
The canvas uses two stacked layers for rendering:

1. **Static Layer** (`<canvas>` element) — Renders all elements that are NOT being interacted with, using the Canvas 2D API. Redraws automatically when elements change or the active element changes.
2. **Active Layer** (DOM div overlay) — Renders only the single element currently being interacted with (moved, resized, or text-edited) as a DOM node with resize handles. The layer has `pointer-events: none`; only the active element itself accepts pointer events.

**Interaction flow:**
- Click on static canvas → hit-test element bounds → activate element (moves to DOM layer)
- Drag to move/resize → on drop (pointer up with movement) → deactivate (returns to static canvas) → save
- Click without moving → element stays active (handles visible for resize)
- Click empty space / Escape → deactivate
- Click another element on static canvas → switch activation
- Double-click text → edit mode → blur/enter → deactivate → save

**Key utilities** (`canvasRenderer.ts`):
- `drawElement(ctx, element)` — Draws a single element (roundRect, ellipse, or dashed-rect + text)
- `renderStaticCanvas(ctx, canvas, elements, activeId)` — Full redraw excluding active element
- `hitTest(elements, x, y, excludeId)` — Bounding-box hit-test, returns topmost match

## TopNav
The navigation bar contains:
- **Brand**: "Canva Clone" gradient text
- **Document title**: Inline-editable. Click to rename; Enter/blur commits, Escape cancels. Shows error tooltip on duplicate name.
- **Undo/Redo buttons**: Arrow icons that navigate version history. Disabled when not applicable. Keyboard shortcuts: Cmd+Z / Cmd+Shift+Z (Ctrl on non-Mac).
- **Documents dropdown**: Lists existing documents with a "+ New Document" button. Active document is highlighted.
- **User presence**: Colored circle avatars for each connected user on the current document. Current user has a white border.
- **Save button**: Shows "Save" (dirty, clickable), "Saving…" (in progress), or "Saved" (clean, disabled).

## Key Patterns
- **Canvas elements** are managed in a Zustand store (`canvasStore`). Elements support add, move, resize, activate, and delete operations. `activeElementId` tracks which element is in the DOM layer.
- **Sidebar** provides Rectangle, Circle, and Text element buttons. Elements can be added by clicking a sidebar button or dragging and dropping onto the canvas.
- **Text elements** support inline editing via double-click when active.
- **React Router** provides `/:documentId?` routing. The `useDocumentLoader` hook handles auto-creation and loading.
- **Zustand** manages all client-side canvas and document state. TanStack Query is available for server state when needed.
- Shared types in `@starter/shared` define the `CanvasElement` and document contracts used by both frontend and backend.

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
