const { test, expect } = require("@playwright/test");

// RTF export is the first registered exporter behind ExportManager. These tests
// document its user-visible contract: file picker metadata, editable RTF output,
// rich Markdown structures, image embedding, and final status feedback.
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
      "Exported symbols: È già pronto.",
      "",
      "1. First item",
      "2. Second item",
      "",
      "- [ ] Checkbox task",
      "",
      "| Col A | Col B |",
      "| --- | --- |",
      "| One | Two |",
      "",
      "![Serial Monitor screenshot](data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==)",
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
    expect(result.content).toContain("\\viewkind4\\uc0\\fs22");
    expect(result.content).toContain("Working draft");
    expect(result.content).toContain("\\fs28");
    expect(result.content).toContain("\\trowd");
    expect(result.content).toContain('HYPERLINK "https://example.com"');
    expect(result.content).toContain("\\f1");
    expect(result.content).toContain("\\uc0");
    expect(result.content).toContain("\\u200 ");
    expect(result.content).toContain("\\u224 ");
    expect(result.content).toContain("\\u9744 ");
    expect(result.content).toContain("\\pict\\pngblip");
    expect(result.content).toContain("Serial Monitor screenshot");
    expect(result.content).not.toContain("[Serial Monitor screenshot]");
    expect(result.content).not.toContain("\\qc\\b\\fs40 documento");
    expect(result.content).not.toContain("\\fs36");

    await expect(page.locator("#syncStatus")).toContainText(/RTF|Documento RTF|RTF document/i);
  });

  test("scales wide embedded images to stay within the RTF page width", async ({ page }) => {
    // This protects the RTF image serializer from producing page-breaking image
    // dimensions when a document contains a very wide embedded bitmap.
    await page.addInitScript(() => {
      function createDirectoryHandle(tree, name = "linked-project") {
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

      window.showDirectoryPicker = async () => createDirectoryHandle({});

      window.__rtfExportWide = { content: null };
      window.showSaveFilePicker = async options => ({
        name: options.suggestedName,
        async createWritable() {
          return {
            async write(value) {
              window.__rtfExportWide.content = value;
            },
            async close() {}
          };
        }
      });
    });

    await page.goto("/");
    const wideImageDataUrl = await page.evaluate(() => {
      const canvas = document.createElement("canvas");
      canvas.width = 4000;
      canvas.height = 1000;
      const context = canvas.getContext("2d");
      context.fillStyle = "#b85b27";
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.fillStyle = "#fff4ea";
      context.fillRect(200, 200, 3600, 600);
      return canvas.toDataURL("image/png");
    });

    await page.locator("#markdownInput").fill(`![Wide test](${wideImageDataUrl})`);
    await page.locator("#linkFolderButton").click();
    await page.locator("#exportRtfButton").click();

    await expect.poll(async () => page.evaluate(() => window.__rtfExportWide.content)).not.toBeNull();
    const content = await page.evaluate(() => window.__rtfExportWide.content);
    expect(content).toContain("\\pict\\pngblip");
    const match = content.match(/\\picwgoal(\d+)\\pichgoal(\d+)/);
    expect(match).not.toBeNull();
    expect(Number(match[1])).toBeLessThanOrEqual(9000);
    expect(Number(match[2])).toBeGreaterThan(0);
  });
});
