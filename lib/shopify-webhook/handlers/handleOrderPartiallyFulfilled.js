import { upsertShopOrderAndItems } from "@/lib/shopify-webhook/upsertShopOrderAndItems";

export async function handleOrderPartiallyFulfilled({ order, dbg, topic }) {
  const core = await upsertShopOrderAndItems(order, {
    topic: topic || "orders/partially_fulfilled",
    dbg,
  });
  return { ok: true, ...core };
}

