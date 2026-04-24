import "server-only";

import { and, eq } from "drizzle-orm";

import monitoringContent from "@/content/monitoring.json";
import { db } from "@/lib/db";
import {
  issues,
  siteSearchConsoleDaily,
  siteSearchConsoleProperties,
  sites,
} from "@/lib/db/schema";
import { getServerEnv, hasSearchConsoleCredentials } from "@/lib/env";

type GoogleTokenResponse = {
  access_token: string;
};

type SearchAnalyticsRow = {
  keys?: string[];
  clicks?: number;
  impressions?: number;
  ctr?: number;
  position?: number;
};

type SearchAnalyticsResponse = {
  rows?: SearchAnalyticsRow[];
};

export type SearchConsoleDailyPoint = {
  date: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
};

export function formatMetricDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function parseMetricDate(value: string) {
  return new Date(`${value}T00:00:00.000Z`);
}

function getDateRange(days: number) {
  const end = new Date();
  end.setUTCDate(end.getUTCDate() - 1);
  end.setUTCHours(0, 0, 0, 0);

  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - (days - 1));

  return {
    startDate: formatMetricDate(start),
    endDate: formatMetricDate(end),
  };
}

function enumerateDates(startDate: string, endDate: string) {
  const dates: string[] = [];
  const cursor = parseMetricDate(startDate);
  const end = parseMetricDate(endDate);

  while (cursor.getTime() <= end.getTime()) {
    dates.push(formatMetricDate(cursor));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return dates;
}

function toBasisPoints(ctr: number | undefined) {
  return Math.round((ctr ?? 0) * 10_000);
}

function fromBasisPoints(ctrBasisPoints: number) {
  return ctrBasisPoints / 10_000;
}

function toPositionMilli(position: number | undefined) {
  return Math.round((position ?? 0) * 1_000);
}

function fromPositionMilli(positionMilli: number) {
  return positionMilli / 1_000;
}

function sumBy<T>(items: T[], selector: (item: T) => number) {
  return items.reduce((total, item) => total + selector(item), 0);
}

function averageBy<T>(items: T[], selector: (item: T) => number) {
  if (items.length === 0) {
    return 0;
  }

  return sumBy(items, selector) / items.length;
}

function getPercentDelta(currentValue: number, previousValue: number) {
  if (previousValue <= 0) {
    return 0;
  }

  return ((currentValue - previousValue) / previousValue) * 100;
}

async function getGoogleAccessToken() {
  const env = getServerEnv();

  if (
    !env.GOOGLE_SEARCH_CONSOLE_CLIENT_ID ||
    !env.GOOGLE_SEARCH_CONSOLE_CLIENT_SECRET ||
    !env.GOOGLE_SEARCH_CONSOLE_REFRESH_TOKEN
  ) {
    throw new Error(
      "Google Search Console credentials are not configured in environment variables.",
    );
  }

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: env.GOOGLE_SEARCH_CONSOLE_CLIENT_ID,
      client_secret: env.GOOGLE_SEARCH_CONSOLE_CLIENT_SECRET,
      refresh_token: env.GOOGLE_SEARCH_CONSOLE_REFRESH_TOKEN,
      grant_type: "refresh_token",
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Google token refresh failed with ${response.status}`);
  }

  const data = (await response.json()) as GoogleTokenResponse;

  if (!data.access_token) {
    throw new Error("Google token refresh did not return an access token.");
  }

  return data.access_token;
}

async function fetchSearchAnalytics(input: {
  propertyUrl: string;
  startDate: string;
  endDate: string;
}) {
  const accessToken = await getGoogleAccessToken();
  const response = await fetch(
    `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(
      input.propertyUrl,
    )}/searchAnalytics/query`,
    {
      method: "POST",
      headers: {
        authorization: `Bearer ${accessToken}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        startDate: input.startDate,
        endDate: input.endDate,
        dimensions: ["date"],
        rowLimit: 200,
      }),
      cache: "no-store",
    },
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Google Search Console query failed with ${response.status}: ${errorText}`,
    );
  }

  return (await response.json()) as SearchAnalyticsResponse;
}

async function syncSearchConsoleIssue(input: {
  siteId: string;
  type: "search_clicks_drop" | "search_impressions_drop";
  shouldExist: boolean;
  severity: "warning" | "critical";
  title: string;
  detail: string;
  meta: Record<string, unknown>;
}) {
  const existingIssue = await db.query.issues.findFirst({
    where: and(
      eq(issues.siteId, input.siteId),
      eq(issues.type, input.type),
      eq(issues.isResolved, false),
    ),
    orderBy: (table, { desc: descOrder }) => [descOrder(table.detectedAt)],
  });

  if (!input.shouldExist) {
    if (!existingIssue) {
      return;
    }

    await db
      .update(issues)
      .set({
        isResolved: true,
        resolvedAt: new Date(),
        meta: input.meta,
      })
      .where(eq(issues.id, existingIssue.id));

    return;
  }

  if (existingIssue) {
    await db
      .update(issues)
      .set({
        severity: input.severity,
        title: input.title,
        detail: input.detail,
        meta: input.meta,
      })
      .where(eq(issues.id, existingIssue.id));

    return;
  }

  await db.insert(issues).values({
    siteId: input.siteId,
    type: input.type,
    severity: input.severity,
    title: input.title,
    detail: input.detail,
    meta: input.meta,
  });
}

async function syncTrendIssues(siteId: string, dataPoints: SearchConsoleDailyPoint[]) {
  const env = getServerEnv();
  const recentWindow = dataPoints.slice(-30);
  const previousWindow = dataPoints.slice(-60, -30);

  if (recentWindow.length < 30 || previousWindow.length < 30) {
    return;
  }

  const recentClicks = sumBy(recentWindow, (point) => point.clicks);
  const previousClicks = sumBy(previousWindow, (point) => point.clicks);
  const recentImpressions = sumBy(recentWindow, (point) => point.impressions);
  const previousImpressions = sumBy(previousWindow, (point) => point.impressions);

  const clicksDelta = getPercentDelta(recentClicks, previousClicks);
  const impressionsDelta = getPercentDelta(recentImpressions, previousImpressions);

  const clicksDropPercent = Math.abs(Math.min(clicksDelta, 0));
  const impressionsDropPercent = Math.abs(Math.min(impressionsDelta, 0));

  await syncSearchConsoleIssue({
    siteId,
    type: "search_clicks_drop",
    shouldExist:
      previousClicks > 0 &&
      clicksDropPercent >= env.SEARCH_CLICKS_DROP_THRESHOLD_PERCENT,
    severity:
      clicksDropPercent >= env.SEARCH_CLICKS_DROP_THRESHOLD_PERCENT * 1.5
        ? "critical"
        : "warning",
    title: monitoringContent.common.searchConsoleIssueTexts.clicksDropTitle,
    detail: `${monitoringContent.common.searchConsoleIssueTexts.clicksDropDetailPrefix} ${Math.round(
      clicksDropPercent,
    )}%。`,
    meta: {
      recentClicks,
      previousClicks,
      deltaPercent: clicksDelta,
    },
  });

  await syncSearchConsoleIssue({
    siteId,
    type: "search_impressions_drop",
    shouldExist:
      previousImpressions > 0 &&
      impressionsDropPercent >= env.SEARCH_IMPRESSIONS_DROP_THRESHOLD_PERCENT,
    severity:
      impressionsDropPercent >= env.SEARCH_IMPRESSIONS_DROP_THRESHOLD_PERCENT * 1.5
        ? "critical"
        : "warning",
    title: monitoringContent.common.searchConsoleIssueTexts.impressionsDropTitle,
    detail: `${monitoringContent.common.searchConsoleIssueTexts.impressionsDropDetailPrefix} ${Math.round(
      impressionsDropPercent,
    )}%。`,
    meta: {
      recentImpressions,
      previousImpressions,
      deltaPercent: impressionsDelta,
    },
  });
}

export async function syncSearchConsoleForSite(siteId: string) {
  const [site, property] = await Promise.all([
    db.query.sites.findFirst({
      where: eq(sites.id, siteId),
    }),
    db.query.siteSearchConsoleProperties.findFirst({
      where: eq(siteSearchConsoleProperties.siteId, siteId),
    }),
  ]);

  if (!site) {
    throw new Error(`Site not found: ${siteId}`);
  }

  if (!property?.isEnabled || !property.propertyUrl) {
    throw new Error("Search Console property is not configured for this site.");
  }

  const syncStartedAt = new Date();

  try {
    const range = getDateRange(getServerEnv().SEARCH_CONSOLE_SYNC_LOOKBACK_DAYS);
    const response = await fetchSearchAnalytics({
      propertyUrl: property.propertyUrl,
      startDate: range.startDate,
      endDate: range.endDate,
    });
    const rowsByDate = new Map(
      (response.rows ?? [])
        .filter((row) => row.keys?.[0])
        .map((row) => [
          row.keys![0]!,
          {
            clicks: Math.round(row.clicks ?? 0),
            impressions: Math.round(row.impressions ?? 0),
            ctrBasisPoints: toBasisPoints(row.ctr),
            positionMilli: toPositionMilli(row.position),
          },
        ]),
    );

    const allDates = enumerateDates(range.startDate, range.endDate);

    for (const metricDate of allDates) {
      const row = rowsByDate.get(metricDate) ?? {
        clicks: 0,
        impressions: 0,
        ctrBasisPoints: 0,
        positionMilli: 0,
      };

      await db
        .insert(siteSearchConsoleDaily)
        .values({
          siteId,
          metricDate,
          clicks: row.clicks,
          impressions: row.impressions,
          ctrBasisPoints: row.ctrBasisPoints,
          positionMilli: row.positionMilli,
          syncedAt: syncStartedAt,
        })
        .onConflictDoUpdate({
          target: [siteSearchConsoleDaily.siteId, siteSearchConsoleDaily.metricDate],
          set: {
            clicks: row.clicks,
            impressions: row.impressions,
            ctrBasisPoints: row.ctrBasisPoints,
            positionMilli: row.positionMilli,
            syncedAt: syncStartedAt,
          },
        });
    }

    await db
      .update(siteSearchConsoleProperties)
      .set({
        lastSyncedAt: syncStartedAt,
        syncStatus: "ready",
        syncError: null,
        updatedAt: syncStartedAt,
      })
      .where(eq(siteSearchConsoleProperties.siteId, siteId));

    const dailyMetrics = await db.query.siteSearchConsoleDaily.findMany({
      where: eq(siteSearchConsoleDaily.siteId, siteId),
      orderBy: (table, { desc: descOrder }) => [descOrder(table.metricDate)],
      limit: 60,
    });

    const normalized = [...dailyMetrics]
      .reverse()
      .map((row) => ({
        date: row.metricDate,
        clicks: row.clicks,
        impressions: row.impressions,
        ctr: fromBasisPoints(row.ctrBasisPoints),
        position: fromPositionMilli(row.positionMilli),
      }));

    await syncTrendIssues(siteId, normalized);

    return {
      site,
      propertyUrl: property.propertyUrl,
      syncedAt: syncStartedAt,
      points: normalized,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown Search Console sync error";

    await db
      .update(siteSearchConsoleProperties)
      .set({
        syncStatus: "error",
        syncError: message,
        updatedAt: syncStartedAt,
      })
      .where(eq(siteSearchConsoleProperties.siteId, siteId));

    throw error;
  }
}

export async function getSearchConsoleOverview(siteId: string) {
  const [property, dailyMetrics] = await Promise.all([
    db.query.siteSearchConsoleProperties.findFirst({
      where: eq(siteSearchConsoleProperties.siteId, siteId),
    }),
    db.query.siteSearchConsoleDaily.findMany({
      where: eq(siteSearchConsoleDaily.siteId, siteId),
      orderBy: (table, { desc: descOrder }) => [descOrder(table.metricDate)],
      limit: 60,
    }),
  ]);

  const metrics = [...dailyMetrics].reverse().map((row) => ({
    date: row.metricDate,
    clicks: row.clicks,
    impressions: row.impressions,
    ctr: fromBasisPoints(row.ctrBasisPoints),
    position: fromPositionMilli(row.positionMilli),
  }));

  const recentWindow = metrics.slice(-30);
  const previousWindow = metrics.slice(-60, -30);

  const recentClicks = sumBy(recentWindow, (point) => point.clicks);
  const previousClicks = sumBy(previousWindow, (point) => point.clicks);
  const recentImpressions = sumBy(recentWindow, (point) => point.impressions);
  const previousImpressions = sumBy(previousWindow, (point) => point.impressions);

  return {
    property,
    points: recentWindow,
    recentClicks,
    previousClicks,
    recentImpressions,
    previousImpressions,
    clicksDeltaPercent: getPercentDelta(recentClicks, previousClicks),
    impressionsDeltaPercent: getPercentDelta(recentImpressions, previousImpressions),
    recentCtr: averageBy(recentWindow, (point) => point.ctr),
    recentPosition: averageBy(recentWindow, (point) => point.position),
  };
}

export async function runSearchConsoleSyncForDueSites(input?: { now?: Date }) {
  const now = input?.now ?? new Date();

  if (!hasSearchConsoleCredentials()) {
    return {
      checkedAt: now,
      checkedCount: 0,
      skippedCount: 0,
      skippedReason: "missing_credentials",
      results: [],
    };
  }

  const properties = await db.query.siteSearchConsoleProperties.findMany({
    where: eq(siteSearchConsoleProperties.isEnabled, true),
    orderBy: (table, { asc }) => [asc(table.createdAt)],
  });

  const dueProperties = properties.filter((property) => {
    if (!property.lastSyncedAt) {
      return true;
    }

    return (
      property.lastSyncedAt.getTime() + 24 * 60 * 60 * 1000 <= now.getTime()
    );
  });

  const results = [];

  for (const property of dueProperties) {
    try {
      const result = await syncSearchConsoleForSite(property.siteId);
      results.push({
        siteId: property.siteId,
        propertyUrl: property.propertyUrl,
        ok: true,
        syncedAt: result.syncedAt,
      });
    } catch (error) {
      results.push({
        siteId: property.siteId,
        propertyUrl: property.propertyUrl,
        ok: false,
        error: error instanceof Error ? error.message : "Unknown Search Console sync error",
      });
    }
  }

  return {
    checkedAt: now,
    checkedCount: dueProperties.length,
    skippedCount: properties.length - dueProperties.length,
    skippedReason: null,
    results,
  };
}
