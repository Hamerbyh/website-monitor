import { NextResponse } from "next/server";
import { z } from "zod";

import { runSiteCheckForSite } from "@/lib/monitor/site-check-store";
import { performSiteCheck } from "@/lib/monitor/site-check";

export const runtime = "nodejs";

const requestSchema = z
  .object({
    siteId: z.string().uuid().optional(),
    url: z.string().url().optional(),
    timeoutMs: z.number().int().positive().max(30_000).optional(),
  })
  .refine((value) => value.siteId || value.url, {
    message: "Either siteId or url is required.",
    path: ["siteId"],
  });

export async function POST(request: Request) {
  try {
    const payload = requestSchema.parse(await request.json());

    if (payload.siteId) {
      const data = await runSiteCheckForSite({
        siteId: payload.siteId,
        timeoutMs: payload.timeoutMs,
      });

      return NextResponse.json({
        ok: true,
        mode: "site",
        site: data.site,
        result: data.result,
        sslResult: data.sslResult,
      });
    }

    const result = await performSiteCheck({
      url: payload.url!,
      timeoutMs: payload.timeoutMs,
    });

    return NextResponse.json({
      ok: true,
      mode: "adhoc",
      result,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown check error";

    return NextResponse.json(
      {
        ok: false,
        error: message,
      },
      { status: 400 },
    );
  }
}
