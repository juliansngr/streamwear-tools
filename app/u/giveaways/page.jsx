"use server";
import { Card } from "@/components/ui/card";
import { getShopifyProductDetails } from "@/lib/shopify";
import { createClient as createServerSupabaseClient } from "@/supabase/serverClient";
import GiveawaysList from "./GiveawaysList";

async function loadGiveaways() {
  const supabase = await createServerSupabaseClient();
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData?.user?.id;
  if (!userId) {
    throw new Error("Nicht eingeloggt.");
  }

  const { data: connector, error: connectorError } = await supabase
    .from("shopify_connectors")
    .select("uuid")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();
  if (connectorError) throw connectorError;

  const streamerUuid = connector?.uuid;
  if (!streamerUuid) return [];

  const { data: orders, error: ordersError } = await supabase
    .from("giveaway_orders")
    .select(
      "id, streamer_uuid, shopify_order_id, shopify_line_item_id, product_id, variant_id, buyer_twitch_username"
    )
    .eq("streamer_uuid", streamerUuid)
    .order("created_at", { ascending: false });
  if (ordersError) throw ordersError;

  const enriched = await Promise.all(
    (orders || []).map(async (order) => {
      const { data } = await getShopifyProductDetails({
        productId: order.product_id,
        variantId: order.variant_id,
      });
      // Giveaway-Status aus giveaways-Tabelle holen
      const { data: giveaway, error: giveawayError } = await supabase
        .from("giveaways")
        .select("id, status, ends_at, winner_participant_id")
        .eq("giveaway_order_id", order.id)
        .order("created_at", { ascending: false })
        .maybeSingle();
      if (giveawayError) {
        // Ignorieren, wenn kein Giveaway vorhanden oder Fehler
      }
      let winner = null;
      let winnerDetailId = null;
      if (giveaway?.winner_participant_id) {
        const { data: winnerData } = await supabase
          .from("giveaway_participants")
          .select("twitch_login, twitch_display_name, twitch_user_id")
          .eq("id", giveaway.winner_participant_id)
          .maybeSingle();
        winner = winnerData || null;
        const { data: winnerDetail } = await supabase
          .from("giveaway_winner_details")
          .select("id")
          .eq("giveaway_id", giveaway.id)
          .maybeSingle();
        winnerDetailId = winnerDetail?.id || null;
      }
      return {
        id: order.id,
        streamerUuid: order.streamer_uuid,
        title: data?.title || "Unbekanntes Produkt",
        variantTitle: data?.variantTitle || null,
        image: data?.image || null,
        buyer: order.buyer_twitch_username || "Anonymous",
        shopifyOrderId: order.shopify_order_id,
        shopifyLineItemId: order.shopify_line_item_id,
        giveaway: giveaway || null,
        winner: winner ? { ...winner, winnerDetailId } : null,
      };
    })
  );

  return enriched;
}

export default async function GiveawaysSettings() {
  let giveaways = [];
  let error = "";
  try {
    giveaways = await loadGiveaways();
  } catch (err) {
    error = "Konnte Giveaways nicht laden.";
  }

  return (
    <>
      <SectionTitle
        title="Giveaways"
        subtitle="Hier verwaltest du alle Giveaway-Bestellungen und startest neue Verlosungen."
      />

      {error && (
        <Card className="p-4 border-destructive/40 text-destructive">
          {error}
        </Card>
      )}

      {!error && giveaways.length === 0 && (
        <Card className="p-6 border-dashed text-[var(--muted-foreground)]">
          Noch keine Giveaways gefunden.
        </Card>
      )}

      {!error && giveaways.length > 0 && (
        <>
          <GiveawaysList
            giveaways={giveaways.filter(
              (g) => g.giveaway?.status !== "finished"
            )}
          />
          {giveaways.some((g) => g.giveaway?.status === "finished") && (
            <div className="mt-6 grid gap-3">
              <SectionTitle
                title="Abgeschlossene Giveaways"
                subtitle="Bereits gezogene oder abgeschlossene Verlosungen."
              />
              <GiveawaysList
                giveaways={giveaways.filter(
                  (g) => g.giveaway?.status === "finished"
                )}
              />
            </div>
          )}
        </>
      )}
    </>
  );
}

function SectionTitle({ title, subtitle }) {
  return (
    <header className="mb-6">
      <h1 className="text-2xl font-semibold">{title}</h1>
      {subtitle && (
        <p className="mt-1 text-[var(--muted-foreground)]">{subtitle}</p>
      )}
    </header>
  );
}
