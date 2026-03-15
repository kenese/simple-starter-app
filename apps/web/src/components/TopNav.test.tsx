import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { TopNav } from "./TopNav";

describe("TopNav Component", () => {
    it("renders the editor brand and context", () => {
        render(<TopNav documentId="12345678-aaaa-bbbb-cccc-1234567890ab" />);

        expect(screen.getByText("Canva Clone")).toBeInTheDocument();
        expect(screen.getByText("Doc 12345678")).toBeInTheDocument();
    });
});
