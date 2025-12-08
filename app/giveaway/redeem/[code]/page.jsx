import Image from "next/image";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { createClient as createServerSupabaseClient } from "@/supabase/serverClient";
import { getShopifyProductDetails } from "@/lib/shopify";

async function loadData(code) {
  const supabase = await createServerSupabaseClient();

  // 1) Winner-Detail anhand des Codes finden
  const { data: detail, error: detailError } = await supabase
    .from("giveaway_winner_details")
    .select("id, giveaway_id")
    .eq("id", code)
    .maybeSingle();

  if (detailError || !detail) {
    return { error: "Ungültiger oder unbekannter Code." };
  }

  // 2) Zugehöriges Giveaway laden -> giveaway_order_id
  const { data: giveaway } = await supabase
    .from("giveaways")
    .select("giveaway_order_id")
    .eq("id", detail.giveaway_id)
    .maybeSingle();
  const giveawayOrderId = giveaway?.giveaway_order_id || null;

  // 3) Order laden -> Produkt-/Variant-IDs
  const { data: order } = giveawayOrderId
    ? await supabase
        .from("giveaway_orders")
        .select("product_id, variant_id, buyer_twitch_username")
        .eq("id", giveawayOrderId)
        .maybeSingle()
    : { data: null };

  const productId = order?.product_id || null;
  const variantId = order?.variant_id || null;

  let product = {
    title: "Unbekanntes Produkt",
    variantTitle: null,
    image: null,
  };

  if (!productId) {
    return { error: "Produkt konnte nicht ermittelt werden." };
  }

  const { data: shopData, errors: shopErrors } = await getShopifyProductDetails(
    {
      productId,
      variantId,
    }
  );
  if (shopErrors) {
    product.title = "Produkt konnte nicht geladen werden";
  } else if (shopData) {
    product = {
      title: shopData.title || product.title,
      variantTitle: shopData.variantTitle || null,
      image: shopData.image || null,
    };
  }

  return {
    product,
    buyer: order?.buyer_twitch_username || null,
    code: detail.id,
  };
}

export default async function GiveawayRedeemPage({ params }) {
  const resolvedParams = await params;
  const code = resolvedParams?.code;
  const { error, product, buyer, code: resolvedCode } = await loadData(code);

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-4 py-10">
        <div className="mx-auto">
          <Image
            src="/SW_LOGO.webp"
            alt="Streamwear Logo"
            width={140}
            height={40}
            priority
            className="mx-auto"
          />
        </div>

        <header className="grid gap-2 text-center">
          <p className="text-xs uppercase tracking-wide text-[var(--muted-foreground)]">
            Giveaway-Einlösung
          </p>
          <h1 className="text-3xl font-semibold">
            Dein Gewinn wartet auf dich
          </h1>
          <p className="text-[var(--muted-foreground)]">
            Trage deine Daten ein, damit wir dir den Gewinn zusenden können.
            Dies ist eine Demo-Oberfläche (keine echte Einreichung).
          </p>
        </header>

        {error ? (
          <Card className="p-6 text-destructive border-destructive/60">
            {error}
          </Card>
        ) : (
          <>
            <section className="grid gap-6 md:grid-cols-2 items-start">
              <Card className="p-0 overflow-hidden border border-default/70 shadow-sm">
                <div
                  className="relative w-full"
                  style={{ aspectRatio: "4 / 3" }}
                >
                  <Image
                    src={
                      product?.image ||
                      "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=800&q=80"
                    }
                    alt={product?.title || "Produktbild"}
                    fill
                    sizes="(min-width: 1024px) 380px, 100vw"
                    className="object-cover"
                    priority
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 p-5 text-white">
                    <p className="text-[11px] uppercase tracking-[0.2em] text-white/80">
                      Dein Gewinn
                    </p>
                    <h3 className="text-2xl font-semibold leading-tight">
                      {product?.title}
                    </h3>
                    {product?.variantTitle && (
                      <p className="text-sm text-white/80">
                        {product.variantTitle}
                      </p>
                    )}
                  </div>
                </div>

                <div className="p-5 grid gap-3">
                  <div className="grid gap-1 text-sm text-[var(--muted-foreground)]">
                    {buyer && (
                      <p className="text-[var(--foreground)]">
                        Gesponsert von: {buyer}
                      </p>
                    )}
                    <p>Code: {resolvedCode}</p>
                    <p>
                      Die Auslieferung erfolgt nach Prüfung deiner Angaben. Dies
                      ist derzeit nur eine Vorschau – es werden keine realen
                      Bestellungen ausgelöst.
                    </p>
                  </div>
                </div>
              </Card>

              <Card className="p-6 grid gap-4 h-full">
                <div className="flex items-start justify-between gap-3">
                  <div className="grid gap-1">
                    <p className="text-xs uppercase tracking-wide text-[var(--muted-foreground)]">
                      Nächste Schritte
                    </p>
                    <h2 className="text-lg font-semibold">
                      Trage deine Versanddaten ein
                    </h2>
                    <p className="text-sm text-[var(--muted-foreground)]">
                      Wir benötigen deine Adresse, um den Gewinn zu versenden.
                      Aktuell ist dies eine Demo – es werden keine Daten
                      gespeichert.
                    </p>
                  </div>
                </div>
                <div className="grid gap-2 text-sm text-[var(--muted-foreground)]">
                  <p>
                    Hinweis: In der finalen Version kannst du hier deine Daten
                    absenden. Jetzt ist dies nur eine Vorschau.
                  </p>
                </div>
              </Card>
            </section>

            <Card className="p-6 grid gap-5">
              <div className="grid gap-2">
                <h2 className="text-lg font-semibold">Deine Daten</h2>
                <p className="text-sm text-[var(--muted-foreground)]">
                  Bitte fülle alle Felder aus. In dieser Demo werden die Daten
                  nicht gespeichert.
                </p>
              </div>

              <div className="grid gap-4">
                <div className="grid gap-2 md:grid-cols-2 md:gap-3">
                  <div className="grid gap-2">
                    <label className="text-sm">Vorname</label>
                    <Input placeholder="Max" />
                  </div>
                  <div className="grid gap-2">
                    <label className="text-sm">Nachname</label>
                    <Input placeholder="Mustermann" />
                  </div>
                </div>
                <div className="grid gap-2">
                  <label className="text-sm">E-Mail</label>
                  <Input type="email" placeholder="max@example.com" />
                </div>
                <div className="grid gap-2">
                  <label className="text-sm">Straße & Hausnummer</label>
                  <Input placeholder="Hauptstr. 12" />
                </div>
                <div className="grid gap-2 md:grid-cols-3 md:gap-3">
                  <div className="grid gap-2">
                    <label className="text-sm">PLZ</label>
                    <Input placeholder="12345" />
                  </div>
                  <div className="grid gap-2 md:col-span-2">
                    <label className="text-sm">Stadt</label>
                    <Input placeholder="Berlin" />
                  </div>
                </div>
                <div className="grid gap-2">
                  <label className="text-sm">Land</label>
                  <Input placeholder="Deutschland" />
                </div>
                <div className="grid gap-2">
                  <label className="text-sm">Telefon (optional)</label>
                  <Input type="tel" placeholder="+49 170 1234567" />
                </div>
              </div>

              <div className="grid gap-2">
                <Button className="w-full md:w-auto" disabled>
                  Daten absenden (Demo)
                </Button>
                <p className="text-xs text-[var(--muted-foreground)]">
                  Hinweis: In dieser Dummy-Version werden keine Daten
                  übertragen.
                </p>
              </div>
            </Card>
          </>
        )}
      </div>
    </main>
  );
}
