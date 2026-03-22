import { test, expect } from "@playwright/test";

test.describe("Editor (sidebar + canvas)", () => {
    test.beforeEach(async ({ page }) => {
        await page.goto("/");
    });

    test("shows sidebar and canvas on editor page", async ({ page }) => {
        await expect(page.getByTestId("editor-sidebar")).toBeVisible();
        await expect(page.getByTestId("editor-canvas")).toBeVisible();
        await expect(page.getByText("Elements")).toBeVisible();
    });

    test("clicking sidebar element adds it to canvas", async ({ page }) => {
        const canvas = page.getByTestId("editor-canvas");
        await expect(canvas).toBeVisible();

        await page.getByTestId("sidebar-circle").click();
        await expect(page.getByTestId(/canvas-circle-/)).toBeVisible();

        await page.getByTestId("sidebar-square").click();
        await expect(page.getByTestId(/canvas-square-/)).toBeVisible();

        await page.getByTestId("sidebar-text").click();
        await expect(page.getByTestId(/canvas-text-/)).toBeVisible();
    });

    test("dragging element from sidebar onto canvas adds it", async ({ page }) => {
        const canvas = page.getByTestId("editor-canvas");
        const circleItem = page.getByTestId("sidebar-circle");

        await circleItem.dragTo(canvas, { targetPosition: { x: 200, y: 150 } });
        await expect(page.getByTestId(/canvas-circle-/)).toBeVisible();
    });

    test("clicking an element selects it and shows resize handles", async ({ page }) => {
        await page.getByTestId("sidebar-square").click();
        const el = page.getByTestId(/canvas-square-/);
        await expect(el).toBeVisible();

        await el.click();
        const wrapper = el.locator("..");
        await expect(wrapper).toHaveClass(/editor-canvas-element-wrapper--selected/);
        await expect(page.locator("[data-handle='se']")).toBeVisible();
    });

    test("clicking empty canvas clears selection", async ({ page }) => {
        await page.getByTestId("sidebar-square").click();
        const el = page.getByTestId(/canvas-square-/);
        await el.click();

        const wrapper = el.locator("..");
        await expect(wrapper).toHaveClass(/editor-canvas-element-wrapper--selected/);

        const canvas = page.getByTestId("editor-canvas");
        const box = await canvas.boundingBox();
        await page.mouse.click(box!.x + box!.width - 10, box!.y + box!.height - 10);

        await expect(wrapper).not.toHaveClass(/editor-canvas-element-wrapper--selected/);
    });

    test("element can be moved by dragging", async ({ page }) => {
        await page.getByTestId("sidebar-square").click();
        const el = page.getByTestId(/canvas-square-/);
        await expect(el).toBeVisible();

        const wrapper = el.locator("..");
        const startBox = await wrapper.boundingBox();
        const startLeft = startBox!.x;
        const startTop = startBox!.y;

        const cx = startBox!.x + startBox!.width / 2;
        const cy = startBox!.y + startBox!.height / 2;

        await page.mouse.move(cx, cy);
        await page.mouse.down();
        await page.mouse.move(cx + 60, cy + 40, { steps: 5 });
        await page.mouse.up();

        const endBox = await wrapper.boundingBox();
        expect(endBox!.x).toBeGreaterThan(startLeft + 30);
        expect(endBox!.y).toBeGreaterThan(startTop + 20);
    });

    test("element can be resized via corner handle", async ({ page }) => {
        await page.getByTestId("sidebar-square").click();
        const el = page.getByTestId(/canvas-square-/);
        await el.click();

        const handle = page.locator("[data-handle='se']");
        await expect(handle).toBeVisible();

        const wrapper = el.locator("..");
        const beforeBox = await wrapper.boundingBox();
        const beforeWidth = beforeBox!.width;
        const beforeHeight = beforeBox!.height;

        const hBox = await handle.boundingBox();
        const hx = hBox!.x + hBox!.width / 2;
        const hy = hBox!.y + hBox!.height / 2;

        await page.mouse.move(hx, hy);
        await page.mouse.down();
        await page.mouse.move(hx + 50, hy + 50, { steps: 5 });
        await page.mouse.up();

        const afterBox = await wrapper.boundingBox();
        expect(afterBox!.width).toBeGreaterThan(beforeWidth + 20);
        expect(afterBox!.height).toBeGreaterThan(beforeHeight + 20);
    });

    test("text element can be edited by double-clicking", async ({ page }) => {
        await page.getByTestId("sidebar-text").click();
        const el = page.getByTestId(/canvas-text-/);
        await expect(el).toBeVisible();
        await expect(el).toHaveText("Text");

        await el.dblclick();
        const input = page.getByTestId(/canvas-text-input-/);
        await expect(input).toBeVisible();

        await input.fill("New label");
        await input.press("Enter");

        const updated = page.getByTestId(/canvas-text-/);
        await expect(updated).toHaveText("New label");
    });
});
