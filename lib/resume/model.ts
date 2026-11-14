// Structured CV data. Kept in memory, or in this browser's localStorage only
// when the visitor opts in.

export type Experience = { id: string; role: string; organisation: string; location: string; start: string; end: string; bullets: string[] };
export type Education = { id: string; qualification: string; institution: string; start: string; end: string; details: string };
export type Resume = {
  name: string; headline: string; email: string; phone: string; location: string; links: string;
  summary: string;
  experience: Experience[];
  education: Education[];
  skills: string;
  extras: { id: string; title: string; body: string }[];
};

export const newId = () => Math.random().toString(36).slice(2, 10);
export const emptyExperience = (): Experience => ({ id: newId(), role: "", organisation: "", location: "", start: "", end: "", bullets: [""] });
export const emptyEducation = (): Education => ({ id: newId(), qualification: "", institution: "", start: "", end: "", details: "" });
export const emptyResume = (): Resume => ({ name: "", headline: "", email: "", phone: "", location: "", links: "", summary: "", experience: [emptyExperience()], education: [emptyEducation()], skills: "", extras: [] });

export const skillList = (skills: string) => skills.split(/[,\n;•]/).map((s) => s.trim()).filter(Boolean);

/** Everything the visitor wrote, as plain text, for matching and AI context. */
export function resumeText(cv: Resume) {
  return [
    cv.name, cv.headline, cv.location, cv.summary,
    ...cv.experience.flatMap((e) => [`${e.role} ${e.organisation} ${e.location} ${e.start} ${e.end}`, ...e.bullets]),
    ...cv.education.flatMap((e) => [`${e.qualification} ${e.institution} ${e.start} ${e.end}`, e.details]),
    cv.skills,
    ...cv.extras.flatMap((x) => [x.title, x.body]),
  ].filter((s) => s && s.trim()).join("\n");
}

export const STORAGE_KEY = "todayai.resume.v1";

export function isResume(value: unknown): value is Resume {
  const v = value as Resume;
  return Boolean(v && typeof v === "object" && typeof v.name === "string" && Array.isArray(v.experience) && Array.isArray(v.education) && Array.isArray(v.extras));
}
