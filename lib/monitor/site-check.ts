import "server-only";

export const DEFAULT_CHECK_TIMEOUT_MS = 10_000;
const HEALTHY_RESPONSE_TIME_MS = 2_000;
const DEFAULT_USER_AGENT =
  "WebMonitor/0.1 (+https://webmonitor.local; server-side availability check)";

type CheckMethod = "get";
type CheckStatus = "healthy" | "degraded" | "down";

type AttemptResult = {
  method: CheckMethod;
  ok: boolean;
  statusCode: number | null;
  responseTimeMs: number;
  finalUrl: string | null;
  redirected: boolean;
  errorMessage: string | null;
};

export type SiteCheckResult = {
  url: string;
  method: CheckMethod;
  status: CheckStatus;
  statusCode: number | null;
  responseTimeMs: number;
  checkedAt: Date;
  finalUrl: string | null;
  redirected: boolean;
  errorMessage: string | null;
  attempts: AttemptResult[];
};

function createTimeoutSignal(timeoutMs: number) {
  if (typeof AbortSignal.timeout === "function") {
    return AbortSignal.timeout(timeoutMs);
  }

  const controller = new AbortController();
  setTimeout(() => controller.abort(), timeoutMs);
  return controller.signal;
}

async function executeAttempt(
  url: string,
  method: CheckMethod,
  timeoutMs: number,
): Promise<AttemptResult> {
  const startedAt = Date.now();

  try {
    const response = await fetch(url, {
      method: method.toUpperCase(),
      headers: {
        "user-agent": DEFAULT_USER_AGENT,
        ...(method === "get" ? { range: "bytes=0-0" } : {}),
      },
      redirect: "follow",
      cache: "no-store",
      signal: createTimeoutSignal(timeoutMs),
    });

    const responseTimeMs = Date.now() - startedAt;

    try {
      await response.body?.cancel();
    } catch {
      // Ignore body cancellation failures. We only need headers for uptime checks.
    }

    return {
      method,
      ok: response.ok,
      statusCode: response.status,
      responseTimeMs,
      finalUrl: response.url || url,
      redirected: response.redirected,
      errorMessage: response.ok ? null : `HTTP ${response.status}`,
    };
  } catch (error) {
    const responseTimeMs = Date.now() - startedAt;

    return {
      method,
      ok: false,
      statusCode: null,
      responseTimeMs,
      finalUrl: null,
      redirected: false,
      errorMessage: error instanceof Error ? error.message : "Unknown fetch error",
    };
  }
}

function deriveStatus(attempt: AttemptResult): CheckStatus {
  if (!attempt.ok || attempt.statusCode === null) {
    return "down";
  }

  if (attempt.responseTimeMs > HEALTHY_RESPONSE_TIME_MS) {
    return "degraded";
  }

  return "healthy";
}

export async function performSiteCheck(input: {
  url: string;
  timeoutMs?: number;
}): Promise<SiteCheckResult> {
  const timeoutMs = input.timeoutMs ?? DEFAULT_CHECK_TIMEOUT_MS;
  const checkedAt = new Date();
  const finalAttempt = await executeAttempt(input.url, "get", timeoutMs);
  const attempts: AttemptResult[] = [finalAttempt];

  return {
    url: input.url,
    method: finalAttempt.method,
    status: deriveStatus(finalAttempt),
    statusCode: finalAttempt.statusCode,
    responseTimeMs: finalAttempt.responseTimeMs,
    checkedAt,
    finalUrl: finalAttempt.finalUrl,
    redirected: finalAttempt.redirected,
    errorMessage: finalAttempt.errorMessage,
    attempts,
  };
}
