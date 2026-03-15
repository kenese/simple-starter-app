## Design Canvas Foundation — 2026-03-15

**What**: Replaced the starter counter template with a design editor shell that provides a sidebar and a central canvas. Users can add rectangle, circle, and text input elements by clicking a sidebar tool or dragging a tool onto the canvas.

**Key decisions**:
- Store canvas elements in the existing Zustand app store to keep editor interactions local, predictable, and easy to extend.
- Remove counter REST handlers and shared counter types entirely so the codebase reflects the design-editor baseline without unused template behavior.
- Support both click-to-add and drag-to-add interactions to establish the core creation UX expected in a canvas editor.

**Trade-offs / alternatives considered**:
- Kept element interactions to creation and text editing only, deferring move/resize/select logic to future sprints to keep scope focused.
- Left `@starter/shared` as a placeholder export for now instead of introducing premature shared contracts before persistence/versioning is implemented.

## Document Persistence And Versioned Routing — 2026-03-15

**What**: Added URL-based document routing and backend persistence so each document loads by `/:documentId` and each save creates a versioned snapshot. The backend now retains the latest 10 versions for each document.

**Key decisions**:
- Use route-driven document identity (`/:documentId`) so refresh/share semantics are simple and deterministic.
- Store full design snapshots per save to keep version history immutable and straightforward to restore.
- Keep persistence in-memory for this sprint to optimize implementation speed while validating end-to-end save/load/version flow.

**Trade-offs / alternatives considered**:
- Chose backend-managed version trimming to 10 rather than client-side pruning, ensuring consistent retention across all clients.
- Deferred adding a persistent database layer until after document/version behavior is validated in interview flow.

## Normalized Canvas Store State — 2026-03-15

**What**: Changed the editor's Zustand canvas state from a flat `elements` array to a normalized model using `elementIds` plus `elementsById`.

**Key decisions**:
- Keep render/save ordering with `elementIds` while enabling O(1) item access and updates through `elementsById`.
- Preserve existing load/save API contracts (`DesignElement[]`) by converting normalized state to ordered arrays only at document boundaries.
- Update editor and tests to consume normalized state directly rather than relying on a global array field.

**Trade-offs / alternatives considered**:
- This introduces small conversion helpers, but avoids full-array scans/maps for single-element commits in large documents.
- A fully selector-per-element rendering model was deferred to keep this refactor scoped and low risk.

## Per-Element Selector Rendering — 2026-03-15

**What**: Moved per-element store selection into `CanvasElement`, so each rendered element subscribes to its own `elementsById[id]` slice instead of `Editor` subscribing to the full element map.

**Key decisions**:
- Keep `Editor` responsible for ordering (`elementIds`) and interaction state only.
- Move per-element data reads to memoized `CanvasElement` instances with id-scoped Zustand selectors.
- Preserve existing interaction callback contracts to keep behavior unchanged while tightening render boundaries.

**Trade-offs / alternatives considered**:
- Increases `CanvasElement` coupling to the store, but avoids extra wrapper components while preserving scoped updates.
- A deeper split by tool/content type was unnecessary at this stage and would add component complexity.

## Throttle Pointer Writes with requestAnimationFrame — 2026-03-15

**What**: During move/resize interactions, pointer move updates are applied to the DOM at most once per display frame via `requestAnimationFrame`, instead of on every `pointermove` event.

**Key decisions**:
- Store the latest pointer position in a ref (`pendingPointerRef`) and schedule a single rAF; further moves only update the ref until the next frame.
- Use an interaction snapshot ref so the rAF callback can compute and apply the update without relying on React state.
- On pointer up, cancel any scheduled rAF and call the apply logic once synchronously so the final position is committed correctly before reading preview refs.

**Trade-offs / alternatives considered**:
- Keeps drag/resize smooth on high-polling input devices while avoiding redundant style writes; adds a small amount of ref/callback structure in the pointer effect.
