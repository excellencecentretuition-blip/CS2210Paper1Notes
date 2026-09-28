importScripts("chapters.js");

const CACHE = "cs-paper1-v2";
const SHELL = ["./index.html", "./chapters.js", "./manifest.webmanifest", "./icon-192.png", "./icon-512.png"];

function chapterKey(n) {
  return new URL("./c/" + n, self.registration.scope).href;
}

async function storeChapter(n, response) {
  const cache = await caches.open(CACHE);
  await cache.put(chapterKey(n), response);
}

async function refreshChapter(n) {
  const name = PAPER1_CHAPTERS[n - 1].file.replace(/^\.\.\//, "");
  const candidates = [
    new URL(name, self.registration.scope),
    new URL("../" + name, self.registration.scope)
  ];
  let last;
  for (const url of candidates) {
    const res = await fetch(url, { cache: "no-cache" });
    last = res;
    if (res.ok) {
      await storeChapter(n, res.clone());
      return res;
    }
  }
  throw new Error("chapter " + n + " " + (last ? last.status : "missing"));
}

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await cache.addAll(SHELL);
    await Promise.all(PAPER1_CHAPTERS.map(async (chapter) => {
      try { await refreshChapter(chapter.n); } catch (e) {}
    }));
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  const chapter = url.pathname.match(/\/c\/([1-6])$/);
  if (chapter) {
    const n = Number(chapter[1]);
    event.waitUntil(refreshChapter(n).catch(() => {}));
    event.respondWith((async () => {
      const cache = await caches.open(CACHE);
      const cached = await cache.match(chapterKey(n));
      if (cached) return cached;
      try { return await refreshChapter(n); } catch (e) {
        return new Response("<!doctype html><title>Offline</title><p style=\"font-family:Segoe UI,sans-serif;padding:24px\">This chapter is not on this device yet. Open Paper 1 while online once, then try again.</p>", {
          status: 503,
          headers: { "Content-Type": "text/html; charset=utf-8" }
        });
      }
    })());
    return;
  }

  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    if (event.request.mode === "navigate") {
      try {
        const fresh = await fetch(event.request);
        if (fresh.ok) cache.put(event.request, fresh.clone());
        return fresh;
      } catch (e) {
        return (await cache.match(event.request)) || (await cache.match("./index.html"));
      }
    }
    const cached = await cache.match(event.request);
    if (cached) return cached;
    const fresh = await fetch(event.request);
    if (fresh.ok) cache.put(event.request, fresh.clone());
    return fresh;
  })());
});
