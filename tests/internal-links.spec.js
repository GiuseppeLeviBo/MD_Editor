const { test, expect } = require("@playwright/test");

test.describe("in-document links", () => {
  test("scrolls a Set-VAE-style index link to its heading without opening a page", async ({ page, context }) => {
    await page.goto("/");

    const filler = Array.from({ length: 80 }, (_, index) => `Paragraph ${index + 1}`).join("\n\n");
    const markdown = [
      "# Dizionario Set-VAE",
      "",
      "1. [Teoria Bayesiana e Modelli Variazionali (VAE)](#1-teoria-bayesiana-e-modelli-variazionali-vae)",
      "",
      filler,
      "",
      "## 1. Teoria Bayesiana e Modelli Variazionali (VAE)",
      "",
      "Target section"
    ].join("\n");

    await page.locator("#markdownInput").fill(markdown);

    const target = page.locator('#preview h2[id="1-teoria-bayesiana-e-modelli-variazionali-vae"]');
    const link = page.locator('#preview a[href="#1-teoria-bayesiana-e-modelli-variazionali-vae"]');
    await expect(target).toHaveCount(1);
    await expect(link).not.toHaveAttribute("target", "_blank");
    expect(context.pages()).toHaveLength(1);

    await link.click();

    await expect.poll(async () => page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
    await expect.poll(async () => target.evaluate(element => element.getBoundingClientRect().top)).toBeGreaterThanOrEqual(0);
    expect(context.pages()).toHaveLength(1);
    await expect(page.locator("#markdownInput")).toHaveValue(markdown);
  });

  test("creates normalized and unique IDs for accented and duplicate headings", async ({ page }) => {
    await page.goto("/");
    await page.locator("#markdownInput").fill([
      "## 3. Algoritmi di Clustering e Modularità del Grafo",
      "",
      "## Voci da Marcare [DA_TRACCIARE]",
      "",
      "## Voci da Marcare [DA_TRACCIARE]"
    ].join("\n"));

    await expect(page.locator("#preview h2").nth(0)).toHaveAttribute("id", "3-algoritmi-di-clustering-e-modularita-del-grafo");
    await expect(page.locator("#preview h2").nth(1)).toHaveAttribute("id", "voci-da-marcare-da_tracciare");
    await expect(page.locator("#preview h2").nth(2)).toHaveAttribute("id", "voci-da-marcare-da_tracciare-1");
  });
});
