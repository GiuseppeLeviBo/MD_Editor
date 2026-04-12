const { test, expect } = require("@playwright/test");

async function placeCursorAtEndOfVisualText(page, text) {
  await page.evaluate(targetText => {
    const editor = document.getElementById("visualEditor");
    const walker = document.createTreeWalker(editor, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) {
      const index = node.textContent.indexOf(targetText);
      if (index >= 0) {
        const range = document.createRange();
        range.setStart(node, index + targetText.length);
        range.setEnd(node, index + targetText.length);
        const selection = window.getSelection();
        editor.focus();
        selection.removeAllRanges();
        selection.addRange(range);
        return;
      }
    }
    throw new Error(`Unable to place cursor at end of visual text: ${targetText}`);
  }, text);
}

test.describe("list exit behavior", () => {
  test("double Enter exits an ordered list into a normal paragraph that can become a task", async ({ page }) => {
    await page.goto("/");

    await page.locator("#markdownInput").fill("1. First item\n2. Second item");
    await placeCursorAtEndOfVisualText(page, "Second item");

    await page.keyboard.press("Enter");
    await page.keyboard.press("Enter");
    await page.keyboard.type("Outside");

    await expect(page.locator("#markdownInput")).toHaveValue(/2\. Second item\s+Outside/);

    await page.locator('[data-command="insertTaskList"]').click();

    await expect(page.locator("#markdownInput")).toHaveValue(/- \[ \] Outside/);
    await expect(page.locator('#visualEditor li[data-task="true"]')).toContainText("Outside");
  });

  test("double Enter exits a task list into a normal paragraph that can become a heading", async ({ page }) => {
    await page.goto("/");

    await page.locator("#markdownInput").fill("- [ ] First task\n- [ ] Second task");
    await placeCursorAtEndOfVisualText(page, "Second task");

    await page.keyboard.press("Enter");
    await page.keyboard.press("Enter");
    await page.keyboard.type("Outside");

    await expect(page.locator("#markdownInput")).toHaveValue(/- \[ \] Second task\s+Outside/);

    await page.locator('[data-block="h1"]').click();

    await expect(page.locator("#markdownInput")).toHaveValue(/# Outside/);
    await expect(page.locator("#visualEditor h1")).toContainText("Outside");
  });

  test("double Enter exits a nested task list back to the parent ordered list level", async ({ page }) => {
    await page.goto("/");

    await page.locator("#markdownInput").fill("1. First item\n2. Parent item\n  - [ ] Nested task");
    await placeCursorAtEndOfVisualText(page, "Nested task");

    await page.keyboard.press("Enter");
    await page.keyboard.press("Enter");
    await page.keyboard.type("Back to numbering");

    await expect(page.locator("#markdownInput")).toHaveValue(/1\. First item\n2\. Parent item\n  - \[ \] Nested task\n3\. Back to numbering/);
    await expect(page.locator("#preview > ol > li")).toHaveCount(3);
    await expect(page.locator("#preview > ol > li").nth(2)).toContainText("Back to numbering");
  });

  test("Enter then Delete on an empty ordered-list item creates a loose gap and restores numbering", async ({ page }) => {
    await page.goto("/");

    await page.locator("#markdownInput").fill("1. First item\n2. Second item\n3. Third item");
    await placeCursorAtEndOfVisualText(page, "Second item");

    await page.keyboard.press("Enter");
    await page.keyboard.press("Delete");

    await expect(page.locator("#markdownInput")).toHaveValue("1. First item\n2. Second item\n\n3. Third item");
    await expect(page.locator("#preview ol > li").nth(1)).toHaveClass(/list-gap-after/);
    await expect(page.locator("#preview ol > li")).toHaveCount(3);
    await expect(page.locator("#preview ol > li").nth(2)).toContainText("Third item");
  });
});
