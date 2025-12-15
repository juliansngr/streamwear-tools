import Image from "next/image";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

const walkthrough = [
  {
    title: "Checkout: Giveaway Bestellung",
    description:
      "Beim Checkout kann der Käufer hier einen Haken setzen, damit diese Bestellung ein Giveaway auslöst.",
    image: "/docs/giveaways/giveaway_1.webp",
    alt: "Checkout mit Checkbox für Giveaway",
  },
  {
    title: "Wo finde ich Giveaways?",
    description:
      "Im Dashboard findest du links in der Sidebar den Tab „Giveaways“. Dort siehst du alle aktuellen Giveaways und ihren Status.",
    image: "/docs/giveaways/giveaway_2.webp",
    alt: "Dashboard Sidebar mit Giveaways Tab",
  },
  {
    title: "Übersicht deiner Giveaways",
    description:
      "In der Übersicht siehst du alle verfügbaren Giveaways sowie deren Status",
    image: "/docs/giveaways/giveaway_3.webp",
    alt: "Giveaway Übersichtsliste",
  },
  {
    title: "Popup zum Giveaway öffnen",
    description:
      "Sobald du auf 'Verlosung öffnen' klickst, wird das Giveaway in einem Popup geöffnet. Hier kannst du den Teilnahme-Command eingeben, die Laufzeit des Giveaways festlegen und die Verlosung starten.",
    image: "/docs/giveaways/giveaway_4.webp",
    alt: "Giveaway Detail Popup",
  },
  {
    title: "Während der Verlosung",
    description:
      "Sobald der Timer läuft, werden dir alle registrierten Teilnehmer live angezeigt. Eine erfolgreiche Teilnahme wird auch im Twitch Chat mit einem ✅ von unserem Bot bestätigt.",
    image: "/docs/giveaways/giveaway_5.webp",
    alt: "Popup während die Verlosung läuft",
  },
  {
    title: "Timer abgelaufen",
    description:
      "Sobald der Timer abgelaufen ist, kannst du aus allen registrierten Teilnehmern einen Gewinner ziehen. Dieser wird dir sowohl im Popup als auch im Twitch Chat angezeigt. So lange noch kein Gewinner gezogen wurde, hättest du auch die Möglichkeit das Giveaway erneut zu starten.",
    image: "/docs/giveaways/giveaway_6.webp",
    alt: "Popup nach Ende ohne Gewinner",
  },
  {
    title: "Wie kann der Gewinner seinen Gewinn einlösen?",
    description:
      "Nach der Ziehung wird dir unterhalb des Gewinners ein Link angezeigt, mit dem der Gewinner seinen Gewinn einlösen kann. Kopiere diesen einfach und teile ihn mit dem Gewinner. (Sollte der Link nicht sofort erscheinen, lade die Seite einfach neu.)",
    image: "/docs/giveaways/giveaway_7.webp",
    alt: "Gewinner gezogen mit Redeem Link",
  },
  {
    title: "Wie sieht die Redeem-Seite für den Gewinner aus?",
    description:
      "Der Gewinner kann über den Link seinen Gewinn einlösen. Hier kann er eine Produktvariante auswählen, Versanddaten eingeben und den Vorgang abschließen. Danach gilt der Gewinn als eingelöst.",
    image: "/docs/giveaways/giveaway_8.webp",
    alt: "Redeem Seite zum Einlösen",
  },
];

export default function GiveawaysDocsPage() {
  return (
    <div className="flex flex-col gap-8">
      <header className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Docs / Giveaways
        </p>
        <h1 className="text-3xl font-semibold leading-tight">Giveaways</h1>
        <p className="text-muted-foreground">
          Mit dem neuen Giveaway-Feature können deine Zuschauer andere Leute aus
          deiner Community beschenken - sie unterstützen damit nicht nur dich,
          sondern machen auch jemand anderem im Stream eine Freude. 🥳
          Aktivierte Käufe werden automatisch als Giveaways in deinem
          Giveaway-Dashboard angezeigt, und du kannst sie dort mit einem Klick
          starten, deine Community per Chat-Command teilnehmen lassen und am
          Ende bequem einen Gewinner ziehen und die Versanddaten eintragen.
        </p>
      </header>

      <Card className="border-default/80 bg-[color-mix(in_hsl,var(--card),black_2%)]">
        <CardHeader>
          <CardTitle>Schritt für Schritt mit Bildern</CardTitle>
          <CardDescription>So nutzt du Giveaways</CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          {walkthrough.map((step) => (
            <div key={step.title} className="grid gap-3">
              <div className="space-y-1">
                <h3 className="text-lg font-semibold">{step.title}</h3>
                <p className="text-sm text-muted-foreground">
                  {step.description}
                </p>
              </div>
              <div className="overflow-hidden rounded-lg border border-default/70 bg-[color-mix(in_hsl,var(--card),black_1%)]">
                <Image
                  src={step.image}
                  alt={step.alt}
                  width={1600}
                  height={900}
                  className="h-auto w-full"
                  priority={step.image === "/giveaway_1.webp"}
                />
              </div>
              <Separator />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
