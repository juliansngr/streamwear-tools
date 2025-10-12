"use client";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { LoginButton } from "@/components/LoginButton";

export function Navbar() {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-default bg-[color-mix(in_hsl,var(--background),transparent_10%)]/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-3">
          <Image src="/SW_LOGO.webp" alt="Streamwear" width={120} height={32} />
          <span className="hidden text-sm text-[var(--muted-foreground)] sm:inline">Tools</span>
        </Link>
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost">
            <Link href="#features">Features</Link>
          </Button>
          <LoginButton />
        </div>
      </div>
    </header>
  );
}


