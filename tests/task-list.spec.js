const { test, expect } = require("@playwright/test");

async function selectVisualTextRange(page, startText, endText) {
  await page.evaluate(({ startTextValue, endTextValue }) => {
    const editor = document.getElementById("visualEditor");
    const walker = document.createTreeWalker(editor, NodeFilter.SHOW_TEXT);
    let startNode = null;
    let endNode = null;
    let startOffset = -1;
    let endOffset = -1;
    let node;

    while ((node = walker.nextNode())) {
      if (!startNode) {
        const startIndex = node.textContent.indexOf(startTextValue);
        if (startIndex >= 0) {
          startNode = node;
          startOffset = startIndex;
        }
      }

      const endIndex = node.textContent.indexOf(endTextValue);
      if (endIndex >= 0) {
        endNode = node;
        endOffset = endIndex + endTextValue.length;
      }
    }

    if (!startNode || !endNode) {
      throw new Error("Unable to create range from visual editor text.");
    }

    const range = document.createRange();
    range.setStart(startNode, startOffset);
    range.setEnd(endNode, endOffset);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
  }, { startTextValue: startText, endTextValue: endText });
}

test.describe("task list", () => {
  test("renders markdown task list items as checkboxes in visual editor and preview", async ({ page }) => {
    await page.goto("/");

    await page.locator("#markdownInput").fill("- [ ] Todo item\n- [x] Completed item");

    const visualCheckboxes = page.locator('#visualEditor li[data-task="true"] input[type="checkbox"]');
    const previewCheckboxes = page.locator('#preview li[data-task="true"] input[type="checkbox"]');

    await expect(visualCheckboxes).toHaveCount(2);
    await expect(previewCheckboxes).toHaveCount(2);
    await expect(visualCheckboxes.nth(0)).not.toBeChecked();
    await expect(visualCheckboxes.nth(1)).toBeChecked();
    await expect(previewCheckboxes.nth(0)).not.toBeChecked();
    await expect(previewCheckboxes.nth(1)).toBeChecked();
  });

  test("toggling a task checkbox in the visual editor updates markdown and preview", async ({ page }) => {
    await page.goto("/");

    await page.locator("#markdownInput").fill("- [ ] Todo item");

    const visualCheckbox = page.locator('#visualEditor li[data-task="true"] input[type="checkbox"]').first();
    await visualCheckbox.check();
    await expect(visualCheckbox).toBeChecked();

    await expect(page.locator("#markdownInput")).toHaveValue(/- \[x\] Todo item/);
    await expect(page.locator('#preview li[data-task="true"] input[type="checkbox"]').first()).toBeChecked();

    await visualCheckbox.uncheck();

    await expect(page.locator("#markdownInput")).toHaveValue(/- \[ \] Todo item/);
    await expect(page.locator('#preview li[data-task="true"] input[type="checkbox"]').first()).not.toBeChecked();
  });

  test("creates a task list from selected visual blocks using the toolbar", async ({ page }) => {
    await page.goto("/");

    await page.locator("#markdownInput").fill("First task\nSecond task");
    await expect(page.locator("#visualEditor")).toContainText("First task");

    await selectVisualTextRange(page, "First task", "Second task");
    await page.locator('[data-command="insertTaskList"]').click();

    await expect(page.locator("#markdownInput")).toHaveValue(/- \[ \] First task/);
    await expect(page.locator("#markdownInput")).toHaveValue(/- \[ \] Second task/);
    await expect(page.locator('#visualEditor li[data-task="true"] input[type="checkbox"]')).toHaveCount(2);
    await expect(page.locator('#preview li[data-task="true"] input[type="checkbox"]')).toHaveCount(2);
  });
});
