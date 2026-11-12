import { z } from "zod";

const text = z.string().trim().min(1).max(12000);
const media = z.object({ id: z.string().uuid().optional(), caption: z.string().max(240).default(""), alt: z.string().max(240).default(""), url: z.string().url().optional() });
export const storyBlockSchema = z.discriminatedUnion("type", [
  z.object({ id: z.string().min(1).max(80), type: z.literal("paragraph"), text }),
  z.object({ id: z.string().min(1).max(80), type: z.literal("heading"), level: z.union([z.literal(2), z.literal(3)]), text: text.max(240) }),
  z.object({ id: z.string().min(1).max(80), type: z.literal("quote"), text: text.max(1200) }),
  z.object({ id: z.string().min(1).max(80), type: z.literal("image"), media }),
  z.object({ id: z.string().min(1).max(80), type: z.literal("gallery"), items: z.array(media).min(2).max(6) }),
  z.object({ id: z.string().min(1).max(80), type: z.literal("video"), media }),
  z.object({ id: z.string().min(1).max(80), type: z.literal("divider") }),
]);
// Version 2 is the canonical wire format shared by the writer and API.
// The current editor stores simple blocks and external videos as embeds.
export const storyDocumentSchema = z.object({ version: z.literal(2), blocks: z.array(storyBlockSchema).min(1).max(100), contextualPoll: z.object({ question: z.string().trim().min(1).max(240), options: z.array(z.string().trim().min(1).max(120)).min(2).max(4) }).optional() });
export type StoryDocument = z.infer<typeof storyDocumentSchema>;
export type StoryBlock = z.infer<typeof storyBlockSchema>;
export function storyText(document: StoryDocument) { return document.blocks.filter((block) => "text" in block).map((block) => block.text).join("\n\n"); }
export function countStoryImages(document: StoryDocument) { return document.blocks.reduce((total, block) => total + (block.type === "image" || block.type === "video" ? 1 : block.type === "gallery" ? block.items.length : 0), 0); }
