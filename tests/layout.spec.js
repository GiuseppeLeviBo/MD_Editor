const { test, expect } = require("@playwright/test");

test.describe("layout behavior", () => {
  test("keeps the desktop toolbar visible while scrolling", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/");

    const toolbar = page.locator(".toolbar");
    await expect(toolbar).toBeVisible();

    const position = await toolbar.evaluate(node => getComputedStyle(node).position);
    expect(position).toBe("sticky");

    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(100);

    const topAfterScroll = await toolbar.evaluate(node => Math.round(node.getBoundingClientRect().top));

    expect(Math.abs(topAfterScroll)).toBeLessThanOrEqual(5);
  });

  test("shows file-action buttons as compact icon-only controls", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/");

    await expect(page.locator("#reloadDocumentButton span[data-i18n='reloadDocument']")).toBeHidden();
    await expect(page.locator("#downloadButton span[data-i18n='downloadMarkdown']")).toBeHidden();
    await expect(page.locator("#reloadDocumentButton")).toHaveAttribute("aria-label", /Reload file/);
    await expect(page.locator("#reloadDocumentButton")).toHaveAttribute("title", /Ctrl\/Cmd \+ Shift \+ R/);
  });
});
