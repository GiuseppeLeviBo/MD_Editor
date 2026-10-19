const { test, expect } = require("@playwright/test");

// The published app and the preview in /dev/ share one origin, and with it the
// Cache Storage. Each service worker must read and delete only the caches of
// its own scope. The app is served from "/", so its scope here is "/".
async function seedCache(page, name, entries) {
  await page.evaluate(async ({ cacheName, cacheEntries }) => {
    const cache = await caches.open(cacheName);
    for (const [path, body] of cacheEntries) {
      await cache.put(path, new Response(body));
    }
  }, { cacheName: name, cacheEntries: entries });
}

async function waitForServiceWorker(page) {
  await page.evaluate(() => navigator.serviceWorker.ready);
  if (!(await page.evaluate(() => Boolean(navigator.serviceWorker.controller)))) {
    await page.reload();
    await page.evaluate(() => navigator.serviceWorker.ready);
  }
}

test("a new service worker deletes only the old caches of its own copy", async ({ page }) => {
  await page.goto("/");
  await waitForServiceWorker(page);
  const currentCaches = await page.evaluate(() => caches.keys());
  expect(currentCaches).toEqual([expect.stringMatching(/^md-editor-shell-v\d+\.\d+\.\d+@\/$/)]);

  await seedCache(page, "md-editor-shell-v0.0.1@/", [["/index.html", "older version of this copy"]]);
  await seedCache(page, "md-editor-shell-v0.66.1", [["/index.html", "named before v0.66.2"], ["/dev/index.html", "x"]]);
  await seedCache(page, "md-editor-shell-v0.0.1@/dev/", [["/dev/index.html", "preview copy"]]);
  await seedCache(page, "another-app", [["/index.html", "not ours"]]);

  // A different script URL installs and activates a new worker for the scope.
  await page.evaluate(() => navigator.serviceWorker.register("./sw.js?v=cache-cleanup-test"));
  await expect.poll(() => page.evaluate(async () => {
    const registration = await navigator.serviceWorker.getRegistration();
    const active = registration && registration.active;
    return active && active.scriptURL.endsWith("cache-cleanup-test") ? active.state : "";
  })).toBe("activated");

  const remaining = (await page.evaluate(() => caches.keys())).sort();
  expect(remaining).toEqual([...currentCaches, "another-app", "md-editor-shell-v0.0.1@/dev/"].sort());
});

test("the service worker never answers with another copy's cache", async ({ page }) => {
  await page.goto("/");
  await waitForServiceWorker(page);
  await seedCache(page, "md-editor-shell-v0.0.1@/dev/", [["/LICENSE", "STALE COPY FROM THE PREVIEW CACHE"]]);

  const body = await page.evaluate(() => fetch("/LICENSE").then(response => response.text()));

  expect(body).not.toContain("STALE COPY");
  expect(body).toMatch(/license/i);
});
