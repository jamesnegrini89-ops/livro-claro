// Public application files only. Gemini calls, keys and user PDFs never enter this cache.
const VERSION = "7638bb1f09f9";
const PREFIX = 'livro-claro:' + new URL(self.registration.scope).pathname + ':';
const CACHE = PREFIX + VERSION;
const FILES = ["./", "./COMECAR.html", "./CREDITOS.html", "./LICENSE.txt", "./app.js", "./core.mjs", "./data/biblia.json", "./gemini.mjs", "./icons/icon-192.png", "./icons/icon-512.png", "./icons/icon.svg", "./index.html", "./licenses/BIBLIA-LIVRE-LICENCA.md", "./licenses/PDFJS-CMAPS-LICENSE.txt", "./manifest.webmanifest", "./pdf.mjs", "./speaker.mjs", "./storage.mjs", "./styles.css", "./vendor/PDFJS-LICENSE.txt", "./vendor/cmaps.json", "./vendor/iccs/CGATS001Compat-v2-micro.icc", "./vendor/iccs/LICENSE", "./vendor/pdf.mjs", "./vendor/pdf.worker.min.mjs", "./vendor/standard_fonts/FoxitDingbats.pfb", "./vendor/standard_fonts/FoxitFixed.pfb", "./vendor/standard_fonts/FoxitFixedBold.pfb", "./vendor/standard_fonts/FoxitFixedBoldItalic.pfb", "./vendor/standard_fonts/FoxitFixedItalic.pfb", "./vendor/standard_fonts/FoxitSerif.pfb", "./vendor/standard_fonts/FoxitSerifBold.pfb", "./vendor/standard_fonts/FoxitSerifBoldItalic.pfb", "./vendor/standard_fonts/FoxitSerifItalic.pfb", "./vendor/standard_fonts/FoxitSymbol.pfb", "./vendor/standard_fonts/LICENSE_FOXIT", "./vendor/standard_fonts/LICENSE_LIBERATION", "./vendor/standard_fonts/LiberationSans-Bold.ttf", "./vendor/standard_fonts/LiberationSans-BoldItalic.ttf", "./vendor/standard_fonts/LiberationSans-Italic.ttf", "./vendor/standard_fonts/LiberationSans-Regular.ttf", "./vendor/wasm/LICENSE_JBIG2", "./vendor/wasm/LICENSE_OPENJPEG", "./vendor/wasm/LICENSE_PDFJS_JBIG2", "./vendor/wasm/LICENSE_PDFJS_OPENJPEG", "./vendor/wasm/LICENSE_PDFJS_QCMS", "./vendor/wasm/LICENSE_QCMS", "./vendor/wasm/jbig2.wasm", "./vendor/wasm/openjpeg.wasm", "./vendor/wasm/openjpeg_nowasm_fallback.js", "./vendor/wasm/qcms_bg.wasm"];
const URLS = new Set(FILES.map(p => new URL(p, self.registration.scope).href));
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll([...URLS])));
});
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    for (const name of await caches.keys()) if (name.startsWith(PREFIX) && name !== CACHE) await caches.delete(name);
    await self.clients.claim();
  })());
});
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url); url.search = ''; url.hash = '';
  if (url.origin !== self.location.origin || !URLS.has(url.href)) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const found = await cache.match(url.href);
    if (found) return found;
    const response = await fetch(event.request);
    if (response.ok) await cache.put(url.href, response.clone());
    return response;
  })());
});
