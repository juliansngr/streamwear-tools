"use server";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getShopifyProductDetails } from "@/lib/shopify";
import { createClient as createServerSupabaseClient } from "@/supabase/serverClient";
import GiveawaysList from "./GiveawaysList";
import { revalidatePath } from "next/cache";

async function loadData() {
  const supabase = await createServerSupabaseClient();
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData?.user?.id;
  if (!userId) {
    throw new Error("Nicht eingeloggt.");
  }

  const { data: connector, error: connectorError } = await supabase
    .from("shopify_connectors")
    .select("uuid, features")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();
  if (connectorError) throw connectorError;

  const streamerUuid = connector?.uuid;
  const featureEnabled = Boolean(connector?.features?.giveaways);

  if (!streamerUuid) return { giveaways: [], featureEnabled };

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

  return { giveaways: enriched, featureEnabled };
}

async function toggleGiveawaysFeature(previouslyEnabled) {
  "use server";
  const supabase = await createServerSupabaseClient();
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData?.user?.id;
  if (!userId) throw new Error("Nicht eingeloggt.");

  const { data: connector } = await supabase
    .from("shopify_connectors")
    .select("uuid, features")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();

  if (!connector?.uuid) throw new Error("Kein Shopify-Connector gefunden.");

  const currentFeatures = connector.features || {};
  const nextFeatures = { ...currentFeatures, giveaways: !previouslyEnabled };

  const { error } = await supabase
    .from("shopify_connectors")
    .update({ features: nextFeatures })
    .eq("uuid", connector.uuid);

  if (error) throw new Error("Feature konnte nicht aktualisiert werden.");

  revalidatePath("/u/giveaways");
}

export default async function GiveawaysSettings() {
  let giveaways = [];
  let featureEnabled = false;
  let error = "";
  try {
    const data = await loadData();
    giveaways = data.giveaways;
    featureEnabled = data.featureEnabled;
  } catch (err) {
    error = "Konnte Giveaways nicht laden.";
  }

  return (
    <>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Giveaways</h1>
          <p className="mt-1 text-muted-foreground">
            Hier verwaltest du alle Giveaway-Bestellungen und startest neue
            Verlosungen.
          </p>
        </div>
        <form
          className="flex items-center gap-2 rounded-md border border-default bg-[color-mix(in_hsl,var(--muted),black_4%)] px-2.5 py-1.5"
          action={toggleGiveawaysFeature.bind(null, featureEnabled)}
        >
          <p className="text-sm text-muted-foreground">
            {featureEnabled ? "Aktiviert" : "Deaktiviert"}
          </p>
          <button
            type="submit"
            aria-pressed={featureEnabled}
            className={`relative inline-flex h-7 w-12 items-center rounded-full transition cursor-pointer ${
              featureEnabled
                ? "bg-[#8c7ae6] hover:bg-[#7f6cdc]"
                : "bg-[color-mix(in_hsl,var(--muted),black_6%)] hover:bg-[color-mix(in_hsl,var(--muted),black_4%)] border border-muted-foreground/40"
            }`}
          >
            <span
              className={`inline-block h-5 w-5 rounded-full bg-white shadow transition ${
                featureEnabled ? "translate-x-6" : "translate-x-1"
              }`}
            />
            <span className="sr-only">
              {featureEnabled
                ? "Giveaways deaktivieren"
                : "Giveaways aktivieren"}
            </span>
          </button>
        </form>
      </div>

      {error && (
        <Card className="p-4 border-destructive/40 text-destructive">
          {error}
        </Card>
      )}

      {!error && !featureEnabled && (
        <Card className="p-6 border-dashed text-muted-foreground">
          Giveaways sind aktuell deaktiviert. Aktiviere das Feature, um deine
          Verlosungen zu verwalten.
        </Card>
      )}

      {!error && featureEnabled && giveaways.length === 0 && (
        <Card className="p-6 border-dashed text-muted-foreground">
          Noch keine Giveaways gefunden.
        </Card>
      )}

      {!error && featureEnabled && giveaways.length > 0 && (
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
      {subtitle && <p className="mt-1 text-muted-foreground">{subtitle}</p>}
    </header>
  );
}
