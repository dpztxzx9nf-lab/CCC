import type {
  AIUsageSource,
  AIUsageSourceMethod,
  AIUsageTool,
  AISpendRecord,
  AISpendSummary,
  AITokenUsageRecord,
  AITokenUsageSummary,
  AIToolCollectionStatus,
  AIToolSpendRollup,
  AIToolTokenRollup,
} from "../aiUsage";
import {
  AI_TOOL_CATALOG,
  AI_USAGE_TOOLS,
  defaultProviderForTool,
  legacySourceToMethod,
  resolveTokenTotals,
} from "../aiUsage";
import { stableSpendObservationId, stableTokenObservationId } from "../ingestion/dedupe";
import type { TelemetryMetricValue } from "../types";

const RECENT_EXPORT_LIMIT = 24;

function pushUnique<T>(arr: T[], value: T): void {
  if (!arr.includes(value)) arr.push(value);
}

export function buildToolStatus(
  tokenByTool: Map<AIUsageTool, AIToolTokenRollup>,
  spendByTool: Map<AIUsageTool, AIToolSpendRollup>,
): AIToolCollectionStatus[] {
  return AI_USAGE_TOOLS.map((tool) => {
    const catalog = AI_TOOL_CATALOG[tool];
    const tokenRollup = tokenByTool.get(tool);
    const spendRollup = spendByTool.get(tool);
    const tokensAvailable = (tokenRollup?.entryCount ?? 0) > 0;
    const spendAvailable = (spendRollup?.entryCount ?? 0) > 0;
    return {
      tool,
      label: catalog.label,
      provider: catalog.defaultProvider,
      tokensAvailable,
      spendAvailable,
      tokenSources: tokenRollup?.sources ?? [],
      spendSources: spendRollup?.sources ?? [],
      tokenSourceMethods: tokenRollup?.sourceMethods ?? [],
      spendSourceMethods: spendRollup?.sourceMethods ?? [],
      tokenUnavailableReason: tokensAvailable
        ? ""
        : catalog.tokenUnavailableReason,
      spendUnavailableReason: spendAvailable
        ? ""
        : catalog.spendUnavailableReason,
    };
  });
}

export function rollupTokenEntries(
  entries: AITokenUsageRecord[],
): {
  byTool: AIToolTokenRollup[];
  totalTokens: number | null;
  totalInputTokens: number | null;
  totalOutputTokens: number | null;
  observedToolCount: number;
  primarySourceMethod: AIUsageSourceMethod;
} {
  const map = new Map<AIUsageTool, AIToolTokenRollup>();

  for (const e of entries) {
    const totals = resolveTokenTotals(e);
    const method = e.sourceMethod ?? legacySourceToMethod(e.source);
    let rollup = map.get(e.tool);
    if (!rollup) {
      rollup = {
        tool: e.tool,
        provider: e.provider,
        totalTokens: 0,
        inputTokens: 0,
        outputTokens: 0,
        entryCount: 0,
        sources: [],
        sourceMethods: [],
        hasEstimated: false,
      };
      map.set(e.tool, rollup);
    }
    rollup.entryCount += 1;
    pushUnique(rollup.sources, e.source);
    pushUnique(rollup.sourceMethods, method);
    if (e.estimated) rollup.hasEstimated = true;
    if (!e.estimated && totals.totalTokens != null) {
      rollup.totalTokens = (rollup.totalTokens ?? 0) + totals.totalTokens;
    }
    if (!e.estimated && totals.inputTokens != null) {
      rollup.inputTokens = (rollup.inputTokens ?? 0) + totals.inputTokens;
    }
    if (!e.estimated && totals.outputTokens != null) {
      rollup.outputTokens = (rollup.outputTokens ?? 0) + totals.outputTokens;
    }
  }

  const byTool = [...map.values()].map((r) => {
    const hasMeasured = entries.some(
      (e) =>
        e.tool === r.tool &&
        !e.estimated &&
        resolveTokenTotals(e).totalTokens != null,
    );
    return {
      ...r,
      totalTokens: hasMeasured ? r.totalTokens : null,
      inputTokens: hasMeasured ? r.inputTokens : null,
      outputTokens: hasMeasured ? r.outputTokens : null,
    };
  });

  let totalTokens = 0;
  let totalInput = 0;
  let totalOutput = 0;
  let hasTotal = false;
  let hasIn = false;
  let hasOut = false;
  const methods = new Set<AIUsageSourceMethod>();

  for (const e of entries) {
    if (e.estimated) continue;
    methods.add(e.sourceMethod ?? legacySourceToMethod(e.source));
    const t = resolveTokenTotals(e);
    if (t.totalTokens != null) {
      totalTokens += t.totalTokens;
      hasTotal = true;
    }
    if (t.inputTokens != null) {
      totalInput += t.inputTokens;
      hasIn = true;
    }
    if (t.outputTokens != null) {
      totalOutput += t.outputTokens;
      hasOut = true;
    }
  }

  const observedToolCount = byTool.filter((r) => r.entryCount > 0).length;
  const primarySourceMethod: AIUsageSourceMethod = hasTotal
    ? methods.has("api")
      ? "api"
      : methods.has("export")
        ? "export"
        : methods.has("runtime_writer")
          ? "runtime_writer"
          : methods.has("local_log")
            ? "local_log"
            : "invoice"
    : "unavailable";

  return {
    byTool,
    totalTokens: hasTotal ? totalTokens : null,
    totalInputTokens: hasIn ? totalInput : null,
    totalOutputTokens: hasOut ? totalOutput : null,
    observedToolCount,
    primarySourceMethod,
  };
}

export function rollupSpendEntries(entries: AISpendRecord[]): {
  byTool: AIToolSpendRollup[];
  totalUsd: number | null;
  observedToolCount: number;
  primarySourceMethod: AIUsageSourceMethod;
} {
  const map = new Map<AIUsageTool, AIToolSpendRollup>();

  for (const e of entries) {
    const method = e.sourceMethod ?? legacySourceToMethod(e.source);
    let rollup = map.get(e.tool);
    if (!rollup) {
      rollup = {
        tool: e.tool,
        provider: e.provider,
        amountUsd: 0,
        entryCount: 0,
        sources: [],
        sourceMethods: [],
        hasEstimated: false,
      };
      map.set(e.tool, rollup);
    }
    rollup.entryCount += 1;
    pushUnique(rollup.sources, e.source);
    pushUnique(rollup.sourceMethods, method);
    if (e.estimated) rollup.hasEstimated = true;
    if (!e.estimated && e.currency.toUpperCase() === "USD") {
      rollup.amountUsd = (rollup.amountUsd ?? 0) + e.amount;
    }
  }

  const byTool = [...map.values()];
  let totalUsd = 0;
  let hasUsd = false;
  const methods = new Set<AIUsageSourceMethod>();
  for (const e of entries) {
    if (e.estimated) continue;
    methods.add(e.sourceMethod ?? legacySourceToMethod(e.source));
    if (e.currency.toUpperCase() === "USD") {
      totalUsd += e.amount;
      hasUsd = true;
    }
  }

  const primarySourceMethod: AIUsageSourceMethod = hasUsd
    ? methods.has("api")
      ? "api"
      : methods.has("invoice")
        ? "invoice"
        : methods.has("export")
          ? "export"
          : "unavailable"
    : "unavailable";

  return {
    byTool,
    totalUsd: hasUsd ? Math.round(totalUsd * 100) / 100 : null,
    observedToolCount: byTool.filter((r) => r.entryCount > 0).length,
    primarySourceMethod,
  };
}

export function buildTokenSummary(
  entries: AITokenUsageRecord[],
  aggregateSource: string,
  aggregateAvailable: boolean,
): AITokenUsageSummary {
  const rolled = rollupTokenEntries(entries);
  const tokenByTool = new Map(rolled.byTool.map((r) => [r.tool, r]));
  const spendByTool = new Map<AIUsageTool, AIToolSpendRollup>();
  return {
    ...rolled,
    recentEntries: [...entries]
      .sort((a, b) => Date.parse(b.at) - Date.parse(a.at))
      .slice(0, RECENT_EXPORT_LIMIT),
    toolStatus: buildToolStatus(tokenByTool, spendByTool),
    aggregateSource,
    aggregateAvailable,
    aggregateSourceMethod: rolled.primarySourceMethod,
    unavailableReason: aggregateAvailable
      ? undefined
      : "No measured token usage from automated adapters or persisted entries.",
  };
}

export function buildSpendSummary(
  entries: AISpendRecord[],
  aggregateSource: string,
  aggregateAvailable: boolean,
): AISpendSummary {
  const rolled = rollupSpendEntries(entries);
  const spendByTool = new Map(rolled.byTool.map((r) => [r.tool, r]));
  const tokenByTool = new Map<AIUsageTool, AIToolTokenRollup>();
  return {
    totalUsd: rolled.totalUsd,
    observedToolCount: rolled.observedToolCount,
    byTool: rolled.byTool,
    recentEntries: [...entries]
      .sort((a, b) => Date.parse(b.at) - Date.parse(a.at))
      .slice(0, RECENT_EXPORT_LIMIT),
    toolStatus: buildToolStatus(tokenByTool, spendByTool),
    aggregateSource,
    aggregateAvailable,
    aggregateSourceMethod: rolled.primarySourceMethod,
    unavailableReason: aggregateAvailable
      ? undefined
      : "No measured spend from automated adapters, invoices, or exports.",
  };
}

export function tokenMetricFromSummary(
  summary: AITokenUsageSummary,
): TelemetryMetricValue<number> {
  return {
    value: summary.totalTokens,
    source: summary.aggregateSource,
    available: summary.aggregateAvailable,
    sourceMethod: summary.aggregateSourceMethod,
    unavailableReason: summary.unavailableReason,
  };
}

export function spendMetricFromSummary(
  summary: AISpendSummary,
): TelemetryMetricValue<number> {
  return {
    value: summary.totalUsd,
    source: summary.aggregateSource,
    available: summary.aggregateAvailable,
    sourceMethod: summary.aggregateSourceMethod,
    unavailableReason: summary.unavailableReason,
  };
}

export function envTokenEntry(
  total: number,
  source: AIUsageSource = "environment",
): AITokenUsageRecord {
  const at = new Date().toISOString();
  const id = stableTokenObservationId({
    tool: "other",
    provider: defaultProviderForTool("other"),
    sourceMethod: "api",
    at,
    totalTokens: Math.round(total),
    contentRef: "CCC_TOKEN_USAGE_TOTAL",
  });
  return {
    id,
    at,
    tool: "other",
    provider: defaultProviderForTool("other"),
    source,
    sourceMethod: "api",
    inputTokens: null,
    outputTokens: null,
    totalTokens: Math.round(total),
    model: null,
    project: null,
    estimated: false,
    note: "CCC_TOKEN_USAGE_TOTAL",
  };
}

export function envSpendEntry(
  amount: number,
  source: AIUsageSource = "environment",
): AISpendRecord {
  const at = new Date().toISOString();
  const id = stableSpendObservationId({
    tool: "openai_api",
    provider: "openai",
    sourceMethod: "api",
    amount: Math.round(amount * 100) / 100,
    currency: "USD",
    at,
    contentRef: "CCC_API_SPEND_USD",
  });
  return {
    id,
    at,
    tool: "openai_api",
    provider: "openai",
    source,
    sourceMethod: "api",
    amount: Math.round(amount * 100) / 100,
    currency: "USD",
    billingPeriod: null,
    estimated: false,
    note: "CCC_API_SPEND_USD",
  };
}
