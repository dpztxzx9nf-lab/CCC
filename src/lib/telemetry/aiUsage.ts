/** Product / interface used for AI work (not the model vendor alone). */
export type AIUsageTool =
  | "chatgpt"
  | "cursor"
  | "codex"
  | "openai_api"
  | "anthropic_api"
  | "claude_code"
  | "github_copilot"
  | "liahona"
  | "other";

/** Billing / platform vendor behind a tool. */
export type AIUsageProvider =
  | "openai"
  | "anthropic"
  | "microsoft"
  | "github"
  | "google"
  | "internal"
  | "other";

/** How CCC obtained a usage or spend observation (legacy; prefer sourceMethod). */
export type AIUsageSource =
  | "manual_entry"
  | "local_logs"
  | "exported_file"
  | "environment"
  | "api_integration"
  | "estimated";

/** Canonical ingestion channel for automated telemetry. */
export type AIUsageSourceMethod =
  | "api"
  | "local_log"
  | "invoice"
  | "export"
  | "runtime_writer"
  | "unavailable";

export const AI_USAGE_SOURCE_METHODS: readonly AIUsageSourceMethod[] = [
  "api",
  "local_log",
  "invoice",
  "export",
  "runtime_writer",
  "unavailable",
] as const;

export function isAIUsageSourceMethod(
  value: unknown,
): value is AIUsageSourceMethod {
  return (
    typeof value === "string" &&
    (AI_USAGE_SOURCE_METHODS as readonly string[]).includes(value)
  );
}

export function legacySourceToMethod(source: AIUsageSource): AIUsageSourceMethod {
  switch (source) {
    case "api_integration":
    case "environment":
      return "api";
    case "local_logs":
      return "local_log";
    case "exported_file":
      return "export";
    case "manual_entry":
      return "invoice";
    case "estimated":
      return "export";
    default:
      return "unavailable";
  }
}

export const AI_USAGE_TOOLS: readonly AIUsageTool[] = [
  "chatgpt",
  "cursor",
  "codex",
  "openai_api",
  "anthropic_api",
  "claude_code",
  "github_copilot",
  "liahona",
  "other",
] as const;

export interface AIToolCatalogEntry {
  tool: AIUsageTool;
  label: string;
  defaultProvider: AIUsageProvider;
  /** Whether CCC can observe token usage locally without manual import. */
  localTokenDataCapable: boolean;
  /** Whether CCC can observe spend locally without manual import. */
  localSpendDataCapable: boolean;
  tokenUnavailableReason: string;
  spendUnavailableReason: string;
}

export const AI_TOOL_CATALOG: Record<AIUsageTool, AIToolCatalogEntry> = {
  chatgpt: {
    tool: "chatgpt",
    label: "ChatGPT",
    defaultProvider: "openai",
    localTokenDataCapable: false,
    localSpendDataCapable: false,
    tokenUnavailableReason:
      "ChatGPT does not expose per-request token totals in a standard local file; add manual_entry or exported_file.",
    spendUnavailableReason:
      "ChatGPT subscription billing is not available locally; add manual_entry for monthly subscription.",
  },
  cursor: {
    tool: "cursor",
    label: "Cursor",
    defaultProvider: "other",
    localTokenDataCapable: false,
    localSpendDataCapable: false,
    tokenUnavailableReason:
      "Cursor IDE does not publish token usage to a stable local path; add manual_entry or exported_file.",
    spendUnavailableReason:
      "Cursor subscription is not exposed locally; add manual_entry for subscription or usage billing.",
  },
  codex: {
    tool: "codex",
    label: "Codex",
    defaultProvider: "openai",
    localTokenDataCapable: false,
    localSpendDataCapable: false,
    tokenUnavailableReason:
      "Codex usage is not aggregated in a CCC-readable local log by default; add manual_entry or api_integration.",
    spendUnavailableReason:
      "Codex spend is not available locally unless imported; add manual_entry or exported_file.",
  },
  openai_api: {
    tool: "openai_api",
    label: "OpenAI API",
    defaultProvider: "openai",
    localTokenDataCapable: true,
    localSpendDataCapable: true,
    tokenUnavailableReason:
      "No OpenAI API usage file or env observed; set CCC_TOKEN_USAGE_PATH or record manual_entry.",
    spendUnavailableReason:
      "No OpenAI billing file or env observed; set CCC_API_SPEND_PATH or record manual_entry.",
  },
  anthropic_api: {
    tool: "anthropic_api",
    label: "Anthropic API",
    defaultProvider: "anthropic",
    localTokenDataCapable: true,
    localSpendDataCapable: true,
    tokenUnavailableReason:
      "No Anthropic usage export observed; add exported_file or manual_entry.",
    spendUnavailableReason:
      "No Anthropic billing export observed; add manual_entry or exported_file.",
  },
  claude_code: {
    tool: "claude_code",
    label: "Claude Code",
    defaultProvider: "anthropic",
    localTokenDataCapable: false,
    localSpendDataCapable: false,
    tokenUnavailableReason:
      "Claude Code does not write token totals to a known local path; add manual_entry or exported_file.",
    spendUnavailableReason:
      "Claude Code subscription is not available locally; add manual_entry.",
  },
  github_copilot: {
    tool: "github_copilot",
    label: "GitHub Copilot",
    defaultProvider: "github",
    localTokenDataCapable: false,
    localSpendDataCapable: false,
    tokenUnavailableReason:
      "GitHub Copilot does not expose token counts locally; add manual_entry if you track usage elsewhere.",
    spendUnavailableReason:
      "Copilot subscription is not in local billing files; add manual_entry for monthly subscription.",
  },
  liahona: {
    tool: "liahona",
    label: "Liahona",
    defaultProvider: "internal",
    localTokenDataCapable: true,
    localSpendDataCapable: false,
    tokenUnavailableReason:
      "No Liahona usage.json or telemetry entry observed; record manual_entry or check project logs.",
    spendUnavailableReason:
      "Liahona runtime does not publish billing; attribute API spend to openai_api/anthropic_api tools.",
  },
  other: {
    tool: "other",
    label: "Other",
    defaultProvider: "other",
    localTokenDataCapable: false,
    localSpendDataCapable: false,
    tokenUnavailableReason: "No usage recorded for this tool; add manual_entry.",
    spendUnavailableReason: "No spend recorded for this tool; add manual_entry.",
  },
};

export function defaultProviderForTool(tool: AIUsageTool): AIUsageProvider {
  return AI_TOOL_CATALOG[tool]?.defaultProvider ?? "other";
}

export function isAIUsageTool(value: unknown): value is AIUsageTool {
  return (
    typeof value === "string" &&
    (AI_USAGE_TOOLS as readonly string[]).includes(value)
  );
}

export function isAIUsageProvider(value: unknown): value is AIUsageProvider {
  return typeof value === "string" && value.length > 0;
}

export function isAIUsageSource(value: unknown): value is AIUsageSource {
  const sources: AIUsageSource[] = [
    "manual_entry",
    "local_logs",
    "exported_file",
    "environment",
    "api_integration",
    "estimated",
  ];
  return typeof value === "string" && sources.includes(value as AIUsageSource);
}

export interface AITokenUsageRecord {
  id: string;
  at: string;
  tool: AIUsageTool;
  provider: AIUsageProvider;
  source: AIUsageSource;
  sourceMethod: AIUsageSourceMethod;
  inputTokens: number | null;
  outputTokens: number | null;
  totalTokens: number | null;
  model: string | null;
  project: string | null;
  estimated: boolean;
  note?: string;
}

export interface AISpendRecord {
  id: string;
  at: string;
  tool: AIUsageTool;
  provider: AIUsageProvider;
  source: AIUsageSource;
  sourceMethod: AIUsageSourceMethod;
  amount: number;
  currency: string;
  billingPeriod: string | null;
  estimated: boolean;
  note?: string;
}

export interface AIToolTokenRollup {
  tool: AIUsageTool;
  provider: AIUsageProvider;
  totalTokens: number | null;
  inputTokens: number | null;
  outputTokens: number | null;
  entryCount: number;
  sources: AIUsageSource[];
  sourceMethods: AIUsageSourceMethod[];
  hasEstimated: boolean;
}

export interface AIToolSpendRollup {
  tool: AIUsageTool;
  provider: AIUsageProvider;
  amountUsd: number | null;
  entryCount: number;
  sources: AIUsageSource[];
  sourceMethods: AIUsageSourceMethod[];
  hasEstimated: boolean;
}

export interface AIToolCollectionStatus {
  tool: AIUsageTool;
  label: string;
  provider: AIUsageProvider;
  tokensAvailable: boolean;
  spendAvailable: boolean;
  tokenSources: AIUsageSource[];
  spendSources: AIUsageSource[];
  tokenSourceMethods: AIUsageSourceMethod[];
  spendSourceMethods: AIUsageSourceMethod[];
  tokenUnavailableReason: string;
  spendUnavailableReason: string;
}

export interface AITokenUsageSummary {
  totalTokens: number | null;
  totalInputTokens: number | null;
  totalOutputTokens: number | null;
  observedToolCount: number;
  byTool: AIToolTokenRollup[];
  recentEntries: AITokenUsageRecord[];
  toolStatus: AIToolCollectionStatus[];
  aggregateSource: string;
  aggregateAvailable: boolean;
  aggregateSourceMethod: AIUsageSourceMethod;
  unavailableReason?: string;
}

export interface AISpendSummary {
  totalUsd: number | null;
  observedToolCount: number;
  byTool: AIToolSpendRollup[];
  recentEntries: AISpendRecord[];
  toolStatus: AIToolCollectionStatus[];
  aggregateSource: string;
  aggregateAvailable: boolean;
  aggregateSourceMethod: AIUsageSourceMethod;
  unavailableReason?: string;
}

export function resolveTokenTotals(record: {
  inputTokens?: number | null;
  outputTokens?: number | null;
  totalTokens?: number | null;
}): {
  inputTokens: number | null;
  outputTokens: number | null;
  totalTokens: number | null;
} {
  const input =
    typeof record.inputTokens === "number" && Number.isFinite(record.inputTokens)
      ? Math.max(0, Math.round(record.inputTokens))
      : null;
  const output =
    typeof record.outputTokens === "number" &&
    Number.isFinite(record.outputTokens)
      ? Math.max(0, Math.round(record.outputTokens))
      : null;
  let total =
    typeof record.totalTokens === "number" && Number.isFinite(record.totalTokens)
      ? Math.max(0, Math.round(record.totalTokens))
      : null;
  if (total == null && (input != null || output != null)) {
    total = (input ?? 0) + (output ?? 0);
  }
  return { inputTokens: input, outputTokens: output, totalTokens: total };
}

export function newRecordId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}
