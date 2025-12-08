import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/supabase/supabaseAdmin";

export const runtime = "nodejs";

export async function POST(req) {
  try {
    const body = await req.json();
    const { giveawayOrderId, command, durationSeconds } = body;

    if (!giveawayOrderId) {
      return NextResponse.json(
        { error: "missing giveawayOrderId" },
        { status: 400 }
      );
    }

    const cmd = command?.trim() || "!teilnahme";
    const dur = Number(durationSeconds) || 60;

    // 1) Giveaway-Order holen
    const { data: order, error: orderError } = await supabaseAdmin
      .from("giveaway_orders")
      .select("id, streamer_uuid")
      .eq("id", giveawayOrderId)
      .maybeSingle();

    if (orderError || !order) {
      return NextResponse.json(
        { error: "giveaway_order not found" },
        { status: 404 }
      );
    }

    const now = new Date();
    const endsAt = new Date(now.getTime() + dur * 1000);

    const { data: connector } = await supabaseAdmin
      .from("shopify_connectors")
      .select("uuid, twitch_username")
      .eq("uuid", order.streamer_uuid)
      .maybeSingle();

    if (!connector) {
      return NextResponse.json(
        { error: "connector not found" },
        { status: 404 }
      );
    }

    // 2) Giveaway anlegen
    const { data: insertData, error: insertError } = await supabaseAdmin
      .from("giveaways")
      .insert({
        streamer_uuid: order.streamer_uuid,
        giveaway_order_id: order.id,
        command: cmd,
        duration_seconds: dur,
        status: "running",
        started_at: now.toISOString(),
        ends_at: endsAt.toISOString(),
        twitch_channel: connector?.twitch_username?.toLowerCase() ?? null,
      })
      .select("*")
      .maybeSingle();

    if (insertError || !insertData) {
      console.error("giveaways insert error", insertError);
      return NextResponse.json(
        { error: "failed to create giveaway" },
        { status: 500 }
      );
    }

    // 3) giveaway_orders-Status updaten
    await supabaseAdmin
      .from("giveaway_orders")
      .update({ status: "in_giveaway" })
      .eq("id", order.id);

    return NextResponse.json({ giveaway: insertData });
  } catch (err) {
    console.error("giveaways/start error", err);
    return NextResponse.json({ error: "internal error" }, { status: 500 });
  }
}
