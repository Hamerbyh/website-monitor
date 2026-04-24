import "server-only";

import { getServerEnv } from "@/lib/env";

export function isAuthorizedMonitorCronRequest(request: Request) {
  const cronSecret = getServerEnv().MONITOR_CRON_SECRET;

  if (!cronSecret) {
    throw new Error("MONITOR_CRON_SECRET is required for monitor cron endpoints.");
  }

  const bearerToken = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  const headerSecret = request.headers.get("x-monitor-cron-secret");

  return bearerToken === cronSecret || headerSecret === cronSecret;
}
