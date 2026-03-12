import { describe, it, expect } from "vitest";
import { createShapeElement, SHAPE_DEFAULTS } from "./Sidebar";

describe("SHAPE_DEFAULTS", () => {
  it("has correct rect defaults", () => {
    expect(SHAPE_DEFAULTS.rect).toEqual({
      type: "rect",
      width: 120,
      height: 80,
      fill: "#6366f1",
      rotation: 0,
    });
  });

  it("has correct ellipse defaults", () => {
    expect(SHAPE_DEFAULTS.ellipse).toEqual({
      type: "ellipse",
      width: 100,
      height: 100,
      fill: "#f472b6",
      rotation: 0,
    });
  });

  it("has correct text defaults", () => {
    expect(SHAPE_DEFAULTS.text).toEqual({
      type: "text",
      width: 200,
      height: 30,
      fill: "#e2e8f0",
      rotation: 0,
      text: "Double-click to edit",
      fontSize: 20,
    });
  });
});

describe("createShapeElement", () => {
  it("creates a rect at the given position", () => {
    const el = createShapeElement("rect", 150, 200);
    expect(el.type).toBe("rect");
    expect(el.x).toBe(150);
    expect(el.y).toBe(200);
    expect(el.width).toBe(120);
    expect(el.height).toBe(80);
    expect(el.fill).toBe("#6366f1");
  });

  it("creates an ellipse at the given position", () => {
    const el = createShapeElement("ellipse", 50, 75);
    expect(el.type).toBe("ellipse");
    expect(el.x).toBe(50);
    expect(el.y).toBe(75);
    expect(el.width).toBe(100);
    expect(el.height).toBe(100);
  });

  it("creates a text element with default text", () => {
    const el = createShapeElement("text", 10, 20);
    expect(el.type).toBe("text");
    expect(el.x).toBe(10);
    expect(el.y).toBe(20);
    if (el.type === "text") {
      expect(el.text).toBe("Double-click to edit");
      expect(el.fontSize).toBe(20);
    }
  });

  it("generates a unique id for each element", () => {
    const a = createShapeElement("rect", 0, 0);
    const b = createShapeElement("rect", 0, 0);
    expect(a.id).toBeTruthy();
    expect(b.id).toBeTruthy();
    expect(a.id).not.toBe(b.id);
  });

  it("generates valid UUID ids", () => {
    const el = createShapeElement("rect", 0, 0);
    expect(el.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
    );
  });
});
