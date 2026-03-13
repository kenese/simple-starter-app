# Feature Specifications

Detailed specs for each feature in the Canva/Figma clone. Use these as prompts when building or extending features.

---

## Feature 1: Canvas Skeleton & Basic Elements

**Goal:** Replace any starter UI (e.g., counter) with a design canvas that supports shapes and basic manipulation.

**Requirements:**

1. **Canvas component**
   - Main editing area where elements are placed and manipulated
   - Support move, resize, and rotate for all element types
   - Click to select an element; show resize handles when selected
   - Delete/Backspace key removes the selected element
   - Click empty space to deselect

2. **Element types**
   - **Rectangle** — rounded rect with default size (e.g., 150×100)
   - **Circle/Ellipse** — oval shape (e.g., 120×120)
   - **Text** — text box with editable content; double-click when selected to edit inline

3. **Sidebar**
   - Buttons for Rectangle, Circle, Text
   - Clicking a button adds that element to the canvas at a default or random position
   - Each element gets a unique UUID

4. **State**
   - Zustand store for elements array, selection (`activeElementId`), and CRUD operations
   - No server persistence yet — local state only

5. **Technical constraints**
   - Use native pointer events or a lightweight canvas library (e.g., react-konva, or native `<canvas>`)
   - Define element types in `@starter/shared` for reuse by server later
   - Keep dark theme and TopNav layout

**Suggested prompt:**  
"Implement a design canvas with a sidebar. Add Rectangle, Circle, and Text elements. Support move, resize, rotate, and inline text editing. Use Zustand for state. Define element types in shared package."

---

## Feature 2: Backend Persistence (Document CRUD, Versioning)

**Goal:** Persist canvas elements to the backend as versioned documents.

**Requirements:**

1. **Document model**
   - Each document has: `id`, `name`, array of versions (max 10)
   - Each version: `versionId`, `elements` snapshot, `savedAt` timestamp
   - Support any number of documents (types must allow multiple docs)

2. **REST API**
   - `GET /api/documents` — list all document metadata (id, name, timestamps)
   - `POST /api/documents` — create new document (auto-generate unique name)
   - `GET /api/documents/:id` — fetch full document (latest version) or auto-create if missing
   - `PUT /api/documents/:id` — save elements as new version; trim to 10 versions
   - Optional: `GET /api/documents/:id/versions/:versionId` for undo/redo

3. **Client**
   - Auto-generate document ID on first load (e.g., UUID)
   - Save button in TopNav; show dirty/saving/saved state
   - Save triggers: move-drop, resize-drop, text-blur, add element, delete element
   - Optional: 2-minute periodic auto-save as safety net

4. **Technical constraints**
   - In-memory storage on server (no DB required for MVP)
   - React Query or similar for fetch/save; Zustand for local canvas state

**Suggested prompt:**  
"Add document persistence. REST API: list, create, get, save. Each save creates a new version; keep last 10. Client: Save button, dirty tracking, auto-save on move/resize/text-blur. In-memory server store."

---

## Feature 3: Two-Layer Canvas Architecture

**Goal:** Improve performance and control by separating static rendering from active interaction.

**Requirements:**

1. **Static layer**
   - Native HTML `<canvas>` (Canvas 2D API) for all elements NOT being interacted with
   - Redraw when elements change or active element changes
   - DPR-aware for sharp rendering on retina

2. **Active layer**
   - DOM overlay for the single element being moved, resized, or text-edited
   - Overlay has `pointer-events: none`; only the active element accepts events
   - Resize handles visible when element is selected

3. **Interaction flow**
   - Click on static canvas → hit-test → activate element (move to DOM layer)
   - Drag to move/resize → on drop (with movement threshold ~3px) → deactivate, save
   - Click without move → element stays active (handles visible)
   - Click empty / Escape → deactivate
   - Double-click text → edit mode → blur/Enter → deactivate, save

4. **Technical constraints**
   - Pure `canvasRenderer.ts` for draw/hit-test; keep logic testable
   - Bounding-box hit-test sufficient for rect, circle, text

**Suggested prompt:**  
"Refactor canvas to two layers: static native canvas for non-active elements, DOM overlay for the single active element. Hit-test on click, deactivate on drag-drop. Use canvasRenderer utility for draw and hit-test."

---

## Feature 4: Multi-Documents (Routing, Doc Picker, New Doc)

**Goal:** Support multiple documents with URL-based routing and switching.

**Requirements:**

1. **Routing**
   - Route: `/:documentId?`
   - No documentId → redirect to new UUID (create fresh document)

2. **Document picker**
   - Dropdown in sidebar or TopNav listing all documents (from `GET /api/documents`)
   - "+ New Document" button → navigate to new UUID
   - Active document highlighted

3. **Document lifecycle**
   - Switching documents: leave current, load new, reset canvas state
   - Unsaved docs show as "Untitled (new)" or similar in picker

4. **Technical constraints**
   - Use route param as source of truth for documentId
   - `useDocumentLoader` or similar hook for URL ↔ document sync

**Suggested prompt:**  
"Add routing `/:documentId`. Redirect `/` to new UUID. Document dropdown in sidebar with '+ New' button. Reset canvas when switching docs. Fetch list from GET /api/documents."

---

## Feature 5: Document Naming (Unique Names, Editable Titles)

**Goal:** Allow users to name documents; enforce uniqueness.

**Requirements:**

1. **Server**
   - Auto-generate default names: "Untitled", "Untitled (2)", "Untitled (3)", etc.
   - Reject duplicate names on rename (409 Conflict)
   - `PATCH /api/documents/:id` for rename

2. **Client**
   - Inline-editable document name in TopNav (click to edit)
   - Enter or blur commits; Escape cancels
   - Show error tooltip on duplicate name (409)

3. **Technical constraints**
   - Unique names enforced server-side only

**Suggested prompt:**  
"Add unique document names. Server: auto-generate 'Untitled (N)', 409 on duplicate rename. Client: inline-editable title in TopNav, error on conflict."

---

## Feature 6: Undo/Redo via Version History

**Goal:** Version-based undo/redo using server-stored history.

**Requirements:**

1. **Undo**
   - Cmd+Z / Ctrl+Z
   - If dirty: discard unsaved changes, reload current saved version
   - Else: load previous version from server

2. **Redo**
   - Cmd+Shift+Z / Ctrl+Shift+Z
   - Load next version from server
   - Disabled when dirty or at latest version

3. **Branching**
   - Editing after undo truncates future versions
   - Save sends `afterVersionId`; server drops versions after that before appending

4. **API**
   - `GET /api/documents/:id/versions/:versionId` — fetch specific version's elements
   - `PUT` accepts `afterVersionId` for truncation

5. **UI**
   - Undo/Redo buttons in TopNav; disabled when not applicable
   - Keyboard shortcuts

**Suggested prompt:**  
"Implement undo/redo via server version history. Undo: reload previous version; redo: next version. Branching: after undo, new save truncates future versions. Add afterVersionId to save API."

---

## Feature 7: Multi-User Support (Socket.IO, Real-Time Sync)

**Goal:** Multiple users can edit the same document in real time.

**Requirements:**

1. **User identity**
   - Session-based (no auth): each socket connection = unique user
   - Assign UUID, display name ("User 1", "User 2", …), color

2. **Document rooms**
   - Socket.IO: join room `doc:<documentId>` when loading document
   - Leave room when switching documents

3. **Sync flow**
   - **Initial load:** REST `GET /api/documents/:id` (unchanged)
   - **Connect:** Join socket before fetching document
   - **Buffer:** Queue socket updates until REST document arrives
   - **Gate:** Discard socket updates with version/seq ≤ REST version
   - **Save:** Emit via socket; server persists and broadcasts to other room members
   - **Live updates:** `update-elements` for real-time changes (no version bump); `save-document` for explicit saves (version bump)

4. **Sequence vs version**
   - `seq` — increments on every change (live + save); used for ordering/deduplication
   - `version` — increments only on explicit Save; used for history

5. **Locking**
   - Lock only during active interaction: drag, resize, text editing
   - Lock on drag start; unlock on drag end
   - Lock on transform start; unlock on transform end
   - Lock on text focus; unlock on blur
   - Show visual indicator (e.g., amber dashed border) for locked elements

6. **Presence**
   - Display connected users as colored avatars in TopNav
   - Current user distinguished (e.g., white border)

7. **Technical constraints**
   - Use `localMutationCount` or similar to avoid broadcast loops (only broadcast when local user changes elements, not when applying remote updates)

**Suggested prompt:**  
"Add multi-user: Socket.IO rooms per document. Session-based users. Connect before REST fetch; buffer socket updates; gate by version/seq. Save via socket. Live updates (update-elements) separate from versioned saves. Lock only during drag/resize/text-edit. User presence in TopNav."

---

## Summary: Prompt Improvements

| Original prompt | Improved prompt |
|-----------------|-----------------|
| "Continue" / "Yes continue" | Use the **Suggested prompt** above for each feature |
| "Do feature 4" | "Implement Feature 7: Multi-User Support (see FEATURES.md)" |
| "Add the ability to add a name..." | "Implement Feature 5: Document Naming (see FEATURES.md)" |

**Recommendation:** When starting a new feature, attach `@FEATURES.md` and specify the feature name or number. Include any scope constraints (e.g., "skip presence for now") in the same message.
