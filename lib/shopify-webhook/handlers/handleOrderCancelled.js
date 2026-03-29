import { upsertShopOrderAndItems } from "@/lib/shopify-webhook/upsertShopOrderAndItems";

export async function handleOrderCancelled({ order, dbg, topic }) {
  const core = await upsertShopOrderAndItems(order, { topic: topic || "orders/cancelled", dbg });
  return { ok: true, ...core };
}

