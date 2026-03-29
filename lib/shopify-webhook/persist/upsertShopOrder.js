import { supabaseAdmin } from "@/supabase/supabaseAdmin";
import { filterToKnownColumns, getPublicTableColumns } from "@/lib/shopify-webhook/persist/dbColumnsCache";

function preferNext(existing, next, key) {
  if (next[key] !== null && next[key] !== undefined) return next[key];
  if (existing && existing[key] !== null && existing[key] !== undefined) return existing[key];
  return next[key];
}

export async function upsertShopOrder(orderHead, { dbg } = {}) {
  const shopifyOrderId = orderHead?.shopify_order_id;
  if (!shopifyOrderId) {
    throw new Error("Missing shopify_order_id");
  }

  const { data: existing, error: existingErr } = await supabaseAdmin
    .from("shop_orders")
    .select(
      [
        "id",
        "shopify_order_id",
        "paid_at",
        "fulfilled_at",
        "cancelled_at",
        "financial_status",
        "fulfillment_status",
        "refunded_amount",
      ].join(","),
    )
    .eq("shopify_order_id", shopifyOrderId)
    .limit(1)
    .maybeSingle();

  if (existingErr) {
    dbg?.("shop_orders:existing:error", { shopifyOrderId, error: existingErr.message });
  }

  const clean = { ...orderHead };
  delete clean._meta;

  // Idempotent timestamp merging (never overwrite a known timestamp with null).
  if (existing) {
    clean.paid_at = preferNext(existing, clean, "paid_at");
    clean.fulfilled_at = preferNext(existing, clean, "fulfilled_at");
    clean.cancelled_at = preferNext(existing, clean, "cancelled_at");

    // Also avoid null-overwrites for important status/money fields.
    clean.financial_status = preferNext(existing, clean, "financial_status");
    clean.fulfillment_status = preferNext(existing, clean, "fulfillment_status");
    clean.refunded_amount = preferNext(existing, clean, "refunded_amount");
  }

  const cols = await getPublicTableColumns("shop_orders");
  const filtered = filterToKnownColumns(clean, cols);

  const { data, error } = await supabaseAdmin
    .from("shop_orders")
    .upsert(filtered, { onConflict: "shopify_order_id" })
    .select("id, shopify_order_id")
    .limit(1)
    .maybeSingle();

  if (error) {
    dbg?.("shop_orders:upsert:error", { shopifyOrderId, error: error.message });
    throw new Error(error.message);
  }

  return data;
}

