const { test, expect } = require("@playwright/test");

test.describe("image insert options", () => {
  test("can embed an uploaded image as a data URL", async ({ page }) => {
    await page.goto("/");
    await page.locator("#markdownInput").fill("");

    await page.evaluate(async () => {
      window.prompt = () => "embed";
      await window.insertImageFromFile(new File(["fake image"], "diagram.png", { type: "image/png" }));
    });

    await expect(page.locator("#markdownInput")).toHaveValue(/!\[diagram\]\(data:image\/png;base64,/);
    await expect(page.locator("#syncStatus")).toContainText(/data URL|data url/i);
  });

  test("can insert an uploaded image as a markdown link", async ({ page }) => {
    await page.goto("/");
    await page.locator("#markdownInput").fill("");

    await page.evaluate(async () => {
      const answers = ["link", "images/diagram.png"];
      window.prompt = () => answers.shift() || "";
      await window.insertImageFromFile(new File(["fake image"], "diagram.png", { type: "image/png" }));
    });

    await expect(page.locator("#markdownInput")).toHaveValue("![diagram](images/diagram.png)");
    await expect(page.locator("#syncStatus")).toContainText(/link markdown|markdown link/i);
  });
});
