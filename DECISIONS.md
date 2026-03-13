# Decisions

## Canvas Skeleton & Basic Elements — 2026-03-13

**What**: Built the initial Canva clone skeleton with a left sidebar (rectangle, circle, text elements), a main canvas area, click-to-add and drag-to-add, and movable/resizable elements with inline text editing.

**Key decisions**:
- Native pointer events for move/resize instead of a library like react-rnd — keeps the bundle light and gives full control for future features (snapping, multi-select).
- HTML5 Drag and Drop API for sidebar-to-canvas drops — simple, no extra dependencies.
- Zustand for canvas element state — consistent with the starter template's conventions and simpler than Redux for this use case.
- Element types and defaults defined in `@starter/shared` so the server can reuse them for persistence later.

**Trade-offs / alternatives considered**:
- react-rnd or react-draggable were considered but rejected to avoid external dependencies and maintain flexibility for a custom canvas engine.

## Two-Layer Canvas Architecture — 2026-03-13

**What**: Rewrote the canvas to use two rendering layers — a native HTML `<canvas>` for static (non-interacted) elements and a DOM overlay for the single active element being moved, resized, or edited.

**Key decisions**:
- Native `<canvas>` for static elements — more performant at scale than rendering every element as a DOM node; provides a foundation for future features like zoom, pan, and export-to-image.
- Only one element in the DOM at a time — keeps the active layer minimal and avoids DOM bloat.
- Bounding-box hit-testing — simple rect containment check, sufficient for rectangles, circles, and text without pixel-perfect complexity.
- Deactivate on drag-drop (hasMoved threshold of 3px) but keep active on click-without-move — allows users to see resize handles after clicking without immediately losing selection.
- `canvasRenderer.ts` as pure functions — keeps rendering logic testable and decoupled from React.
- DPR-aware canvas rendering via `ResizeObserver` + `ctx.setTransform(dpr, ...)` for sharp rendering on retina displays.

**Trade-offs / alternatives considered**:
- Keeping all elements as DOM nodes (simpler) was rejected because it doesn't scale and prevents future canvas-native features.
- Pixel-perfect hit-testing (using `isPointInPath`) was deferred — bounding-box is sufficient for the current element types.

## Backend Persistence — 2026-03-13

**What**: Added document-based persistence with versioning, auto-save on interaction events, periodic auto-save, manual save, document switching, editable unique titles, and a document picker dropdown in the nav.

**Key decisions**:
- In-memory storage on the server — fast iteration, no database setup; sufficient for the current scope and easily replaceable with a DB later.
- Version-based saves (max 10 per document) — each save pushes a full element snapshot rather than diffs, keeping the logic simple and enabling future undo/version-history features.
- Save triggers on move-drop, resize-drop, and text-blur rather than on every mutation — avoids excessive network calls during drag operations while ensuring meaningful changes are captured immediately.
- 2-minute periodic auto-save as a safety net — catches changes from add/delete that don't trigger the specific interaction saves.
- `useDocumentLoader` hook — separates URL ↔ document synchronization from the canvas/nav logic. Uses a `loadedIdRef` to track which document was last fetched, preventing duplicate loads while allowing document switches.
- Unique document naming enforced server-side — auto-incrementing "Untitled (X)" for new documents, 409 rejection for rename conflicts. Keeps naming logic centralized.
- Enter key blurs the title input rather than calling commit directly — ensures a single code path through `onBlur` and prevents race conditions from double commits.

**Trade-offs / alternatives considered**:
- WebSocket-based real-time sync was deferred — REST is sufficient for single-user persistence and simpler to implement. *(Replaced by Multi-User Support, which implemented Socket.IO for real-time collaboration.)*
- Debounced auto-save on every element change was considered but rejected — would create too many versions and network calls during active manipulation.
- Client-side localStorage caching was deferred — the server provides persistence and the 2-minute interval is a sufficient safety net.

## Undo/Redo via Version History — 2026-03-13

**What**: Implemented version-based undo/redo that fetches previous versions from the server, with branching semantics where new edits after undo truncate future versions.

**Key decisions**:
- Server-fetched versions rather than client-side state snapshots — leverages the existing version array, keeps the client lightweight, and ensures undo/redo works across page reloads.
- `afterVersionId` on the save endpoint for branching — when saving after undo, the server truncates all versions after the specified one before appending. This gives git-like branching behavior: undo twice then edit replaces the undone versions.
- Undo when dirty discards unsaved changes first (reloads current saved version) rather than going to the previous version — prevents accidental loss of the ability to see the last-saved state.
- Redo disabled when dirty — prevents ambiguity about what "redo" means when there are unsaved local changes.
- `addElement` and `deleteElement` auto-save immediately — ensures every structural change creates a version that can be undone, not just move/resize/text-edit operations.
- `VersionMeta` (versionId + savedAt, no elements) stored client-side — lightweight tracking of the version history without duplicating element data in memory.

**Trade-offs / alternatives considered**:
- Client-side undo stack (storing element snapshots in memory) was considered — rejected because the server already stores versions and this approach works naturally with persistence and page reloads.
- Fetching the full document on undo/redo (instead of a single version) was considered — rejected for efficiency; `GET /versions/:versionId` returns only the needed version's elements.

## Multi-User Support — 2026-03-13

**What**: Added real-time multi-user collaboration using Socket.IO. Each browser session is a unique user. Documents are synced via socket rooms with save broadcasts. User presence is shown as colored avatars in the TopNav.

**Key decisions**:
- Session-based identity (no auth) — each socket connection gets a UUID, display name, and color. Simple and sufficient for the current scope.
- REST for initial document load, sockets for everything after — avoids reimplementing the full document fetch protocol over sockets while getting real-time sync for ongoing changes.
- Save via socket with ack — the originator emits `save-document`, the server persists and acks with `{ versionId, savedAt }`, then broadcasts `elements-updated` to other room members. Only the originator triggers a save; receivers update their local state without setting `isDirty` (prevents save loops).
- Separate `socket.ts` and `socketListeners.ts` modules — avoids circular dependencies between the socket client (imported by canvasStore for emit) and the listeners (which import canvasStore for state updates).
- Room naming convention `doc:<documentId>` — simple, collision-free namespace for document-scoped broadcasts.
- Full element array broadcast (not diffs) — consistent with the existing version-based persistence model. Simpler than operational transforms or CRDTs, with last-write-wins semantics.

**Trade-offs / alternatives considered**:
- OT (Operational Transform) or CRDTs were considered for conflict resolution — deferred as overly complex for the current scope. Last-write-wins with full-state broadcast is sufficient for basic collaboration.
- Broadcasting element updates on every pointer move during drag (for real-time cursor tracking) was considered — deferred to keep network traffic low. Updates are broadcast only on save events.
- Persisting user sessions in a database was considered — deferred since in-memory tracking is sufficient and users are ephemeral (no auth).
