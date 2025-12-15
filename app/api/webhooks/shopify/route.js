import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { supabaseAdmin } from "@/supabase/supabaseAdmin";
import { getUserEmailFromAuth, sendGiveawayOrderEmail } from "@/lib/email";

const SHOPIFY_DOMAIN = process.env.SHOPIFY_STORE_DOMAIN;
const SHOPIFY_ACCESS_TOKEN = process.env.SHOPIFY_ACCESS_TOKEN;
const SHOPIFY_WEBHOOK_SECRET = process.env.SHOPIFY_WEBHOOK_SECRET;
const ALERT_TOPIC_PREFIX =
  process.env.ALERT_TOPIC_PREFIX || "streamwear-alerts";
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
    dbg("verify:missing", {
      hasHeader: !!hmacHeader,
      hasSecret: !!SHOPIFY_WEBHOOK_SECRET,
      raw_len: rawBody?.length || 0,
    });
    return { ok: false, rawBody };
  }
  const digest = crypto
    .createHmac("sha256", SHOPIFY_WEBHOOK_SECRET)
    .update(rawBody, "utf8")
    .digest("base64");
  const ok = crypto.timingSafeEqual(
    Buffer.from(digest),
    Buffer.from(hmacHeader)
  );
  dbg("verify:result", {
    ok,
    header_fp: hmacHeader?.slice(-8),
    digest_fp: digest?.slice(-8),
    raw_len: rawBody?.length || 0,
  });
  return { ok, rawBody };
}

async function fetchCollectionsForProduct(productId) {
  const base = `https://${SHOPIFY_DOMAIN}/admin/api/2023-10`;
  const headers = {
    "X-Shopify-Access-Token": SHOPIFY_ACCESS_TOKEN,
    "Content-Type": "application/json",
  };

  const allCollections = [];

  //
  // 1) Custom Collections über /collects + /custom_collections
  //
  try {
    dbg("fetch:collects:start", { productId });
    const collectsRes = await fetch(
      `${base}/collects.json?product_id=${productId}`,
      {
        headers,
        cache: "no-store",
      }
    );
    dbg("fetch:collects:status", {
      ok: collectsRes.ok,
      status: collectsRes.status,
    });

    if (collectsRes.ok) {
      const collectsJson = await collectsRes.json();
      const { collects } = collectsJson;
      const collectionIds = collects?.map((c) => c.collection_id) || [];
      dbg("fetch:collects:ids", {
        count: collectionIds.length,
        sample: collectionIds.slice(0, 5),
      });

      if (collectionIds.length > 0) {
        const idsParam = collectionIds.join(",");
        const colsRes = await fetch(
          `${base}/custom_collections.json?ids=${idsParam}`,
          { headers, cache: "no-store" }
        );
        dbg("fetch:collections:status", {
          ok: colsRes.ok,
          status: colsRes.status,
        });

        if (colsRes.ok) {
          const { custom_collections } = await colsRes.json();
          const mapped = (custom_collections || []).map((c) => ({
            id: c.id,
            handle: c.handle,
            title: c.title,
            type: "custom",
          }));
          dbg("fetch:collections:result", {
            count: mapped.length,
            sample: mapped.slice(0, 3),
          });
          allCollections.push(...mapped);
        }
      }
    }
  } catch (err) {
    dbg("fetch:collects:error", { productId, error: String(err) });
  }

  //
  // 2) Smart Collections direkt mit ?product_id=...
  //
  try {
    dbg("fetch:smart:start", { productId });
    const smartRes = await fetch(
      `${base}/smart_collections.json?product_id=${productId}`,
      {
        headers,
        cache: "no-store",
      }
    );
    dbg("fetch:smart:status", {
      ok: smartRes.ok,
      status: smartRes.status,
    });

    if (smartRes.ok) {
      const smartJson = await smartRes.json();
      const { smart_collections } = smartJson;
      const mappedSmart = (smart_collections || []).map((c) => ({
        id: c.id,
        handle: c.handle,
        title: c.title,
        type: "smart",
      }));
      dbg("fetch:smart:result", {
        count: mappedSmart.length,
        sample: mappedSmart.slice(0, 3),
      });
      allCollections.push(...mappedSmart);
    }
  } catch (err) {
    dbg("fetch:smart:error", { productId, error: String(err) });
  }

  //
  // 3) Deduplizieren (z. B. nach handle)
  //
  const byHandle = new Map();
  for (const col of allCollections) {
    if (!col.handle) continue;
    // Falls es doppelte Handles gibt (custom + smart), gewinnt die erste – reicht hier völlig
    if (!byHandle.has(col.handle)) {
      byHandle.set(col.handle, col);
    }
  }

  const result = Array.from(byHandle.values());
  dbg("fetch:collections:combined", {
    productId,
    count: result.length,
    sample: result.slice(0, 5),
  });

  return result;
}

async function broadcastAlert({ uuid, payload }) {
  const channelName = `${ALERT_TOPIC_PREFIX}:${uuid}`;
  const channel = supabaseAdmin.channel(channelName);
  try {
    dbg("broadcast:subscribe", { channel: channelName });
    const sub = await channel.subscribe((status) => status);
    dbg("broadcast:subscribed", {
      channel: channelName,
      status: sub?.status ?? "ok",
    });
    dbg("broadcast:send", {
      channel: channelName,
      payloadPreview: JSON.stringify(payload).slice(0, 200),
    });
    const sent = await channel.send({
      type: "broadcast",
      event: "alert",
      payload,
    });
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
      rawSample:
        typeof rawBody === "string" ? rawBody.slice(0, 400) : undefined,
    });
  }
  if (!ok)
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });

  let order;
  try {
    order = JSON.parse(rawBody);
    dbg("json:parsed", {
      line_items: order?.line_items?.length || 0,
      currency: order?.currency,
      id: order?.id,
    });
  } catch {
    return NextResponse.json({ error: "bad payload" }, { status: 400 });
  }

  // Giveaway-Flag aus note_attributes (Cart-Attribute: attributes[giveaway])
  const giveawayAttr = (order?.note_attributes || []).find(
    (attr) => attr.name === "giveaway"
  );
  const hasGiveawayAttribute = giveawayAttr?.value === "yes";

  dbg("giveaway:attribute", {
    hasGiveawayAttribute,
    note_attributes: order?.note_attributes || [],
  });

  // Extract username

  const usernameAttr = (order?.note_attributes || []).find(
    (attr) => attr.name === "username"
  );
  const username = usernameAttr?.value || "";
  dbg("username:extracted", { username });

  // Extract product ids (line_items)
  const productIds = Array.from(
    new Set(
      (order?.line_items || []).map((li) => li.product_id).filter(Boolean)
    )
  );
  dbg("products:ids", {
    count: productIds.length,
    sample: productIds.slice(0, 5),
  });

  // Collect all collection handles for all products
  // + pro Produkt die Collections cachen
  const handleSet = new Set();
  const productCollections = new Map(); // productId -> [collections]

  for (const pid of productIds) {
    const cols = await fetchCollectionsForProduct(pid);
    productCollections.set(pid, cols);
    cols.forEach((c) => handleSet.add(c.handle));
  }

  const handles = Array.from(handleSet);
  dbg("handles:collected", {
    count: handles.length,
    sample: handles.slice(0, 5),
  });

  if (handles.length === 0) {
    dbg("handles:empty", {});
    return NextResponse.json({ ok: true, message: "no collections mapped" });
  }

  // Map collection_handle → streamer uuid
  dbg("supabase:query", {
    table: "shopify_connectors",
    handlesCount: handles.length,
  });
  const { data: streamers, error } = await supabaseAdmin
    .from("shopify_connectors")
    .select("uuid, collection_handle, user_id")
    .in("collection_handle", handles);
  dbg("supabase:result", {
    error: error?.message,
    count: streamers?.length || 0,
    sample: (streamers || []).slice(0, 3),
  });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // --- GIVEAWAY: pro Line Item Giveaway-Orders anlegen (falls aktiviert) ---
  if (
    hasGiveawayAttribute &&
    Array.isArray(order?.line_items) &&
    (streamers || []).length > 0
  ) {
    dbg("giveaway:start", {
      lineItems: order.line_items.length,
      streamersCount: streamers.length,
    });

    const giveawayInserts = [];
    const buyerEmail = order?.email || null;
    const buyerName = order?.billing_address
      ? `${order.billing_address.first_name || ""} ${
          order.billing_address.last_name || ""
        }`.trim()
      : null;
    const buyerTwitchUsername = username || null;

    for (const li of order.line_items) {
      const productId = li.product_id;
      const lineItemId = li.id;
      const variantId = li.variant_id;

      if (!productId || !lineItemId) continue;

      // Collections für dieses Produkt
      const colsForProduct = productCollections.get(productId) || [];
      const productHandles = colsForProduct
        .map((c) => c.handle)
        .filter(Boolean);

      if (productHandles.length === 0) continue;

      // Streamer finden, dessen collection_handle eine dieser Collections ist
      const streamer = (streamers || []).find((s) =>
        productHandles.includes(s.collection_handle)
      );

      if (!streamer) {
        // Produkt gehört offenbar keiner Streamer-Collection → Haus-Merch → kein Giveaway
        dbg("giveaway:no_streamer_for_product", {
          productId,
          productHandles,
        });
        continue;
      }

      giveawayInserts.push({
        shopify_order_id: order.id,
        shopify_line_item_id: lineItemId,
        product_id: productId,
        variant_id: variantId,
        streamer_uuid: streamer.uuid,
        buyer_email: buyerEmail,
        buyer_name: buyerName,
        buyer_twitch_username: buyerTwitchUsername,
        quantity: li.quantity ?? 1,
        status: "open",
      });
    }

    if (giveawayInserts.length > 0) {
      dbg("giveaway:insert", {
        count: giveawayInserts.length,
        sample: giveawayInserts.slice(0, 2),
      });

      const { error: giveawayError } = await supabaseAdmin
        .from("giveaway_orders")
        .insert(giveawayInserts);

      if (giveawayError) {
        dbg("giveaway:insert:error", { error: giveawayError.message });
        // Wir brechen NICHT mit 500 ab, damit Alerts trotzdem funktionieren,
        // aber du siehst den Fehler im Log.
      } else {
        dbg("giveaway:insert:ok", { count: giveawayInserts.length });

        const firstLine = order?.line_items?.[0];
        const productTitle = firstLine?.title || "Unbekanntes Produkt";
        const mailed = new Set();

        for (const s of streamers || []) {
          const userId = s.user_id;
          const streamerName = s.display_name || s.twitch_username || "Creator";

          if (mailed.has(userId)) continue;
          mailed.add(userId);

          const email = await getUserEmailFromAuth(userId);
          if (!email) {
            console.warn("[email] No email found for user", {
              userId,
            });
            continue;
          }

          try {
            await sendGiveawayOrderEmail({
              to: email,
              streamerName,
              productTitle,
            });
            console.log("[email] sent", { to: email });
          } catch (err) {
            console.error("[email] send error", {
              to: email,
              err: String(err),
            });
          }
        }
      }
    } else {
      dbg("giveaway:insert:skip", { reason: "no applicable line_items" });
    }
  }
  // --- GIVEAWAY ENDE ---

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
    username,
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
