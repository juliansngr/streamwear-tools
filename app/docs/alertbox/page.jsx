import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

const highlights = [
  "Alerts für Bestellungen, Follows oder Giveaways – direkt im Stream.",
  "Änderungen im Dashboard sind sofort live, ohne neu zu laden.",
  "Funktioniert in gängigen Streaming-Tools wie OBS/Streamlabs.",
  "Farben, Sounds und Animationen kannst du selbst anpassen.",
];

const setup = [
  "Im Dashboard „Alertbox“ öffnen und verbinden.",
  "Den bereitgestellten Link in deiner Streaming-Software einfügen.",
  "Farben, Sounds und Animationen nach Geschmack einstellen.",
  "Einen Test-Alert auslösen, um alles zu checken.",
];

const tuning = [
  "Lautstärke an dein Setup anpassen.",
  "Reihenfolge steuern: alles nacheinander oder gestapelt.",
  "Filter setzen, wenn du bestimmte Alerts ausblenden willst.",
  "Design jederzeit ändern – es wirkt sofort im Stream.",
];

export default function AlertboxDocsPage() {
  return (
    <div className="flex flex-col gap-8">
      <header className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Docs / Alertbox</p>
        <h1 className="text-3xl font-semibold leading-tight">Alertbox</h1>
        <p className="text-muted-foreground">
          Richte in Minuten deine Alerts ein – ohne Technik-Kauderwelsch und sofort stream-ready.
        </p>
      </header>

      <Card className="border-default/80 bg-[color-mix(in_hsl,var(--card),black_2%)]">
        <CardHeader>
          <CardTitle>Was dir die Alertbox bringt</CardTitle>
          <CardDescription>Die wichtigsten Vorteile im Überblick.</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
            {highlights.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card className="border-default/80 bg-[color-mix(in_hsl,var(--card),black_2%)]">
        <CardHeader>
          <CardTitle>Schnellstart</CardTitle>
          <CardDescription>Von Null zur ersten Alert-Einblendung.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <ol className="list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
            {setup.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
          <Separator />
          <div className="space-y-2">
            <p className="text-sm font-medium">Best Practice</p>
            <p className="text-sm text-muted-foreground">
              Platziere die Quelle so, dass sie in allen Szenen sichtbar ist. Nach Anpassungen kurz einen
              Test-Alert schicken, damit alles passt.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="border-default/80 bg-[color-mix(in_hsl,var(--card),black_2%)]">
        <CardHeader>
          <CardTitle>Feintuning</CardTitle>
          <CardDescription>Tipps für Audio, Reihenfolge und Filter.</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
            {tuning.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}


