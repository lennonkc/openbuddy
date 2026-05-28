export const CODE_EXT = new Set([
  ".py", ".ts", ".tsx", ".js", ".jsx", ".css", ".json",
  ".yaml", ".yml", ".toml", ".sh", ".c", ".h", ".cpp", ".go",
  ".rs", ".rb", ".php", ".swift", ".sql", ".lua", ".kt",
  ".txt", ".log", ".csv", ".ini", ".cfg", ".env", ".gitignore",
]);
export const CODE_NAMES = new Set(["makefile", "dockerfile"]);

export const HTML_EXT = new Set([".html", ".htm"]);
export const SVG_EXT = new Set([".svg"]);
export const PUML_EXT = new Set([".puml", ".plantuml", ".pu", ".wsd"]);
export const MD_EXT = new Set([".md", ".mdx"]);
export const IMG_EXT = new Set([".png", ".jpg", ".jpeg", ".gif", ".webp", ".ico", ".bmp"]);
export const PDF_EXT = new Set([".pdf"]);
export const AUDIO_EXT = new Set([".mp3", ".wav", ".ogg", ".flac", ".aac", ".m4a"]);
export const VIDEO_EXT = new Set([".mp4", ".webm", ".mov", ".avi", ".mkv"]);

export type Category = "code" | "markdown" | "html" | "svg" | "puml" | "image" | "pdf" | "audio" | "video" | "unknown";

export function extOf(name: string): string {
  const dot = name.lastIndexOf(".");
  return dot >= 0 ? name.slice(dot).toLowerCase() : "";
}

export function fileBasename(p: string): string {
  const parts = p.split("/");
  return parts[parts.length - 1] || p;
}

export function categorize(name: string): Category {
  const ext = extOf(name);
  const lower = name.toLowerCase();
  if (MD_EXT.has(ext)) return "markdown";
  if (HTML_EXT.has(ext)) return "html";
  if (SVG_EXT.has(ext)) return "svg";
  if (PUML_EXT.has(ext)) return "puml";
  if (CODE_EXT.has(ext) || CODE_NAMES.has(lower)) return "code";
  if (IMG_EXT.has(ext)) return "image";
  if (PDF_EXT.has(ext)) return "pdf";
  if (AUDIO_EXT.has(ext)) return "audio";
  if (VIDEO_EXT.has(ext)) return "video";
  return "unknown";
}
