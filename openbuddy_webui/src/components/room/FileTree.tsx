import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { MappedIcon, fileIconName } from "@/lib/icons";
import { listFiles, type FileItem } from "@/lib/api";

interface FileTreeProps {
  cwd: string;
  selectedPath: string | null;
  onSelectFile: (path: string) => void;
}

interface TreeNode {
  item: FileItem;
  path: string;
  depth: number;
  expanded: boolean;
  loading: boolean;
  children: TreeNode[] | undefined;
}

interface RootState {
  nodes: TreeNode[];
  loading: boolean;
  error: string | null;
  forCwd: string;
}

function joinPath(base: string, name: string): string {
  return base.endsWith("/") ? base + name : base + "/" + name;
}

export function FileTree({ cwd, selectedPath, onSelectFile }: FileTreeProps) {
  const { t } = useTranslation();
  const [root, setRoot] = useState<RootState>({
    nodes: [],
    loading: true,
    error: null,
    forCwd: cwd,
  });
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  if (root.forCwd !== cwd) {
    setRoot({ nodes: [], loading: true, error: null, forCwd: cwd });
  }

  useEffect(() => {
    let cancelled = false;

    listFiles(cwd)
      .then(({ items }) => {
        if (cancelled) return;
        setRoot({
          forCwd: cwd,
          loading: false,
          error: null,
          nodes: items.map((item) => ({
            item,
            path: joinPath(cwd, item.name),
            depth: 0,
            expanded: false,
            loading: false,
            children: undefined,
          })),
        });
      })
      .catch((err) => {
        if (cancelled) return;
        setRoot({ forCwd: cwd, loading: false, error: (err as Error).message, nodes: [] });
      });

    return () => {
      cancelled = true;
    };
  }, [cwd]);

  const toggleDir = useCallback(
    (targetPath: string) => {
      function updateInList(list: TreeNode[]): TreeNode[] {
        return list.map((node) => {
          if (node.path === targetPath) {
            if (node.expanded) {
              return { ...node, expanded: false };
            }
            if (node.children !== undefined) {
              return { ...node, expanded: true };
            }
            const loading = { ...node, loading: true, expanded: true };
            listFiles(node.path)
              .then(({ items }) => {
                if (!mountedRef.current) return;
                setRoot((prev) => ({
                  ...prev,
                  nodes: deepUpdate(prev.nodes, targetPath, (n) => ({
                    ...n,
                    loading: false,
                    children: items.map((item) => ({
                      item,
                      path: joinPath(n.path, item.name),
                      depth: n.depth + 1,
                      expanded: false,
                      loading: false,
                      children: undefined,
                    })),
                  })),
                }));
              })
              .catch(() => {
                if (!mountedRef.current) return;
                setRoot((prev) => ({
                  ...prev,
                  nodes: deepUpdate(prev.nodes, targetPath, (n) => ({
                    ...n,
                    loading: false,
                    children: [],
                  })),
                }));
              });
            return loading;
          }
          if (node.children) {
            return { ...node, children: updateInList(node.children) };
          }
          return node;
        });
      }

      setRoot((prev) => ({ ...prev, nodes: updateInList(prev.nodes) }));
    },
    [],
  );

  const rows = flattenNodes(root.nodes);
  const fileCount = rows.filter((r) => r.item.type === "file").length;
  const dirCount = rows.filter((r) => r.item.type === "directory").length;

  return (
    <div className="flex flex-col h-full select-none bg-candy-cream/30">
      <div className="px-3 py-2 border-b border-candy-border/30">
        <span className="text-sm text-candy-cocoa font-semibold tracking-tight">
          {t("room.fileTree.header")}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0 py-1">
        {root.loading && (
          <div className="flex items-center justify-center py-8 text-candy-caramel">
            <MappedIcon name="loading" width={14} className="animate-spin" />
          </div>
        )}
        {root.error && (
          <div className="px-3 py-4 text-xs text-candy-pink text-center">
            {"\u{1F635}"} {root.error}
          </div>
        )}
        {!root.loading && !root.error && rows.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 gap-2">
            <span className="text-2xl opacity-40">📭</span>
            <span className="text-xs text-candy-caramel/60">{t("room.fileTree.empty")}</span>
          </div>
        )}
        {rows.map((node) => (
          <TreeRow
            key={node.path}
            node={node}
            selected={selectedPath === node.path}
            onToggle={toggleDir}
            onSelect={onSelectFile}
          />
        ))}
      </div>

      {!root.loading && !root.error && rows.length > 0 && (
        <div className="px-3 py-1.5 border-t border-candy-border/30 text-[0.6875rem] text-candy-caramel/50 tabular-nums">
          {t("room.fileTree.stats", { fileCount, dirCount })}
        </div>
      )}
    </div>
  );
}

function TreeRow({
  node,
  selected,
  onToggle,
  onSelect,
}: {
  node: TreeNode;
  selected: boolean;
  onToggle: (path: string) => void;
  onSelect: (path: string) => void;
}) {
  const isDir = node.item.type === "directory";

  function handleClick() {
    if (isDir) {
      onToggle(node.path);
    } else {
      onSelect(node.path);
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`
        w-full flex items-center gap-1.5 py-1 text-left
        text-xs transition-colors duration-100
        ${selected
          ? "bg-candy-orange/10 text-candy-orange"
          : "text-candy-cocoa/75 hover:bg-candy-cream-dark/60 hover:text-candy-cocoa"
        }
      `}
      style={{ paddingLeft: `${node.depth * 0.875 + 0.625}rem`, paddingRight: "0.5rem" }}
    >
      <span className="w-3.5 text-center text-[0.6875rem] text-candy-caramel/60 shrink-0">
        {isDir ? (
          node.loading ? (
            <MappedIcon name="loading" width={8} className="animate-spin inline-block" />
          ) : node.expanded ? (
            "▾"
          ) : (
            "▸"
          )
        ) : null}
      </span>

      <MappedIcon name={fileIconName(node.item.name, isDir)} width={21} className="shrink-0" />

      <span className={`truncate text-[0.8125rem] ${isDir ? "font-medium" : "font-mono"}`}>
        {node.item.name}
      </span>
    </button>
  );
}

function flattenNodes(nodes: TreeNode[]): TreeNode[] {
  const result: TreeNode[] = [];
  function walk(list: TreeNode[]) {
    for (const node of list) {
      result.push(node);
      if (node.expanded && node.children) {
        walk(node.children);
      }
    }
  }
  walk(nodes);
  return result;
}

function deepUpdate(
  nodes: TreeNode[],
  targetPath: string,
  updater: (n: TreeNode) => TreeNode,
): TreeNode[] {
  return nodes.map((node) => {
    if (node.path === targetPath) return updater(node);
    if (node.children) {
      return { ...node, children: deepUpdate(node.children, targetPath, updater) };
    }
    return node;
  });
}
