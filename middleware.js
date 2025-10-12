import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@/supabase/serverClient";

export async function middleware(request) {
  // Nur Routen unter /u schützen
  const { pathname } = request.nextUrl;
  if (!pathname.startsWith("/u")) return NextResponse.next();

  // Supabase Session prüfen
  const supabase = await createServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    const url = new URL("/login", request.url);
    url.searchParams.set("redirect", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/u/:path*"],
};


