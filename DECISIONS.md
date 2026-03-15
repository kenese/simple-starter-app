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
