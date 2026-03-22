import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

vi.mock("../store/canvasDB", () => ({
    saveSnapshot: vi.fn(() => Promise.resolve()),
    loadSnapshot: vi.fn(() => Promise.resolve(null)),
}));

import { EditorCanvas } from "./EditorCanvas";
import { useCanvasStore } from "../store/canvasStore";

describe("EditorCanvas", () => {
    beforeEach(() => {
        useCanvasStore.setState({
            elementIds: [],
            elementsById: {},
            selectedTool: null,
            selectedElementId: null,
            hydrated: true,
        });
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it("renders canvas with role application", () => {
        render(<EditorCanvas />);
        const canvas = screen.getByTestId("editor-canvas");
        expect(canvas).toBeInTheDocument();
        expect(canvas).toHaveAttribute("role", "application");
    });

    it("adds element on drop when dataTransfer has element kind", () => {
        render(<EditorCanvas />);
        const canvas = screen.getByTestId("editor-canvas");

        const rect = { left: 0, top: 0, width: 800, height: 600 };
        vi.spyOn(HTMLDivElement.prototype, "getBoundingClientRect").mockReturnValue(rect as DOMRect);

        fireEvent.dragOver(canvas, { clientX: 50, clientY: 100, dataTransfer: {} });
        fireEvent.drop(canvas, {
            clientX: 50,
            clientY: 100,
            dataTransfer: {
                getData: (key: string) =>
                    key === "application/x-canvas-element-kind" ? "circle" : "",
            },
            preventDefault: () => {},
        });

        const state = useCanvasStore.getState();
        expect(state.elementIds).toHaveLength(1);
        const el = Object.values(state.elementsById)[0];
        expect(el.kind).toBe("circle");
        expect(typeof el.x).toBe("number");
        expect(typeof el.y).toBe("number");
    });

    it("adds element on canvas click when selectedTool is set", () => {
        useCanvasStore.setState({ selectedTool: "text" });
        render(<EditorCanvas />);
        const canvas = screen.getByTestId("editor-canvas");

        const rect = canvas.getBoundingClientRect();
        fireEvent.click(canvas, {
            clientX: rect.left + 80,
            clientY: rect.top + 120,
        });

        const state = useCanvasStore.getState();
        expect(state.elementIds).toHaveLength(1);
        const el = Object.values(state.elementsById)[0];
        expect(el.kind).toBe("text");
        expect(el.x).toBe(80);
        expect(el.y).toBe(120);
        expect(state.selectedTool).toBeNull();
    });

    it("does not add element on canvas click when selectedTool is null", () => {
        render(<EditorCanvas />);
        const canvas = screen.getByTestId("editor-canvas");
        const rect = canvas.getBoundingClientRect();
        fireEvent.click(canvas, { clientX: rect.left + 10, clientY: rect.top + 10 });
        expect(useCanvasStore.getState().elementIds).toHaveLength(0);
    });

    it("renders placed elements", () => {
        useCanvasStore.setState({
            elementIds: ["a", "b"],
            elementsById: {
                a: {
                    id: "a",
                    kind: "circle",
                    x: 10,
                    y: 20,
                    width: 80,
                    height: 80,
                },
                b: {
                    id: "b",
                    kind: "text",
                    x: 30,
                    y: 40,
                    width: 120,
                    height: 32,
                    text: "Hello",
                },
            },
        });
        render(<EditorCanvas />);
        expect(screen.getByTestId("canvas-circle-a")).toBeInTheDocument();
        expect(screen.getByTestId("canvas-text-b")).toBeInTheDocument();
        expect(screen.getByText("Hello")).toBeInTheDocument();
    });

    it("clicking an element selects it and shows resize handles", () => {
        useCanvasStore.setState({
            elementIds: ["a"],
            elementsById: {
                a: { id: "a", kind: "square", x: 100, y: 100, width: 80, height: 80 },
            },
        });
        render(<EditorCanvas />);

        const el = screen.getByTestId("canvas-square-a");
        fireEvent.click(el);

        expect(useCanvasStore.getState().selectedElementId).toBe("a");
        expect(screen.getByTestId("resize-handle-se-a")).toBeInTheDocument();
        expect(screen.getByTestId("resize-handle-nw-a")).toBeInTheDocument();
        expect(screen.getByTestId("resize-handle-ne-a")).toBeInTheDocument();
        expect(screen.getByTestId("resize-handle-sw-a")).toBeInTheDocument();
    });

    it("clicking empty canvas clears selection", () => {
        useCanvasStore.setState({
            elementIds: ["a"],
            elementsById: {
                a: { id: "a", kind: "square", x: 100, y: 100, width: 80, height: 80 },
            },
            selectedElementId: "a",
        });
        render(<EditorCanvas />);

        const canvas = screen.getByTestId("editor-canvas");
        fireEvent.click(canvas);

        expect(useCanvasStore.getState().selectedElementId).toBeNull();
    });

    it("double-clicking text element shows input for editing", () => {
        useCanvasStore.setState({
            elementIds: ["t"],
            elementsById: {
                t: { id: "t", kind: "text", x: 50, y: 50, width: 120, height: 32, text: "Hello" },
            },
        });
        render(<EditorCanvas />);

        const textEl = screen.getByTestId("canvas-text-t");
        fireEvent.doubleClick(textEl);

        const input = screen.getByTestId("canvas-text-input-t");
        expect(input).toBeInTheDocument();
        expect((input as HTMLInputElement).value).toBe("Hello");
    });

    it("committing text edit updates the store", () => {
        useCanvasStore.setState({
            elementIds: ["t"],
            elementsById: {
                t: { id: "t", kind: "text", x: 50, y: 50, width: 120, height: 32, text: "Hello" },
            },
        });
        render(<EditorCanvas />);

        const textEl = screen.getByTestId("canvas-text-t");
        fireEvent.doubleClick(textEl);

        const input = screen.getByTestId("canvas-text-input-t") as HTMLInputElement;
        fireEvent.change(input, { target: { value: "Updated" } });
        fireEvent.blur(input);

        expect(useCanvasStore.getState().elementsById["t"].text).toBe("Updated");
    });

    it("does not show resize handles for unselected elements", () => {
        useCanvasStore.setState({
            elementIds: ["a"],
            elementsById: {
                a: { id: "a", kind: "circle", x: 100, y: 100, width: 80, height: 80 },
            },
        });
        render(<EditorCanvas />);
        expect(screen.queryByTestId("resize-handle-se-a")).not.toBeInTheDocument();
    });
});
