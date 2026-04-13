const { test, expect } = require("@playwright/test");

async function dropFiles(page, files) {
  await page.evaluate(fileSpecs => {
    const dataTransfer = new DataTransfer();
    fileSpecs.forEach(fileSpec => {
      const parts = fileSpec.parts.map(part => (
        part.kind === "bytes" ? new Uint8Array(part.data) : part.text
      ));
      dataTransfer.items.add(new File(parts, fileSpec.name, { type: fileSpec.type }));
    });

    document.dispatchEvent(new DragEvent("dragenter", {
      bubbles: true,
      cancelable: true,
      dataTransfer
    }));

    document.dispatchEvent(new DragEvent("drop", {
      bubbles: true,
      cancelable: true,
      dataTransfer
    }));
  }, files);
}

test.describe("drag and drop", () => {
  test("opens a dropped Markdown document from the initial screen", async ({ page }) => {
    await page.goto("/");

    await dropFiles(page, [{
      name: "dropped.md",
      type: "text/markdown",
      parts: [{ kind: "text", text: "# Dropped file\n\nLoaded by drag and drop." }]
    }]);

    await expect(page.locator("#markdownInput")).toHaveValue("# Dropped file\n\nLoaded by drag and drop.");
    await expect(page.locator("#visualEditor")).toContainText("Loaded by drag and drop.");
    await expect(page.locator("#folderSuggestion")).toHaveClass(/is-visible/);
    await expect(page.locator("#syncStatus")).toContainText(/linked project folder|cartella progetto/i);
  });

  test("asks before replacing an unsaved draft when dropping a file and keeps the draft when cancelled", async ({ page }) => {
    await page.goto("/");
    await page.locator("#markdownInput").fill("# Scratch draft\n\nDo not replace me.");

    page.once("dialog", dialog => dialog.dismiss());
    await dropFiles(page, [{
      name: "dropped.md",
      type: "text/markdown",
      parts: [{ kind: "text", text: "# Dropped file\n\nLoaded by drag and drop." }]
    }]);

    await expect(page.locator("#markdownInput")).toHaveValue("# Scratch draft\n\nDo not replace me.");
  });

  test("rejects dropping multiple files at once", async ({ page }) => {
    await page.goto("/");
    const initialMarkdown = await page.locator("#markdownInput").inputValue();

    await dropFiles(page, [
      {
        name: "first.md",
        type: "text/markdown",
        parts: [{ kind: "text", text: "# First\n" }]
      },
      {
        name: "second.md",
        type: "text/markdown",
        parts: [{ kind: "text", text: "# Second\n" }]
      }
    ]);

    await expect(page.locator("#syncStatus")).toContainText(/one document at a time|un solo documento per volta/i);
    await expect(page.locator("#markdownInput")).toHaveValue(initialMarkdown);
  });

  test("uses the same validation gate for dropped binary files", async ({ page }) => {
    await page.goto("/");
    const initialMarkdown = await page.locator("#markdownInput").inputValue();

    await dropFiles(page, [{
      name: "bad.pdf",
      type: "application/pdf",
      parts: [{ kind: "text", text: "%PDF-1.4\n%\u00e2\u00e3\u00cf\u00d3\n1 0 obj\n" }]
    }]);

    await expect(page.locator("#syncStatus")).toContainText(/markdown or text document|documento markdown o testo|binary|binario/i);
    await expect(page.locator("#markdownInput")).toHaveValue(initialMarkdown);
  });
});
