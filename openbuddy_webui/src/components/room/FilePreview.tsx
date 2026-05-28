import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { MappedIcon, fileIconName } from "@/lib/icons";
import Markdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { codeToHtml } from "shiki";
import { fileStat, readTextFile, fileUrl, type FileStat } from "@/lib/api";
import { categorize, extOf, fileBasename as basename, type Category } from "@/lib/fileCategory";

function langFor(name: string): string {
  const ext = extOf(name);
  const lower = name.toLowerCase();
  const map: Record<string, string> = {
    ".py": "python", ".ts": "typescript", ".tsx": "tsx", ".js": "javascript",
    ".jsx": "jsx", ".css": "css", ".html": "html", ".json": "json",
    ".yaml": "yaml", ".yml": "yaml", ".toml": "toml", ".sh": "bash",
    ".c": "c", ".h": "c", ".cpp": "cpp", ".go": "go", ".rs": "rust",
    ".rb": "ruby", ".php": "php", ".swift": "swift", ".sql": "sql",
    ".lua": "lua", ".kt": "kotlin",
    ".txt": "text", ".log": "text", ".csv": "text",
    ".ini": "ini", ".cfg": "ini", ".env": "text", ".gitignore": "text",
  };
  if (lower === "makefile") return "makefile";
  if (lower === "dockerfile") return "dockerfile";
  return map[ext] || "text";
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function mimeSubtype(mime: string | null): string {
  if (!mime) return "";
  const slash = mime.indexOf("/");
  return slash >= 0 ? mime.slice(slash + 1) : mime;
}

const TOGGLE_BTN = "absolute top-2 right-3 z-10 px-2 py-0.5 rounded text-[0.625rem] font-medium border transition-colors bg-candy-cream border-candy-border/40 text-candy-cocoa/70 hover:text-candy-cocoa hover:border-candy-border/70";

// ---------------------------------------------------------------------------
// ShikiCodeBlock — async syntax highlighting for markdown code blocks
// ---------------------------------------------------------------------------

function ShikiCodeBlock({ lang, code }: { lang: string; code: string }) {
  const [html, setHtml] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    codeToHtml(code, { lang, theme: "github-dark-default" })
      .then((h) => { if (!cancelled) setHtml(h); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [code, lang]);

  if (html) {
    return (
      <div
        className="[&_pre]:!p-4 [&_pre]:!m-0 [&_code]:!text-[0.8125rem] [&_code]:!leading-relaxed"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  }

  return (
    <pre className="p-4 bg-[#0d1117] text-gray-300 text-[0.8125rem] leading-relaxed font-mono">
      <code>{code}</code>
    </pre>
  );
}

// ---------------------------------------------------------------------------
// MermaidBlock — renders mermaid diagrams inside markdown
// ---------------------------------------------------------------------------

let mermaidMod: typeof import("mermaid") | null = null;
let mermaidSeq = 0;

function MermaidBlock({ code }: { code: string }) {
  const { t } = useTranslation();
  const [svg, setSvg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (!mermaidMod) {
          mermaidMod = await import("mermaid");
          mermaidMod.default.initialize({ startOnLoad: false, theme: "default", securityLevel: "strict" });
        }
        const { svg: rendered } = await mermaidMod.default.render(`mmd-${++mermaidSeq}`, code);
        if (!cancelled) setSvg(rendered);
      } catch (e) {
        if (!cancelled) setError((e as Error).message);
      }
    })();
    return () => { cancelled = true; };
  }, [code]);

  if (error) {
    return (
      <div className="my-3 rounded-lg overflow-hidden border border-red-200/60">
        <div className="px-3 py-1.5 bg-red-50 text-red-500 text-[0.6875rem]">{t("room.filePreview.mermaidFailed")}</div>
        <pre className="p-4 bg-[#0d1117] text-gray-300 text-[0.8125rem] leading-relaxed font-mono overflow-x-auto">
          <code>{code}</code>
        </pre>
      </div>
    );
  }

  if (!svg) {
    return (
      <div className="my-3 flex items-center justify-center p-8 bg-candy-cream-dark/20 rounded-lg">
        <MappedIcon name="loading" width={14} className="animate-spin text-candy-caramel" />
      </div>
    );
  }

  return (
    <div
      className="my-3 flex justify-center p-4 bg-white rounded-lg border border-candy-border/30 [&_svg]:max-w-full"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}

// ---------------------------------------------------------------------------
// Markdown custom components
// ---------------------------------------------------------------------------

const mdComponents: Components = {
  pre({ children }) {
    return <div className="my-3 rounded-lg overflow-hidden shadow-sm">{children}</div>;
  },
  code(props) {
    const { className, children, ...rest } = props;
    const match = /language-(\w+)/.exec(className || "");
    const text = String(children).replace(/\n$/, "");

    if (match) {
      if (match[1] === "mermaid") {
        return <MermaidBlock code={text} />;
      }
      return <ShikiCodeBlock lang={match[1]} code={text} />;
    }

    if (text.includes("\n")) {
      return (
        <pre className="p-4 bg-[#0d1117] text-gray-300 text-[0.8125rem] leading-relaxed font-mono overflow-x-auto">
          <code>{children}</code>
        </pre>
      );
    }

    return (
      <code
        className="px-1.5 py-0.5 bg-candy-cream-dark text-candy-pink rounded text-[0.85em] font-mono border border-candy-border/30"
        {...rest}
      >
        {children}
      </code>
    );
  },
  table({ children }: { children?: ReactNode }) {
    return (
      <div className="my-4 overflow-x-auto rounded-lg border border-candy-border/50">
        <table className="w-full text-sm">{children}</table>
      </div>
    );
  },
  thead({ children }: { children?: ReactNode }) {
    return <thead className="bg-candy-cream-dark/60">{children}</thead>;
  },
  th({ children }: { children?: ReactNode }) {
    return (
      <th className="px-3 py-2 text-left text-xs font-semibold text-candy-cocoa border-b border-candy-border/40">
        {children}
      </th>
    );
  },
  td({ children }: { children?: ReactNode }) {
    return (
      <td className="px-3 py-2 text-sm text-candy-cocoa/85 border-b border-candy-border/20">
        {children}
      </td>
    );
  },
  blockquote({ children }: { children?: ReactNode }) {
    return (
      <blockquote className="my-3 pl-4 border-l-[3px] border-candy-orange/40 bg-candy-cream-dark/30 rounded-r-lg py-2 text-candy-cocoa/80 italic [&>p]:my-1">
        {children}
      </blockquote>
    );
  },
  a(props) {
    const { href, children } = props;
    return (
      <a
        href={href}
        className="text-candy-orange hover:text-candy-pink transition-colors underline decoration-candy-orange/30 hover:decoration-candy-pink/50 underline-offset-2"
        target="_blank"
        rel="noopener noreferrer"
      >
        {children}
      </a>
    );
  },
  hr() {
    return <hr className="my-6 border-candy-border/40" />;
  },
  img(props) {
    return (
      <img
        src={props.src}
        alt={props.alt || ""}
        className="rounded-lg shadow-candy max-w-full my-3"
      />
    );
  },
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface PreviewState {
  stat: FileStat | null;
  loading: boolean;
  error: string | null;
  htmlContent: string | null;
  textContent: string | null;
  forPath: string;
}

const TEXT_CATEGORIES = new Set<Category>(["code", "markdown", "html", "svg", "puml"]);

export function FilePreview({ path }: { path: string }) {
  const { t } = useTranslation();
  const [state, setState] = useState<PreviewState>({
    stat: null,
    loading: true,
    error: null,
    htmlContent: null,
    textContent: null,
    forPath: path,
  });
  const reqIdRef = useRef(0);

  if (state.forPath !== path) {
    setState({
      stat: null,
      loading: true,
      error: null,
      htmlContent: null,
      textContent: null,
      forPath: path,
    });
  }

  useEffect(() => {
    const reqId = ++reqIdRef.current;
    const filename = basename(path);
    const category = categorize(filename);

    fileStat(path)
      .then(async (s) => {
        if (reqId !== reqIdRef.current) return;

        if (TEXT_CATEGORIES.has(category)) {
          try {
            const { content } = await readTextFile(path);
            if (reqId !== reqIdRef.current) return;

            if (category === "code") {
              const html = await codeToHtml(content, {
                lang: langFor(filename),
                theme: "github-dark-default",
              });
              if (reqId !== reqIdRef.current) return;
              setState({ forPath: path, stat: s, loading: false, error: null, htmlContent: html, textContent: null });
            } else {
              setState({ forPath: path, stat: s, loading: false, error: null, htmlContent: null, textContent: content });
            }
          } catch (err) {
            if (reqId !== reqIdRef.current) return;
            setState({ forPath: path, stat: s, loading: false, error: (err as Error).message, htmlContent: null, textContent: null });
          }
        } else {
          setState({ forPath: path, stat: s, loading: false, error: null, htmlContent: null, textContent: null });
        }
      })
      .catch((err) => {
        if (reqId !== reqIdRef.current) return;
        setState({ forPath: path, stat: null, loading: false, error: (err as Error).message, htmlContent: null, textContent: null });
      });
  }, [path]);

  const filename = basename(path);
  const category = categorize(filename);
  const { stat, loading, error, htmlContent, textContent } = state;

  if (loading) {
    return (
      <div className="flex flex-col h-full">
        <HeaderBar filename={filename} stat={null} />
        <div className="flex-1 flex items-center justify-center text-candy-caramel">
          <MappedIcon name="loading" width={16} className="animate-spin" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col h-full">
        <HeaderBar filename={filename} stat={stat} />
        <div className="flex-1 flex flex-col items-center justify-center gap-2 text-candy-pink">
          <span className="text-xl">{"\u{1F635}"}</span>
          <span className="text-xs">{t("room.filePreview.readFailed", { error })}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <HeaderBar filename={filename} stat={stat} />
      <div className="flex-1 overflow-auto min-h-0">
        {category === "code" && htmlContent && (
          <div
            className="bg-[#0d1117] min-h-full [&_pre]:!p-4 [&_pre]:!m-0 [&_pre]:!bg-transparent [&_code]:!text-[0.8125rem] [&_code]:!leading-relaxed"
            dangerouslySetInnerHTML={{ __html: htmlContent }}
          />
        )}

        {category === "html" && textContent !== null && (
          <HtmlPreview content={textContent} filename={filename} />
        )}

        {category === "svg" && textContent !== null && (
          <SvgPreview content={textContent} filename={filename} />
        )}

        {category === "puml" && textContent !== null && (
          <PumlPreview content={textContent} filename={filename} />
        )}

        {category === "markdown" && textContent !== null && (
          <div className="p-5 xl:p-6 prose prose-sm max-w-none prose-headings:text-candy-cocoa prose-headings:font-bold prose-p:text-candy-cocoa/90 prose-p:leading-relaxed prose-strong:text-candy-cocoa prose-li:text-candy-cocoa/85 prose-li:marker:text-candy-orange/60 prose-hr:border-candy-border/40 prose-h1:text-xl prose-h1:pb-2 prose-h1:border-b prose-h1:border-candy-border/30 prose-h2:text-lg prose-h3:text-base">
            <Markdown remarkPlugins={[remarkGfm]} components={mdComponents}>
              {textContent}
            </Markdown>
          </div>
        )}

        {category === "image" && (
          <ZoomPanView>
            <img
              src={fileUrl(path)}
              alt={filename}
              className="max-w-full max-h-full object-contain rounded-lg shadow-lg"
              draggable={false}
            />
          </ZoomPanView>
        )}

        {category === "pdf" && (
          <iframe src={fileUrl(path)} title={filename} className="w-full h-full border-0" />
        )}

        {category === "audio" && (
          <div className="flex flex-col items-center justify-center gap-3 p-8 h-full">
            <span className="text-4xl">{"\u{1F3B5}"}</span>
            <audio controls src={fileUrl(path)} className="w-full max-w-md">
              <track kind="captions" />
            </audio>
          </div>
        )}

        {category === "video" && (
          <div className="flex items-center justify-center p-4 h-full bg-black/5">
            <video
              controls
              src={fileUrl(path)}
              className="max-w-full max-h-full rounded-lg shadow-lg"
            >
              <track kind="captions" />
            </video>
          </div>
        )}

        {category === "unknown" && (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-candy-caramel">
            <span className="text-3xl opacity-40">{"\u{1F937}"}</span>
            <span className="text-xs">{t("room.filePreview.unsupportedType")}</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// HtmlPreview — live preview with source toggle
// ---------------------------------------------------------------------------

function HtmlPreview({ content, filename }: { content: string; filename: string }) {
  const { t } = useTranslation();
  const [showSource, setShowSource] = useState(false);

  return (
    <div className="relative h-full">
      <button onClick={() => setShowSource((v) => !v)} className={TOGGLE_BTN}>
        {showSource ? t("common.preview") : t("common.source")}
      </button>
      {showSource ? (
        <div className="h-full overflow-auto">
          <ShikiCodeBlock lang="html" code={content} />
        </div>
      ) : (
        <iframe
          srcDoc={content}
          sandbox="allow-scripts"
          title={filename}
          className="w-full h-full border-0 bg-white"
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// ZoomPanView — shared zoom + drag-pan container for image previews
// ---------------------------------------------------------------------------

const ZOOM_STEPS = [25, 50, 75, 100, 150, 200, 300, 400];

function ZoomPanView({ bg, children }: { bg?: string; children: ReactNode }) {
  const [scale, setScale] = useState(100);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const dragRef = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null);

  const resetView = useCallback(() => { setScale(100); setOffset({ x: 0, y: 0 }); }, []);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    e.preventDefault();
    setDragging(true);
    dragRef.current = { startX: e.clientX, startY: e.clientY, origX: offset.x, origY: offset.y };
  }, [offset]);

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!dragRef.current) return;
      const { startX, startY, origX, origY } = dragRef.current;
      setOffset({ x: origX + e.clientX - startX, y: origY + e.clientY - startY });
    };
    const onMouseUp = () => { dragRef.current = null; setDragging(false); };
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => { window.removeEventListener("mousemove", onMouseMove); window.removeEventListener("mouseup", onMouseUp); };
  }, []);

  const idx = ZOOM_STEPS.indexOf(scale);

  return (
    <div className={`relative h-full overflow-hidden ${bg ?? "bg-[#f8f6f3]"}`}>
      <div
        className="h-full flex items-center justify-center p-6"
        style={{ transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale / 100})`, transformOrigin: "center center", cursor: dragging ? "grabbing" : "grab" }}
        onMouseDown={onMouseDown}
      >
        {children}
      </div>
      <div className="absolute bottom-3 right-3 z-10 flex items-center gap-0.5 rounded-md border border-candy-border/40 bg-candy-cream shadow-sm">
        <button onClick={() => { setScale(ZOOM_STEPS[Math.max(0, idx - 1)]); }} disabled={idx <= 0} className="px-1.5 py-0.5 text-xs text-candy-cocoa/70 hover:text-candy-cocoa disabled:opacity-30">−</button>
        <button onClick={resetView} className="px-1 py-0.5 text-[0.5625rem] tabular-nums text-candy-cocoa/60 hover:text-candy-cocoa min-w-[2.5rem] text-center">{scale}%</button>
        <button onClick={() => { setScale(ZOOM_STEPS[Math.min(ZOOM_STEPS.length - 1, idx + 1)]); }} disabled={idx >= ZOOM_STEPS.length - 1} className="px-1.5 py-0.5 text-xs text-candy-cocoa/70 hover:text-candy-cocoa disabled:opacity-30">+</button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// SvgPreview — rendered SVG with source toggle + zoom/pan
// ---------------------------------------------------------------------------

function SvgPreview({ content, filename }: { content: string; filename: string }) {
  const { t } = useTranslation();
  const [showSource, setShowSource] = useState(false);

  return (
    <div className="relative h-full">
      <button onClick={() => setShowSource((v) => !v)} className={TOGGLE_BTN}>
        {showSource ? t("common.preview") : t("common.source")}
      </button>
      {showSource ? (
        <div className="h-full overflow-auto">
          <ShikiCodeBlock lang="xml" code={content} />
        </div>
      ) : (
        <ZoomPanView>
          <img
            src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(content)}`}
            alt={filename}
            className="rounded-lg shadow-lg"
            draggable={false}
          />
        </ZoomPanView>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// PumlPreview — PlantUML rendered via public server with source toggle + zoom/pan
// ---------------------------------------------------------------------------

function PumlPreview({ content, filename }: { content: string; filename: string }) {
  const { t } = useTranslation();
  const [showSource, setShowSource] = useState(false);
  const [svgData, setSvgData] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const mod = await import("plantuml-encoder");
        const encode = mod.default?.encode ?? mod.encode;
        const url = `https://www.plantuml.com/plantuml/svg/${encode(content)}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const svg = await res.text();
        if (!cancelled) setSvgData(svg);
      } catch (e) {
        if (!cancelled) setError((e as Error).message);
      }
    })();
    return () => { cancelled = true; };
  }, [content]);

  return (
    <div className="relative h-full">
      <button onClick={() => setShowSource((v) => !v)} className={TOGGLE_BTN}>
        {showSource ? t("common.preview") : t("common.source")}
      </button>
      {showSource ? (
        <div className="h-full overflow-auto">
          <ShikiCodeBlock lang="text" code={content} />
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center h-full gap-2 text-candy-caramel">
          <span className="text-2xl opacity-50">{"\u{1F30F}"}</span>
          <span className="text-xs">{t("room.filePreview.plantumlFailed")}</span>
        </div>
      ) : svgData ? (
        <ZoomPanView bg="bg-white">
          <img
            src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgData)}`}
            alt={filename}
            className="object-contain"
            draggable={false}
          />
        </ZoomPanView>
      ) : (
        <div className="flex items-center justify-center h-full">
          <MappedIcon name="loading" width={16} className="animate-spin text-candy-caramel" />
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// HeaderBar
// ---------------------------------------------------------------------------

function HeaderBar({
  filename,
  stat,
}: {
  filename: string;
  stat: FileStat | null;
}) {
  return (
    <div className="flex items-center justify-between px-4 py-2 border-b border-candy-border/30 shrink-0">
      <span className="text-xs text-candy-cocoa font-medium truncate flex items-center gap-1.5">
        <MappedIcon name={fileIconName(filename, false)} width={12} className="shrink-0" />
        {filename}
      </span>
      {stat && (
        <span className="text-[0.5625rem] text-candy-caramel/50 shrink-0 ml-2 tabular-nums">
          {mimeSubtype(stat.mime)}
          {stat.mime ? " · " : ""}
          {formatSize(stat.size)}
        </span>
      )}
    </div>
  );
}
