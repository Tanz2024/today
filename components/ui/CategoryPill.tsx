import Link from "next/link";
import { getCategoryMeta, getPublicDeskSlug } from "@/lib/categories";

export default function CategoryPill({
  category,
  size = "sm",
}: {
  category: string;
  size?: "sm" | "md";
}) {
  const meta = getCategoryMeta(getPublicDeskSlug(category));
  if (!meta) return null;

  const padding = size === "sm" ? "px-2.5 py-1 text-xs" : "px-3 py-1.5 text-sm";

  return (
    <Link
      href={`/${meta.slug}`}
      className={`inline-flex items-center rounded-full font-semibold ${padding}`}
      style={{ backgroundColor: meta.accentSoft, color: meta.accent }}
    >
      {meta.name}
    </Link>
  );
}
