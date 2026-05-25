const { test, expect } = require("@playwright/test");

test.describe("save flow", () => {
  test("Ctrl/Cmd + S opens a single picker for an unsaved document and does not fall back when cancelled", async ({ page, browserName }) => {
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

  test("Ctrl/Cmd + S resaves the current file while Ctrl/Cmd + Shift + S picks a new copy", async ({ page, browserName }) => {
    test.skip(browserName !== "chromium", "This shortcut test is intended for the Chromium project.");

    await page.addInitScript(() => {
      window.__savePickerCalls = 0;
      window.__savedFiles = {};

      window.showSaveFilePicker = async () => {
        window.__savePickerCalls += 1;
        const name = `picked-${window.__savePickerCalls}.md`;
        return {
          name,
          async getFile() {
            return new File([window.__savedFiles[name] || ""], name, {
              type: "text/markdown",
              lastModified: Date.now()
            });
          },
          async createWritable() {
            let nextContent = "";
            return {
              async write(chunk) {
                nextContent += typeof chunk === "string" ? chunk : String(chunk || "");
              },
              async close() {
                window.__savedFiles[name] = nextContent;
              }
            };
          }
        };
      };
    });

    await page.goto("/");
    await page.locator("#markdownInput").fill("# Rossi");
    await page.keyboard.press("Control+S");

    await expect.poll(async () => page.evaluate(() => window.__savePickerCalls)).toBe(1);
    await expect.poll(async () => page.evaluate(() => window.__savedFiles["picked-1.md"])).toBe("# Rossi");

    await page.locator("#markdownInput").fill("# Rossi updated");
    await page.keyboard.press("Control+S");

    await expect.poll(async () => page.evaluate(() => window.__savePickerCalls)).toBe(1);
    await expect.poll(async () => page.evaluate(() => window.__savedFiles["picked-1.md"])).toBe("# Rossi updated");

    await page.locator("#markdownInput").fill("# Bianchi");
    await page.keyboard.press("Control+Shift+S");

    await expect.poll(async () => page.evaluate(() => window.__savePickerCalls)).toBe(2);
    await expect.poll(async () => page.evaluate(() => window.__savedFiles["picked-2.md"])).toBe("# Bianchi");

    await page.locator("#markdownInput").fill("# Bianchi updated");
    await page.keyboard.press("Control+S");

    await expect.poll(async () => page.evaluate(() => window.__savePickerCalls)).toBe(2);
    await expect.poll(async () => page.evaluate(() => window.__savedFiles["picked-2.md"])).toBe("# Bianchi updated");
  });
});
