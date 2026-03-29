import { supabaseAdmin } from "@/supabase/supabaseAdmin";
import { getCollectionsForProductCached } from "@/lib/shopify-webhook/collectionsResolver";
import { getPublicTableColumns } from "@/lib/shopify-webhook/persist/dbColumnsCache";

function uniq(arr) {
  return Array.from(new Set(arr.filter(Boolean)));
}

export async function resolveLineItemProfiles(order, { dbg, requestCache } = {}) {
  const lineItems = Array.isArray(order?.line_items) ? order.line_items : [];
  const productIds = uniq(
    lineItems.map((li) => (li?.product_id != null ? String(li.product_id) : null)),
  );

  dbg?.("products:ids", { count: productIds.length, sample: productIds.slice(0, 5) });

  const handleSet = new Set();
  const productCollections = new Map(); // productId -> [collections]

  for (const pid of productIds) {
    const cols = await getCollectionsForProductCached(pid, { dbg, requestCache });
    productCollections.set(pid, cols);
    for (const c of cols || []) {
      if (c?.handle) handleSet.add(c.handle);
    }
  }

  const handles = Array.from(handleSet);
  dbg?.("handles:collected", { count: handles.length, sample: handles.slice(0, 5) });

  if (handles.length === 0) {
    return {
      streamers: [],
      productCollections,
      itemResolution: new Map(),
      review: {
        needs_review_multiple_streamers: false,
        needs_review: false,
      },
    };
  }

  const profileCols = await getPublicTableColumns("profiles");
  const selectFields = [
    "uuid",
    "user_id",
    "collection_handle",
    "display_name",
    "twitch_username",
    profileCols?.has?.("commission_rate") ? "commission_rate" : null,
  ]
    .filter(Boolean)
    .join(",");

  dbg?.("supabase:query", { table: "profiles", handlesCount: handles.length });
  const { data: streamers, error } = await supabaseAdmin
    .from("profiles")
    .select(selectFields)
    .in("collection_handle", handles);

  dbg?.("supabase:result", {
    error: error?.message,
    count: streamers?.length || 0,
    sample: (streamers || []).slice(0, 3),
  });

  if (error) {
    throw new Error(error.message);
  }

  const streamersArr = streamers || [];
  const byHandle = new Map();
  for (const s of streamersArr) {
    if (!s?.collection_handle) continue;
    if (!byHandle.has(s.collection_handle)) byHandle.set(s.collection_handle, s);
  }

  const itemResolution = new Map(); // line_item_id -> { connector, needs_review, matches }
  let needsReview = false;
  let needsReviewMultiple = false;

  for (const li of lineItems) {
    const lineItemId = li?.id != null ? String(li.id) : null;
    const productId = li?.product_id != null ? String(li.product_id) : null;
    if (!lineItemId || !productId) continue;

    const colsForProduct = productCollections.get(productId) || [];
    const productHandles = uniq(colsForProduct.map((c) => c?.handle));
    const matches = productHandles
      .map((h) => byHandle.get(h))
      .filter(Boolean);

    const uniqueMatches = uniq(matches.map((m) => m?.uuid)).map((uuid) =>
      matches.find((m) => m.uuid === uuid),
    );

    if (uniqueMatches.length === 1) {
      const connector = uniqueMatches[0];
      itemResolution.set(lineItemId, {
        connector,
        shopify_connector_id: connector.uuid,
        needs_review: false,
        needs_review_multiple_streamers: false,
        matches: uniqueMatches,
      });
    } else if (uniqueMatches.length > 1) {
      needsReview = true;
      needsReviewMultiple = true;
      itemResolution.set(lineItemId, {
        connector: null,
        shopify_connector_id: null,
        needs_review: true,
        needs_review_multiple_streamers: true,
        matches: uniqueMatches,
      });
    } else {
      needsReview = true;
      itemResolution.set(lineItemId, {
        connector: null,
        shopify_connector_id: null,
        needs_review: true,
        needs_review_multiple_streamers: false,
        matches: [],
      });
    }
  }

  return {
    streamers: streamersArr,
    productCollections,
    itemResolution,
    review: {
      needs_review_multiple_streamers: needsReviewMultiple,
      needs_review: needsReview,
    },
  };
}

