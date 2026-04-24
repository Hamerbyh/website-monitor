import { NextResponse } from "next/server";

import { isAuthorizedMonitorCronRequest } from "@/lib/monitor/cron-auth";
import { runPolymarketDueChecks } from "@/lib/monitor/polymarket-monitor";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    if (!isAuthorizedMonitorCronRequest(request)) {
      return NextResponse.json(
        {
          ok: false,
          error: "Unauthorized",
        },
        { status: 401 },
      );
    }

    const polymarketData = await runPolymarketDueChecks();

    return NextResponse.json({
      ok: true,
      checkedAt: polymarketData.checkedAt,
      checkedCount: polymarketData.checkedCount,
      alertedCount: polymarketData.alertedCount,
      errorCount: polymarketData.errorCount,
      skippedReason: polymarketData.skippedReason,
      results: polymarketData.results,
      errors: polymarketData.errors,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown Polymarket monitor error";

    return NextResponse.json(
      {
        ok: false,
        error: message,
      },
      { status: 400 },
    );
  }
}
