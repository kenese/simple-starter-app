import { test, expect } from "@playwright/test";

test.describe("Multi-user presence", () => {
    test("shows user avatar when connected to a document", async ({ page }) => {
        await page.goto("/");
        await page.waitForURL(/\/[a-f0-9-]+/);

        const avatars = page.locator(".topnav-user-avatar");
        await expect(avatars).toHaveCount(1, { timeout: 5000 });
    });

    test("two tabs on the same document show two user avatars", async ({ browser }) => {
        const context1 = await browser.newContext();
        const context2 = await browser.newContext();
        const page1 = await context1.newPage();

        await page1.goto("/");
        await page1.waitForURL(/\/[a-f0-9-]+/);
        const docUrl = page1.url();

        await page1.locator(".topnav-user-avatar").first().waitFor({ timeout: 5000 });

        const page2 = await context2.newPage();
        await page2.goto(docUrl);
        await page2.waitForURL(/\/[a-f0-9-]+/);

        await expect(page1.locator(".topnav-user-avatar")).toHaveCount(2, { timeout: 5000 });
        await expect(page2.locator(".topnav-user-avatar")).toHaveCount(2, { timeout: 5000 });

        await context1.close();
        await context2.close();
    });

    test("user avatar disappears when the other tab closes", async ({ browser }) => {
        const context1 = await browser.newContext();
        const context2 = await browser.newContext();
        const page1 = await context1.newPage();

        await page1.goto("/");
        await page1.waitForURL(/\/[a-f0-9-]+/);
        const docUrl = page1.url();

        await page1.locator(".topnav-user-avatar").first().waitFor({ timeout: 5000 });

        const page2 = await context2.newPage();
        await page2.goto(docUrl);
        await expect(page1.locator(".topnav-user-avatar")).toHaveCount(2, { timeout: 5000 });

        await context2.close();
        await expect(page1.locator(".topnav-user-avatar")).toHaveCount(1, { timeout: 5000 });

        await context1.close();
    });
});

test.describe("Multi-user element sync", () => {
    test("element added in one tab appears in the other", async ({ browser }) => {
        const context1 = await browser.newContext();
        const context2 = await browser.newContext();
        const page1 = await context1.newPage();

        await page1.goto("/");
        await page1.waitForURL(/\/[a-f0-9-]+/);
        const docUrl = page1.url();

        const page2 = await context2.newPage();
        await page2.goto(docUrl);
        await page2.waitForURL(/\/[a-f0-9-]+/);

        await expect(page1.locator(".topnav-user-avatar")).toHaveCount(2, { timeout: 5000 });

        await page1.click('button:has-text("Rectangle")');
        await page1.locator(".canvas-element--rectangle").waitFor();

        await page1.waitForFunction(() => {
            const btn = document.querySelector(".topnav-save-btn");
            return btn?.textContent?.trim() === "Saved";
        }, undefined, { timeout: 5000 });

        await page2.locator(".static-canvas").click({
            position: { x: 400, y: 300 },
        });
        await expect(page2.locator(".canvas-element--rectangle")).toBeVisible({ timeout: 5000 });

        await context1.close();
        await context2.close();
    });
});
