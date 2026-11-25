const V = "qm-v11";
const ASSETS = ["./", "index.html", "style.css", "app.js", "firebase-config.js", "manifest.json", "icon-192.png", "icon-512.png", "icon-maskable-512.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(V).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== V).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener("fetch", e => {
  const r = e.request;
  if (r.method !== "GET") return;
  const u = new URL(r.url);
  const ok = u.origin === location.origin || ["www.gstatic.com", "fonts.googleapis.com", "fonts.gstatic.com"].includes(u.hostname);
  if (!ok) return;
  e.respondWith(caches.open(V).then(async c => {
    const hit = await c.match(r);
    const net = fetch(r).then(res => {
      if (res.ok || res.type === "opaque") c.put(r, res.clone());
      return res;
    }).catch(() => hit);
    return hit || net;
  }));
});

self.addEventListener("notificationclick", e => {
  e.notification.close();
  const hash = e.notification.data?.hash || "";
  e.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(cs => {
    const c = cs[0];
    if (c) { c.postMessage({ hash }); return c.focus(); }
    return self.clients.openWindow("index.html" + hash);
  }));
});
