export interface DecoItem {
  icon: string;
  top: string;
  left: string;
  size: number;
  opacity: number;
  rotate: number;
}

function deco(
  icon: string,
  top: string,
  left: string,
  size: number,
  opacity: number,
  rotate: number,
): DecoItem {
  return { icon, top, left, size, opacity, rotate };
}

export const ALL_DECO_ICONS = [
  "fluent-emoji-flat:pencil",
  "fluent-emoji-flat:envelope",
  "fluent-emoji-flat:paperclip",
  "fluent-emoji-flat:speech-balloon",
  "fluent-emoji-flat:memo",
  "fluent-emoji-flat:star",
  "fluent-emoji-flat:triangular-ruler",
  "fluent-emoji-flat:sunflower",
  "fluent-emoji-flat:rainbow",
  "fluent-emoji-flat:crown",
  "fluent-emoji-flat:butterfly",
  "fluent-emoji-flat:ribbon",
  "fluent-emoji-flat:candy",
  "fluent-emoji-flat:balloon",
  "fluent-emoji-flat:cherry-blossom",
  "fluent-emoji-flat:open-book",
  "fluent-emoji-flat:file-folder",
  "fluent-emoji-flat:magnifying-glass-tilted-left",
  "fluent-emoji-flat:bookmark",
  "fluent-emoji-flat:pushpin",
  "fluent-emoji-flat:label",
  "fluent-emoji-flat:herb",
  "fluent-emoji-flat:electric-plug",
  "fluent-emoji-flat:keyboard",
  "fluent-emoji-flat:satellite-antenna",
  "fluent-emoji-flat:battery",
  "fluent-emoji-flat:antenna-bars",
  "fluent-emoji-flat:light-bulb",
  "fluent-emoji-flat:wrench",
  "fluent-emoji-flat:cloud",
  "fluent-emoji-flat:scissors",
  "fluent-emoji-flat:paintbrush",
  "fluent-emoji-flat:artist-palette",
  "fluent-emoji-flat:straight-ruler",
  "fluent-emoji-flat:crayon",
  "fluent-emoji-flat:purple-heart",
  "fluent-emoji-flat:puzzle-piece",
  "fluent-emoji-flat:sparkles",
  "fluent-emoji-flat:gear",
  "fluent-emoji-flat:key",
  "fluent-emoji-flat:shield",
  "fluent-emoji-flat:level-slider",
  "fluent-emoji-flat:locked",
  "fluent-emoji-flat:clipboard",
  "fluent-emoji-flat:tangerine",
];

export const PAGE_DECORATIONS: Record<string, DecoItem[]> = {
  "/chat": [
    deco("fluent-emoji-flat:pencil", "6%", "10%", 96, 0.28, 15),
    deco("fluent-emoji-flat:envelope", "8%", "75%", 84, 0.24, -10),
    deco("fluent-emoji-flat:paperclip", "30%", "40%", 72, 0.2, 20),
    deco("fluent-emoji-flat:speech-balloon", "35%", "82%", 90, 0.26, -8),
    deco("fluent-emoji-flat:memo", "55%", "15%", 78, 0.22, 12),
    deco("fluent-emoji-flat:star", "60%", "60%", 66, 0.2, -15),
    deco("fluent-emoji-flat:triangular-ruler", "80%", "35%", 72, 0.18, 25),
    deco("fluent-emoji-flat:sunflower", "85%", "80%", 84, 0.2, -5),
  ],
  "/room": [
    deco("fluent-emoji-flat:open-book", "6%", "12%", 90, 0.26, 12),
    deco("fluent-emoji-flat:file-folder", "10%", "72%", 78, 0.22, -15),
    deco("fluent-emoji-flat:magnifying-glass-tilted-left", "30%", "42%", 72, 0.2, 8),
    deco("fluent-emoji-flat:bookmark", "36%", "82%", 66, 0.18, -12),
    deco("fluent-emoji-flat:pushpin", "55%", "8%", 78, 0.24, 20),
    deco("fluent-emoji-flat:label", "62%", "55%", 72, 0.2, -8),
    deco("fluent-emoji-flat:paperclip", "80%", "32%", 66, 0.18, 22),
    deco("fluent-emoji-flat:herb", "86%", "76%", 78, 0.2, -14),
  ],
  "/sticker-book": [
    deco("fluent-emoji-flat:scissors", "6%", "14%", 84, 0.26, 12),
    deco("fluent-emoji-flat:paintbrush", "10%", "74%", 78, 0.24, -18),
    deco("fluent-emoji-flat:artist-palette", "32%", "36%", 90, 0.2, 8),
    deco("fluent-emoji-flat:straight-ruler", "38%", "84%", 72, 0.22, -12),
    deco("fluent-emoji-flat:crayon", "58%", "10%", 78, 0.26, 20),
    deco("fluent-emoji-flat:purple-heart", "62%", "56%", 66, 0.2, -8),
    deco("fluent-emoji-flat:puzzle-piece", "82%", "28%", 84, 0.18, 15),
    deco("fluent-emoji-flat:sparkles", "86%", "75%", 72, 0.2, -14),
  ],
  "/settings": [
    deco("fluent-emoji-flat:gear", "5%", "10%", 90, 0.26, 15),
    deco("fluent-emoji-flat:key", "8%", "70%", 78, 0.24, -10),
    deco("fluent-emoji-flat:shield", "30%", "40%", 84, 0.2, 18),
    deco("fluent-emoji-flat:level-slider", "36%", "85%", 72, 0.22, -15),
    deco("fluent-emoji-flat:artist-palette", "56%", "14%", 78, 0.18, 10),
    deco("fluent-emoji-flat:locked", "62%", "60%", 66, 0.26, -8),
    deco("fluent-emoji-flat:clipboard", "80%", "34%", 72, 0.18, 22),
    deco("fluent-emoji-flat:tangerine", "86%", "78%", 84, 0.2, -5),
  ],
};
