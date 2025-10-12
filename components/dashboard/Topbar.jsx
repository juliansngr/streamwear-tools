"use client";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { createBrowserClient } from "@/lib/supabase/browserClient";

export function Topbar() {
  async function logout() {
    try {
      const supabase = createBrowserClient();
      await supabase.auth.signOut();
      if (typeof window !== "undefined") window.location.href = "/";
    } catch {}
  }

  return (
    <header className="sticky top-0 z-40 w-full border-b border-default bg-[color-mix(in_hsl,var(--background),transparent_10%)]/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <Link href="/u/dashboard" className="flex items-center gap-3">
          <Image src="/SW_LOGO.webp" alt="Streamwear" width={110} height={28} />
          <span className="text-sm text-[var(--muted-foreground)]">Tools</span>
        </Link>
        <div className="flex items-center gap-2">
          <Button onClick={logout}>Logout</Button>
        </div>
      </div>
    </header>
  );
}


