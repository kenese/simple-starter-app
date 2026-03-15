import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";

vi.mock("./components/TopNav", () => ({
    TopNav: ({ documentId }: { documentId: string }) => (
        <div data-testid="topnav">topnav-{documentId}</div>
    ),
}));

vi.mock("./components/Editor", () => ({
    Editor: ({ documentId }: { documentId: string }) => (
        <div data-testid="editor">editor-{documentId}</div>
    ),
}));

beforeEach(() => {
    vi.stubGlobal("crypto", {
        randomUUID: () => "00000000-0000-4000-8000-000000000001",
    });
});

describe("App routing", () => {
    it("redirects / to a newly generated document route", async () => {
        render(
            <MemoryRouter initialEntries={["/"]}>
                <App />
            </MemoryRouter>
        );

        const editor = await screen.findByTestId("editor");
        expect(editor.textContent).toMatch(
            /^editor-[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
        );
    });

    it("loads editor for explicit document route", async () => {
        render(
            <MemoryRouter initialEntries={["/abc-doc"]}>
                <App />
            </MemoryRouter>
        );

        expect(await screen.findByTestId("topnav")).toHaveTextContent("topnav-abc-doc");
        expect(await screen.findByTestId("editor")).toHaveTextContent("editor-abc-doc");
    });
});
