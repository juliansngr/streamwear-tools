import { supabaseAdmin } from "@/supabase/supabaseAdmin";

const ALERT_TOPIC_PREFIX = process.env.ALERT_TOPIC_PREFIX || "streamwear-alerts";

async function broadcastAlert({ uuid, payload, dbg }) {
  const channelName = `${ALERT_TOPIC_PREFIX}:${uuid}`;
  const channel = supabaseAdmin.channel(channelName);
  try {
    dbg?.("broadcast:subscribe", { channel: channelName });
    const sub = await channel.subscribe((status) => status);
    dbg?.("broadcast:subscribed", {
      channel: channelName,
      status: sub?.status ?? "ok",
    });
    dbg?.("broadcast:send", {
      channel: channelName,
      payloadPreview: JSON.stringify(payload).slice(0, 200),
    });
    const sent = await channel.send({
      type: "broadcast",
      event: "alert",
      payload,
    });
    dbg?.("broadcast:sent", { channel: channelName, sent });
  } finally {
    const res = await channel.unsubscribe();
    dbg?.("broadcast:unsubscribed", { channel: channelName, res });
  }
}

function buildAlertPayload({ order, username, item }) {
  return {
    type: "order",
    customer: order?.customer?.first_name || "",
    product_title: item?.product_title ?? null,
    variant_title: item?.variant_title ?? null,
    quantity: item?.quantity ?? null,
    price: item?.price ?? null,
    currency: order?.currency,
    created_at: order?.created_at,
    id: order?.id != null ? String(order.id) : null,
    username: username || "",
    items_count: item?.items_count ?? null,
  };
}

export async function broadcastOrderAlertIfNeeded({
  order,
  username,
  streamers,
  alertItemsByStreamerUuid,
  dbg,
}) {
  for (const s of streamers || []) {
    const uuid = s?.uuid ? String(s.uuid) : null;
    if (!uuid) continue;

    const items = alertItemsByStreamerUuid?.[uuid] || [];
    if (!items.length) continue;

    const first = items[0];
    const payload = buildAlertPayload({
      order,
      username,
      item: {
        ...first,
        items_count: items.length,
      },
    });

    dbg?.("payload:prepared", { uuid, payload });
    dbg?.("broadcast:start", { uuid: s.uuid, handle: s.collection_handle });
    await broadcastAlert({ uuid: s.uuid, payload, dbg });
    dbg?.("broadcast:done", { uuid: s.uuid });
  }
}

