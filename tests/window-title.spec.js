const { test, expect } = require("@playwright/test");

test.describe("window title status", () => {
  test("shows document identity, dirty state, length, and caret position without changing Markdown", async ({ page }) => {
    await page.goto("/");

    const markdown = page.locator("#markdownInput");
    await markdown.fill("Alpha\nBeta");

    await expect.poll(async () => page.title()).toBe("* New File - modified - 2 lines, 10 chars - L2:C5 - MD Editor");
    await expect(markdown).toHaveValue("Alpha\nBeta");

    await markdown.evaluate(element => {
      element.focus();
      element.setSelectionRange(2, 2);
      document.dispatchEvent(new Event("selectionchange"));
    });

    await expect.poll(async () => page.title()).toBe("* New File - modified - 2 lines, 10 chars - L1:C3 - MD Editor");
    await expect(markdown).toHaveValue("Alpha\nBeta");
  });

  test("uses the opened filename and clean state for a loaded file", async ({ page }) => {
    await page.goto("/");

    await page.evaluate(async () => {
      await window.openMarkdownFile(new File(["One\nTwo"], "notes.txt", { type: "text/plain" }));
    });

    await expect.poll(async () => page.title()).toBe("notes.txt - clean - 2 lines, 7 chars - L2:C4 - MD Editor");

    await page.locator("#markdownInput").fill("One\nTwo!");
    await expect.poll(async () => page.title()).toMatch(/^\* notes\.txt - modified - 2 lines, 8 chars - L2:C5 - MD Editor$/);
  });
});
