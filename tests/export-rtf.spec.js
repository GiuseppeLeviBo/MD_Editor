const { test, expect } = require("@playwright/test");

test.describe("RTF export", () => {
  test("exports the rendered document as editable RTF in the linked folder context", async ({ page }) => {
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

      function createDirectoryHandle(tree, name = "workspace") {
        return {
          kind: "directory",
          name,
          async getFileHandle(entryName) {
            const entry = tree[entryName];
            if (!entry || entry.kind !== "file") {
              throw new Error(`Missing file: ${entryName}`);
            }
            return entry.handle;
          },
          async getDirectoryHandle(entryName) {
            const entry = tree[entryName];
            if (!entry || entry.kind !== "directory") {
              throw new Error(`Missing directory: ${entryName}`);
            }
            return entry.handle;
          }
        };
      }

      const linkedDirectory = createDirectoryHandle({
        "doc.md": { kind: "file", handle: createFileHandle("doc.md", "# Doc", "text/markdown") }
      }, "linked-project");

      window.showDirectoryPicker = async () => linkedDirectory;

      window.__rtfExport = {
        pickerCalls: 0,
        startInName: null,
        suggestedName: null,
        content: null,
        closed: false
      };

      window.showSaveFilePicker = async options => {
        window.__rtfExport.pickerCalls += 1;
        window.__rtfExport.startInName = options.startIn && options.startIn.name ? options.startIn.name : String(options.startIn);
        window.__rtfExport.suggestedName = options.suggestedName;
        return {
          name: options.suggestedName,
          async createWritable() {
            return {
              async write(value) {
                window.__rtfExport.content = value;
              },
              async close() {
                window.__rtfExport.closed = true;
              }
            };
          }
        };
      };
    });

    await page.goto("/");
    await page.locator("#markdownInput").fill([
      "# Working draft",
      "",
      "This is a **bold** paragraph with a [link](https://example.com).",
      "",
      "1. First item",
      "2. Second item",
      "",
      "| Col A | Col B |",
      "| --- | --- |",
      "| One | Two |",
      "",
      "```js",
      "const ready = true;",
      "```"
    ].join("\n"));

    await page.locator("#linkFolderButton").click();
    await expect(page.locator("#syncStatus")).toContainText(/Document folder linked|Cartella documento collegata/i);

    await page.locator("#exportRtfButton").click();

    await expect.poll(async () => page.evaluate(() => window.__rtfExport.pickerCalls)).toBe(1);
    await expect.poll(async () => page.evaluate(() => window.__rtfExport.closed)).toBe(true);

    const result = await page.evaluate(() => window.__rtfExport);

    expect(result.startInName).toBe("linked-project");
    expect(result.suggestedName).toBe("documento.rtf");
    expect(result.content).toContain("{\\rtf1\\ansi");
    expect(result.content).toContain("Working draft");
    expect(result.content).toContain("\\trowd");
    expect(result.content).toContain('HYPERLINK "https://example.com"');
    expect(result.content).toContain("\\f1");

    await expect(page.locator("#syncStatus")).toContainText(/RTF|Documento RTF|RTF document/i);
  });
});
