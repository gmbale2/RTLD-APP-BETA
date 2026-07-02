import { ShopifyArticle } from "./shopify";

let _articles: ShopifyArticle[] = [];

export function setArticles(articles: ShopifyArticle[]) {
  _articles = articles;
}

export function getArticleById(id: string): ShopifyArticle | null {
  return _articles.find((a) => a.id === id) ?? null;
}
