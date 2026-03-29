const DISCOUNT_SHARE_BY_PERCENT = new Map([
  [5, 2.5],
  [10, 5],
  [15, 10],
  [20, 15],
]);

function clamp(n, min, max) {
  return Math.min(max, Math.max(min, n));
}

function toNumber(v) {
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  if (typeof v === "string") {
    const n = Number.parseFloat(v.replace(",", "."));
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

function normalizeDiscountPercent(pctRaw) {
  const pct = toNumber(pctRaw);
  if (!pct || pct <= 0) return null;
  const allowed = [5, 10, 15, 20];
  let best = null;
  let bestDiff = Infinity;
  for (const a of allowed) {
    const diff = Math.abs(a - pct);
    if (diff < bestDiff) {
      bestDiff = diff;
      best = a;
    }
  }
  // tolerate Shopify decimal formats like 9.999 -> 10
  if (bestDiff <= 0.6) return best;
  return null;
}

export function calculateCommissionForLineItem({
  baseRate,
  discountCode,
  discountPercent,
  quantity,
  unitPrice,
  lineDiscount,
}) {
  const base = toNumber(unitPrice) * (Number.parseInt(quantity ?? 0, 10) || 0);
  const discount = toNumber(lineDiscount);
  const hasItemDiscount = discount > 0;

  const code = discountCode ? String(discountCode) : "";
  const isInternal = code.toLowerCase().includes("internal");
  if (isInternal && hasItemDiscount) {
    return {
      commission_rate: 0,
      commission_amount: 0,
      _meta: { isInternal: true, base, discount, hasItemDiscount },
    };
  }

  const base_rate = clamp(toNumber(baseRate), 0, 1);
  // IMPORTANT: Rabattbeteiligung darf nur pro Line Item wirken.
  // Ein Order-Level Discount-Code alleine darf NICHT die Rate aller Items reduzieren.
  const normalizedPct = hasItemDiscount
    ? normalizeDiscountPercent(discountPercent)
    : null;
  const sharePoints =
    normalizedPct != null
      ? DISCOUNT_SHARE_BY_PERCENT.get(normalizedPct) || 0
      : 0;
  const shareRate = hasItemDiscount ? sharePoints / 100 : 0;

  const effectiveRate = clamp(base_rate - shareRate, 0, 1);
  // Fachlich korrekt: Provision immer auf Basis des vollen Shop-Preises (base),
  // Rabatt beeinflusst nur den Provisionssatz, nicht die Berechnungsbasis.
  const commissionAmount = base * effectiveRate;

  return {
    commission_rate: effectiveRate,
    commission_amount: commissionAmount,
    _meta: {
      isInternal: false,
      base_rate,
      discountPercent: normalizedPct,
      sharePoints,
      hasItemDiscount,
      base,
      discount,
    },
  };
}
