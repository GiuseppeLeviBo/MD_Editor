const { test, expect } = require("@playwright/test");

test.describe("unsaved changes protection", () => {
  test("warns before closing when markdown has unsaved changes", async ({ page }) => {
    await page.goto("/");

    await page.locator("#visualEditor").click();
    await page.keyboard.press("End");
    await page.keyboard.type(" Extra text");

    const dialogPromise = page.waitForEvent("dialog");
    await page.close({ runBeforeUnload: true });
    const dialog = await dialogPromise;

    expect(dialog.type()).toBe("beforeunload");
    await dialog.dismiss();
  });
});
