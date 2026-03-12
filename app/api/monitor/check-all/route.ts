import { NextResponse } from "next/server";
import { z } from "zod";

import { runChecksForActiveSites } from "@/lib/monitor/site-check-store";

export const runtime = "nodejs";

const requestSchema = z.object({
  timeoutMs: z.number().int().positive().max(30_000).optional(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const payload = requestSchema.parse(body);

    const results = await runChecksForActiveSites({
      timeoutMs: payload.timeoutMs,
    });

    return NextResponse.json({
      ok: true,
      checkedCount: results.length,
      results,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown batch check error";

    return NextResponse.json(
      {
        ok: false,
        error: message,
      },
      { status: 400 },
    );
  }
}
