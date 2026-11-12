import games from "@/content/games.json";
const catalog = games as unknown as { thisOrThat: typeof games.thisOrThat; goOutStayHome?: unknown[]; groupChat?: Record<string, string[]>; redFlagGreenFlag?: unknown[]; wouldYouRather?: unknown[]; weekendPicker?: unknown[] };
export const thisOrThat = catalog.thisOrThat;
export const goOutStayHome = (catalog.goOutStayHome ?? []) as never[];
export const groupChat = catalog.groupChat ?? {};
export const redFlagGreenFlag = (catalog.redFlagGreenFlag ?? []) as never[];
export const wouldYouRather = (catalog.wouldYouRather ?? []) as never[];
export const weekendPicker = (catalog.weekendPicker ?? []) as never[];
