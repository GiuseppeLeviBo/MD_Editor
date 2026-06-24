const { test, expect } = require("@playwright/test");
const fs = require("fs");
const path = require("path");

test.describe("Mermaid rendering", () => {
  test("renders Mermaid fenced graphs in preview and visual editor while preserving Markdown source", async ({ page }) => {
    await page.goto("/");

    const markdown = [
      "# Agent pipeline",
      "",
      "```mermaid",
      "graph TD",
      "    UserRequest[\"Richiesta Utente Grezza\"] --> M4[\"Requirement Negotiator\"]",
      "    M4 --> Contract[\"contract.yaml\"]",
      "    Contract --> M22[\"Pre-flight Verification\"]",
      "```"
    ].join("\n");

    await page.locator("#markdownInput").fill(markdown);

    await expect(page.locator("#preview .mermaid-block svg")).toHaveCount(1);
    await expect(page.locator("#visualEditor .mermaid-block svg")).toHaveCount(1);
    await expect(page.locator("#preview pre[data-language=\"mermaid\"]")).toHaveCount(0);
    await expect(page.locator("#visualEditor [data-md-mermaid]")).toHaveAttribute("data-md-mermaid", /graph TD/);

    await page.evaluate(async () => {
      await window.syncFromVisual(true);
    });

    const roundTripped = await page.locator("#markdownInput").inputValue();
    expect(roundTripped).toContain("```mermaid");
    expect(roundTripped).toContain("UserRequest");
    expect(roundTripped).toContain("Contract --> M22");
  });

  test("renders the project analysis Mermaid example", async ({ page }) => {
    const analysis = fs.readFileSync(path.join(__dirname, "fixtures", "project-structure-analysis.md"), "utf8");
    const mermaidBlock = analysis.match(/```mermaid[\s\S]*?```/);
    expect(mermaidBlock).not.toBeNull();

    await page.goto("/");
    await page.locator("#markdownInput").fill(["# Imported architecture", "", mermaidBlock[0]].join("\n"));

    await expect(page.locator("#preview .mermaid-block svg")).toHaveCount(1);
    await expect(page.locator("#preview [data-md-mermaid]")).toHaveAttribute("data-md-mermaid", /Orchestrator Control Loop/);
  });
});
