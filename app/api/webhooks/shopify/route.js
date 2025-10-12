import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { supabaseAdmin } from "@/supabase/supabaseAdmin";

const SHOPIFY_DOMAIN = process.env.SHOPIFY_STORE_DOMAIN;
const SHOPIFY_ACCESS_TOKEN = process.env.SHOPIFY_ACCESS_TOKEN;
const SHOPIFY_WEBHOOK_SECRET = process.env.SHOPIFY_WEBHOOK_SECRET;
const ALERT_TOPIC_PREFIX = process.env.ALERT_TOPIC_PREFIX || "streamwear-alerts";

async function verifyShopifyHmac(request) {
  const rawBody = await request.text();
  const hmacHeader = request.headers.get("x-shopify-hmac-sha256");
  if (!hmacHeader || !SHOPIFY_WEBHOOK_SECRET) return { ok: false };
  const digest = crypto
    .createHmac("sha256", SHOPIFY_WEBHOOK_SECRET)
    .update(rawBody, "utf8")
    .digest("base64");
  const ok = crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(hmacHeader));
  return { ok, rawBody };
}

async function fetchCollectionsForProduct(productId) {
  // REST: /admin/api/2023-10/collects.json?product_id=ID → collection_ids → /collections.json?id=...
  const base = `https://${SHOPIFY_DOMAIN}/admin/api/2023-10`;
  const headers = {
    "X-Shopify-Access-Token": SHOPIFY_ACCESS_TOKEN,
    "Content-Type": "application/json",
  };
  const collectsRes = await fetch(`${base}/collects.json?product_id=${productId}`, {
    headers,
    cache: "no-store",
  });
  if (!collectsRes.ok) return [];
  const { collects } = await collectsRes.json();
  const collectionIds = collects?.map((c) => c.collection_id) || [];
  if (collectionIds.length === 0) return [];
  const idsParam = collectionIds.map((id) => `ids[]=${id}`).join("&");
  const colsRes = await fetch(`${base}/custom_collections.json?${idsParam}`, { headers, cache: "no-store" });
  if (!colsRes.ok) return [];
  const { custom_collections } = await colsRes.json();
  return (custom_collections || []).map((c) => ({ id: c.id, handle: c.handle, title: c.title }));
}

async function broadcastAlert({ uuid, payload }) {
  const channel = supabaseAdmin.channel(`${ALERT_TOPIC_PREFIX}:${uuid}`);
  try {
    await channel.subscribe((status) => status);
    await channel.send({ type: "broadcast", event: "alert", payload });
  } finally {
    await channel.unsubscribe();
  }
}

export async function POST(request) {
  // Verify HMAC
  const { ok, rawBody } = await verifyShopifyHmac(request);
  if (!ok) return NextResponse.json({ error: "invalid signature" }, { status: 401 });

  let order;
  try {
    order = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "bad payload" }, { status: 400 });
  }

  // Extract product ids (line_items)
  const productIds = Array.from(
    new Set((order?.line_items || []).map((li) => li.product_id).filter(Boolean))
  );

  // Collect all collection handles for all products
  const handleSet = new Set();
  for (const pid of productIds) {
    const cols = await fetchCollectionsForProduct(pid);
    cols.forEach((c) => handleSet.add(c.handle));
  }
  const handles = Array.from(handleSet);

  if (handles.length === 0) {
    return NextResponse.json({ ok: true, message: "no collections mapped" });
  }

  // Map collection_handle → streamer uuid
  const { data: streamers, error } = await supabaseAdmin
    .from("shopify_connectors")
    .select("uuid, collection_handle")
    .in("collection_handle", handles);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Prepare a minimal alert payload
  const firstLine = order?.line_items?.[0];
  const payload = {
    type: "order",
    customer: order?.customer?.first_name || "",
    product_title: firstLine?.title,
    variant_title: firstLine?.variant_title,
    quantity: firstLine?.quantity,
    price: firstLine?.price,
    currency: order?.currency,
    created_at: order?.created_at,
    id: order?.id,
  };

  // Broadcast for each streamer uuid
  await Promise.all(
    (streamers || []).map((s) => broadcastAlert({ uuid: s.uuid, payload }))
  );

  return NextResponse.json({ ok: true });
}


