import { NextResponse } from "next/server";
import { z } from "zod";

import { getServerEnv } from "@/lib/env";
import { runChecksForDueSites } from "@/lib/monitor/site-check-store";
import { runSearchConsoleSyncForDueSites } from "@/lib/monitor/site-search-console";
import { runChecksForDueServices } from "@/lib/monitor/site-service-check-store";

export const runtime = "nodejs";

const requestSchema = z.object({
  timeoutMs: z.number().int().positive().max(30_000).optional(),
});

function isAuthorized(request: Request) {
  const cronSecret = getServerEnv().MONITOR_CRON_SECRET;

  if (!cronSecret) {
    throw new Error("MONITOR_CRON_SECRET is required for /api/monitor/check-due.");
  }

  const bearerToken = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  const headerSecret = request.headers.get("x-monitor-cron-secret");

  return bearerToken === cronSecret || headerSecret === cronSecret;
}

export async function POST(request: Request) {
  try {
    if (!isAuthorized(request)) {
      return NextResponse.json(
        {
          ok: false,
          error: "Unauthorized",
        },
        { status: 401 },
      );
    }

    const body = await request.json().catch(() => ({}));
    const payload = requestSchema.parse(body);

    const [siteData, serviceData, searchConsoleData] = await Promise.all([
      runChecksForDueSites({
        timeoutMs: payload.timeoutMs,
      }),
      runChecksForDueServices({
        timeoutMs: payload.timeoutMs,
      }),
      runSearchConsoleSyncForDueSites(),
    ]);

    return NextResponse.json({
      ok: true,
      checkedAt: siteData.checkedAt,
      checkedCount: siteData.checkedCount,
      sslCheckedCount: siteData.sslCheckedCount,
      domainCheckedCount: siteData.domainCheckedCount,
      skippedCount: siteData.skippedCount,
      serviceCheckedCount: serviceData.checkedCount,
      serviceSkippedCount: serviceData.skippedCount,
      searchConsoleCheckedCount: searchConsoleData.checkedCount,
      searchConsoleSkippedCount: searchConsoleData.skippedCount,
      searchConsoleSkippedReason: searchConsoleData.skippedReason,
      siteResults: siteData.results,
      serviceResults: serviceData.results,
      searchConsoleResults: searchConsoleData.results,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown due check batch error";

    return NextResponse.json(
      {
        ok: false,
        error: message,
      },
      { status: 400 },
    );
  }
}
