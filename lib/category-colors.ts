import type { CSSProperties } from "react";

export type CategoryColor = {
  accent: string;
  softBackground: string;
};

const CATEGORY_COLORS: Record<string, CategoryColor> = {
  culture: { accent: "#4338CA", softBackground: "rgba(67, 56, 202, 0.05)" },
  entertainment: { accent: "#4338CA", softBackground: "rgba(67, 56, 202, 0.05)" },
  gaming: { accent: "#4338CA", softBackground: "rgba(67, 56, 202, 0.05)" },
  relationships: { accent: "#BE5A7B", softBackground: "rgba(190, 90, 123, 0.05)" },
  "sex-health": { accent: "#BE5A7B", softBackground: "rgba(190, 90, 123, 0.05)" },
  "self-care": { accent: "#BE5A7B", softBackground: "rgba(190, 90, 123, 0.05)" },
  campus: { accent: "#256B57", softBackground: "rgba(37, 107, 87, 0.05)" },
  money: { accent: "#256B57", softBackground: "rgba(37, 107, 87, 0.05)" },
  travel: { accent: "#167D8D", softBackground: "rgba(22, 125, 141, 0.05)" },
  style: { accent: "#8B647A", softBackground: "rgba(139, 100, 122, 0.05)" },
};

export function getCategoryColor(category?: string): CategoryColor | undefined {
  return category ? CATEGORY_COLORS[category] : undefined;
}

export function categoryAccentStyle(category?: string): CSSProperties | undefined {
  const color = getCategoryColor(category);
  return color ? { color: color.accent } : undefined;
}

export function categoryLandingStyle(category?: string): CSSProperties | undefined {
  const color = getCategoryColor(category);
  return color ? { borderTopColor: color.accent, backgroundColor: color.softBackground } : undefined;
}
