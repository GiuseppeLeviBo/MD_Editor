const { test, expect } = require("@playwright/test");

test.describe("image caption sync", () => {
  test("editing a visual image caption updates markdown and preview", async ({ page }) => {
    await page.goto("/");
    await page.locator("#markdownInput").fill("![WEMOS D1 R32 pinout](https://example.com/pinOut-R32-compressor.png)");

    const figureCaption = page.locator("#visualEditor figure figcaption");
    await expect(figureCaption).toHaveText("WEMOS D1 R32 pinout");

    await figureCaption.evaluate(node => {
      node.textContent = "WEMOS D1 R32 compressor pinout";
      node.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText", data: "WEMOS D1 R32 compressor pinout" }));
    });

    await expect(page.locator("#markdownInput")).toHaveValue("![WEMOS D1 R32 compressor pinout](https://example.com/pinOut-R32-compressor.png)");
    await expect(page.locator("#preview figure figcaption")).toHaveText("WEMOS D1 R32 compressor pinout");
  });
});
