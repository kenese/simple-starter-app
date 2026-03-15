import { expect, test } from "@playwright/test";

test.describe("Document persistence flows", () => {
    test("redirects root route to a document UUID route", async ({ page }) => {
        await page.goto("/");
        await expect(page).toHaveURL(/\/[0-9a-f-]{36}$/);
    });

    test("saves and reloads document content for current URL", async ({ page }) => {
        await page.goto("/");

        await page.getByRole("button", { name: "Rectangle" }).click();
        await page.getByRole("button", { name: "Save design" }).click();
        await expect(page.locator(".editor-status-text")).toContainText("Saved version 1");

        const beforeReload = page.url();
        await page.reload();

        await expect(page).toHaveURL(beforeReload);
        await expect(page.locator(".canvas-element--rectangle")).toHaveCount(1);
        await expect(page.locator(".editor-status-text")).toContainText("Loaded version 1");
    });

    test("retains only 10 versions while latest version increments", async ({ page }) => {
        await page.goto("/");
        await page.getByRole("button", { name: "Rectangle" }).click();

        for (let index = 0; index < 11; index += 1) {
            await page.getByRole("button", { name: "Save design" }).click();
            await expect(page.locator(".editor-status-text")).toContainText(
                `Saved version ${index + 1}`
            );
        }

        await expect(page.locator(".editor-status-text")).toContainText("Saved version 11 (10/10 retained)");
    });
});
