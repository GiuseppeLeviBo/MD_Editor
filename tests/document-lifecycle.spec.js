const { test, expect } = require("@playwright/test");

test.describe("document lifecycle", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      window.__openPickerCalls = 0;
      window.__writeCalls = 0;
      window.__mockMarkdownContent = "# Opened file\n\nLoaded from the file picker.";
      window.__mockMarkdownLastModified = 1700000000000;
      window.showDirectoryPicker = async () => ({ kind: "directory" });
      window.showOpenFilePicker = async () => {
        window.__openPickerCalls += 1;
        return [{
          name: "opened.md",
          async getFile() {
            return new File(
              [window.__mockMarkdownContent],
              "opened.md",
              {
                type: "text/markdown",
                lastModified: window.__mockMarkdownLastModified
              }
            );
          },
          async createWritable() {
            let nextContent = "";
            return {
              async write(chunk) {
                nextContent += typeof chunk === "string" ? chunk : String(chunk || "");
              },
              async close() {
                window.__mockMarkdownContent = nextContent;
                window.__mockMarkdownLastModified += 1000;
                window.__writeCalls += 1;
              }
            };
          }
        }];
      };
    });
  });

  test("opens a file from the untouched initial screen without prompting", async ({ page }) => {
    let sawDialog = false;
    page.on("dialog", async dialog => {
      sawDialog = true;
      await dialog.dismiss();
    });

    await page.goto("/");
    await page.locator("#openMarkdownButton").click();

    await expect.poll(async () => page.evaluate(() => window.__openPickerCalls)).toBe(1);
    await expect(page.locator("#markdownInput")).toHaveValue(/# Opened file/);
    await expect(page.locator("#folderSuggestion")).not.toHaveClass(/is-visible/);
    expect(sawDialog).toBe(false);
  });

  test("asks before replacing an unsaved draft and keeps the current content when cancelled", async ({ page }) => {
    await page.goto("/");
    await page.locator("#markdownInput").fill("# Scratch draft\n\nDo not lose me.");

    let dialogType = null;
    page.once("dialog", async dialog => {
      dialogType = dialog.type();
      await dialog.dismiss();
    });

    await page.locator("#openMarkdownButton").click();

    await expect.poll(async () => page.evaluate(() => window.__openPickerCalls)).toBe(0);
    await expect(page.locator("#markdownInput")).toHaveValue("# Scratch draft\n\nDo not lose me.");
    expect(dialogType).toBe("confirm");
  });

  test("replaces the current draft after the unsaved-changes prompt is accepted", async ({ page }) => {
    await page.goto("/");
    await page.locator("#markdownInput").fill("# Scratch draft\n\nReplace me.");

    page.on("dialog", dialog => dialog.accept());
    await page.locator("#openMarkdownButton").click();

    await expect.poll(async () => page.evaluate(() => window.__openPickerCalls)).toBe(1);
    await expect(page.locator("#markdownInput")).toHaveValue(/# Opened file/);
    await expect(page.locator("#folderSuggestion")).not.toHaveClass(/is-visible/);
  });

  test("suggests the document folder when the opened markdown uses local relative resources", async ({ page }) => {
    await page.goto("/");
    await page.evaluate(async () => {
      await window.openMarkdownFile(new File(["# Opened file\n\n![Diagram](diagram.svg)"], "opened.md", { type: "text/markdown" }));
    });

    await expect(page.locator("#folderSuggestion")).toHaveClass(/is-visible/);
    await expect(page.locator("#syncStatus")).toContainText(/document folder|cartella del documento/i);
  });

  test("close document turns an unsaved initial draft into a blank document", async ({ page }) => {
    await page.goto("/");
    await page.locator("#markdownInput").fill("# Scratch draft\n\nThis should clear.");

    page.on("dialog", dialog => dialog.accept());
    await page.locator("#closeDocumentButton").click();

    await expect(page.locator("#markdownInput")).toHaveValue("");
    await expect(page.locator("#preview")).not.toContainText("GETTING STARTED");
  });

  test("reload button restores disk content after confirming discard", async ({ page }) => {
    await page.goto("/");
    await page.locator("#openMarkdownButton").click();
    await expect(page.locator("#markdownInput")).toHaveValue(/Loaded from the file picker/);

    await page.evaluate(() => {
      window.__mockMarkdownContent = "# Opened file\n\nUpdated by another agent.";
    });
    await page.locator("#markdownInput").fill("# Local draft\n\nTemporary local edits.");

    page.once("dialog", dialog => dialog.accept());
    await page.locator("#reloadDocumentButton").click();

    await expect(page.locator("#markdownInput")).toHaveValue(/Updated by another agent/);
  });

  test("saving a linked file does not trigger a false external-change reload prompt", async ({ page }) => {
    await page.goto("/");
    await page.locator("#openMarkdownButton").click();
    await expect(page.locator("#markdownInput")).toHaveValue(/Loaded from the file picker/);

    await page.locator("#markdownInput").fill("# Opened file\n\nSaved version.");
    await page.locator("#downloadButton").click();

    await expect.poll(async () => page.evaluate(() => window.__writeCalls)).toBe(1);
    await expect.poll(async () => page.evaluate(() => window.__mockMarkdownContent)).toBe("# Opened file\n\nSaved version.");

    await page.locator("#markdownInput").fill("# Opened file\n\nSaved version.\n\nUnsaved follow-up.");

    const dialogs = [];
    page.on("dialog", async dialog => {
      dialogs.push(dialog.message());
      await dialog.dismiss();
    });

    await page.evaluate(() => window.checkExternalFileChanges());

    expect(dialogs).toHaveLength(0);
    await expect(page.locator("#markdownInput")).toHaveValue("# Opened file\n\nSaved version.\n\nUnsaved follow-up.");
  });
});
