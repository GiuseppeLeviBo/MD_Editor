const { test, expect } = require("@playwright/test");

async function mockPromptSequence(page, responses) {
  await page.addInitScript(values => {
    const queue = Array.from(values);
    window.prompt = () => {
      if (!queue.length) {
        return null;
      }
      return queue.shift();
    };
  }, responses);
}

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

async function placeCursorAtEndOfCodeText(page, text) {
  await page.evaluate(targetText => {
    const codeBlocks = Array.from(document.querySelectorAll("#visualEditor pre code"));
    for (const codeBlock of codeBlocks) {
      const walker = document.createTreeWalker(codeBlock, NodeFilter.SHOW_TEXT);
      let node;
      while ((node = walker.nextNode())) {
        const index = node.textContent.indexOf(targetText);
        if (index >= 0) {
          const range = document.createRange();
          range.setStart(node, index + targetText.length);
          range.setEnd(node, index + targetText.length);
          const selection = window.getSelection();
          const editor = document.getElementById("visualEditor");
          editor.focus();
          selection.removeAllRanges();
          selection.addRange(range);
          return;
        }
      }
    }
    throw new Error(`Unable to place cursor at end of code text: ${targetText}`);
  }, text);
}

test.describe("code blocks", () => {
  test("creates a fenced code block with an optional language", async ({ page }) => {
    await mockPromptSequence(page, ["js"]);
    await page.goto("/");

    await page.locator("#markdownInput").fill("const value = 1;");
    await selectVisualTextRange(page, "const value = 1;", "const value = 1;");

    await page.locator("#codeBlockButton").click();

    await expect(page.locator("#markdownInput")).toHaveValue(/```js\s+const value = 1;\s+```/);
    await expect(page.locator("#visualEditor pre[data-language=\"js\"] code")).toContainText("const value = 1;");
    await expect(page.locator("#preview pre[data-language=\"js\"] code")).toContainText("const value = 1;");
  });

  test("pressing Enter inside a code block keeps markdown and preview aligned", async ({ page }) => {
    await page.goto("/");

    await page.locator("#markdownInput").fill("```js\nconst value = 1;\n```");
    await placeCursorAtEndOfCodeText(page, "const value = 1;");

    await page.keyboard.press("Enter");
    await page.keyboard.type("console.log(value);");

    await expect(page.locator("#markdownInput")).toHaveValue(/```js\nconst value = 1;\nconsole\.log\(value\);\n```/);
    await expect(page.locator("#preview pre code")).toContainText("console.log(value);");
  });

  test("double Enter at the end of a code block exits to a normal paragraph", async ({ page }) => {
    await page.goto("/");

    await page.locator("#markdownInput").fill("```js\nconst value = 1;\n```");
    await placeCursorAtEndOfCodeText(page, "const value = 1;");

    await page.keyboard.press("Enter");
    await page.keyboard.press("Enter");
    await page.keyboard.type("Outside code");

    await expect(page.locator("#markdownInput")).toHaveValue(/```js\nconst value = 1;\n```\n\nOutside code/);
    await expect(page.locator("#visualEditor > p").last()).toContainText("Outside code");
    await expect(page.locator("#preview > p").last()).toContainText("Outside code");
  });
});
