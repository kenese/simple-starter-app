import { describe, it, expect, beforeEach, vi } from "vitest";
import { useCanvasStore } from "./store/canvasStore";

type Listener = (...args: unknown[]) => void;
const listeners = new Map<string, Listener>();
const mockSocket = {
    on: vi.fn((event: string, cb: Listener) => {
        listeners.set(event, cb);
    }),
};

vi.mock("./socket", () => ({
    getSocket: () => mockSocket,
    joinDocument: vi.fn(),
    leaveDocument: vi.fn(),
    emitSaveDocument: vi.fn().mockResolvedValue({ versionId: "v", savedAt: "t" }),
}));

vi.mock("uuid", () => ({ v4: vi.fn().mockReturnValue("mock-id") }));

vi.mock("./api/documents", () => ({
    getDocument: vi.fn(),
    getVersion: vi.fn(),
    saveDocument: vi.fn(),
    createDocument: vi.fn(),
    renameDocument: vi.fn(),
}));

import { initSocketListeners } from "./socketListeners";

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

describe("socketListeners", () => {
    beforeEach(() => {
        resetStore();
        listeners.clear();
        vi.clearAllMocks();
        initSocketListeners();
    });

    describe("user-identity", () => {
        it("sets currentUser in store", () => {
            const user = { id: "u1", displayName: "User 1", color: "#6366f1" };
            listeners.get("user-identity")!(user);
            expect(useCanvasStore.getState().currentUser).toEqual(user);
        });
    });

    describe("elements-updated", () => {
        it("updates elements when documentId matches", () => {
            useCanvasStore.setState({
                documentId: "doc-1",
                versionHistory: [{ versionId: "v1", savedAt: "t1" }],
                currentVersionIndex: 0,
            });

            const payload = {
                documentId: "doc-1",
                elements: [{ id: "e1", type: "rectangle", x: 10, y: 20, width: 100, height: 50 }],
                userId: "u2",
                versionId: "v2",
                savedAt: "2026-01-02T00:00:00.000Z",
            };
            listeners.get("elements-updated")!(payload);

            const state = useCanvasStore.getState();
            expect(state.elements).toEqual(payload.elements);
            expect(state.versionId).toBe("v2");
            expect(state.lastSavedAt).toBe("2026-01-02T00:00:00.000Z");
            expect(state.isDirty).toBe(false);
        });

        it("appends to version history", () => {
            useCanvasStore.setState({
                documentId: "doc-1",
                versionHistory: [{ versionId: "v1", savedAt: "t1" }],
                currentVersionIndex: 0,
            });

            listeners.get("elements-updated")!({
                documentId: "doc-1",
                elements: [],
                userId: "u2",
                versionId: "v2",
                savedAt: "t2",
            });

            const state = useCanvasStore.getState();
            expect(state.versionHistory).toHaveLength(2);
            expect(state.versionHistory[1].versionId).toBe("v2");
            expect(state.currentVersionIndex).toBe(1);
        });

        it("ignores update when documentId does not match", () => {
            useCanvasStore.setState({
                documentId: "doc-1",
                elements: [{ id: "existing", type: "circle", x: 0, y: 0, width: 80, height: 80 }],
            });

            listeners.get("elements-updated")!({
                documentId: "doc-other",
                elements: [],
                userId: "u2",
                versionId: "v2",
                savedAt: "t2",
            });

            expect(useCanvasStore.getState().elements).toHaveLength(1);
            expect(useCanvasStore.getState().elements[0].id).toBe("existing");
        });
    });

    describe("users-updated", () => {
        it("sets connectedUsers when documentId matches", () => {
            useCanvasStore.setState({ documentId: "doc-1" });
            const users = [
                { id: "u1", displayName: "User 1", color: "#6366f1" },
                { id: "u2", displayName: "User 2", color: "#ec4899" },
            ];

            listeners.get("users-updated")!({ documentId: "doc-1", users });
            expect(useCanvasStore.getState().connectedUsers).toEqual(users);
        });

        it("ignores when documentId does not match", () => {
            useCanvasStore.setState({
                documentId: "doc-1",
                connectedUsers: [{ id: "u1", displayName: "User 1", color: "#fff" }],
            });

            listeners.get("users-updated")!({
                documentId: "doc-other",
                users: [],
            });

            expect(useCanvasStore.getState().connectedUsers).toHaveLength(1);
        });
    });
});
