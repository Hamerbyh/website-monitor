import "server-only";

import { and, eq } from "drizzle-orm";

import monitoringContent from "@/content/monitoring.json";
import { db } from "@/lib/db";
import { issues, siteChecks, siteSslStatus, sites } from "@/lib/db/schema";
import { getServerEnv } from "@/lib/env";
import { performSiteCheck, type SiteCheckResult } from "@/lib/monitor/site-check";
import {
  performSiteSslCheck,
  type SiteSslCheckResult,
} from "@/lib/monitor/site-ssl-check";
import { sendSiteStatusEmailAlert } from "@/lib/notifications/site-status-email-alert";

type SiteRecord = {
  id: string;
  name: string;
  domain: string;
  checkUrl: string;
  isActive: boolean;
  status: "healthy" | "degraded" | "warning" | "down";
};

type RunSiteCheckOptions = {
  timeoutMs?: number;
  now?: Date;
  forceSslCheck?: boolean;
};

export async function runSiteCheckForSite(input: {
  siteId: string;
  timeoutMs?: number;
}) {
  const site = await db.query.sites.findFirst({
    where: eq(sites.id, input.siteId),
  });

  if (!site) {
    throw new Error(`Site not found: ${input.siteId}`);
  }

  const { result, sslResult } = await runChecksForSite(site, {
    timeoutMs: input.timeoutMs,
    forceSslCheck: true,
  });

  return {
    site,
    result,
    sslResult,
  };
}

export async function runChecksForActiveSites(input?: { timeoutMs?: number }) {
  const activeSites = await db.query.sites.findMany({
    where: eq(sites.isActive, true),
    orderBy: (table, { asc }) => [asc(table.createdAt)],
  });

  const results = [];

  for (const site of activeSites) {
    const { result, sslResult } = await runChecksForSite(site, {
      timeoutMs: input?.timeoutMs,
      forceSslCheck: true,
    });

    results.push({
      site,
      result,
      sslResult,
    });
  }

  return results;
}

export async function runChecksForDueSites(input?: {
  timeoutMs?: number;
  now?: Date;
}) {
  const now = input?.now ?? new Date();
  const activeSites = await db.query.sites.findMany({
    where: eq(sites.isActive, true),
    orderBy: (table, { asc }) => [asc(table.createdAt)],
  });

  const dueSites = activeSites.filter((site) => isSiteCheckDue(site, now));
  const results = [];
  let sslCheckedCount = 0;

  for (const site of dueSites) {
    const { result, sslResult } = await runChecksForSite(site, {
      timeoutMs: input?.timeoutMs,
      now,
    });

    if (sslResult) {
      sslCheckedCount += 1;
    }

    results.push({
      site,
      result,
      sslResult,
    });
  }

  return {
    checkedAt: now,
    checkedCount: results.length,
    sslCheckedCount,
    skippedCount: activeSites.length - results.length,
    results,
  };
}

export async function persistSiteCheck(siteId: string, result: SiteCheckResult) {
  await db.insert(siteChecks).values({
    siteId,
    method: result.method,
    status: result.status,
    statusCode: result.statusCode,
    responseTimeMs: result.responseTimeMs,
    errorMessage: result.errorMessage,
    checkedAt: result.checkedAt,
    meta: {
      finalUrl: result.finalUrl,
      redirected: result.redirected,
      attempts: result.attempts,
    },
  });

  await db
    .update(sites)
    .set({
      status: result.status,
      lastCheckedAt: result.checkedAt,
      updatedAt: new Date(),
    })
    .where(eq(sites.id, siteId));
}

async function runChecksForSite(site: SiteRecord, input?: RunSiteCheckOptions) {
  const result = await performSiteCheck({
    url: site.checkUrl,
    timeoutMs: input?.timeoutMs,
  });

  await persistSiteCheck(site.id, result);
  await sendSiteAlert(site, result);

  const sslResult = await maybeRunSiteSslCheck(site, input);

  return {
    result,
    sslResult,
  };
}

async function maybeRunSiteSslCheck(site: SiteRecord, input?: RunSiteCheckOptions) {
  const now = input?.now ?? new Date();
  const latestSslStatus = await db.query.siteSslStatus.findFirst({
    where: eq(siteSslStatus.siteId, site.id),
    orderBy: (table, { desc }) => [desc(table.checkedAt)],
  });

  if (!input?.forceSslCheck && !isSiteSslCheckDue(latestSslStatus?.checkedAt ?? null, now)) {
    return null;
  }

  const sslResult = await performSiteSslCheck({
    domain: site.domain,
    timeoutMs: input?.timeoutMs,
  });

  await persistSiteSslCheck(site.id, sslResult);
  await syncSiteSslIssues(site.id, sslResult);

  return sslResult;
}

async function persistSiteSslCheck(siteId: string, result: SiteSslCheckResult) {
  await db.delete(siteSslStatus).where(eq(siteSslStatus.siteId, siteId));

  await db.insert(siteSslStatus).values({
    siteId,
    isValid: result.isValid,
    expiresAt: result.expiresAt,
    daysRemaining: result.daysRemaining,
    issuer: result.issuer,
    commonName: result.commonName,
    matchedDomain: result.matchedDomain,
    checkedAt: result.checkedAt,
  });
}

async function syncSiteSslIssues(siteId: string, result: SiteSslCheckResult) {
  const env = getServerEnv();
  const shouldCreateExpiredIssue =
    !!result.errorMessage ||
    !result.matchedDomain ||
    !result.expiresAt ||
    (result.daysRemaining !== null && result.daysRemaining <= 0);
  const shouldCreateExpiringSoonIssue =
    !shouldCreateExpiredIssue &&
    result.daysRemaining !== null &&
    result.daysRemaining <= env.SSL_EXPIRING_SOON_DAYS;

  await syncSslIssue({
    siteId,
    type: "ssl_expired",
    shouldExist: shouldCreateExpiredIssue,
    severity: "critical",
    title: buildSslExpiredTitle(result),
    detail: buildSslExpiredDetail(result),
    meta: {
      matchedDomain: result.matchedDomain,
      expiresAt: result.expiresAt?.toISOString() ?? null,
      daysRemaining: result.daysRemaining,
      errorMessage: result.errorMessage,
    },
  });

  await syncSslIssue({
    siteId,
    type: "ssl_expiring_soon",
    shouldExist: shouldCreateExpiringSoonIssue,
    severity:
      (result.daysRemaining ?? Number.POSITIVE_INFINITY) <=
      env.SSL_EXPIRING_CRITICAL_DAYS
        ? "critical"
        : "warning",
    title: monitoringContent.common.sslIssueTexts.expiringSoonTitle,
    detail: buildSslExpiringSoonDetail(result),
    meta: {
      expiresAt: result.expiresAt?.toISOString() ?? null,
      daysRemaining: result.daysRemaining,
    },
  });
}

async function syncSslIssue(input: {
  siteId: string;
  type: "ssl_expired" | "ssl_expiring_soon";
  shouldExist: boolean;
  severity: "notice" | "warning" | "critical";
  title: string;
  detail: string | null;
  meta: Record<string, unknown>;
}) {
  const existingIssue = await db.query.issues.findFirst({
    where: and(
      eq(issues.siteId, input.siteId),
      eq(issues.type, input.type),
      eq(issues.isResolved, false),
    ),
    orderBy: (table, { desc }) => [desc(table.detectedAt)],
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

async function sendSiteAlert(site: SiteRecord, result: SiteCheckResult) {
  try {
    await sendSiteStatusEmailAlert({
      site,
      previousStatus: site.status,
      result,
    });
  } catch (error) {
    console.error("Failed to send site status alert email.", {
      siteId: site.id,
      siteName: site.name,
      error,
    });
  }
}

function isSiteCheckDue(
  site: {
    lastCheckedAt: Date | null;
    checkIntervalMinutes: number;
  },
  now: Date,
) {
  if (!site.lastCheckedAt) {
    return true;
  }

  const nextCheckAt =
    site.lastCheckedAt.getTime() + site.checkIntervalMinutes * 60 * 1000;

  return nextCheckAt <= now.getTime();
}

function isSiteSslCheckDue(lastCheckedAt: Date | null, now: Date) {
  if (!lastCheckedAt) {
    return true;
  }

  const nextCheckAt =
    lastCheckedAt.getTime() +
    getServerEnv().SSL_CHECK_INTERVAL_MINUTES * 60 * 1000;

  return nextCheckAt <= now.getTime();
}

function buildSslExpiredTitle(result: SiteSslCheckResult) {
  const texts = monitoringContent.common.sslIssueTexts;

  if (result.errorMessage) {
    return texts.checkFailedTitle;
  }

  if (!result.matchedDomain) {
    return texts.domainMismatchTitle;
  }

  if (!result.expiresAt) {
    return texts.expirationUnknownTitle;
  }

  return texts.expiredTitle;
}

function buildSslExpiredDetail(result: SiteSslCheckResult) {
  const texts = monitoringContent.common.sslIssueTexts;

  if (result.errorMessage) {
    return result.errorMessage;
  }

  if (!result.matchedDomain) {
    return texts.domainMismatchDetail;
  }

  if (!result.expiresAt) {
    return texts.expirationUnknownDetail;
  }

  return `证书已于 ${result.expiresAt.toISOString()} 过期。`;
}

function buildSslExpiringSoonDetail(result: SiteSslCheckResult) {
  if (!result.expiresAt || result.daysRemaining === null) {
    return null;
  }

  return `证书将在 ${result.expiresAt.toISOString()} 到期，剩余 ${result.daysRemaining} 天。`;
}
