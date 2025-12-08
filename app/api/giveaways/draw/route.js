// app/api/giveaways/draw/route.ts
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/supabase/supabaseAdmin";

export const runtime = "nodejs";

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const giveawayId = body?.giveawayId;

  if (!giveawayId) {
    return NextResponse.json(
      { error: "giveawayId ist erforderlich" },
      { status: 400 }
    );
  }

  // 1) Giveaway laden
  const { data: giveaway, error: gError } = await supabaseAdmin
    .from("giveaways")
    .select("id, streamer_uuid, status, giveaway_order_id")
    .eq("id", giveawayId)
    .maybeSingle();

  if (gError) {
    return NextResponse.json(
      { error: `Fehler beim Laden des Giveaways: ${gError.message}` },
      { status: 500 }
    );
  }

  if (!giveaway) {
    return NextResponse.json(
      { error: "Giveaway nicht gefunden" },
      { status: 404 }
    );
  }

  // 2) Zugehörigen shopify_connectors-Eintrag holen (streamer_uuid → connector.uuid)
  const { data: connector, error: cError } = await supabaseAdmin
    .from("shopify_connectors")
    .select("user_id")
    .eq("uuid", giveaway.streamer_uuid)
    .maybeSingle();

  if (cError) {
    return NextResponse.json(
      { error: `Fehler beim Laden des Connectors: ${cError.message}` },
      { status: 500 }
    );
  }

  if (!connector) {
    return NextResponse.json(
      { error: "Kein passender shopify_connectors-Eintrag gefunden" },
      { status: 404 }
    );
  }

  // 3) Status prüfen (optional: 'running' UND 'ended' zulassen)
  if (giveaway.status !== "ended" && giveaway.status !== "running") {
    return NextResponse.json(
      { error: "Giveaway ist bereits abgeschlossen" },
      { status: 400 }
    );
  }

  // 4) Teilnehmer laden
  const { data: participants, error: pError } = await supabaseAdmin
    .from("giveaway_participants")
    .select("id, twitch_login, twitch_display_name, twitch_user_id")
    .eq("giveaway_id", giveawayId);

  if (pError) {
    return NextResponse.json(
      { error: `Fehler beim Laden der Teilnehmer: ${pError.message}` },
      { status: 500 }
    );
  }

  if (!participants || participants.length === 0) {
    return NextResponse.json(
      { error: "Keine Teilnehmer für dieses Giveaway vorhanden" },
      { status: 400 }
    );
  }

  // 5) Gewinner zufällig auswählen
  const idx = Math.floor(Math.random() * participants.length);
  const winner = participants[idx];

  // 6) Giveaway aktualisieren: Gewinner + Status
  const { error: uError } = await supabaseAdmin
    .from("giveaways")
    .update({
      status: "finished",
      winner_participant_id: winner.id,
      // falls du schon winner_twitch_* Spalten hast:
      winner_twitch_login: winner.twitch_login,
      winner_twitch_display_name: winner.twitch_display_name,
    })
    .eq("id", giveawayId);

  if (uError) {
    return NextResponse.json(
      { error: `Fehler beim Speichern des Gewinners: ${uError.message}` },
      { status: 500 }
    );
  }

  // 7) Produkt/Variante aus giveaway_orders holen (optional, aber sinnvoll)
  let shopifyProductId = null;
  let shopifyVariantId = null;

  if (giveaway.giveaway_order_id) {
    const { data: orderRow, error: oError } = await supabaseAdmin
      .from("giveaway_orders")
      .select("shopify_product_id, shopify_variant_id")
      .eq("id", giveaway.giveaway_order_id)
      .maybeSingle();

    if (!oError && orderRow) {
      shopifyProductId = orderRow.shopify_product_id ?? null;
      shopifyVariantId = orderRow.shopify_variant_id ?? null;
    }
  }

  // 8) Direkt einen Eintrag in giveaway_winner_details anlegen
  //    (nur Relation + ggf. Produktinfos, Adresse kommt später)
  const { data: winnerDetail, error: dError } = await supabaseAdmin
    .from("giveaway_winner_details")
    .upsert(
      {
        giveaway_id: giveawayId,
        winner_participant_id: winner.id,
        shopify_product_id: shopifyProductId,
        shopify_variant_id: shopifyVariantId,
      },
      {
        onConflict: "giveaway_id", // ensures 1 row per giveaway
      }
    );

  if (dError) {
    // kein Hard-Fehler, aber wir loggen es – Versanddetails kann man notfalls manuell nachtragen
    console.error(
      "Fehler beim Anlegen von giveaway_winner_details:",
      dError.message
    );
  }

  // 9) Gewinner an Frontend zurückgeben
  return NextResponse.json(
    {
      winner,
      winnerDetail,
    },
    { status: 200 }
  );
}
