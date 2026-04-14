const { test, expect } = require("@playwright/test");

test.describe("dark mode", () => {
  test("uses the system dark preference when no explicit theme is saved", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "dark" });
    await page.goto("/");

    await expect(page.locator("body")).toHaveAttribute("data-theme", "dark");
    await expect(page.locator("#themeToggleButton")).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator("#themeToggleLabel")).toHaveText("Light mode");

    const themeColor = await page.locator('meta[name="theme-color"]').getAttribute("content");
    expect(themeColor).toBe("#241913");
  });

  test("toggles theme manually, persists it, and relocalizes the label", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "light" });
    await page.goto("/");

    await expect(page.locator("body")).toHaveAttribute("data-theme", "light");
    await expect(page.locator("#themeToggleLabel")).toHaveText("Dark mode");

    await page.locator("#themeToggleButton").click();

    await expect(page.locator("body")).toHaveAttribute("data-theme", "dark");
    await expect(page.locator("#themeToggleButton")).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator("#themeToggleLabel")).toHaveText("Light mode");

    const savedTheme = await page.evaluate(() => localStorage.getItem("wysiwyg_markdown_editor_theme"));
    expect(savedTheme).toBe("dark");

    await page.selectOption("#languageSelect", "it");
    await expect(page.locator("#themeToggleLabel")).toHaveText("Tema chiaro");

    await page.reload();

    await expect(page.locator("body")).toHaveAttribute("data-theme", "dark");
    await expect(page.locator("#themeToggleLabel")).toHaveText("Tema chiaro");
  });

  test("keeps disabled toolbar buttons readable in dark mode", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "dark" });
    await page.goto("/");

    const disabledButton = page.locator("#indentListButton");
    await expect(disabledButton).toBeDisabled();

    const styles = await disabledButton.evaluate(node => {
      const computed = window.getComputedStyle(node);
      return {
        opacity: computed.opacity,
        color: computed.color,
        backgroundColor: computed.backgroundColor
      };
    });

    expect(Number(styles.opacity)).toBeGreaterThan(0.75);
    expect(styles.color).not.toBe(styles.backgroundColor);
  });
});
