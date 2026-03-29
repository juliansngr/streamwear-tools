import { broadcastOrderAlertIfNeeded } from "@/lib/shopify-webhook/effects/broadcastOrderAlertIfNeeded";
import { processGiveawayIfNeeded } from "@/lib/shopify-webhook/effects/processGiveawayIfNeeded";
import { upsertShopOrderAndItems } from "@/lib/shopify-webhook/upsertShopOrderAndItems";

export async function handleOrderCreate({ order, dbg, topic }) {
  const core = await upsertShopOrderAndItems(order, {
    topic: topic || "orders/create",
    dbg,
  });
  const { _alertItemsByStreamerUuid, ...publicCore } = core || {};

  // Side effects: Giveaway + Alerts. These are executed here (create only).
  try {
    await processGiveawayIfNeeded({
      order,
      username: publicCore.username,
      hasGiveawayAttribute: publicCore.hasGiveawayAttribute,
      productCollections: publicCore.productCollections,
      streamers: publicCore.streamers,
      dbg,
    });
  } catch (err) {
    console.error("[shopify:webhook] giveaway side-effect error", {
      err: String(err),
      orderId: order?.id != null ? String(order.id) : null,
    });
  }

  try {
    await broadcastOrderAlertIfNeeded({
      order,
      username: publicCore.username,
      streamers: publicCore.streamers,
      alertItemsByStreamerUuid: _alertItemsByStreamerUuid || {},
      dbg,
    });
  } catch (err) {
    console.error("[shopify:webhook] alert side-effect error", {
      err: String(err),
      orderId: order?.id != null ? String(order.id) : null,
    });
  }

  return { ok: true, ...publicCore };
}

