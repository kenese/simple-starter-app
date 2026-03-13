import type { CanvasElement } from "@starter/shared";

const COLORS: Record<string, string> = {
    rectangle: "#6366f1",
    circle: "#ec4899",
};
const TEXT_COLOR = "#e2e8f0";
const TEXT_BORDER = "#2d2d50";
const TEXT_FONT = '500 18px Inter, -apple-system, BlinkMacSystemFont, sans-serif';

export function drawElement(
    ctx: CanvasRenderingContext2D,
    el: CanvasElement
): void {
    ctx.save();

    switch (el.type) {
        case "rectangle":
            ctx.fillStyle = COLORS.rectangle;
            ctx.beginPath();
            ctx.roundRect(el.x, el.y, el.width, el.height, 4);
            ctx.fill();
            break;

        case "circle":
            ctx.fillStyle = COLORS.circle;
            ctx.beginPath();
            ctx.ellipse(
                el.x + el.width / 2,
                el.y + el.height / 2,
                el.width / 2,
                el.height / 2,
                0,
                0,
                Math.PI * 2
            );
            ctx.fill();
            break;

        case "text":
            ctx.setLineDash([4, 4]);
            ctx.strokeStyle = TEXT_BORDER;
            ctx.lineWidth = 1;
            ctx.strokeRect(el.x + 0.5, el.y + 0.5, el.width, el.height);
            ctx.setLineDash([]);

            if (el.content) {
                ctx.fillStyle = TEXT_COLOR;
                ctx.font = TEXT_FONT;
                ctx.textAlign = "center";
                ctx.textBaseline = "middle";
                ctx.fillText(
                    el.content,
                    el.x + el.width / 2,
                    el.y + el.height / 2,
                    el.width - 16
                );
            }
            break;
    }

    ctx.restore();
}

export function renderStaticCanvas(
    ctx: CanvasRenderingContext2D,
    canvas: HTMLCanvasElement,
    elements: CanvasElement[],
    activeElementId: string | null
): void {
    const dpr = window.devicePixelRatio || 1;
    ctx.resetTransform();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    for (const el of elements) {
        if (el.id === activeElementId) continue;
        drawElement(ctx, el);
    }
}

/** Returns the topmost element whose bounding box contains (x, y). */
export function hitTest(
    elements: CanvasElement[],
    x: number,
    y: number,
    excludeId?: string | null
): CanvasElement | null {
    for (let i = elements.length - 1; i >= 0; i--) {
        const el = elements[i];
        if (el.id === excludeId) continue;
        if (
            x >= el.x &&
            x <= el.x + el.width &&
            y >= el.y &&
            y <= el.y + el.height
        ) {
            return el;
        }
    }
    return null;
}
