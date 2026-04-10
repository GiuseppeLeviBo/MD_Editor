const { test, expect } = require("@playwright/test");

test.describe("save flow", () => {
  test("Ctrl/Cmd + S opens a single save picker and does not fall back to download when cancelled", async ({ page, browserName }) => {
    test.skip(browserName !== "chromium", "This shortcut test is intended for the Chromium project.");

    await page.addInitScript(() => {
      window.__savePickerCalls = 0;
      window.__downloadClicks = 0;

      window.showSaveFilePicker = async () => {
        window.__savePickerCalls += 1;
        throw new Error("User cancelled");
      };

      const originalClick = HTMLAnchorElement.prototype.click;
      HTMLAnchorElement.prototype.click = function clickPatched() {
        if (this.hasAttribute("download")) {
          window.__downloadClicks += 1;
        }
        return originalClick.call(this);
      };
    });

    await page.goto("/");
    await page.locator("#visualEditor").click();
    await page.keyboard.press("Control+S");

    await expect.poll(async () => page.evaluate(() => window.__savePickerCalls)).toBe(1);
    await expect.poll(async () => page.evaluate(() => window.__downloadClicks)).toBe(0);
  });
});
