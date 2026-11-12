type CategoryEditorial = { family: string; description?: string; headerImage: string; desktopObjectPosition?: string; mobileObjectPosition?: string };

const CATEGORY_EDITORIAL: Record<string, CategoryEditorial> = {
  culture: { family: "Culture & Ideas", description: "Stories about entertainment, identity, trends and the internet.", headerImage: "/images/category-headers/culture/CultureTrendsHero.webp", mobileObjectPosition: "center 42%" },
  travel: { family: "City Journeys", description: "Stories about places, food, experiences and somewhere new.", headerImage: "/images/category-headers/travel/Travel & City Life Hero.webp", mobileObjectPosition: "center 42%" },
  style: { family: "Style Desk", description: "Fashion, beauty and personal expression for real life.", headerImage: "https://images.unsplash.com/photo-1525507119028-ed4c629a60a3?auto=format&fit=crop&w=1600&q=80" },
  campus: { family: "Knowledge & Growth", description: "Technology, AI, university life and learning without burnout.", headerImage: "https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=1600&q=80" },
  relationships: { family: "Human Connections", description: "Dating, friendships, wellbeing and the stories between people.", headerImage: "/images/category-headers/relationships/Relationships Dating Hero.webp", mobileObjectPosition: "74% center" },
  money: { family: "Future & Finance", description: "Practical ideas for money, work and becoming more independent.", headerImage: "/images/category-headers/money/Life & Money Hero.webp", mobileObjectPosition: "center 42%" },
  "sex-health": { family: "Wellbeing", description: "Clear, factual guidance on sex, consent and looking after yourself.", headerImage: "/images/category-headers/sex-health/Sex and Health Hero.webp", mobileObjectPosition: "center 42%" },
  "self-care": { family: "Wellbeing", description: "Sleep, confidence and small habits that help you feel put together.", headerImage: "/images/category-headers/self-care/Self-Care Editorial Hero.webp", mobileObjectPosition: "center 42%" },
  entertainment: { family: "Culture & Ideas", headerImage: "/images/category-headers/entertainment/cover.png" },
  gaming: { family: "Culture & Ideas", headerImage: "https://images.unsplash.com/photo-1593305841991-05c297ba4575?auto=format&fit=crop&w=1600&q=80" },
  social: { family: "Culture & Ideas", headerImage: "https://images.unsplash.com/photo-1611162617474-5b21e879e113?auto=format&fit=crop&w=1600&q=80" },
  food: { family: "City Journeys", headerImage: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1600&q=80" },
};

export function getCategoryEditorial(category: string, fallbackDescription: string) {
  const editorial = CATEGORY_EDITORIAL[category];
  return {
    family: editorial?.family ?? "TodayAI Desk",
    description: editorial?.description ?? fallbackDescription,
    headerImage: editorial?.headerImage ?? "https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1600&q=80",
    desktopObjectPosition: editorial?.desktopObjectPosition ?? "center 42%",
    mobileObjectPosition: editorial?.mobileObjectPosition ?? "center",
  };
}
