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

export async function GET(request) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  const url = new URL(request.url);
  const q = (url.searchParams.get("q") || "").trim();
  const limitRaw = Number.parseInt(url.searchParams.get("limit") || "50", 10);
  const limit = Number.isFinite(limitRaw)
    ? Math.min(Math.max(limitRaw, 1), 200)
    : 50;

  let query = supabaseAdmin
    .from("profiles")
    .select(
      "uuid, user_id, created_at, display_name, twitch_username, collection_handle, role",
    )
    .order("created_at", { ascending: false })
    .limit(limit);

  if (q) {
    const escaped = q.replace(/,/g, " ").slice(0, 80);
    const like = `%${escaped}%`;
    query = query.or(
      `display_name.ilike.${like},twitch_username.ilike.${like},collection_handle.ilike.${like}`,
    );
  }

  const { data, error } = await query;
  if (error) {
    console.error("[admin/profiles] list error", { q, limit, error });
    return NextResponse.json({ error: "failed_to_load_profiles" }, { status: 500 });
  }

  return NextResponse.json({ profiles: data || [] });
}

