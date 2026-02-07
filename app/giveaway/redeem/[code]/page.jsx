import Image from "next/image";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { createClient as createServerSupabaseClient } from "@/supabase/serverClient";
import { supabaseAdmin } from "@/supabase/supabaseAdmin";
import { getShopifyProductDetails } from "@/lib/shopify";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

const swatchColors = {
  black: "#111",
  white: "#f5f5f5",
  grey: "#777",
  gray: "#777",
  silver: "#c0c0c0",
  red: "#e53935",
  blue: "#1e88e5",
  green: "#43a047",
  yellow: "#fdd835",
  orange: "#fb8c00",
  purple: "#8e44ad",
  violet: "#8c7ae6",
  pink: "#e91e63",
  brown: "#795548",
  beige: "#f5f0e6",
  ivory: "#f6f1e1",
  navy: "#1a237e",
  teal: "#00897b",
  cyan: "#00acc1",
  magenta: "#d81b60",
  gold: "#c9a341",
  khaki: "#bdb76b",
  olive: "#708238",
};

function getSwatchColor(value) {
  if (!value) return null;
  const isHex = /^#(?:[0-9a-fA-F]{3}){1,2}$/.test(value.trim());
  if (isHex) return value.trim();
  const lower = value.trim().toLowerCase();
  return swatchColors[lower] || null;
}

function extractColorOption(options = []) {
  for (const opt of options) {
    const name = opt?.name?.toLowerCase() || "";
    const val = opt?.value;
    if (!val) continue;
    const hasColorName =
      name.includes("color") ||
      name.includes("farbe") ||
      name.includes("colour");
    const swatch = getSwatchColor(val);
    if (hasColorName || swatch) {
      return val;
    }
  }
  return null;
}

async function fetchProductWithVariants(productId) {
  const domain =
    process.env.SHOPIFY_STORE_DOMAIN ||
    process.env.NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN;
  const token =
    process.env.SHOPIFY_STOREFRONT_PUBLIC_TOKEN ||
    process.env.SHOPIFY_STOREFRONT_TOKEN;

  if (!domain || !token || !productId) return null;

  const productGid = `gid://shopify/Product/${productId}`;
  const query = /* GraphQL */ `
    query ProductWithVariants($id: ID!) {
      product(id: $id) {
        title
        options {
          name
          values
        }
        featuredImage {
          url
          altText
        }
        variants(first: 50) {
          edges {
            node {
              id
              title
              availableForSale
              image {
                url
                altText
              }
              selectedOptions {
                name
                value
              }
            }
          }
        }
      }
    }
  `;

  try {
    const res = await fetch(
      `https://${domain}/api/${
        process.env.SHOPIFY_API_VERSION || "2024-10"
      }/graphql.json`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Storefront-Access-Token": token,
        },
        body: JSON.stringify({ query, variables: { id: productGid } }),
        next: { revalidate: 600 },
      }
    );

    if (!res.ok) {
      return null;
    }

    const json = await res.json();
    return json?.data?.product || null;
  } catch {
    return null;
  }
}

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
    .select(
      "id, claimed, giveaway_order_id, streamer_uuid, winner_twitch_display_name, winner_twitch_login"
    )
    .eq("id", detail.giveaway_id)
    .maybeSingle();
  const giveawayOrderId = giveaway?.giveaway_order_id || null;
  const claimed = giveaway?.claimed || false;



  // 3) Order laden -> Produkt-/Variant-IDs
/*   const { data: order, error: orderError } = giveawayOrderId
    ? await supabase
        .from("giveaway_orders")
        .select("product_id, variant_id, buyer_twitch_username")
        .eq("id", giveawayOrderId)
        .maybeSingle()
    : { data: null, error: null }; */

  const { data: order, error: orderError } = await supabaseAdmin
    .from("giveaway_orders")
    .select("product_id, variant_id, buyer_twitch_username")
    .eq("id", giveawayOrderId)
    .maybeSingle();

  console.log("giveawayOrderId",giveawayOrderId);

  console.log(order);
  console.log("error",orderError);

  const productId = order?.product_id || null;
  const variantId = order?.variant_id || null;

  // 4) Streamer-Display-Name holen
  let streamerDisplayName = null;
  if (giveaway?.streamer_uuid) {
    const { data: streamerData } = await supabase
      .from("shopify_connectors")
      .select("display_name")
      .eq("uuid", giveaway.streamer_uuid)
      .maybeSingle();
    streamerDisplayName = streamerData?.display_name || null;
  }

  let product = {
    title: "Unbekanntes Produkt",
    variantTitle: null,
    image: null,
  };
  let variants = [];
  let optionGroups = [];
  let selectedVariantGid = null;

  if (!productId) {
    return { error: "Produkt konnte nicht ermittelt werden." };
  }

  const productWithVariants = await fetchProductWithVariants(productId);
  if (productWithVariants?.variants?.edges?.length) {
    variants =
      productWithVariants.variants.edges.map(({ node }) => ({
        id: node.id,
        title: node.title,
        availableForSale: node.availableForSale,
        image: node.image?.url || null,
        options: node.selectedOptions || [],
      })) || [];
  }

  // Option-Gruppen aus Varianten ableiten (z.B. Farbe, Größe)
  if (variants.length > 0) {
    const groupMap = new Map();

    // Prefer Shopify options (name + values) to define groups
    if (productWithVariants?.options?.length) {
      productWithVariants.options.forEach((opt) => {
        const name = opt.name || "Option";
        if (!groupMap.has(name)) groupMap.set(name, new Map());
        const valueMap = groupMap.get(name);
        (opt.values || []).forEach((val) => {
          if (!valueMap.has(val)) {
            valueMap.set(val, { value: val, available: false });
          }
        });
      });
    }

    // Mark availability based on variants
    variants.forEach((v) => {
      v.options?.forEach((opt) => {
        const groupName = opt?.name || "Option";
        if (!groupMap.has(groupName)) groupMap.set(groupName, new Map());
        const valueMap = groupMap.get(groupName);
        if (!valueMap.has(opt.value)) {
          valueMap.set(opt.value, { value: opt.value, available: false });
        }
        if (v.availableForSale) {
          valueMap.get(opt.value).available = true;
        }
      });
    });

    optionGroups = Array.from(groupMap.entries()).map(([name, valuesMap]) => ({
      name,
      values: Array.from(valuesMap.values()),
    }));
  }

  selectedVariantGid = variantId
    ? `gid://shopify/ProductVariant/${variantId}`
    : null;
  const selectedVariant =
    variants.find((v) => v.id === selectedVariantGid) ||
    variants.find((v) => v.availableForSale) ||
    variants[0] ||
    null;
  const selectedOptions = selectedVariant?.options || [];

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
      title: shopData.title || productWithVariants?.title || product.title,
      variantTitle: shopData.variantTitle || null,
      image:
        shopData.image ||
        variants.find((v) => v.id?.endsWith(variantId))?.image ||
        productWithVariants?.featuredImage?.url ||
        null,
    };
  }

  return {
    product,
    buyer: order?.buyer_twitch_username || null,
    code: detail.id,
    detailId: detail.id,
    winnerName:
      giveaway?.winner_twitch_display_name ||
      giveaway?.winner_twitch_login ||
      null,
    streamerName: streamerDisplayName,
    variants,
    selectedVariantId: variantId || null,
    selectedVariantGid,
    selectedOptions,
    optionGroups,
    productId,
    giveawayId: giveaway?.id || null,
    claimed,
  };
}

function gidToId(gid) {
  if (!gid) return null;
  const parts = `${gid}`.split("/");
  return parts[parts.length - 1] || null;
}

async function submitWinnerDetails(formData) {
  "use server";
  const supabase = await createServerSupabaseClient();

  const detailId = formData.get("detailId");
  const giveawayId = formData.get("giveawayId");
  const productId = formData.get("productId");
  const variantGid = formData.get("variantId");

  const firstName = formData.get("firstName")?.toString().trim() || null;
  const lastName = formData.get("lastName")?.toString().trim() || null;
  const email = formData.get("email")?.toString().trim() || null;
  const phone = formData.get("phone")?.toString().trim() || null;
  const street = formData.get("street")?.toString().trim() || null;
  const street2 = formData.get("street2")?.toString().trim() || null;
  const zip = formData.get("zip")?.toString().trim() || null;
  const city = formData.get("city")?.toString().trim() || null;
  const country = formData.get("country")?.toString().trim() || null;

  const variantId = gidToId(variantGid);
  const shopifyProductId = productId ? Number(productId) : null;
  const shopifyVariantId = variantId ? Number(variantId) : null;

  if (!detailId) {
    throw new Error("Ungültiger Code.");
  }

  const { error } = await supabase
    .from("giveaway_winner_details")
    .update({
      first_name: firstName,
      last_name: lastName,
      email,
      phone,
      address_line1: street,
      address_line2: street2,
      street,
      zip,
      postal_code: zip,
      city,
      country,
      shopify_product_id: shopifyProductId,
      shopify_variant_id: shopifyVariantId,
    })
    .eq("id", detailId);

  if (error) {
    throw new Error("Konnte Daten nicht speichern.");
  }

  if (giveawayId) {
    await supabase
      .from("giveaways")
      .update({ claimed: true })
      .eq("id", giveawayId);
  }

  revalidatePath(`/giveaway/redeem/${detailId}`);
  redirect(`/giveaway/redeem/${detailId}?submitted=1`);
}

export default async function GiveawayRedeemPage({ params, searchParams }) {
  const resolvedParams = await params;
  const code = resolvedParams?.code;
  const {
    error,
    product,
    buyer,
    code: resolvedCode,
    winnerName,
    streamerName,
    detailId,
    giveawayId,
    productId,
    variants,
    selectedVariantId,
    selectedVariantGid,
    selectedOptions,
    optionGroups,
    claimed,
  } = await loadData(code);

  const showSuccess = claimed;
  const showError = error && !showSuccess;

  return (
    <main className="min-h-screen bg-background text-foreground">
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
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            Giveaway-Einlösung
          </p>
          <h1 className="text-3xl font-semibold">
            {winnerName
              ? `${winnerName}, dein Gewinn wartet!`
              : "Dein Gewinn wartet auf dich"}
          </h1>
          <p className="text-muted-foreground">
            {winnerName && product?.title && streamerName
              ? `Herzlichen Glückwunsch! Du hast ${product.title} bei ${streamerName} im Stream gewonnen. Wir brauchen nur noch ein paar Daten von dir, damit wir dir den Gewinn zukommen lassen können.`
              : streamerName
              ? `Glückwunsch! Du hast auf dem Kanal von ${streamerName} etwas gewonnen. Wir brauchen nur noch ein paar Daten von dir, damit wir dir den Gewinn zukommen lassen können.`
              : "Glückwunsch zum Gewinn! Wir brauchen nur noch ein paar Daten von dir, damit wir dir den Gewinn zukommen lassen können."}
          </p>
        </header>

        {showError ? (
          <Card className="p-6 text-destructive border-destructive/60">
            {error}
          </Card>
        ) : showSuccess ? (
          <Card className="p-8 text-center border border-default bg-[color-mix(in_hsl,var(--muted),black_4%)] shadow-sm">
            <div className="mx-auto flex flex-col items-center gap-4">
              <div
                className="relative w-full max-w-sm bg-[color-mix(in_hsl,var(--muted),black_6%)] overflow-hidden rounded-lg"
                style={{ aspectRatio: "1 / 1" }}
              >
                <Image
                  src={
                    product?.image ||
                    "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=800&q=80"
                  }
                  alt={product?.title || "Produktbild"}
                  fill
                  sizes="400px"
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-linear-to-t from-black/70 via-black/35 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-4 text-white space-y-1">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-white/80">
                    Dein Gewinn
                  </p>
                  <h3 className="text-xl font-semibold leading-tight">
                    {product?.title}
                  </h3>
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-lg font-semibold text-foreground">
                  Alles klar! Wir kümmern uns um den Versand.
                </p>
                <p className="text-sm text-muted-foreground">
                  Deine Daten wurden gespeichert. Du hörst bald von uns – schon
                  mal viel Freude mit deinem Gewinn!
                </p>
              </div>
            </div>
          </Card>
        ) : (
          <>
            <form
              className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr] items-stretch"
              action={submitWinnerDetails}
            >
              <input type="hidden" name="detailId" value={detailId || ""} />
              <input type="hidden" name="giveawayId" value={giveawayId || ""} />
              <input type="hidden" name="productId" value={productId || ""} />
              <Card className="overflow-hidden border border-default/70 shadow-sm h-full">
                <div
                  className="relative w-full bg-[color-mix(in_hsl,var(--muted),black_6%)]"
                  style={{ aspectRatio: "1 / 1" }}
                >
                  <Image
                    src={
                      product?.image ||
                      "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=800&q=80"
                    }
                    alt={product?.title || "Produktbild"}
                    fill
                    sizes="(min-width: 1024px) 460px, 100vw"
                    className="object-cover"
                    priority
                  />
                  <div className="absolute inset-0 bg-linear-to-t from-black/60 via-black/25 to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 p-5 text-white">
                    <p className="text-[11px] uppercase tracking-[0.2em] text-white/80">
                      Dein Gewinn
                    </p>
                    <h3 className="text-2xl font-semibold leading-tight">
                      {product?.title}
                    </h3>
                  </div>
                </div>

                <div className="p-5 lg:p-6 grid gap-3 bg-[color-mix(in_hsl,var(--muted),black_4%)] border-t border-default/70">
                  <div className="grid gap-1 text-sm text-muted-foreground">
                    {buyer && (
                      <p>
                        Bedanken darfst du dich bei:{" "}
                        <span className="font-semibold text-foreground">
                          {buyer}
                        </span>
                      </p>
                    )}
                    {streamerName && (
                      <p>
                        Verlost auf:{" "}
                        <span className="font-semibold text-foreground">
                          {streamerName}
                        </span>
                      </p>
                    )}
                  </div>

                  {variants.length > 1 && (
                    <div className="grid gap-2">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">
                        Variante wählen
                      </p>
                      <select
                        name="variantId"
                        defaultValue={
                          selectedVariantGid ||
                          variants.find((v) => v.availableForSale)?.id ||
                          variants[0]?.id
                        }
                        className="h-10 rounded-md border border-default bg-background px-3 text-sm text-foreground"
                      >
                        {variants.map((v) => {
                          const labelOptions = v.options?.length
                            ? v.options
                                .map((o) => `${o.name}: ${o.value}`)
                                .join(" · ")
                            : "";
                          const unavailable = !v.availableForSale;
                          return (
                            <option
                              key={v.id}
                              value={v.id}
                              disabled={unavailable}
                            >
                              {v.title}
                              {labelOptions ? ` (${labelOptions})` : ""}
                              {unavailable ? " – nicht verfügbar" : ""}
                            </option>
                          );
                        })}
                      </select>
                    </div>
                  )}
                </div>
              </Card>

              <Card className="p-6 grid gap-4 h-full">
                <div className="grid gap-1">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    Nächste Schritte
                  </p>
                  <h2 className="text-lg font-semibold">
                    Gleich geht’s raus zu dir
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Einmal Adresse eintragen, dann kümmert sich unser Team –
                    kein Spam, nur dein Gewinn. GG!
                  </p>
                </div>

                <div className="grid gap-3">
                  <div className="grid gap-2 md:grid-cols-2 md:gap-3">
                    <div className="grid gap-2">
                      <label className="text-sm">Vorname</label>
                      <Input name="firstName" placeholder="Max" required />
                    </div>
                    <div className="grid gap-2">
                      <label className="text-sm">Nachname</label>
                      <Input
                        name="lastName"
                        placeholder="Mustermann"
                        required
                      />
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <label className="text-sm">E-Mail</label>
                    <Input
                      name="email"
                      type="email"
                      placeholder="max@example.com"
                      required
                    />
                  </div>
                  <div className="grid gap-2">
                    <label className="text-sm">Straße & Hausnummer</label>
                    <Input name="street" placeholder="Hauptstr. 12" required />
                  </div>
                  <div className="grid gap-2 md:grid-cols-3 md:gap-3">
                    <div className="grid gap-2">
                      <label className="text-sm">PLZ</label>
                      <Input name="zip" placeholder="12345" required />
                    </div>
                    <div className="grid gap-2 md:col-span-2">
                      <label className="text-sm">Stadt</label>
                      <Input name="city" placeholder="Berlin" required />
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <label className="text-sm">Land</label>
                    <Input name="country" placeholder="Deutschland" required />
                  </div>
                  <div className="grid gap-2">
                    <label className="text-sm">Telefon (optional)</label>
                    <Input
                      name="phone"
                      type="tel"
                      placeholder="+49 170 1234567"
                    />
                  </div>
                  <div className="grid gap-2">
                    <label className="text-sm">
                      Adresszusatz (optional, z.B. 2. Zeile)
                    </label>
                    <Input name="street2" placeholder="c/o, Apartment, etc." />
                  </div>
                </div>

                <div className="grid gap-2">
                  <Button className="w-full md:w-auto" type="submit">
                    Absenden
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    Wir speichern nur, was wir für den Versand brauchen. No
                    copypasta, versprochen.
                  </p>
                </div>
              </Card>
            </form>
          </>
        )}
      </div>
    </main>
  );
}
