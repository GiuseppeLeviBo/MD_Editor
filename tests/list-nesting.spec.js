const { test, expect } = require("@playwright/test");

async function placeCursorInVisualText(page, text) {
  await page.evaluate(targetText => {
    const editor = document.getElementById("visualEditor");
    const walker = document.createTreeWalker(editor, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) {
      const index = node.textContent.indexOf(targetText);
      if (index >= 0) {
        const range = document.createRange();
        range.setStart(node, index);
        range.setEnd(node, index);
        const selection = window.getSelection();
        editor.focus();
        selection.removeAllRanges();
        selection.addRange(range);
        return;
      }
    }
    throw new Error(`Unable to place cursor in visual editor text: ${targetText}`);
  }, text);
}

async function getCurrentVisualListItemText(page) {
  return page.evaluate(() => {
    const selection = window.getSelection();
    const node = selection && selection.anchorNode
      ? (selection.anchorNode.nodeType === Node.TEXT_NODE ? selection.anchorNode.parentElement : selection.anchorNode)
      : null;
    const listItem = node && node.closest ? node.closest("li") : null;
    return listItem ? listItem.textContent.replace(/\s+/g, " ").trim() : null;
  });
}

test.describe("list nesting", () => {
  test("creates a nested bullet list from a numbered list in the visual editor", async ({ page }) => {
    await page.goto("/");

    await page.locator("#markdownInput").fill("1. First item\n2. Second item\n3. Third item");
    await placeCursorInVisualText(page, "Third item");

    await page.locator("#indentListButton").click();

    await expect(page.locator("#markdownInput")).toHaveValue(/1\. First item\n2\. Second item\n  1\. Third item/);
    await expect.poll(() => getCurrentVisualListItemText(page)).toContain("Third item");

    await page.locator('[data-command="insertUnorderedList"]').click();

    await expect(page.locator("#markdownInput")).toHaveValue(/1\. First item\n2\. Second item\n  - Third item/);
    await expect(page.locator("#preview ol > li:nth-child(2) > ul > li")).toContainText("Third item");
    await expect.poll(() => getCurrentVisualListItemText(page)).toContain("Third item");
  });

  test("creates a nested task list from a numbered list in the visual editor", async ({ page }) => {
    await page.goto("/");

    await page.locator("#markdownInput").fill("1. First item\n2. Second item\n3. Third item");
    await placeCursorInVisualText(page, "Third item");

    await page.keyboard.press("Tab");
    await page.locator('[data-command="insertTaskList"]').click();

    await expect(page.locator("#markdownInput")).toHaveValue(/1\. First item\n2\. Second item\n  - \[ \] Third item/);
    await expect(page.locator('#preview ol > li:nth-child(2) ul.task-list input[type="checkbox"]')).toHaveCount(1);
    await expect.poll(() => getCurrentVisualListItemText(page)).toContain("Third item");
  });

  test("outdents a nested list item back to the parent level with Shift+Tab", async ({ page }) => {
    await page.goto("/");

    await page.locator("#markdownInput").fill("1. First item\n2. Second item\n  - Third item");
    await placeCursorInVisualText(page, "Third item");

    await page.keyboard.press("Shift+Tab");

    await expect(page.locator("#markdownInput")).toHaveValue(/1\. First item\n2\. Second item\n3\. Third item/);
    await expect(page.locator("#preview > ol > li")).toHaveCount(3);
    await expect.poll(() => getCurrentVisualListItemText(page)).toContain("Third item");
  });
});
