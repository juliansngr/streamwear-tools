import { upsertShopOrderAndItems } from "@/lib/shopify-webhook/upsertShopOrderAndItems";

export async function handleOrderUpdated({ order, dbg, topic }) {
  const core = await upsertShopOrderAndItems(order, { topic: topic || "orders/updated", dbg });
  return { ok: true, ...core };
}

