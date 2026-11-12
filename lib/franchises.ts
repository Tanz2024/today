import type { Category } from "@/types/article";

export interface FranchiseDef {
  key: string;
  title: string;
  subhead: string;
  categories: Category[];
  variant: "grid" | "scroll" | "feature-list";
}

// Named editorial franchise sections. Each pulls real articles from the
// categories listed, filtered/ranked by lib/articles.ts at render time —
// nothing here is a manual article list.
export const FRANCHISES: FranchiseDef[] = [
  {
    key: "group-chat",
    title: "The Group Chat 💬",
    subhead: "Relationships, friendships, dating and more",
    categories: ["relationships"],
    variant: "grid",
  },
  {
    key: "main-character",
    title: "Main Character ✨",
    subhead: "Style, confidence and self-care",
    categories: ["style", "self-care"],
    variant: "scroll",
  },
  {
    key: "touch-grass",
    title: "Touch Grass 🌱",
    subhead: "Life outside the algorithm",
    categories: ["social"],
    variant: "feature-list",
  },
  {
    key: "after-class",
    title: "After Class 🎒",
    subhead: "Campus, money and student life",
    categories: ["campus", "money"],
    variant: "grid",
  },
  {
    key: "player-two",
    title: "Player Two 🎮",
    subhead: "Gaming, anime and entertainment",
    categories: ["gaming", "entertainment"],
    variant: "scroll",
  },
];
