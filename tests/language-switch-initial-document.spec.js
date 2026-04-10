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
});
