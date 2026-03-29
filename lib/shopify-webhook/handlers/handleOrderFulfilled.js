import { upsertShopOrderAndItems } from "@/lib/shopify-webhook/upsertShopOrderAndItems";

export async function handleOrderFulfilled({ order, dbg, topic }) {
  const core = await upsertShopOrderAndItems(order, { topic: topic || "orders/fulfilled", dbg });
  return { ok: true, ...core };
}

