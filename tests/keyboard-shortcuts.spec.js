const { test, expect } = require("@playwright/test");

// Keyboard shortcuts follow Google Docs / Word. These tests press the real key
// combinations in the visual editor and in the Markdown panel.
async function selectVisualText(page, text) {
  await page.evaluate(targetText => {
    const editor = document.getElementById("visualEditor");
    const walker = document.createTreeWalker(editor, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) {
      const index = node.textContent.indexOf(targetText);
      if (index >= 0) {
        const range = document.createRange();
        range.setStart(node, index);
        range.setEnd(node, index + targetText.length);
        editor.focus();
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
        return;
      }
    }
    throw new Error(`Text not found in visual editor: ${targetText}`);
  }, text);
}

async function selectMarkdownText(page, text) {
  await page.evaluate(targetText => {
    const textarea = document.getElementById("markdownInput");
    const index = textarea.value.indexOf(targetText);
    if (index < 0) {
      throw new Error(`Text not found in Markdown: ${targetText}`);
    }
    textarea.focus();
    textarea.setSelectionRange(index, index + targetText.length);
  }, text);
}

test.describe("word-processor shortcuts in the visual editor", () => {
  test("Ctrl+O opens a file instead of creating a numbered list", async ({ page }) => {
    await page.addInitScript(() => {
      window.__openPickerCalls = 0;
      window.showOpenFilePicker = async () => {
        window.__openPickerCalls += 1;
        throw new DOMException("The user aborted a request.", "AbortError");
      };
    });
    await page.goto("/");
    await page.locator("#markdownInput").fill("First line");
    await selectVisualText(page, "First line");
    page.on("dialog", dialog => dialog.accept());

    await page.keyboard.press("Control+O");

    await expect.poll(async () => page.evaluate(() => window.__openPickerCalls)).toBe(1);
    await expect(page.locator("#markdownInput")).toHaveValue("First line");
  });

  test("Ctrl+U underlines and saves the text as <u>", async ({ page }) => {
    await page.goto("/");
    await page.locator("#markdownInput").fill("Plain words here");
    await selectVisualText(page, "words");

    await page.keyboard.press("Control+U");

    await expect(page.locator("#markdownInput")).toHaveValue("Plain <u>words</u> here");
    await expect(page.locator("#preview u")).toHaveText("words");
    await expect(page.locator('[data-command="underline"]')).toHaveAttribute("title", /Ctrl\/Cmd \+ U/);
  });

  test("Alt+Shift+5 strikes through and Ctrl+K inserts a link", async ({ page }) => {
    await page.addInitScript(() => {
      window.prompt = () => "https://example.com";
    });
    await page.goto("/");
    await page.locator("#markdownInput").fill("Old text and a site");

    await selectVisualText(page, "Old");
    await page.keyboard.press("Alt+Shift+Digit5");
    await expect(page.locator("#markdownInput")).toHaveValue("~~Old~~ text and a site");

    await selectVisualText(page, "site");
    await page.keyboard.press("Control+K");
    await expect(page.locator("#markdownInput")).toHaveValue("~~Old~~ text and a [site](https://example.com)");
  });

  test("Ctrl+Alt+number sets paragraph styles", async ({ page }) => {
    await page.goto("/");
    await page.locator("#markdownInput").fill("A title");
    await selectVisualText(page, "A title");

    await page.keyboard.press("Control+Alt+Digit2");
    await expect(page.locator("#markdownInput")).toHaveValue("## A title");

    await selectVisualText(page, "A title");
    await page.keyboard.press("Control+Alt+Digit7");
    await expect(page.locator("#markdownInput")).toHaveValue("> A title");

    await selectVisualText(page, "A title");
    await page.keyboard.press("Control+Alt+Digit0");
    await expect(page.locator("#markdownInput")).toHaveValue("A title");
  });

  test("Ctrl+Shift+8 / 7 / 9 create bulleted, numbered and task lists", async ({ page }) => {
    await page.goto("/");
    await page.locator("#markdownInput").fill("Item");

    await selectVisualText(page, "Item");
    await page.keyboard.press("Control+Shift+Digit8");
    await expect(page.locator("#markdownInput")).toHaveValue("- Item");

    await selectVisualText(page, "Item");
    await page.keyboard.press("Control+Shift+Digit7");
    await expect(page.locator("#markdownInput")).toHaveValue("1. Item");

    await selectVisualText(page, "Item");
    await page.keyboard.press("Control+Shift+Digit9");
    await expect(page.locator("#markdownInput")).toHaveValue("- [ ] Item");
  });

  test("shortcuts follow the physical key, so they work with non-Latin keyboard layouts", async ({ page }) => {
    await page.goto("/");
    await page.locator("#markdownInput").fill("Arabic layout");
    await selectVisualText(page, "layout");

    await page.evaluate(() => {
      document.getElementById("visualEditor").dispatchEvent(new KeyboardEvent("keydown", {
        key: "لا",
        code: "KeyB",
        ctrlKey: true,
        bubbles: true,
        cancelable: true
      }));
    });

    await expect(page.locator("#markdownInput")).toHaveValue("Arabic **layout**");
  });

  test("AltGr characters are typed instead of triggering Ctrl+Alt shortcuts", async ({ page }) => {
    await page.goto("/");
    await page.locator("#markdownInput").fill("Brace");
    await selectVisualText(page, "Brace");

    const prevented = await page.evaluate(() => {
      const event = new KeyboardEvent("keydown", {
        key: "{",
        code: "Digit7",
        ctrlKey: true,
        altKey: true,
        modifierAltGraph: true,
        bubbles: true,
        cancelable: true
      });
      document.getElementById("visualEditor").dispatchEvent(event);
      return event.defaultPrevented;
    });

    expect(prevented).toBe(false);
    await expect(page.locator("#markdownInput")).toHaveValue("Brace");
  });
});

test.describe("word-processor shortcuts in the Markdown panel", () => {
  test("Ctrl+B and Ctrl+U wrap and unwrap the selection", async ({ page }) => {
    await page.goto("/");
    await page.locator("#markdownInput").fill("Some text");

    await selectMarkdownText(page, "text");
    await page.keyboard.press("Control+B");
    await expect(page.locator("#markdownInput")).toHaveValue("Some **text**");
    await expect(page.locator("#preview strong")).toHaveText("text");

    await page.keyboard.press("Control+B");
    await expect(page.locator("#markdownInput")).toHaveValue("Some text");

    await selectMarkdownText(page, "Some");
    await page.keyboard.press("Control+U");
    await expect(page.locator("#markdownInput")).toHaveValue("<u>Some</u> text");
  });

  test("Ctrl+I on bold text adds italic instead of removing the bold", async ({ page }) => {
    await page.goto("/");
    await page.locator("#markdownInput").fill("A **strong** word");

    await selectMarkdownText(page, "strong");
    await page.keyboard.press("Control+I");

    await expect(page.locator("#markdownInput")).toHaveValue("A ***strong*** word");
    await expect(page.locator("#preview em strong, #preview strong em")).toHaveText("strong");
  });

  test("paragraph and list shortcuts change the selected lines", async ({ page }) => {
    await page.goto("/");
    await page.locator("#markdownInput").fill("Title\n\nfirst\nsecond");

    await selectMarkdownText(page, "Title");
    await page.keyboard.press("Control+Alt+Digit1");
    await expect(page.locator("#markdownInput")).toHaveValue("# Title\n\nfirst\nsecond");

    await selectMarkdownText(page, "first\nsecond");
    await page.keyboard.press("Control+Shift+Digit7");
    await expect(page.locator("#markdownInput")).toHaveValue("# Title\n\n1. first\n2. second");
    await expect(page.locator("#preview ol > li")).toHaveCount(2);

    await page.keyboard.press("Control+Shift+Digit7");
    await expect(page.locator("#markdownInput")).toHaveValue("# Title\n\nfirst\nsecond");

    await selectMarkdownText(page, "# Title");
    await page.keyboard.press("Control+Alt+Digit0");
    await expect(page.locator("#markdownInput")).toHaveValue("Title\n\nfirst\nsecond");
  });
});

test.describe("shortcut help", () => {
  test("Ctrl+/ lists every shortcut, including underline", async ({ page }) => {
    await page.goto("/");
    await page.locator("#visualEditor").click();

    await page.keyboard.press("Control+Slash");

    const dialog = page.locator("#shortcutHelpDialog");
    await expect(dialog).toHaveClass(/is-open/);
    await expect(dialog).toContainText("Underline");
    await expect(dialog).toContainText("Ctrl/Cmd + U");
    await expect(dialog).toContainText("Ctrl/Cmd + Alt/Option + 1");

    await page.keyboard.press("Escape");
    await expect(dialog).not.toHaveClass(/is-open/);
  });
});
