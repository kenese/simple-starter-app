import { render } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { MemoryRouter, Routes, Route, useLocation } from "react-router-dom";
import { RedirectToNewDoc } from "./RedirectToNewDoc";

function LocationCapture({ onLocation }: { onLocation: (path: string) => void }) {
  onLocation(useLocation().pathname);
  return null;
}

describe("RedirectToNewDoc", () => {
  it("redirects from / to a UUID path", () => {
    let capturedPath = "";

    render(
      <MemoryRouter initialEntries={["/"]}>
        <Routes>
          <Route path="/" element={<RedirectToNewDoc />} />
          <Route
            path="/:id"
            element={<LocationCapture onLocation={(p) => (capturedPath = p)} />}
          />
        </Routes>
      </MemoryRouter>
    );

    expect(capturedPath).toMatch(
      /^\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
    );
  });

  it("generates a different id on each render", () => {
    const paths: string[] = [];

    for (let i = 0; i < 2; i++) {
      render(
        <MemoryRouter initialEntries={["/"]}>
          <Routes>
            <Route path="/" element={<RedirectToNewDoc />} />
            <Route
              path="/:id"
              element={<LocationCapture onLocation={(p) => paths.push(p)} />}
            />
          </Routes>
        </MemoryRouter>
      );
    }

    expect(paths[0]).not.toBe(paths[1]);
  });
});
