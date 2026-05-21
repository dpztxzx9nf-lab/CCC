import { readdir, stat } from "fs/promises";
import path from "path";
import { makeSpendRecord } from "../records";
import type { TelemetryIngestionAdapter } from "../types";
import { buildReadiness, emptyResult } from "./readiness";

const INVOICE_TOOLS = [
  { prefix: "chatgpt", tool: "chatgpt" as const, provider: "openai" as const },
  { prefix: "cursor", tool: "cursor" as const, provider: "other" as const },
  { prefix: "claude", tool: "claude_code" as const, provider: "anthropic" as const },
  { prefix: "codex", tool: "codex" as const, provider: "openai" as const },
  { prefix: "copilot", tool: "github_copilot" as const, provider: "github" as const },
];

function matchInvoiceTool(
  filename: string,
): (typeof INVOICE_TOOLS)[number] | null {
  const lower = filename.toLowerCase();
  for (const row of INVOICE_TOOLS) {
    if (lower.includes(row.prefix)) return row;
  }
  return null;
}

async function listInvoiceFiles(dir: string): Promise<string[]> {
  try {
    const entries = await readdir(dir, { withFileTypes: true });
    return entries
      .filter(
        (e) =>
          e.isFile() &&
          /\.(json|csv|pdf|eml)$/i.test(e.name) &&
          !e.name.startsWith("."),
      )
      .map((e) => path.join(dir, e.name));
  } catch {
    return [];
  }
}

export const invoiceIngestionAdapter: TelemetryIngestionAdapter = {
  id: "invoice_inbox",
  label: "Invoice Inbox",
  provider: "subscriptions",
  primarySourceMethod: "invoice",
  async collect(cwd) {
    const dirs = [
      path.join(cwd, "data", "telemetry", "invoices"),
      path.join(cwd, "data", "telemetry", "inbox"),
      process.env.CCC_TELEMETRY_INVOICE_DIR?.trim()
        ? path.resolve(process.env.CCC_TELEMETRY_INVOICE_DIR.trim())
        : "",
    ].filter(Boolean);

    const files: string[] = [];
    for (const dir of dirs) {
      files.push(...(await listInvoiceFiles(dir)));
    }

    const spendEntries = [];
    for (const filePath of files) {
      if (!/\.json$/i.test(filePath)) continue;
      try {
        const { readFile } = await import("fs/promises");
        const raw = await readFile(filePath, { encoding: "utf8" });
        const data = JSON.parse(raw) as Record<string, unknown>;
        const amount = data.amount ?? data.totalUsd ?? data.total;
        if (typeof amount !== "number") continue;
        const matched =
          matchInvoiceTool(path.basename(filePath)) ??
          (typeof data.tool === "string"
            ? INVOICE_TOOLS.find((t) => t.tool === data.tool) ?? null
            : null);
        if (!matched) continue;
        const entry = makeSpendRecord({
          id: `invoice-${path.basename(filePath)}`,
          tool: matched.tool,
          provider: matched.provider,
          sourceMethod: "invoice",
          amount,
          currency: typeof data.currency === "string" ? data.currency : "USD",
          billingPeriod:
            typeof data.billingPeriod === "string" ? data.billingPeriod : null,
          note: `Invoice JSON ${path.basename(filePath)}`,
        });
        if (entry) spendEntries.push(entry);
      } catch {
        /* skip invalid invoice json */
      }
    }

    if (spendEntries.length > 0) {
      return {
        readiness: buildReadiness({
          adapterId: "invoice_inbox",
          label: "Invoice Inbox",
          provider: "subscriptions",
          ready: true,
          automated: true,
          primarySourceMethod: "invoice",
          status: "active",
          reason: `${spendEntries.length} subscription invoice JSON file(s) ingested.`,
          spendObservations: spendEntries.length,
        }),
        tokenEntries: [],
        spendEntries,
      };
    }

    const pending = files.filter((f) => /\.(pdf|eml|csv)$/i.test(f));
    if (pending.length > 0) {
      return emptyResult(
        "invoice_inbox",
        "Invoice Inbox",
        "subscriptions",
        "invoice",
        "configured",
        `${pending.length} invoice file(s) present (PDF/EML/CSV) — JSON sidecar required for automated parse; email ingestion not enabled.`,
        true,
      );
    }

    return emptyResult(
      "invoice_inbox",
      "Invoice Inbox",
      "subscriptions",
      "invoice",
      "not_implemented",
      "Email/invoice automation placeholder: drop JSON invoices under data/telemetry/invoices/ (e.g. chatgpt-2026-05.json). No login scraping.",
      false,
    );
  },
};
