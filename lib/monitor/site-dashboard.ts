import "server-only";

import uiContent from "@/content/ui.json";
import { db } from "@/lib/db";

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

  const latestChecks = await Promise.all(
    sites.map(async (site) => {
      const latestCheck = await db.query.siteChecks.findFirst({
        where: (table, { eq }) => eq(table.siteId, site.id),
        orderBy: (table, { desc: descOrder }) => [descOrder(table.checkedAt)],
      });

      const recentChecks = await db.query.siteChecks.findMany({
        where: (table, { eq }) => eq(table.siteId, site.id),
        orderBy: (table, { desc: descOrder }) => [descOrder(table.checkedAt)],
        limit: 8,
      });

      return {
        ...site,
        latestCheck,
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

  return {
    totalSites,
    activeSitesCount: activeSites.length,
    healthySitesCount: healthySites.length,
    degradedSitesCount: degradedSites.length,
    downSitesCount: downSites.length,
    alertSitesCount: alertSites.length,
    lastCheckedAt,
    sites: sortedSites,
    starredAlertSites: sortedSites.filter(
      (site) => site.isActive && site.isStarred && site.status !== "healthy",
    ),
    alertItems: sortedSites
      .filter((site) => site.isActive && site.status !== "healthy")
      .sort((left, right) => getStatusPriority(left.status) - getStatusPriority(right.status)),
  };
}
