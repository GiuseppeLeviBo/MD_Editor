const { test, expect } = require("@playwright/test");

async function mockOpenPickerFile(page, spec) {
  await page.addInitScript(fileSpec => {
    window.__openPickerCalls = 0;
    window.showOpenFilePicker = async () => {
      window.__openPickerCalls += 1;
      return [{
        name: fileSpec.name,
        async getFile() {
          const parts = fileSpec.parts.map(part => (
            part.kind === "bytes" ? new Uint8Array(part.data) : part.text
          ));
          return new File(parts, fileSpec.name, { type: fileSpec.type });
        }
      }];
    };
  }, spec);
}

test.describe("file input validation", () => {
  test("opens a plain-text document so it can be turned into Markdown", async ({ page }) => {
    await mockOpenPickerFile(page, {
      name: "notes.txt",
      type: "text/plain",
      parts: [{ kind: "text", text: "Raw notes\n\nTurn me into Markdown." }]
    });

    await page.goto("/");
    await page.locator("#openMarkdownButton").click();

    await expect.poll(async () => page.evaluate(() => window.__openPickerCalls)).toBe(1);
    await expect(page.locator("#markdownInput")).toHaveValue("Raw notes\n\nTurn me into Markdown.");
    await expect(page.locator("#visualEditor")).toContainText("Turn me into Markdown.");
  });

  test("rejects a PDF before it replaces the current document", async ({ page }) => {
    await mockOpenPickerFile(page, {
      name: "paper.pdf",
      type: "application/pdf",
      parts: [{ kind: "text", text: "%PDF-1.4\n%\u00e2\u00e3\u00cf\u00d3\n1 0 obj\n" }]
    });

    await page.goto("/");
    const initialMarkdown = await page.locator("#markdownInput").inputValue();

    await page.locator("#openMarkdownButton").click();

    await expect.poll(async () => page.evaluate(() => window.__openPickerCalls)).toBe(1);
    await expect(page.locator("#syncStatus")).toContainText(/markdown or text document|documento markdown o testo|binary|binario/i);
    await expect(page.locator("#markdownInput")).toHaveValue(initialMarkdown);
    await expect(page.locator("#preview")).not.toContainText("%PDF-1.4");
  });

  test("rejects an image file and preserves an unsaved draft", async ({ page }) => {
    await mockOpenPickerFile(page, {
      name: "photo.png",
      type: "image/png",
      parts: [{ kind: "bytes", data: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] }]
    });

    await page.goto("/");
    await page.locator("#markdownInput").fill("# Scratch draft\n\nKeep me safe.");

    page.on("dialog", dialog => dialog.accept());
    await page.locator("#openMarkdownButton").click();

    await expect.poll(async () => page.evaluate(() => window.__openPickerCalls)).toBe(1);
    await expect(page.locator("#syncStatus")).toContainText(/markdown or text document|documento markdown o testo|binary|binario/i);
    await expect(page.locator("#markdownInput")).toHaveValue("# Scratch draft\n\nKeep me safe.");
  });

  test("opens HTML as inert text instead of active browser content", async ({ page }) => {
    await mockOpenPickerFile(page, {
      name: "snippet.html",
      type: "text/html",
      parts: [{ kind: "text", text: "<script>alert(1)</script>\n<div>Hello</div>" }]
    });

    await page.goto("/");
    await page.locator("#openMarkdownButton").click();

    await expect.poll(async () => page.evaluate(() => window.__openPickerCalls)).toBe(1);
    await expect(page.locator("#markdownInput")).toHaveValue("<script>alert(1)</script>\n<div>Hello</div>");
    await expect(page.locator("#preview script")).toHaveCount(0);
    await expect(page.locator("#preview")).toContainText("<script>alert(1)</script>");
    await expect(page.locator("#preview")).toContainText("<div>Hello</div>");
  });
});
