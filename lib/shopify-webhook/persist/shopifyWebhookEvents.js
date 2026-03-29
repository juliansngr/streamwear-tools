import { supabaseAdmin } from "@/supabase/supabaseAdmin";
import { getPublicTableColumns } from "@/lib/shopify-webhook/persist/dbColumnsCache";

async function hasEventsTable() {
  const cols = await getPublicTableColumns("shopify_webhook_events");
  return cols && cols.size > 0;
}

export async function logWebhookEventReceived({
  webhook_id,
  topic,
  shop_domain,
  shopify_order_id,
  payload,
  dbg,
}) {
  if (!webhook_id) return { ok: true, skipped: true, existed: false, processed_at: null };
  const okTable = await hasEventsTable();
  if (!okTable) return { ok: true, skipped: true, existed: false, processed_at: null };

  const received_at = new Date().toISOString();
  try {
    const { data, error } = await supabaseAdmin
      .from("shopify_webhook_events")
      .insert({
        webhook_id,
        topic: topic || null,
        shop_domain: shop_domain || null,
        shopify_order_id: shopify_order_id || null,
        payload,
        received_at,
        processed_at: null,
        processing_error: null,
      })
      .select("id, processed_at")
      .limit(1)
      .maybeSingle();

    if (!error) return { ok: true, skipped: false, existed: false, processed_at: data?.processed_at ?? null };
    // fallthrough to conflict handler
    dbg?.("webhook_events:insert:error", { webhook_id, error: error.message });
  } catch (err) {
    dbg?.("webhook_events:insert:throw", { webhook_id, err: String(err) });
  }

  // On conflict / already exists: load existing row
  try {
    const { data, error } = await supabaseAdmin
      .from("shopify_webhook_events")
      .select("id, processed_at")
      .eq("webhook_id", webhook_id)
      .limit(1)
      .maybeSingle();
    if (error) {
      dbg?.("webhook_events:select:error", { webhook_id, error: error.message });
      return { ok: false, skipped: false, existed: true, processed_at: null };
    }
    return { ok: true, skipped: false, existed: true, processed_at: data?.processed_at ?? null };
  } catch (err) {
    dbg?.("webhook_events:select:throw", { webhook_id, err: String(err) });
    return { ok: false, skipped: false, existed: true, processed_at: null };
  }
}

export async function markWebhookEventProcessed({ webhook_id, processing_error, dbg }) {
  if (!webhook_id) return { ok: true, skipped: true };
  const okTable = await hasEventsTable();
  if (!okTable) return { ok: true, skipped: true };

  const patch =
    processing_error != null
      ? { processing_error: String(processing_error) }
      : { processed_at: new Date().toISOString(), processing_error: null };

  try {
    const { error } = await supabaseAdmin
      .from("shopify_webhook_events")
      .update(patch)
      .eq("webhook_id", webhook_id);
    if (error) {
      dbg?.("webhook_events:update:error", { webhook_id, error: error.message });
      return { ok: false, skipped: false };
    }
    return { ok: true, skipped: false };
  } catch (err) {
    dbg?.("webhook_events:update:throw", { webhook_id, err: String(err) });
    return { ok: false, skipped: false };
  }
}

