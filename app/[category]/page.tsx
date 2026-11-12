import { notFound } from "next/navigation";

import CategoryPage from "@/components/category/CategoryPage";

import {
  getCategoryMeta,
  getPublicCategories,
} from "@/lib/categories";

import { buildMetadata, isCategoryUiState } from "@/lib/seo";
import { hasIndexableImage } from "@/lib/article-discovery";
import { getFeaturedArticle } from "@/lib/articles";

export function generateStaticParams() {
  return getPublicCategories().map((category) => ({
    category: category.slug,
  }));
}

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{
    category: string;
  }>;
  searchParams: Promise<{
    filter?: string;
    page?: string;
  }>;
}) {
  const { category } = await params;
  const { filter, page } = await searchParams;

  const meta = getCategoryMeta(category);

  if (!meta) {
    return {};
  }

  return buildMetadata({
    title: meta.name,
    description: meta.description,
    path: `/${category}`,
    ...(() => {
      const image = getFeaturedArticle(category as Parameters<typeof getFeaturedArticle>[0])?.image;
      return hasIndexableImage(image) ? { image } : {};
    })(),
    // Hidden desks redirect in next.config.ts; if one is ever reached anyway
    // it must not be indexed with its internal copy.
    noindex: Boolean(meta.hidden) || isCategoryUiState(filter, page),
  });
}

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{
    category: string;
  }>;

  searchParams: Promise<{
    filter?: string;
    page?: string;
  }>;
}) {
  const { category } = await params;
  const { filter, page } = await searchParams;

  const meta = getCategoryMeta(category);

  if (!meta) {
    notFound();
  }

  return (
    <CategoryPage
      category={
        category as Parameters<
          typeof CategoryPage
        >[0]["category"]
      }
      activeFilter={filter}
      page={page}
    />
  );
}
