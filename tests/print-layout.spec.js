const { test, expect } = require("@playwright/test");

test.describe("print layout", () => {
  test("print preview includes pagination guards for headings and tables", async ({ page }) => {
    await page.goto("/");
    await page.locator("#markdownInput").fill([
      "# Title",
      "",
      "## Section heading",
      "",
      "First paragraph after the heading.",
      "",
      "| Col A | Col B |",
      "| --- | --- |",
      "| One | Two |"
    ].join("\n"));

    const printHtml = await page.evaluate(() => {
      let capturedHtml = "";
      const mockWindow = {
        focus() {},
        print() {},
        document: {
          open() {},
          write(html) {
            capturedHtml = html;
          },
          close() {}
        }
      };

      window.open = () => mockWindow;
      printRenderedDocument();
      return capturedHtml;
    });

    expect(printHtml).toContain("break-after: avoid-page;");
    expect(printHtml).toContain("h2 + p");
    expect(printHtml).toContain("thead {");
    expect(printHtml).toContain("display: table-header-group;");
    expect(printHtml).toContain("@page {");
    expect(printHtml).toContain("<h2>Section heading</h2>");
    expect(printHtml).toContain("<table data-md-table=\"true\">");
  });
});
