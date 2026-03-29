const SHOPIFY_DOMAIN = process.env.SHOPIFY_STORE_DOMAIN;
const SHOPIFY_ACCESS_TOKEN = process.env.SHOPIFY_ACCESS_TOKEN;

export async function fetchCollectionsForProduct(productId, { dbg } = {}) {
  const pid = productId != null ? String(productId) : "";
  if (!pid) return [];
  const base = `https://${SHOPIFY_DOMAIN}/admin/api/2023-10`;
  const headers = {
    "X-Shopify-Access-Token": SHOPIFY_ACCESS_TOKEN,
    "Content-Type": "application/json",
  };

  const allCollections = [];

  // 1) Custom Collections via /collects + /custom_collections
  try {
    dbg?.("fetch:collects:start", { productId: pid });
    const collectsRes = await fetch(
      `${base}/collects.json?product_id=${encodeURIComponent(pid)}`,
      { headers, cache: "no-store" },
    );
    dbg?.("fetch:collects:status", { ok: collectsRes.ok, status: collectsRes.status });

    if (collectsRes.status === 429) {
      dbg?.("fetch:collects:rate_limited", {
        productId: pid,
        retryAfter: collectsRes.headers.get("retry-after"),
      });
      return [];
    }

    if (collectsRes.ok) {
      const { collects } = await collectsRes.json();
      const collectionIds = collects?.map((c) => c.collection_id) || [];
      dbg?.("fetch:collects:ids", {
        count: collectionIds.length,
        sample: collectionIds.slice(0, 5),
      });

      if (collectionIds.length > 0) {
        const idsParam = collectionIds.join(",");
        const colsRes = await fetch(`${base}/custom_collections.json?ids=${idsParam}`, {
          headers,
          cache: "no-store",
        });
        dbg?.("fetch:collections:status", { ok: colsRes.ok, status: colsRes.status });

        if (colsRes.status === 429) {
          dbg?.("fetch:collections:rate_limited", {
            productId: pid,
            retryAfter: colsRes.headers.get("retry-after"),
          });
          return [];
        }

        if (colsRes.ok) {
          const { custom_collections } = await colsRes.json();
          const mapped = (custom_collections || []).map((c) => ({
            id: c.id,
            handle: c.handle,
            title: c.title,
            type: "custom",
          }));
          dbg?.("fetch:collections:result", {
            count: mapped.length,
            sample: mapped.slice(0, 3),
          });
          allCollections.push(...mapped);
        }
      }
    }
  } catch (err) {
    dbg?.("fetch:collects:error", { productId: pid, error: String(err) });
  }

  // 2) Smart Collections via ?product_id=...
  try {
    dbg?.("fetch:smart:start", { productId: pid });
    const smartRes = await fetch(`${base}/smart_collections.json?product_id=${encodeURIComponent(pid)}`, {
      headers,
      cache: "no-store",
    });
    dbg?.("fetch:smart:status", { ok: smartRes.ok, status: smartRes.status });

    if (smartRes.status === 429) {
      dbg?.("fetch:smart:rate_limited", {
        productId: pid,
        retryAfter: smartRes.headers.get("retry-after"),
      });
      return [];
    }

    if (smartRes.ok) {
      const { smart_collections } = await smartRes.json();
      const mappedSmart = (smart_collections || []).map((c) => ({
        id: c.id,
        handle: c.handle,
        title: c.title,
        type: "smart",
      }));
      dbg?.("fetch:smart:result", { count: mappedSmart.length, sample: mappedSmart.slice(0, 3) });
      allCollections.push(...mappedSmart);
    }
  } catch (err) {
    dbg?.("fetch:smart:error", { productId: pid, error: String(err) });
  }

  // 3) Deduplicate by handle
  const byHandle = new Map();
  for (const col of allCollections) {
    if (!col?.handle) continue;
    if (!byHandle.has(col.handle)) byHandle.set(col.handle, col);
  }

  const result = Array.from(byHandle.values());
  dbg?.("fetch:collections:combined", {
    productId: pid,
    count: result.length,
    sample: result.slice(0, 5),
  });

  return result;
}

