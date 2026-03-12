import { test, expect, Page } from "@playwright/test";

async function waitForReady(page: Page) {
  await page.waitForSelector(".design-canvas");
  await page.waitForFunction(
    () => (window as any).__canvasStore?.getState()?.documentReady === true
  );
}

async function moveMouse(page: Page, startX: number, startY: number, count = 15) {
  for (let i = 0; i < count; i++) {
    await page.mouse.move(startX + i * 2, startY + i * 2);
    await page.waitForTimeout(80);
  }
}

async function waitForCursors(page: Page) {
  await page.waitForFunction(
    () =>
      (window as any).__canvasStore.getState().remoteCursors.length > 0,
    null,
    { timeout: 10000 }
  );
}

test.describe("Multi-User Cursor Tracking", () => {
  test("User B sees User A's cursor position via WebRTC", async ({
    browser,
  }) => {
    const ctxA = await browser.newContext();
    const ctxB = await browser.newContext();
    const pageA = await ctxA.newPage();
    const pageB = await ctxB.newPage();

    await pageA.goto("/");
    await waitForReady(pageA);
    const docUrl = pageA.url();

    await pageB.goto(docUrl);
    await waitForReady(pageB);

    // Allow time for WebRTC peer connection + data channel to establish
    await pageA.waitForTimeout(3000);

    const canvas = await pageA.locator(".design-canvas").boundingBox();
    await moveMouse(pageA, canvas!.x + 200, canvas!.y + 150);

    await waitForCursors(pageB);

    const cursors = await pageB.evaluate(
      () => (window as any).__canvasStore.getState().remoteCursors
    );
    expect(cursors).toHaveLength(1);
    expect(cursors[0].x).toBeGreaterThan(0);
    expect(cursors[0].y).toBeGreaterThan(0);

    await ctxA.close();
    await ctxB.close();
  });

  test("remote cursor overlay element is rendered", async ({ browser }) => {
    const ctxA = await browser.newContext();
    const ctxB = await browser.newContext();
    const pageA = await ctxA.newPage();
    const pageB = await ctxB.newPage();

    await pageA.goto("/");
    await waitForReady(pageA);
    const docUrl = pageA.url();

    await pageB.goto(docUrl);
    await waitForReady(pageB);

    await pageA.waitForTimeout(3000);

    const canvas = await pageA.locator(".design-canvas").boundingBox();
    await moveMouse(pageA, canvas!.x + 300, canvas!.y + 200);

    await pageB.waitForSelector(".remote-cursor", { timeout: 10000 });
    const cursorEl = pageB.locator(".remote-cursor");
    await expect(cursorEl).toBeVisible();

    const label = pageB.locator(".remote-cursor-label");
    await expect(label).toBeVisible();

    await ctxA.close();
    await ctxB.close();
  });

  test("cursor is removed when user disconnects", async ({ browser }) => {
    const ctxA = await browser.newContext();
    const ctxB = await browser.newContext();
    const pageA = await ctxA.newPage();
    const pageB = await ctxB.newPage();

    await pageA.goto("/");
    await waitForReady(pageA);
    const docUrl = pageA.url();

    await pageB.goto(docUrl);
    await waitForReady(pageB);

    await pageA.waitForTimeout(3000);

    const canvas = await pageA.locator(".design-canvas").boundingBox();
    await moveMouse(pageA, canvas!.x + 250, canvas!.y + 180);

    await waitForCursors(pageB);

    await ctxA.close();

    await pageB.waitForFunction(
      () =>
        (window as any).__canvasStore.getState().remoteCursors.length === 0,
      null,
      { timeout: 10000 }
    );

    await ctxB.close();
  });
});
