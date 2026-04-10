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

async function placeCaretInTableCell(page, text) {
  await page.evaluate(targetText => {
    const cells = Array.from(document.querySelectorAll("#visualEditor th, #visualEditor td"));
    const cell = cells.find(candidate => candidate.textContent.includes(targetText));
    if (!cell) {
      throw new Error(`Unable to find table cell containing: ${targetText}`);
    }

    const walker = document.createTreeWalker(cell, NodeFilter.SHOW_TEXT);
    let textNode = walker.nextNode();
    if (!textNode) {
      textNode = document.createTextNode("");
      cell.appendChild(textNode);
    }

    const offset = textNode.textContent.length;
    const range = document.createRange();
    range.setStart(textNode, offset);
    range.setEnd(textNode, offset);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
  }, text);
}

async function getCurrentTableCellText(page) {
  return page.evaluate(() => {
    const selection = window.getSelection();
    const node = selection && selection.anchorNode
      ? (selection.anchorNode.nodeType === Node.TEXT_NODE ? selection.anchorNode.parentElement : selection.anchorNode)
      : null;
    const cell = node && node.closest ? node.closest("th, td") : null;
    return cell ? cell.textContent.trim() : null;
  });
}

test.describe("tables", () => {
  test("creates a standard markdown table from toolbar prompts", async ({ page }) => {
    await mockPromptSequence(page, ["3", "2"]);
    await page.goto("/");

    await page.locator("#markdownInput").fill("");
    await page.locator("#visualEditor").click();
    await page.locator("#tableButton").click();

    await expect(page.locator("#markdownInput")).toHaveValue(
      "|  |  |  |\n| --- | --- | --- |\n|  |  |  |\n|  |  |  |"
    );
    await expect(page.locator("#visualEditor table thead th")).toHaveCount(3);
    await expect(page.locator("#visualEditor table tbody tr")).toHaveCount(2);
    await expect(page.locator("#preview table tbody tr")).toHaveCount(2);
  });

  test("editing a visual table cell keeps markdown and preview aligned", async ({ page }) => {
    await page.goto("/");

    await page.locator("#markdownInput").fill(
      "|  |  |\n| --- | --- |\n| Alpha | Beta |\n| Gamma | Delta |"
    );

    await placeCaretInTableCell(page, "Alpha");
    await page.keyboard.type(" updated");

    await expect(page.locator("#markdownInput")).toHaveValue(/\| Alpha updated \| Beta \|/);
    await expect(page.locator("#preview table tbody tr").first().locator("td").first()).toContainText("Alpha updated");
  });

  test("disables block commands inside a table cell while keeping inline formatting available", async ({ page }) => {
    await page.goto("/");

    await page.locator("#markdownInput").fill(
      "|  |  |\n| --- | --- |\n| Alpha | Beta |"
    );

    await placeCaretInTableCell(page, "Alpha");
    await page.locator("#visualEditor table td").first().click();

    await expect(page.locator('[data-block="h1"]')).toBeDisabled();
    await expect(page.locator('[data-command="insertUnorderedList"]')).toBeDisabled();
    await expect(page.locator('[data-command="insertOrderedList"]')).toBeDisabled();
    await expect(page.locator('[data-command="insertTaskList"]')).toBeDisabled();
    await expect(page.locator("#paragraphButton")).toBeDisabled();
    await expect(page.locator("#codeBlockButton")).toBeDisabled();
    await expect(page.locator("#imageButton")).toBeDisabled();
    await expect(page.locator('[data-command="bold"]')).toBeEnabled();
    await expect(page.locator('[data-command="italic"]')).toBeEnabled();
    await expect(page.locator('[data-command="strikeThrough"]')).toBeEnabled();
    await expect(page.locator("#linkButton")).toBeEnabled();
  });

  test("uses table keyboard navigation without creating accidental rows", async ({ page }) => {
    await page.goto("/");

    await page.locator("#markdownInput").fill(
      "|  |  |\n| --- | --- |\n| Alpha | Beta |\n| Gamma | Delta |"
    );

    await placeCaretInTableCell(page, "Alpha");
    await page.keyboard.press("Tab");
    await expect.poll(() => getCurrentTableCellText(page)).toBe("Beta");

    await page.keyboard.press("Enter");
    await expect.poll(() => getCurrentTableCellText(page)).toBe("Delta");

    await page.keyboard.press("Enter");
    await expect.poll(() => getCurrentTableCellText(page)).toBe("Delta");

    await page.keyboard.press("Shift+Tab");
    await expect.poll(() => getCurrentTableCellText(page)).toBe("Gamma");
  });

  test("falls back to normal text and reports invalid markdown tables", async ({ page }) => {
    await page.goto("/");

    await page.locator("#markdownInput").fill(
      "| Name | Value |\n| not a separator |\n| Alpha | Beta |"
    );

    await expect(page.locator("#visualEditor table")).toHaveCount(0);
    await expect(page.locator("#visualEditor")).toContainText("| Name | Value |");
    await expect(page.locator("#syncStatus")).toContainText(/table|tabella/i);
  });
});
