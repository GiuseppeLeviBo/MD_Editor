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

    const linkedImage = createFileHandle(
      "diagram.png",
      "fake image",
      "image/png"
    );

    const rootDirectory = createDirectoryHandle({
      "diagram.png": { kind: "file", handle: linkedImage }
    });

    window.showDirectoryPicker = async () => rootDirectory;
  });
});

test.describe("image insert options", () => {
  test("can embed an uploaded image as a data URL", async ({ page }) => {
    await page.goto("/");
    await page.locator("#markdownInput").fill("");

    await page.evaluate(async () => {
      window.__testImageInsertMode = "embed";
      await window.insertImageFromFile(new File(["fake image"], "diagram.png", { type: "image/png" }));
    });

    await expect(page.locator("#markdownInput")).toHaveValue(/!\[diagram\]\(data:image\/png;base64,/);
    await expect(page.locator("#syncStatus")).toContainText(/data URL|data url/i);
  });

  test("blocks linked image insertion until a project folder is linked", async ({ page }) => {
    await page.goto("/");
    await page.locator("#markdownInput").fill("");

    await page.evaluate(async () => {
      window.__testImageInsertMode = "link";
      await window.insertImageFromFile(new File(["fake image"], "diagram.png", { type: "image/png" }));
    });

    await expect(page.locator("#markdownInput")).toHaveValue("");
    await expect(page.locator("#syncStatus")).toContainText(/collega prima la cartella progetto|first link the project folder/i);
  });

  test("can insert an uploaded image as a markdown link using only the file name", async ({ page }) => {
    await page.goto("/");
    await page.locator("#markdownInput").fill("");
    await page.locator("#linkFolderButton").click();

    await page.evaluate(async () => {
      window.__testImageInsertMode = "link";
      await window.insertImageFromFile(new File(["fake image"], "diagram.png", { type: "image/png" }));
    });

    await expect(page.locator("#markdownInput")).toHaveValue("![diagram](diagram.png)");
    await expect(page.locator("#syncStatus")).toContainText(/link markdown|markdown link/i);
  });
});
