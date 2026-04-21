const { test, expect } = require("@playwright/test");

async function placeCaretAtVisualEditorEnd(page) {
  await page.evaluate(() => {
    const editor = document.getElementById("visualEditor");
    const range = document.createRange();
    range.selectNodeContents(editor);
    range.collapse(false);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
    editor.focus();
  });
}

test.describe("shortcuts and history", () => {
  test("shows keyboard shortcuts in the default document and button tooltips", async ({ page }) => {
    await page.goto("/");

    const markdown = page.locator("#markdownInput");
    await expect(markdown).toHaveValue(/## Keyboard shortcuts/);
    await expect(markdown).toHaveValue(/\| Bold \| Ctrl\/Cmd \+ B \|/);
    await expect(markdown).toHaveValue(/\| Reload file \| Ctrl\/Cmd \+ Shift \+ R \|/);
    await expect(markdown).toHaveValue(/\| Save as \| Ctrl\/Cmd \+ S \|/);

    await expect(page.locator('[data-command="bold"]')).toHaveAttribute("title", /Ctrl\/Cmd \+ B/);
    await expect(page.locator("#reloadDocumentButton")).toHaveAttribute("title", /Ctrl\/Cmd \+ Shift \+ R/);
    await expect(page.locator("#saveAsButton")).toHaveAttribute("title", /Ctrl\/Cmd \+ S/);
  });

  test("supports undo and redo across synced visual edits", async ({ page }) => {
    await page.goto("/");

    const markdown = page.locator("#markdownInput");
    await markdown.fill("Alpha");
    await expect(page.locator("#visualEditor")).toContainText("Alpha");

    await placeCaretAtVisualEditorEnd(page);
    await page.keyboard.type(" Beta");
    await expect(markdown).toHaveValue("Alpha Beta");

    await page.keyboard.press("Control+Z");
    await expect(markdown).toHaveValue("Alpha");

    await page.keyboard.press("Control+Y");
    await expect(markdown).toHaveValue("Alpha Beta");
  });
});
