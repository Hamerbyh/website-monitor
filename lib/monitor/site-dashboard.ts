import "server-only";

import { eq, inArray } from "drizzle-orm";

import monitoringContent from "@/content/monitoring.json";
import uiContent from "@/content/ui.json";
import { db } from "@/lib/db";
import { issues } from "@/lib/db/schema";

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

function getStatusPriority(status: string) {
  switch (status) {
    case "down":
      return 0;
    case "warning":
      return 1;
    case "degraded":
      return 2;
    case "healthy":
      return 3;
    default:
      return 4;
  }
}

function getIssueLevel(severity: string) {
  return (
    monitoringContent.common.issueLevels[
      severity as keyof typeof monitoringContent.common.issueLevels
    ] ?? monitoringContent.common.issueLevels.notice
  );
}

export async function getSitesDashboardData() {
  const sites = await db.query.sites.findMany({
    orderBy: (table, { asc, desc: descOrder }) => [
      descOrder(table.isActive),
      asc(table.name),
    ],
  });

  const totalSites = sites.length;
  const activeSites = sites.filter((site) => site.isActive);
  const healthySites = activeSites.filter((site) => site.status === "healthy");
  const degradedSites = activeSites.filter(
    (site) => site.status === "degraded" || site.status === "warning",
  );
  const downSites = activeSites.filter((site) => site.status === "down");
  const alertSites = activeSites.filter((site) => site.status !== "healthy");
  const siteIds = sites.map((site) => site.id);

  const allSiteServices =
    siteIds.length === 0
      ? []
      : await db.query.siteServices.findMany({
          where: (table) => inArray(table.siteId, siteIds),
          orderBy: (table, { asc }) => [asc(table.displayName)],
        });

  const allSiteServiceStatuses =
    allSiteServices.length === 0
      ? []
      : await db.query.siteServiceStatus.findMany({
          where: (table) =>
            inArray(
              table.siteServiceId,
              allSiteServices.map((service) => service.id),
            ),
        });

  const serviceStatusMap = new Map(
    allSiteServiceStatuses.map((status) => [status.siteServiceId, status]),
  );
  const servicesBySiteId = new Map<string, typeof allSiteServices>();

  for (const service of allSiteServices) {
    const currentServices = servicesBySiteId.get(service.siteId) ?? [];
    currentServices.push(service);
    servicesBySiteId.set(service.siteId, currentServices);
  }

  const openIssues = await db.query.issues.findMany({
    where: eq(issues.isResolved, false),
    orderBy: (table, { desc }) => [desc(table.detectedAt)],
    limit: 8,
  });
  const issueSiteIds = [
    ...new Set(
      openIssues
        .map((issue) => issue.siteId)
        .filter((siteId): siteId is string => Boolean(siteId)),
    ),
  ];
  const issueSites =
    issueSiteIds.length === 0
      ? []
      : await db.query.sites.findMany({
          where: (table) => inArray(table.id, issueSiteIds),
        });
  const issueSiteMap = new Map(issueSites.map((site) => [site.id, site]));

  const latestChecks = await Promise.all(
    sites.map(async (site) => {
      const latestCheck = await db.query.siteChecks.findFirst({
        where: (table, { eq }) => eq(table.siteId, site.id),
        orderBy: (table, { desc: descOrder }) => [descOrder(table.checkedAt)],
      });
      const latestSslStatus = await db.query.siteSslStatus.findFirst({
        where: (table, { eq }) => eq(table.siteId, site.id),
        orderBy: (table, { desc: descOrder }) => [descOrder(table.checkedAt)],
      });

      const recentChecks = await db.query.siteChecks.findMany({
        where: (table, { eq }) => eq(table.siteId, site.id),
        orderBy: (table, { desc: descOrder }) => [descOrder(table.checkedAt)],
        limit: 8,
      });
      const siteServices = (servicesBySiteId.get(site.id) ?? []).map((service) => ({
        ...service,
        latestStatus: serviceStatusMap.get(service.id),
      }));
      const serviceAlertCount = siteServices.filter((service) => {
        const status = service.latestStatus?.status;
        return status === "warning" || status === "down";
      }).length;

      return {
        ...site,
        services: siteServices,
        serviceSummary: {
          total: siteServices.length,
          alerts: serviceAlertCount,
        },
        latestCheck,
        latestSslStatus,
        recentChecks,
        statusBadge: getStatusBadge(site.status),
      };
    }),
  );

  const lastCheckedAt = latestChecks
    .map((site) => site.latestCheck?.checkedAt ?? site.lastCheckedAt)
    .filter((value): value is Date => Boolean(value))
    .sort((left, right) => right.getTime() - left.getTime())[0] ?? null;

  const sortedSites = [...latestChecks].sort((left, right) => {
    const statusDiff = getStatusPriority(left.status) - getStatusPriority(right.status);

    if (statusDiff !== 0) {
      return statusDiff;
    }

    if (left.isActive !== right.isActive) {
      return left.isActive ? -1 : 1;
    }

    return left.name.localeCompare(right.name);
  });

  const healthyServicesCount = allSiteServiceStatuses.filter(
    (status) => status.status === "healthy",
  ).length;
  const alertServicesCount = allSiteServiceStatuses.filter((status) => {
    return status.status === "warning" || status.status === "down";
  }).length;

  return {
    totalSites,
    activeSitesCount: activeSites.length,
    healthySitesCount: healthySites.length,
    degradedSitesCount: degradedSites.length,
    downSitesCount: downSites.length,
    alertSitesCount: alertSites.length,
    totalServicesCount: allSiteServices.length,
    healthyServicesCount,
    alertServicesCount,
    lastCheckedAt,
    sites: sortedSites,
    starredAlertSites: sortedSites.filter(
      (site) => site.isActive && site.isStarred && site.status !== "healthy",
    ),
    alertItems: sortedSites
      .filter((site) => site.isActive && site.status !== "healthy")
      .sort((left, right) => getStatusPriority(left.status) - getStatusPriority(right.status)),
    openIssues: openIssues.map((issue) => ({
      ...issue,
      siteName: issue.siteId ? issueSiteMap.get(issue.siteId)?.name ?? null : null,
      level: getIssueLevel(issue.severity),
    })),
  };
}
