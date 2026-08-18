// Service worker for Ferber-timeren.
//
// Hovedpoenget er ikke hurtiglagring, men at appen kan installeres og at den
// åpner selv om nettet er borte klokka tre om natten. Derfor:
//
//   navigering  -> nett først, hurtiglager som reserve. Da kommer nye
//                  versjoner fram med en gang du er på nett, og en gammel
//                  utgave kan aldri bli hengende igjen for godt.
//   egne filer  -> hurtiglager først. Ikoner og manifest endrer seg sjelden.
//   Supabase    -> røres ikke. Synken skal aldri lese et gammelt svar.

const CACHE = "ferber-v3";

const SKALL = [
  "./",
  "./manifest.webmanifest",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-maskable-512.png",
  "./icons/apple-touch-icon.png",
  "./icons/favicon-32.png",
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE)
      .then((c) => c.addAll(SKALL))
      .then(() => self.skipWaiting())
      .catch(() => self.skipWaiting())   // ett manglende ikon skal ikke stoppe installasjonen
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((navn) => Promise.all(navn.filter((n) => n !== CACHE).map((n) => caches.delete(n))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;   // Supabase går rett på nettet

  if (req.mode === "navigate") {
    // Bare appen selv får være frakoblet-reserven. Uten dette ville et
    // besøk på en annen side under samme adresse — en prototype, for
    // eksempel — blitt lagret som det du får se når nettet er borte.
    const erAppen = url.pathname === new URL("./", self.location).pathname;
    e.respondWith(
      fetch(req)
        .then((res) => {
          if (erAppen && res.ok) {
            const kopi = res.clone();
            caches.open(CACHE).then((c) => c.put("./", kopi));
          }
          return res;
        })
        .catch(() => caches.match(erAppen ? "./" : req).then((r) => r || caches.match("./")))
    );
    return;
  }

  e.respondWith(
    caches.match(req).then((truffet) =>
      truffet ||
      fetch(req).then((res) => {
        if (res.ok) {
          const kopi = res.clone();
          caches.open(CACHE).then((c) => c.put(req, kopi));
        }
        return res;
      })
    )
  );
});
