import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { supabaseAdmin } from "@/supabase/supabaseAdmin";

const SHOPIFY_DOMAIN = process.env.SHOPIFY_STORE_DOMAIN;
const SHOPIFY_ACCESS_TOKEN = process.env.SHOPIFY_ACCESS_TOKEN;
const SHOPIFY_WEBHOOK_SECRET = process.env.SHOPIFY_WEBHOOK_SECRET;
const ALERT_TOPIC_PREFIX = process.env.ALERT_TOPIC_PREFIX || "streamwear-alerts";
const LOG_SHOPIFY = process.env.LOG_SHOPIFY_WEBHOOKS === "1";

export const runtime = "nodejs";

function dbg(label, data) {
  if (!LOG_SHOPIFY) return;
  try {
    console.log("[shopify:webhook]", label, data ?? "");
  } catch {}
}

async function verifyShopifyHmac(request) {
  const rawBody = await request.text();
  const hmacHeader = request.headers.get("x-shopify-hmac-sha256");
  if (!hmacHeader || !SHOPIFY_WEBHOOK_SECRET) {
    dbg("verify:missing", { hasHeader: !!hmacHeader, hasSecret: !!SHOPIFY_WEBHOOK_SECRET, raw_len: rawBody?.length || 0 });
    return { ok: false, rawBody };
  }
  const digest = crypto
    .createHmac("sha256", SHOPIFY_WEBHOOK_SECRET)
    .update(rawBody, "utf8")
    .digest("base64");
  const ok = crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(hmacHeader));
  dbg("verify:result", {
    ok,
    header_fp: hmacHeader?.slice(-8),
    digest_fp: digest?.slice(-8),
    raw_len: rawBody?.length || 0,
  });
  return { ok, rawBody };
}

async function fetchCollectionsForProduct(productId) {
  // REST: /admin/api/2023-10/collects.json?product_id=ID → collection_ids → /collections.json?id=...
  const base = `https://${SHOPIFY_DOMAIN}/admin/api/2023-10`;
  const headers = {
    "X-Shopify-Access-Token": SHOPIFY_ACCESS_TOKEN,
    "Content-Type": "application/json",
  };
  dbg("fetch:collects:start", { productId });
  const collectsRes = await fetch(`${base}/collects.json?product_id=${productId}`, {
    headers,
    cache: "no-store",
  });
  dbg("fetch:collects:status", { ok: collectsRes.ok, status: collectsRes.status });
  if (!collectsRes.ok) return [];
  const { collects } = await collectsRes.json();
  const collectionIds = collects?.map((c) => c.collection_id) || [];
  dbg("fetch:collects:ids", { count: collectionIds.length, sample: collectionIds.slice(0, 5) });
  if (collectionIds.length === 0) return [];
  const idsParam = collectionIds.map((id) => `ids[]=${id}`).join("&");
  const colsRes = await fetch(`${base}/custom_collections.json?${idsParam}`, { headers, cache: "no-store" });
  dbg("fetch:collections:status", { ok: colsRes.ok, status: colsRes.status });
  if (!colsRes.ok) return [];
  const { custom_collections } = await colsRes.json();
  const mapped = (custom_collections || []).map((c) => ({ id: c.id, handle: c.handle, title: c.title }));
  dbg("fetch:collections:result", { count: mapped.length, sample: mapped.slice(0, 3) });
  return mapped;
}

async function broadcastAlert({ uuid, payload }) {
  const channelName = `${ALERT_TOPIC_PREFIX}:${uuid}`;
  const channel = supabaseAdmin.channel(channelName);
  try {
    dbg("broadcast:subscribe", { channel: channelName });
    const sub = await channel.subscribe((status) => status);
    dbg("broadcast:subscribed", { channel: channelName, status: sub?.status ?? "ok" });
    dbg("broadcast:send", { channel: channelName, payloadPreview: JSON.stringify(payload).slice(0, 200) });
    const sent = await channel.send({ type: "broadcast", event: "alert", payload });
    dbg("broadcast:sent", { channel: channelName, sent });
  } finally {
    const res = await channel.unsubscribe();
    dbg("broadcast:unsubscribed", { channel: channelName, res });
  }
}

export async function POST(request) {
  dbg("request:start", { method: request.method, url: request.url });
  // Verify HMAC
  const { ok, rawBody } = await verifyShopifyHmac(request);
  if (LOG_SHOPIFY) {
    const topic = request.headers.get("x-shopify-topic");
    const shop = request.headers.get("x-shopify-shop-domain");
    const hmac = request.headers.get("x-shopify-hmac-sha256");
    console.log("[shopify:webhook]", {
      topic,
      shop,
      hasHmac: Boolean(hmac),
      ok,
      rawLength: rawBody?.length || 0,
      rawSample: typeof rawBody === "string" ? rawBody.slice(0, 400) : undefined,
    });
  }
  if (!ok) return NextResponse.json({ error: "invalid signature" }, { status: 401 });

  let order;
  try {
    order = JSON.parse(rawBody);
    dbg("json:parsed", { line_items: order?.line_items?.length || 0, currency: order?.currency, id: order?.id });
  } catch {
    return NextResponse.json({ error: "bad payload" }, { status: 400 });
  }

  // Extract product ids (line_items)
  const productIds = Array.from(
    new Set((order?.line_items || []).map((li) => li.product_id).filter(Boolean))
  );
  dbg("products:ids", { count: productIds.length, sample: productIds.slice(0, 5) });

  // Collect all collection handles for all products
  const handleSet = new Set();
  for (const pid of productIds) {
    const cols = await fetchCollectionsForProduct(pid);
    cols.forEach((c) => handleSet.add(c.handle));
  }
  const handles = Array.from(handleSet);
  dbg("handles:collected", { count: handles.length, sample: handles.slice(0, 5) });

  if (handles.length === 0) {
    dbg("handles:empty", {});
    return NextResponse.json({ ok: true, message: "no collections mapped" });
  }

  // Map collection_handle → streamer uuid
  dbg("supabase:query", { table: "shopify_connectors", handlesCount: handles.length });
  const { data: streamers, error } = await supabaseAdmin
    .from("shopify_connectors")
    .select("uuid, collection_handle")
    .in("collection_handle", handles);
  dbg("supabase:result", { error: error?.message, count: streamers?.length || 0, sample: (streamers || []).slice(0, 3) });
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
  dbg("payload:prepared", payload);

  // Broadcast for each streamer uuid
  for (const s of streamers || []) {
    dbg("broadcast:start", { uuid: s.uuid, handle: s.collection_handle });
    await broadcastAlert({ uuid: s.uuid, payload });
    dbg("broadcast:done", { uuid: s.uuid });
  }

  dbg("request:done", { ok: true });
  return NextResponse.json({ ok: true });
}


