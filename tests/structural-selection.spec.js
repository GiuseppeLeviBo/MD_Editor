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

test.describe("structural selections", () => {
  test("turns an entire list into headings when the whole list is selected", async ({ page }) => {
    await page.goto("/");

    await page.locator("#markdownInput").fill("- One\n- Two\n- Three");
    await expect(page.locator("#visualEditor")).toContainText("One");

    await selectVisualTextRange(page, "One", "Three");
    await page.locator('[data-block="h1"]').click();

    const markdown = page.locator("#markdownInput");
    await expect(markdown).toHaveValue(/# One/);
    await expect(markdown).toHaveValue(/# Two/);
    await expect(markdown).toHaveValue(/# Three/);
    await expect(markdown).not.toHaveValue(/^- /m);

    await expect(page.locator("#preview h1")).toHaveCount(3);
  });

  test("warns gently and keeps content stable for mixed structural selections", async ({ page }) => {
    await page.goto("/");

    const initialMarkdown = "- First item\n- Second item\n\nParagraph after list.";
    await page.locator("#markdownInput").fill(initialMarkdown);
    await expect(page.locator("#visualEditor")).toContainText("Paragraph after list.");

    await selectVisualTextRange(page, "First item", "Paragraph after list.");
    await page.locator('[data-block="h2"]').click();

    await expect(page.locator("#syncStatus")).toContainText("different structures");
    await expect(page.locator("#markdownInput")).toHaveValue(initialMarkdown);
  });

  test("turns a blockquote back into a paragraph from the visual toolbar", async ({ page }) => {
    await page.goto("/");

    await page.locator("#markdownInput").fill("> Quoted line");
    await expect(page.locator("#visualEditor blockquote")).toContainText("Quoted line");

    await selectVisualTextRange(page, "Quoted line", "Quoted line");
    await page.locator("#paragraphButton").click();

    await expect(page.locator("#markdownInput")).toHaveValue("Quoted line");
    await expect(page.locator("#visualEditor blockquote")).toHaveCount(0);
    await expect(page.locator("#visualEditor p")).toContainText("Quoted line");
  });
});
