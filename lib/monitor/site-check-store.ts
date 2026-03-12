import "server-only";

import { eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { siteChecks, sites } from "@/lib/db/schema";
import { performSiteCheck, type SiteCheckResult } from "@/lib/monitor/site-check";

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

  const result = await performSiteCheck({
    url: site.checkUrl,
    timeoutMs: input.timeoutMs,
  });

  await persistSiteCheck(site.id, result);

  return {
    site,
    result,
  };
}

export async function runChecksForActiveSites(input?: { timeoutMs?: number }) {
  const activeSites = await db.query.sites.findMany({
    where: eq(sites.isActive, true),
    orderBy: (table, { asc }) => [asc(table.createdAt)],
  });

  const results = [];

  for (const site of activeSites) {
    const result = await performSiteCheck({
      url: site.checkUrl,
      timeoutMs: input?.timeoutMs,
    });

    await persistSiteCheck(site.id, result);

    results.push({
      site,
      result,
    });
  }

  return results;
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
