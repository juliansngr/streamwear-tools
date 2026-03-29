function parseDate(v) {
  if (!v) return null;
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

function addDays(date, days) {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

export function deriveCommissionUpdate({
  topic,
  financial_status,
  fulfillment_status,
  fulfilled_at,
  cancelled_at,
  is_refunded,
  existing_commission_status,
  existing_commission_amount,
  computed_commission_amount,
}) {
  const now = new Date();
  const existingStatus = existing_commission_status ? String(existing_commission_status) : null;

  const isPaid = existingStatus === "paid";
  const isReversed = is_refunded || Boolean(cancelled_at);

  if (isReversed) {
    const prevAmount =
      typeof existing_commission_amount === "number"
        ? existing_commission_amount
        : Number(existing_commission_amount ?? 0) || 0;
    const baseAmount =
      typeof computed_commission_amount === "number"
        ? computed_commission_amount
        : Number(computed_commission_amount ?? 0) || 0;

    // If already paid, create negative commission on the same item row (ledger comes later).
    const amount = isPaid ? -Math.abs(prevAmount || baseAmount || 0) : 0;
    return { commission_status: "reversed", commission_amount: amount };
  }

  // If Shopify explicitly reports refunds, treat as reversed for commission.
  const fin = String(financial_status || "").toLowerCase();
  // Full refunds reverse all items. Partial refunds must be handled per-item via is_refunded.
  if (fin === "refunded") {
    return { commission_status: "reversed", commission_amount: 0 };
  }

  // Preserve paid unless reversal happens.
  if (isPaid) {
    return { commission_status: "paid", commission_amount: existing_commission_amount };
  }

  const ful = String(fulfillment_status || "").toLowerCase();
  const isFulfilledTopic = String(topic || "").toLowerCase() === "orders/fulfilled";
  const isFulfilled = isFulfilledTopic || ful === "fulfilled" || Boolean(fulfilled_at);

  let nextStatus = existingStatus;
  if (!nextStatus) nextStatus = "pending";
  if (String(topic || "").toLowerCase() === "orders/create") nextStatus = "pending";
  if (isFulfilled) nextStatus = "locked";

  // Promote locked -> available after 14 days
  if (nextStatus === "locked") {
    const fAt = parseDate(fulfilled_at);
    if (fAt) {
      const releaseAt = addDays(fAt, 14);
      if (releaseAt < now) nextStatus = "available";
    }
  }

  return { commission_status: nextStatus };
}

