import { fetchCollectionsForProduct } from "@/lib/shopify-webhook/shopifyAdminCollections";

const TTL_MS = 5 * 60 * 1000;
const globalCache = new Map(); // productId -> { expiresAt, value }
const inflight = new Map(); // productId -> Promise

function now() {
  return Date.now();
}

export async function getCollectionsForProductCached(productId, { dbg, requestCache } = {}) {
  const pid = productId != null ? String(productId) : "";
  if (!pid) return [];

  // 1) Per-request cache
  if (requestCache && requestCache.has(pid)) {
    return requestCache.get(pid);
  }

  // 2) Process cache (TTL)
  const entry = globalCache.get(pid);
  if (entry && entry.expiresAt > now()) {
    requestCache?.set?.(pid, entry.value);
    return entry.value;
  }

  // 3) Inflight dedupe
  if (inflight.has(pid)) {
    const p = inflight.get(pid);
    const v = await p;
    requestCache?.set?.(pid, v);
    return v;
  }

  const p = (async () => {
    const value = await fetchCollectionsForProduct(pid, { dbg });
    globalCache.set(pid, { expiresAt: now() + TTL_MS, value });
    return value;
  })()
    .catch((err) => {
      dbg?.("collections:cached:error", { productId: pid, err: String(err) });
      return [];
    })
    .finally(() => {
      inflight.delete(pid);
    });

  inflight.set(pid, p);
  const value = await p;
  requestCache?.set?.(pid, value);
  return value;
}

