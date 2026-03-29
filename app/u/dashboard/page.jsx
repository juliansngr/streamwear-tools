"use server";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { createClient } from "@/supabase/serverClient";

export default async function Dashboard() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();

  const { data: profileData } = await supabase
    .from("profiles")
    .select("uuid, display_name")
    .eq("user_id", userData?.user?.id)
    .single();

  const hasConnector = Boolean(profileData?.uuid);

  const since30d = new Date();
  since30d.setDate(since30d.getDate() - 30);

  const { data: itemsLast30d } = hasConnector
    ? await supabase
        .from("shop_order_items")
        .select(
          [
            "shop_order_id",
            "shopify_order_id",
            "order_name",
            "order_created_at",
            "currency",
            "financial_status",
            "discount_code",
            "commission_amount",
            "shop_orders(cancelled_at)",
          ].join(","),
        )
        .eq("shopify_connector_id", profileData.uuid)
        .eq("financial_status", "paid")
        .gte("order_created_at", since30d.toISOString())
        .order("order_created_at", { ascending: false })
        .limit(5000)
    : { data: null };

  const ordersLast30dCount = countUniqueVisibleOrders(itemsLast30d || []);
  const commissionLast30dLabel = formatCommissionSum(itemsLast30d || []);

  const { data: recentItems } = profileData?.uuid
    ? await supabase
        .from("shop_order_items")
        .select(
          [
            "shop_order_id",
            "shopify_order_id",
            "order_name",
            "order_created_at",
            "customer_email",
            "currency",
            "lineitem_quantity",
            "lineitem_price",
            "lineitem_discount",
            "discount_code",
            "financial_status",
            "fulfillment_status",
            "shop_orders(cancelled_at,billing_name)",
          ].join(","),
        )
        .eq("shopify_connector_id", profileData.uuid)
        .eq("financial_status", "paid")
        .order("order_created_at", { ascending: false })
        .limit(200)
    : { data: null };

  const visibleItems =
    recentItems?.length > 0
      ? recentItems.filter((it) => !isOrderCancelled(it))
      : [];

  const activityGroups =
    visibleItems.length > 0 ? buildActivityGroupsFromItems(visibleItems) : [];

  return (
    <>
      <SectionTitle
        title={`Hey ${
          profileData?.display_name ? profileData?.display_name : ""
        } 👋`}
        subtitle="Überblick"
      />
      <div className="grid gap-6 sm:grid-cols-2">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              Bestellungen (30T)
            </div>
            {hasConnector ? null : <SoonBadge />}
          </div>
          <div className="mt-1 text-2xl font-semibold tabular-nums">
            {hasConnector
              ? new Intl.NumberFormat("de-DE").format(ordersLast30dCount)
              : "—"}
          </div>
        </Card>
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">Provision (30T)</div>
            {hasConnector ? null : <SoonBadge />}
          </div>
          <div className="mt-1 text-2xl font-semibold tabular-nums">
            {hasConnector ? commissionLast30dLabel : "—"}
          </div>
        </Card>
      </div>

      <Card className="mt-6 p-6">
        <div className="mb-3 flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Aktivität (seit Februar 2026)
          </div>
        </div>
        {activityGroups?.length > 0 ? (
          <div className="space-y-4">
            {activityGroups.map((group, idx) => (
              <div key={group.label}>
                <div className="flex items-center justify-between">
                  <div className="text-xs font-medium text-muted-foreground">
                    {group.label}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {group.items.length} Bestellungen
                  </div>
                </div>
                <div className="mt-3 space-y-2">
                  {group.items.map((o) => (
                    <div
                      key={o.id}
                      className="flex items-center justify-between gap-4 rounded-sm border border-default bg-[color-mix(in_hsl,var(--muted),black_4%)] px-3 py-2"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <div className="truncate text-sm font-medium">
                            #{o.id}
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {o.customer} · {o.items} Artikel
                          </span>
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          {o.time}
                        </div>
                      </div>

                      <div className="flex shrink-0 items-center gap-3">
                        <div className="text-sm font-semibold tabular-nums">
                          {o.total}
                        </div>
                        <StatusPill tone={o.tone}>{o.status}</StatusPill>
                      </div>
                    </div>
                  ))}
                </div>
                {idx < activityGroups.length - 1 && (
                  <Separator className="my-6" />
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="py-8 text-center text-sm text-muted-foreground">
            {hasConnector
              ? "Noch keine Bestellungen."
              : "Kein Shopify-Connector gefunden."}
          </div>
        )}
      </Card>
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

function SoonBadge() {
  return (
    <span className="rounded px-1.5 py-0.5 text-[10px] uppercase tracking-wide bg-[#9146ff]/15 text-[#c6a3ff] ring-1 ring-[#9146ff]/30">
      Coming Soon
    </span>
  );
}

function StatusPill({ tone = "neutral", children }) {
  const toneClass =
    tone === "success"
      ? "bg-emerald-500/10 text-emerald-200 ring-1 ring-emerald-500/20"
      : tone === "info"
        ? "bg-sky-500/10 text-sky-200 ring-1 ring-sky-500/20"
        : tone === "danger"
          ? "bg-rose-500/10 text-rose-200 ring-1 ring-rose-500/20"
          : "bg-[color-mix(in_hsl,var(--muted),black_10%)] text-muted-foreground ring-1 ring-[color-mix(in_hsl,var(--muted-foreground),transparent_70%)]";

  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded px-1.5 py-0.5 text-[10px] uppercase tracking-wide ${toneClass}`}
    >
      {children}
    </span>
  );
}

function buildActivityGroupsFromItems(items) {
  const orders = new Map();

  for (const it of items) {
    const orderId = getOrderKey(it);
    if (!orderId) continue;

    const existing = orders.get(orderId);
    const createdAt = it.order_created_at
      ? new Date(it.order_created_at)
      : null;
    const internalDiscount = hasInternalDiscountCode(it);

    const quantity = toNumber(it.lineitem_quantity);
    const price = toNumber(it.lineitem_price);
    const discount = toNumber(it.lineitem_discount);
    const revenue = Math.max(0, price * quantity - discount);

    if (!existing) {
      orders.set(orderId, {
        orderId,
        orderName: it.order_name,
        createdAt,
        currency: it.currency,
        billingName: getBillingName(it),
        customerEmail: it.customer_email,
        quantity,
        revenue,
        hasInternalDiscount: internalDiscount,
        financialStatuses: new Set([it.financial_status].filter(Boolean)),
        fulfillmentStatuses: new Set([it.fulfillment_status].filter(Boolean)),
      });
    } else {
      existing.createdAt =
        existing.createdAt && createdAt
          ? existing.createdAt > createdAt
            ? existing.createdAt
            : createdAt
          : existing.createdAt || createdAt;
      existing.currency = existing.currency || it.currency;
      existing.billingName = existing.billingName || getBillingName(it);
      existing.customerEmail = existing.customerEmail || it.customer_email;
      existing.quantity += quantity;
      existing.revenue += revenue;
      existing.hasInternalDiscount =
        existing.hasInternalDiscount || internalDiscount;
      if (it.financial_status)
        existing.financialStatuses.add(it.financial_status);
      if (it.fulfillment_status)
        existing.fulfillmentStatuses.add(it.fulfillment_status);
    }
  }

  const orderRows = Array.from(orders.values())
    .filter((o) => !o.hasInternalDiscount)
    .sort(
      (a, b) =>
        (b.createdAt?.getTime?.() || 0) - (a.createdAt?.getTime?.() || 0),
    )
    .slice(0, 20)
    .map((o) => {
      const { label, tone } = deriveOrderStatus(
        o.financialStatuses,
        o.fulfillmentStatuses,
      );

      const id = (o.orderName || String(o.orderId)).replace(/^#/, "");
      return {
        id,
        customer: formatCustomer({
          billingName: o.billingName,
          email: o.customerEmail,
        }),
        items: o.quantity,
        total: formatMoney(o.revenue, o.currency),
        status: label,
        tone,
        time: formatActivityTime(o.createdAt),
        createdAt: o.createdAt,
      };
    });

  const now = new Date();
  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  );
  const startOfYesterday = new Date(startOfToday);
  startOfYesterday.setDate(startOfYesterday.getDate() - 1);
  const startOf7Days = new Date(startOfToday);
  startOf7Days.setDate(startOf7Days.getDate() - 7);

  const buckets = [
    { label: "Heute", test: (d) => d && d >= startOfToday },
    {
      label: "Gestern",
      test: (d) => d && d >= startOfYesterday && d < startOfToday,
    },
    {
      label: "Letzte 7 Tage",
      test: (d) => d && d >= startOf7Days && d < startOfYesterday,
    },
    { label: "Älter", test: (d) => !d || d < startOf7Days },
  ];

  const groups = buckets
    .map((b) => ({
      label: b.label,
      items: orderRows.filter((r) => b.test(r.createdAt)),
    }))
    .filter((g) => g.items.length > 0)
    .map((g) => ({
      label: g.label,
      items: g.items.map(({ createdAt, ...rest }) => rest),
    }));

  return groups;
}

function toNumber(v) {
  if (typeof v === "number") return v;
  if (typeof v === "string") {
    const normalized = v.replace(",", ".");
    const n = Number.parseFloat(normalized);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

function formatMoney(amount, currency) {
  const c = currency || "EUR";
  try {
    return new Intl.NumberFormat("de-DE", {
      style: "currency",
      currency: c,
    }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${c}`;
  }
}

function formatCommissionSum(items) {
  const sums = new Map(); // currency -> number

  for (const it of items || []) {
    if (isOrderCancelled(it)) continue;
    if (hasInternalDiscountCode(it)) continue;
    const amountRaw = it?.commission_amount;
    if (amountRaw == null) continue;

    const currency = it?.currency || "EUR";
    const amount = toNumber(amountRaw);
    const prev = sums.get(currency) || 0;
    sums.set(currency, prev + amount);
  }

  const parts = Array.from(sums.entries())
    .filter(([, amt]) => Number.isFinite(amt) && Math.abs(amt) > 0.0000001)
    .map(([cur, amt]) => formatMoney(amt, cur));

  if (!parts.length) return formatMoney(0, "EUR");
  return parts.join(" · ");
}

function formatCustomer(email) {
  const billingName = email?.billingName ?? null;
  const emailAddr = email?.email ?? null;

  if (billingName && String(billingName).trim()) {
    const name = String(billingName).trim();
    return name.length > 28 ? `${name.slice(0, 25)}…` : name;
  }

  if (!emailAddr) return "Kunde";
  const raw = String(emailAddr).split("@")[0]?.trim();
  if (!raw) return "Kunde";
  return raw.length > 20 ? `${raw.slice(0, 17)}…` : raw;
}

function formatActivityTime(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return "—";
  const now = new Date();
  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  );
  const startOfYesterday = new Date(startOfToday);
  startOfYesterday.setDate(startOfYesterday.getDate() - 1);
  const startOf7Days = new Date(startOfToday);
  startOf7Days.setDate(startOf7Days.getDate() - 7);

  const time = new Intl.DateTimeFormat("de-DE", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);

  if (date >= startOfToday) return time;
  if (date >= startOfYesterday && date < startOfToday) return time;
  if (date >= startOf7Days) {
    const weekday = new Intl.DateTimeFormat("de-DE", {
      weekday: "short",
    }).format(date);
    return `${weekday}, ${time}`;
  }

  return new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function deriveOrderStatus(financialStatuses, fulfillmentStatuses) {
  const fin = new Set(
    Array.from(financialStatuses || []).map((s) => String(s)),
  );
  const ful = new Set(
    Array.from(fulfillmentStatuses || []).map((s) => String(s)),
  );

  const hasAny = (set, values) => values.some((v) => set.has(v));

  if (hasAny(fin, ["refunded", "partially_refunded"])) {
    return { label: "Erstattet", tone: "danger" };
  }
  if (hasAny(fin, ["voided"])) {
    return { label: "Storniert", tone: "danger" };
  }
  if (hasAny(ful, ["fulfilled"])) {
    return { label: "Versendet", tone: "info" };
  }
  if (hasAny(fin, ["paid"])) {
    return { label: "Bezahlt", tone: "success" };
  }
  if (hasAny(fin, ["pending", "authorized"])) {
    return { label: "Offen", tone: "neutral" };
  }

  return { label: "In Bearbeitung", tone: "neutral" };
}

function isOrderCancelled(item) {
  const order = item?.shop_orders;
  const cancelledAt = Array.isArray(order)
    ? order?.[0]?.cancelled_at
    : order?.cancelled_at;
  return Boolean(cancelledAt);
}

function getBillingName(item) {
  const order = item?.shop_orders;
  const billingName = Array.isArray(order)
    ? order?.[0]?.billing_name
    : order?.billing_name;
  return billingName || null;
}

function getOrderKey(item) {
  return (
    item?.shop_order_id || item?.shopify_order_id || item?.order_name || null
  );
}

function hasInternalDiscountCode(item) {
  const code = item?.discount_code;
  if (!code) return false;
  return String(code).toUpperCase().includes("INTERNAL");
}

function countUniqueVisibleOrders(items) {
  const byOrder = new Map();

  for (const it of items || []) {
    const orderKey = getOrderKey(it);
    if (!orderKey) continue;

    const prev = byOrder.get(orderKey) || { cancelled: false, internal: false };
    byOrder.set(orderKey, {
      cancelled: prev.cancelled || isOrderCancelled(it),
      internal: prev.internal || hasInternalDiscountCode(it),
    });
  }

  let count = 0;
  for (const v of byOrder.values()) {
    if (!v.cancelled && !v.internal) count += 1;
  }
  return count;
}
