import { Button } from "@/components/ui/button";
import Link from "next/link";

export function CTA() {
  return (
    <section id="cta" className="mx-auto max-w-6xl px-4 py-14 sm:py-20">
      <div className="rounded-[var(--radius-lg)] border border-default bg-[var(--muted)] p-8 text-center sm:p-12">
        <h3 className="text-2xl font-semibold">Exklusiv für Partner</h3>
        <p className="mx-auto mt-2 max-w-xl text-[var(--muted-foreground)]">Invite only. Bewirb dich jetzt als Partner und erhalte Zugang zu Streamwear Tools.</p>
        <div className="mt-6 flex items-center justify-center gap-3">
          <Button asChild size="lg">
            <Link href="https://streamwear.shop/pages/partner-werden" target="_blank" rel="noopener noreferrer">Partner werden</Link>
          </Button>
          <Button asChild size="lg" variant="ghost">
            <Link href="#features">Features ansehen</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}


