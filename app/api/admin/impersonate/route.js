import { NextResponse } from "next/server";
import { createClient } from "@/supabase/serverClient";
import { supabaseAdmin } from "@/supabase/supabaseAdmin";

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

  const targetUserId = body?.userId;
  if (!targetUserId || typeof targetUserId !== "string") {
    return NextResponse.json({ error: "missing_userId" }, { status: 400 });
  }

  const { data: authUser, error: authUserError } =
    await supabaseAdmin.auth.admin.getUserById(targetUserId);
  if (authUserError) {
    return NextResponse.json({ error: "auth_user_not_found" }, { status: 404 });
  }

  const email = authUser?.user?.email;
  if (!email) {
    return NextResponse.json({ error: "target_user_has_no_email" }, { status: 400 });
  }

  const origin = new URL(request.url).origin;
  // IMPORTANT: redirect to auth callback so we can exchange code for session
  // before hitting /u routes (which are middleware-protected).
  const redirectTo = `${origin}/auth/callback`;

  const { data: linkData, error: linkError } =
    await supabaseAdmin.auth.admin.generateLink({
      type: "magiclink",
      email,
      options: { redirectTo },
    });

  if (linkError) {
    return NextResponse.json({ error: "failed_to_generate_link" }, { status: 500 });
  }

  const actionLink = linkData?.properties?.action_link || null;
  if (!actionLink) {
    return NextResponse.json({ error: "missing_action_link" }, { status: 500 });
  }

  return NextResponse.json({ actionLink });
}

