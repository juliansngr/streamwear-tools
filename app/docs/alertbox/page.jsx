import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

const highlights = [
  "Ein Overlay-Link zum Kopieren – sofort in OBS/Streamlabs nutzbar.",
  "Eigenen Alert-Text mit Platzhalter für den Twitch-Namen festlegen.",
  "Live-Vorschau im Dashboard, damit du siehst, was Zuschauer sehen.",
  "Design anpassbar: Farben, Text, Button-States (z. B. Kopieren/Speichern).",
];

const setup = [
  "Im Dashboard „Alertbox“ öffnen und den Overlay-Link kopieren.",
  "In OBS/Streamlabs eine neue Browser-Quelle anlegen und den Link einfügen.",
  "Breite auf 800 px setzen (empfohlen), Höhe passt sich automatisch an.",
  "Optional: Quelle bei Nicht-Sichtbarkeit deaktivieren, um CPU zu sparen.",
  "Bei Textänderungen die Quelle/Scene kurz neu laden, damit alles aktualisiert.",
];

const tuning = [
  "Alert-Text mit {{TwitchUserName}} personalisieren.",
  "Buttons (Kopieren/Speichern) und Link-Bereich klar beschriften.",
  "Vorschau nutzen, um Farben/Abstände schnell zu prüfen.",
  "Wenn etwas nicht angezeigt wird: Quelle einmal neu laden.",
];

export default function AlertboxDocsPage() {
  return (
    <div className="flex flex-col gap-8">
      <header className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Docs / Alertbox
        </p>
        <h1 className="text-3xl font-semibold leading-tight">Alertbox</h1>
        <p className="text-muted-foreground">
          Erstelle in Minuten deine Alertbox: Link kopieren, Text setzen,
          Vorschau checken und direkt im Stream nutzen.
        </p>
      </header>

      <Card className="border-default/80 bg-[color-mix(in_hsl,var(--card),black_2%)]">
        <CardHeader>
          <CardTitle>Was dir die Alertbox bringt</CardTitle>
          <CardDescription>
            Die wichtigsten Vorteile im Überblick.
          </CardDescription>
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
          <CardDescription>
            Von Null zur ersten Alert-Einblendung.
          </CardDescription>
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
              Platziere die Quelle so, dass sie in allen Szenen sichtbar ist.
              Nach Anpassungen kurz einen Test-Alert schicken, damit alles
              passt.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="border-default/80 bg-[color-mix(in_hsl,var(--card),black_2%)]">
        <CardHeader>
          <CardTitle>Feintuning</CardTitle>
          <CardDescription>
            Tipps für Audio, Reihenfolge und Filter.
          </CardDescription>
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
