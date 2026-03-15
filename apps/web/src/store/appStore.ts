import { create } from "zustand";
import type { CanvasElementType, DesignElement } from "@starter/shared";

interface StoreState {
    theme: "light" | "dark";
    elementIds: string[];
    elementsById: Record<string, DesignElement>;
    toggleTheme: () => void;
    setElements: (elements: DesignElement[]) => void;
    addElement: (type: CanvasElementType, position?: { x: number; y: number }) => void;
    updateTextElement: (id: string, text: string) => void;
    updateElementFrame: (
        id: string,
        frame: Partial<Pick<DesignElement, "x" | "y" | "width" | "height">>
    ) => void;
}

const createId = () => {
    if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
        return crypto.randomUUID();
    }
    return `el-${Math.random().toString(36).slice(2, 11)}`;
};

const getBaseElement = (type: CanvasElementType): Omit<DesignElement, "id" | "x" | "y"> => {
    if (type === "rectangle") {
        return { type, width: 160, height: 96 };
    }

    if (type === "circle") {
        return { type, width: 100, height: 100 };
    }

    return { type, width: 220, height: 44, text: "Text input" };
};

export const getOrderedElements = (
    elementIds: string[],
    elementsById: Record<string, DesignElement>
): DesignElement[] =>
    elementIds
        .map((id) => elementsById[id])
        .filter((element): element is DesignElement => element !== undefined);

export const useAppStore = create<StoreState>((set) => ({
    theme: "dark",
    elementIds: [],
    elementsById: {},
    toggleTheme: () => set((state) => ({ theme: state.theme === "dark" ? "light" : "dark" })),
    setElements: (elements) =>
        set(() => {
            const elementIds: string[] = [];
            const elementsById: Record<string, DesignElement> = {};

            for (const element of elements) {
                elementIds.push(element.id);
                elementsById[element.id] = element;
            }

            return { elementIds, elementsById };
        }),
    addElement: (type, position) =>
        set((state) => {
            const base = getBaseElement(type);
            const nextIndex = state.elementIds.length;
            const x = position?.x ?? 40 + (nextIndex % 6) * 24;
            const y = position?.y ?? 40 + (nextIndex % 5) * 20;
            const id = createId();
            const nextElement: DesignElement = {
                id,
                ...base,
                x,
                y,
            };

            return {
                elementIds: [...state.elementIds, id],
                elementsById: {
                    ...state.elementsById,
                    [id]: nextElement,
                },
            };
        }),
    updateTextElement: (id, text) =>
        set((state) => {
            const existing = state.elementsById[id];
            if (!existing || existing.type !== "text") {
                return {};
            }

            return {
                elementsById: {
                    ...state.elementsById,
                    [id]: { ...existing, text },
                },
            };
        }),
    updateElementFrame: (id, frame) =>
        set((state) => {
            const existing = state.elementsById[id];
            if (!existing) {
                return {};
            }

            return {
                elementsById: {
                    ...state.elementsById,
                    [id]: { ...existing, ...frame },
                },
            };
        }),
}));
