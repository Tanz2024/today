// Development audit: lists MDX stories with no desk-page, topic-hub or
// related-card links. Appwrite stories need the running app's catalogue, so
// this offline check covers the MDX library.
//   npm run audit:orphans
import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { CATEGORIES } from "../lib/categories.ts";
import { auditInboundLinks } from "../lib/orphans.ts";
import type { Article } from "../types/article.ts";

const articles: Article[] = [];
for (const category of CATEGORIES) {
  const dir = path.join("content", category.slug);
  if (!fs.existsSync(dir)) continue;
  for (const file of fs.readdirSync(dir).filter((name) => name.endsWith(".mdx"))) {
    const { data, content } = matter(fs.readFileSync(path.join(dir, file), "utf8"));
    if (data.status === "draft") continue;
    articles.push({ ...data, tags: data.tags ?? [], category: category.slug, slug: file.replace(/\.mdx$/, ""), content, readingTime: "" } as Article);
  }
}

const audit = auditInboundLinks(articles);
const orphans = audit.filter((entry) => !entry.desk && entry.topics === 0 && entry.related === 0);
const weak = audit.filter((entry) => !entry.desk && entry.topics === 0 && entry.related === 1);
console.log(`${audit.length} published MDX stories`);
console.log(`${orphans.length} likely orphans (no desk first page, topic hub or related card):`);
for (const { article } of orphans) console.log(`  /${article.category}/${article.slug}`);
console.log(`${weak.length} weakly linked (one related card only):`);
for (const { article } of weak) console.log(`  /${article.category}/${article.slug}`);
