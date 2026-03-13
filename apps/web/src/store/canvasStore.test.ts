import { describe, it, expect, beforeEach, vi } from "vitest";
import { useCanvasStore } from "./canvasStore";

vi.mock("uuid", () => ({
    v4: vi
        .fn()
        .mockReturnValueOnce("id-1")
        .mockReturnValueOnce("id-2")
        .mockReturnValueOnce("id-3")
        .mockReturnValue("id-fallback"),
}));

vi.mock("../api/documents", () => ({
    getDocument: vi.fn(),
    getVersion: vi.fn(),
    saveDocument: vi.fn(),
    createDocument: vi.fn(),
    renameDocument: vi.fn(),
}));

vi.mock("../socket", () => ({
    joinDocument: vi.fn(),
    leaveDocument: vi.fn(),
    emitSaveDocument: vi.fn().mockResolvedValue({ versionId: "mock-vid", savedAt: "mock-time" }),
}));

import * as api from "../api/documents";
import { emitSaveDocument } from "../socket";

function resetStore() {
    useCanvasStore.setState({
        documentId: null,
        documentName: null,
        versionId: null,
        elements: [],
        activeElementId: null,
        isDirty: false,
        isSaving: false,
        lastSavedAt: null,
        versionHistory: [],
        currentVersionIndex: -1,
        isUndoRedoLoading: false,
        currentUser: null,
        connectedUsers: [],
    });
}

describe("canvasStore", () => {
    beforeEach(() => {
        resetStore();
        vi.clearAllMocks();
    });

    // ── addElement ───────────────────────────────────────────────

    describe("addElement", () => {
        it("adds a rectangle with default size", () => {
            useCanvasStore.getState().addElement("rectangle", 200, 150);
            const { elements } = useCanvasStore.getState();
            expect(elements).toHaveLength(1);
            expect(elements[0].type).toBe("rectangle");
            expect(elements[0].width).toBe(150);
            expect(elements[0].height).toBe(100);
        });

        it("centers element at provided coordinates", () => {
            useCanvasStore.getState().addElement("rectangle", 200, 150);
            const el = useCanvasStore.getState().elements[0];
            expect(el.x).toBe(200 - 150 / 2);
            expect(el.y).toBe(150 - 100 / 2);
        });

        it("adds a circle with correct default size", () => {
            useCanvasStore.getState().addElement("circle", 300, 300);
            const el = useCanvasStore.getState().elements[0];
            expect(el.type).toBe("circle");
            expect(el.width).toBe(120);
            expect(el.height).toBe(120);
        });

        it("adds a text element with default content", () => {
            useCanvasStore.getState().addElement("text", 100, 100);
            const el = useCanvasStore.getState().elements[0];
            expect(el.type).toBe("text");
            expect(el.content).toBe("Text");
            expect(el.width).toBe(200);
            expect(el.height).toBe(40);
        });

        it("sets the new element as active", () => {
            useCanvasStore.getState().addElement("rectangle", 100, 100);
            const { activeElementId, elements } = useCanvasStore.getState();
            expect(activeElementId).toBe(elements[0].id);
        });

        it("marks the store as dirty", () => {
            useCanvasStore.getState().addElement("rectangle", 100, 100);
            expect(useCanvasStore.getState().isDirty).toBe(true);
        });

        it("appends to existing elements", () => {
            useCanvasStore.getState().addElement("rectangle", 100, 100);
            useCanvasStore.getState().addElement("circle", 200, 200);
            expect(useCanvasStore.getState().elements).toHaveLength(2);
        });
    });

    // ── updateElement ────────────────────────────────────────────

    describe("updateElement", () => {
        beforeEach(() => {
            useCanvasStore.setState({
                elements: [
                    {
                        id: "el-a",
                        type: "rectangle",
                        x: 10,
                        y: 20,
                        width: 100,
                        height: 50,
                    },
                    {
                        id: "el-b",
                        type: "circle",
                        x: 200,
                        y: 200,
                        width: 80,
                        height: 80,
                    },
                ],
                activeElementId: null,
            });
        });

        it("updates position of targeted element", () => {
            useCanvasStore.getState().updateElement("el-a", { x: 50, y: 60 });
            const el = useCanvasStore
                .getState()
                .elements.find((e) => e.id === "el-a")!;
            expect(el.x).toBe(50);
            expect(el.y).toBe(60);
            expect(el.width).toBe(100);
        });

        it("updates size of targeted element", () => {
            useCanvasStore
                .getState()
                .updateElement("el-a", { width: 300, height: 200 });
            const el = useCanvasStore
                .getState()
                .elements.find((e) => e.id === "el-a")!;
            expect(el.width).toBe(300);
            expect(el.height).toBe(200);
        });

        it("does not affect other elements", () => {
            useCanvasStore.getState().updateElement("el-a", { x: 999 });
            const other = useCanvasStore
                .getState()
                .elements.find((e) => e.id === "el-b")!;
            expect(other.x).toBe(200);
        });

        it("updates content for text elements", () => {
            useCanvasStore.setState({
                elements: [
                    {
                        id: "el-t",
                        type: "text",
                        x: 0,
                        y: 0,
                        width: 200,
                        height: 40,
                        content: "Old",
                    },
                ],
            });
            useCanvasStore
                .getState()
                .updateElement("el-t", { content: "New" });
            expect(
                useCanvasStore.getState().elements.find((e) => e.id === "el-t")!
                    .content
            ).toBe("New");
        });
    });

    // ── activateElement ──────────────────────────────────────────

    describe("activateElement", () => {
        it("sets activeElementId", () => {
            useCanvasStore.getState().activateElement("some-id");
            expect(useCanvasStore.getState().activeElementId).toBe("some-id");
        });

        it("clears activeElementId with null", () => {
            useCanvasStore.getState().activateElement("some-id");
            useCanvasStore.getState().activateElement(null);
            expect(useCanvasStore.getState().activeElementId).toBeNull();
        });

        it("switches to a different element", () => {
            useCanvasStore.getState().activateElement("a");
            useCanvasStore.getState().activateElement("b");
            expect(useCanvasStore.getState().activeElementId).toBe("b");
        });
    });

    // ── deleteElement ────────────────────────────────────────────

    describe("deleteElement", () => {
        beforeEach(() => {
            useCanvasStore.setState({
                elements: [
                    {
                        id: "del-1",
                        type: "rectangle",
                        x: 0,
                        y: 0,
                        width: 50,
                        height: 50,
                    },
                    {
                        id: "del-2",
                        type: "circle",
                        x: 100,
                        y: 100,
                        width: 60,
                        height: 60,
                    },
                ],
                activeElementId: "del-1",
            });
        });

        it("removes the element from the array", () => {
            useCanvasStore.getState().deleteElement("del-1");
            const ids = useCanvasStore
                .getState()
                .elements.map((e) => e.id);
            expect(ids).toEqual(["del-2"]);
        });

        it("clears activeElementId when the active element is deleted", () => {
            useCanvasStore.getState().deleteElement("del-1");
            expect(useCanvasStore.getState().activeElementId).toBeNull();
        });

        it("marks the store as dirty", () => {
            useCanvasStore.getState().deleteElement("del-1");
            expect(useCanvasStore.getState().isDirty).toBe(true);
        });

        it("keeps activeElementId when a different element is deleted", () => {
            useCanvasStore.getState().deleteElement("del-2");
            expect(useCanvasStore.getState().activeElementId).toBe("del-1");
        });

        it("handles deleting non-existent id gracefully", () => {
            useCanvasStore.getState().deleteElement("nope");
            expect(useCanvasStore.getState().elements).toHaveLength(2);
        });
    });

    // ── markDirty ────────────────────────────────────────────────

    describe("markDirty", () => {
        it("sets isDirty to true", () => {
            expect(useCanvasStore.getState().isDirty).toBe(false);
            useCanvasStore.getState().markDirty();
            expect(useCanvasStore.getState().isDirty).toBe(true);
        });
    });

    // ── loadDocument ─────────────────────────────────────────────

    describe("loadDocument", () => {
        it("loads document data into the store", async () => {
            vi.mocked(api.getDocument).mockResolvedValue({
                id: "doc-1",
                name: "Test Doc",
                versions: [
                    {
                        versionId: "v1",
                        elements: [
                            { id: "e1", type: "rectangle", x: 10, y: 20, width: 100, height: 50 },
                        ],
                        savedAt: "2026-01-01T00:00:00.000Z",
                    },
                ],
                createdAt: "2026-01-01T00:00:00.000Z",
                updatedAt: "2026-01-01T00:00:00.000Z",
            });

            await useCanvasStore.getState().loadDocument("doc-1");
            const state = useCanvasStore.getState();
            expect(state.documentId).toBe("doc-1");
            expect(state.documentName).toBe("Test Doc");
            expect(state.versionId).toBe("v1");
            expect(state.elements).toHaveLength(1);
            expect(state.isDirty).toBe(false);
            expect(state.activeElementId).toBeNull();
        });

        it("loads latest version when multiple exist", async () => {
            vi.mocked(api.getDocument).mockResolvedValue({
                id: "doc-2",
                name: "Multi",
                versions: [
                    { versionId: "v1", elements: [], savedAt: "2026-01-01T00:00:00.000Z" },
                    {
                        versionId: "v2",
                        elements: [
                            { id: "e2", type: "circle", x: 0, y: 0, width: 80, height: 80 },
                        ],
                        savedAt: "2026-01-02T00:00:00.000Z",
                    },
                ],
                createdAt: "2026-01-01T00:00:00.000Z",
                updatedAt: "2026-01-02T00:00:00.000Z",
            });

            await useCanvasStore.getState().loadDocument("doc-2");
            const state = useCanvasStore.getState();
            expect(state.versionId).toBe("v2");
            expect(state.elements).toHaveLength(1);
            expect(state.elements[0].id).toBe("e2");
        });
    });

    // ── saveDocument ─────────────────────────────────────────────

    describe("saveDocument", () => {
        it("saves and clears dirty flag", async () => {
            vi.mocked(emitSaveDocument).mockResolvedValue({
                versionId: "v-new",
                savedAt: "2026-01-01T00:00:00.000Z",
            });
            useCanvasStore.setState({
                documentId: "doc-1",
                isDirty: true,
                elements: [],
                versionHistory: [{ versionId: "v0", savedAt: "t" }],
                currentVersionIndex: 0,
            });

            await useCanvasStore.getState().saveDocument();
            const state = useCanvasStore.getState();
            expect(state.isDirty).toBe(false);
            expect(state.isSaving).toBe(false);
            expect(state.versionId).toBe("v-new");
        });

        it("does not save when not dirty", async () => {
            useCanvasStore.setState({ documentId: "doc-1", isDirty: false });
            await useCanvasStore.getState().saveDocument();
            expect(emitSaveDocument).not.toHaveBeenCalled();
        });

        it("does not save when no documentId", async () => {
            useCanvasStore.setState({ documentId: null, isDirty: true });
            await useCanvasStore.getState().saveDocument();
            expect(emitSaveDocument).not.toHaveBeenCalled();
        });
    });

    // ── createDocument ───────────────────────────────────────────

    describe("createDocument", () => {
        it("creates a document and sets store state", async () => {
            vi.mocked(api.createDocument).mockResolvedValue({
                id: "new-doc",
                name: "Untitled",
                versions: [
                    { versionId: "v0", elements: [], savedAt: "2026-01-01T00:00:00.000Z" },
                ],
                createdAt: "2026-01-01T00:00:00.000Z",
                updatedAt: "2026-01-01T00:00:00.000Z",
            });

            const id = await useCanvasStore.getState().createDocument();
            expect(id).toBe("new-doc");
            const state = useCanvasStore.getState();
            expect(state.documentId).toBe("new-doc");
            expect(state.documentName).toBe("Untitled");
            expect(state.elements).toEqual([]);
            expect(state.isDirty).toBe(false);
        });
    });

    // ── renameDocument ───────────────────────────────────────────

    describe("renameDocument", () => {
        it("renames the current document", async () => {
            vi.mocked(api.renameDocument).mockResolvedValue({
                id: "doc-1",
                name: "New Name",
            });
            useCanvasStore.setState({
                documentId: "doc-1",
                documentName: "Old Name",
            });

            await useCanvasStore.getState().renameDocument("New Name");
            expect(useCanvasStore.getState().documentName).toBe("New Name");
            expect(api.renameDocument).toHaveBeenCalledWith("doc-1", "New Name");
        });

        it("does nothing without a documentId", async () => {
            useCanvasStore.setState({ documentId: null });
            await useCanvasStore.getState().renameDocument("Name");
            expect(api.renameDocument).not.toHaveBeenCalled();
        });
    });

    // ── resetCanvas ──────────────────────────────────────────────

    describe("resetCanvas", () => {
        it("clears all state including version history", () => {
            useCanvasStore.setState({
                documentId: "doc-1",
                documentName: "Test",
                versionId: "v1",
                elements: [{ id: "e1", type: "rectangle", x: 0, y: 0, width: 50, height: 50 }],
                activeElementId: "e1",
                isDirty: true,
                isSaving: true,
                lastSavedAt: "2026-01-01",
                versionHistory: [{ versionId: "v1", savedAt: "2026-01-01" }],
                currentVersionIndex: 0,
                isUndoRedoLoading: false,
                currentUser: null,
                connectedUsers: [],
            });

            useCanvasStore.getState().resetCanvas();
            const state = useCanvasStore.getState();
            expect(state.documentId).toBeNull();
            expect(state.documentName).toBeNull();
            expect(state.versionId).toBeNull();
            expect(state.elements).toEqual([]);
            expect(state.activeElementId).toBeNull();
            expect(state.isDirty).toBe(false);
            expect(state.isSaving).toBe(false);
            expect(state.lastSavedAt).toBeNull();
            expect(state.versionHistory).toEqual([]);
            expect(state.currentVersionIndex).toBe(-1);
            expect(state.isUndoRedoLoading).toBe(false);
        });
    });

    // ── loadDocument (socket room join/leave) ────────────────

    describe("loadDocument socket integration", () => {
        it("joins the socket room after loading", async () => {
            const { joinDocument } = await import("../socket");
            vi.mocked(api.getDocument).mockResolvedValue({
                id: "doc-s",
                name: "Socket Doc",
                versions: [{ versionId: "v1", elements: [], savedAt: "2026-01-01T00:00:00.000Z" }],
                createdAt: "2026-01-01T00:00:00.000Z",
                updatedAt: "2026-01-01T00:00:00.000Z",
            });

            await useCanvasStore.getState().loadDocument("doc-s");
            expect(joinDocument).toHaveBeenCalledWith("doc-s");
        });

        it("leaves previous socket room before joining new one", async () => {
            const { joinDocument, leaveDocument } = await import("../socket");
            useCanvasStore.setState({ documentId: "old-doc" });
            vi.mocked(api.getDocument).mockResolvedValue({
                id: "new-doc",
                name: "New",
                versions: [{ versionId: "v1", elements: [], savedAt: "2026-01-01T00:00:00.000Z" }],
                createdAt: "2026-01-01T00:00:00.000Z",
                updatedAt: "2026-01-01T00:00:00.000Z",
            });

            await useCanvasStore.getState().loadDocument("new-doc");
            expect(leaveDocument).toHaveBeenCalled();
            expect(joinDocument).toHaveBeenCalledWith("new-doc");
        });

        it("resets connectedUsers on load", async () => {
            useCanvasStore.setState({
                connectedUsers: [{ id: "u1", displayName: "User 1", color: "#f00" }],
            });
            vi.mocked(api.getDocument).mockResolvedValue({
                id: "doc-r",
                name: "Reset",
                versions: [{ versionId: "v1", elements: [], savedAt: "2026-01-01T00:00:00.000Z" }],
                createdAt: "2026-01-01T00:00:00.000Z",
                updatedAt: "2026-01-01T00:00:00.000Z",
            });

            await useCanvasStore.getState().loadDocument("doc-r");
            expect(useCanvasStore.getState().connectedUsers).toEqual([]);
        });
    });

    // ── createDocument (socket room join/leave) ──────────────

    describe("createDocument socket integration", () => {
        it("joins the socket room after creating", async () => {
            const { joinDocument } = await import("../socket");
            vi.mocked(api.createDocument).mockResolvedValue({
                id: "created-doc",
                name: "Untitled",
                versions: [{ versionId: "v0", elements: [], savedAt: "2026-01-01T00:00:00.000Z" }],
                createdAt: "2026-01-01T00:00:00.000Z",
                updatedAt: "2026-01-01T00:00:00.000Z",
            });

            await useCanvasStore.getState().createDocument();
            expect(joinDocument).toHaveBeenCalledWith("created-doc");
        });

        it("leaves previous room when creating while in a document", async () => {
            const { leaveDocument } = await import("../socket");
            useCanvasStore.setState({ documentId: "prev-doc" });
            vi.mocked(api.createDocument).mockResolvedValue({
                id: "new-doc",
                name: "Untitled",
                versions: [{ versionId: "v0", elements: [], savedAt: "2026-01-01T00:00:00.000Z" }],
                createdAt: "2026-01-01T00:00:00.000Z",
                updatedAt: "2026-01-01T00:00:00.000Z",
            });

            await useCanvasStore.getState().createDocument();
            expect(leaveDocument).toHaveBeenCalled();
        });
    });

    // ── resetCanvas (socket room leave) ──────────────────────

    describe("resetCanvas socket integration", () => {
        it("leaves socket room when resetting with active document", async () => {
            const { leaveDocument } = await import("../socket");
            useCanvasStore.setState({ documentId: "active-doc" });
            useCanvasStore.getState().resetCanvas();
            expect(leaveDocument).toHaveBeenCalled();
        });

        it("does not leave when no active document", async () => {
            const { leaveDocument } = await import("../socket");
            vi.clearAllMocks();
            useCanvasStore.setState({ documentId: null });
            useCanvasStore.getState().resetCanvas();
            expect(leaveDocument).not.toHaveBeenCalled();
        });

        it("clears connectedUsers on reset", () => {
            useCanvasStore.setState({
                documentId: "doc",
                connectedUsers: [{ id: "u1", displayName: "User 1", color: "#f00" }],
            });
            useCanvasStore.getState().resetCanvas();
            expect(useCanvasStore.getState().connectedUsers).toEqual([]);
        });
    });

    // ── loadDocument (version history) ────────────────────────

    describe("loadDocument version history", () => {
        it("populates versionHistory and sets currentVersionIndex to latest", async () => {
            vi.mocked(api.getDocument).mockResolvedValue({
                id: "doc-h",
                name: "History Doc",
                versions: [
                    { versionId: "v1", elements: [], savedAt: "2026-01-01T00:00:00.000Z" },
                    { versionId: "v2", elements: [], savedAt: "2026-01-02T00:00:00.000Z" },
                    { versionId: "v3", elements: [{ id: "e1", type: "rectangle", x: 0, y: 0, width: 50, height: 50 }], savedAt: "2026-01-03T00:00:00.000Z" },
                ],
                createdAt: "2026-01-01T00:00:00.000Z",
                updatedAt: "2026-01-03T00:00:00.000Z",
            });

            await useCanvasStore.getState().loadDocument("doc-h");
            const state = useCanvasStore.getState();
            expect(state.versionHistory).toHaveLength(3);
            expect(state.versionHistory[0].versionId).toBe("v1");
            expect(state.versionHistory[2].versionId).toBe("v3");
            expect(state.currentVersionIndex).toBe(2);
        });
    });

    // ── canUndo / canRedo ─────────────────────────────────────

    describe("canUndo", () => {
        it("returns false when at first version and not dirty", () => {
            useCanvasStore.setState({
                documentId: "doc-1",
                versionHistory: [{ versionId: "v1", savedAt: "t" }],
                currentVersionIndex: 0,
                isDirty: false,
            });
            expect(useCanvasStore.getState().canUndo()).toBe(false);
        });

        it("returns true when dirty (unsaved changes to discard)", () => {
            useCanvasStore.setState({
                documentId: "doc-1",
                versionHistory: [{ versionId: "v1", savedAt: "t" }],
                currentVersionIndex: 0,
                isDirty: true,
            });
            expect(useCanvasStore.getState().canUndo()).toBe(true);
        });

        it("returns true when at a later version", () => {
            useCanvasStore.setState({
                documentId: "doc-1",
                versionHistory: [
                    { versionId: "v1", savedAt: "t" },
                    { versionId: "v2", savedAt: "t" },
                ],
                currentVersionIndex: 1,
                isDirty: false,
            });
            expect(useCanvasStore.getState().canUndo()).toBe(true);
        });
    });

    describe("canRedo", () => {
        it("returns false when at latest version", () => {
            useCanvasStore.setState({
                documentId: "doc-1",
                versionHistory: [
                    { versionId: "v1", savedAt: "t" },
                    { versionId: "v2", savedAt: "t" },
                ],
                currentVersionIndex: 1,
                isDirty: false,
            });
            expect(useCanvasStore.getState().canRedo()).toBe(false);
        });

        it("returns false when dirty", () => {
            useCanvasStore.setState({
                documentId: "doc-1",
                versionHistory: [
                    { versionId: "v1", savedAt: "t" },
                    { versionId: "v2", savedAt: "t" },
                ],
                currentVersionIndex: 0,
                isDirty: true,
            });
            expect(useCanvasStore.getState().canRedo()).toBe(false);
        });

        it("returns true when not at latest and not dirty", () => {
            useCanvasStore.setState({
                documentId: "doc-1",
                versionHistory: [
                    { versionId: "v1", savedAt: "t" },
                    { versionId: "v2", savedAt: "t" },
                ],
                currentVersionIndex: 0,
                isDirty: false,
            });
            expect(useCanvasStore.getState().canRedo()).toBe(true);
        });
    });

    // ── undo ──────────────────────────────────────────────────

    describe("undo", () => {
        it("discards unsaved changes when dirty", async () => {
            const savedElements = [{ id: "e1", type: "rectangle" as const, x: 0, y: 0, width: 50, height: 50 }];
            vi.mocked(api.getVersion).mockResolvedValue({
                versionId: "v2",
                elements: savedElements,
                savedAt: "2026-01-02T00:00:00.000Z",
            });
            useCanvasStore.setState({
                documentId: "doc-1",
                versionHistory: [
                    { versionId: "v1", savedAt: "t" },
                    { versionId: "v2", savedAt: "t" },
                ],
                currentVersionIndex: 1,
                isDirty: true,
                elements: [{ id: "e1", type: "rectangle", x: 99, y: 99, width: 50, height: 50 }],
            });

            await useCanvasStore.getState().undo();
            const state = useCanvasStore.getState();
            expect(state.isDirty).toBe(false);
            expect(state.elements).toEqual(savedElements);
            expect(state.currentVersionIndex).toBe(1);
            expect(api.getVersion).toHaveBeenCalledWith("doc-1", "v2");
        });

        it("moves to previous version when not dirty", async () => {
            const v1Elements = [{ id: "e0", type: "circle" as const, x: 0, y: 0, width: 80, height: 80 }];
            vi.mocked(api.getVersion).mockResolvedValue({
                versionId: "v1",
                elements: v1Elements,
                savedAt: "2026-01-01T00:00:00.000Z",
            });
            useCanvasStore.setState({
                documentId: "doc-1",
                versionHistory: [
                    { versionId: "v1", savedAt: "2026-01-01T00:00:00.000Z" },
                    { versionId: "v2", savedAt: "2026-01-02T00:00:00.000Z" },
                ],
                currentVersionIndex: 1,
                isDirty: false,
                elements: [],
            });

            await useCanvasStore.getState().undo();
            const state = useCanvasStore.getState();
            expect(state.currentVersionIndex).toBe(0);
            expect(state.elements).toEqual(v1Elements);
            expect(state.versionId).toBe("v1");
            expect(state.isDirty).toBe(false);
            expect(api.getVersion).toHaveBeenCalledWith("doc-1", "v1");
        });

        it("does nothing when already at first version and not dirty", async () => {
            useCanvasStore.setState({
                documentId: "doc-1",
                versionHistory: [{ versionId: "v1", savedAt: "t" }],
                currentVersionIndex: 0,
                isDirty: false,
            });

            await useCanvasStore.getState().undo();
            expect(api.getVersion).not.toHaveBeenCalled();
            expect(useCanvasStore.getState().currentVersionIndex).toBe(0);
        });

        it("does nothing when no documentId", async () => {
            useCanvasStore.setState({ documentId: null });
            await useCanvasStore.getState().undo();
            expect(api.getVersion).not.toHaveBeenCalled();
        });

        it("does nothing while already loading", async () => {
            useCanvasStore.setState({
                documentId: "doc-1",
                versionHistory: [
                    { versionId: "v1", savedAt: "t" },
                    { versionId: "v2", savedAt: "t" },
                ],
                currentVersionIndex: 1,
                isDirty: false,
                isUndoRedoLoading: true,
            });

            await useCanvasStore.getState().undo();
            expect(api.getVersion).not.toHaveBeenCalled();
        });
    });

    // ── redo ──────────────────────────────────────────────────

    describe("redo", () => {
        it("moves to next version", async () => {
            const v2Elements = [{ id: "e2", type: "rectangle" as const, x: 10, y: 10, width: 100, height: 50 }];
            vi.mocked(api.getVersion).mockResolvedValue({
                versionId: "v2",
                elements: v2Elements,
                savedAt: "2026-01-02T00:00:00.000Z",
            });
            useCanvasStore.setState({
                documentId: "doc-1",
                versionHistory: [
                    { versionId: "v1", savedAt: "2026-01-01T00:00:00.000Z" },
                    { versionId: "v2", savedAt: "2026-01-02T00:00:00.000Z" },
                ],
                currentVersionIndex: 0,
                isDirty: false,
                elements: [],
            });

            await useCanvasStore.getState().redo();
            const state = useCanvasStore.getState();
            expect(state.currentVersionIndex).toBe(1);
            expect(state.elements).toEqual(v2Elements);
            expect(state.versionId).toBe("v2");
            expect(api.getVersion).toHaveBeenCalledWith("doc-1", "v2");
        });

        it("does nothing when at latest version", async () => {
            useCanvasStore.setState({
                documentId: "doc-1",
                versionHistory: [{ versionId: "v1", savedAt: "t" }],
                currentVersionIndex: 0,
                isDirty: false,
            });

            await useCanvasStore.getState().redo();
            expect(api.getVersion).not.toHaveBeenCalled();
        });

        it("does nothing when dirty", async () => {
            useCanvasStore.setState({
                documentId: "doc-1",
                versionHistory: [
                    { versionId: "v1", savedAt: "t" },
                    { versionId: "v2", savedAt: "t" },
                ],
                currentVersionIndex: 0,
                isDirty: true,
            });

            await useCanvasStore.getState().redo();
            expect(api.getVersion).not.toHaveBeenCalled();
        });

        it("does nothing when no documentId", async () => {
            useCanvasStore.setState({ documentId: null });
            await useCanvasStore.getState().redo();
            expect(api.getVersion).not.toHaveBeenCalled();
        });
    });

    // ── saveDocument after undo (afterVersionId) ──────────────

    describe("saveDocument after undo", () => {
        it("sends afterVersionId when saving from an undone state", async () => {
            vi.mocked(emitSaveDocument).mockResolvedValue({
                versionId: "v-new",
                savedAt: "2026-01-01T00:00:00.000Z",
            });
            useCanvasStore.setState({
                documentId: "doc-1",
                isDirty: true,
                elements: [{ id: "e1", type: "rectangle", x: 0, y: 0, width: 50, height: 50 }],
                versionHistory: [
                    { versionId: "v1", savedAt: "t1" },
                    { versionId: "v2", savedAt: "t2" },
                    { versionId: "v3", savedAt: "t3" },
                ],
                currentVersionIndex: 1,
            });

            await useCanvasStore.getState().saveDocument();
            expect(emitSaveDocument).toHaveBeenCalledWith(
                "doc-1",
                expect.any(Array),
                "v2",
            );
        });

        it("truncates local version history after save from undone state", async () => {
            vi.mocked(emitSaveDocument).mockResolvedValue({
                versionId: "v-new",
                savedAt: "2026-01-01T00:00:00.000Z",
            });
            useCanvasStore.setState({
                documentId: "doc-1",
                isDirty: true,
                elements: [],
                versionHistory: [
                    { versionId: "v1", savedAt: "t1" },
                    { versionId: "v2", savedAt: "t2" },
                    { versionId: "v3", savedAt: "t3" },
                ],
                currentVersionIndex: 1,
            });

            await useCanvasStore.getState().saveDocument();
            const state = useCanvasStore.getState();
            expect(state.versionHistory).toHaveLength(3);
            expect(state.versionHistory[0].versionId).toBe("v1");
            expect(state.versionHistory[1].versionId).toBe("v2");
            expect(state.versionHistory[2].versionId).toBe("v-new");
            expect(state.currentVersionIndex).toBe(2);
        });

        it("does not send afterVersionId when at latest version", async () => {
            vi.mocked(emitSaveDocument).mockResolvedValue({
                versionId: "v-new",
                savedAt: "2026-01-01T00:00:00.000Z",
            });
            useCanvasStore.setState({
                documentId: "doc-1",
                isDirty: true,
                elements: [],
                versionHistory: [
                    { versionId: "v1", savedAt: "t1" },
                    { versionId: "v2", savedAt: "t2" },
                ],
                currentVersionIndex: 1,
            });

            await useCanvasStore.getState().saveDocument();
            expect(emitSaveDocument).toHaveBeenCalledWith(
                "doc-1",
                expect.any(Array),
                undefined,
            );
        });
    });
});
