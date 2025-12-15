"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const links = [
  { href: "/docs", label: "Übersicht" },
  { href: "/docs/alertbox", label: "Alertbox" },
  { href: "/docs/giveaways", label: "Giveaways" },
];

export default function DocsSidebar() {
  const pathname = usePathname();

  return (
    <nav className="sticky top-8 flex flex-col gap-1 rounded-[var(--radius-md)] border border-default bg-[color-mix(in_hsl,var(--card),black_2%)] p-3 text-sm">
      <p className="px-2 pb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        Inhalte
      </p>
      {links.map((link) => {
        const active = pathname === link.href;
        return (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              "flex items-center justify-between rounded-md px-2 py-1.5 transition hover:bg-[color-mix(in_hsl,var(--muted),black_6%)]",
              active && "bg-[color-mix(in_hsl,var(--muted),black_6%)] text-foreground font-medium border border-default/70"
            )}
          >
            {link.label}
            {active && <span className="text-[10px] text-primary">●</span>}
          </Link>
        );
      })}
    </nav>
  );
}


