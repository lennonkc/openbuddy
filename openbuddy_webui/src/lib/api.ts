const base = "";  // dev: 走 vite proxy；prod: 静态 + 同源

export async function listKeys(): Promise<Record<string, string | null>> {
  return (await fetch(`${base}/api/keys`)).json();
}

export async function setKey(name: string, value: string): Promise<void> {
  const r = await fetch(`${base}/api/keys`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, value }),
  });
  if (!r.ok) throw new Error(`PUT /api/keys ${r.status}`);
}

export async function getConfig(): Promise<{ cwd: string; buddy_skin: string }> {
  return (await fetch(`${base}/api/config`)).json();
}

export async function updateConfig(updates: Partial<{ cwd: string; buddy_skin: string }>): Promise<void> {
  const r = await fetch(`${base}/api/config`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updates),
  });
  if (!r.ok) throw new Error(`PUT /api/config ${r.status}`);
}

export async function setCwd(cwd: string): Promise<void> {
  await updateConfig({ cwd });
}

export async function suggestPaths(prefix: string): Promise<string[]> {
  const r = await fetch(`${base}/api/fs/suggest?prefix=${encodeURIComponent(prefix)}`);
  return (await r.json()).items;
}

export async function getPrompts(): Promise<{ stage1: string | null; stage2: string | null }> {
  return (await fetch(`${base}/api/prompts`)).json();
}

export async function setPrompts(stage1: string, stage2: string): Promise<void> {
  const r = await fetch(`${base}/api/prompts`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ stage1, stage2 }),
  });
  if (!r.ok) throw new Error(`PUT /api/prompts ${r.status}`);
}

export async function deletePrompts(): Promise<void> {
  const r = await fetch(`${base}/api/prompts`, { method: "DELETE" });
  if (!r.ok) throw new Error(`DELETE /api/prompts ${r.status}`);
}

// --- Agent Prompt ---

export async function getAgentPrompt(): Promise<{ system_prompt: string | null }> {
  return (await fetch(`${base}/api/agent-prompt`)).json();
}

export async function setAgentPrompt(system_prompt: string): Promise<void> {
  const r = await fetch(`${base}/api/agent-prompt`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ system_prompt }),
  });
  if (!r.ok) throw new Error(`PUT /api/agent-prompt ${r.status}`);
}


// --- LLM Config ---

export type LlmConfig = { base_url: string; model: string };

export async function getLlmConfig(): Promise<LlmConfig> {
  const r = await fetch(`${base}/api/llm-config`);
  if (!r.ok) throw new Error(`GET /api/llm-config ${r.status}`);
  return r.json();
}

export async function updateLlmConfig(updates: Partial<LlmConfig>): Promise<void> {
  const r = await fetch(`${base}/api/llm-config`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updates),
  });
  if (!r.ok) throw new Error(`PUT /api/llm-config ${r.status}`);
}

export async function deleteLlmConfig(): Promise<void> {
  const r = await fetch(`${base}/api/llm-config`, { method: "DELETE" });
  if (!r.ok) throw new Error(`DELETE /api/llm-config ${r.status}`);
}

export type Device = {
  mac: string;
  name: string;
  online: boolean;
  fw_version: string | null;
  connected_since: string | null;
};

export async function getDevices(): Promise<Device[]> {
  return (await fetch(`${base}/api/devices`)).json();
}

export async function addDevice(mac: string, name?: string): Promise<void> {
  const r = await fetch(`${base}/api/devices`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mac, name }),
  });
  if (!r.ok) throw new Error(`POST /api/devices ${r.status}`);
}

export async function removeDevice(mac: string): Promise<void> {
  await fetch(`${base}/api/devices/${encodeURIComponent(mac)}`, { method: "DELETE" });
}

export async function getMdns(): Promise<{
  broadcasting: boolean; hostname: string; ip: string; port: number;
}> {
  return (await fetch(`${base}/api/mdns`)).json();
}

export async function pickDirectory(
  defaultPath?: string,
  signal?: AbortSignal,
): Promise<{ path: string | null; cancelled: boolean }> {
  const r = await fetch(`${base}/api/fs/pick-directory`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ default_path: defaultPath ?? null }),
    signal,
  });
  if (r.status === 409) throw new Error("一个文件夹选择对话框已经打开");
  if (r.status === 501) throw new Error("当前平台不支持原生文件夹选择");
  if (!r.ok) throw new Error(`选择文件夹失败 (${r.status})`);
  return r.json();
}

// --- Permissions ---

export type ToolPolicy = "always_ask" | "always_allow";

export type ToolPermConfig = {
  enabled: boolean;
  policy: ToolPolicy;
};

export type PermissionsConfig = {
  default_policy: ToolPolicy;
  timeout_seconds: number;
  deny_interrupts: boolean;
  tools: Record<string, ToolPermConfig>;
};

export async function getPermissions(): Promise<PermissionsConfig> {
  const r = await fetch(`${base}/api/permissions`);
  if (!r.ok) throw new Error(`GET /api/permissions ${r.status}`);
  return r.json();
}

export async function updatePermissions(config: PermissionsConfig): Promise<void> {
  const r = await fetch(`${base}/api/permissions`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(config),
  });
  if (!r.ok) throw new Error(`PUT /api/permissions ${r.status}`);
}

// --- Authorization ---

export async function approveAuth(requestId: string): Promise<void> {
  const r = await fetch(`${base}/api/auth/${encodeURIComponent(requestId)}/approve`, {
    method: "POST",
  });
  if (!r.ok) throw new Error(`approve failed: ${r.status}`);
}

// --- File System (Room page) ---

export type FileItem = {
  name: string;
  type: "file" | "directory";
  size: number;
  mtime: number;
};

export type FileStat = {
  name: string;
  type: "file" | "directory";
  size: number;
  mtime: number;
  mime: string | null;
};

export async function listFiles(path: string): Promise<{ items: FileItem[] }> {
  const r = await fetch(`${base}/api/fs/list?path=${encodeURIComponent(path)}`);
  if (!r.ok) throw new Error(`GET /api/fs/list ${r.status}`);
  return r.json();
}

export async function fileStat(path: string): Promise<FileStat> {
  const r = await fetch(`${base}/api/fs/stat?path=${encodeURIComponent(path)}`);
  if (!r.ok) throw new Error(`GET /api/fs/stat ${r.status}`);
  return r.json();
}

export async function readTextFile(
  path: string,
): Promise<{ content: string; truncated: boolean }> {
  const r = await fetch(`${base}/api/fs/read?path=${encodeURIComponent(path)}`);
  if (!r.ok) throw new Error(`GET /api/fs/read ${r.status}`);
  return r.json();
}

export function fileUrl(path: string): string {
  return `${base}/api/fs/read?path=${encodeURIComponent(path)}`;
}
