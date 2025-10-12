import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/supabase/supabaseAdmin";

const PREFIX =
  process.env.ALERT_TOPIC_PREFIX ||
  process.env.NEXT_PUBLIC_ALERT_TOPIC_PREFIX ||
  "streamwear-alerts";

async function broadcast(uuid, payload) {
  const channel = supabaseAdmin.channel(`${PREFIX}:${uuid}`);
  try {
    await channel.subscribe((status) => status);
    await channel.send({ type: "broadcast", event: "alert", payload });
  } finally {
    await channel.unsubscribe();
  }
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const uuid = searchParams.get("uuid");
  if (!uuid) {
    return NextResponse.json({ error: "missing uuid" }, { status: 400 });
  }

  const payload = {
    type: "order",
    customer: "Alex",
    product_title: "Creator Hoodie",
    variant_title: "Größe L",
    quantity: 1,
    price: 59.0,
    currency: "EUR",
    created_at: new Date().toISOString(),
    id: Math.floor(Math.random() * 1e9),
  };

  await broadcast(uuid, payload);
  return NextResponse.json({ ok: true, channel: `${PREFIX}:${uuid}`, payload });
}


