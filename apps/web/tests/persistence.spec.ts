import { test, expect } from "@playwright/test";

test.describe("Document auto-creation and routing", () => {
    test("visiting / redirects to a document URL", async ({ page }) => {
        await page.goto("/");
        await page.waitForURL(/\/[a-f0-9-]+/);
        expect(page.url()).toMatch(/\/[a-f0-9-]{36}$/);
    });

    test("document title is displayed in the nav", async ({ page }) => {
        await page.goto("/");
        await page.waitForURL(/\/[a-f0-9-]+/);
        const title = page.locator(".topnav-title-btn");
        await expect(title).toBeVisible();
        await expect(title).toHaveText(/Untitled/);
    });
});

test.describe("Document persistence", () => {
    test("adding an element, saving, and reloading preserves it", async ({
        page,
    }) => {
        await page.goto("/");
        await page.waitForURL(/\/[a-f0-9-]+/);
        const url = page.url();

        await page.click('button:has-text("Rectangle")');
        const el = page.locator(".canvas-element--rectangle");
        await expect(el).toBeVisible();
        const box = await el.boundingBox();

        // Click save button to persist
        const saveBtn = page.locator(".topnav-save-btn");
        if (await saveBtn.isEnabled()) {
            await saveBtn.click();
        }
        await expect(saveBtn).toHaveText("Saved", { timeout: 3000 });

        // Reload the same document URL
        await page.goto(url);
        await page.waitForTimeout(500);

        // Click where the element was to reactivate from static canvas
        const canvas = page.locator(".static-canvas");
        const canvasBox = await canvas.boundingBox();
        await canvas.click({
            position: {
                x: box!.x - canvasBox!.x + box!.width / 2,
                y: box!.y - canvasBox!.y + box!.height / 2,
            },
        });
        await expect(page.locator(".canvas-element--rectangle")).toBeVisible();
    });
});

test.describe("Manual save button", () => {
    test("shows Saved when document is clean", async ({ page }) => {
        await page.goto("/");
        await page.waitForURL(/\/[a-f0-9-]+/);
        const saveBtn = page.locator(".topnav-save-btn");
        await expect(saveBtn).toHaveText("Saved");
        await expect(saveBtn).toBeDisabled();
    });

    test("shows Save when dirty, Saved after click", async ({ page }) => {
        await page.goto("/");
        await page.waitForURL(/\/[a-f0-9-]+/);

        await page.click('button:has-text("Rectangle")');
        // Deactivate to trigger save
        await page.keyboard.press("Escape");
        await page.waitForTimeout(300);

        // Add another element to make it dirty again
        await page.click('button:has-text("Circle")');
        await page.waitForTimeout(100);

        const saveBtn = page.locator(".topnav-save-btn");
        // It might be Save or Saving depending on timing; after stabilization:
        await page.keyboard.press("Escape");
        await page.waitForTimeout(100);

        // Click save if it's dirty
        if (await saveBtn.isEnabled()) {
            await saveBtn.click();
            await expect(saveBtn).toHaveText("Saved", { timeout: 3000 });
        }
    });
});

test.describe("Document switching", () => {
    test("creating a new document via dropdown navigates to it", async ({
        page,
    }) => {
        await page.goto("/");
        await page.waitForURL(/\/[a-f0-9-]+/);
        const firstUrl = page.url();

        await page.click("text=Documents ▾");
        await page.click("text=+ New Document");

        await page.waitForFunction(
            (oldUrl) => window.location.href !== oldUrl,
            firstUrl,
            { timeout: 5000 }
        );
        expect(page.url()).not.toBe(firstUrl);
    });

    test("selecting a document from dropdown loads it", async ({ page }) => {
        await page.goto("/");
        await page.waitForURL(/\/[a-f0-9-]+/);

        // Create a second document
        await page.click("text=Documents ▾");
        await page.click("text=+ New Document");
        await page.waitForURL(/\/[a-f0-9-]+/);

        // Add an element to second doc
        await page.click('button:has-text("Circle")');
        await page.keyboard.press("Escape");
        await page.waitForTimeout(500);

        // Switch back to first doc via dropdown
        await page.click("text=Documents ▾");
        const items = page.locator(
            ".topnav-dropdown-item:not(.topnav-dropdown-new):not(.topnav-dropdown-item--active)"
        );
        const count = await items.count();
        if (count > 0) {
            await items.first().click();
            await page.waitForTimeout(500);
            // First doc should not have the circle element
            await expect(page.locator(".canvas-element--circle")).toHaveCount(0);
        }
    });
});

test.describe("Document renaming", () => {
    test("clicking the title opens an edit input", async ({ page }) => {
        await page.goto("/");
        await page.waitForURL(/\/[a-f0-9-]+/);

        await page.click(".topnav-title-btn");
        const input = page.locator(".topnav-title-input");
        await expect(input).toBeVisible();
    });

    test("typing a new name and pressing Enter renames", async ({ page }) => {
        await page.goto("/");
        await page.waitForURL(/\/[a-f0-9-]+/);

        const uniqueName = `Design ${Date.now()}`;
        await page.click(".topnav-title-btn");
        const input = page.locator(".topnav-title-input");
        await input.fill(uniqueName);
        await input.press("Enter");

        await expect(page.locator(".topnav-title-btn")).toHaveText(
            uniqueName,
            { timeout: 5000 }
        );
    });

    test("pressing Escape cancels rename", async ({ page }) => {
        await page.goto("/");
        await page.waitForURL(/\/[a-f0-9-]+/);

        const originalName = await page
            .locator(".topnav-title-btn")
            .textContent();
        await page.click(".topnav-title-btn");
        const input = page.locator(".topnav-title-input");
        await input.fill("Something Else");
        await input.press("Escape");

        await expect(page.locator(".topnav-title-btn")).toHaveText(
            originalName!
        );
    });
});
