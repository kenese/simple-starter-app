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
});
