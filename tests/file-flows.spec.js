const { test, expect } = require("@playwright/test");

// File-flow tests cover opening, saving, closing, and the opt-in device memory.
// Memory tests use real FileSystemFileHandle objects from the origin private
// file system (OPFS), because only real handles can be stored in IndexedDB.
async function writeOpfsFile(page, name, content) {
  await page.evaluate(async ({ fileName, text }) => {
    const root = await navigator.storage.getDirectory();
    const handle = await root.getFileHandle(fileName, { create: true });
    const writable = await handle.createWritable();
    await writable.write(text);
    await writable.close();
  }, { fileName: name, text: content });
}

async function readOpfsFile(page, name) {
  return page.evaluate(async fileName => {
    const root = await navigator.storage.getDirectory();
    const handle = await root.getFileHandle(fileName);
    return (await handle.getFile()).text();
  }, name);
}

async function memoryDatabaseExists(page) {
  return page.evaluate(async () => (await indexedDB.databases()).some(database => database.name === "md-editor-memory"));
}

function useOpfsOpenPicker(page, name) {
  return page.addInitScript(fileName => {
    window.showOpenFilePicker = async () => {
      const root = await navigator.storage.getDirectory();
      return [await root.getFileHandle(fileName)];
    };
  }, name);
}

test.describe("opening and closing", () => {
  test("asks about unsaved changes only once when the browser has no file picker API", async ({ page }) => {
    await page.addInitScript(() => {
      delete window.showOpenFilePicker;
    });
    await page.goto("/");
    await page.locator("#markdownInput").fill("# Unsaved draft");

    let confirmations = 0;
    page.on("dialog", dialog => {
      confirmations += 1;
      void dialog.accept();
    });
    page.on("filechooser", chooser => chooser.setFiles({ name: "next.md", mimeType: "text/markdown", buffer: Buffer.from("# Next") }));
    await page.locator("#openMarkdownButton").click();

    await expect(page.locator("#markdownInput")).toHaveValue("# Next");
    expect(confirmations).toBe(1);
  });

  test("cancelling the folder picker does not open a second picker", async ({ page }) => {
    await page.addInitScript(() => {
      window.showDirectoryPicker = async () => {
        throw new DOMException("The user aborted a request.", "AbortError");
      };
    });
    await page.goto("/");
    let fileChoosers = 0;
    page.on("filechooser", () => {
      fileChoosers += 1;
    });

    await page.locator("#linkFolderButton").click();

    await expect(page.locator("#syncStatus")).toContainText(/canceled|annullata/i);
    expect(fileChoosers).toBe(0);
  });

  test("closing any document leaves a blank sheet, and every new launch shows the welcome page", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("#markdownInput")).toHaveValue(/Markdown WYSIWYG Editor/);

    await page.evaluate(async () => {
      await window.openMarkdownFile(new File(["# Saved file"], "saved.md", { type: "text/markdown" }));
    });
    await page.locator("#closeDocumentButton").click();
    await expect(page.locator("#markdownInput")).toHaveValue("");
    await expect(page.locator("#syncStatus")).toContainText(/blank sheet|foglio vuoto/i);

    await page.reload();
    await expect(page.locator("#markdownInput")).toHaveValue("");

    const secondLaunch = await page.context().newPage();
    await secondLaunch.goto("/");
    await expect(secondLaunch.locator("#markdownInput")).toHaveValue(/Markdown WYSIWYG Editor/);
  });

  test("the welcome page with the current shortcuts returns for users who already saw it", async ({ page }) => {
    // v0.65.0 stored this flag and hid the welcome page on later launches.
    await page.addInitScript(() => {
      localStorage.setItem("wysiwyg_markdown_editor_welcome_seen", "1");
    });
    await page.goto("/");

    const markdown = page.locator("#markdownInput");
    await expect(markdown).toHaveValue(/Markdown WYSIWYG Editor/);
    await expect(markdown).toHaveValue(/\| (Open file|Apri file) \| Ctrl\/Cmd \+ O \|/);
    await expect(markdown).toHaveValue(/\| (Underline|Sottolineato) \| Ctrl\/Cmd \+ U \|/);
    await expect(markdown).toHaveValue(/<u>(text|testo)<\/u>/);
    await expect(page.locator("#preview table").first()).toBeVisible();
  });

  test("a failed open keeps the current document connected to its file", async ({ page }) => {
    await page.addInitScript(() => {
      window.__writes = [];
      window.__pickerFiles = [
        { name: "notes.md", parts: ["# Notes"] },
        { name: "photo.md", parts: [new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])] }
      ];
      window.showOpenFilePicker = async () => {
        const spec = window.__pickerFiles.shift();
        const lastModified = 1700000000000;
        return [{
          kind: "file",
          name: spec.name,
          async getFile() {
            return new File(spec.parts, spec.name, { type: "text/markdown", lastModified });
          },
          async createWritable() {
            return {
              async write(content) {
                window.__writes.push([spec.name, String(content)]);
              },
              async close() {}
            };
          }
        }];
      };
    });
    await page.goto("/");
    await page.locator("#openMarkdownButton").click();
    await expect(page.locator("#markdownInput")).toHaveValue("# Notes");

    await page.locator("#openMarkdownButton").click();
    await expect(page.locator("#syncStatus")).toContainText(/binary|binario|markdown or text|markdown o testo/i);
    await expect(page.locator("#reloadDocumentButton")).toBeEnabled();

    await page.locator("#markdownInput").fill("# Notes updated");
    await page.locator("#downloadButton").click();
    await expect.poll(async () => page.evaluate(() => window.__writes.map(write => write[0]))).toEqual(["notes.md"]);
  });

  test("a dropped file keeps its handle so Save writes back to it", async ({ page }) => {
    await page.addInitScript(() => {
      window.__writes = [];
      DataTransferItem.prototype.getAsFileSystemHandle = async function getAsFileSystemHandle() {
        return {
          kind: "file",
          name: "dropped.md",
          async getFile() {
            return new File(["# Dropped"], "dropped.md", { type: "text/markdown", lastModified: 1700000000000 });
          },
          async createWritable() {
            return {
              async write(content) {
                window.__writes.push(String(content));
              },
              async close() {}
            };
          }
        };
      };
    });
    await page.goto("/");
    await page.evaluate(() => {
      const transfer = new DataTransfer();
      transfer.items.add(new File(["# Dropped"], "dropped.md", { type: "text/markdown", lastModified: 1700000000000 }));
      document.dispatchEvent(new DragEvent("drop", { dataTransfer: transfer, bubbles: true, cancelable: true }));
    });
    await expect(page.locator("#markdownInput")).toHaveValue("# Dropped");

    await page.locator("#markdownInput").fill("# Dropped and edited");
    await page.locator("#downloadButton").click();
    await expect.poll(async () => page.evaluate(() => window.__writes)).toEqual(["# Dropped and edited"]);
    await expect(page.locator("#syncStatus")).toContainText(/Saved to disk: dropped\.md|Salvato su disco: dropped\.md/);
  });
});

test.describe("saving", () => {
  test("asks before overwriting a file that another program changed", async ({ page }) => {
    await page.addInitScript(() => {
      window.__disk = { content: "# Original", lastModified: 1700000000000 };
      window.showOpenFilePicker = async () => [{
        kind: "file",
        name: "shared.md",
        async getFile() {
          return new File([window.__disk.content], "shared.md", { type: "text/markdown", lastModified: window.__disk.lastModified });
        },
        async createWritable() {
          let next = "";
          return {
            async write(content) {
              next += String(content);
            },
            async close() {
              window.__disk = { content: next, lastModified: window.__disk.lastModified + 1000 };
            }
          };
        }
      }];
    });
    await page.goto("/");
    await page.locator("#openMarkdownButton").click();
    await expect(page.locator("#markdownInput")).toHaveValue("# Original");

    await page.evaluate(() => {
      window.__disk = { content: "# Changed by a colleague", lastModified: window.__disk.lastModified + 5000 };
    });
    await page.locator("#markdownInput").fill("# My version");

    const messages = [];
    page.once("dialog", dialog => {
      messages.push(dialog.message());
      void dialog.dismiss();
    });
    await page.locator("#downloadButton").click();

    await expect(page.locator("#syncStatus")).toContainText(/file on disk changed|file su disco e cambiato/i);
    expect(messages[0]).toMatch(/shared\.md/);
    expect(await page.evaluate(() => window.__disk.content)).toBe("# Changed by a colleague");

    page.once("dialog", dialog => dialog.accept());
    await page.locator("#downloadButton").click();
    await expect.poll(async () => page.evaluate(() => window.__disk.content)).toBe("# My version");
  });

  test("a page refresh keeps the document name and saved state", async ({ page }) => {
    await page.goto("/");
    await page.evaluate(async () => {
      await window.openMarkdownFile(new File(["# Report"], "report.md", { type: "text/markdown" }));
    });
    await expect(page).toHaveTitle(/^report\.md - clean/);

    await page.reload();

    await expect(page.locator("#markdownInput")).toHaveValue("# Report");
    await expect(page).toHaveTitle(/^report\.md - clean/);
    await page.locator("#markdownInput").fill("# Report edited");
    await expect(page).toHaveTitle(/^\* report\.md - modified/);
  });
});

test.describe("device memory", () => {
  test("is off by default and writes nothing to IndexedDB", async ({ page }) => {
    await useOpfsOpenPicker(page, "private.md");
    await page.goto("/");
    await writeOpfsFile(page, "private.md", "# Private");

    await expect(page.locator("#rememberToggleButton")).toHaveAttribute("aria-pressed", "false");
    await expect(page.locator("#recentDocumentsButton")).toBeHidden();
    await page.locator("#openMarkdownButton").click();
    await expect(page.locator("#markdownInput")).toHaveValue("# Private");
    await page.locator("#markdownInput").fill("# Private edited");
    await page.waitForTimeout(1200);

    expect(await memoryDatabaseExists(page)).toBe(false);
  });

  test("stays off when the shared-computer warning is dismissed", async ({ page }) => {
    await page.goto("/");
    let warning = "";
    page.once("dialog", dialog => {
      warning = dialog.message();
      void dialog.dismiss();
    });
    await page.locator("#rememberToggleButton").click();

    await expect.poll(() => warning).toMatch(/shared computer|computer condiviso/i);
    await expect(page.locator("#rememberToggleButton")).toHaveAttribute("aria-pressed", "false");
    expect(await memoryDatabaseExists(page)).toBe(false);
  });

  test("restores an unsaved draft after restarting and reconnects it to its file", async ({ page, context }) => {
    await useOpfsOpenPicker(page, "thesis.md");
    await page.goto("/");
    await writeOpfsFile(page, "thesis.md", "# Thesis");

    page.on("dialog", dialog => dialog.accept());
    await page.locator("#rememberToggleButton").click();
    await expect(page.locator("#rememberToggleButton")).toHaveAttribute("aria-pressed", "true");
    await page.locator("#openMarkdownButton").click();
    await expect(page.locator("#markdownInput")).toHaveValue("# Thesis");
    await page.locator("#markdownInput").fill("# Thesis\n\nUnsaved paragraph.");
    await page.waitForTimeout(1200);
    await page.close();

    const restarted = await context.newPage();
    restarted.on("dialog", dialog => dialog.accept());
    await restarted.goto("/");
    await expect(restarted.locator("#markdownInput")).toHaveValue("# Thesis\n\nUnsaved paragraph.");
    await expect(restarted).toHaveTitle(/^\* thesis\.md - modified/);
    await expect(restarted.locator("#resumeSuggestion")).toHaveClass(/is-visible/);

    await restarted.locator("#resumeSuggestionAction").click();
    await expect(restarted.locator("#reloadDocumentButton")).toBeEnabled();
    await restarted.locator("#downloadButton").click();
    await expect.poll(async () => readOpfsFile(restarted, "thesis.md")).toBe("# Thesis\n\nUnsaved paragraph.");
  });

  test("lists recent files and reopens them", async ({ page, context }) => {
    await useOpfsOpenPicker(page, "recent.md");
    await page.goto("/");
    await writeOpfsFile(page, "recent.md", "# Recent file");
    page.on("dialog", dialog => dialog.accept());
    await page.locator("#rememberToggleButton").click();
    await page.locator("#openMarkdownButton").click();
    await expect(page.locator("#markdownInput")).toHaveValue("# Recent file");
    await page.locator("#closeDocumentButton").click();
    await page.waitForTimeout(1200);
    await page.close();

    const restarted = await context.newPage();
    restarted.on("dialog", dialog => dialog.accept());
    await restarted.goto("/");
    await expect(restarted.locator("#markdownInput")).toHaveValue(/Markdown WYSIWYG Editor/);
    await expect(restarted.locator("#resumeSuggestionText")).toContainText("recent.md");

    await restarted.locator("#recentDocumentsButton").click();
    await expect(restarted.locator("#recentDocumentsList li")).toHaveCount(1);
    await restarted.locator("#recentDocumentsList .recent-document-open").click();
    await expect(restarted.locator("#markdownInput")).toHaveValue("# Recent file");
    await expect(restarted.locator("#resumeSuggestion")).not.toHaveClass(/is-visible/);
  });

  test("Clear local data deletes the memory and turns it off", async ({ page }) => {
    await useOpfsOpenPicker(page, "wipe.md");
    await page.goto("/");
    await writeOpfsFile(page, "wipe.md", "# Wipe me");
    page.on("dialog", dialog => dialog.accept());
    await page.locator("#rememberToggleButton").click();
    await page.locator("#openMarkdownButton").click();
    await expect(page.locator("#markdownInput")).toHaveValue("# Wipe me");
    await expect.poll(async () => memoryDatabaseExists(page)).toBe(true);

    await page.locator("#resetPrivacyButton").click();

    await expect(page.locator("#rememberToggleButton")).toHaveAttribute("aria-pressed", "false");
    await expect(page.locator("#recentDocumentsButton")).toBeHidden();
    await expect.poll(async () => memoryDatabaseExists(page)).toBe(false);
    expect(await page.evaluate(() => localStorage.getItem("wysiwyg_markdown_editor_remember_documents"))).toBeNull();
  });
});
