function toNumber(v) {
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  if (typeof v === "string") {
    const n = Number.parseFloat(v.replace(",", "."));
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

export function extractRefundLineItemAdjustments(order) {
  const refunds = Array.isArray(order?.refunds) ? order.refunds : [];
  const out = new Map(); // line_item_id(string) -> { refunded_quantity, refunded_amount }

  for (const r of refunds) {
    const items = Array.isArray(r?.refund_line_items) ? r.refund_line_items : [];
    for (const ri of items) {
      const lineItemIdRaw = ri?.line_item_id ?? ri?.line_item?.id ?? null;
      if (lineItemIdRaw == null) continue;
      const lineItemId = String(lineItemIdRaw);

      const qty = Number.parseInt(ri?.quantity ?? 0, 10) || 0;
      const amount =
        toNumber(ri?.subtotal_set?.shop_money?.amount) ||
        toNumber(ri?.subtotal) ||
        toNumber(ri?.total_set?.shop_money?.amount) ||
        toNumber(ri?.total) ||
        0;

      const prev = out.get(lineItemId) || { refunded_quantity: 0, refunded_amount: 0 };
      out.set(lineItemId, {
        refunded_quantity: prev.refunded_quantity + qty,
        refunded_amount: prev.refunded_amount + amount,
      });
    }
  }

  return out;
}

export function orderLooksRefunded(order) {
  const fin = String(order?.financial_status || "").toLowerCase();
  if (fin === "refunded" || fin === "partially_refunded") return true;
  const refunds = Array.isArray(order?.refunds) ? order.refunds : [];
  return refunds.length > 0;
}

export function getRefundMode(order) {
  const fin = String(order?.financial_status || "").toLowerCase();
  if (fin === "refunded") return "all";
  if (fin === "partially_refunded") return "per_item";

  const refunds = Array.isArray(order?.refunds) ? order.refunds : [];
  const hasLineItems = refunds.some(
    (r) => Array.isArray(r?.refund_line_items) && r.refund_line_items.length > 0,
  );
  if (hasLineItems) return "per_item";

  return "none";
}

