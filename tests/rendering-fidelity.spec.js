const { test, expect } = require("@playwright/test");

// Rendering fidelity tests protect the markdown-it based engine: standard
// CommonMark/GFM syntax must render like other Markdown viewers, and visual
// edits must not rewrite the parts of a document the user did not touch.
async function openDocument(page, markdown, name = "document.md") {
  await page.evaluate(async ({ text, fileName }) => {
    await window.openMarkdownFile(new File([text], fileName, { type: "text/markdown" }));
  }, { text: markdown, fileName: name });
}

async function placeCursorAtEndOfVisualText(page, text) {
  await page.evaluate(targetText => {
    const editor = document.getElementById("visualEditor");
    const walker = document.createTreeWalker(editor, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) {
      const index = node.textContent.indexOf(targetText);
      if (index >= 0) {
        const range = document.createRange();
        range.setStart(node, index + targetText.length);
        range.collapse(true);
        editor.focus();
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
        return;
      }
    }
    throw new Error(`Unable to place cursor at end of visual text: ${targetText}`);
  }, text);
}

test.describe("CommonMark rendering", () => {
  test("joins soft-wrapped lines into one paragraph and keeps hard breaks", async ({ page }) => {
    await page.goto("/");
    await page.locator("#markdownInput").fill("First line\nsame paragraph.\n\nLine one  \nline two\\\nline three");

    await expect(page.locator("#preview > p")).toHaveCount(2);
    await expect(page.locator("#preview > p").first()).toContainText("same paragraph.");
    await expect(page.locator("#preview > p").nth(1).locator("br")).toHaveCount(2);
  });

  test("renders underscore emphasis and keeps inline code literal", async ({ page }) => {
    await page.goto("/");
    await page.locator("#markdownInput").fill("_italic_ and __bold__, `**kwargs` and `a*b*c`, \\*not italic\\*");

    await expect(page.locator("#preview em")).toHaveText("italic");
    await expect(page.locator("#preview strong")).toHaveText("bold");
    await expect(page.locator("#preview code").nth(0)).toHaveText("**kwargs");
    await expect(page.locator("#preview code").nth(1)).toHaveText("a*b*c");
    await expect(page.locator("#preview code em, #preview code strong")).toHaveCount(0);
    await expect(page.locator("#preview")).toContainText("*not italic*");
  });

  test("keeps link and image URLs intact, including query strings, titles and parentheses", async ({ page }) => {
    await page.goto("/");
    await page.locator("#markdownInput").fill([
      "[query](https://example.com/?a=1&b=2) [titled](https://example.com \"Link title\") [wiki](https://en.wikipedia.org/wiki/Foo_(bar))",
      "",
      "![badge](https://img.shields.io/badge/x?style=flat&logo=git \"Badge\")"
    ].join("\n"));

    const links = page.locator("#preview a");
    await expect(links.nth(0)).toHaveAttribute("href", "https://example.com/?a=1&b=2");
    await expect(links.nth(1)).toHaveAttribute("title", "Link title");
    await expect(links.nth(2)).toHaveAttribute("href", "https://en.wikipedia.org/wiki/Foo_(bar)");
    await expect(page.locator("#preview img")).toHaveAttribute("src", "https://img.shields.io/badge/x?style=flat&logo=git");
    await expect(page.locator("#preview img")).toHaveAttribute("title", "Badge");
  });

  test("renders autolinks, setext headings, front matter and every thematic break style", async ({ page }) => {
    await page.goto("/");
    const markdown = [
      "---",
      "title: Demo",
      "---",
      "",
      "Title",
      "=====",
      "",
      "Subtitle",
      "--------",
      "",
      "See <https://example.com> or https://example.org",
      "",
      "***",
      "",
      "___"
    ].join("\n");
    await page.locator("#markdownInput").fill(markdown);

    await expect(page.locator("#preview pre.front-matter")).toContainText("title: Demo");
    await expect(page.locator("#preview h1")).toHaveText("Title");
    await expect(page.locator("#preview h2")).toHaveText("Subtitle");
    await expect(page.locator("#preview a")).toHaveCount(2);
    await expect(page.locator("#preview > hr")).toHaveCount(2);
    await expect(page.locator("#markdownInput")).toHaveValue(markdown);
  });

  test("renders tilde fences, indented code and fenced code inside list items", async ({ page }) => {
    await page.goto("/");
    await page.locator("#markdownInput").fill([
      "1. Install:",
      "   ```bash",
      "   npm install",
      "   ```",
      "2. Run",
      "",
      "~~~python",
      "print('x')",
      "~~~",
      "",
      "    indented code"
    ].join("\n"));

    await expect(page.locator("#preview > ol > li")).toHaveCount(2);
    await expect(page.locator("#preview > ol > li pre code")).toContainText("npm install");
    await expect(page.locator('#preview pre[data-language="python"]')).toContainText("print('x')");
    await expect(page.locator("#preview pre")).toHaveCount(3);
  });

  test("nests lists indented with four spaces, tabs, or two spaces under a numbered item", async ({ page }) => {
    await page.goto("/");
    await page.locator("#markdownInput").fill("- one\n    - two\n\t\t- three\n\n1. First\n  - legacy nested");

    await expect(page.locator("#preview > ul > li > ul > li > ul > li")).toHaveText("three");
    await expect(page.locator("#preview > ol > li > ul > li")).toHaveText("legacy nested");
  });

  test("renders GFM tables with short delimiter rows and keeps LaTeX in cells", async ({ page }) => {
    await page.goto("/");
    await page.locator("#markdownInput").fill("| a | b |\n|:-|-:|\n| $\\alpha + \\frac{1}{2}$ | x \\| y |");

    await expect(page.locator("#preview table")).toHaveCount(1);
    await expect(page.locator("#preview th").nth(1)).toHaveAttribute("data-align", "right");
    await expect(page.locator("#preview td .math-inline")).toHaveAttribute("data-md-math", "\\alpha + \\frac{1}{2}");
    await expect(page.locator("#preview td").nth(1)).toHaveText("x | y");
    await expect(page.locator("#syncStatus")).not.toContainText(/table|tabella/i);
  });

  test("renders footnotes and keeps reference-like lines inside code blocks", async ({ page }) => {
    await page.goto("/");
    await page.locator("#markdownInput").fill("Text[^1].\n\n[^1]: The note.\n\n```\n[foo]: http://example.com\n```");

    await expect(page.locator("#preview sup.footnote-ref")).toHaveCount(1);
    await expect(page.locator("#preview section.footnotes")).toContainText("The note.");
    await expect(page.locator("#preview pre code")).toHaveText("[foo]: http://example.com");
  });

  test("renders safe raw HTML in Markdown and shows unsafe tags as text", async ({ page }) => {
    await page.goto("/");
    await page.locator("#markdownInput").fill([
      "<details>",
      "<summary>More</summary>",
      "",
      "Hidden **content**",
      "",
      "</details>",
      "",
      "H<sub>2</sub>O and <kbd>Ctrl</kbd> <!-- hidden comment -->",
      "",
      "<script>alert(1)</script>",
      "",
      "<img src=\"https://example.com/x.png\" onerror=\"alert(1)\">"
    ].join("\n"));

    await expect(page.locator("#preview details summary")).toHaveText("More");
    await expect(page.locator("#preview details strong")).toHaveText("content");
    await expect(page.locator("#preview sub")).toHaveText("2");
    await expect(page.locator("#preview kbd")).toHaveText("Ctrl");
    await expect(page.locator("#preview")).not.toContainText("hidden comment");
    await expect(page.locator("#preview script")).toHaveCount(0);
    await expect(page.locator("#preview")).toContainText("<script>alert(1)</script>");
    await expect(page.locator("#preview img")).toHaveCount(1);
    await expect(page.locator("#preview img[onerror]")).toHaveCount(0);
  });

  test("renders GitHub alerts and keeps their marker after a visual edit", async ({ page }) => {
    await page.goto("/");
    await page.locator("#markdownInput").fill("> [!WARNING]\n> Careful");

    await expect(page.locator("#preview blockquote.markdown-alert-warning .markdown-alert-title")).toHaveText("Warning");
    await expect(page.locator("#preview blockquote")).not.toContainText("[!WARNING]");

    await placeCursorAtEndOfVisualText(page, "Careful");
    await page.keyboard.type(" now");

    await expect(page.locator("#markdownInput")).toHaveValue("> [!WARNING]\n> Careful now");
  });

  test("scrolls GitHub-style table-of-contents links to the matching heading", async ({ page }) => {
    await page.goto("/");
    const filler = Array.from({ length: 60 }, (_, index) => `Paragraph ${index + 1}`).join("\n\n");
    await page.locator("#markdownInput").fill([
      "[Why](#perché-usare-leditor) and [Setup](#step-1---setup)",
      "",
      filler,
      "",
      "# Perché usare l'editor?",
      "",
      filler,
      "",
      "## Step 1 - Setup",
      "",
      "End"
    ].join("\n"));

    const target = page.locator('#preview h2[id="step-1-setup"]');
    await expect(target).toHaveCount(1);
    await page.locator('#preview a[href="#step-1---setup"]').click();

    await expect.poll(async () => target.evaluate(element => {
      const rect = element.getBoundingClientRect();
      return rect.top >= 0 && rect.top < window.innerHeight;
    })).toBe(true);
  });
});

test.describe("Markdown source preservation", () => {
  test("toggling a task checkbox changes only its marker", async ({ page }) => {
    await page.goto("/");
    const markdown = [
      "Paragraph",
      "wrapped.",
      "",
      "- [ ] Task with _emphasis_",
      "    - nested with four spaces",
      "",
      "[site](https://e.com/?a=1&b=2)",
      "",
      "| f |",
      "|:-|",
      "| $\\alpha$ |",
      ""
    ].join("\n");
    await openDocument(page, markdown);

    await page.locator('#visualEditor li[data-task="true"] input[type="checkbox"]').click();

    await expect(page.locator("#markdownInput")).toHaveValue(markdown.replace("- [ ] Task", "- [x] Task"));
    await expect(page.locator('#preview li[data-task="true"] input[type="checkbox"]')).toBeChecked();
  });

  test("editing one paragraph leaves every other block untouched", async ({ page }) => {
    await page.goto("/");
    const markdown = [
      "---",
      "title: Demo",
      "---",
      "",
      "* Star bullet",
      "* _second_",
      "",
      "Edit me",
      "",
      "<!-- comment -->",
      "",
      "| a |",
      "|:-|",
      "| 1 |",
      "",
      "[ref]: https://example.com",
      ""
    ].join("\n");
    await openDocument(page, markdown);

    await placeCursorAtEndOfVisualText(page, "Edit me");
    await page.keyboard.type(" now");

    await expect(page.locator("#markdownInput")).toHaveValue(markdown.replace("Edit me", "Edit me now"));
  });

  test("editing the last block keeps reference and footnote definitions", async ({ page }) => {
    await page.goto("/");
    await openDocument(page, "See [docs][d] and a note[^n].\n\n[d]: https://example.com\n[^n]: Footnote text.");

    await placeCursorAtEndOfVisualText(page, "See");
    await page.keyboard.type(" the");

    const value = page.locator("#markdownInput");
    await expect(value).toHaveValue(/See the \[docs\]\[d\] and a note\[\^n\]\./);
    await expect(value).toHaveValue(/\[d\]: https:\/\/example\.com/);
    await expect(value).toHaveValue(/\[\^n\]: Footnote text\./);
    await expect(page.locator("#preview a").first()).toHaveAttribute("href", "https://example.com");
  });
});

test.describe("Mermaid robustness", () => {
  test("gives preview diagrams their own SVG ids and leaves no error nodes behind", async ({ page }) => {
    await page.goto("/");
    await page.locator("#markdownInput").fill("```mermaid\ngraph TD\nA-->B\n```");
    await expect(page.locator("#preview .mermaid-block svg")).toHaveCount(1);
    await expect(page.locator("#visualEditor .mermaid-block svg")).toHaveCount(1);

    const ids = await page.evaluate(() => ({
      visual: document.querySelector("#visualEditor .mermaid-block svg").id,
      preview: document.querySelector("#preview .mermaid-block svg").id,
      previewMarkerRefs: Array.from(document.querySelectorAll("#preview [marker-end]"))
        .map(element => (element.getAttribute("marker-end").match(/#([^)]+)/) || [])[1])
        .filter(Boolean)
        .every(id => Boolean(document.querySelector("#preview [id=\"" + id + "\"]")))
    }));
    expect(ids.visual).not.toBe(ids.preview);
    expect(ids.previewMarkerRefs).toBe(true);

    await page.locator("#markdownInput").fill("```mermaid\ngraph TD\nA-->\n```");
    await expect(page.locator("#preview .mermaid-error")).toHaveCount(1);
    await expect.poll(async () => page.evaluate(() => (
      Array.from(document.body.children).filter(element => /mermaid/i.test(element.id || "")).length
    ))).toBe(0);
  });
});

test.describe("file decoding", () => {
  test("opens UTF-16 files with a byte order mark", async ({ page }) => {
    await page.goto("/");
    await page.evaluate(async () => {
      const text = "# Ciao è";
      const bytes = [0xff, 0xfe];
      for (const character of text) {
        const code = character.charCodeAt(0);
        bytes.push(code & 0xff, code >> 8);
      }
      await window.openMarkdownFile(new File([new Uint8Array(bytes)], "utf16.md", { type: "text/markdown" }));
    });

    await expect(page.locator("#markdownInput")).toHaveValue("# Ciao è");
    await expect(page.locator("#preview h1")).toHaveText("Ciao è");
  });

  test("opens legacy Windows-1252 files without replacement characters", async ({ page }) => {
    await page.goto("/");
    await page.evaluate(async () => {
      const bytes = Array.from("# Perch").map(character => character.charCodeAt(0)).concat([0xe9, 0x20, 0x80]);
      await window.openMarkdownFile(new File([new Uint8Array(bytes)], "legacy.md", { type: "text/markdown" }));
    });

    await expect(page.locator("#markdownInput")).toHaveValue("# Perché €");
  });

  test("keeps CRLF files clean after opening and saves them with CRLF", async ({ page }) => {
    await page.goto("/");
    const result = await page.evaluate(async () => {
      const writes = [];
      const original = "# Title\r\n\r\nText\r\n";
      const handle = {
        kind: "file",
        name: "windows.md",
        async getFile() {
          return new File([writes.length ? writes[writes.length - 1] : original], "windows.md", { type: "text/markdown" });
        },
        async createWritable() {
          return {
            async write(content) {
              writes.push(String(content));
            },
            async close() {}
          };
        }
      };
      await window.openMarkdownFile(await handle.getFile(), null, handle);
      const dirtyAfterOpen = window.hasUndownloadedChanges();
      document.getElementById("markdownInput").value += "More\n";
      await window.downloadMarkdown();
      return { dirtyAfterOpen, saved: writes[writes.length - 1], dirtyAfterSave: window.hasUndownloadedChanges() };
    });

    expect(result.dirtyAfterOpen).toBe(false);
    expect(result.saved).toBe("# Title\r\n\r\nText\r\nMore\r\n");
    expect(result.dirtyAfterSave).toBe(false);
  });
});

test.describe("linked folder resources", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      function fileHandle(name, content, type) {
        return {
          kind: "file",
          name,
          async getFile() {
            return new File([content], name, { type });
          }
        };
      }

      function directoryHandle(tree) {
        return {
          kind: "directory",
          async getFileHandle(name) {
            if (!tree[name] || tree[name].kind !== "file") {
              throw new Error(`Missing file: ${name}`);
            }
            return tree[name];
          },
          async getDirectoryHandle(name) {
            if (!tree[name] || tree[name].kind !== "directory") {
              throw new Error(`Missing directory: ${name}`);
            }
            return tree[name];
          }
        };
      }

      const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="40" height="20"><rect width="40" height="20" fill="#b6572c"/></svg>';
      const root = directoryHandle({
        "docs": directoryHandle({
          "guide.md": fileHandle("guide.md", "# Guide\n\n![Picture](img/my%20pic.svg)", "text/markdown"),
          "img": directoryHandle({
            "my pic.svg": fileHandle("my pic.svg", svg, "image/svg+xml")
          })
        })
      });
      window.showDirectoryPicker = async () => root;
    });
  });

  test("resolves percent-escaped image paths from the folder of a linked document", async ({ page }) => {
    await page.goto("/");
    await page.locator("#markdownInput").fill("[Guide](docs/guide.md)");
    await page.locator("#linkFolderButton").click();
    page.on("dialog", dialog => dialog.accept());
    await page.locator("#preview a").click();

    await expect(page.locator("#markdownInput")).toHaveValue(/# Guide/);
    await expect(page.locator("#preview img")).toHaveAttribute("data-md-src", "img/my%20pic.svg");
    await expect(page.locator("#preview img")).toHaveAttribute("src", /^blob:/);
  });
});
