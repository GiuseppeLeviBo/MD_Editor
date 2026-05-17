const { test, expect } = require("@playwright/test");
const fs = require("fs");

test.describe("math rendering", () => {
  test("renders inline and display LaTeX while preserving Markdown source", async ({ page }) => {
    await page.goto("/");

    const markdown = [
      "Inline derivative \\(f'(x)/f(x)\\) stays in text.",
      "",
      "\\[",
      "\\int F(f(x))\\,f'(x)\\,dx \\to \\operatorname{Subst}\\left(\\int F(x)\\,dx, x, f(x)\\right)",
      "\\]"
    ].join("\n");

    await page.locator("#markdownInput").fill(markdown);

    await expect(page.locator("#preview .math-inline .katex")).toHaveCount(1);
    await expect(page.locator("#preview .math-block .katex-display")).toHaveCount(1);
    await expect(page.locator("#visualEditor [data-md-math]")).toHaveCount(2);

    await page.evaluate(async () => {
      await window.syncFromVisual(true);
    });

    const roundTripped = await page.locator("#markdownInput").inputValue();
    expect(roundTripped).toContain("\\(f'(x)/f(x)\\)");
    expect(roundTripped).toContain("\\int F(f(x))\\,f'(x)\\,dx");
  });

  test("does not render LaTeX delimiters inside fenced code blocks", async ({ page }) => {
    await page.goto("/");

    await page.locator("#markdownInput").fill("```tex\n\\(x^2\\)\n\\[\ny=x\n\\]\n```");

    await expect(page.locator("#preview .math-inline")).toHaveCount(0);
    await expect(page.locator("#preview .math-block")).toHaveCount(0);
    await expect(page.locator("#preview pre code")).toContainText("\\(x^2\\)");
  });

  test("renders the spiral roadmap math examples", async ({ page }) => {
    const roadmap = fs.readFileSync("D:/Mumath/mumath-pwa-src-v078/docs/spiral-roadmap.md", "utf8");

    await page.goto("/");
    await page.locator("#markdownInput").fill(roadmap);

    await expect(page.locator("#preview .math-block")).toHaveCount(2);
    await expect(page.locator("#preview .math-inline")).toHaveCount(6);
    await expect(page.locator("#preview .math-block").first()).toHaveAttribute("data-md-math", /\\int F/);
  });
});
