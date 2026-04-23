const { test, expect } = require("@playwright/test");

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    function createFileHandle(name, content, type = "text/plain") {
      return {
        kind: "file",
        name,
        async getFile() {
          return new File([content], name, { type });
        }
      };
    }

    function createDirectoryHandle(tree) {
      return {
        kind: "directory",
        async getFileHandle(name) {
          const entry = tree[name];
          if (!entry || entry.kind !== "file") {
            throw new Error(`Missing file: ${name}`);
          }
          return entry.handle;
        },
        async getDirectoryHandle(name) {
          const entry = tree[name];
          if (!entry || entry.kind !== "directory") {
            throw new Error(`Missing directory: ${name}`);
          }
          return entry.handle;
        }
      };
    }

    const linkedMarkdown = createFileHandle(
      "DSL_REFERENCE.md",
      "# Linked reference\n\nThis file was opened from a local relative link.",
      "text/markdown"
    );

    const linkedImage = createFileHandle(
      "diagram.svg",
      '<svg xmlns="http://www.w3.org/2000/svg" width="120" height="60"><rect width="120" height="60" fill="#b6572c"/><text x="12" y="36" font-size="18" fill="white">Test</text></svg>',
      "image/svg+xml"
    );

    const rootDirectory = createDirectoryHandle({
      "DSL_REFERENCE.md": { kind: "file", handle: linkedMarkdown },
      "diagram.svg": { kind: "file", handle: linkedImage }
    });

    window.showDirectoryPicker = async () => rootDirectory;
  });
});

test.describe("local resources", () => {
  test("does not resolve a relative local image against the app origin before folder linking", async ({ page }) => {
    await page.goto("/");

    await page.locator("#markdownInput").fill("![Diagram](diagram.svg)");

    await expect(page.locator("#preview img")).toHaveCount(0);
    await expect(page.locator("#visualEditor img")).toHaveCount(0);
    await expect(page.locator("#preview")).toContainText("![Diagram](diagram.svg)");
  });

  test("renders a linked local image after folder linking", async ({ page }) => {
    await page.goto("/");

    await page.locator("#markdownInput").fill("![Diagram](diagram.svg)");
    await page.locator("#linkFolderButton").click();

    await expect(page.locator("#syncStatus")).toContainText("Document folder linked");
    await expect(page.locator("#preview img")).toHaveCount(1);
    await expect(page.locator("#preview img")).toHaveAttribute("data-md-src", "diagram.svg");
    await expect(page.locator("#visualEditor img")).toHaveCount(1);
    await expect(page.locator("#visualEditor img")).toHaveAttribute("data-md-src", "diagram.svg");
    await expect(page.locator("#visualEditor figure figcaption")).toHaveText("Diagram");
  });

  test("opens a linked local markdown file from preview", async ({ page }) => {
    await page.goto("/");

    await page.locator("#markdownInput").fill("[Open linked file](DSL_REFERENCE.md)");
    await page.locator("#linkFolderButton").click();
    page.on("dialog", dialog => dialog.accept());
    await page.locator("#preview a").click();

    await expect(page.locator("#markdownInput")).toHaveValue(/# Linked reference/);
    await expect(page.locator("#visualEditor")).toContainText("This file was opened from a local relative link.");
  });
});
