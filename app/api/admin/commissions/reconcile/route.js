import { NextResponse } from "next/server";
import { createClient } from "@/supabase/serverClient";
import { supabaseAdmin } from "@/supabase/supabaseAdmin";

export const runtime = "nodejs";

async function requireAdmin() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const userId = data?.user?.id;

  if (!userId) {
    return {
      ok: false,
      response: NextResponse.json({ error: "unauthorized" }, { status: 401 }),
    };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();

  const isAdmin = String(profile?.role || "").trim().toLowerCase() === "admin";
  if (!isAdmin) {
    return {
      ok: false,
      response: NextResponse.json({ error: "forbidden" }, { status: 403 }),
    };
  }

  return { ok: true };
}

function isoDaysAgo(days) {
  const d = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  return d.toISOString();
}

export async function POST(request) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  let body = null;
  try {
    body = await request.json();
  } catch {
    body = null;
  }

  const dryRun = Boolean(body?.dryRun);
  const days = Number.isFinite(Number(body?.days)) ? Math.max(1, Number(body.days)) : 14;
  const cutoff = isoDaysAgo(days);

  if (dryRun) {
    // IMPORTANT: start with select(), then apply filters (Supabase filter builder API).
    // Filter: only locked commissions that are fulfilled long enough ago.
    // Also exclude cancelled/refunded items to avoid accidental promotion.
    try {
      const q = supabaseAdmin
        .from("shop_order_items")
        .select("id", { count: "exact", head: true })
        .eq("commission_status", "locked")
        .not("fulfilled_at", "is", null)
        .lt("fulfilled_at", cutoff)
        .eq("is_cancelled", false)
        .eq("is_refunded", false);

      const { count, error } = await q;
      if (error) {
        return NextResponse.json(
          { ok: false, error: error.message, dryRun: true, days, cutoff },
          { status: 500 },
        );
      }

      return NextResponse.json({
        ok: true,
        dryRun: true,
        days,
        cutoff,
        toPromote: count || 0,
      });
    } catch (err) {
      return NextResponse.json(
        { ok: false, error: String(err), dryRun: true, days, cutoff },
        { status: 500 },
      );
    }
  }

  // IMPORTANT: start with update(), then apply filters.
  try {
    const q = supabaseAdmin
      .from("shop_order_items")
      .update({ commission_status: "available" })
      .eq("commission_status", "locked")
      .not("fulfilled_at", "is", null)
      .lt("fulfilled_at", cutoff)
      .eq("is_cancelled", false)
      .eq("is_refunded", false)
      .select("id");

    const { data, error } = await q;
    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message, dryRun: false, days, cutoff },
        { status: 500 },
      );
    }

    return NextResponse.json({
      ok: true,
      dryRun: false,
      days,
      cutoff,
      promoted: Array.isArray(data) ? data.length : 0,
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: String(err), dryRun: false, days, cutoff },
      { status: 500 },
    );
  }
}

