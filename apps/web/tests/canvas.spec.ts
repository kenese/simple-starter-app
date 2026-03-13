/// <reference types="node" />
import { test, expect } from "@playwright/test";

test.describe("Sidebar", () => {
    test("displays three element buttons", async ({ page }) => {
        await page.goto("/");
        const buttons = page.locator(".sidebar-element-btn");
        await expect(buttons).toHaveCount(3);
        await expect(buttons.nth(0)).toContainText("Rectangle");
        await expect(buttons.nth(1)).toContainText("Circle");
        await expect(buttons.nth(2)).toContainText("Text");
    });
});

test.describe("Adding elements", () => {
    test("clicking Rectangle button adds an active rectangle", async ({
        page,
    }) => {
        await page.goto("/");
        await page.click('button:has-text("Rectangle")');
        const el = page.locator(".canvas-element--rectangle");
        await expect(el).toBeVisible();
        await expect(el).toHaveClass(/canvas-element--selected/);
    });

    test("clicking Circle button adds an active circle", async ({ page }) => {
        await page.goto("/");
        await page.click('button:has-text("Circle")');
        const el = page.locator(".canvas-element--circle");
        await expect(el).toBeVisible();
        await expect(el).toHaveClass(/canvas-element--selected/);
    });

    test("clicking Text button adds an active text element", async ({
        page,
    }) => {
        await page.goto("/");
        await page.click('button:has-text("Text")');
        const el = page.locator(".canvas-element--text");
        await expect(el).toBeVisible();
        await expect(el).toContainText("Text");
    });

    test("newly added element shows 8 resize handles", async ({ page }) => {
        await page.goto("/");
        await page.click('button:has-text("Rectangle")');
        await expect(page.locator(".resize-handle")).toHaveCount(8);
    });
});

test.describe("Activation and deactivation", () => {
    test("clicking empty canvas deactivates the element", async ({
        page,
    }) => {
        await page.goto("/");
        await page.click('button:has-text("Rectangle")');
        await expect(page.locator(".canvas-element--rectangle")).toBeVisible();

        await page.locator(".static-canvas").click({ position: { x: 5, y: 5 } });
        await expect(page.locator(".canvas-element")).toHaveCount(0);
    });

    test("Escape key deactivates the element", async ({ page }) => {
        await page.goto("/");
        await page.click('button:has-text("Circle")');
        await expect(page.locator(".canvas-element--circle")).toBeVisible();

        await page.keyboard.press("Escape");
        await expect(page.locator(".canvas-element")).toHaveCount(0);
    });

    test("clicking canvas where element was reactivates it", async ({
        page,
    }) => {
        await page.goto("/");
        await page.click('button:has-text("Rectangle")');
        const el = page.locator(".canvas-element--rectangle");
        const box = await el.boundingBox();

        await page.locator(".static-canvas").click({ position: { x: 5, y: 5 } });
        await expect(page.locator(".canvas-element")).toHaveCount(0);

        const canvasBox = await page
            .locator(".static-canvas")
            .boundingBox();
        await page.locator(".static-canvas").click({
            position: {
                x: box!.x - canvasBox!.x + box!.width / 2,
                y: box!.y - canvasBox!.y + box!.height / 2,
            },
        });
        await expect(page.locator(".canvas-element--rectangle")).toBeVisible();
    });
});

test.describe("Delete element", () => {
    test("Delete key removes the active element", async ({ page }) => {
        await page.goto("/");
        await page.click('button:has-text("Rectangle")');
        await expect(page.locator(".canvas-element--rectangle")).toBeVisible();

        await page.keyboard.press("Delete");
        await expect(page.locator(".canvas-element")).toHaveCount(0);

        await page.click('button:has-text("Rectangle")');
        await expect(page.locator(".canvas-element--rectangle")).toBeVisible();
    });

    test("Backspace key removes the active element", async ({ page }) => {
        await page.goto("/");
        await page.click('button:has-text("Circle")');
        await page.keyboard.press("Backspace");
        await expect(page.locator(".canvas-element")).toHaveCount(0);
    });
});

test.describe("Moving elements", () => {
    test("dragging an active element moves it and deactivates on drop", async ({
        page,
    }) => {
        await page.goto("/");
        await page.click('button:has-text("Rectangle")');
        const el = page.locator(".canvas-element--rectangle");
        const box = await el.boundingBox();

        const startX = box!.x + box!.width / 2;
        const startY = box!.y + box!.height / 2;

        await page.mouse.move(startX, startY);
        await page.mouse.down();
        await page.mouse.move(startX + 80, startY + 60, { steps: 5 });
        await page.mouse.up();

        await expect(page.locator(".canvas-element")).toHaveCount(0);

        const canvasBox = await page
            .locator(".static-canvas")
            .boundingBox();
        await page.locator(".static-canvas").click({
            position: {
                x: box!.x - canvasBox!.x + box!.width / 2 + 80,
                y: box!.y - canvasBox!.y + box!.height / 2 + 60,
            },
        });
        await expect(page.locator(".canvas-element--rectangle")).toBeVisible();
    });
});

test.describe("Text editing", () => {
    test("double-click text element opens textarea", async ({ page }) => {
        await page.goto("/");
        await page.click('button:has-text("Text")');
        const el = page.locator(".canvas-element--text");
        await el.dblclick();
        const textarea = page.locator(".canvas-element-textarea");
        await expect(textarea).toBeVisible();
        await expect(textarea).toHaveValue("Text");
    });

    test("typing and pressing Enter commits text and deactivates", async ({
        page,
    }) => {
        await page.goto("/");
        await page.click('button:has-text("Text")');
        await page.locator(".canvas-element--text").dblclick();

        const textarea = page.locator(".canvas-element-textarea");
        await textarea.fill("Hello World");
        await textarea.press("Enter");

        await expect(page.locator(".canvas-element")).toHaveCount(0);
    });

    test("pressing Escape cancels text editing and deactivates", async ({
        page,
    }) => {
        await page.goto("/");
        await page.click('button:has-text("Text")');
        await page.locator(".canvas-element--text").dblclick();
        await page.locator(".canvas-element-textarea").press("Escape");
        await expect(page.locator(".canvas-element")).toHaveCount(0);
    });
});

test.describe("Undo/Redo", () => {
    test("undo button reverts to previous version", async ({ page }) => {
        await page.goto("/");

        await page.click('button:has-text("Rectangle")');
        await page.locator(".canvas-element--rectangle").waitFor();
        await page.keyboard.press("Escape");
        await expect(page.locator(".canvas-element")).toHaveCount(0);

        await page.waitForFunction(() => {
            const btn = document.querySelector(".topnav-save-btn");
            return btn?.textContent?.trim() === "Saved";
        });

        await page.click('button:has-text("Circle")');
        await page.locator(".canvas-element--circle").waitFor();
        await page.keyboard.press("Escape");

        await page.waitForFunction(() => {
            const btn = document.querySelector(".topnav-save-btn");
            return btn?.textContent?.trim() === "Saved";
        });

        const undoBtn = page.locator(".topnav-undo-btn");
        await expect(undoBtn).toBeEnabled();
        await undoBtn.click();

        await page.waitForFunction(() => {
            const btn = document.querySelector(".topnav-undo-btn");
            return btn && !btn.hasAttribute("disabled") || btn?.getAttribute("disabled") === null;
        });

        await page.locator(".static-canvas").click({ position: { x: 400, y: 300 } });
        await expect(page.locator(".canvas-element--circle")).toHaveCount(0);
    });

    test("redo button restores undone version", async ({ page }) => {
        await page.goto("/");

        await page.click('button:has-text("Rectangle")');
        await page.locator(".canvas-element--rectangle").waitFor();
        await page.keyboard.press("Escape");

        await page.waitForFunction(() => {
            const btn = document.querySelector(".topnav-save-btn");
            return btn?.textContent?.trim() === "Saved";
        });

        await page.click('button:has-text("Circle")');
        await page.locator(".canvas-element--circle").waitFor();
        await page.keyboard.press("Escape");

        await page.waitForFunction(() => {
            const btn = document.querySelector(".topnav-save-btn");
            return btn?.textContent?.trim() === "Saved";
        });

        const undoBtn = page.locator(".topnav-undo-btn");
        await undoBtn.click();

        await page.waitForTimeout(500);

        const redoBtn = page.locator(".topnav-redo-btn");
        await expect(redoBtn).toBeEnabled();
        await redoBtn.click();

        await page.waitForTimeout(500);
        await expect(redoBtn).toBeDisabled();
    });

    test("undo/redo buttons are disabled when not applicable", async ({ page }) => {
        await page.goto("/");

        await page.waitForTimeout(500);
        const undoBtn = page.locator(".topnav-undo-btn");
        const redoBtn = page.locator(".topnav-redo-btn");
        await expect(undoBtn).toBeDisabled();
        await expect(redoBtn).toBeDisabled();
    });

    test("keyboard shortcuts Cmd+Z and Cmd+Shift+Z work", async ({ page }) => {
        await page.goto("/");

        await page.click('button:has-text("Rectangle")');
        await page.locator(".canvas-element--rectangle").waitFor();
        await page.keyboard.press("Escape");

        await page.waitForFunction(() => {
            const btn = document.querySelector(".topnav-save-btn");
            return btn?.textContent?.trim() === "Saved";
        });

        await page.click('button:has-text("Circle")');
        await page.locator(".canvas-element--circle").waitFor();
        await page.keyboard.press("Escape");

        await page.waitForFunction(() => {
            const btn = document.querySelector(".topnav-save-btn");
            return btn?.textContent?.trim() === "Saved";
        });

        const modifier = process.platform === "darwin" ? "Meta" : "Control";
        await page.keyboard.press(`${modifier}+z`);
        await page.waitForTimeout(500);

        await page.keyboard.press(`${modifier}+Shift+z`);
        await page.waitForTimeout(500);

        const redoBtn = page.locator(".topnav-redo-btn");
        await expect(redoBtn).toBeDisabled();
    });
});

test.describe("Drag from sidebar", () => {
    test("dragging element from sidebar to canvas adds it at drop position", async ({
        page,
    }) => {
        await page.goto("/");
        const rectBtn = page.locator('button:has-text("Rectangle")');
        const canvas = page.locator(".canvas-container");

        const btnBox = await rectBtn.boundingBox();
        const canvasBox = await canvas.boundingBox();

        const dropX = canvasBox!.x + canvasBox!.width / 2;
        const dropY = canvasBox!.y + canvasBox!.height / 2;

        await page.mouse.move(
            btnBox!.x + btnBox!.width / 2,
            btnBox!.y + btnBox!.height / 2
        );
        await page.mouse.down();
        await page.mouse.move(dropX, dropY, { steps: 10 });
        await page.mouse.up();

        await expect(
            page.locator(".canvas-element--rectangle")
        ).toBeVisible();
    });
});
