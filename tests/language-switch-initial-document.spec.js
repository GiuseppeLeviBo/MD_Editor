const { test, expect } = require("@playwright/test");

test.describe("initial document localization", () => {
  test("updates the initial document when switching language on the initial screen", async ({ page }) => {
    await page.goto("/");

    await expect(page.locator("#languageSelect")).toHaveValue("en");
    await expect(page.locator("#markdownInput")).toHaveValue(/Welcome\. This is the editor's initial screen\./);

    await page.locator("#languageSelect").selectOption("it");

    await expect(page.locator("#closeDocumentButton")).toContainText("Chiudi documento");
    await expect(page.locator("#markdownInput")).toHaveValue(/Benvenuto\. Questa e la schermata iniziale dell'editor\./);
    await expect(page.locator("#visualEditor")).toContainText("Come iniziare");
  });

  test("a reload after another window changed the language shows the welcome document in that language", async ({ context, page }) => {
    await page.goto("/");
    await page.locator("#languageSelect").selectOption("it");
    await expect(page.locator("#markdownInput")).toHaveValue(/Benvenuto\./);

    const other = await context.newPage();
    await other.goto("/");
    await other.locator("#languageSelect").selectOption("en");
    await other.close();

    await page.reload();

    await expect(page.locator("#languageSelect")).toHaveValue("en");
    await expect(page.locator("#markdownInput")).toHaveValue(/Welcome\. This is the editor's initial screen\./);
    await expect(page).toHaveTitle(/^New File - clean/);
  });

  test("changing the language in one window updates the other windows of the app", async ({ context, page }) => {
    await page.goto("/");
    await expect(page.locator("#markdownInput")).toHaveValue(/Welcome\./);

    const other = await context.newPage();
    await other.goto("/");
    await other.locator("#languageSelect").selectOption("it");

    await expect(page.locator("#languageSelect")).toHaveValue("it");
    await expect(page.locator("#closeDocumentButton")).toContainText("Chiudi documento");
    await expect(page.locator("#markdownInput")).toHaveValue(/Benvenuto\./);
  });

  test("a modified welcome document keeps its text when the language changes", async ({ page }) => {
    await page.goto("/");
    await page.locator("#markdownInput").fill("# Markdown WYSIWYG Editor\n\nMy own notes.");

    await page.locator("#languageSelect").selectOption("it");

    await expect(page.locator("#closeDocumentButton")).toContainText("Chiudi documento");
    await expect(page.locator("#markdownInput")).toHaveValue("# Markdown WYSIWYG Editor\n\nMy own notes.");
  });
});
