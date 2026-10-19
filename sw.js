const CACHE_PREFIX = "md-editor-shell-";
const CACHE_VERSION = "v0.66.2";
// Several copies of the app can share one origin: GitHub Pages serves the
// published app in /MD_Editor/ and a preview in /MD_Editor/dev/. Each service
// worker reads and deletes only the caches of its own scope.
const CACHE_SCOPE = self.registration.scope;
const CACHE_NAME = `${CACHE_PREFIX}${CACHE_VERSION}@${new URL(CACHE_SCOPE).pathname}`;
const APP_SHELL = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icon-192.svg",
  "./icon-512.svg",
  "./vendor/katex/katex.min.css",
  "./vendor/katex/katex.min.js",
  "./vendor/prism/prism.min.css",
  "./vendor/prism/prism.js",
  "./vendor/prism/components/prism-typescript.min.js",
  "./vendor/prism/components/prism-python.min.js",
  "./vendor/prism/components/prism-bash.min.js",
  "./vendor/prism/components/prism-json.min.js",
  "./vendor/prism/components/prism-markdown.min.js",
  "./vendor/mermaid/mermaid.min.js",
  "./vendor/markdown-it/markdown-it.min.js",
  "./vendor/markdown-it/markdown-it-footnote.min.js",
  "./vendor/dompurify/purify.min.js",
  "./vendor/katex/fonts/KaTeX_AMS-Regular.woff2",
  "./vendor/katex/fonts/KaTeX_Caligraphic-Bold.woff2",
  "./vendor/katex/fonts/KaTeX_Caligraphic-Regular.woff2",
  "./vendor/katex/fonts/KaTeX_Fraktur-Bold.woff2",
  "./vendor/katex/fonts/KaTeX_Fraktur-Regular.woff2",
  "./vendor/katex/fonts/KaTeX_Main-Bold.woff2",
  "./vendor/katex/fonts/KaTeX_Main-BoldItalic.woff2",
  "./vendor/katex/fonts/KaTeX_Main-Italic.woff2",
  "./vendor/katex/fonts/KaTeX_Main-Regular.woff2",
  "./vendor/katex/fonts/KaTeX_Math-BoldItalic.woff2",
  "./vendor/katex/fonts/KaTeX_Math-Italic.woff2",
  "./vendor/katex/fonts/KaTeX_SansSerif-Bold.woff2",
  "./vendor/katex/fonts/KaTeX_SansSerif-Italic.woff2",
  "./vendor/katex/fonts/KaTeX_SansSerif-Regular.woff2",
  "./vendor/katex/fonts/KaTeX_Script-Regular.woff2",
  "./vendor/katex/fonts/KaTeX_Size1-Regular.woff2",
  "./vendor/katex/fonts/KaTeX_Size2-Regular.woff2",
  "./vendor/katex/fonts/KaTeX_Size3-Regular.woff2",
  "./vendor/katex/fonts/KaTeX_Size4-Regular.woff2",
  "./vendor/katex/fonts/KaTeX_Typewriter-Regular.woff2"
];

self.addEventListener("install", event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL))
  );
});

// Caches named before v0.66.2 have no scope in their name: they belong to this
// worker when every entry lies inside its scope.
async function isOwnCache(name) {
  if (name === CACHE_NAME || !name.startsWith(CACHE_PREFIX)) {
    return false;
  }
  const separator = name.indexOf("@");
  if (separator >= 0) {
    return name.slice(separator + 1) === new URL(CACHE_SCOPE).pathname;
  }
  const requests = await (await caches.open(name)).keys();
  return requests.every(request => request.url.startsWith(CACHE_SCOPE));
}

self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    const cacheNames = await caches.keys();
    await Promise.all(cacheNames.map(async name => {
      if (await isOwnCache(name)) {
        await caches.delete(name);
      }
    }));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") {
    return;
  }

  event.respondWith((async () => {
    const requestUrl = new URL(event.request.url);
    const cache = await caches.open(CACHE_NAME);
    const isAppShellRequest =
      event.request.mode === "navigate" ||
      requestUrl.origin + requestUrl.pathname === CACHE_SCOPE ||
      requestUrl.pathname.endsWith("/index.html") ||
      requestUrl.pathname.endsWith("/manifest.json");

    if (isAppShellRequest) {
      try {
        const freshResponse = await fetch(event.request, { cache: "no-store" });
        if (freshResponse && freshResponse.ok && requestUrl.origin === self.location.origin) {
          cache.put(event.request, freshResponse.clone());
        }
        return freshResponse;
      } catch {
        const fallback = await cache.match(event.request) || await cache.match("./index.html");
        if (fallback) {
          return fallback;
        }
      }
    }

    const cached = await cache.match(event.request);
    if (cached) {
      return cached;
    }

    try {
      const response = await fetch(event.request);
      if (response && response.ok && event.request.url.startsWith(self.location.origin)) {
        cache.put(event.request, response.clone());
      }
      return response;
    } catch {
      const fallback = await cache.match("./index.html");
      if (event.request.mode === "navigate" && fallback) {
        return fallback;
      }
      throw new Error("Network request failed and no cache entry was found.");
    }
  })());
});
