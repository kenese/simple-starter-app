import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Editor } from "./Editor";
import { useAppStore } from "../store/appStore";
import * as documentsApi from "../api/documents";

type MockDataTransfer = {
    effectAllowed: string;
    dropEffect: string;
    getData: (type: string) => string;
    setData: (type: string, value: string) => void;
};

const createDataTransfer = (): MockDataTransfer => {
    const store: Record<string, string> = {};

    return {
        effectAllowed: "all",
        dropEffect: "none",
        getData: (type: string) => store[type] ?? "",
        setData: (type: string, value: string) => {
            store[type] = value;
        },
    };
};

describe("Editor", () => {
    beforeEach(() => {
        useAppStore.setState({ theme: "dark", elements: [] });
        vi.spyOn(documentsApi, "getDocument").mockResolvedValue(null);
        vi.spyOn(documentsApi, "saveDocumentVersion").mockResolvedValue({
            documentId: "test-doc",
            latestVersion: 1,
            versions: [
                {
                    version: 1,
                    savedAt: new Date().toISOString(),
                    snapshot: {
                        elements: [],
                    },
                },
            ],
        });
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it("adds a rectangle to canvas when clicking sidebar tool", async () => {
        const { container } = render(<Editor documentId="test-doc" />);
        const canvas = container.querySelector(".editor-canvas");
        expect(canvas).toBeInTheDocument();
        await waitFor(() => expect(screen.getByText("New document")).toBeInTheDocument());

        fireEvent.click(screen.getByRole("button", { name: "Rectangle" }));

        const rectangle = container.querySelector(".canvas-element--rectangle");
        expect(rectangle).toBeInTheDocument();
        expect(useAppStore.getState().elements).toHaveLength(1);
        expect(useAppStore.getState().elements[0].type).toBe("rectangle");
    });

    it("adds a circle at drop coordinates when dragging from sidebar", async () => {
        const { container } = render(<Editor documentId="test-doc" />);
        const canvas = container.querySelector(".editor-canvas") as HTMLDivElement;
        expect(canvas).toBeInTheDocument();
        await waitFor(() => expect(screen.getByText("New document")).toBeInTheDocument());

        const dataTransfer = createDataTransfer();
        fireEvent.dragStart(screen.getByRole("button", { name: "Circle" }), { dataTransfer });

        canvas.getBoundingClientRect = () =>
            ({
                left: 100,
                top: 50,
                width: 800,
                height: 600,
                right: 900,
                bottom: 650,
                x: 100,
                y: 50,
                toJSON: () => ({}),
            }) as DOMRect;

        fireEvent.dragOver(canvas, { dataTransfer });
        fireEvent.drop(canvas, {
            dataTransfer,
            clientX: 260,
            clientY: 190,
        });

        const created = useAppStore.getState().elements[0];
        expect(created.type).toBe("circle");
        expect(created.x).toBeGreaterThanOrEqual(8);
        expect(created.y).toBeGreaterThanOrEqual(8);
    });
});
