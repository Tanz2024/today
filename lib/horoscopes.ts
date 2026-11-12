import horoscopes from "@/content/horoscopes.json";
export type Horoscope = (typeof horoscopes)[keyof typeof horoscopes];
export function getHoroscope() { return horoscopes.default; }
