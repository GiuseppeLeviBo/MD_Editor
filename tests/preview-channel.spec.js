const { test, expect } = require("@playwright/test");

// GitHub Pages also publishes the development branch as a preview in /dev/
// (.github/scripts/build-pages-site.sh). The preview shares the origin with
// the published app, so it must keep its preferences, drafts and memory apart.
// These tests serve the app in /dev/ with the same preview marker.
test.use({ serviceWorkers: "block" });

const PRODUCTION_MARKER = '<meta name="md-editor-channel" content="production">';
const PREVIEW_MARKER = '<meta name="md-editor-channel" content="preview" data-commit="abc1234" data-branch="claude/test">';

async function servePreviewCopy(context) {
  await context.route(/\/dev\//, async route => {
    const url = new URL(route.request().url());
    let path = url.pathname.replace(/^\/dev\//, "/");
    if (path === "/") {
      path = "/index.html";
    }
    const response = await route.fetch({ url: url.origin + path + url.search });
    if (path !== "/index.html") {
      await route.fulfill({ response });
      return;
    }
    const page = await response.text();
    expect(page).toContain(PRODUCTION_MARKER);
    await route.fulfill({ response, body: page.replace(PRODUCTION_MARKER, PREVIEW_MARKER) });
  });
}

async function databaseNames(page) {
  return page.evaluate(async () => (await indexedDB.databases()).map(database => database.name).sort());
}

async function storageKeys(page) {
  return page.evaluate(() => Object.keys(localStorage).sort());
}

async function enableMemory(page) {
  await page.locator("#rememberToggleButton").click();
  await expect(page.locator("#rememberToggleButton")).toHaveAttribute("aria-pressed", "true");
}

test.describe("preview copy in /dev/", () => {
  test.beforeEach(async ({ context }) => {
    await servePreviewCopy(context);
    context.on("page", page => page.on("dialog", dialog => dialog.accept()));
  });

  test("shows that it is a preview", async ({ context }) => {
    const preview = await context.newPage();
    await preview.goto("/dev/");

    await expect(preview.locator("#buildBadge")).toHaveText(/^v\d+\.\d+\.\d+ · preview · abc1234$/);
    await expect(preview.locator("#buildBadge")).toHaveClass(/is-preview/);
    await expect(preview).toHaveTitle(/ - MD Editor \(preview\)$/);

    const production = await context.newPage();
    await production.goto("/");
    await expect(production.locator("#buildBadge")).toHaveText(/^v\d+\.\d+\.\d+$/);
    await expect(production).toHaveTitle(/ - MD Editor$/);
  });

  test("keeps its own preferences and device memory", async ({ context }) => {
    const production = await context.newPage();
    await production.goto("/");
    await production.locator("#languageSelect").selectOption("it");

    const preview = await context.newPage();
    await preview.goto("/dev/");
    await expect(preview.locator("#languageSelect")).toHaveValue("en");
    await enableMemory(preview);
    await expect.poll(() => databaseNames(preview)).toContain("md-editor-memory-preview");

    expect(await storageKeys(preview)).toContain("wysiwyg_markdown_editor_preview_remember_documents");
    expect(await storageKeys(preview)).not.toContain("wysiwyg_markdown_editor_remember_documents");
    expect(await databaseNames(preview)).not.toContain("md-editor-memory");

    await production.reload();
    await expect(production.locator("#languageSelect")).toHaveValue("it");
    await expect(production.locator("#rememberToggleButton")).toHaveAttribute("aria-pressed", "false");
    await expect(production.locator("#recentDocumentsButton")).toBeHidden();
  });

  test("does not pick up the published app's draft in the same tab", async ({ page }) => {
    await page.goto("/");
    await page.locator("#markdownInput").fill("# Production draft");
    await expect.poll(() => page.evaluate(() => sessionStorage.getItem("wysiwyg_markdown_editor_session_draft_markdown")))
      .toBe("# Production draft");

    await page.goto("/dev/");
    await expect(page.locator("#markdownInput")).toHaveValue(/Markdown WYSIWYG Editor/);

    await page.goto("/");
    await expect(page.locator("#markdownInput")).toHaveValue("# Production draft");
  });

  test("Clear local data in the preview leaves the published app's data alone", async ({ context }) => {
    const production = await context.newPage();
    await production.goto("/");
    await production.locator("#languageSelect").selectOption("it");
    await enableMemory(production);
    await expect.poll(() => databaseNames(production)).toContain("md-editor-memory");

    const preview = await context.newPage();
    await preview.goto("/dev/");
    await enableMemory(preview);
    await expect.poll(() => databaseNames(preview)).toContain("md-editor-memory-preview");
    await preview.locator("#resetPrivacyButton").click();

    await expect.poll(() => databaseNames(preview)).not.toContain("md-editor-memory-preview");
    await expect(preview.locator("#rememberToggleButton")).toHaveAttribute("aria-pressed", "false");
    expect(await databaseNames(preview)).toContain("md-editor-memory");
    const keys = await storageKeys(preview);
    expect(keys).not.toContain("wysiwyg_markdown_editor_preview_remember_documents");
    expect(keys).toContain("wysiwyg_markdown_editor_remember_documents");

    await production.reload();
    await expect(production.locator("#languageSelect")).toHaveValue("it");
    await expect(production.locator("#rememberToggleButton")).toHaveAttribute("aria-pressed", "true");
  });

  test("Clear local data in the published app also removes the preview's data", async ({ context }) => {
    const preview = await context.newPage();
    await preview.goto("/dev/");
    await preview.locator("#languageSelect").selectOption("it");
    await enableMemory(preview);
    await expect.poll(() => databaseNames(preview)).toContain("md-editor-memory-preview");
    await preview.close();

    const production = await context.newPage();
    await production.goto("/");
    await production.locator("#resetPrivacyButton").click();

    await expect.poll(() => databaseNames(production)).not.toContain("md-editor-memory-preview");
    expect((await storageKeys(production)).filter(key => key.startsWith("wysiwyg_markdown_editor_preview_"))).toEqual([]);
  });
});
