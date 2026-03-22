# Decisions

## Sidebar + Editor Canvas — 2025-03-16

**What**: Added an editor view with a left sidebar (palette: circle, square, text) and a canvas. Users can add elements by dragging from the sidebar onto the canvas or by clicking a palette item (adds at a fixed position); optional flow: select a tool then click the canvas to place at click position.

**Key decisions**:
- Use native HTML5 drag-and-drop (`draggable`, `dataTransfer`, `onDrop`/`onDragOver`) instead of a library to keep dependencies minimal and match the requirement.
- Store canvas state in Zustand (`canvasStore`) with normalized shape: `elementIds` + `elementsById` for O(1) lookups and stable ordering.
- Shared types (`CanvasElement`, `CanvasElementKind`) live in `@starter/shared` for potential future server persistence or collaboration.
- Clicking a palette item adds an element at a fixed position (200, 200); drag adds at drop coordinates; optional selected-tool flow places on canvas click.

**Trade-offs / alternatives considered**:
- Using a drag library (e.g. react-dnd) was rejected in favor of native DOM events per requirement.
- Keeping elements in a single array was replaced by `elementIds` + `elementsById` to support future updates/deletes by id without full array scans.

## Movable, Resizable, and Editable Text Elements — 2025-03-16

**What**: Canvas elements can now be moved by dragging, resized via corner handles when selected, and text elements can be edited in place by double-clicking.

**Key decisions**:
- Used Pointer Events (`pointermove`/`pointerup`/`pointerdown`) with `setPointerCapture` instead of mouse events for unified mouse + touch support and reliable tracking even when the pointer leaves the element.
- Selection state (`selectedElementId`) lives in `canvasStore` alongside elements; `updateElement(id, updates)` is a single generic action for position, size, and text changes.
- Each canvas element is wrapped in a positioned wrapper div that owns pointer events, selection ring, and resize handles — keeping the inner shape/text purely presentational.
- Text editing uses a native `<input>` rendered on double-click, committed on blur or Enter; empty input falls back to default "Text".
- Resize handles at all four corners with min-size constraint (20px) and center-based positioning so the opposite corner stays fixed.

**Trade-offs / alternatives considered**:
- A drag library (e.g. react-dnd, @dnd-kit) was considered but rejected to stay consistent with the native DOM approach and avoid new dependencies.
- `contentEditable` for text editing was rejected in favor of a controlled `<input>` for simpler state management and predictable blur/commit behavior.
- Edge handles (N/S/E/W) were omitted to keep the initial implementation simple; corner handles cover the primary resize use case.
