const SHOPIFY_DOMAIN = process.env.SHOPIFY_STORE_DOMAIN;
// Bevorzuge den PUBLIC Token; fallback auf generisch, aber NIEMALS den Admin/Private-Token verwenden
const SHOPIFY_TOKEN = process.env.SHOPIFY_STOREFRONT_PUBLIC_TOKEN || process.env.SHOPIFY_STOREFRONT_TOKEN;
const SHOPIFY_API_VERSION = process.env.SHOPIFY_API_VERSION || "2024-10";

async function shopifyStorefront(query, variables = {}) {
  if (!SHOPIFY_DOMAIN || !SHOPIFY_TOKEN) {
    return { data: null, errors: [{ message: "Missing Shopify env" }] };
  }
  const res = await fetch(`https://${SHOPIFY_DOMAIN}/api/${SHOPIFY_API_VERSION}/graphql.json`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Storefront-Access-Token": SHOPIFY_TOKEN,
    },
    body: JSON.stringify({ query, variables }),
    // Cache für statische Home-Seite ok, kann vom Nutzer angepasst werden
    next: { revalidate: 1800 },
  });
  if (!res.ok) {
    return { data: null, errors: [{ message: `HTTP ${res.status}` }] };
  }
  return res.json();
}

export async function getShopifyBlogPosts({ blogHandle, first = 6 } = {}) {
  const handle = blogHandle || process.env.SHOPIFY_BLOG_HANDLE || "news";
  const query = /* GraphQL */ `
    query BlogArticles($handle: String!, $first: Int!) {
      blog(handle: $handle) {
        articles(first: $first, sortKey: PUBLISHED_AT, reverse: true) {
          edges {
            node {
              id
              title
              excerpt
              handle
              onlineStoreUrl
              image { url altText }
            }
          }
        }
      }
    }
  `;
  const { data, errors } = await shopifyStorefront(query, { handle, first });
  if (errors || !data?.blog?.articles?.edges) return [];
  const domainForFallback = process.env.SHOPIFY_STORE_DOMAIN || SHOPIFY_DOMAIN;
  return data.blog.articles.edges.map(({ node }) => {
    const href = node.onlineStoreUrl || (domainForFallback ? `https://${domainForFallback}/blogs/${handle}/${node.handle}` : "#");
    return {
      title: node.title,
      excerpt: node.excerpt,
      href,
      image: node.image?.url || null,
    };
  });
}


