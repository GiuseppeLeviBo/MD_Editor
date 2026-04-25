const { test, expect } = require("@playwright/test");

// These tests exercise the visual-to-Markdown synchronization path: toolbar
// commands must update the source Markdown and the rendered preview together.
async function selectWordInVisualEditor(page, word) {
  await page.evaluate(targetWord => {
    const editor = document.getElementById("visualEditor");
    const walker = document.createTreeWalker(editor, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) {
      const index = node.textContent.indexOf(targetWord);
      if (index >= 0) {
        const range = document.createRange();
        range.setStart(node, index);
        range.setEnd(node, index + targetWord.length);
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
        return;
      }
    }
    throw new Error(`Word not found in visual editor: ${targetWord}`);
  }, word);
}

test.describe("inline formatting sync", () => {
  test("bold, italic, and strikethrough stay aligned across visual editor, markdown, and preview", async ({ page }) => {
    await page.goto("/");

    const markdown = page.locator("#markdownInput");
    await markdown.fill("Alpha Beta Gamma");
    await expect(page.locator("#visualEditor")).toContainText("Alpha Beta Gamma");

    await selectWordInVisualEditor(page, "Alpha");
    await page.locator('[data-command="bold"]').click();

    await selectWordInVisualEditor(page, "Beta");
    await page.locator('[data-command="italic"]').click();

    await selectWordInVisualEditor(page, "Gamma");
    await page.locator('[data-command="strikeThrough"]').click();

    await expect(markdown).toHaveValue(/\*\*Alpha\*\*/);
    await expect(markdown).toHaveValue(/\*Beta\*/);
    await expect(markdown).toHaveValue(/~~Gamma~~/);

    await expect(page.locator("#visualEditor strong, #visualEditor b")).toContainText("Alpha");
    await expect(page.locator("#visualEditor em, #visualEditor i")).toContainText("Beta");
    await expect(page.locator("#visualEditor del, #visualEditor s, #visualEditor strike")).toContainText("Gamma");

    await expect(page.locator("#preview strong")).toContainText("Alpha");
    await expect(page.locator("#preview em")).toContainText("Beta");
    await expect(page.locator("#preview del")).toContainText("Gamma");
  });
});
