import { create } from "zustand";
import type { CanvasElementType, DesignElement } from "@starter/shared";

interface StoreState {
    theme: "light" | "dark";
    elements: DesignElement[];
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

export const useAppStore = create<StoreState>((set) => ({
    theme: "dark",
    elements: [],
    toggleTheme: () => set((state) => ({ theme: state.theme === "dark" ? "light" : "dark" })),
    setElements: (elements) => set({ elements }),
    addElement: (type, position) =>
        set((state) => {
            const base = getBaseElement(type);
            const nextIndex = state.elements.length;
            const x = position?.x ?? 40 + (nextIndex % 6) * 24;
            const y = position?.y ?? 40 + (nextIndex % 5) * 20;

            return {
                elements: [
                    ...state.elements,
                    {
                        id: createId(),
                        ...base,
                        x,
                        y,
                    },
                ],
            };
        }),
    updateTextElement: (id, text) =>
        set((state) => ({
            elements: state.elements.map((element) =>
                element.id === id && element.type === "text"
                    ? { ...element, text }
                    : element
            ),
        })),
    updateElementFrame: (id, frame) =>
        set((state) => ({
            elements: state.elements.map((element) =>
                element.id === id ? { ...element, ...frame } : element
            ),
        })),
}));
