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

const EDITABLE_FIELDS = new Set([
  "display_name",
  "twitch_username",
  "collection_handle",
  "alertbox_text",
  "features",
  "role",
]);

function normalizeRole(v) {
  const r = String(v || "").trim().toLowerCase();
  if (r === "admin") return "admin";
  return "streamer";
}

export async function GET(_request, context) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  const params = await context.params;
  const targetUserId = params?.userId;
  if (!targetUserId) {
    return NextResponse.json({ error: "missing_userId" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select("*")
    .eq("user_id", targetUserId)
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("[admin/profiles] get error", { targetUserId, error });
    return NextResponse.json({ error: "failed_to_load_profile" }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  return NextResponse.json({ profile: data });
}

export async function PATCH(request, context) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  const params = await context.params;
  const targetUserId = params?.userId;
  if (!targetUserId) {
    return NextResponse.json({ error: "missing_userId" }, { status: 400 });
  }

  let body = null;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const updatesRaw = body?.updates || {};
  if (!updatesRaw || typeof updatesRaw !== "object") {
    return NextResponse.json({ error: "missing_updates" }, { status: 400 });
  }

  const updates = {};
  for (const [k, v] of Object.entries(updatesRaw)) {
    if (!EDITABLE_FIELDS.has(k)) continue;
    updates[k] = v;
  }

  if ("role" in updates) {
    updates.role = normalizeRole(updates.role);
  }

  if (!Object.keys(updates).length) {
    return NextResponse.json({ error: "no_allowed_fields" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("profiles")
    .update(updates)
    .eq("user_id", targetUserId)
    .select("*")
    .maybeSingle();

  if (error) {
    console.error("[admin/profiles] update error", { targetUserId, updates, error });
    return NextResponse.json({ error: "failed_to_update_profile" }, { status: 500 });
  }

  return NextResponse.json({ profile: data });
}

