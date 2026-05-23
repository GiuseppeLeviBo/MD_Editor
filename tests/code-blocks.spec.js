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
      const codeText = codeBlock.textContent || "";
      const targetIndex = codeText.indexOf(targetText);
      if (targetIndex < 0) {
        continue;
      }

      const targetOffset = targetIndex + targetText.length;
      let consumed = 0;
      const walker = document.createTreeWalker(codeBlock, NodeFilter.SHOW_TEXT);
      let node;
      while ((node = walker.nextNode())) {
        const nextConsumed = consumed + node.textContent.length;
        if (targetOffset <= nextConsumed) {
          const range = document.createRange();
          const offset = targetOffset - consumed;
          range.setStart(node, offset);
          range.setEnd(node, offset);
          const selection = window.getSelection();
          const editor = document.getElementById("visualEditor");
          editor.focus();
          selection.removeAllRanges();
          selection.addRange(range);
          return;
        }
        consumed = nextConsumed;
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

  test("highlights supported fenced code languages without changing Markdown source", async ({ page }) => {
    await page.goto("/");

    const source = "```js\nconst ready = true;\nconsole.log(ready);\n```";
    await page.locator("#markdownInput").fill(source);

    await expect(page.locator("#visualEditor pre[data-language=\"js\"] code.language-javascript .token.keyword")).toContainText("const");
    await expect(page.locator("#preview pre[data-language=\"js\"] code.language-javascript .token.function")).toContainText("log");

    await page.evaluate(() => {
      document.getElementById("visualEditor").dispatchEvent(new InputEvent("input", {
        bubbles: true,
        inputType: "insertText",
        data: ""
      }));
    });

    await expect(page.locator("#markdownInput")).toHaveValue(source);
  });

  test("highlights Python function declarations and calls", async ({ page }) => {
    await page.goto("/");

    await page.locator("#markdownInput").fill([
      "```python",
      "def write_match(out_dir: Path, source: Path) -> Path:",
      "    target = unique_output_path(out_dir, source)",
      "    target.write_bytes(b\"ok\")",
      "    return target",
      "```"
    ].join("\n"));

    await expect(page.locator("#preview pre[data-language=\"python\"] code.language-python .token.function")).toContainText([
      "write_match",
      "unique_output_path",
      "write_bytes"
    ]);
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

  test("ignores stray inline formatting markup inside visual code blocks", async ({ page }) => {
    await page.goto("/");

    await page.locator("#markdownInput").fill("```text\nGrassetto\nCorsivo\nBarrato\n```\n\nFuori **grassetto**, *corsivo* e ~~barrato~~ restano formattati.");

    await page.evaluate(() => {
      const code = document.querySelector("#visualEditor pre code");
      code.innerHTML = "<strong>Grassetto</strong>\n<em>Corsivo</em>\n<s>Barrato</s>";
      document.getElementById("visualEditor").dispatchEvent(new InputEvent("input", {
        bubbles: true,
        inputType: "formatBold"
      }));
    });

    await expect.poll(async () => page.locator("#markdownInput").inputValue()).not.toContain("**Grassetto**");
    await expect(page.locator("#markdownInput")).not.toHaveValue(/\*Corsivo\*/);
    await expect(page.locator("#markdownInput")).not.toHaveValue(/~~Barrato~~[\s\S]*```/);
    await expect(page.locator("#preview pre code")).toContainText("Grassetto");
    await expect(page.locator("#preview pre code")).toContainText("Corsivo");
    await expect(page.locator("#preview pre code")).toContainText("Barrato");

    const strongWeight = await page.locator("#visualEditor pre code strong").evaluate(node => Number.parseInt(getComputedStyle(node).fontWeight, 10));
    const fontStyle = await page.locator("#visualEditor pre code em").evaluate(node => getComputedStyle(node).fontStyle);
    const decoration = await page.locator("#visualEditor pre code s").evaluate(node => getComputedStyle(node).textDecorationLine);
    expect(strongWeight).toBeLessThan(600);
    expect(fontStyle).toBe("normal");
    expect(decoration).toBe("none");

    await expect(page.locator("#preview p strong")).toContainText("grassetto");
    await expect(page.locator("#preview p em")).toContainText("corsivo");
    await expect(page.locator("#preview p del")).toContainText("barrato");
  });
});
