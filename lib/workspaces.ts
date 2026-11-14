// The four on-device AI workspaces. Page copy, catalog entries and limits
// live here so the pages, /tools and search cannot drift. Every model and
// limit named here is the one the components actually use.

export type WorkspaceSlug = "ai-writing-studio" | "ai-resume-assistant" | "ai-image-document-studio" | "ai-study-assistant";

export type Workspace = {
  slug: WorkspaceSlug;
  name: string;
  description: string;
  category: "writing" | "productivity" | "images" | "documents";
  tagline: string;
  model: string;
  engine: string;
  howTo: string[];
  examples: string[];
  limits: string[];
  privacy: string;
  keywords: string[];
  /** Needs Crossref (writing) or the Tesseract CDN (image/doc, study). */
  network: { models: boolean; ocr: boolean; crossref: boolean };
};

const LLM_ENGINE = "Qwen3.5 0.8B or 2B (Apache-2.0, ONNX q4/q4f16) via Transformers.js, on WebGPU or WebAssembly in a Web Worker";

export const WORKSPACES: Workspace[] = [
  {
    slug: "ai-writing-studio",
    name: "AI Writing & Paraphrasing Studio",
    description: "Paraphrase, fix grammar, change tone, make text academic, shorter or longer, with side-by-side changes you accept or reject. Runs on your device.",
    category: "writing",
    tagline: "Rewrite with tracked changes",
    model: "Qwen3.5 on-device",
    engine: `${LLM_ENGINE}; rule-based grammar checks; Crossref for optional reference lookup`,
    howTo: [
      "Paste your text. Rule-based checks for common slips appear straight away, with no download.",
      "Load the on-device model (a one-time download of about 0.6 GB for Light or 1.4 GB for Quality), then pick a mode.",
      "Review each paragraph's highlighted changes, accept or reject them, then copy or export the result.",
    ],
    examples: ["Fixing grammar in an email or cover letter", "Paraphrasing a paragraph in your own words", "Making a draft more formal or more academic", "Cutting an abstract down to a word limit"],
    limits: [
      "Up to 12,000 characters per run, processed paragraph by paragraph",
      "Small on-device models are less accurate than large hosted ones and can miss errors; the Light model is basic",
      "Best in English; other languages work less reliably",
      "Needs a recent Chrome, Edge or Safari; without WebGPU the Light model runs slowly on the CPU",
    ],
    privacy: "Your text is processed in this browser tab and never sent to TodayAI or an AI provider. Reference lookup is off by default; when you switch it on, only your search words go to Crossref.",
    keywords: ["paraphrase", "paraphrasing tool", "grammar checker", "rewrite", "academic writing", "formal", "shorten text", "citation", "doi", "writing"],
    network: { models: true, ocr: false, crossref: true },
  },
  {
    slug: "ai-resume-assistant",
    name: "AI Resume & Job Application Assistant",
    description: "Build your CV section by section, compare it with a job description, improve bullet points and draft a cover letter, then print or save it as a PDF. Your CV stays on your device.",
    category: "productivity",
    tagline: "CV editor and job match",
    model: "Qwen3.5 on-device",
    engine: `${LLM_ENGINE}; deterministic keyword matching`,
    howTo: [
      "Fill in your details, experience, education and skills. Nothing is saved unless you turn on saving on this device.",
      "Paste a job description to see which of its key terms your CV already mentions and which are missing.",
      "Optionally load the on-device model to polish bullets or draft a cover letter, review every suggestion, then print or save as PDF.",
    ],
    examples: ["Tailoring a CV to a specific job advert", "Tightening weak experience bullets", "Drafting a first cover letter to edit", "Producing a clean, printable one-page CV"],
    limits: [
      "Keyword matching compares wording only. It is not an ATS score and can't predict any employer's screening",
      "AI suggestions are checked for numbers and names that aren't in your CV, but you must still verify every claim",
      "PDF export uses your browser's Print → Save as PDF",
    ],
    privacy: "Your CV and the job description are processed in this browser tab. Nothing is uploaded. Saving to this device is opt-in and can be erased at any time.",
    keywords: ["resume", "cv", "resume builder", "cover letter", "job description", "keywords", "ats", "job application"],
    network: { models: true, ocr: false, crossref: false },
  },
  {
    slug: "ai-image-document-studio",
    name: "AI Image & Document Studio",
    description: "Crop, rotate and adjust images, convert formats, remove portrait backgrounds, extract text with OCR, and turn photos of pages into a PDF, all on your device.",
    category: "images",
    tagline: "Edit, scan and extract text",
    model: "MODNet + Tesseract",
    engine: "Canvas image processing; MODNet portrait matting (Apache-2.0) via Transformers.js; Tesseract OCR (LSTM) via tesseract.js; pdf.js text extraction",
    howTo: [
      "Choose an image, photo of a document or PDF.",
      "Crop, rotate and adjust it, remove a portrait background, or extract its text with OCR and correct it.",
      "Download the edited image (PNG, JPEG or WebP), the text, or a multi-page scanned PDF.",
    ],
    examples: ["Straightening and cropping a photographed receipt", "Turning several page photos into one PDF", "Converting a PNG screenshot to a smaller JPEG or WebP", "Cutting out a headshot for a CV"],
    limits: [
      "Images up to 25 MB and 8,000 px on the longest side; background removal up to 12 MB and 4,096 px",
      "Background removal is designed for people; other subjects often come out poorly",
      "OCR is English and works best on sharp printed text; handwriting is unreliable",
      "Upscaling uses standard smoothing, not AI super-resolution",
    ],
    privacy: "Images and PDFs are processed in this browser tab and never uploaded. Only the model files are downloaded, on first use.",
    keywords: ["image editor", "crop image", "rotate", "convert png to jpg", "webp", "ocr", "document scanner", "scan to pdf", "remove background", "pdf to text"],
    network: { models: true, ocr: true, crossref: false },
  },
  {
    slug: "ai-study-assistant",
    name: "AI Study & Exam Assistant",
    description: "Upload notes or a PDF and get source-grounded answers with page references, simple explanations, flashcards, multiple-choice quizzes and practice questions. Runs on your device.",
    category: "documents",
    tagline: "Revise from your own notes",
    model: "Qwen3.5 + MiniLM on-device",
    engine: `${LLM_ENGINE}; all-MiniLM-L6-v2 sentence embeddings (Apache-2.0) and keyword ranking for retrieval; pdf.js and Tesseract OCR for extraction`,
    howTo: [
      "Upload a PDF or paste your notes. Text is extracted in your browser and split into numbered passages that keep their page numbers.",
      "Search your material and make cloze flashcards and quizzes without any download, or load the on-device model for answers, explanations and generated questions.",
      "Every answer shows the passages it came from. Review your quiz answers, then export flashcards or a study sheet.",
    ],
    examples: ["Asking what your lecture notes say about a topic", "Turning a chapter into flashcards", "Making a practice quiz before an exam", "Getting a plain-English explanation of a dense paragraph"],
    limits: [
      "PDFs up to 25 MB and 300 pages; scanned pages are read with OCR (English, first 20)",
      "The assistant only knows your material. If the passages don't cover a question it says so instead of guessing",
      "Generated questions are checked against their source passage, but small models still make mistakes",
      "Page numbers come from the PDF; pasted notes have passage numbers instead",
    ],
    privacy: "Your PDF and notes are processed in this browser tab and never uploaded to TodayAI or an AI provider.",
    keywords: ["study", "exam", "revision", "flashcards", "quiz", "multiple choice", "pdf", "notes", "practice questions", "explain"],
    network: { models: true, ocr: true, crossref: false },
  },
];

export function getWorkspace(slug: WorkspaceSlug) {
  return WORKSPACES.find((workspace) => workspace.slug === slug)!;
}
