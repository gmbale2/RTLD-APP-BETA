const DOMAIN  = process.env.EXPO_PUBLIC_SHOPIFY_DOMAIN ?? "return-of-the-living-dead.myshopify.com";
const TOKEN   = process.env.EXPO_PUBLIC_SHOPIFY_TOKEN  ?? "7558abd07055ec298b422f83c2029321";
const API_URL = `https://${DOMAIN}/api/2026-04/graphql.json`;

function withUTM(url: string, campaign: string): string {
  const u = new URL(url);
  u.searchParams.set("utm_source", "rtld_app");
  u.searchParams.set("utm_medium", "app");
  u.searchParams.set("utm_campaign", campaign);
  return u.toString();
}

async function sfFetch(query: string, variables?: Record<string, unknown>): Promise<any> {
  const res = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Storefront-Access-Token": TOKEN,
    },
    body: JSON.stringify({ query, variables }),
  });
  if (!res.ok) throw new Error(`Shopify ${res.status}`);
  const json = await res.json();
  return json.data;
}

function formatMoney(amount: string, currencyCode = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currencyCode,
    minimumFractionDigits: 2,
  }).format(parseFloat(amount));
}

// ── Products ──────────────────────────────────────────────────────────────────

export interface ShopifyProduct {
  id:             string;
  title:          string;
  productType:    string;
  handle:         string;
  price:          string;
  compareAtPrice: string | null;
  imageUrl:       string | null;
  url:            string;
}

const PRODUCTS_QUERY = `
  query CollectionProducts($handle: String!, $first: Int!) {
    collection(handle: $handle) {
      products(first: $first) {
        edges {
          node {
            id
            title
            productType
            handle
            featuredImage { url }
            priceRange { minVariantPrice { amount currencyCode } }
            compareAtPriceRange { minVariantPrice { amount } }
          }
        }
      }
    }
  }
`;

export async function fetchCollectionProducts(
  handle: string,
  first = 20,
): Promise<ShopifyProduct[]> {
  try {
    const data = await sfFetch(PRODUCTS_QUERY, { handle, first });
    return (data?.collection?.products?.edges ?? []).map(({ node }: any) => {
      const { amount, currencyCode } = node.priceRange.minVariantPrice;
      const cmpAmount = node.compareAtPriceRange?.minVariantPrice?.amount ?? null;
      const onSale = cmpAmount && parseFloat(cmpAmount) > parseFloat(amount);
      return {
        id:             node.id,
        title:          node.title,
        productType:    (node.productType || "PRODUCT").toUpperCase(),
        handle:         node.handle,
        price:          formatMoney(amount, currencyCode),
        compareAtPrice: onSale ? formatMoney(cmpAmount, currencyCode) : null,
        imageUrl:       node.featuredImage?.url ?? null,
        url:            withUTM(`https://${DOMAIN}/products/${node.handle}`, "store"),
      };
    });
  } catch {
    return [];
  }
}

// ── Blog articles ─────────────────────────────────────────────────────────────

export interface ShopifyArticle {
  id:          string;
  title:       string;
  excerpt:     string;
  publishedAt: string;
  handle:      string;
  imageUrl:    string | null;
  url:         string;
  tags:        string[];
}

const ARTICLES_QUERY = `
  query BlogArticles($handle: String!, $first: Int!) {
    blog(handle: $handle) {
      articles(first: $first, sortKey: PUBLISHED_AT, reverse: true) {
        edges {
          node {
            id
            title
            excerpt
            publishedAt
            handle
            tags
            image { url }
          }
        }
      }
    }
  }
`;

export async function fetchBlogArticles(
  blogHandle: string,
  first = 30,
): Promise<ShopifyArticle[]> {
  try {
    const data = await sfFetch(ARTICLES_QUERY, { handle: blogHandle, first });
    return (data?.blog?.articles?.edges ?? []).map(({ node }: any) => ({
      id:          node.id,
      title:       node.title,
      excerpt:     node.excerpt ?? "",
      publishedAt: node.publishedAt,
      handle:      node.handle,
      imageUrl:    node.image?.url ?? null,
      url:         withUTM(`https://${DOMAIN}/blogs/${blogHandle}/${node.handle}`, "tarman_today"),
      tags:        node.tags ?? [],
    }));
  } catch {
    return [];
  }
}
