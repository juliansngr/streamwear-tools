import { supabaseAdmin } from "@/supabase/supabaseAdmin";
import {
  filterToKnownColumns,
  getPublicTableColumns,
} from "@/lib/shopify-webhook/persist/dbColumnsCache";
import { deriveCommissionUpdate } from "@/lib/shopify-webhook/commissionStatus";

function preferNext(existing, next, key) {
  if (next[key] !== null && next[key] !== undefined) return next[key];
  if (existing && existing[key] !== null && existing[key] !== undefined) return existing[key];
  return next[key];
}

export async function upsertShopOrderItems(
  {
    orderHead,
    lineItems,
    itemResolution,
    shopOrderId,
    topic,
    computedCommissionByUid,
    refundAdjustmentsByLineItemId,
    refundMode,
  },
  { dbg } = {},
) {
  const shopifyOrderId = orderHead?.shopify_order_id;
  if (!shopifyOrderId) throw new Error("Missing shopify_order_id");
  if (!shopOrderId) throw new Error("Missing shop_order_id");

  const rows = (lineItems || []).filter((li) => li?.line_item_uid).map((li) => {
    const res = itemResolution?.get?.(li.line_item_id) || null;
    const connectorId = res?.shopify_connector_id ?? null;
    const needsReview = res ? Boolean(res.needs_review) : true;

    const refundAdj = refundAdjustmentsByLineItemId?.get?.(li.line_item_id) || null;
    const refundedQty = refundAdj?.refunded_quantity || 0;
    const isRefunded =
      refundMode === "all" ? true : refundMode === "per_item" ? refundedQty > 0 : false;
    const currentQty =
      refundMode === "all" ? 0 : Math.max(0, (li.quantity ?? 0) - refundedQty);

    const computed = computedCommissionByUid?.get?.(li.line_item_uid) || null;

    return {
      line_item_uid: li.line_item_uid,
      shopify_order_id: shopifyOrderId,
      shop_order_id: shopOrderId,
      order_name: orderHead?.order_name ?? null,
      order_created_at: orderHead?.order_created_at ?? null,

      shopify_connector_id: connectorId,

      lineitem_name: li.name ?? null,
      lineitem_quantity: li.quantity ?? 0,
      lineitem_price: li.price ?? 0,
      lineitem_discount: li.discount ?? 0,
      currency: li.currency ?? orderHead?.currency ?? null,

      // denormalized fields used in dashboard today
      customer_email: orderHead?.customer_email ?? null,
      discount_code: orderHead?.discount_code ?? null,

      // status mirrors
      financial_status: orderHead?.financial_status ?? null,
      fulfillment_status: orderHead?.fulfillment_status ?? null,
      paid_at: orderHead?.paid_at ?? null,
      fulfilled_at: orderHead?.fulfilled_at ?? null,
      cancelled_at: orderHead?.cancelled_at ?? null,

      // item-level status defaults (will be refined in commission/status todo)
      current_quantity: currentQty,
      is_cancelled: Boolean(orderHead?.cancelled_at),
      is_refunded: isRefunded,

      needs_review: needsReview,

      commission_rate: computed?.commission_rate ?? null,
      // IMPORTANT: if we don't have a computed value for this topic,
      // keep null so we don't accidentally overwrite an existing value with 0.
      commission_amount: computed?.commission_amount ?? null,
      commission_status: computed?.commission_status ?? null,
    };
  });

  if (rows.length === 0) {
    return { upserted: 0 };
  }

  // Fetch existing timestamps so we don't null them out on upsert.
  const uids = rows.map((r) => r.line_item_uid);
  const { data: existingRows, error: existingErr } = await supabaseAdmin
    .from("shop_order_items")
    .select(
      [
        "id",
        "line_item_uid",
        "paid_at",
        "fulfilled_at",
        "cancelled_at",
        "financial_status",
        "fulfillment_status",
        "customer_email",
        "discount_code",
        "currency",
        "current_quantity",
        "is_cancelled",
        "is_refunded",
        "needs_review",
        "commission_rate",
        "commission_amount",
        "commission_status",
      ].join(","),
    )
    .in("line_item_uid", uids);

  if (existingErr) {
    dbg?.("shop_order_items:existing:error", { shopifyOrderId, error: existingErr.message });
  }

  const byUid = new Map((existingRows || []).map((r) => [r.line_item_uid, r]));
  const merged = rows.map((r) => {
    const ex = byUid.get(r.line_item_uid);
    if (!ex) return r;

    const financial_status = preferNext(ex, r, "financial_status");
    const fulfillment_status = preferNext(ex, r, "fulfillment_status");
    const customer_email = preferNext(ex, r, "customer_email");
    const discount_code = preferNext(ex, r, "discount_code");
    const currency = preferNext(ex, r, "currency");

    const current_quantity = preferNext(ex, r, "current_quantity");
    const is_cancelled = preferNext(ex, r, "is_cancelled");
    const is_refunded = preferNext(ex, r, "is_refunded");
    const needs_review = preferNext(ex, r, "needs_review");

    const existing_commission_status =
      ex.commission_status != null ? String(ex.commission_status) : null;
    const isAlreadyPaid = existing_commission_status === "paid";

    // If we have a computed commission for this row (e.g. orders/create),
    // we must be able to overwrite earlier placeholder values (like 0.00)
    // written by status-only topics that ran before create.
    const hasIncomingComputed = r.commission_rate != null && r.commission_amount != null;

    const commission_rate =
      !isAlreadyPaid && r.commission_rate != null
        ? r.commission_rate
        : ex.commission_rate != null
          ? ex.commission_rate
          : r.commission_rate;

    const commission_amount =
      !isAlreadyPaid && hasIncomingComputed
        ? r.commission_amount
        : ex.commission_amount != null
          ? ex.commission_amount
          : r.commission_amount;

    const commission_status =
      ex.commission_status != null ? ex.commission_status : r.commission_status;

    const derived = deriveCommissionUpdate({
      topic,
      financial_status,
      fulfillment_status,
      fulfilled_at: preferNext(ex, r, "fulfilled_at"),
      cancelled_at: preferNext(ex, r, "cancelled_at"),
      is_refunded,
      existing_commission_status: commission_status,
      existing_commission_amount: commission_amount,
      computed_commission_amount: r.commission_amount,
    });

    return {
      ...r,
      financial_status,
      fulfillment_status,
      customer_email,
      discount_code,
      currency,
      current_quantity,
      is_cancelled,
      is_refunded,
      needs_review,
      paid_at: preferNext(ex, r, "paid_at"),
      fulfilled_at: preferNext(ex, r, "fulfilled_at"),
      cancelled_at: preferNext(ex, r, "cancelled_at"),
      commission_rate,
      commission_amount: derived.commission_amount ?? commission_amount,
      commission_status: derived.commission_status ?? commission_status ?? r.commission_status,
    };
  });

  const cols = await getPublicTableColumns("shop_order_items");
  const filtered = merged.map((r) => filterToKnownColumns(r, cols));

  for (const r of merged) {
    if (r?.commission_rate == null && r?.commission_amount == null) continue;
    dbg?.("commission:final", {
      topic,
      line_item_uid: r.line_item_uid,
      lineitem_quantity: r.lineitem_quantity,
      lineitem_price: r.lineitem_price,
      lineitem_discount: r.lineitem_discount,
      commission_rate: r.commission_rate,
      commission_amount: r.commission_amount,
      commission_status: r.commission_status,
    });
  }

  const { error } = await supabaseAdmin
    .from("shop_order_items")
    .upsert(filtered, { onConflict: "line_item_uid" });

  if (error) {
    dbg?.("shop_order_items:upsert:error", { shopifyOrderId, error: error.message });
    throw new Error(error.message);
  }

  return { upserted: merged.length };
}

