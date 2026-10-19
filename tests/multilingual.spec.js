const { test, expect } = require("@playwright/test");

// Right-to-left scripts (Arabic, Hebrew) and Chinese, Japanese and Korean.
// The Markdown file never stores layout hints: direction and language are
// derived from the text, or from the standard "lang" / "dir" front matter keys.

async function loadDocument(page, markdown) {
  await page.goto("/");
  await page.locator("#markdownInput").fill(markdown);
  if (markdown) {
    await expect(page.locator("#preview")).not.toBeEmpty();
  }
}

async function directions(page, selector) {
  return page.locator(selector).evaluateAll(elements => elements.map(element => getComputedStyle(element).direction));
}

async function setTextareaCaret(page, offset) {
  await page.locator("#markdownInput").evaluate((textarea, value) => {
    textarea.focus();
    textarea.setSelectionRange(value, value);
  }, offset);
}

test.describe("right-to-left text", () => {
  const MIXED = [
    "مرحبا بالعالم",
    "",
    "Hello world",
    "",
    "- عنصر أول",
    "- عنصر ثاني",
    "",
    "> שלום עולם",
    "",
    "| الاسم | العمر |",
    "| --- | --- |",
    "| أحمد | ٣٠ |"
  ].join("\n");

  test("each block takes the direction of its own text, in the visual editor and in the preview", async ({ page }) => {
    await loadDocument(page, MIXED);

    for (const root of ["#visualEditor", "#preview"]) {
      expect(await directions(page, `${root} > p`)).toEqual(["rtl", "ltr"]);
      expect(await directions(page, `${root} > ul, ${root} > ul > li`)).toEqual(["rtl", "rtl", "rtl"]);
      expect(await directions(page, `${root} > blockquote`)).toEqual(["rtl"]);
      expect(await directions(page, `${root} > table`)).toEqual(["rtl"]);
    }

    const alignment = await page.locator("#preview > p").first().evaluate(paragraph => {
      const range = document.createRange();
      range.selectNodeContents(paragraph);
      const text = range.getBoundingClientRect();
      const box = paragraph.getBoundingClientRect();
      return { rightGap: box.right - text.right, leftGap: text.left - box.left };
    });
    expect(alignment.rightGap).toBeLessThan(2);
    expect(alignment.leftGap).toBeGreaterThan(20);
  });

  test("the Markdown file gets no direction markup when Arabic text is edited visually", async ({ page }) => {
    await loadDocument(page, "مرحبا\n\nHello");
    await page.locator("#visualEditor > p").first().evaluate(paragraph => {
      const range = document.createRange();
      range.selectNodeContents(paragraph);
      range.collapse(false);
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
      paragraph.closest("[contenteditable]").focus();
    });
    await page.keyboard.insertText(" بالعالم");

    await expect(page.locator("#markdownInput")).toHaveValue("مرحبا بالعالم\n\nHello");
  });

  test("a paragraph typed in the visual editor follows the direction of its text", async ({ page }) => {
    await loadDocument(page, "");
    await page.locator("#visualEditor").click();
    await page.keyboard.insertText("שלום");
    await page.keyboard.press("Enter");
    await page.keyboard.insertText("Shalom");

    await expect(page.locator("#markdownInput")).toHaveValue("שלום\n\nShalom");
    const typed = await page.locator("#visualEditor").evaluate(editor => {
      const walker = document.createTreeWalker(editor, NodeFilter.SHOW_TEXT);
      const box = editor.getBoundingClientRect();
      const result = [];
      while (walker.nextNode()) {
        const range = document.createRange();
        range.selectNodeContents(walker.currentNode);
        const text = range.getBoundingClientRect();
        result.push({ text: walker.currentNode.textContent, nearRight: box.right - text.right < 60 });
      }
      return result;
    });
    expect(typed).toEqual([
      { text: "שלום", nearRight: true },
      { text: "Shalom", nearRight: false }
    ]);
  });

  test("code, inline code and formulas stay left to right inside Arabic text", async ({ page }) => {
    await loadDocument(page, "نص مع `print(x)` هنا\n\n```js\nconst a = 1;\n```\n\n$$x^2 + 1$$");

    for (const root of ["#visualEditor", "#preview"]) {
      expect(await directions(page, `${root} > p code`)).toEqual(["ltr"]);
      expect(await directions(page, `${root} > pre`)).toEqual(["ltr"]);
      expect(await directions(page, `${root} .math-block`)).toEqual(["ltr"]);
    }
  });

  test("the Markdown panel lays out every line in the direction of its own text", async ({ page }) => {
    await page.goto("/");
    const style = await page.locator("#markdownInput").evaluate(textarea => ({
      unicodeBidi: getComputedStyle(textarea).unicodeBidi,
      textAlign: getComputedStyle(textarea).textAlign
    }));
    expect(style).toEqual({ unicodeBidi: "plaintext", textAlign: "start" });
  });

  test("Arabic headings keep their letters joined", async ({ page }) => {
    await loadDocument(page, "### عنوان فرعي\n\n###### عنوان صغير");

    const spacing = await page.locator("#preview h3, #preview h6").evaluateAll(headings => headings.map(heading => ({
      letterSpacing: getComputedStyle(heading).letterSpacing,
      textTransform: getComputedStyle(heading).textTransform
    })));
    expect(spacing).toEqual([
      { letterSpacing: "normal", textTransform: "none" },
      { letterSpacing: "normal", textTransform: "none" }
    ]);
  });

  test("an alert's title sits on the side where its Arabic text starts", async ({ page }) => {
    await loadDocument(page, "> [!NOTE]\n> ملاحظة مهمة\n\n> [!TIP]\n> An English tip");

    const sides = await page.locator("#preview .markdown-alert-title").evaluateAll(titles => titles.map(title => {
      const range = document.createRange();
      range.selectNodeContents(title);
      const text = range.getBoundingClientRect();
      const box = title.getBoundingClientRect();
      return box.right - text.right < 2 ? "right" : "left";
    }));
    expect(sides).toEqual(["right", "left"]);
    expect(await directions(page, "#preview > blockquote")).toEqual(["rtl", "ltr"]);
  });

  test("front matter dir and lang apply to the whole document", async ({ page }) => {
    await loadDocument(page, "---\nlang: ar\ndir: rtl\n---\n\n123\n\nمرحبا");

    for (const root of ["#visualEditor", "#preview"]) {
      await expect(page.locator(root)).toHaveAttribute("dir", "rtl");
      await expect(page.locator(root)).toHaveAttribute("lang", "ar");
    }
    expect(await directions(page, "#preview > p")).toEqual(["rtl", "rtl"]);

    await page.locator("#markdownInput").fill("Plain text again");
    await expect(page.locator("#preview")).not.toHaveAttribute("dir", /.*/);
    await expect(page.locator("#preview")).not.toHaveAttribute("lang", /.*/);
  });
});

test.describe("Chinese, Japanese and Korean", () => {
  test("the document language is recognised so the right fonts are used", async ({ page }) => {
    const cases = [
      ["これは日本語の文章です。漢字とかなを使います。", "ja"],
      ["这是一个中文段落，用来测试语言识别。", "zh"],
      ["이것은 한국어 문장입니다.", "ko"],
      ["Questo è un documento italiano.", null]
    ];
    await page.goto("/");
    for (const [markdown, lang] of cases) {
      await page.locator("#markdownInput").fill(markdown);
      for (const selector of ["#visualEditor", "#preview", "#markdownInput"]) {
        if (lang) {
          await expect(page.locator(selector)).toHaveAttribute("lang", lang);
        } else {
          await expect(page.locator(selector)).not.toHaveAttribute("lang", /.*/);
        }
      }
    }
  });

  test("front matter lang overrides the detected language", async ({ page }) => {
    await loadDocument(page, "---\nlang: zh-TW\n---\n\n這是繁體中文。");

    await expect(page.locator("#preview")).toHaveAttribute("lang", "zh-TW");
    await expect(page.locator("#visualEditor")).toHaveAttribute("lang", "zh-TW");
  });

  test("a line break between Chinese or Japanese characters adds no space", async ({ page }) => {
    await loadDocument(page, "中文的段落\n继续写下去\n\n日本語の文\nつづき\n\n한국어 문장\n계속");

    const paragraphs = await page.locator("#preview > p").evaluateAll(elements => elements.map(element => element.textContent));
    expect(paragraphs[0]).toBe("中文的段落继续写下去");
    expect(paragraphs[1]).toBe("日本語の文つづき");
    expect(paragraphs[2]).toMatch(/^한국어 문장\s계속$/);
  });

  test("bold and italic work next to Chinese and Japanese punctuation", async ({ page }) => {
    await loadDocument(page, "**「強調」**です\n\n这是**重要的。**真的\n\n*（注意）*してください");

    await expect(page.locator("#preview strong")).toHaveText(["「強調」", "重要的。"]);
    await expect(page.locator("#preview em")).toHaveText(["（注意）"]);
  });

  test("heading anchors keep Japanese, Korean and Arabic text", async ({ page }) => {
    await loadDocument(page, [
      "# データ分析",
      "",
      "## 한국어 제목",
      "",
      "## मराठी शीर्षक",
      "",
      "## Perché funziona",
      "",
      "[a](#データ分析) [b](#한국어-제목) [c](#perche-funziona)"
    ].join("\n"));

    expect(await page.locator("#preview h1, #preview h2").evaluateAll(headings => headings.map(heading => heading.id)))
      .toEqual(["データ分析", "한국어-제목", "मराठी-शीर्षक", "perche-funziona"]);

    await page.locator("#preview a", { hasText: "b" }).click();
    await expect(page.locator("#preview h2").first()).toBeInViewport();
  });
});

test.describe("input methods for Chinese, Japanese and Korean", () => {
  test("confirming a candidate with Enter does not split the list item", async ({ page }) => {
    await loadDocument(page, "- 項目");
    const result = await page.locator("#visualEditor li").evaluate(item => {
      const editor = item.closest("#visualEditor");
      const range = document.createRange();
      range.selectNodeContents(item);
      range.collapse(false);
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
      editor.focus();
      editor.dispatchEvent(new CompositionEvent("compositionstart", { bubbles: true, data: "" }));
      const enter = new KeyboardEvent("keydown", { key: "Enter", code: "Enter", keyCode: 229, isComposing: true, bubbles: true, cancelable: true });
      editor.dispatchEvent(enter);
      return { prevented: enter.defaultPrevented, items: editor.querySelectorAll("li").length };
    });

    expect(result).toEqual({ prevented: false, items: 1 });
    await expect(page.locator("#markdownInput")).toHaveValue("- 項目");
  });

  test("undo skips the text shown while a word is being composed", async ({ page }) => {
    await loadDocument(page, "Start");
    await page.waitForTimeout(400);

    await page.locator("#visualEditor p").evaluate(async paragraph => {
      const editor = paragraph.closest("#visualEditor");
      const text = paragraph.firstChild;
      const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
      editor.focus();
      editor.dispatchEvent(new CompositionEvent("compositionstart", { bubbles: true, data: "" }));
      text.textContent = "Start にほん";
      editor.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertCompositionText", data: "にほん", isComposing: true }));
      await wait(500);
      text.textContent = "Start 日本";
      editor.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertCompositionText", data: "日本", isComposing: true }));
      editor.dispatchEvent(new CompositionEvent("compositionend", { bubbles: true, data: "日本" }));
      editor.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText", data: "日本", isComposing: false }));
    });

    await expect(page.locator("#markdownInput")).toHaveValue("Start 日本");
    await page.waitForTimeout(400);
    await page.locator("#markdownInput").focus();
    await page.keyboard.press("Control+Z");
    await expect(page.locator("#markdownInput")).toHaveValue("Start");
  });
});

test.describe("find and replace in any script", () => {
  async function replaceAll(page, search, replacement, { matchCase = false } = {}) {
    await page.locator("#markdownInput").focus();
    await page.keyboard.press("Control+H");
    await page.locator("#findReplaceSearchInput").fill(search);
    await page.locator("#findReplaceReplaceInput").fill(replacement);
    if (matchCase) {
      await page.locator("#findReplaceMatchCase").check();
    }
    await page.locator("#replaceAllButton").click();
  }

  test("finds Arabic words with or without vowel marks", async ({ page }) => {
    await loadDocument(page, "مُحَمَّد رسول ومحمـد");
    await replaceAll(page, "محمد", "أحمد");
    await expect(page.locator("#markdownInput")).toHaveValue("أحمد رسول وأحمد");
  });

  test("finds Hebrew words with or without vowel points", async ({ page }) => {
    await loadDocument(page, "שָׁלוֹם וגם שלום");
    await replaceAll(page, "שלום", "X");
    await expect(page.locator("#markdownInput")).toHaveValue("X וגם X");
  });

  test("finds text stored in decomposed form", async ({ page }) => {
    await loadDocument(page, "Perche\u0301 un cafe\u0301? \u1112\u1161\u11AB\u1100\u1173\u11AF");
    await replaceAll(page, "café", "tè");
    await expect(page.locator("#markdownInput")).toHaveValue("Perche\u0301 un tè? \u1112\u1161\u11AB\u1100\u1173\u11AF");
    await replaceAll(page, "한글", "Hangul");
    await expect(page.locator("#markdownInput")).toHaveValue("Perche\u0301 un tè? Hangul");
  });

  test("ignoring case does not shift matches after letters that grow in lowercase", async ({ page }) => {
    await loadDocument(page, "İstanbul ve İzmir, Ankara");
    await replaceAll(page, "ankara", "X");
    await expect(page.locator("#markdownInput")).toHaveValue("İstanbul ve İzmir, X");
  });

  test("finds Japanese text and text after emoji", async ({ page }) => {
    await loadDocument(page, "😀 東京と京都 😀 京都");
    await replaceAll(page, "京都", "大阪");
    await expect(page.locator("#markdownInput")).toHaveValue("😀 東京と大阪 😀 大阪");
  });

  test("search and replace fields follow the direction of the typed text", async ({ page }) => {
    await page.goto("/");
    for (const selector of ["#findReplaceSearchInput", "#findReplaceReplaceInput"]) {
      await expect(page.locator(selector)).toHaveAttribute("dir", "auto");
    }
  });
});

test.describe("caret between Markdown and visual editor", () => {
  test("keeps its place in a Chinese paragraph written on several lines", async ({ page }) => {
    const markdown = "第一行文字\n第二行文字";
    await loadDocument(page, markdown);
    const offset = markdown.indexOf("行文字", 6);
    await setTextareaCaret(page, offset);

    const before = await page.evaluate(sourceOffset => {
      focusVisualAtMarkdownOffset(sourceOffset);
      const selection = window.getSelection();
      const paragraph = document.querySelector("#visualEditor p");
      const range = document.createRange();
      range.selectNodeContents(paragraph);
      range.setEnd(selection.anchorNode, selection.anchorOffset);
      return { textBefore: range.toString(), back: getMarkdownOffsetFromVisualSelection() };
    }, offset);

    expect(before).toEqual({ textBefore: "第一行文字第二", back: offset });
  });

  test("keeps its place in an Arabic paragraph after an emoji", async ({ page }) => {
    const markdown = "😀 مرحبا **بالعالم** الجميل";
    await loadDocument(page, markdown);
    const offset = markdown.indexOf("الجميل") + 2;

    const result = await page.evaluate(sourceOffset => {
      focusVisualAtMarkdownOffset(sourceOffset);
      const selection = window.getSelection();
      const paragraph = document.querySelector("#visualEditor p");
      const range = document.createRange();
      range.selectNodeContents(paragraph);
      range.setEnd(selection.anchorNode, selection.anchorOffset);
      return { textBefore: range.toString(), back: getMarkdownOffsetFromVisualSelection() };
    }, offset);

    expect(result).toEqual({ textBefore: "😀 مرحبا بالعالم ال", back: offset });
  });
});

test.describe("export and print", () => {
  test("RTF export marks Arabic and Hebrew paragraphs as right to left", async ({ page }) => {
    await loadDocument(page, "# عنوان\n\nمرحبا بالعالم\n\nHello world\n\n- שלום\n\n中文😀");

    const rtf = await page.evaluate(() => buildRtfDocumentFromPreview(document.getElementById("preview")));
    const paragraphs = rtf.split("\\par\n").filter(part => part.includes("\\pard"));

    expect(paragraphs.filter(part => part.includes("\\rtlpar"))).toHaveLength(3);
    expect(paragraphs.find(part => part.includes("Hello world"))).not.toContain("\\rtlpar");
    expect(rtf).toContain("\\u20013\\u25991\\u-10179\\u-8704");
  });

  test("print keeps the document language and direction", async ({ page }) => {
    await loadDocument(page, "---\nlang: he\ndir: rtl\n---\n\nשלום עולם");

    const printHtml = await page.evaluate(() => {
      let capturedHtml = "";
      window.open = () => ({
        focus() {},
        print() {},
        document: { open() {}, write(html) { capturedHtml = html; }, close() {} }
      });
      printRenderedDocument();
      return capturedHtml;
    });

    expect(printHtml).toContain('<html lang="he" dir="rtl">');
    expect(printHtml).toContain("border-inline-start");
    expect(printHtml).not.toContain("border-left");
  });
});
