const { test, expect } = require("@playwright/test");

async function setVisualCaretInText(page, selector, text, offsetInText = 0) {
  await page.locator(selector).evaluate((root, options) => {
    const selection = window.getSelection();
    const range = document.createRange();
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);

    while (walker.nextNode()) {
      const node = walker.currentNode;
      const index = node.textContent.indexOf(options.text);
      if (index !== -1) {
        range.setStart(node, index + options.offsetInText);
        range.collapse(true);
        selection.removeAllRanges();
        selection.addRange(range);
        root.focus();
        document.dispatchEvent(new Event("selectionchange"));
        return;
      }
    }

    throw new Error(`Unable to find visual text: ${options.text}`);
  }, { text, offsetInText });
}

async function getMarkdownSelection(page) {
  return page.locator("#markdownInput").evaluate(element => ({
    activeElementId: document.activeElement ? document.activeElement.id : "",
    selectionStart: element.selectionStart || 0,
    selectionEnd: element.selectionEnd || 0
  }));
}

async function getVisualSelectionText(page) {
  return page.locator("#visualEditor").evaluate(() => {
    const selection = window.getSelection();
    const node = selection && selection.anchorNode;
    return {
      activeElementId: document.activeElement ? document.activeElement.id : "",
      anchorText: node ? node.textContent : ""
    };
  });
}

async function getVisualSelectionPosition(page) {
  return page.locator("#visualEditor").evaluate(editor => {
    const selection = window.getSelection();
    if (!selection || !selection.rangeCount) {
      return null;
    }
    const range = selection.getRangeAt(0).cloneRange();
    const rect = range.getClientRects()[0] || (selection.anchorNode && selection.anchorNode.parentElement
      ? selection.anchorNode.parentElement.getBoundingClientRect()
      : null);
    const editorRect = editor.getBoundingClientRect();
    if (!rect) {
      return null;
    }
    return {
      caretTop: rect.top,
      editorTop: editorRect.top,
      editorHeight: editorRect.height,
      scrollTop: editor.scrollTop,
      windowScrollY: window.scrollY,
      viewportHeight: window.innerHeight
    };
  });
}

test.describe("caret sync", () => {
  test("moves the visual caret to the matching Markdown offset", async ({ page }) => {
    await page.goto("/");
    await page.locator('label[for="mode-paired"]').click();
    await page.locator("#markdownInput").fill("Alpha\n\n## Beta\n\nGamma");
    await expect(page.locator("#visualEditor h2")).toContainText("Beta");

    await setVisualCaretInText(page, "#visualEditor", "Beta", 2);
    await page.locator("#syncVisualToMarkdownButton").click();

    const selection = await getMarkdownSelection(page);
    expect(selection.activeElementId).toBe("markdownInput");
    expect(selection.selectionStart).toBe("Alpha\n\n## Beta\n\nGamma".indexOf("Beta") + 2);
    expect(selection.selectionEnd).toBe(selection.selectionStart);
    await expect.poll(async () => page.title()).toContain("L3:C6");
  });

  test("moves the Markdown caret to the matching visual text", async ({ page }) => {
    const markdown = "Alpha\n\n## Beta\n\nGamma";
    await page.goto("/");
    await page.locator('label[for="mode-paired"]').click();
    await page.locator("#markdownInput").fill(markdown);
    await expect(page.locator("#visualEditor")).toContainText("Gamma");

    await page.locator("#markdownInput").evaluate((element, offset) => {
      element.focus();
      element.setSelectionRange(offset, offset);
    }, markdown.indexOf("Gamma") + 2);
    await page.locator("#syncMarkdownToVisualButton").click();

    const selection = await getVisualSelectionText(page);
    expect(selection.activeElementId).toBe("visualEditor");
    expect(selection.anchorText).toContain("Gamma");
  });

  test("keeps sync buttons reachable near the top while editors are scrolled", async ({ page }) => {
    const longMarkdown = Array.from({ length: 80 }, (_, index) => `Paragraph ${index + 1}`).join("\n\n");
    await page.goto("/");
    await page.locator('label[for="mode-paired"]').click();
    await page.locator("#markdownInput").fill(longMarkdown);

    await page.locator("#visualEditor").evaluate(editor => {
      editor.scrollTop = editor.scrollHeight;
    });
    await page.locator("#markdownInput").evaluate(textarea => {
      textarea.scrollTop = textarea.scrollHeight;
    });

    await expect(page.locator("#syncVisualToMarkdownButton")).toBeVisible();
    await expect(page.locator("#syncMarkdownToVisualButton")).toBeVisible();
    await expect(page.locator("#editorSyncGutter")).toHaveCSS("display", "flex");
    const buttonTop = await page.locator("#syncVisualToMarkdownButton").evaluate(button => button.getBoundingClientRect().top);
    expect(buttonTop).toBeLessThan(180);

    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(100);
    const buttonTopAfterWindowScroll = await page.locator("#syncVisualToMarkdownButton").evaluate(button => button.getBoundingClientRect().top);
    expect(buttonTopAfterWindowScroll).toBeLessThan(180);

    await page.locator('label[for="mode-markdown"]').click();
    await page.locator("#markdownInput").evaluate(textarea => {
      textarea.scrollTop = textarea.scrollHeight;
    });
    await expect(page.locator("#syncMarkdownToVisualButton")).toBeVisible();
    await expect(page.locator("#syncVisualToMarkdownButton")).toBeHidden();
    await expect(page.locator("#editorSyncGutter")).toHaveCSS("display", "flex");
    const singleButtonTop = await page.locator("#syncMarkdownToVisualButton").evaluate(button => button.getBoundingClientRect().top);
    expect(singleButtonTop).toBeLessThan(180);

    await page.locator('label[for="mode-visual"]').click();
    await expect(page.locator("#syncVisualToMarkdownButton")).toBeVisible();
    await expect(page.locator("#syncMarkdownToVisualButton")).toBeHidden();

    await page.locator('label[for="mode-preview"]').click();
    await expect(page.locator("#editorSyncGutter")).toBeHidden();
  });

  test("shows both sync buttons in all mode and transfers the caret", async ({ page }) => {
    const markdown = "Alpha\n\n## Beta\n\nGamma";
    await page.goto("/");
    await page.locator('label[for="mode-all"]').click();
    await page.locator("#markdownInput").fill(markdown);

    await expect(page.locator("#visualPanel")).toBeVisible();
    await expect(page.locator("#markdownPanel")).toBeVisible();
    await expect(page.locator("#previewPanel")).toBeVisible();
    await expect(page.locator("#syncVisualToMarkdownButton")).toBeVisible();
    await expect(page.locator("#syncMarkdownToVisualButton")).toBeVisible();

    await setVisualCaretInText(page, "#visualEditor", "Beta", 1);
    await page.locator("#syncVisualToMarkdownButton").click();
    const markdownSelection = await getMarkdownSelection(page);
    expect(markdownSelection.activeElementId).toBe("markdownInput");
    expect(markdownSelection.selectionStart).toBe(markdown.indexOf("Beta") + 1);

    await page.locator("#markdownInput").evaluate((element, offset) => {
      element.focus();
      element.setSelectionRange(offset, offset);
    }, markdown.indexOf("Gamma") + 2);
    await page.locator("#syncMarkdownToVisualButton").click();
    const visualSelection = await getVisualSelectionText(page);
    expect(visualSelection.activeElementId).toBe("visualEditor");
    expect(visualSelection.anchorText).toContain("Gamma");
  });

  test("maps Markdown caret to the matching visual block in a long document and centers it", async ({ page }) => {
    const paragraphs = Array.from({ length: 70 }, (_, index) => `Paragraph ${index + 1}`);
    paragraphs.splice(45, 0, "## Precise Target", "- Nearby list item", "Final tail");
    const markdown = paragraphs.join("\n\n");

    await page.goto("/");
    await page.locator('label[for="mode-paired"]').click();
    await page.locator("#markdownInput").fill(markdown);
    await expect(page.locator("#visualEditor")).toContainText("Precise Target");

    await page.locator("#markdownInput").evaluate((element, offset) => {
      element.focus();
      element.setSelectionRange(offset, offset);
      element.scrollTop = 0;
    }, markdown.indexOf("Precise Target") + 8);
    await page.locator("#visualEditor").evaluate(editor => {
      editor.scrollTop = 0;
    });
    await page.locator("#syncMarkdownToVisualButton").click();

    const selection = await getVisualSelectionText(page);
    expect(selection.anchorText).toContain("Precise Target");
    const position = await getVisualSelectionPosition(page);
    expect(position.scrollTop + position.windowScrollY).toBeGreaterThan(0);
    expect(position.caretTop).toBeGreaterThan(position.viewportHeight * 0.25);
    expect(position.caretTop).toBeLessThan(position.viewportHeight * 0.75);
  });

  test("switches from markdown-only to visual-only while preserving the logical caret", async ({ page }) => {
    const markdown = "Alpha\n\n## Beta\n\nGamma";
    await page.goto("/");
    await page.locator("#markdownInput").fill(markdown);
    await page.locator('label[for="mode-markdown"]').click();

    await page.locator("#markdownInput").evaluate((element, offset) => {
      element.focus();
      element.setSelectionRange(offset, offset);
    }, markdown.indexOf("Beta") + 2);
    await page.locator("#syncMarkdownToVisualButton").click();

    await expect(page.locator("#mode-visual")).toBeChecked();
    await expect(page.locator("#visualPanel")).toBeVisible();
    await expect(page.locator("#markdownPanel")).toBeHidden();
    const selection = await getVisualSelectionText(page);
    expect(selection.anchorText).toContain("Beta");
  });

  test("does not mark a clean document dirty when syncing caret positions", async ({ page }) => {
    await page.goto("/");
    await page.evaluate(async () => {
      await window.openMarkdownFile(new File(["Alpha\n\n## Beta"], "notes.md", { type: "text/markdown" }));
    });
    await page.locator('label[for="mode-paired"]').click();
    await expect.poll(async () => page.title()).toMatch(/^notes\.md - clean - 3 lines, 14 chars - /);

    await setVisualCaretInText(page, "#visualEditor", "Beta", 2);
    await page.locator("#syncVisualToMarkdownButton").click();

    await expect(page.locator("#markdownInput")).toHaveValue("Alpha\n\n## Beta");
    await expect.poll(async () => page.title()).toBe("notes.md - clean - 3 lines, 14 chars - L3:C6 - MD Editor");
  });
});
