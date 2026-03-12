import { describe, it, expect, beforeEach } from "vitest";
import { useCanvasStore } from "./appStore";
import type { RectElement, EllipseElement, TextElement } from "@starter/shared";

describe("Canvas Store (Zustand)", () => {
  beforeEach(() => {
    useCanvasStore.getState().resetForNewDocument();
    useCanvasStore.setState({ documentId: null });
  });

  it("should initialize with empty state", () => {
    const state = useCanvasStore.getState();
    expect(state.elements).toEqual([]);
    expect(state.selectedId).toBeNull();
    expect(state.documentId).toBeNull();
    expect(state.docName).toBe("Untitled");
    expect(state.version).toBe(0);
    expect(state.isDirty).toBe(false);
    expect(state.locks).toEqual([]);
    expect(state.userId).toBeTruthy();
  });

  it("should add an element and mark dirty", () => {
    const rect: RectElement = {
      id: "r1",
      type: "rect",
      x: 10,
      y: 20,
      width: 100,
      height: 80,
      rotation: 0,
      fill: "#6366f1",
    };
    useCanvasStore.getState().addElement(rect);
    expect(useCanvasStore.getState().elements).toHaveLength(1);
    expect(useCanvasStore.getState().isDirty).toBe(true);
  });

  it("should update an element and mark dirty", () => {
    const ellipse: EllipseElement = {
      id: "e1",
      type: "ellipse",
      x: 50,
      y: 50,
      width: 100,
      height: 100,
      rotation: 0,
      fill: "#f472b6",
    };
    useCanvasStore.getState().addElement(ellipse);
    useCanvasStore.getState().markClean();
    useCanvasStore.getState().updateElement("e1", { x: 200 });

    expect(useCanvasStore.getState().elements[0].x).toBe(200);
    expect(useCanvasStore.getState().isDirty).toBe(true);
  });

  it("should remove an element and clear selection if selected", () => {
    const text: TextElement = {
      id: "t1",
      type: "text",
      x: 10,
      y: 10,
      width: 200,
      height: 30,
      rotation: 0,
      fill: "#e2e8f0",
      text: "Hello",
      fontSize: 20,
    };
    useCanvasStore.getState().addElement(text);
    useCanvasStore.getState().setSelectedId("t1");
    useCanvasStore.getState().removeElement("t1");

    expect(useCanvasStore.getState().elements).toHaveLength(0);
    expect(useCanvasStore.getState().selectedId).toBeNull();
  });

  it("should track document id and version", () => {
    useCanvasStore.getState().setDocumentId("doc-123");
    useCanvasStore.getState().setVersion(5);

    expect(useCanvasStore.getState().documentId).toBe("doc-123");
    expect(useCanvasStore.getState().version).toBe(5);
  });

  it("should set doc name and mark dirty", () => {
    useCanvasStore.getState().setDocName("My Design");
    expect(useCanvasStore.getState().docName).toBe("My Design");
    expect(useCanvasStore.getState().isDirty).toBe(true);
  });

  it("should manage element locks", () => {
    useCanvasStore.getState().setLock("e1", "user-a");
    expect(useCanvasStore.getState().locks).toHaveLength(1);
    expect(useCanvasStore.getState().getLockOwner("e1")).toBe("user-a");

    useCanvasStore.getState().setLock("e2", "user-b");
    expect(useCanvasStore.getState().locks).toHaveLength(2);

    useCanvasStore.getState().removeLock("e1");
    expect(useCanvasStore.getState().locks).toHaveLength(1);
    expect(useCanvasStore.getState().getLockOwner("e1")).toBeNull();
  });

  it("should detect locks by other users", () => {
    const myId = useCanvasStore.getState().userId;
    useCanvasStore.getState().setLock("e1", myId);
    expect(useCanvasStore.getState().isLockedByOther("e1")).toBe(false);

    useCanvasStore.getState().setLock("e2", "other-user");
    expect(useCanvasStore.getState().isLockedByOther("e2")).toBe(true);
  });

  it("should set seq", () => {
    useCanvasStore.getState().setSeq(42);
    expect(useCanvasStore.getState().seq).toBe(42);
  });

  it("should clear all locks", () => {
    useCanvasStore.getState().setLock("e1", "user-a");
    useCanvasStore.getState().setLock("e2", "user-b");
    useCanvasStore.getState().clearLocks();
    expect(useCanvasStore.getState().locks).toEqual([]);
  });

  it("should set documentReady", () => {
    expect(useCanvasStore.getState().documentReady).toBe(false);
    useCanvasStore.getState().setDocumentReady(true);
    expect(useCanvasStore.getState().documentReady).toBe(true);
  });

  it("should increment localMutationCount on addElement", () => {
    const before = useCanvasStore.getState().localMutationCount;
    useCanvasStore.getState().addElement({
      id: "r1",
      type: "rect",
      x: 0,
      y: 0,
      width: 50,
      height: 50,
      rotation: 0,
      fill: "#000",
    });
    expect(useCanvasStore.getState().localMutationCount).toBe(before + 1);
  });

  it("should increment localMutationCount on updateElement", () => {
    useCanvasStore.getState().addElement({
      id: "r1",
      type: "rect",
      x: 0,
      y: 0,
      width: 50,
      height: 50,
      rotation: 0,
      fill: "#000",
    });
    const before = useCanvasStore.getState().localMutationCount;
    useCanvasStore.getState().updateElement("r1", { x: 200 });
    expect(useCanvasStore.getState().localMutationCount).toBe(before + 1);
  });

  it("should increment localMutationCount on removeElement", () => {
    useCanvasStore.getState().addElement({
      id: "r1",
      type: "rect",
      x: 0,
      y: 0,
      width: 50,
      height: 50,
      rotation: 0,
      fill: "#000",
    });
    const before = useCanvasStore.getState().localMutationCount;
    useCanvasStore.getState().removeElement("r1");
    expect(useCanvasStore.getState().localMutationCount).toBe(before + 1);
  });

  it("should bulk set elements with setElements", () => {
    const elements: RectElement[] = [
      { id: "a", type: "rect", x: 0, y: 0, width: 10, height: 10, rotation: 0, fill: "#f00" },
      { id: "b", type: "rect", x: 20, y: 20, width: 30, height: 30, rotation: 0, fill: "#0f0" },
    ];
    useCanvasStore.getState().setElements(elements);
    expect(useCanvasStore.getState().elements).toEqual(elements);
    expect(useCanvasStore.getState().elements).toHaveLength(2);
  });

  it("should replace existing lock when setLock is called for same element", () => {
    useCanvasStore.getState().setLock("e1", "user-a");
    useCanvasStore.getState().setLock("e1", "user-b");
    expect(useCanvasStore.getState().locks).toHaveLength(1);
    expect(useCanvasStore.getState().getLockOwner("e1")).toBe("user-b");
  });

  it("should reset for new document", () => {
    useCanvasStore.getState().addElement({
      id: "r1",
      type: "rect",
      x: 0,
      y: 0,
      width: 50,
      height: 50,
      rotation: 0,
      fill: "#000",
    });
    useCanvasStore.getState().setLock("r1", "user-a");
    useCanvasStore.getState().setSelectedId("r1");

    useCanvasStore.getState().resetForNewDocument();

    expect(useCanvasStore.getState().elements).toEqual([]);
    expect(useCanvasStore.getState().selectedId).toBeNull();
    expect(useCanvasStore.getState().locks).toEqual([]);
    expect(useCanvasStore.getState().isDirty).toBe(false);
    expect(useCanvasStore.getState().documentReady).toBe(false);
  });

  it("should initialize with empty remoteCursors", () => {
    expect(useCanvasStore.getState().remoteCursors).toEqual([]);
  });

  it("should add a remote cursor", () => {
    useCanvasStore.getState().setRemoteCursor("user-x", 100, 200);
    const cursors = useCanvasStore.getState().remoteCursors;
    expect(cursors).toHaveLength(1);
    expect(cursors[0]).toEqual({ userId: "user-x", x: 100, y: 200 });
  });

  it("should update an existing remote cursor position", () => {
    useCanvasStore.getState().setRemoteCursor("user-x", 100, 200);
    useCanvasStore.getState().setRemoteCursor("user-x", 300, 400);
    const cursors = useCanvasStore.getState().remoteCursors;
    expect(cursors).toHaveLength(1);
    expect(cursors[0]).toEqual({ userId: "user-x", x: 300, y: 400 });
  });

  it("should track multiple remote cursors", () => {
    useCanvasStore.getState().setRemoteCursor("user-a", 10, 20);
    useCanvasStore.getState().setRemoteCursor("user-b", 30, 40);
    expect(useCanvasStore.getState().remoteCursors).toHaveLength(2);
  });

  it("should remove a remote cursor by userId", () => {
    useCanvasStore.getState().setRemoteCursor("user-a", 10, 20);
    useCanvasStore.getState().setRemoteCursor("user-b", 30, 40);
    useCanvasStore.getState().removeRemoteCursor("user-a");
    const cursors = useCanvasStore.getState().remoteCursors;
    expect(cursors).toHaveLength(1);
    expect(cursors[0].userId).toBe("user-b");
  });

  it("should clear all remote cursors", () => {
    useCanvasStore.getState().setRemoteCursor("user-a", 10, 20);
    useCanvasStore.getState().setRemoteCursor("user-b", 30, 40);
    useCanvasStore.getState().clearRemoteCursors();
    expect(useCanvasStore.getState().remoteCursors).toEqual([]);
  });

  it("should clear remote cursors on resetForNewDocument", () => {
    useCanvasStore.getState().setRemoteCursor("user-a", 10, 20);
    useCanvasStore.getState().resetForNewDocument();
    expect(useCanvasStore.getState().remoteCursors).toEqual([]);
  });
});
