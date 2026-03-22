import { create } from "zustand";
import type { CanvasElement, CanvasElementKind } from "@starter/shared";
import { saveSnapshot, loadSnapshot } from "./canvasDB";

const DEFAULT_SIZE = 80;
const DEFAULT_TEXT = "Text";
const MAX_VERSION_HISTORY = 10;

type ElementUpdates = Partial<Pick<CanvasElement, "x" | "y" | "width" | "height" | "text">>;

export interface CanvasSnapshot {
    elementIds: string[];
    elementsById: Record<string, CanvasElement>;
}

interface CanvasState {
    elementIds: string[];
    elementsById: Record<string, CanvasElement>;
    versionHistory: CanvasSnapshot[];
    selectedTool: CanvasElementKind | null;
    selectedElementId: string | null;
    hydrated: boolean;
    addElement: (kind: CanvasElementKind, x: number, y: number) => void;
    setSelectedTool: (kind: CanvasElementKind | null) => void;
    setSelectedElement: (id: string | null) => void;
    updateElement: (id: string, updates: ElementUpdates) => void;
    saveVersion: () => void;
    hydrate: () => Promise<void>;
}

function createElement(
    kind: CanvasElementKind,
    x: number,
    y: number
): CanvasElement {
    return {
        id: crypto.randomUUID(),
        kind,
        x,
        y,
        width: kind === "text" ? 120 : DEFAULT_SIZE,
        height: kind === "text" ? 32 : DEFAULT_SIZE,
        text: kind === "text" ? DEFAULT_TEXT : undefined,
    };
}

function snapshotFromState(elementIds: string[], elementsById: Record<string, CanvasElement>): CanvasSnapshot {
    const elementsByIdCopy: Record<string, CanvasElement> = {};
    for (const id of elementIds) {
        const el = elementsById[id];
        if (el) elementsByIdCopy[id] = { ...el };
    }
    return { elementIds: [...elementIds], elementsById: elementsByIdCopy };
}

export const useCanvasStore = create<CanvasState>((set, get) => ({
    elementIds: [],
    elementsById: {},
    versionHistory: [],
    selectedTool: null,
    selectedElementId: null,
    hydrated: false,
    addElement: (kind, x, y) =>
        set((state) => {
            const el = createElement(kind, x, y);
            return {
                elementIds: [...state.elementIds, el.id],
                elementsById: { ...state.elementsById, [el.id]: el },
            };
        }),
    setSelectedTool: (selectedTool) => set({ selectedTool }),
    setSelectedElement: (selectedElementId) => set({ selectedElementId }),
    updateElement: (id, updates) =>
        set((state) => {
            const el = state.elementsById[id];
            if (!el) return state;
            const next = { ...el, ...updates };
            return {
                elementsById: { ...state.elementsById, [id]: next },
            };
        }),
    saveVersion: () => {
        debugger;
        const state = get();
        const snapshot = snapshotFromState(state.elementIds, state.elementsById);
        const nextHistory = [...state.versionHistory, snapshot].slice(-MAX_VERSION_HISTORY);
        set({ versionHistory: nextHistory });
        saveSnapshot(snapshot).catch(console.error);
    },
    hydrate: async () => {
        try {
            const snapshot = await loadSnapshot();
            if (snapshot) {
                set({
                    elementIds: snapshot.elementIds,
                    elementsById: snapshot.elementsById,
                    hydrated: true,
                });
            } else {
                set({ hydrated: true });
            }
        } catch {
            set({ hydrated: true });
        }
    },
}));

useCanvasStore.getState().hydrate();
