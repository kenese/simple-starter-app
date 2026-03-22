import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("../store/canvasDB", () => ({
    saveSnapshot: vi.fn(() => Promise.resolve()),
    loadSnapshot: vi.fn(() => Promise.resolve(null)),
}));

import { EditorSidebar } from "./EditorSidebar";
import { useCanvasStore } from "../store/canvasStore";

describe("EditorSidebar", () => {
    beforeEach(() => {
        useCanvasStore.setState({
            elementIds: [],
            elementsById: {},
            selectedTool: null,
        });
    });

    it("renders sidebar with Elements title and three palette items", () => {
        render(<EditorSidebar />);
        expect(screen.getByText("Elements")).toBeInTheDocument();
        expect(screen.getByTestId("sidebar-circle")).toBeInTheDocument();
        expect(screen.getByTestId("sidebar-square")).toBeInTheDocument();
        expect(screen.getByTestId("sidebar-text")).toBeInTheDocument();
    });

    it("sets drag data when dragging an element", () => {
        render(<EditorSidebar />);
        const circleButton = screen.getByTestId("sidebar-circle");
        const dataTransfer = { setData: vi.fn(), effectAllowed: "" };

        fireEvent.dragStart(circleButton, { dataTransfer });

        expect(dataTransfer.setData).toHaveBeenCalledWith(
            "application/x-canvas-element-kind",
            "circle"
        );
    });

    it("adds element at (200, 200) when clicking a palette item", () => {
        render(<EditorSidebar />);
        expect(useCanvasStore.getState().elementIds).toHaveLength(0);

        fireEvent.click(screen.getByTestId("sidebar-square"));

        const state = useCanvasStore.getState();
        expect(state.elementIds).toHaveLength(1);
        const el = Object.values(state.elementsById)[0];
        expect(el.kind).toBe("square");
        expect(el.x).toBe(200);
        expect(el.y).toBe(200);
    });
});
