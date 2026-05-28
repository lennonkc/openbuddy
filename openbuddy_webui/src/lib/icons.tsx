/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ComponentProps } from "react";
import { Icon } from "@iconify/react";

export interface IconEntry {
  default: string;
  label: string;
  keywords: string;
  group: string;
}

export const ICON_REGISTRY: Record<string, IconEntry> = {
  "nav-chat":     { default: "fluent-emoji-flat:star",                             label: "聊天",  keywords: "speech bubble chat message star",       group: "导航" },
  "nav-room":     { default: "fluent-emoji-flat:house",                           label: "房间",  keywords: "house home building",              group: "导航" },
  "nav-stickers": { default: "noto-v1:bookmark",                                 label: "贴纸",  keywords: "book notebook sticker note",            group: "导航" },
  "nav-settings": { default: "flat-color-icons:settings",                         label: "设置",  keywords: "gear wrench settings cog",         group: "导航" },
  "loading":      { default: "fluent-emoji-flat:counterclockwise-arrows-button",  label: "加载",  keywords: "load spinner arrows refresh",   group: "状态" },
  "locked":       { default: "fluent-emoji-flat:locked",                          label: "锁",    keywords: "lock key secure password",         group: "状态" },
  "wifi-on":      { default: "glyphs-poly:wifi-100",                              label: "信号",  keywords: "wifi signal connected antenna",    group: "状态" },
  "wifi-off":     { default: "openmoji:no-mobile-phones",                         label: "断网",  keywords: "wifi off disconnected no signal",  group: "状态" },
  "expand":       { default: "fluent-emoji-flat:down-arrow",                      label: "展开",  keywords: "down arrow expand open",           group: "操作" },
  "collapse":     { default: "fluent-emoji-flat:right-arrow",                     label: "收起",  keywords: "right arrow collapse close",       group: "操作" },
  "check":        { default: "fluent-emoji-flat:check-mark",                      label: "勾勾",  keywords: "check mark done confirm yes",      group: "操作" },
  "cross":        { default: "fluent-emoji-flat:cross-mark",                      label: "叉叉",  keywords: "cross cancel close delete no",     group: "操作" },
  "plus":         { default: "fluent-emoji-flat:plus",                            label: "加号",  keywords: "plus add new create",              group: "操作" },
  "pencil":       { default: "fluent-emoji-flat:pencil",                          label: "铅笔",  keywords: "pencil write edit compose",        group: "操作" },
  "trash":        { default: "flat-color-icons:full-trash",                       label: "垃圾桶", keywords: "trash delete remove bin waste",   group: "操作" },
  "computer":     { default: "fluent-emoji-flat:desktop-computer",                label: "电脑",    keywords: "computer desktop monitor screen",  group: "物品" },
  "robot":        { default: "fluent-emoji-flat:robot",                           label: "机器人",  keywords: "robot ai bot android machine",     group: "物品" },
  "shield":       { default: "fluent-emoji-flat:shield",                          label: "盾牌",    keywords: "shield protect guard security",    group: "物品" },
  "globe":        { default: "fluent-emoji-flat:globe-showing-americas",          label: "地球",    keywords: "globe world earth language i18n",  group: "物品" },
  "user-avatar":  { default: "fluent-emoji-flat:nerd-face",                       label: "我的头像", keywords: "avatar face user profile nerd me", group: "聊天" },

  "file-folder":   { default: "fluent-emoji-flat:open-file-folder",       label: "文件夹",   keywords: "folder directory cabinet drawer",      group: "文件" },
  "file-markdown": { default: "openmoji:notebook-with-decorative-cover",  label: "Markdown", keywords: "markdown md book document",             group: "文件" },
  "file-pdf":      { default: "fluent-emoji-flat:bookmark-tabs",          label: "PDF",      keywords: "pdf document certificate book",         group: "文件" },
  "file-html":     { default: "fluent-emoji-flat:globe-with-meridians",   label: "HTML",     keywords: "html web page globe album",             group: "文件" },
  "file-code":     { default: "fluent-emoji-flat:clipboard",              label: "代码",     keywords: "code source script program scroll",     group: "文件" },
  "file-config":   { default: "flat-color-icons:settings",                label: "配置",     keywords: "config settings json yaml toml gear",   group: "文件" },
  "file-text":     { default: "openmoji:notebook-with-decorative-cover",  label: "纯文本",   keywords: "text txt log csv note memo",            group: "文件" },
  "file-diagram":  { default: "fluent-emoji-flat:bar-chart",              label: "图表",     keywords: "diagram svg plantuml chart blueprint",  group: "文件" },
  "file-image":    { default: "fluent-emoji-flat:framed-picture",         label: "图片",     keywords: "image photo picture frame polaroid",    group: "文件" },
  "file-audio":    { default: "fluent-emoji-flat:musical-note",           label: "音频",     keywords: "audio music mp3 wav sound record",      group: "文件" },
  "file-video":    { default: "fluent-emoji-flat:clapper-board",          label: "视频",     keywords: "video movie film mp4 clapper",          group: "文件" },
  "file-archive":  { default: "fluent-emoji-flat:package",                label: "压缩包",   keywords: "archive zip tar package compress gift", group: "文件" },
  "file-font":     { default: "fluent-emoji-flat:input-latin-uppercase",  label: "字体",     keywords: "font ttf otf woff typography letter",   group: "文件" },
  "file-unknown":  { default: "fluent-emoji-flat:page-facing-up",         label: "未知文件", keywords: "unknown file document default",          group: "文件" },
};

// ---------------------------------------------------------------------------
// File-type → icon-name mapping (shared by FileTree + FilePreview)
// ---------------------------------------------------------------------------

const _MD     = new Set([".md", ".mdx"]);
const _HTML   = new Set([".html", ".htm"]);
const _DIAG   = new Set([".svg", ".puml", ".plantuml", ".pu", ".wsd"]);
const _IMG    = new Set([".png", ".jpg", ".jpeg", ".gif", ".webp", ".ico", ".bmp"]);
const _AUDIO  = new Set([".mp3", ".wav", ".ogg", ".flac", ".aac", ".m4a"]);
const _VIDEO  = new Set([".mp4", ".webm", ".mov", ".avi", ".mkv"]);
const _CFG    = new Set([".json", ".yaml", ".yml", ".toml", ".ini", ".cfg", ".env", ".gitignore"]);
const _TXT    = new Set([".txt", ".log", ".csv"]);
const _ARC    = new Set([".zip", ".tar", ".gz", ".7z", ".rar", ".bz2", ".xz"]);
const _FONT   = new Set([".ttf", ".otf", ".woff", ".woff2"]);
const _CODE   = new Set([
  ".py", ".ts", ".tsx", ".js", ".jsx", ".css",
  ".sh", ".c", ".h", ".cpp", ".go", ".rs", ".rb", ".php", ".swift", ".sql", ".lua", ".kt",
]);
const _CNAMES = new Set(["makefile", "dockerfile"]);

export function fileIconName(filename: string, isDirectory: boolean): string {
  if (isDirectory) return "file-folder";
  const dot = filename.lastIndexOf(".");
  const ext = dot >= 0 ? filename.slice(dot).toLowerCase() : "";
  const lower = filename.toLowerCase();
  if (ext === ".pdf") return "file-pdf";
  if (_MD.has(ext)) return "file-markdown";
  if (_HTML.has(ext)) return "file-html";
  if (_DIAG.has(ext)) return "file-diagram";
  if (_IMG.has(ext)) return "file-image";
  if (_AUDIO.has(ext)) return "file-audio";
  if (_VIDEO.has(ext)) return "file-video";
  if (_ARC.has(ext)) return "file-archive";
  if (_FONT.has(ext)) return "file-font";
  if (_CFG.has(ext)) return "file-config";
  if (_TXT.has(ext)) return "file-text";
  if (_CODE.has(ext) || _CNAMES.has(lower)) return "file-code";
  return "file-unknown";
}

const STORAGE_KEY = "openbuddy.sticker-map";

function loadOverrides(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
}

interface IconMapCtx {
  map: Record<string, string>;
  setIcon: (name: string, iconId: string) => void;
  resetIcon: (name: string) => void;
  resetAll: () => void;
}

const IconMapContext = createContext<IconMapCtx>({
  map: {},
  setIcon: () => {},
  resetIcon: () => {},
  resetAll: () => {},
});

export function IconMapProvider({ children }: { children: React.ReactNode }) {
  const [overrides, setOverrides] = useState(loadOverrides);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(overrides));
  }, [overrides]);

  const setIcon = useCallback((name: string, iconId: string) => {
    setOverrides((prev) => ({ ...prev, [name]: iconId }));
  }, []);

  const resetIcon = useCallback((name: string) => {
    setOverrides((prev) => {
      const next = { ...prev };
      delete next[name];
      return next;
    });
  }, []);

  const resetAll = useCallback(() => setOverrides({}), []);

  const map = useMemo(() => {
    const m: Record<string, string> = {};
    for (const [name, entry] of Object.entries(ICON_REGISTRY)) {
      m[name] = overrides[name] || entry.default;
    }
    return m;
  }, [overrides]);

  return (
    <IconMapContext.Provider value={{ map, setIcon, resetIcon, resetAll }}>
      {children}
    </IconMapContext.Provider>
  );
}

export function useIconMap() {
  return useContext(IconMapContext);
}

type MappedIconProps = Omit<ComponentProps<typeof Icon>, "icon"> & { name: string };

export function MappedIcon({ name, ...props }: MappedIconProps) {
  const { map } = useIconMap();
  const entry = ICON_REGISTRY[name];
  const iconId = map[name] || entry?.default || name;
  return <Icon icon={iconId} {...props} />;
}
