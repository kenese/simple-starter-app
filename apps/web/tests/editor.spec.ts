import { test, expect, Page } from "@playwright/test";

// ─── Helpers ────────────────────────────────────────────────────

async function getElements(page: Page) {
  return page.evaluate(() => (window as any).__canvasStore.getState().elements);
}

async function getStoreState(page: Page) {
  return page.evaluate(() => {
    const s = (window as any).__canvasStore.getState();
    return {
      elements: s.elements,
      selectedId: s.selectedId,
      isDirty: s.isDirty,
      version: s.version,
      docName: s.docName,
      documentReady: s.documentReady,
    };
  });
}

async function waitForReady(page: Page) {
  await page.waitForSelector(".design-canvas");
  await page.waitForFunction(
    () => (window as any).__canvasStore?.getState()?.documentReady === true
  );
}

async function getCanvasBounds(page: Page) {
  const box = await page.locator(".design-canvas").boundingBox();
  if (!box) throw new Error("Canvas not found");
  return box;
}

// ─── Add Elements ───────────────────────────────────────────────

test.describe("Add Elements", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await waitForReady(page);
  });

  test("adds a rectangle via sidebar button", async ({ page }) => {
    await page.getByRole("button", { name: "Rectangle" }).click();

    const elements = await getElements(page);
    expect(elements).toHaveLength(1);
    expect(elements[0].type).toBe("rect");
    expect(elements[0].width).toBe(120);
    expect(elements[0].height).toBe(80);
    expect(elements[0].fill).toBe("#6366f1");
  });

  test("adds an ellipse via sidebar button", async ({ page }) => {
    await page.getByRole("button", { name: "Ellipse" }).click();

    const elements = await getElements(page);
    expect(elements).toHaveLength(1);
    expect(elements[0].type).toBe("ellipse");
    expect(elements[0].width).toBe(100);
    expect(elements[0].height).toBe(100);
    expect(elements[0].fill).toBe("#f472b6");
  });

  test("adds a text element via sidebar button", async ({ page }) => {
    await page.getByRole("button", { name: "Text" }).click();

    const elements = await getElements(page);
    expect(elements).toHaveLength(1);
    expect(elements[0].type).toBe("text");
    expect(elements[0].text).toBe("Double-click to edit");
    expect(elements[0].fontSize).toBe(20);
  });

  test("adds multiple elements of different types", async ({ page }) => {
    await page.getByRole("button", { name: "Rectangle" }).click();
    await page.getByRole("button", { name: "Ellipse" }).click();
    await page.getByRole("button", { name: "Text" }).click();

    const elements = await getElements(page);
    expect(elements).toHaveLength(3);
    expect(elements.map((e: any) => e.type)).toEqual([
      "rect",
      "ellipse",
      "text",
    ]);
  });
});

// ─── Move Elements ──────────────────────────────────────────────

test.describe("Move Elements", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await waitForReady(page);
  });

  test("moves a rectangle by dragging on canvas", async ({ page }) => {
    await page.getByRole("button", { name: "Rectangle" }).click();
    const [element] = await getElements(page);
    const canvas = await getCanvasBounds(page);

    const centerX = canvas.x + element.x + element.width / 2;
    const centerY = canvas.y + element.y + element.height / 2;
    const dx = 100;
    const dy = 80;

    await page.mouse.move(centerX, centerY);
    await page.mouse.down();
    await page.mouse.move(centerX + dx, centerY + dy, { steps: 10 });
    await page.mouse.up();

    const [moved] = await getElements(page);
    expect(moved.x).toBeGreaterThan(element.x + dx / 2);
    expect(moved.y).toBeGreaterThan(element.y + dy / 2);
  });

  test("moves an ellipse by dragging on canvas", async ({ page }) => {
    await page.getByRole("button", { name: "Ellipse" }).click();
    const [element] = await getElements(page);
    const canvas = await getCanvasBounds(page);

    const centerX = canvas.x + element.x + element.width / 2;
    const centerY = canvas.y + element.y + element.height / 2;
    const dx = 80;
    const dy = 60;

    await page.mouse.move(centerX, centerY);
    await page.mouse.down();
    await page.mouse.move(centerX + dx, centerY + dy, { steps: 10 });
    await page.mouse.up();

    const [moved] = await getElements(page);
    expect(moved.x).not.toBe(element.x);
    expect(moved.y).not.toBe(element.y);
  });
});

// ─── Resize Elements ────────────────────────────────────────────

test.describe("Resize Elements", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await waitForReady(page);
  });

  test("resizes a rectangle via bottom-right transformer handle", async ({
    page,
  }) => {
    await page.getByRole("button", { name: "Rectangle" }).click();
    const [element] = await getElements(page);
    const canvas = await getCanvasBounds(page);

    const centerX = canvas.x + element.x + element.width / 2;
    const centerY = canvas.y + element.y + element.height / 2;
    await page.mouse.click(centerX, centerY);

    const state = await getStoreState(page);
    expect(state.selectedId).toBe(element.id);

    const handleX = canvas.x + element.x + element.width;
    const handleY = canvas.y + element.y + element.height;

    await page.mouse.move(handleX, handleY);
    await page.mouse.down();
    await page.mouse.move(handleX + 60, handleY + 40, { steps: 10 });
    await page.mouse.up();

    const [resized] = await getElements(page);
    expect(resized.width).toBeGreaterThan(element.width);
    expect(resized.height).toBeGreaterThan(element.height);
  });
});

// ─── Save Document ──────────────────────────────────────────────

test.describe("Save Document", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await waitForReady(page);
  });

  test("save button is disabled when document is clean", async ({ page }) => {
    await expect(page.getByRole("button", { name: "Save" })).toBeDisabled();
  });

  test("save button enables after adding an element", async ({ page }) => {
    await page.getByRole("button", { name: "Rectangle" }).click();
    await expect(page.getByRole("button", { name: "Save" })).toBeEnabled();
  });

  test("saves document and shows version badge", async ({ page }) => {
    await page.getByRole("button", { name: "Rectangle" }).click();
    await page.getByRole("button", { name: "Save" }).click();

    await expect(page.locator(".topnav-version")).toContainText("v1");
  });

  test("increments version on successive saves", async ({ page }) => {
    await page.getByRole("button", { name: "Rectangle" }).click();
    await page.getByRole("button", { name: "Save" }).click();
    await expect(page.locator(".topnav-version")).toContainText("v1");

    await page.getByRole("button", { name: "Ellipse" }).click();
    await page.getByRole("button", { name: "Save" }).click();
    await expect(page.locator(".topnav-version")).toContainText("v2");
  });

  test("disables save button after saving", async ({ page }) => {
    await page.getByRole("button", { name: "Rectangle" }).click();
    await page.getByRole("button", { name: "Save" }).click();
    await expect(page.locator(".topnav-version")).toContainText("v1");

    await expect(page.getByRole("button", { name: "Save" })).toBeDisabled();
  });

  test("persists elements after save and page reload", async ({ page }) => {
    await page.getByRole("button", { name: "Rectangle" }).click();
    await page.getByRole("button", { name: "Ellipse" }).click();
    await page.getByRole("button", { name: "Save" }).click();
    await expect(page.locator(".topnav-version")).toContainText("v1");

    const url = page.url();
    await page.goto(url);
    await waitForReady(page);

    const elements = await getElements(page);
    expect(elements).toHaveLength(2);
    expect(elements[0].type).toBe("rect");
    expect(elements[1].type).toBe("ellipse");
  });
});

// ─── Delete Elements ────────────────────────────────────────────

test.describe("Delete Elements", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await waitForReady(page);
  });

  test("deletes selected element with Delete key", async ({ page }) => {
    await page.getByRole("button", { name: "Rectangle" }).click();
    const [element] = await getElements(page);
    const canvas = await getCanvasBounds(page);

    const centerX = canvas.x + element.x + element.width / 2;
    const centerY = canvas.y + element.y + element.height / 2;
    await page.mouse.click(centerX, centerY);
    await page.keyboard.press("Delete");

    const elements = await getElements(page);
    expect(elements).toHaveLength(0);
  });

  test("deletes selected element with Backspace key", async ({ page }) => {
    await page.getByRole("button", { name: "Rectangle" }).click();
    const [element] = await getElements(page);
    const canvas = await getCanvasBounds(page);

    const centerX = canvas.x + element.x + element.width / 2;
    const centerY = canvas.y + element.y + element.height / 2;
    await page.mouse.click(centerX, centerY);
    await page.keyboard.press("Backspace");

    const elements = await getElements(page);
    expect(elements).toHaveLength(0);
  });

  test("does not delete text elements with Delete key", async ({ page }) => {
    await page.getByRole("button", { name: "Text" }).click();
    const [element] = await getElements(page);
    const canvas = await getCanvasBounds(page);

    const centerX = canvas.x + element.x + element.width / 2;
    const centerY = canvas.y + element.y + element.height / 2;
    await page.mouse.click(centerX, centerY);
    await page.keyboard.press("Delete");

    const elements = await getElements(page);
    expect(elements).toHaveLength(1);
  });
});
