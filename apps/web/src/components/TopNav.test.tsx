import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

vi.mock("../store/canvasDB", () => ({
    saveSnapshot: vi.fn(() => Promise.resolve()),
    loadSnapshot: vi.fn(() => Promise.resolve(null)),
}));

import { TopNav } from "./TopNav";
import { BrowserRouter } from "react-router-dom";

describe("TopNav Component", () => {
    it("renders the brand name and links", () => {
        render(
            <BrowserRouter>
                <TopNav />
            </BrowserRouter>
        );

        expect(screen.getByText("Starter App")).toBeInTheDocument();
        expect(screen.getByRole("link", { name: "Editor" })).toBeInTheDocument();
        expect(screen.getByRole("link", { name: "Route 2" })).toBeInTheDocument();
    });
});
