import { test, expect, Page } from "@playwright/test";

// ─── Helpers ────────────────────────────────────────────────────

async function waitForReady(page: Page) {
  await page.waitForSelector(".design-canvas");
  await page.waitForFunction(
    () => (window as any).__canvasStore?.getState()?.documentReady === true
  );
}

async function getElements(page: Page) {
  return page.evaluate(() => (window as any).__canvasStore.getState().elements);
}

async function waitForElementCount(page: Page, count: number) {
  await page.waitForFunction(
    (n: number) =>
      (window as any).__canvasStore.getState().elements.length === n,
    count,
    { timeout: 5000 }
  );
}

// ─── Multi-User Real-Time Sync ──────────────────────────────────

test.describe("Multi-User Collaboration", () => {
  test("User B sees element added by User A in real-time", async ({
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

    await pageA.getByRole("button", { name: "Rectangle" }).click();

    await waitForElementCount(pageB, 1);
    const elementsB = await getElements(pageB);
    expect(elementsB).toHaveLength(1);
    expect(elementsB[0].type).toBe("rect");

    await ctxA.close();
    await ctxB.close();
  });

  test("both users see all elements added by either user", async ({
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

    await pageA.getByRole("button", { name: "Rectangle" }).click();
    await waitForElementCount(pageB, 1);

    await pageB.getByRole("button", { name: "Ellipse" }).click();
    await waitForElementCount(pageA, 2);

    const elementsA = await getElements(pageA);
    const elementsB = await getElements(pageB);
    expect(elementsA).toHaveLength(2);
    expect(elementsB).toHaveLength(2);

    await ctxA.close();
    await ctxB.close();
  });

  test("save by User A updates version for User B", async ({ browser }) => {
    const ctxA = await browser.newContext();
    const ctxB = await browser.newContext();
    const pageA = await ctxA.newPage();
    const pageB = await ctxB.newPage();

    await pageA.goto("/");
    await waitForReady(pageA);
    const docUrl = pageA.url();

    await pageB.goto(docUrl);
    await waitForReady(pageB);

    await pageA.getByRole("button", { name: "Rectangle" }).click();
    await pageA.getByRole("button", { name: "Save" }).click();

    await expect(pageA.locator(".topnav-version")).toContainText("v1");
    await expect(pageB.locator(".topnav-version")).toContainText("v1");

    await ctxA.close();
    await ctxB.close();
  });

  test("User B receives elements from User A's save", async ({ browser }) => {
    const ctxA = await browser.newContext();
    const ctxB = await browser.newContext();
    const pageA = await ctxA.newPage();
    const pageB = await ctxB.newPage();

    await pageA.goto("/");
    await waitForReady(pageA);
    const docUrl = pageA.url();

    await pageB.goto(docUrl);
    await waitForReady(pageB);

    await pageA.getByRole("button", { name: "Rectangle" }).click();
    await pageA.getByRole("button", { name: "Ellipse" }).click();
    await pageA.getByRole("button", { name: "Text" }).click();
    await pageA.getByRole("button", { name: "Save" }).click();

    await waitForElementCount(pageB, 3);
    const elementsB = await getElements(pageB);
    expect(elementsB.map((e: any) => e.type)).toEqual([
      "rect",
      "ellipse",
      "text",
    ]);

    await ctxA.close();
    await ctxB.close();
  });
});

// ─── Multi-User Locking ─────────────────────────────────────────

test.describe("Multi-User Locking", () => {
  test("dragging an element locks it for the other user", async ({
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

    await pageA.getByRole("button", { name: "Rectangle" }).click();
    await waitForElementCount(pageB, 1);

    const elementsA = await getElements(pageA);
    const el = elementsA[0];
    const canvasA = await pageA.locator(".design-canvas").boundingBox();

    const centerX = canvasA!.x + el.x + el.width / 2;
    const centerY = canvasA!.y + el.y + el.height / 2;

    await pageA.mouse.move(centerX, centerY);
    await pageA.mouse.down();
    await pageA.mouse.move(centerX + 20, centerY + 20, { steps: 5 });

    await pageB.waitForFunction(
      () => (window as any).__canvasStore.getState().locks.length > 0,
      null,
      { timeout: 5000 }
    );

    const isLocked = await pageB.evaluate(
      (id: string) =>
        (window as any).__canvasStore.getState().isLockedByOther(id),
      el.id
    );
    expect(isLocked).toBe(true);

    await pageA.mouse.up();

    await pageB.waitForFunction(
      () => (window as any).__canvasStore.getState().locks.length === 0,
      null,
      { timeout: 5000 }
    );

    await ctxA.close();
    await ctxB.close();
  });

  test("lock is released when dragging user drops the element", async ({
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

    await pageA.getByRole("button", { name: "Rectangle" }).click();
    await waitForElementCount(pageB, 1);

    const elementsA = await getElements(pageA);
    const el = elementsA[0];
    const canvasA = await pageA.locator(".design-canvas").boundingBox();

    const centerX = canvasA!.x + el.x + el.width / 2;
    const centerY = canvasA!.y + el.y + el.height / 2;

    await pageA.mouse.move(centerX, centerY);
    await pageA.mouse.down();
    await pageA.mouse.move(centerX + 30, centerY + 30, { steps: 5 });

    await pageB.waitForFunction(
      () => (window as any).__canvasStore.getState().locks.length > 0,
      null,
      { timeout: 5000 }
    );

    await pageA.mouse.up();

    await pageB.waitForFunction(
      () => (window as any).__canvasStore.getState().locks.length === 0,
      null,
      { timeout: 5000 }
    );

    const locksB = await pageB.evaluate(
      () => (window as any).__canvasStore.getState().locks
    );
    expect(locksB).toHaveLength(0);

    await ctxA.close();
    await ctxB.close();
  });

  test("locks are released when user disconnects", async ({ browser }) => {
    const ctxA = await browser.newContext();
    const ctxB = await browser.newContext();
    const pageA = await ctxA.newPage();
    const pageB = await ctxB.newPage();

    await pageA.goto("/");
    await waitForReady(pageA);
    const docUrl = pageA.url();

    await pageB.goto(docUrl);
    await waitForReady(pageB);

    await pageA.getByRole("button", { name: "Rectangle" }).click();
    await waitForElementCount(pageB, 1);

    const elementsA = await getElements(pageA);
    const el = elementsA[0];
    const canvasA = await pageA.locator(".design-canvas").boundingBox();

    const centerX = canvasA!.x + el.x + el.width / 2;
    const centerY = canvasA!.y + el.y + el.height / 2;

    await pageA.mouse.move(centerX, centerY);
    await pageA.mouse.down();
    await pageA.mouse.move(centerX + 10, centerY + 10, { steps: 3 });

    await pageB.waitForFunction(
      () => (window as any).__canvasStore.getState().locks.length > 0,
      null,
      { timeout: 5000 }
    );

    await ctxA.close();

    await pageB.waitForFunction(
      () => (window as any).__canvasStore.getState().locks.length === 0,
      null,
      { timeout: 10000 }
    );

    await ctxB.close();
  });
});
