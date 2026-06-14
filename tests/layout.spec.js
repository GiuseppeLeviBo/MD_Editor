const { test, expect } = require("@playwright/test");

// Layout tests guard the shell ergonomics: sticky toolbar behavior and compact
// file actions must stay usable even when labels collapse to icon-only controls.
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

  test("shows only the visual editor in visual mode", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/");

    await page.locator('label[for="mode-visual"]').click();

    await expect(page.locator("#visualPanel")).toBeVisible();
    await expect(page.locator("#markdownPanel")).toBeHidden();
    await expect(page.locator("#previewPanel")).toBeHidden();
  });

  test("shows only the markdown panel in markdown mode", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/");

    await page.locator('label[for="mode-markdown"]').click();

    await expect(page.locator("#markdownPanel")).toBeVisible();
    await expect(page.locator("#visualPanel")).toBeHidden();
    await expect(page.locator("#previewPanel")).toBeHidden();
  });

  test("shows visual and markdown panels in paired mode", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/");

    await page.locator('label[for="mode-paired"]').click();

    await expect(page.locator("#visualPanel")).toBeVisible();
    await expect(page.locator("#markdownPanel")).toBeVisible();
    await expect(page.locator("#previewPanel")).toBeHidden();

    const pairedGeometry = await page.evaluate(() => {
      const visual = document.querySelector("#visualPanel").getBoundingClientRect();
      const markdown = document.querySelector("#markdownPanel").getBoundingClientRect();
      return {
        visualWidth: visual.width,
        markdownWidth: markdown.width,
        markdownLeft: markdown.left,
        visualRight: visual.right
      };
    });
    expect(pairedGeometry.visualWidth).toBeGreaterThan(300);
    expect(pairedGeometry.markdownWidth).toBeGreaterThan(300);
    expect(pairedGeometry.markdownLeft).toBeGreaterThanOrEqual(pairedGeometry.visualRight - 2);
  });

  test("persists the selected desktop view mode after reload", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/");

    await page.locator('label[for="mode-markdown"]').click();
    await page.reload();

    await expect(page.locator("#mode-markdown")).toBeChecked();
    await expect(page.locator("#markdownPanel")).toBeVisible();
    await expect(page.locator("#visualPanel")).toBeHidden();
    await expect(page.locator("#previewPanel")).toBeHidden();
  });
});
