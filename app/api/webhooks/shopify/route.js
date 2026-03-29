import { NextResponse } from "next/server";
import { createDbg } from "@/lib/shopify-webhook/logger";
import { verifyShopifyWebhook } from "@/lib/shopify-webhook/verifyShopifyWebhook";
import { routeShopifyTopic } from "@/lib/shopify-webhook/routeShopifyTopic";
import { parseShopifyJson } from "@/lib/shopify-webhook/parseShopifyJson";
import {
  logWebhookEventReceived,
  markWebhookEventProcessed,
} from "@/lib/shopify-webhook/persist/shopifyWebhookEvents";

const LOG_SHOPIFY = process.env.LOG_SHOPIFY_WEBHOOKS === "1";

export const runtime = "nodejs";

export async function POST(request) {
  const dbg = createDbg(LOG_SHOPIFY);
  dbg("request:start", { method: request.method, url: request.url });

  const { ok, rawBody } = await verifyShopifyWebhook(request, { dbg });

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

  if (!ok) {
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  }

  let order;
  try {
    order = parseShopifyJson(rawBody);
  } catch {
    return NextResponse.json({ error: "bad payload" }, { status: 400 });
  }

  const topic = request.headers.get("x-shopify-topic");
  const webhookId = request.headers.get("x-shopify-webhook-id");
  const shopDomain = request.headers.get("x-shopify-shop-domain");
  const shopifyOrderId = order?.id != null ? String(order.id) : null;

  const event = await logWebhookEventReceived({
    webhook_id: webhookId,
    topic: String(topic || ""),
    shop_domain: shopDomain,
    shopify_order_id: shopifyOrderId,
    payload: order,
    dbg,
  });

  if (event?.processed_at) {
    dbg("webhook_events:duplicate", { webhookId, topic, processed_at: event.processed_at });
    return NextResponse.json({ ok: true, duplicate: true });
  }

  const handler = routeShopifyTopic(topic);
  if (!handler) {
    dbg("topic:unknown", { topic });
    return NextResponse.json({ ok: true, ignored: true });
  }

  try {
    const result = await handler({ order, dbg, topic: String(topic || "") });
    await markWebhookEventProcessed({ webhook_id: webhookId, processing_error: null, dbg });
    dbg("request:done", { ok: true, topic });
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error("[shopify:webhook] handler error", {
      topic,
      err: String(err),
      orderId: order?.id != null ? String(order.id) : null,
    });
    await markWebhookEventProcessed({ webhook_id: webhookId, processing_error: String(err), dbg });
    return NextResponse.json({ error: "internal error" }, { status: 500 });
  }
}
