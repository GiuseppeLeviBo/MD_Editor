const CACHE_NAME = "md-editor-shell-v0.61.1";
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

self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    const cacheNames = await caches.keys();
    await Promise.all(
      cacheNames
        .filter(name => name !== CACHE_NAME)
        .map(name => caches.delete(name))
    );
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") {
    return;
  }

  event.respondWith((async () => {
    const requestUrl = new URL(event.request.url);
    const isAppShellRequest =
      event.request.mode === "navigate" ||
      requestUrl.pathname.endsWith("/MD_Editor/") ||
      requestUrl.pathname.endsWith("/index.html") ||
      requestUrl.pathname.endsWith("/manifest.json");

    if (isAppShellRequest) {
      try {
        const freshResponse = await fetch(event.request, { cache: "no-store" });
        if (freshResponse && freshResponse.ok && requestUrl.origin === self.location.origin) {
          const cache = await caches.open(CACHE_NAME);
          cache.put(event.request, freshResponse.clone());
        }
        return freshResponse;
      } catch {
        const fallback = await caches.match(event.request) || await caches.match("./index.html");
        if (fallback) {
          return fallback;
        }
      }
    }

    const cached = await caches.match(event.request);
    if (cached) {
      return cached;
    }

    try {
      const response = await fetch(event.request);
      if (response && response.ok && event.request.url.startsWith(self.location.origin)) {
        const cache = await caches.open(CACHE_NAME);
        cache.put(event.request, response.clone());
      }
      return response;
    } catch {
      const fallback = await caches.match("./index.html");
      if (event.request.mode === "navigate" && fallback) {
        return fallback;
      }
      throw new Error("Network request failed and no cache entry was found.");
    }
  })());
});
