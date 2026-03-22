import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("./canvasDB", () => ({
    saveSnapshot: vi.fn(() => Promise.resolve()),
    loadSnapshot: vi.fn(() => Promise.resolve(null)),
}));

import { useCanvasStore } from "./canvasStore";
import { saveSnapshot, loadSnapshot } from "./canvasDB";

const mockedSaveSnapshot = vi.mocked(saveSnapshot);
const mockedLoadSnapshot = vi.mocked(loadSnapshot);

describe("canvasStore", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        useCanvasStore.setState({
            elementIds: [],
            elementsById: {},
            versionHistory: [],
            selectedTool: null,
            selectedElementId: null,
            hydrated: true,
        });
    });

    it("initializes with no elements and no selected tool", () => {
        const state = useCanvasStore.getState();
        expect(state.elementIds).toEqual([]);
        expect(state.elementsById).toEqual({});
        expect(state.selectedTool).toBeNull();
    });

    it("addElement adds a circle with correct shape and position", () => {
        const { addElement } = useCanvasStore.getState();
        addElement("circle", 100, 50);

        const state = useCanvasStore.getState();
        expect(state.elementIds).toHaveLength(1);
        const id = state.elementIds[0];
        const el = state.elementsById[id];
        expect(el).toBeDefined();
        expect(el.kind).toBe("circle");
        expect(el.x).toBe(100);
        expect(el.y).toBe(50);
        expect(el.width).toBe(80);
        expect(el.height).toBe(80);
    });

    it("addElement adds a square with correct shape and position", () => {
        const { addElement } = useCanvasStore.getState();
        addElement("square", 200, 150);

        const state = useCanvasStore.getState();
        expect(state.elementIds).toHaveLength(1);
        const el = Object.values(state.elementsById)[0];
        expect(el.kind).toBe("square");
        expect(el.x).toBe(200);
        expect(el.y).toBe(150);
    });

    it("addElement adds text with default text and dimensions", () => {
        const { addElement } = useCanvasStore.getState();
        addElement("text", 0, 0);

        const state = useCanvasStore.getState();
        const el = Object.values(state.elementsById)[0];
        expect(el.kind).toBe("text");
        expect(el.text).toBe("Text");
        expect(el.width).toBe(120);
        expect(el.height).toBe(32);
    });

    it("addElement assigns unique ids", () => {
        const { addElement } = useCanvasStore.getState();
        addElement("circle", 0, 0);
        addElement("circle", 10, 10);

        const state = useCanvasStore.getState();
        expect(state.elementIds).toHaveLength(2);
        expect(new Set(state.elementIds).size).toBe(2);
    });

    it("setSelectedTool updates selected tool", () => {
        const { setSelectedTool } = useCanvasStore.getState();
        setSelectedTool("circle");
        expect(useCanvasStore.getState().selectedTool).toBe("circle");

        setSelectedTool("text");
        expect(useCanvasStore.getState().selectedTool).toBe("text");

        setSelectedTool(null);
        expect(useCanvasStore.getState().selectedTool).toBeNull();
    });

    it("setSelectedElement selects and clears", () => {
        const { addElement, setSelectedElement } = useCanvasStore.getState();
        addElement("circle", 50, 50);
        const id = useCanvasStore.getState().elementIds[0];

        setSelectedElement(id);
        expect(useCanvasStore.getState().selectedElementId).toBe(id);

        setSelectedElement(null);
        expect(useCanvasStore.getState().selectedElementId).toBeNull();
    });

    it("updateElement updates position", () => {
        const { addElement, updateElement } = useCanvasStore.getState();
        addElement("circle", 50, 50);
        const id = useCanvasStore.getState().elementIds[0];

        updateElement(id, { x: 100, y: 80 });
        const el = useCanvasStore.getState().elementsById[id];
        expect(el.x).toBe(100);
        expect(el.y).toBe(80);
        expect(el.kind).toBe("circle");
    });

    it("updateElement updates size", () => {
        const { addElement, updateElement } = useCanvasStore.getState();
        addElement("square", 10, 10);
        const id = useCanvasStore.getState().elementIds[0];

        updateElement(id, { width: 200, height: 150 });
        const el = useCanvasStore.getState().elementsById[id];
        expect(el.width).toBe(200);
        expect(el.height).toBe(150);
    });

    it("updateElement updates text", () => {
        const { addElement, updateElement } = useCanvasStore.getState();
        addElement("text", 0, 0);
        const id = useCanvasStore.getState().elementIds[0];

        updateElement(id, { text: "New value" });
        expect(useCanvasStore.getState().elementsById[id].text).toBe("New value");
    });

    it("updateElement is a no-op for unknown id", () => {
        const { updateElement } = useCanvasStore.getState();
        const before = useCanvasStore.getState();
        updateElement("nonexistent", { x: 999 });
        expect(useCanvasStore.getState()).toBe(before);
    });

    it("updateElement preserves other elements", () => {
        const { addElement, updateElement } = useCanvasStore.getState();
        addElement("circle", 10, 10);
        addElement("square", 20, 20);
        const [id1, id2] = useCanvasStore.getState().elementIds;

        updateElement(id1, { x: 999 });
        expect(useCanvasStore.getState().elementsById[id2].x).toBe(20);
    });

    it("saveVersion pushes current state to versionHistory", () => {
        const { addElement, saveVersion } = useCanvasStore.getState();
        addElement("circle", 50, 50);
        const id = useCanvasStore.getState().elementIds[0];

        saveVersion();
        const state = useCanvasStore.getState();
        expect(state.versionHistory).toHaveLength(1);
        expect(state.versionHistory[0].elementIds).toEqual([id]);
        expect(state.versionHistory[0].elementsById[id].x).toBe(50);
        expect(state.versionHistory[0].elementsById[id].y).toBe(50);
    });

    it("saveVersion keeps at most 10 versions", () => {
        const { addElement, saveVersion } = useCanvasStore.getState();
        addElement("circle", 0, 0);

        for (let i = 0; i < 15; i++) {
            saveVersion();
        }
        expect(useCanvasStore.getState().versionHistory).toHaveLength(10);
    });

    it("versionHistory snapshots are independent of current state", () => {
        const { addElement, updateElement, saveVersion } = useCanvasStore.getState();
        addElement("circle", 10, 10);
        const id = useCanvasStore.getState().elementIds[0];
        saveVersion();

        updateElement(id, { x: 999, y: 888 });
        expect(useCanvasStore.getState().versionHistory[0].elementsById[id].x).toBe(10);
        expect(useCanvasStore.getState().versionHistory[0].elementsById[id].y).toBe(10);
    });

    it("saveVersion persists snapshot to IndexedDB", () => {
        const { addElement, saveVersion } = useCanvasStore.getState();
        addElement("circle", 50, 50);
        const id = useCanvasStore.getState().elementIds[0];

        saveVersion();

        expect(mockedSaveSnapshot).toHaveBeenCalledTimes(1);
        const saved = mockedSaveSnapshot.mock.calls[0][0];
        expect(saved.elementIds).toEqual([id]);
        expect(saved.elementsById[id].x).toBe(50);
    });

    it("hydrate restores state from IndexedDB", async () => {
        const snapshot = {
            elementIds: ["abc"],
            elementsById: {
                abc: { id: "abc", kind: "square" as const, x: 10, y: 20, width: 80, height: 80 },
            },
        };
        mockedLoadSnapshot.mockResolvedValueOnce(snapshot);

        useCanvasStore.setState({ hydrated: false });
        await useCanvasStore.getState().hydrate();

        const state = useCanvasStore.getState();
        expect(state.elementIds).toEqual(["abc"]);
        expect(state.elementsById["abc"].x).toBe(10);
        expect(state.hydrated).toBe(true);
    });

    it("hydrate sets hydrated true even when no saved data", async () => {
        mockedLoadSnapshot.mockResolvedValueOnce(null);

        useCanvasStore.setState({ hydrated: false });
        await useCanvasStore.getState().hydrate();

        const state = useCanvasStore.getState();
        expect(state.elementIds).toEqual([]);
        expect(state.hydrated).toBe(true);
    });
});
