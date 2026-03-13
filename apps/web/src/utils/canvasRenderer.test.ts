import { describe, it, expect, vi, beforeEach } from "vitest";
import type { CanvasElement } from "@starter/shared";
import { drawElement, renderStaticCanvas, hitTest } from "./canvasRenderer";

function createMockCtx() {
    return {
        save: vi.fn(),
        restore: vi.fn(),
        fillStyle: "",
        strokeStyle: "",
        lineWidth: 0,
        font: "",
        textAlign: "" as CanvasTextAlign,
        textBaseline: "" as CanvasTextBaseline,
        beginPath: vi.fn(),
        roundRect: vi.fn(),
        fill: vi.fn(),
        ellipse: vi.fn(),
        setLineDash: vi.fn(),
        strokeRect: vi.fn(),
        fillText: vi.fn(),
        clearRect: vi.fn(),
        resetTransform: vi.fn(),
        setTransform: vi.fn(),
    } as unknown as CanvasRenderingContext2D;
}

const rect: CanvasElement = {
    id: "r1",
    type: "rectangle",
    x: 100,
    y: 100,
    width: 150,
    height: 100,
};

const circle: CanvasElement = {
    id: "c1",
    type: "circle",
    x: 300,
    y: 200,
    width: 120,
    height: 120,
};

const text: CanvasElement = {
    id: "t1",
    type: "text",
    x: 50,
    y: 50,
    width: 200,
    height: 40,
    content: "Hello",
};

// ── hitTest ──────────────────────────────────────────────────────

describe("hitTest", () => {
    it("returns null for an empty array", () => {
        expect(hitTest([], 100, 100)).toBeNull();
    });

    it("returns null when point is outside all elements", () => {
        expect(hitTest([rect, circle], 0, 0)).toBeNull();
    });

    it("returns element when point is inside its bounds", () => {
        expect(hitTest([rect], 150, 150)).toBe(rect);
    });

    it("returns topmost element when overlapping", () => {
        const overlapping: CanvasElement = {
            id: "r2",
            type: "rectangle",
            x: 100,
            y: 100,
            width: 150,
            height: 100,
        };
        expect(hitTest([rect, overlapping], 150, 150)).toBe(overlapping);
    });

    it("returns element on exact boundary", () => {
        expect(hitTest([rect], 100, 100)).toBe(rect);
        expect(hitTest([rect], 250, 200)).toBe(rect);
    });

    it("excludes element with excludeId", () => {
        expect(hitTest([rect], 150, 150, "r1")).toBeNull();
    });

    it("returns next element when topmost is excluded", () => {
        const behind: CanvasElement = {
            id: "r0",
            type: "rectangle",
            x: 90,
            y: 90,
            width: 200,
            height: 150,
        };
        expect(hitTest([behind, rect], 150, 150, "r1")).toBe(behind);
    });

    it("handles null excludeId gracefully", () => {
        expect(hitTest([rect], 150, 150, null)).toBe(rect);
    });
});

// ── drawElement ──────────────────────────────────────────────────

describe("drawElement", () => {
    let ctx: CanvasRenderingContext2D;

    beforeEach(() => {
        ctx = createMockCtx();
    });

    it("saves and restores context for every element type", () => {
        drawElement(ctx, rect);
        expect(ctx.save).toHaveBeenCalledOnce();
        expect(ctx.restore).toHaveBeenCalledOnce();
    });

    it("draws rectangle with roundRect and fill", () => {
        drawElement(ctx, rect);
        expect(ctx.beginPath).toHaveBeenCalled();
        expect(ctx.roundRect).toHaveBeenCalledWith(100, 100, 150, 100, 4);
        expect(ctx.fill).toHaveBeenCalled();
        expect(ctx.fillStyle).toBe("#6366f1");
    });

    it("draws circle with ellipse and fill", () => {
        drawElement(ctx, circle);
        expect(ctx.beginPath).toHaveBeenCalled();
        expect(ctx.ellipse).toHaveBeenCalledWith(
            360,
            260,
            60,
            60,
            0,
            0,
            Math.PI * 2
        );
        expect(ctx.fill).toHaveBeenCalled();
        expect(ctx.fillStyle).toBe("#ec4899");
    });

    it("draws text with dashed border and fillText", () => {
        drawElement(ctx, text);
        expect(ctx.setLineDash).toHaveBeenCalledWith([4, 4]);
        expect(ctx.strokeRect).toHaveBeenCalled();
        expect(ctx.fillText).toHaveBeenCalledWith("Hello", 150, 70, 184);
        expect(ctx.setLineDash).toHaveBeenCalledWith([]);
    });

    it("skips fillText for text element with no content", () => {
        const empty: CanvasElement = { ...text, content: undefined };
        drawElement(ctx, empty);
        expect(ctx.fillText).not.toHaveBeenCalled();
    });
});

// ── renderStaticCanvas ───────────────────────────────────────────

describe("renderStaticCanvas", () => {
    let ctx: CanvasRenderingContext2D;
    const canvas = { width: 1600, height: 1200 } as HTMLCanvasElement;

    beforeEach(() => {
        ctx = createMockCtx();
        vi.stubGlobal("devicePixelRatio", 2);
    });

    it("clears the full canvas and sets DPR transform", () => {
        renderStaticCanvas(ctx, canvas, [], null);
        expect(ctx.resetTransform).toHaveBeenCalled();
        expect(ctx.clearRect).toHaveBeenCalledWith(0, 0, 1600, 1200);
        expect(ctx.setTransform).toHaveBeenCalledWith(2, 0, 0, 2, 0, 0);
    });

    it("draws all elements when no active element", () => {
        renderStaticCanvas(ctx, canvas, [rect, circle], null);
        expect(ctx.save).toHaveBeenCalledTimes(2);
    });

    it("skips the active element", () => {
        renderStaticCanvas(ctx, canvas, [rect, circle], "r1");
        expect(ctx.save).toHaveBeenCalledTimes(1);
        expect(ctx.fillStyle).toBe("#ec4899");
    });

    it("draws nothing for an empty elements array", () => {
        renderStaticCanvas(ctx, canvas, [], null);
        expect(ctx.save).not.toHaveBeenCalled();
    });
});
