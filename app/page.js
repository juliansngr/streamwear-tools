import { Navbar } from "@/components/Navbar";
import { Hero } from "@/components/Hero";
import { Features } from "@/components/Features";
import { CTA } from "@/components/CTA";
import { BlogSection } from "@/components/BlogSection";
import { Footer } from "@/components/Footer";
import { getShopifyBlogPosts } from "@/lib/shopify";

export default async function Home() {
  const posts = await getShopifyBlogPosts({ first: 6 });
  return (
    <div className="min-h-screen">
      <Navbar />
      <main>
        <Hero />
        <Features />
        <CTA />
        <BlogSection posts={posts} />
      </main>
      <Footer />
    </div>
  );
}
