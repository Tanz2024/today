// The AI tools that run a model on the visitor's device (plus the PDF
// assistant, which extracts on-device and asks the hosted model only about
// the selected passages). Page copy lives here so the pages, catalog and
// homepage cannot drift. Every limit stated here is enforced in the
// matching component under components/tools/local/.

export type LocalAiToolSlug = "ai-image-to-text" | "ai-background-remover" | "ai-speech-to-text" | "ai-pdf-assistant";

export type LocalAiTool = {
  slug: LocalAiToolSlug;
  name: string;
  description: string;
  category: "images" | "audio" | "documents";
  /** "device": inference in the browser. "hybrid": local extraction + hosted LLM. */
  processing: "device" | "hybrid";
  engine: string;
  /** 3–4 word card line. */
  tagline: string;
  /** Model name shown on cards. */
  model: string;
  howTo: string[];
  examples: string[];
  limits: string[];
  privacy: string;
  keywords: string[];
};

export const OCR_MAX_BYTES = 10 * 1024 * 1024;
export const BG_MAX_BYTES = 12 * 1024 * 1024;
export const BG_MAX_SIDE = 4096;
export const AUDIO_MAX_BYTES = 25 * 1024 * 1024;
export const AUDIO_MAX_SECONDS = 10 * 60;
export const PDF_MAX_BYTES = 25 * 1024 * 1024;
export const PDF_MAX_PAGES = 300;
export const PDF_OCR_MAX_PAGES = 20;
/** Characters of document text sent per request (server re-checks). */
export const PDF_CONTEXT_CHARS = 24_000;

export const LOCAL_AI_TOOLS: LocalAiTool[] = [
  {
    slug: "ai-image-to-text",
    tagline: "Copy text from images",
    model: "Tesseract OCR",
    name: "AI Image to Text",
    description: "Extract text from screenshots, photos and scans with on-device OCR, then edit, copy or download it.",
    category: "images",
    processing: "device",
    engine: "Tesseract OCR (LSTM neural network) via tesseract.js",
    howTo: ["Drop in a PNG, JPG, WebP or BMP image, or choose one from your device.", "Select Extract text. The first run downloads the English recognition model (about 4 MB).", "Correct anything the OCR misread, then copy the text or download it as a .txt file."],
    examples: ["Copy the text out of a screenshot of an error message", "Turn a photo of a printed page or receipt into editable text", "Grab a quote from an image someone sent you"],
    limits: ["English text", `Images up to ${OCR_MAX_BYTES / 1024 / 1024} MB`, "Works best on sharp, high-contrast, printed text; handwriting is unreliable"],
    privacy: "Recognition runs in your browser. Your image is never uploaded to TodayAI; only the recognition model files are downloaded.",
    keywords: ["ocr", "image to text", "extract text", "screenshot", "scan", "photo", "copy text from image"],
  },
  {
    slug: "ai-background-remover",
    tagline: "Transparent PNG in seconds",
    model: "MODNet",
    name: "AI Background Remover",
    description: "Remove the background from portrait photos on your device and download a transparent PNG.",
    category: "images",
    processing: "device",
    engine: "MODNet portrait matting model (Apache-2.0) via Transformers.js",
    howTo: ["Drop in a JPG, PNG or WebP photo, or choose one from your device.", "Select Remove background. The first run downloads the model (about 26 MB).", "Compare before and after, then download the transparent PNG."],
    examples: ["A clean headshot for a profile picture or CV", "A portrait cut-out for a slide or poster", "A person cut out for a thumbnail"],
    limits: ["Designed for photos of people; products, animals and scenes often come out poorly", `Images up to ${BG_MAX_BYTES / 1024 / 1024} MB and ${BG_MAX_SIDE}px on the longest side`],
    privacy: "The model runs in your browser. Your photo is never uploaded to TodayAI.",
    keywords: ["remove background", "background eraser", "transparent png", "cut out", "portrait", "headshot"],
  },
  {
    slug: "ai-speech-to-text",
    tagline: "Audio to editable text",
    model: "Whisper",
    name: "AI Speech to Text",
    description: "Transcribe voice notes, recordings and audio files on your device with OpenAI's Whisper model.",
    category: "audio",
    processing: "device",
    engine: "OpenAI Whisper (tiny or base, MIT-licensed; Apache-2.0 ONNX conversion) via Transformers.js",
    howTo: ["Upload an audio file or record from your microphone.", "Choose Fast (about 41 MB download) or Accurate (about 77 MB). The model is cached after the first run.", "Select Transcribe. Edit the transcript, then copy it or download it as plain or timestamped text."],
    examples: ["Turn a voice memo into notes", "Transcribe a short interview or lecture clip", "Get the text of a voicemail"],
    limits: [`Recordings up to ${AUDIO_MAX_SECONDS / 60} minutes and ${AUDIO_MAX_BYTES / 1024 / 1024} MB`, "Not real-time: transcription starts after recording stops and can take a while on slower devices", "Best in English; other languages are detected automatically but accuracy varies", "Timestamps are approximate segment times"],
    privacy: "Audio is decoded and transcribed in your browser. Recordings are never uploaded to TodayAI and are discarded when you clear or leave the page.",
    keywords: ["transcribe", "transcription", "speech to text", "voice to text", "whisper", "audio", "voice memo"],
  },
  {
    slug: "ai-pdf-assistant",
    tagline: "Ask your PDF anything",
    model: "pdf.js + LLM",
    name: "AI PDF Assistant",
    description: "Summarise a PDF, pull out key points, outline it, or ask questions answered from the document with page references.",
    category: "documents",
    processing: "hybrid",
    engine: "pdf.js text extraction and Tesseract OCR on your device; a hosted language model answers from the selected passages",
    howTo: ["Upload a PDF. Its text is extracted in your browser, page by page.", "Choose Summary, Key points or Outline, or ask a question about the document.", "Answers cite the pages they came from. Check important details against the PDF."],
    examples: ["Get the gist of a long report before a meeting", "Ask what a contract says about cancellation", "Turn lecture slides into a revision outline"],
    limits: [`PDFs up to ${PDF_MAX_BYTES / 1024 / 1024} MB and ${PDF_MAX_PAGES} pages`, `Scanned pages are read with OCR (English, first ${PDF_OCR_MAX_PAGES} scanned pages)`, "For long documents, summaries are based on a spread of passages rather than every page"],
    privacy: "The PDF never leaves your device. Only the passages needed for each request are sent to the AI model, and TodayAI does not store them.",
    keywords: ["pdf", "summarize pdf", "chat with pdf", "document", "ask pdf", "report", "outline"],
  },
];

export function getLocalAiTool(slug: LocalAiToolSlug) {
  return LOCAL_AI_TOOLS.find((tool) => tool.slug === slug)!;
}
