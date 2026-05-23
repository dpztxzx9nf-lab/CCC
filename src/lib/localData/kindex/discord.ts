import { readdir, readFile, stat } from "fs/promises";
import path from "path";
import { SCAN_IGNORE_DIRS } from "@/lib/localData/config";
import type { Sector } from "@/lib/operations/types";

const MAX_SCAN_DEPTH = 5;
const MAX_FILES = 180;
const MAX_JSON_BYTES = 1_250_000;

const DISCORD_PATH_RE =
  /discord|forum|forums|thread|threads|channel|channels|message|messages|export|logs/i;
const JSON_EXT_RE = /\.(json|jsonl)$/i;
const TEXT_EXT_RE = /\.(md|txt|log)$/i;

const CATEGORY_RULES: { sector: Sector; key: keyof DiscordCategoryCounts; re: RegExp }[] = [
  {
    sector: "observatory",
    key: "architecture",
    re: /architecture|architectural|philosophy|ontology|principle|vision|model|schema/i,
  },
  {
    sector: "relay",
    key: "community",
    re: /general|community|announcement|introductions|chat|social|public|welcome/i,
  },
  {
    sector: "archive",
    key: "knowledge",
    re: /docs|documentation|knowledge|archive|source|reference|faq|guide|notes/i,
  },
  {
    sector: "runtime",
    key: "runtime",
    re: /debug|bug|error|incident|runtime|bot|pm2|ops|coordination|support/i,
  },
  {
    sector: "forge",
    key: "forge",
    re: /code|coding|build|deploy|deployment|release|feature|implementation|pr|commit/i,
  },
];

export interface DiscordCategoryCounts {
  architecture: number;
  community: number;
  knowledge: number;
  runtime: number;
  forge: number;
}

export interface DiscordContinuityObservation {
  artifactCount: number;
  jsonArtifactCount: number;
  textArtifactCount: number;
  threadCount: number;
  channelCount: number;
  messageCount: number;
  latestActivityAt: string | null;
  channelNames: string[];
  threadNames: string[];
  categoryCounts: DiscordCategoryCounts;
  truncated: boolean;
}

interface MutableObservation extends DiscordContinuityObservation {
  channelNameSet: Set<string>;
  threadNameSet: Set<string>;
}

function emptyObservation(): MutableObservation {
  return {
    artifactCount: 0,
    jsonArtifactCount: 0,
    textArtifactCount: 0,
    threadCount: 0,
    channelCount: 0,
    messageCount: 0,
    latestActivityAt: null,
    channelNames: [],
    threadNames: [],
    categoryCounts: {
      architecture: 0,
      community: 0,
      knowledge: 0,
      runtime: 0,
      forge: 0,
    },
    truncated: false,
    channelNameSet: new Set(),
    threadNameSet: new Set(),
  };
}

function finalizeObservation(obs: MutableObservation): DiscordContinuityObservation {
  return {
    artifactCount: obs.artifactCount,
    jsonArtifactCount: obs.jsonArtifactCount,
    textArtifactCount: obs.textArtifactCount,
    threadCount: obs.threadCount,
    channelCount: obs.channelCount,
    messageCount: obs.messageCount,
    latestActivityAt: obs.latestActivityAt,
    channelNames: [...obs.channelNameSet].slice(0, 24),
    threadNames: [...obs.threadNameSet].slice(0, 32),
    categoryCounts: obs.categoryCounts,
    truncated: obs.truncated,
  };
}

function updateLatest(obs: MutableObservation, value: unknown): void {
  if (typeof value !== "string" && typeof value !== "number") return;
  const time = new Date(value).getTime();
  if (!Number.isFinite(time)) return;
  if (!obs.latestActivityAt || time > Date.parse(obs.latestActivityAt)) {
    obs.latestActivityAt = new Date(time).toISOString();
  }
}

function noteName(obs: MutableObservation, kind: "channel" | "thread", value: unknown): void {
  if (typeof value !== "string") return;
  const clean = value.trim();
  if (!clean) return;
  if (kind === "channel") obs.channelNameSet.add(clean);
  else obs.threadNameSet.add(clean);
  classifyText(obs, clean);
}

function classifyText(obs: MutableObservation, text: string): void {
  for (const rule of CATEGORY_RULES) {
    if (rule.re.test(text)) obs.categoryCounts[rule.key] += 1;
  }
}

function inspectMessageLike(obs: MutableObservation, item: Record<string, unknown>): void {
  obs.messageCount += 1;
  updateLatest(
    obs,
    item.timestamp ?? item.createdAt ?? item.created_at ?? item.editedAt ?? item.edited_at,
  );
  const text = item.content ?? item.message ?? item.body ?? item.text;
  if (typeof text === "string") classifyText(obs, text.slice(0, 500));
}

function inspectObject(obs: MutableObservation, value: unknown): void {
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    for (const item of value) inspectObject(obs, item);
    return;
  }

  const item = value as Record<string, unknown>;
  noteName(obs, "channel", item.channelName ?? item.channel_name ?? item.channel);
  noteName(obs, "thread", item.threadName ?? item.thread_name ?? item.title ?? item.name);
  updateLatest(obs, item.lastActivityAt ?? item.last_activity_at ?? item.updatedAt ?? item.updated_at);

  const messages = item.messages;
  if (Array.isArray(messages)) {
    obs.messageCount += messages.length;
    for (const msg of messages) {
      if (msg && typeof msg === "object") {
        const m = msg as Record<string, unknown>;
        updateLatest(obs, m.timestamp ?? m.createdAt ?? m.created_at);
        const text = m.content ?? m.message ?? m.body ?? m.text;
        if (typeof text === "string") classifyText(obs, text.slice(0, 500));
      }
    }
  } else if (
    "content" in item ||
    "message" in item ||
    "body" in item ||
    "text" in item
  ) {
    inspectMessageLike(obs, item);
  }

  const threads = item.threads;
  if (Array.isArray(threads)) {
    obs.threadCount += threads.length;
    for (const thread of threads) inspectObject(obs, thread);
  }

  const channels = item.channels;
  if (Array.isArray(channels)) {
    obs.channelCount += channels.length;
    for (const channel of channels) inspectObject(obs, channel);
  }
}

async function inspectJsonArtifact(obs: MutableObservation, filePath: string): Promise<void> {
  const info = await stat(filePath);
  if (info.size > MAX_JSON_BYTES) {
    obs.truncated = true;
    return;
  }

  const raw = await readFile(filePath, "utf-8");
  if (filePath.toLowerCase().endsWith(".jsonl")) {
    for (const line of raw.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      try {
        inspectObject(obs, JSON.parse(trimmed) as unknown);
      } catch {
        /* ignore malformed export line */
      }
    }
    return;
  }

  try {
    inspectObject(obs, JSON.parse(raw) as unknown);
  } catch {
    obs.truncated = true;
  }
}

async function inspectTextArtifact(obs: MutableObservation, filePath: string): Promise<void> {
  const info = await stat(filePath);
  updateLatest(obs, info.mtime.toISOString());
  classifyText(obs, path.basename(filePath));
}

async function walkDiscordArtifacts(
  obs: MutableObservation,
  rootPath: string,
  current: string,
  depth: number,
): Promise<void> {
  if (depth > MAX_SCAN_DEPTH || obs.artifactCount >= MAX_FILES) {
    obs.truncated = true;
    return;
  }

  let entries;
  try {
    entries = await readdir(current, { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries) {
    if (obs.artifactCount >= MAX_FILES) {
      obs.truncated = true;
      return;
    }

    const fullPath = path.join(current, entry.name);
    const rel = path.relative(rootPath, fullPath).replace(/\\/g, "/");

    if (entry.isDirectory()) {
      if (SCAN_IGNORE_DIRS.has(entry.name) || entry.name.startsWith(".")) continue;
      if (DISCORD_PATH_RE.test(rel)) {
        classifyText(obs, rel);
      }
      await walkDiscordArtifacts(obs, rootPath, fullPath, depth + 1);
      continue;
    }

    if (!entry.isFile()) continue;
    if (!DISCORD_PATH_RE.test(rel)) continue;

    obs.artifactCount += 1;
    classifyText(obs, rel);

    if (JSON_EXT_RE.test(entry.name)) {
      obs.jsonArtifactCount += 1;
      await inspectJsonArtifact(obs, fullPath);
    } else if (TEXT_EXT_RE.test(entry.name)) {
      obs.textArtifactCount += 1;
      await inspectTextArtifact(obs, fullPath);
    }
  }
}

export async function scanDiscordContinuityArtifacts(
  roots: string[],
): Promise<DiscordContinuityObservation> {
  const obs = emptyObservation();
  for (const root of [...new Set(roots)]) {
    await walkDiscordArtifacts(obs, root, root, 0);
  }
  return finalizeObservation(obs);
}
