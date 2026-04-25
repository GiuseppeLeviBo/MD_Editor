const { test, expect } = require("@playwright/test");

async function getMarkdownSelectionVisibility(page) {
  return page.locator("#markdownInput").evaluate(element => {
    const textarea = element;
    const start = textarea.selectionStart || 0;
    const end = textarea.selectionEnd || start;
    const computedStyle = window.getComputedStyle(textarea);
    const lineHeight = parseFloat(computedStyle.lineHeight) || parseFloat(computedStyle.fontSize) * 1.4 || 20;
    const mirror = document.createElement("div");
    const marker = document.createElement("span");
    mirror.setAttribute("aria-hidden", "true");
    mirror.style.position = "absolute";
    mirror.style.visibility = "hidden";
    mirror.style.pointerEvents = "none";
    mirror.style.left = "-99999px";
    mirror.style.top = "0";
    mirror.style.whiteSpace = "pre-wrap";
    mirror.style.overflowWrap = "break-word";
    mirror.style.wordBreak = "break-word";
    mirror.style.boxSizing = computedStyle.boxSizing;
    mirror.style.width = textarea.getBoundingClientRect().width + "px";
    mirror.style.font = computedStyle.font;
    mirror.style.lineHeight = computedStyle.lineHeight;
    mirror.style.letterSpacing = computedStyle.letterSpacing;
    mirror.style.paddingTop = computedStyle.paddingTop;
    mirror.style.paddingRight = computedStyle.paddingRight;
    mirror.style.paddingBottom = computedStyle.paddingBottom;
    mirror.style.paddingLeft = computedStyle.paddingLeft;
    mirror.style.borderTopWidth = computedStyle.borderTopWidth;
    mirror.style.borderRightWidth = computedStyle.borderRightWidth;
    mirror.style.borderBottomWidth = computedStyle.borderBottomWidth;
    mirror.style.borderLeftWidth = computedStyle.borderLeftWidth;
    mirror.style.tabSize = computedStyle.tabSize;
    mirror.textContent = textarea.value.slice(0, start);
    marker.textContent = textarea.value.slice(start, Math.max(end, start + 1)) || " ";
    mirror.appendChild(marker);
    document.body.appendChild(mirror);

    const top = marker.offsetTop;
    const bottom = top + lineHeight;
    const visibleTop = textarea.scrollTop;
    const visibleBottom = visibleTop + textarea.clientHeight;
    document.body.removeChild(mirror);

    return {
      isVisible: top >= visibleTop && bottom <= visibleBottom,
      selectedText: textarea.value.slice(start, end),
      visibleTop,
      visibleBottom,
      top,
      bottom
    };
  });
}

test.describe("find and replace", () => {
  test("replaces all Markdown matches and keeps the editors in sync", async ({ page }) => {
    await page.goto("/");

    const markdown = page.locator("#markdownInput");
    await markdown.fill("```text\nMEAS:VOLT?\n```\n\n```text\nMEAS:CURR?\n```");

    await page.locator("#findReplaceButton").click();
    await page.locator("#findReplaceSearchInput").fill("```text");
    await page.locator("#findReplaceReplaceInput").fill("```scpi");
    await page.locator("#replaceAllButton").click();

    await expect(markdown).toHaveValue("```scpi\nMEAS:VOLT?\n```\n\n```scpi\nMEAS:CURR?\n```");
    await expect(page.locator("#visualEditor")).toContainText("MEAS:VOLT?");
    await expect(page.locator("#visualEditor")).toContainText("MEAS:CURR?");
    await expect(page.locator("#findReplaceSummary")).toHaveText(/Nessuna occorrenza trovata|No matches found/);
  });

  test("prefills the search field from the current Markdown selection", async ({ page }) => {
    await page.goto("/");

    const markdown = page.locator("#markdownInput");
    await markdown.fill("alpha beta gamma");
    await markdown.evaluate(element => {
      element.focus();
      element.setSelectionRange(6, 10);
    });

    await page.keyboard.press("Control+H");

    await expect(page.locator("#findReplaceDialog")).toHaveClass(/is-open/);
    await expect(page.locator("#findReplaceSearchInput")).toHaveValue("beta");
  });

  test("keeps focus in the search field while typing", async ({ page }) => {
    await page.goto("/");

    await page.locator("#markdownInput").fill("alpha beta alpha");
    await page.locator("#findReplaceButton").click();

    const searchInput = page.locator("#findReplaceSearchInput");
    await searchInput.type("alp");

    await expect(searchInput).toBeFocused();
    await expect(searchInput).toHaveValue("alp");
  });

  test("starts from the first match after Ctrl+F on a freshly opened document", async ({ page }) => {
    await page.goto("/");

    const firstMatch = await page.locator("#markdownInput").evaluate(element => element.value.indexOf("##"));

    await page.keyboard.press("Control+F");
    await page.keyboard.type("##");

    const state = await page.locator("#markdownInput").evaluate(element => ({
      selectedText: element.value.slice(element.selectionStart || 0, element.selectionEnd || 0),
      selectionStart: element.selectionStart || 0
    }));

    await expect(page.locator("#findReplaceSearchInput")).toBeFocused();
    expect(state.selectedText).toBe("##");
    expect(state.selectionStart).toBe(firstMatch);
  });

  test("starts from the first match even when focus was in the visual editor", async ({ page }) => {
    await page.goto("/");

    await page.locator("#visualEditor").click();
    const firstMatch = await page.locator("#markdownInput").evaluate(element => element.value.indexOf("##"));

    await page.keyboard.press("Control+F");
    await page.keyboard.type("##");

    const state = await page.locator("#markdownInput").evaluate(element => ({
      selectedText: element.value.slice(element.selectionStart || 0, element.selectionEnd || 0),
      selectionStart: element.selectionStart || 0
    }));

    await expect(page.locator("#findReplaceSearchInput")).toBeFocused();
    expect(state.selectedText).toBe("##");
    expect(state.selectionStart).toBe(firstMatch);
  });

  test("can be dragged so it does not cover the document", async ({ page }) => {
    await page.goto("/");

    await page.locator("#findReplaceButton").click();
    const dialog = page.locator("#findReplaceDialogPanel");
    const header = page.locator("#findReplaceDialogHeader");

    const before = await dialog.boundingBox();
    if (!before) {
      throw new Error("Find/replace dialog is not visible");
    }

    await header.hover();
    await page.mouse.down();
    await page.mouse.move(before.x + 80, before.y + 40);
    await page.mouse.up();

    const after = await dialog.boundingBox();
    if (!after) {
      throw new Error("Find/replace dialog is not visible after dragging");
    }

    expect(Math.abs(after.x - before.x) > 20 || Math.abs(after.y - before.y) > 20).toBeTruthy();
  });

  test("scrolls the Markdown panel to the active match", async ({ page }) => {
    await page.goto("/");

    const longDocument = Array.from({ length: 120 }, (_, index) => `line ${index + 1}`);
    longDocument[95] = "## hidden heading";
    await page.locator("#markdownInput").evaluate((element, value) => {
      element.style.flex = "none";
      element.style.height = "120px";
      element.value = value;
      element.dispatchEvent(new Event("input", { bubbles: true }));
    }, longDocument.join("\n"));

    await page.locator("#findReplaceButton").click();
    await page.locator("#findReplaceSearchInput").fill("##");
    await page.locator("#findNextButton").click();

    const visibility = await getMarkdownSelectionVisibility(page);

    expect(visibility.selectedText).toBe("##");
    expect(visibility.isVisible).toBeTruthy();
  });

  test("keeps every default Markdown heading match visible while navigating", async ({ page }) => {
    await page.goto("/");

    const matchCount = await page.locator("#markdownInput").evaluate(element => {
      return (element.value.match(/##/g) || []).length;
    });

    await page.locator("#findReplaceButton").click();
    await page.locator("#findReplaceSearchInput").fill("##");

    for (let index = 0; index < matchCount; index += 1) {
      await page.locator("#findNextButton").click();
      const visibility = await getMarkdownSelectionVisibility(page);
      expect(visibility.selectedText).toBe("##");
      expect(visibility.isVisible).toBeTruthy();
    }
  });

  test("replace keeps the next Markdown match in view instead of jumping to the end", async ({ page }) => {
    await page.goto("/");

    await page.locator("#markdownInput").evaluate(element => {
      element.style.flex = "none";
      element.style.height = "160px";
    });
    await page.locator("#findReplaceButton").click();
    await page.locator("#findReplaceSearchInput").fill("##");
    await page.locator("#findNextButton").click();
    await page.locator("#findReplaceReplaceInput").fill("###");
    await page.locator("#replaceOneButton").click();

    const state = await page.locator("#markdownInput").evaluate(element => {
      const textarea = element;
      return {
        maxScrollTop: Math.max(0, textarea.scrollHeight - textarea.clientHeight),
        scrollTop: textarea.scrollTop,
        selectedText: textarea.value.slice(textarea.selectionStart || 0, textarea.selectionEnd || 0)
      };
    });
    const visibility = await getMarkdownSelectionVisibility(page);

    expect(state.selectedText).toBe("##");
    expect(state.scrollTop).toBeLessThan(state.maxScrollTop);
    expect(visibility.isVisible).toBeTruthy();
  });
});
