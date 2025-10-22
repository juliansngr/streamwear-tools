import Image from "next/image";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function BlogSection({ posts }) {
  const demoPosts = [
    {
      title: "Wie Creator Merch skalieren",
      excerpt: "Strategien, mit denen du Reichweite in nachhaltige Umsätze wandelst.",
      href: "https://streamwear.shop/blog",
      image: "/WUPG2.jpg",
    },
    {
      title: "Alertbox Best Practices",
      excerpt: "So bindest du Live‑Käufe ein, ohne dein Overlay zu überladen.",
      href: "https://streamwear.shop/blog",
      image: "/G3NQRzJXQAAvauR.jpeg",
    },
    {
      title: "Drops, Preorder oder On‑Demand?",
      excerpt: "Vergleich der Modelle – was passt zu deiner Community?",
      href: "https://streamwear.shop/blog",
      image: "/biganttow.png",
    },
  ];

  const items = Array.isArray(posts) && posts.length > 0 ? posts.slice(0, 6) : demoPosts;

  return (
    <section id="blog" className="mx-auto max-w-6xl px-4 py-14 sm:py-20">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="text-2xl font-semibold sm:text-3xl">Aus dem Blog</h2>
        <p className="mt-2 text-[var(--muted-foreground)]">Updates, Guides und Insights für Creator und Brands.</p>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-3">
        {items.map((post, idx) => (
          <Card key={post.href + idx} className="group overflow-hidden">
            <div className="relative h-44 w-full overflow-hidden border-b border-default bg-[var(--muted)]">
              <Image
                src={post.image || "/next.svg"}
                alt={post.title}
                fill
                sizes="(max-width: 640px) 100vw, 33vw"
                className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                priority={idx === 0}
              />
              <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0)_40%,rgba(0,0,0,0.22)_100%)]" />
            </div>
            <CardHeader>
              <CardTitle className="line-clamp-2">{post.title}</CardTitle>
              {post.excerpt ? (
                <CardDescription className="line-clamp-2">{post.excerpt}</CardDescription>
              ) : null}
            </CardHeader>
            <CardContent className="pt-0">
              <div className="h-0.5 w-12 rounded-full bg-[color-mix(in_hsl,var(--muted),white_10%)]" />
            </CardContent>
            <CardFooter className="pt-0">
              <Button asChild size="md">
                <Link href={post.href} target="_blank" rel="noopener" title={post.title} aria-label={`Beitrag lesen: ${post.title}`}>Beitrag lesen</Link>
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </section>
  );
}


