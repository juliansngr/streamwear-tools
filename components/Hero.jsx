import { Button } from "@/components/ui/button";
import Link from "next/link";

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-hero pointer-events-none" />
      <div className="relative mx-auto max-w-6xl px-4 py-20 text-center sm:py-28">
        <h1 className="mx-auto max-w-3xl text-4xl font-semibold tracking-tight sm:text-6xl">
          Tools, die deine Streaming-Brand skalieren
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-balance text-[var(--muted-foreground)] sm:mt-6">
          Streamwear Tools liefert dir moderne Utilities für Merch, Automatisierung und Wachstum –
          optimiert für Creator und Teams.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button asChild size="lg">
            <Link href="https://streamwear.shop/pages/partner-werden" target="_blank" rel="noopener noreferrer">Partner werden</Link>
          </Button>
          <Button asChild variant="ghost" size="lg">
            <Link href="#features">Mehr erfahren</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}


