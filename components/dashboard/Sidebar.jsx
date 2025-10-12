"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { BellRing, BarChart3, Bot, Gift, Bell, House } from "lucide-react";

const NAV = [
  { href: "/u/dashboard", label: "Dashboard", icon: House },
  { href: "/u/alertbox", label: "Alertbox", icon: BellRing },
  { href: "/u/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/u/chatbot", label: "Chatbot", icon: Bot },
  { href: "/u/giveaways", label: "Giveaways", icon: Gift },
  { href: "/u/notifications", label: "Benachrichtigungen", icon: Bell },
];

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="sticky top-4 h-fit w-56 shrink-0 rounded-[var(--radius-md)] border border-default bg-[color-mix(in_hsl,var(--muted),black_6%)] p-2">
      <div className="px-2 py-2 text-xs uppercase tracking-wide text-[var(--muted-foreground)]">Features</div>
      <nav className="grid gap-1">
        {NAV.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href;
          return (
            <Button key={href} variant="ghost" asChild className={`justify-start gap-2 w-full ${isActive ? "bg-[var(--muted)]/60 ring-1 ring-[#9146ff]/30" : ""}`}>
              <Link href={href}>
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            </Button>
          );
        })}
      </nav>
    </aside>
  );
}


