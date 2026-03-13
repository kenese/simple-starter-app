import { test, expect } from "@playwright/test";

test("app loads with correct title and layout", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator(".topnav-brand")).toHaveText("Canva Clone");
    await expect(page.locator(".sidebar")).toBeVisible();
    await expect(page.locator(".canvas-container")).toBeVisible();
    await expect(page.locator(".static-canvas")).toBeVisible();
});
