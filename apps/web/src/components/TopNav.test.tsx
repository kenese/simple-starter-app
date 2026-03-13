import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { TopNav } from "./TopNav";
import { MemoryRouter } from "react-router-dom";

const mockSave = vi.fn();
const mockCreate = vi.fn();
const mockRename = vi.fn();
const mockUndo = vi.fn();
const mockRedo = vi.fn();
const mockCanUndo = vi.fn().mockReturnValue(false);
const mockCanRedo = vi.fn().mockReturnValue(false);

vi.mock("../api/documents", () => ({
    listDocuments: vi.fn().mockResolvedValue([
        { id: "d1", name: "Design A", createdAt: "", updatedAt: "" },
        { id: "d2", name: "Design B", createdAt: "", updatedAt: "" },
    ]),
}));

vi.mock("../store/canvasStore", () => ({
    useCanvasStore: Object.assign(
        (selector: (s: Record<string, unknown>) => unknown) =>
            selector({
                documentId: "doc-1",
                documentName: "My Document",
                isDirty: false,
                isSaving: false,
                saveDocument: mockSave,
                createDocument: mockCreate,
                renameDocument: mockRename,
                undo: mockUndo,
                redo: mockRedo,
                canUndo: mockCanUndo,
                canRedo: mockCanRedo,
                isUndoRedoLoading: false,
                connectedUsers: [],
                currentUser: null,
            }),
        {
            getState: () => ({
                isDirty: false,
                documentId: "doc-1",
                isSaving: false,
                saveDocument: mockSave,
                canUndo: mockCanUndo,
                canRedo: mockCanRedo,
            }),
        }
    ),
}));

function renderNav() {
    return render(
        <MemoryRouter>
            <TopNav />
        </MemoryRouter>
    );
}

describe("TopNav Component", () => {
    it("renders the brand name and core controls", () => {
        renderNav();
        expect(screen.getByText("Canva Clone")).toBeInTheDocument();
        expect(screen.getByText("Documents ▾")).toBeInTheDocument();
        expect(screen.getByText("Saved")).toBeInTheDocument();
    });

    it("displays the document title", () => {
        renderNav();
        expect(screen.getByText("My Document")).toBeInTheDocument();
    });

    it("opens title editing on click", async () => {
        renderNav();
        await userEvent.click(screen.getByText("My Document"));
        const input = screen.getByDisplayValue("My Document");
        expect(input).toBeInTheDocument();
        expect(input.tagName).toBe("INPUT");
    });

    it("opens dropdown on Documents button click", async () => {
        renderNav();
        await userEvent.click(screen.getByText("Documents ▾"));
        expect(screen.getByText("+ New Document")).toBeInTheDocument();
    });

    it("save button shows Saved when not dirty", () => {
        renderNav();
        const btn = screen.getByText("Saved");
        expect(btn).toBeDisabled();
    });
});
