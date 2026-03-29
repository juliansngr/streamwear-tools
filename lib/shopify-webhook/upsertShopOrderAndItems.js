import { normalizeShopifyOrderPayload } from "@/lib/shopify-webhook/normalizeShopifyOrderPayload";
import { resolveLineItemProfiles } from "@/lib/shopify-webhook/resolveLineItemProfiles";
import { calculateCommissionForLineItem } from "@/lib/shopify-webhook/calculateCommission";
import { upsertShopOrder } from "@/lib/shopify-webhook/persist/upsertShopOrder";
import { upsertShopOrderItems } from "@/lib/shopify-webhook/persist/upsertShopOrderItems";
import { supabaseAdmin } from "@/supabase/supabaseAdmin";
import { extractRefundLineItemAdjustments, getRefundMode } from "@/lib/shopify-webhook/refunds";
import { deriveCommissionUpdate } from "@/lib/shopify-webhook/commissionStatus";

export async function upsertShopOrderAndItems(order, { topic, dbg } = {}) {
  const requestCollectionsCache = new Map();
  const normalized = normalizeShopifyOrderPayload(order, { topic });
  const topicLower = String(topic || "").toLowerCase();

  const lineItemUids = (normalized.lineItems || [])
    .map((li) => li?.line_item_uid)
    .filter(Boolean);

  const existingItemsByUid =
    topicLower !== "orders/create" && lineItemUids.length > 0
      ? await loadExistingItemsByUid(lineItemUids, { dbg, shopify_order_id: normalized.orderHead.shopify_order_id })
      : new Map();

  const missingUidsSet =
    topicLower !== "orders/create"
      ? new Set(lineItemUids.filter((uid) => !existingItemsByUid.has(uid)))
      : new Set(lineItemUids);

  const shouldResolveCollections =
    topicLower === "orders/create" ||
    (topicLower === "orders/updated" && missingUidsSet.size > 0);

  const resolved = shouldResolveCollections
    ? await resolveLineItemProfiles(order, { dbg, requestCache: requestCollectionsCache })
    : buildResolvedFromExisting(existingItemsByUid);

  const alertItemsByStreamerUuid =
    topicLower === "orders/create"
      ? buildAlertItemsByStreamerUuid(order, resolved.itemResolution)
      : undefined;

  const refundAdjustmentsByLineItemId = extractRefundLineItemAdjustments(order);
  const refundMode = getRefundMode(order);

  const computedCommissionByUid = new Map();

  const shouldComputeCommissionAmounts =
    topicLower === "orders/create" ||
    (topicLower === "orders/updated" && missingUidsSet.size > 0);

  if (shouldComputeCommissionAmounts) {
    for (const li of normalized.lineItems || []) {
      if (topicLower !== "orders/create" && !missingUidsSet.has(li.line_item_uid)) {
        continue;
      }

      const res = resolved.itemResolution?.get?.(li.line_item_id) || null;
      const connector = res?.connector || null;
      const baseRate = connector?.commission_rate ?? 0.2;

      const computed = calculateCommissionForLineItem({
        baseRate,
        discountCode: normalized.discountCode,
        discountPercent: normalized.discountPercent,
        quantity: li.quantity,
        unitPrice: li.price,
        lineDiscount: li.discount,
      });

      dbg?.("commission:calc", {
        topic,
        line_item_id: li.line_item_id,
        line_item_uid: li.line_item_uid,
        quantity: li.quantity,
        unitPrice: li.price,
        lineDiscount: li.discount,
        calculated_commission_rate: computed?.commission_rate,
        calculated_commission_amount: computed?.commission_amount,
      });

      const refundAdj = refundAdjustmentsByLineItemId.get(li.line_item_id) || null;
      const refundedQty = refundAdj?.refunded_quantity || 0;
      const isRefunded =
        refundMode === "all" ? true : refundMode === "per_item" ? refundedQty > 0 : false;

      // If we can't resolve a connector, we keep commission at 0 until manual review.
      if (!connector?.uuid) {
        computed.commission_rate = 0;
        computed.commission_amount = 0;
      }

      const derived = deriveCommissionUpdate({
        topic,
        financial_status: normalized.orderHead.financial_status,
        fulfillment_status: normalized.orderHead.fulfillment_status,
        fulfilled_at: normalized.orderHead.fulfilled_at,
        cancelled_at: normalized.orderHead.cancelled_at,
        is_refunded: isRefunded,
        existing_commission_status: null,
        existing_commission_amount: null,
        computed_commission_amount: computed.commission_amount,
      });

      computedCommissionByUid.set(li.line_item_uid, {
        commission_rate: computed.commission_rate,
        commission_amount: derived.commission_amount ?? computed.commission_amount,
        commission_status: derived.commission_status ?? "pending",
      });
    }
  }

  const orderHead = {
    ...normalized.orderHead,
    needs_review_multiple_streamers: Boolean(resolved?.review?.needs_review_multiple_streamers),
    needs_review: Boolean(resolved?.review?.needs_review),
  };

  const headRow = await upsertShopOrder(orderHead, { dbg });

  const itemsRes = await upsertShopOrderItems(
    {
      orderHead,
      lineItems: normalized.lineItems,
      itemResolution: resolved.itemResolution,
      shopOrderId: headRow?.id,
      topic,
      computedCommissionByUid,
      refundAdjustmentsByLineItemId,
      refundMode,
    },
    { dbg },
  );

  return {
    shop_order_id: headRow?.id ?? null,
    shopify_order_id: headRow?.shopify_order_id ?? orderHead.shopify_order_id,
    upserted_items: itemsRes?.upserted ?? 0,
    resolved_streamers: resolved?.streamers?.length ?? 0,
    username: normalized.username,
    hasGiveawayAttribute: normalized.hasGiveawayAttribute,
    productCollections: resolved.productCollections,
    streamers: resolved.streamers,
    _alertItemsByStreamerUuid: alertItemsByStreamerUuid,
  };
}

async function loadExistingItemsByUid(lineItemUids, { dbg, shopify_order_id } = {}) {
  try {
    const { data, error } = await supabaseAdmin
      .from("shop_order_items")
      .select("line_item_uid, shopify_connector_id, needs_review, commission_rate, commission_amount, commission_status")
      .in("line_item_uid", lineItemUids);
    if (error) {
      dbg?.("shop_order_items:prefetch:error", { shopify_order_id, error: error.message });
      return new Map();
    }
    return new Map((data || []).map((r) => [r.line_item_uid, r]));
  } catch (err) {
    dbg?.("shop_order_items:prefetch:throw", { shopify_order_id, err: String(err) });
    return new Map();
  }
}

function buildResolvedFromExisting(existingItemsByUid) {
  const itemResolution = new Map();
  for (const r of existingItemsByUid.values()) {
    const uid = r?.line_item_uid ? String(r.line_item_uid) : null;
    if (!uid) continue;
    const parts = uid.split(":");
    const lineItemId = parts.length >= 2 ? parts.slice(1).join(":") : null;
    if (!lineItemId) continue;
    itemResolution.set(lineItemId, {
      connector: null,
      shopify_connector_id: r?.shopify_connector_id ?? null,
      needs_review: Boolean(r?.needs_review),
      needs_review_multiple_streamers: false,
      matches: [],
    });
  }
  return {
    streamers: [],
    productCollections: new Map(),
    itemResolution,
    review: { needs_review_multiple_streamers: false, needs_review: false },
  };
}

function buildAlertItemsByStreamerUuid(order, itemResolution) {
  const out = {};
  const lineItems = Array.isArray(order?.line_items) ? order.line_items : [];

  for (const li of lineItems) {
    const lineItemId = li?.id != null ? String(li.id) : null;
    if (!lineItemId) continue;

    const res = itemResolution?.get?.(lineItemId) || null;
    const uuid = res?.shopify_connector_id ? String(res.shopify_connector_id) : null;
    if (!uuid) continue;

    if (!out[uuid]) out[uuid] = [];

    out[uuid].push({
      line_item_id: lineItemId,
      product_title: li?.title ?? null,
      variant_title: li?.variant_title ?? null,
      quantity: li?.quantity ?? null,
      price: li?.price ?? null,
    });
  }

  return out;
}

