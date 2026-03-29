import { supabaseAdmin } from "@/supabase/supabaseAdmin";
import { getUserEmailFromAuth, sendGiveawayOrderEmail } from "@/lib/email";

export async function processGiveawayIfNeeded({
  order,
  username,
  hasGiveawayAttribute,
  productCollections,
  streamers,
  dbg,
}) {
  if (
    !hasGiveawayAttribute ||
    !Array.isArray(order?.line_items) ||
    (streamers || []).length === 0
  ) {
    return;
  }

  dbg?.("giveaway:start", {
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
    const productId = li.product_id != null ? String(li.product_id) : null;
    const lineItemId = li.id != null ? String(li.id) : null;
    const variantId = li.variant_id != null ? String(li.variant_id) : null;

    if (!productId || !lineItemId) continue;

    const colsForProduct = productCollections?.get?.(productId) || [];
    const productHandles = colsForProduct.map((c) => c.handle).filter(Boolean);
    if (productHandles.length === 0) continue;

    const streamer = (streamers || []).find((s) =>
      productHandles.includes(s.collection_handle),
    );

    if (!streamer) {
      dbg?.("giveaway:no_streamer_for_product", { productId, productHandles });
      continue;
    }

    giveawayInserts.push({
      shopify_order_id: order?.id != null ? String(order.id) : null,
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

  if (giveawayInserts.length === 0) {
    dbg?.("giveaway:insert:skip", { reason: "no applicable line_items" });
    return;
  }

  dbg?.("giveaway:insert", {
    count: giveawayInserts.length,
    sample: giveawayInserts.slice(0, 2),
  });

  const { error: giveawayError } = await supabaseAdmin
    .from("giveaway_orders")
    .insert(giveawayInserts);

  if (giveawayError) {
    dbg?.("giveaway:insert:error", { error: giveawayError.message });
    return;
  }

  dbg?.("giveaway:insert:ok", { count: giveawayInserts.length });

  const firstLine = order?.line_items?.[0];
  const productTitle = firstLine?.title || "Unbekanntes Produkt";
  const mailed = new Set();

  for (const s of streamers || []) {
    const userId = s.user_id;
    const streamerName = s.display_name || s.twitch_username || "Creator";

    if (!userId || mailed.has(userId)) continue;
    mailed.add(userId);

    const email = await getUserEmailFromAuth(userId);
    if (!email) {
      console.warn("[email] No email found for user", { userId });
      continue;
    }

    try {
      await sendGiveawayOrderEmail({ to: email, streamerName, productTitle });
      console.log("[email] sent", { to: email });
    } catch (err) {
      console.error("[email] send error", { to: email, err: String(err) });
    }
  }
}

