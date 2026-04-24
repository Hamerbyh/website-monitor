import "server-only";

import { eq } from "drizzle-orm";

import monitoringContent from "@/content/monitoring.json";
import uiContent from "@/content/ui.json";
import { db } from "@/lib/db";
import { sites } from "@/lib/db/schema";
import { getSearchConsoleOverview } from "@/lib/monitor/site-search-console";

function getStatusBadge(status: string) {
  switch (status) {
    case "healthy":
      return uiContent.siteStatusBadges.healthy;
    case "degraded":
      return uiContent.siteStatusBadges.degraded;
    case "warning":
      return uiContent.siteStatusBadges.warning;
    case "down":
      return uiContent.siteStatusBadges.down;
    default:
      return uiContent.siteStatusBadges.unknown;
  }
}

function getIssueLevel(severity: string) {
  return (
    monitoringContent.common.issueLevels[
      severity as keyof typeof monitoringContent.common.issueLevels
    ] ?? monitoringContent.common.issueLevels.notice
  );
}

export async function getSiteDetailData(siteId: string, issueType?: string) {
  const site = await db.query.sites.findFirst({
    where: eq(sites.id, siteId),
  });

  if (!site) {
    return null;
  }

  const [
    latestCheck,
    latestSslStatus,
    latestDomainStatus,
    recentChecks,
    openIssues,
    issueHistory,
    rawServices,
    searchConsole,
  ] = await Promise.all([
    db.query.siteChecks.findFirst({
      where: (table, { eq: eqOp }) => eqOp(table.siteId, site.id),
      orderBy: (table, { desc: descOrder }) => [descOrder(table.checkedAt)],
    }),
    db.query.siteSslStatus.findFirst({
      where: (table, { eq: eqOp }) => eqOp(table.siteId, site.id),
      orderBy: (table, { desc: descOrder }) => [descOrder(table.checkedAt)],
    }),
    db.query.siteDomainStatus.findFirst({
      where: (table, { eq: eqOp }) => eqOp(table.siteId, site.id),
      orderBy: (table, { desc: descOrder }) => [descOrder(table.checkedAt)],
    }),
    db.query.siteChecks.findMany({
      where: (table, { eq: eqOp }) => eqOp(table.siteId, site.id),
      orderBy: (table, { desc: descOrder }) => [descOrder(table.checkedAt)],
      limit: 12,
    }),
    db.query.issues.findMany({
      where: (table, { and, eq: eqOp }) =>
        and(eqOp(table.siteId, site.id), eqOp(table.isResolved, false)),
      orderBy: (table, { desc: descOrder }) => [descOrder(table.detectedAt)],
      limit: 12,
    }),
    db.query.issues.findMany({
      where: (table, { eq: eqOp }) => eqOp(table.siteId, site.id),
      orderBy: (table, { desc: descOrder }) => [descOrder(table.detectedAt)],
      limit: 40,
    }),
    db.query.siteServices.findMany({
      where: (table, { eq: eqOp }) => eqOp(table.siteId, site.id),
      orderBy: (table, { asc }) => [asc(table.displayName)],
    }),
    getSearchConsoleOverview(site.id),
  ]);

  const services = await Promise.all(
    rawServices.map(async (service) => {
      const [latestStatus, recentChecksForService] = await Promise.all([
        db.query.siteServiceStatus.findFirst({
          where: (table, { eq: eqOp }) => eqOp(table.siteServiceId, service.id),
        }),
        db.query.siteServiceChecks.findMany({
          where: (table, { eq: eqOp }) => eqOp(table.siteServiceId, service.id),
          orderBy: (table, { desc: descOrder }) => [descOrder(table.checkedAt)],
          limit: 6,
        }),
      ]);

      return {
        ...service,
        latestStatus,
        recentChecks: recentChecksForService,
      };
    }),
  );

  const filteredIssueHistory = issueType
    ? issueHistory.filter((issue) => issue.type === issueType)
    : issueHistory;

  return {
    ...site,
    statusBadge: getStatusBadge(site.status),
    latestCheck,
    latestSslStatus,
    latestDomainStatus,
    recentChecks,
    openIssues: openIssues.map((issue) => ({ ...issue, level: getIssueLevel(issue.severity) })),
    issueHistory: filteredIssueHistory.map((issue) => ({
      ...issue,
      level: getIssueLevel(issue.severity),
    })),
    issueTypes: [...new Set(issueHistory.map((issue) => issue.type))],
    selectedIssueType: issueType ?? null,
    searchConsole,
    services,
  };
}
