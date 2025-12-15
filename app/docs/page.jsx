import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const links = [
  {
    href: "/docs/alertbox",
    title: "Alertbox",
    badge: "Beta",
    description:
      "Alerts, die sofort im Stream landen. Schnell eingerichtet, sofort einsatzbereit.",
  },
  {
    href: "/docs/giveaways",
    title: "Giveaways",
    badge: "Alpha",
    description:
      "Gewinnspiele starten, Gewinner ziehen und den Einlöse-Link teilen – alles an einem Ort.",
  },
];

export default function DocsPage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-5 py-12">
        <header className="space-y-3">
          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-default/60 bg-[color-mix(in_hsl,var(--muted),black_4%)] px-3 py-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Docs
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              Streamwear Handbuch
            </h1>
            <p className="max-w-3xl text-muted-foreground">
              Kurze, praxisnahe Guides zu jedem Feature. Wähle ein Kapitel in der
              Seitenleiste oder starte hier.
            </p>
          </div>
        </header>

        <section className="grid gap-4 sm:grid-cols-2">
          {links.map((item) => (
            <Link key={item.href} href={item.href}>
              <Card className="h-full border-default/80 bg-[color-mix(in_hsl,var(--card),black_2%)] transition hover:-translate-y-0.5 hover:border-default">
                <CardHeader className="flex flex-row items-start justify-between gap-3">
                  <div className="space-y-1.5">
                    <CardTitle className="text-xl">{item.title}</CardTitle>
                    <CardDescription>{item.description}</CardDescription>
                  </div>
                  <span className="inline-flex items-center rounded-full border border-default/60 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    {item.badge}
                  </span>
                </CardHeader>
                <CardContent className="pt-0 text-sm text-primary">
                  Weiterlesen →
                </CardContent>
              </Card>
            </Link>
          ))}
        </section>
      </div>
    </main>
  );
}

