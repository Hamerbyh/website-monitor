import "server-only";

import { z } from "zod";

import polymarketContent from "@/content/polymarket.json";
import { getServerEnv } from "@/lib/env";
import { sendTelegramAlert } from "@/lib/notifications/telegram-alert";

const GAMMA_BASE_URL = "https://gamma-api.polymarket.com";
const CLOB_BASE_URL = "https://clob.polymarket.com";
const POLYMARKET_REQUEST_HEADERS = {
  Accept: "application/json",
  "User-Agent": "WebMonitor/0.1 (+https://github.com/open-source)",
} as const;

const targetSchema = z.object({
  name: z.string().min(1).optional(),
  eventSlug: z.string().min(1).optional(),
  marketSlug: z.string().min(1).optional(),
  marketId: z.string().min(1).optional(),
  marketLabels: z.array(z.string().min(1)).optional(),
  outcome: z.string().min(1).default("Yes"),
  lookbackMinutes: z.number().int().positive().optional(),
  thresholdBps: z.number().int().positive().optional(),
  notifyAlways: z.boolean().optional(),
});

const targetsSchema = z.array(targetSchema).refine(
  (targets) =>
    targets.every(
      (target) => target.eventSlug || target.marketSlug || target.marketId,
    ),
  "Each Polymarket monitor target must include eventSlug, marketSlug, or marketId.",
);

type PolymarketTarget = z.infer<typeof targetSchema>;

type GammaMarket = {
  id: string;
  question?: string;
  slug?: string;
  groupItemTitle?: string;
  outcomes?: unknown;
  outcomePrices?: unknown;
  clobTokenIds?: unknown;
  volume24hr?: number | string | null;
  liquidity?: number | string | null;
  liquidityNum?: number | string | null;
  active?: boolean;
  closed?: boolean;
};

type GammaEvent = {
  title?: string;
  slug?: string;
  markets?: GammaMarket[];
};

type PriceHistoryPoint = {
  t: number;
  p: number;
};

type PolymarketCheckResult = {
  targetName: string;
  eventTitle: string | null;
  marketQuestion: string;
  marketLabel: string;
  marketSlug: string | null;
  outcome: string;
  tokenId: string;
  outcomePrices: Array<{ outcome: string; price: number }>;
  volume24hr: number | null;
  liquidity: number | null;
  previousPrice: number;
  currentPrice: number;
  change: number;
  changeBps: number;
  lookbackMinutes: number;
  thresholdBps: number;
  alerted: boolean;
};

export async function runPolymarketDueChecks(input?: { now?: Date }) {
  const env = getServerEnv();
  const now = input?.now ?? new Date();

  if (!env.POLYMARKET_MONITOR_ENABLED) {
    return {
      checkedAt: now,
      checkedCount: 0,
      alertedCount: 0,
      skippedReason: "disabled",
      results: [] as PolymarketCheckResult[],
    };
  }

  const targets = targetsSchema.parse(env.POLYMARKET_MONITOR_TARGETS);

  if (targets.length === 0) {
    return {
      checkedAt: now,
      checkedCount: 0,
      alertedCount: 0,
      skippedReason: "no_targets",
      results: [] as PolymarketCheckResult[],
    };
  }

  const results: PolymarketCheckResult[] = [];
  const errors: Array<{ targetName: string; error: string }> = [];

  for (const target of targets) {
    try {
      const targetResults = await checkTarget(target, {
        now,
        defaultLookbackMinutes: env.POLYMARKET_MONITOR_LOOKBACK_MINUTES,
        defaultThresholdBps: env.POLYMARKET_MONITOR_THRESHOLD_BPS,
      });

      for (const result of targetResults) {
        results.push(result);

        if (result.alerted) {
          try {
            await sendTelegramAlert({
              text: createTelegramMessage(result, now),
            });
          } catch (error) {
            errors.push({
              targetName: result.targetName,
              error: `Telegram alert failed: ${
                error instanceof Error ? error.message : "Unknown Telegram alert error"
              }`,
            });
          }
        }
      }
    } catch (error) {
      errors.push({
        targetName: getTargetName(target),
        error: error instanceof Error ? error.message : "Unknown Polymarket check error",
      });
    }
  }

  return {
    checkedAt: now,
    checkedCount: results.length,
    alertedCount: results.filter((result) => result.alerted).length,
    errorCount: errors.length,
    skippedReason: null,
    results,
    errors,
  };
}

async function checkTarget(
  target: PolymarketTarget,
  defaults: {
    now: Date;
    defaultLookbackMinutes: number;
    defaultThresholdBps: number;
  },
) {
  const lookbackMinutes =
    target.lookbackMinutes ?? defaults.defaultLookbackMinutes;
  const thresholdBps = target.thresholdBps ?? defaults.defaultThresholdBps;
  const markets = await resolveTargetMarkets(target);
  const targetMarketLabels = new Set(
    target.marketLabels?.map((label) => label.toLowerCase()) ?? [],
  );
  const results: PolymarketCheckResult[] = [];

  for (const { eventTitle, market } of markets) {
    const marketLabel = getMarketLabel(market);

    if (market.active === false || market.closed === true) {
      continue;
    }

    if (
      targetMarketLabels.size > 0 &&
      !targetMarketLabels.has(marketLabel.toLowerCase())
    ) {
      continue;
    }

    const outcomeData = getOutcomeData(market, target.outcome);
    const currentPrice =
      (await fetchMidpointPrice(outcomeData.tokenId)) ?? outcomeData.currentPrice;
    const previousPrice =
      target.notifyAlways === true
        ? currentPrice
        : await fetchPreviousPrice({
            tokenId: outcomeData.tokenId,
            now: defaults.now,
            lookbackMinutes,
          });

    if (previousPrice === null) {
      continue;
    }

    const change = currentPrice - previousPrice;
    const changeBps = Math.round(change * 10_000);

    const thresholdTriggered = Math.abs(changeBps) >= thresholdBps;

    results.push({
      targetName: getTargetName(target),
      eventTitle,
      marketQuestion: market.question ?? market.slug ?? market.id,
      marketLabel,
      marketSlug: market.slug ?? null,
      outcome: outcomeData.outcome,
      tokenId: outcomeData.tokenId,
      outcomePrices: outcomeData.outcomePrices,
      volume24hr: toNullableNumber(market.volume24hr),
      liquidity: toNullableNumber(market.liquidityNum ?? market.liquidity),
      previousPrice,
      currentPrice,
      change,
      changeBps,
      lookbackMinutes,
      thresholdBps,
      alerted: target.notifyAlways === true || thresholdTriggered,
    });
  }

  return results;
}

async function fetchPreviousPrice(input: {
  tokenId: string;
  now: Date;
  lookbackMinutes: number;
}) {
  const history = await fetchPriceHistory(input);
  const previousPoint = findPreviousPoint(
    history,
    input.now,
    input.lookbackMinutes,
  );

  return previousPoint?.p ?? null;
}

function getTargetName(target: PolymarketTarget) {
  return target.name ?? target.eventSlug ?? target.marketSlug ?? target.marketId ?? "Polymarket";
}

function getMarketLabel(market: GammaMarket) {
  return market.groupItemTitle ?? market.question ?? market.slug ?? market.id;
}

function toNullableNumber(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : null;
}

async function resolveTargetMarkets(target: PolymarketTarget) {
  if (target.eventSlug) {
    const event = await fetchJson<GammaEvent>(
      `${GAMMA_BASE_URL}/events/slug/${encodeURIComponent(target.eventSlug)}`,
    );

    return (event.markets ?? []).map((market) => ({
      eventTitle: event.title ?? event.slug ?? target.eventSlug ?? null,
      market,
    }));
  }

  const market = target.marketSlug
    ? await fetchJson<GammaMarket>(
        `${GAMMA_BASE_URL}/markets/slug/${encodeURIComponent(target.marketSlug)}`,
      )
    : await fetchJson<GammaMarket>(
        `${GAMMA_BASE_URL}/markets/${encodeURIComponent(target.marketId ?? "")}`,
      );

  return [
    {
      eventTitle: null,
      market,
    },
  ];
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    headers: POLYMARKET_REQUEST_HEADERS,
  });

  if (!response.ok) {
    const responseText = await response.text();
    throw new Error(`Polymarket request failed with ${response.status}: ${responseText}`);
  }

  return response.json() as Promise<T>;
}

async function fetchMidpointPrice(tokenId: string) {
  const url = new URL(`${CLOB_BASE_URL}/midpoint`);
  url.searchParams.set("token_id", tokenId);

  const response = await fetch(url, {
    headers: POLYMARKET_REQUEST_HEADERS,
  });

  if (!response.ok) {
    return null;
  }

  const data = (await response.json()) as { mid_price?: string | number };
  const price = Number(data.mid_price);

  return Number.isFinite(price) ? price : null;
}

async function fetchPriceHistory(input: {
  tokenId: string;
  now: Date;
  lookbackMinutes: number;
}) {
  const endTs = Math.floor(input.now.getTime() / 1000);
  const startTs = endTs - Math.max(input.lookbackMinutes + 10, 15) * 60;
  const url = new URL(`${CLOB_BASE_URL}/prices-history`);

  url.searchParams.set("market", input.tokenId);
  url.searchParams.set("startTs", startTs.toString());
  url.searchParams.set("endTs", endTs.toString());
  url.searchParams.set("interval", "1m");
  url.searchParams.set("fidelity", "10");

  const data = await fetchJson<{ history?: PriceHistoryPoint[] }>(url.toString());

  return (data.history ?? []).filter(
    (point) => Number.isFinite(point.t) && Number.isFinite(point.p),
  );
}

function findPreviousPoint(
  history: PriceHistoryPoint[],
  now: Date,
  lookbackMinutes: number,
) {
  const targetTs = Math.floor(now.getTime() / 1000) - lookbackMinutes * 60;

  return history.reduce<PriceHistoryPoint | null>((best, point) => {
    if (point.t > targetTs) {
      return best;
    }

    if (!best || point.t > best.t) {
      return point;
    }

    return best;
  }, null);
}

function getOutcomeData(market: GammaMarket, expectedOutcome: string) {
  const outcomes = parseStringArray(market.outcomes, "outcomes");
  const prices = parseNumberArray(market.outcomePrices, "outcomePrices");
  const tokenIds = parseStringArray(market.clobTokenIds, "clobTokenIds");
  const outcomeIndex = outcomes.findIndex(
    (outcome) => outcome.toLowerCase() === expectedOutcome.toLowerCase(),
  );

  if (outcomeIndex < 0) {
    throw new Error(
      `Outcome "${expectedOutcome}" was not found for Polymarket market ${market.slug ?? market.id}.`,
    );
  }

  const tokenId = tokenIds[outcomeIndex];
  const currentPrice = prices[outcomeIndex];

  if (!tokenId || !Number.isFinite(currentPrice)) {
    throw new Error(
      `Polymarket market ${market.slug ?? market.id} is missing token or price data for outcome "${expectedOutcome}".`,
    );
  }

  return {
    outcome: outcomes[outcomeIndex],
    tokenId,
    currentPrice,
    outcomePrices: outcomes.map((outcome, index) => ({
      outcome,
      price: prices[index],
    })),
  };
}

function parseStringArray(value: unknown, fieldName: string) {
  const parsed = parseJsonArray(value, fieldName);

  return parsed.map((entry) => {
    if (typeof entry !== "string") {
      throw new Error(`Polymarket ${fieldName} must contain strings.`);
    }

    return entry;
  });
}

function parseNumberArray(value: unknown, fieldName: string) {
  const parsed = parseJsonArray(value, fieldName);

  return parsed.map((entry) => {
    const numberValue = Number(entry);

    if (!Number.isFinite(numberValue)) {
      throw new Error(`Polymarket ${fieldName} must contain numeric values.`);
    }

    return numberValue;
  });
}

function parseJsonArray(value: unknown, fieldName: string) {
  const parsed = typeof value === "string" ? JSON.parse(value) : value;

  if (!Array.isArray(parsed)) {
    throw new Error(`Polymarket ${fieldName} must be an array.`);
  }

  return parsed;
}

function createTelegramMessage(result: PolymarketCheckResult, checkedAt: Date) {
  const labels = polymarketContent.telegram;
  const signedChange = result.change >= 0 ? `+${formatPercent(result.change)}` : formatPercent(result.change);
  const marketUrl = result.marketSlug
    ? `https://polymarket.com/market/${result.marketSlug}`
    : null;
  const compactMarketLine = createCompactMarketLine(result);

  return [
    labels.title,
    compactMarketLine,
    `${labels.marketLabel}: ${result.marketQuestion}`,
    result.eventTitle ? `${labels.eventLabel}: ${result.eventTitle}` : null,
    `${labels.outcomeLabel}: ${result.outcome}`,
    `${labels.priceLabel}: ${formatPrice(result.currentPrice)}`,
    `${labels.previousPriceLabel}: ${formatPrice(result.previousPrice)}`,
    `${labels.changeLabel}: ${signedChange}`,
    `${labels.lookbackLabel}: ${result.lookbackMinutes}${labels.minutesUnit}`,
    `${labels.checkedAtLabel}: ${formatCheckedAt(checkedAt)}`,
    marketUrl,
  ]
    .filter(Boolean)
    .join("\n");
}

function createCompactMarketLine(result: PolymarketCheckResult) {
  const labels = polymarketContent.telegram;
  const yesPrice = findOutcomePrice(result.outcomePrices, "Yes");
  const noPrice = findOutcomePrice(result.outcomePrices, "No");
  const prices =
    yesPrice !== null && noPrice !== null
      ? `Yes ${formatPrice(yesPrice)} / No ${formatPrice(noPrice)}`
      : `${result.outcome} ${formatPrice(result.currentPrice)}`;
  const volume =
    result.volume24hr === null
      ? null
      : `${labels.volume24hrLabel}=${formatUsd(result.volume24hr)}`;
  const liquidity =
    result.liquidity === null
      ? null
      : `${labels.liquidityLabel}=${formatUsd(result.liquidity)}`;

  return [`- ${result.marketLabel}`, prices, volume, liquidity]
    .filter(Boolean)
    .join("  ");
}

function findOutcomePrice(
  outcomePrices: Array<{ outcome: string; price: number }>,
  outcomeName: string,
) {
  const match = outcomePrices.find(
    (entry) => entry.outcome.toLowerCase() === outcomeName.toLowerCase(),
  );

  return match?.price ?? null;
}

function formatPrice(value: number) {
  return `${(value * 100).toFixed(1)}%`;
}

function formatUsd(value: number) {
  const absoluteValue = Math.abs(value);

  if (absoluteValue >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(1)}m`;
  }

  if (absoluteValue >= 1_000) {
    return `$${(value / 1_000).toFixed(1)}k`;
  }

  return `$${value.toFixed(0)}`;
}

function formatPercent(value: number) {
  return `${(value * 100).toFixed(1)}%`;
}

function formatCheckedAt(date: Date) {
  return new Intl.DateTimeFormat("zh-CN", {
    dateStyle: "medium",
    timeStyle: "medium",
    timeZone: "Asia/Shanghai",
  }).format(date);
}
