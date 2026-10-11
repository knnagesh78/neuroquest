/* Never cache notes, account pages, credentials, generation requests or Firebase responses.
 * Private GLB buffers are bounded, scoped to a signed-in client and removed on sign-out. */
const CACHE = "neuroquest-offline-v4";
const MODEL_PREFIX = "neuroquest-models-v1-";
const assetUsers = new Map();
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.add("/offline.html")),
  );
});
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter(
              (key) => key.startsWith("neuroquest-offline-") && key !== CACHE,
            )
            .map((key) => caches.delete(key)),
        ),
      ),
  );
  event.waitUntil(self.clients?.claim?.() || Promise.resolve());
});
self.addEventListener("message", (event) => {
  if (event.data?.type !== "NEUROQUEST_ASSET_SESSION" || !event.source?.id)
    return;
  const uid =
    typeof event.data.uid === "string" &&
    /^[a-zA-Z0-9_-]{1,128}$/.test(event.data.uid)
      ? event.data.uid
      : null;
  assetUsers.set(event.source.id, uid);
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter(
              (key) =>
                key.startsWith("neuroquest-models-") &&
                (!uid || key !== MODEL_PREFIX + uid),
            )
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => event.ports?.[0]?.postMessage({ ready: true })),
  );
});

function tokenOwner(request) {
  try {
    const token = request.headers
      .get("authorization")
      ?.match(/^Bearer (\S+)$/)?.[1];
    const payload = JSON.parse(
      atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")),
    );
    return payload.exp * 1000 > Date.now()
      ? payload.user_id || payload.sub
      : null;
  } catch {
    return null;
  }
}

async function modelResponse(event, url, uid) {
  // Strip request credentials and response Vary before storage. URL includes UID and job ID.
  const key = new Request(url.href, { method: "GET" });
  let cache;
  try {
    cache = await caches.open(MODEL_PREFIX + uid);
    const cached = await cache.match(key);
    if (cached && assetUsers.get(event.clientId) === uid) return cached;
  } catch {
    /* Cache access can be unavailable in private browsing. */
  }
  const response = await fetch(event.request);
  if (
    cache &&
    response.ok &&
    response.headers.get("X-NeuroQuest-Owner") === uid &&
    assetUsers.get(event.clientId) === uid
  ) {
    const headers = new Headers(response.headers);
    headers.delete("Vary");
    const saved = new Response(response.clone().body, {
      status: response.status,
      headers,
    });
    try {
      await cache.put(key, saved);
      if (assetUsers.get(event.clientId) !== uid) {
        await caches.delete(MODEL_PREFIX + uid);
        return response;
      }
      const keys = await cache.keys();
      await Promise.all(
        keys
          .slice(0, Math.max(0, keys.length - 8))
          .map((old) => cache.delete(old)),
      );
    } catch {
      /* Storage pressure must not prevent the current model from loading. */
    }
  }
  return response;
}
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  const asset =
    /^\/api\/anchors\/assets\/([a-zA-Z0-9_-]{1,128})\/[a-f0-9-]{36}\/model\.glb$/i.exec(
      url.pathname,
    );
  const uid = assetUsers.get(event.clientId);
  if (
    event.request.method === "GET" &&
    url.origin === self.location.origin &&
    asset &&
    uid === asset[1] &&
    tokenOwner(event.request) === uid
  ) {
    event.respondWith(modelResponse(event, url, uid));
    return;
  }
  if (
    event.request.method !== "GET" ||
    event.request.mode !== "navigate" ||
    url.origin !== self.location.origin
  )
    return;
  event.respondWith(
    fetch(event.request).catch(
      async () => (await caches.match("/offline.html")) || Response.error(),
    ),
  );
});
