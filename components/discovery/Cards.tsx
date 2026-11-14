import Link from "next/link";
import Image from "@/components/ui/MediaImage";
import { ArrowRight, Brain, Briefcase, GraduationCap, ImagesSquare, Code, FilePdf, FileText, ImageSquare, Microphone, PaintBrush, PencilLine, Scan, Scissors, Sparkle, TextAa, Timer, Waveform } from "@phosphor-icons/react/ssr";
import { GAME_CATEGORIES, TOOL_CATEGORIES, type CatalogGame, type CatalogTool, type GameCategorySlug, type ToolCategorySlug } from "@/lib/site-catalog";

const TOOL_ICONS: Record<ToolCategorySlug, typeof Brain> = { images: ImageSquare, writing: PencilLine, audio: Waveform, productivity: Timer, coding: Code, documents: FileText, creative: Sparkle };
// Specific icons for the everyday AI tools; others use their category icon.
const TOOL_HREF_ICONS: Record<string, typeof Brain> = {
  "/tools/ai-writing-studio": PencilLine,
  "/tools/ai-resume-assistant": Briefcase,
  "/tools/ai-image-document-studio": ImagesSquare,
  "/tools/ai-study-assistant": GraduationCap,
  "/tools/ai-background-remover": Scissors,
  "/tools/ai-grammar-rewriter": TextAa,
  "/tools/ai-speech-to-text": Microphone,
  "/tools/ai-pdf-assistant": FilePdf,
  "/tools/ai-image-to-text": Scan,
};

export function toolCategoryName(slug: ToolCategorySlug) {
  return TOOL_CATEGORIES.find((category) => category.slug === slug)?.name ?? "Utility";
}
export function gameCategoryName(slug: GameCategorySlug) {
  return GAME_CATEGORIES.find((category) => category.slug === slug)?.name ?? "Game";
}

export type ToolAvailability = "available" | "preview" | "coming-soon";

/**
 * Availability is decided by the caller from real configuration:
 * - "available": the tool works now → "Use tool".
 * - "preview": the AI provider isn't switched on, but the tool page explains
 *   what it will do → "Preview tool" (no claim that it works).
 * - "coming-soon": no useful destination → not a link at all.
 */
/** The icon a tool is shown with everywhere (specific, else its category's). */
export function toolIcon(tool: CatalogTool) {
  return TOOL_HREF_ICONS[tool.href] ?? TOOL_ICONS[tool.category];
}

export function toolAvailability(tool: CatalogTool, aiEnabled: boolean): ToolAvailability {
  if (tool.kind === "local") return "available";
  return aiEnabled ? "available" : "preview";
}

/** Utility card: name, real description, category, availability, launch link. */
export function CatalogToolCard({ tool, availability = "available" }: { tool: CatalogTool; availability?: ToolAvailability }) {
  const state = availability;
  const Icon = toolIcon(tool);
  const body = tool.tagline ? (
    <>
      <span className="d-card-icon" aria-hidden="true"><Icon size={20} weight="bold" /></span>
      <span className="d-card-title">{tool.title.replace(/^AI /, "")}</span>
      <span className="d-card-text">{tool.tagline}</span>
      {tool.model ? <span className="d-model-chip">{tool.model}</span> : null}
      <span className={`d-card-action ${state === "available" ? "" : "d-card-action-quiet"}`}>{state === "available" ? "Use tool" : "Setup required"} <ArrowRight size={14} aria-hidden="true" /></span>
    </>
  ) : (
    <>
      <span className="d-card-icon" aria-hidden="true"><Icon size={20} weight="bold" /></span>
      <span className="d-card-meta">
        {toolCategoryName(tool.category)}
        {state === "preview" ? <span className="d-badge d-badge-quiet">Setup required</span> : null}
        {state === "coming-soon" ? <span className="d-badge d-badge-quiet">Coming soon</span> : null}
        {state === "available" && (tool.kind === "local" || tool.onDevice) ? <span className="d-badge d-badge-quiet">On-device</span> : null}
      </span>
      <span className="d-card-title">{tool.title}</span>
      <span className="d-card-text">{tool.description}</span>
      {state === "available" ? <span className="d-card-action">Use tool <ArrowRight size={14} aria-hidden="true" /></span> : null}
      {state === "preview" ? <span className="d-card-action d-card-action-quiet">Preview tool <ArrowRight size={14} aria-hidden="true" /></span> : null}
    </>
  );
  if (state === "coming-soon") return <div className="d-card d-tool-card is-disabled" aria-disabled="true">{body}</div>;
  return <Link href={tool.href} className={`d-card d-tool-card ${state === "preview" ? "is-preview" : ""}`}>{body}</Link>;
}

/** Consistent 3:2 game tile. Games without artwork get a typographic tile. */
export function GameThumb({ game, sizes = "(min-width: 1024px) 320px, 50vw", priority = false }: { game: CatalogGame; sizes?: string; priority?: boolean }) {
  return (
    <span className={`d-game-thumb d-game-thumb-${game.category}`}>
      {game.thumbnail ? (
        <Image src={game.thumbnail} alt="" fill sizes={sizes} priority={priority} className="object-cover" />
      ) : (
        // Icon-only tile: the title is already printed under every thumbnail,
        // so repeating it inside the image read as duplicated text.
        <span className="d-game-thumb-mark" aria-hidden="true">
          {game.category === "drawing" ? <PaintBrush size={44} weight="duotone" /> : <Brain size={44} weight="duotone" />}
        </span>
      )}
    </span>
  );
}

export function GameCard({ game, priority = false }: { game: CatalogGame; priority?: boolean }) {
  return (
    <Link href={game.href} className="d-card d-game-card">
      <GameThumb game={game} priority={priority} />
      <span className="d-game-body">
        <span className="d-card-meta">{gameCategoryName(game.category)}{game.daily ? <span className="d-badge d-badge-quiet">Daily</span> : null}</span>
        <span className="d-card-title">{game.title}</span>
        <span className="d-card-text">{game.description}</span>
        <span className="d-card-action">Play <ArrowRight size={14} aria-hidden="true" /> <span className="d-card-time">{game.meta}</span></span>
      </span>
    </Link>
  );
}

/** One stronger game presentation: big thumbnail, what you do, clear play action. */
export function FeaturedGameCard({ game, how, priority = false }: { game: CatalogGame; how?: string; priority?: boolean }) {
  return (
    <Link href={game.href} className="d-feature-game">
      <GameThumb game={game} sizes="(min-width: 1024px) 640px, 100vw" priority={priority} />
      <span className="d-feature-copy">
        <span className="d-card-meta">{gameCategoryName(game.category)}{game.daily ? <span className="d-badge">Daily</span> : null}</span>
        <span className="d-feature-title">{game.title}</span>
        <span className="d-card-text">{game.description}</span>
        {how ? <span className="d-feature-how">{how}</span> : null}
        <span className="d-feature-foot">
          <span className="ui-button ui-button-primary d-feature-cta">Play now <ArrowRight size={15} aria-hidden="true" /></span>
          <span className="d-card-time">{game.meta}</span>
        </span>
      </span>
    </Link>
  );
}

/** Large icon tile for the homepage's three destinations. */
export function DestinationCard({ href, title, description, icon: Icon, cta }: { href: string; title: string; description: string; icon: typeof Brain; cta: string }) {
  return (
    <Link href={href} className="d-destination">
      <span className="d-destination-icon" aria-hidden="true"><Icon size={24} weight="duotone" /></span>
      <span className="d-destination-title">{title}</span>
      <span className="d-card-text">{description}</span>
      <span className="d-card-action">{cta} <ArrowRight size={14} aria-hidden="true" /></span>
    </Link>
  );
}
