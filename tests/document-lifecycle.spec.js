const { test, expect } = require("@playwright/test");

test.describe("document lifecycle", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      window.__openPickerCalls = 0;
      window.showOpenFilePicker = async () => {
        window.__openPickerCalls += 1;
        return [{
          name: "opened.md",
          async getFile() {
            return new File(
              ["# Opened file\n\nLoaded from the file picker."],
              "opened.md",
              { type: "text/markdown" }
            );
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
    await expect(page.locator("#syncStatus")).toContainText(/linked project folder|cartella progetto/i);
  });

  test("close document turns an unsaved initial draft into a blank document", async ({ page }) => {
    await page.goto("/");
    await page.locator("#markdownInput").fill("# Scratch draft\n\nThis should clear.");

    page.on("dialog", dialog => dialog.accept());
    await page.locator("#closeDocumentButton").click();

    await expect(page.locator("#markdownInput")).toHaveValue("");
    await expect(page.locator("#preview")).not.toContainText("GETTING STARTED");
  });
});
