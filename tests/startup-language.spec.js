const { test, expect } = require("@playwright/test");

test.describe("startup experience", () => {
  test("uses the same language for the UI and the default document", async ({ page }) => {
    await page.goto("/");

    await expect(page.locator("#languageSelect")).toHaveValue("en");
    await expect(page.locator("#closeDocumentButton")).toContainText("Close document");

    const markdown = page.locator("#markdownInput");
    await expect(markdown).toHaveValue(/# Markdown WYSIWYG Editor/);
    await expect(markdown).toHaveValue(/Welcome\. This is the editor's initial screen\./);
    await expect(markdown).not.toHaveValue(/Chiudi documento/);

    await expect(page.locator("#visualEditor")).toContainText("Getting started");
    await expect(page.locator("#syncStatus")).toContainText("Updated from Markdown");
  });
});
