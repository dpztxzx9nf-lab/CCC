import { readdir, readFile, stat } from "fs/promises";
import path from "path";
import { hashFileContent, stableExportObservationId } from "../dedupe";
import { parseJsonBody } from "../http";
import { makeSpendRecord, makeTokenRecord } from "../records";
import type { TelemetryIngestionAdapter } from "../types";
import { buildReadiness, emptyResult } from "./readiness";

const EXPORT_EXTENSIONS = /\.(json|csv)$/i;

async function walkExportDir(dir: string, depth = 0): Promise<string[]> {
  if (depth > 3) return [];
  try {
    const entries = await readdir(dir, { withFileTypes: true });
    const files: string[] = [];
    for (const e of entries) {
      const full = path.join(dir, e.name);
      if (e.isDirectory() && !e.name.startsWith(".")) {
        files.push(...(await walkExportDir(full, depth + 1)));
      } else if (e.isFile() && EXPORT_EXTENSIONS.test(e.name)) {
        files.push(full);
      }
    }
    return files;
  } catch {
    return [];
  }
}

function inferToolFromName(filename: string): {
  tool: "openai_api" | "anthropic_api" | "cursor" | "chatgpt" | "codex" | "other";
  provider: "openai" | "anthropic" | "other";
} {
  const lower = filename.toLowerCase();
  if (lower.includes("anthropic") || lower.includes("claude")) {
    return { tool: "anthropic_api", provider: "anthropic" };
  }
  if (lower.includes("openai")) {
    return { tool: "openai_api", provider: "openai" };
  }
  if (lower.includes("cursor")) return { tool: "cursor", provider: "other" };
  if (lower.includes("chatgpt")) return { tool: "chatgpt", provider: "openai" };
  if (lower.includes("codex")) return { tool: "codex", provider: "openai" };
  return { tool: "other", provider: "other" };
}

async function parseExportFile(filePath: string): Promise<{
  tokens: ReturnType<typeof makeTokenRecord>[];
  spend: ReturnType<typeof makeSpendRecord>[];
}> {
  const tokens: ReturnType<typeof makeTokenRecord>[] = [];
  const spend: ReturnType<typeof makeSpendRecord>[] = [];
  const { tool, provider } = inferToolFromName(path.basename(filePath));
  let fileHash = "";
  try {
    fileHash = await hashFileContent(filePath);
  } catch {
    fileHash = path.basename(filePath);
  }

  if (/\.json$/i.test(filePath)) {
    try {
      const raw = await readFile(filePath, { encoding: "utf8" });
      const data = parseJsonBody(raw);
      if (Array.isArray(data)) {
        for (let i = 0; i < data.length; i++) {
          const item = data[i];
          if (!item || typeof item !== "object") continue;
          const o = item as Record<string, unknown>;
          const amount = o.amount ?? o.spend_usd ?? o.cost;
          if (typeof amount === "number") {
            const s = makeSpendRecord({
              id: stableExportObservationId({
                filePath,
                contentHash: `${fileHash}-spend-${i}`,
                kind: "spend",
              }),
              tool: (o.tool as typeof tool) ?? tool,
              provider: (o.provider as typeof provider) ?? provider,
              sourceMethod: "export",
              amount,
              billingPeriod:
                typeof o.billingPeriod === "string" ? o.billingPeriod : null,
              contentRef: path.basename(filePath),
              note: path.basename(filePath),
            });
            if (s) spend.push(s);
          }
          const num = (v: unknown): number | null =>
            typeof v === "number" && Number.isFinite(v) ? v : null;
          const t = makeTokenRecord({
            id: stableExportObservationId({
              filePath,
              contentHash: `${fileHash}-token-${i}`,
              kind: "token",
            }),
            tool: (o.tool as typeof tool) ?? tool,
            provider: (o.provider as typeof provider) ?? provider,
            sourceMethod: "export",
            inputTokens: num(o.input_tokens) ?? num(o.inputTokens),
            outputTokens: num(o.output_tokens) ?? num(o.outputTokens),
            totalTokens: num(o.total_tokens) ?? num(o.totalTokens),
            contentRef: path.basename(filePath),
            note: path.basename(filePath),
          });
          if (t) tokens.push(t);
        }
        return { tokens, spend };
      }
      if (data && typeof data === "object") {
        const o = data as Record<string, unknown>;
        const amount = o.amount ?? o.totalUsd ?? o.spend_usd;
        if (typeof amount === "number") {
          const s = makeSpendRecord({
            id: stableExportObservationId({
              filePath,
              contentHash: `${fileHash}-spend-root`,
              kind: "spend",
            }),
            tool,
            provider,
            sourceMethod: "export",
            amount,
            contentRef: path.basename(filePath),
            note: path.basename(filePath),
          });
          if (s) spend.push(s);
        }
        const num = (v: unknown): number | null =>
          typeof v === "number" && Number.isFinite(v) ? v : null;
        const t = makeTokenRecord({
          id: stableExportObservationId({
            filePath,
            contentHash: `${fileHash}-token-root`,
            kind: "token",
          }),
          tool,
          provider,
          sourceMethod: "export",
          inputTokens: num(o.input_tokens) ?? num(o.inputTokens),
          outputTokens: num(o.output_tokens) ?? num(o.outputTokens),
          totalTokens: num(o.total_tokens) ?? num(o.totalTokens),
          contentRef: path.basename(filePath),
          note: path.basename(filePath),
        });
        if (t) tokens.push(t);
      }
    } catch {
      /* unreadable */
    }
    return { tokens, spend };
  }

  if (/\.csv$/i.test(filePath)) {
    try {
      const raw = await readFile(filePath, { encoding: "utf8" });
      const lines = raw.split(/\r?\n/).filter((l) => l.trim().length > 0);
      if (lines.length < 2) return { tokens, spend };
      const header = lines[0]!.toLowerCase();
      const amountIdx = header.includes("amount")
        ? header.split(",").findIndex((c) => c.includes("amount"))
        : -1;
      const tokenIdx = header.includes("token")
        ? header.split(",").findIndex((c) => c.includes("token"))
        : -1;
      let totalAmount = 0;
      let totalTokens = 0;
      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i]!.split(",");
        if (amountIdx >= 0) {
          const n = Number(cols[amountIdx]);
          if (Number.isFinite(n)) totalAmount += n;
        }
        if (tokenIdx >= 0) {
          const n = Number(cols[tokenIdx]);
          if (Number.isFinite(n)) totalTokens += n;
        }
      }
      if (totalAmount > 0) {
        const s = makeSpendRecord({
          tool,
          provider,
          sourceMethod: "export",
          amount: totalAmount,
          note: `CSV export ${path.basename(filePath)}`,
        });
        if (s) spend.push(s);
      }
      if (totalTokens > 0) {
        const t = makeTokenRecord({
          tool,
          provider,
          sourceMethod: "export",
          totalTokens,
          note: `CSV export ${path.basename(filePath)}`,
        });
        if (t) tokens.push(t);
      }
    } catch {
      /* unreadable csv */
    }
  }

  return { tokens, spend };
}

export const exportWatcherAdapter: TelemetryIngestionAdapter = {
  id: "export_watcher",
  label: "Export Watcher",
  provider: "exports",
  primarySourceMethod: "export",
  async collect(cwd) {
    const dirs = [
      path.join(cwd, "data", "telemetry", "exports"),
      process.env.CCC_TELEMETRY_EXPORT_DIR?.trim()
        ? path.resolve(process.env.CCC_TELEMETRY_EXPORT_DIR.trim())
        : "",
      process.env.CCC_AI_EXPORT_DIR?.trim()
        ? path.resolve(process.env.CCC_AI_EXPORT_DIR.trim())
        : "",
    ].filter(Boolean);

    let watched = 0;
    const tokenEntries = [];
    const spendEntries = [];

    for (const dir of dirs) {
      try {
        await stat(dir);
      } catch {
        continue;
      }
      const files = await walkExportDir(dir);
      watched += files.length;
      for (const file of files) {
        if (file.includes("token-usage.json") || file.includes("api-spend.json")) {
          continue;
        }
        const parsed = await parseExportFile(file);
        tokenEntries.push(
          ...parsed.tokens.filter((x): x is NonNullable<typeof x> => x != null),
        );
        spendEntries.push(
          ...parsed.spend.filter((x): x is NonNullable<typeof x> => x != null),
        );
      }
    }

    if (tokenEntries.length > 0 || spendEntries.length > 0) {
      return {
        readiness: buildReadiness({
          adapterId: "export_watcher",
          label: "Export Watcher",
          provider: "exports",
          ready: true,
          automated: true,
          primarySourceMethod: "export",
          status: "active",
          reason: `Export folder watcher ingested ${tokenEntries.length} token and ${spendEntries.length} spend row(s) from ${watched} file(s).`,
          tokenObservations: tokenEntries.length,
          spendObservations: spendEntries.length,
        }),
        tokenEntries,
        spendEntries,
      };
    }

    return emptyResult(
      "export_watcher",
      "Export Watcher",
      "exports",
      "export",
      watched > 0 ? "no_data" : "configured",
      watched > 0
        ? `${watched} export file(s) present but no parseable token/spend rows.`
        : "Watching data/telemetry/exports/ — drop CSV/JSON usage exports from ChatGPT, Cursor, OpenAI, Anthropic, etc.",
      true,
    );
  },
};
