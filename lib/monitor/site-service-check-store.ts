import "server-only";

import { and, eq, inArray } from "drizzle-orm";

import monitoringContent from "@/content/monitoring.json";
import { db } from "@/lib/db";
import {
  issues,
  siteServiceChecks,
  siteServices,
  siteServiceStatus,
} from "@/lib/db/schema";
import { performSiteCheck } from "@/lib/monitor/site-check";

type ServiceStatus = "healthy" | "degraded" | "warning" | "down" | "unknown";

type ServiceRecord = {
  id: string;
  siteId: string;
  displayName: string;
  providerKey: string;
  healthCheckUrl: string | null;
  checkIntervalMinutes: number;
  isActive: boolean;
};

type RunServiceCheckResult = {
  status: Exclude<ServiceStatus, "unknown">;
  statusCode: number | null;
  responseTimeMs: number | null;
  errorMessage: string | null;
  checkedAt: Date;
  meta: Record<string, unknown>;
};

export async function runServiceCheckForService(input: {
  siteServiceId: string;
  timeoutMs?: number;
}) {
  const siteService = await db.query.siteServices.findFirst({
    where: eq(siteServices.id, input.siteServiceId),
  });

  if (!siteService) {
    throw new Error(`Service not found: ${input.siteServiceId}`);
  }

  if (!siteService.healthCheckUrl) {
    throw new Error("Service health check URL is required before running a check.");
  }

  return runChecksForService(siteService, input.timeoutMs);
}

export async function runChecksForDueServices(input?: {
  timeoutMs?: number;
  now?: Date;
}) {
  const now = input?.now ?? new Date();
  const activeServices = await db.query.siteServices.findMany({
    where: eq(siteServices.isActive, true),
    orderBy: (table, { asc }) => [asc(table.createdAt)],
  });

  const serviceIds = activeServices.map((service) => service.id);
  const latestStatuses =
    serviceIds.length === 0
      ? []
      : await db.query.siteServiceStatus.findMany({
          where: (table) => inArray(table.siteServiceId, serviceIds),
        });

  const latestStatusMap = new Map(
    latestStatuses.map((status) => [status.siteServiceId, status]),
  );

  const dueServices = activeServices.filter((service) =>
    Boolean(service.healthCheckUrl) &&
    isServiceCheckDue(latestStatusMap.get(service.id)?.checkedAt ?? null, service, now),
  );

  const results = [];

  for (const service of dueServices) {
    const result = await runChecksForService(service, input?.timeoutMs);
    results.push({
      service,
      result,
    });
  }

  return {
    checkedAt: now,
    checkedCount: results.length,
    skippedCount: activeServices.length - dueServices.length,
    results,
  };
}

async function runChecksForService(service: ServiceRecord, timeoutMs?: number) {
  const checkResult = await performSiteCheck({
    url: service.healthCheckUrl ?? "",
    timeoutMs,
  });

  const result: RunServiceCheckResult = {
    status: checkResult.status,
    statusCode: checkResult.statusCode,
    responseTimeMs: checkResult.responseTimeMs,
    errorMessage: checkResult.errorMessage,
    checkedAt: checkResult.checkedAt,
    meta: {
      finalUrl: checkResult.finalUrl,
      redirected: checkResult.redirected,
      attempts: checkResult.attempts,
      url: checkResult.url,
    },
  };

  await persistServiceCheck(service.id, result);
  await syncServiceIssue(service, result);

  return result;
}

async function persistServiceCheck(
  siteServiceId: string,
  result: RunServiceCheckResult,
) {
  await db.insert(siteServiceChecks).values({
    siteServiceId,
    status: result.status,
    statusCode: result.statusCode,
    responseTimeMs: result.responseTimeMs,
    errorMessage: result.errorMessage,
    checkedAt: result.checkedAt,
    meta: result.meta,
  });

  const existingStatus = await db.query.siteServiceStatus.findFirst({
    where: eq(siteServiceStatus.siteServiceId, siteServiceId),
  });

  if (existingStatus) {
    await db
      .update(siteServiceStatus)
      .set({
        status: result.status,
        statusDetail: result.errorMessage ?? null,
        responseTimeMs: result.responseTimeMs,
        errorMessage: result.errorMessage,
        checkedAt: result.checkedAt,
        lastSuccessAt:
          result.status === "healthy" || result.status === "degraded"
            ? result.checkedAt
            : existingStatus.lastSuccessAt,
        meta: result.meta,
      })
      .where(eq(siteServiceStatus.id, existingStatus.id));

    return;
  }

  await db.insert(siteServiceStatus).values({
    siteServiceId,
    status: result.status,
    statusDetail: result.errorMessage ?? null,
    responseTimeMs: result.responseTimeMs,
    errorMessage: result.errorMessage,
    checkedAt: result.checkedAt,
    lastSuccessAt:
      result.status === "healthy" || result.status === "degraded"
        ? result.checkedAt
        : null,
    meta: result.meta,
  });
}

async function syncServiceIssue(service: ServiceRecord, result: RunServiceCheckResult) {
  const shouldExist = result.status === "down" || result.status === "warning";
  const candidateIssues = await db.query.issues.findMany({
    where: and(
      eq(issues.siteId, service.siteId),
      eq(issues.type, "service_down"),
      eq(issues.isResolved, false),
    ),
    orderBy: (table, { desc }) => [desc(table.detectedAt)],
  });
  const existingIssue =
    candidateIssues.find((issue) => {
      if (!issue.meta || typeof issue.meta !== "object") {
        return false;
      }

      return (issue.meta as { serviceId?: unknown }).serviceId === service.id;
    }) ?? null;

  const issueMeta = {
    serviceId: service.id,
    providerKey: service.providerKey,
    statusCode: result.statusCode,
    checkedAt: result.checkedAt.toISOString(),
    healthCheckUrl: service.healthCheckUrl,
    errorMessage: result.errorMessage,
  };

  if (!shouldExist) {
    if (!existingIssue) {
      return;
    }

    await db
      .update(issues)
      .set({
        isResolved: true,
        resolvedAt: new Date(),
        meta: issueMeta,
      })
      .where(eq(issues.id, existingIssue.id));

    return;
  }

  const title = `${service.displayName} ${monitoringContent.common.serviceIssueTexts.downTitleSuffix}`;
  const detail = result.errorMessage
    ? `${monitoringContent.common.serviceIssueTexts.downDetailPrefix} ${result.errorMessage}`
    : null;
  const severity = result.status === "down" ? "critical" : "warning";

  if (existingIssue) {
    await db
      .update(issues)
      .set({
        severity,
        title,
        detail,
        meta: issueMeta,
      })
      .where(eq(issues.id, existingIssue.id));

    return;
  }

  await db.insert(issues).values({
    siteId: service.siteId,
    type: "service_down",
    severity,
    title,
    detail,
    meta: issueMeta,
  });
}

function isServiceCheckDue(
  lastCheckedAt: Date | null,
  service: Pick<ServiceRecord, "checkIntervalMinutes">,
  now: Date,
) {
  if (!lastCheckedAt) {
    return true;
  }

  const nextCheckAt =
    lastCheckedAt.getTime() + service.checkIntervalMinutes * 60 * 1000;

  return nextCheckAt <= now.getTime();
}
