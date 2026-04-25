const { test, expect } = require("@playwright/test");

// Markdown extension tests cover renderer/serializer behavior beyond CommonMark:
// extra heading levels, nested structures, references, and loose ordered lists.
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

test.describe("markdown extensions", () => {
  test("supports H4-H6 headings in Markdown and visual toolbar", async ({ page }) => {
    await page.goto("/");

    await page.locator("#markdownInput").fill("#### Heading four\n\n##### Heading five\n\n###### Heading six");

    await expect(page.locator("#preview h4")).toContainText("Heading four");
    await expect(page.locator("#preview h5")).toContainText("Heading five");
    await expect(page.locator("#preview h6")).toContainText("Heading six");

    await page.locator("#markdownInput").fill("Paragraph heading candidate");
    await selectVisualTextRange(page, "Paragraph heading candidate", "Paragraph heading candidate");
    await page.locator('[data-block="h4"]').click();

    await expect(page.locator("#markdownInput")).toHaveValue(/#### Paragraph heading candidate/);
    await expect(page.locator("#preview h4")).toContainText("Paragraph heading candidate");
  });

  test("keeps nested lists aligned after visual edits", async ({ page }) => {
    await page.goto("/");

    await page.locator("#markdownInput").fill("- Top item\n  - Nested item\n    - Deep item");

    await expect(page.locator("#preview ul > li > ul > li > ul > li")).toContainText("Deep item");

    await placeCursorAtEndOfVisualText(page, "Deep item");
    await page.keyboard.type(" updated");

    await expect(page.locator("#markdownInput")).toHaveValue(/- Top item\n  - Nested item\n    - Deep item updated/);
    await expect(page.locator("#preview ul > li > ul > li > ul > li")).toContainText("Deep item updated");
  });

  test("keeps nested blockquotes aligned after visual edits", async ({ page }) => {
    await page.goto("/");

    await page.locator("#markdownInput").fill("> Outer quote\n> > Inner quote");

    await expect(page.locator("#preview > blockquote")).toContainText("Outer quote");
    await expect(page.locator("#preview > blockquote > blockquote")).toContainText("Inner quote");

    await placeCursorAtEndOfVisualText(page, "Inner quote");
    await page.keyboard.type(" updated");

    await expect(page.locator("#markdownInput")).toHaveValue(/> Outer quote\n> > Inner quote updated/);
    await expect(page.locator("#preview blockquote blockquote")).toContainText("Inner quote updated");
  });

  test("renders reference-style links and preserves definitions after visual edits", async ({ page }) => {
    await page.goto("/");

    await page.locator("#markdownInput").fill("[OpenAI][oa]\n\n[oa]: https://openai.com");

    const previewLink = page.locator("#preview a").first();
    await expect(previewLink).toHaveAttribute("href", "https://openai.com");

    await placeCursorAtEndOfVisualText(page, "OpenAI");
    await page.keyboard.type(" Docs");

    await expect(page.locator("#markdownInput")).toHaveValue(/\[OpenAI\]\[oa\] Docs/);
    await expect(page.locator("#markdownInput")).toHaveValue(/\[oa\]: https:\/\/openai\.com/);
    await expect(page.locator("#preview")).toContainText("OpenAI Docs");
  });

  test("keeps ordered-list numbering when items are separated by blank lines", async ({ page }) => {
    await page.goto("/");

    await page.locator("#markdownInput").fill("## References\n\n1. First source\n\n2. Second source\n\n3. Third source");

    await expect(page.locator("#preview ol")).toHaveCount(1);
    await expect(page.locator("#visualEditor ol")).toHaveCount(1);
    await expect(page.locator("#preview ol > li").nth(0)).toHaveClass(/list-gap-after/);
    await expect(page.locator("#preview ol > li").nth(1)).toHaveClass(/list-gap-after/);
    await expect(page.locator("#visualEditor ol > li").nth(0)).toHaveClass(/list-gap-after/);
    await expect(page.locator("#visualEditor ol > li").nth(1)).toHaveClass(/list-gap-after/);
    await expect(page.locator("#preview ol > li")).toHaveCount(3);
    await expect(page.locator("#visualEditor ol > li")).toHaveCount(3);
    await expect(page.locator("#preview ol > li").nth(1)).toContainText("Second source");
    await expect(page.locator("#preview ol > li").nth(2)).toContainText("Third source");
  });

  test("preserves ordered-list start numbers when a list begins from a later index", async ({ page }) => {
    await page.goto("/");

    await page.locator("#markdownInput").fill("3. Third item\n4. Fourth item");

    await expect(page.locator("#preview ol")).toHaveAttribute("start", "3");
    await expect(page.locator("#visualEditor ol")).toHaveAttribute("start", "3");
    await expect(page.locator("#preview ol > li").first()).toContainText("Third item");
    await expect(page.locator("#preview ol > li").nth(1)).toContainText("Fourth item");
  });

  test("preserves blank lines in a loose ordered list after a visual edit", async ({ page }) => {
    await page.goto("/");

    await page.locator("#markdownInput").fill("1. First source\n\n2. Second source\n\n3. Third source");
    await placeCursorAtEndOfVisualText(page, "Second source");
    await page.keyboard.type(" updated");

    await expect(page.locator("#markdownInput")).toHaveValue(/1\. First source\n\n2\. Second source updated\n\n3\. Third source/);
    await expect(page.locator("#preview ol > li").nth(1)).toHaveClass(/list-gap-after/);
  });
});
