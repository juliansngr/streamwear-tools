import { upsertShopOrderAndItems } from "@/lib/shopify-webhook/upsertShopOrderAndItems";

export async function handleOrderPaid({ order, dbg, topic }) {
  const core = await upsertShopOrderAndItems(order, { topic: topic || "orders/paid", dbg });
  return { ok: true, ...core };
}

