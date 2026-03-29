import { NextResponse } from "next/server";
import { createClient } from "@/supabase/serverClient";
import { supabaseAdmin } from "@/supabase/supabaseAdmin";
import { getPublicTableColumns } from "@/lib/shopify-webhook/persist/dbColumnsCache";

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

export async function POST(request) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  let body = null;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const email = String(body?.email || "").trim().toLowerCase();
  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "invalid_email" }, { status: 400 });
  }

  const profile =
    body?.profile && typeof body.profile === "object" ? body.profile : {};

  const desiredRoleRaw = String(profile?.role || "streamer").trim().toLowerCase();
  const desiredRole =
    desiredRoleRaw === "admin" ? "admin" : "streamer";

  const origin = new URL(request.url).origin;
  const redirectTo = `${origin}/u/dashboard`;

  let invitedUserId = null;
  const admin = supabaseAdmin.auth.admin;

  try {
    if (typeof admin.inviteUserByEmail === "function") {
      const { data, error } = await admin.inviteUserByEmail(email, { redirectTo });
      if (error) {
        // Wenn User bereits existiert, versuchen wir trotzdem einen Magic-Link zu generieren.
        console.warn("[admin/invite] inviteUserByEmail error", { email, error });
      }
      invitedUserId = data?.user?.id || null;
    }
  } catch (err) {
    console.warn("[admin/invite] inviteUserByEmail threw", { email, err });
  }

  // Profil-Row upserten (falls wir eine user_id bekommen haben)
  if (invitedUserId) {
    // IMPORTANT: Felder mit DB-Defaults (z.B. features/alertbox_text) nicht als null überschreiben,
    // sondern weglassen, damit Defaults greifen.
    const nextProfile = { user_id: invitedUserId, role: desiredRole };
    if (profile?.display_name != null) nextProfile.display_name = profile.display_name;
    if (profile?.twitch_username != null) nextProfile.twitch_username = profile.twitch_username;
    if (profile?.collection_handle != null) nextProfile.collection_handle = profile.collection_handle;
    if (profile?.alertbox_text != null) nextProfile.alertbox_text = profile.alertbox_text;
    if (profile?.features != null) nextProfile.features = profile.features;
    const cols = await getPublicTableColumns("profiles");
    if (cols?.has?.("commission_rate") && profile?.commission_rate != null) {
      const raw = profile.commission_rate;
      const n =
        typeof raw === "number" ? raw : Number.parseFloat(String(raw).replace(",", "."));
      if (Number.isFinite(n)) nextProfile.commission_rate = Math.min(1, Math.max(0, n));
    }

    // user_id scheint bei dir nicht unique zu sein -> kein ON CONFLICT möglich.
    // Daher: existiert ein Profil? -> update, sonst insert.
    const { data: existing, error: existingErr } = await supabaseAdmin
      .from("profiles")
      .select("uuid")
      .eq("user_id", invitedUserId)
      .limit(1)
      .maybeSingle();

    if (existingErr) {
      console.warn("[admin/invite] profile lookup error", { invitedUserId, existingErr });
    } else if (existing?.uuid) {
      const { error: updateErr } = await supabaseAdmin
        .from("profiles")
        .update(nextProfile)
        .eq("uuid", existing.uuid);
      if (updateErr) {
        console.warn("[admin/invite] profile update error", { invitedUserId, updateErr });
      }
    } else {
      const { error: insertErr } = await supabaseAdmin
        .from("profiles")
        .insert(nextProfile);
      if (insertErr) {
        console.warn("[admin/invite] profile insert error", { invitedUserId, insertErr });
      }
    }
  }

  // Zusätzlich: Magic-Link generieren (zum direkten Einloggen / Teilen)
  const { data: linkData, error: linkError } = await admin.generateLink({
    type: "magiclink",
    email,
    options: { redirectTo },
  });

  if (linkError) {
    console.error("[admin/invite] generateLink error", { email, linkError });
    return NextResponse.json({ error: "failed_to_generate_link" }, { status: 500 });
  }

  const actionLink = linkData?.properties?.action_link || null;
  return NextResponse.json({ actionLink, email, role: desiredRole });
}

