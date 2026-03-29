function toNumber(v) {
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  if (typeof v === "string") {
    const n = Number.parseFloat(v.replace(",", "."));
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

function toIsoOrNull(v) {
  if (!v) return null;
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

function inferFulfilledAt(order) {
  const direct = toIsoOrNull(order?.fulfilled_at);
  if (direct) return direct;
  const fulfillments = Array.isArray(order?.fulfillments) ? order.fulfillments : [];
  let best = null;
  for (const f of fulfillments) {
    const t = toIsoOrNull(f?.created_at || f?.updated_at);
    if (!t) continue;
    if (!best || new Date(t) > new Date(best)) best = t;
  }
  return best;
}

function getNoteAttribute(order, key) {
  const attrs = Array.isArray(order?.note_attributes) ? order.note_attributes : [];
  const hit = attrs.find((a) => String(a?.name || "").trim() === key);
  return hit?.value ?? null;
}

function sumLineItemDiscount(li) {
  const allocs = Array.isArray(li?.discount_allocations) ? li.discount_allocations : [];
  if (allocs.length > 0) {
    return allocs.reduce((sum, a) => sum + toNumber(a?.amount), 0);
  }
  if (li?.total_discount != null) return toNumber(li.total_discount);
  return 0;
}

function extractDiscountCode(order) {
  const codes = Array.isArray(order?.discount_codes) ? order.discount_codes : [];
  const code = codes[0]?.code ?? null;
  return code ? String(code) : null;
}

function extractDiscountPercent(order) {
  const apps = Array.isArray(order?.discount_applications) ? order.discount_applications : [];
  const percentage = apps.find((a) => String(a?.value_type || "").toLowerCase() === "percentage");
  const v = percentage?.value;
  const pct = toNumber(v);
  return pct > 0 ? pct : null;
}

export function normalizeShopifyOrderPayload(order, { topic } = {}) {
  const shopifyOrderId = order?.id != null ? String(order.id) : null;

  const username = getNoteAttribute(order, "username") || "";
  const hasGiveawayAttribute = String(getNoteAttribute(order, "giveaway") || "").toLowerCase() === "yes";

  const discountCode = extractDiscountCode(order);
  const discountPercent = extractDiscountPercent(order);

  const currency = order?.currency || null;
  const createdAt = toIsoOrNull(order?.created_at);

  const financialStatus = order?.financial_status || null;
  const fulfillmentStatus = order?.fulfillment_status || null;

  const cancelledAt = toIsoOrNull(order?.cancelled_at);
  const paidAt = toIsoOrNull(order?.processed_at || order?.paid_at);

  // Shopify does not always send fulfilled_at on the order root.
  const fulfilledAt = inferFulfilledAt(order);

  const lineItemsRaw = Array.isArray(order?.line_items) ? order.line_items : [];
  const lineItems = lineItemsRaw
    .filter((li) => li && li.id != null && li.product_id != null)
    .map((li) => {
      const lineItemId = String(li.id);
      const quantity = Number.parseInt(li.quantity ?? 0, 10) || 0;
      const price = toNumber(li.price);
      const discount = sumLineItemDiscount(li);

      return {
        line_item_id: lineItemId,
        line_item_uid: shopifyOrderId != null ? `${shopifyOrderId}:${lineItemId}` : null,
        product_id: li.product_id != null ? String(li.product_id) : null,
        variant_id: li.variant_id != null ? String(li.variant_id) : null,
        name: li.title ?? li.name ?? null,
        quantity,
        price,
        discount,
        currency,
      };
    });

  const billing = order?.billing_address || null;
  const shipping = order?.shipping_address || null;

  const billingName = billing ? `${billing.first_name || ""} ${billing.last_name || ""}`.trim() : null;
  const shippingName = shipping ? `${shipping.first_name || ""} ${shipping.last_name || ""}`.trim() : null;

  const itemRowsCount = lineItems.length;
  const totalItemQuantity = lineItems.reduce((sum, it) => sum + (it.quantity || 0), 0);

  // Minimal order head that is known to exist today + room for expansion via DB migration.
  const orderHead = {
    shopify_order_id: shopifyOrderId,
    order_name: order?.name || null,
    order_created_at: createdAt,
    paid_at: paidAt,
    fulfilled_at: fulfilledAt,
    cancelled_at: cancelledAt,
    financial_status: financialStatus,
    fulfillment_status: fulfillmentStatus,
    currency,
    subtotal: toNumber(order?.subtotal_price),
    shipping: toNumber(order?.total_shipping_price_set?.shop_money?.amount ?? order?.total_shipping_price),
    taxes: toNumber(order?.total_tax),
    total: toNumber(order?.total_price),
    discount_code: discountCode,
    discount_amount: toNumber(order?.total_discounts),
    refunded_amount: toNumber(order?.total_refunded),
    payment_reference: order?.payment_gateway_names?.[0] ?? null,
    source: order?.source_name ?? null,
    customer_email: order?.email ?? null,
    billing_name: billingName || null,
    shipping_name: shippingName || null,
    billing_country: billing?.country_code ?? billing?.country ?? null,
    shipping_country: shipping?.country_code ?? shipping?.country ?? null,
    billing_city: billing?.city ?? null,
    shipping_city: shipping?.city ?? null,
    item_rows_count: itemRowsCount,
    total_item_quantity: totalItemQuantity,
    items_summary_json: null,
    needs_review: false,
    needs_review_multiple_streamers: false,
    commission_status: null,
    _meta: {
      topic: topic || null,
      username,
      hasGiveawayAttribute,
      discountPercent,
    },
  };

  return {
    orderHead,
    lineItems,
    username,
    hasGiveawayAttribute,
    discountCode,
    discountPercent,
  };
}

