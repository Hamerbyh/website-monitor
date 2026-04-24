import "server-only";

import { z } from "zod";

const siteStatusValues = ["healthy", "degraded", "warning", "down"] as const;

function parseBooleanEnv(value: string | undefined, defaultValue: boolean) {
  if (value === undefined) {
    return defaultValue;
  }

  return value === "true";
}

function parseAlertTriggerStatuses(value: string | undefined) {
  const rawValues =
    value
      ?.split(",")
      .map((entry) => entry.trim().toLowerCase())
      .filter(Boolean) ?? ["down"];

  return z.array(z.enum(siteStatusValues)).parse(rawValues);
}

function parseJsonEnv(value: string | undefined, defaultValue: unknown) {
  if (value === undefined || value.trim() === "") {
    return defaultValue;
  }

  return JSON.parse(value);
}

function parsePositiveIntegerEnv(
  value: string | undefined,
  defaultValue: number,
  envName: string,
) {
  if (value === undefined) {
    return defaultValue;
  }

  const parsed = Number.parseInt(value, 10);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${envName} must be a positive integer`);
  }

  return parsed;
}

const serverEnvSchema = z.object({
  DATABASE_URL: z
    .string()
    .min(1, "DATABASE_URL is required")
    .refine(
      (value) =>
        value.startsWith("postgres://") || value.startsWith("postgresql://"),
      "DATABASE_URL must be a PostgreSQL connection string",
    ),
  BETTER_AUTH_SECRET: z.string().min(1, "BETTER_AUTH_SECRET is required"),
  BETTER_AUTH_URL: z.string().url("BETTER_AUTH_URL must be a valid URL"),
  MONITOR_CRON_SECRET: z.string().min(1).optional(),
  RESEND_API_KEY: z.string().min(1).optional(),
  ALERT_EMAIL_ENABLED: z.boolean(),
  ALERT_EMAIL_FROM: z.string().min(1).optional(),
  ALERT_EMAIL_TO: z.string().min(1).optional(),
  ALERT_EMAIL_TRIGGER_STATUSES: z.array(z.enum(siteStatusValues)),
  TELEGRAM_ALERT_ENABLED: z.boolean(),
  TELEGRAM_BOT_TOKEN: z.string().min(1).optional(),
  TELEGRAM_CHAT_ID: z.string().min(1).optional(),
  POLYMARKET_MONITOR_ENABLED: z.boolean(),
  POLYMARKET_MONITOR_TARGETS: z.unknown(),
  POLYMARKET_MONITOR_LOOKBACK_MINUTES: z.number().int().positive(),
  POLYMARKET_MONITOR_THRESHOLD_BPS: z.number().int().positive(),
  SSL_CHECK_INTERVAL_MINUTES: z.number().int().positive(),
  SSL_EXPIRING_SOON_DAYS: z.number().int().positive(),
  SSL_EXPIRING_CRITICAL_DAYS: z.number().int().positive(),
  DOMAIN_CHECK_INTERVAL_MINUTES: z.number().int().positive(),
  DOMAIN_EXPIRING_SOON_DAYS: z.number().int().positive(),
  DOMAIN_EXPIRING_CRITICAL_DAYS: z.number().int().positive(),
  GOOGLE_SEARCH_CONSOLE_CLIENT_ID: z.string().min(1).optional(),
  GOOGLE_SEARCH_CONSOLE_CLIENT_SECRET: z.string().min(1).optional(),
  GOOGLE_SEARCH_CONSOLE_REFRESH_TOKEN: z.string().min(1).optional(),
  SEARCH_CONSOLE_SYNC_LOOKBACK_DAYS: z.number().int().positive(),
  SEARCH_CLICKS_DROP_THRESHOLD_PERCENT: z.number().int().positive(),
  SEARCH_IMPRESSIONS_DROP_THRESHOLD_PERCENT: z.number().int().positive(),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;
export type AlertTriggerStatus = (typeof siteStatusValues)[number];

let cachedEnv: ServerEnv | null = null;

export function getServerEnv(): ServerEnv {
  if (cachedEnv) {
    return cachedEnv;
  }

  cachedEnv = serverEnvSchema.parse({
    DATABASE_URL: process.env.DATABASE_URL,
    BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET,
    BETTER_AUTH_URL: process.env.BETTER_AUTH_URL,
    MONITOR_CRON_SECRET: process.env.MONITOR_CRON_SECRET,
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    ALERT_EMAIL_ENABLED: parseBooleanEnv(process.env.ALERT_EMAIL_ENABLED, false),
    ALERT_EMAIL_FROM: process.env.ALERT_EMAIL_FROM,
    ALERT_EMAIL_TO: process.env.ALERT_EMAIL_TO,
    ALERT_EMAIL_TRIGGER_STATUSES: parseAlertTriggerStatuses(
      process.env.ALERT_EMAIL_TRIGGER_STATUSES,
    ),
    TELEGRAM_ALERT_ENABLED: parseBooleanEnv(
      process.env.TELEGRAM_ALERT_ENABLED,
      false,
    ),
    TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN,
    TELEGRAM_CHAT_ID: process.env.TELEGRAM_CHAT_ID,
    POLYMARKET_MONITOR_ENABLED: parseBooleanEnv(
      process.env.POLYMARKET_MONITOR_ENABLED,
      false,
    ),
    POLYMARKET_MONITOR_TARGETS: parseJsonEnv(
      process.env.POLYMARKET_MONITOR_TARGETS,
      [],
    ),
    POLYMARKET_MONITOR_LOOKBACK_MINUTES: parsePositiveIntegerEnv(
      process.env.POLYMARKET_MONITOR_LOOKBACK_MINUTES,
      60,
      "POLYMARKET_MONITOR_LOOKBACK_MINUTES",
    ),
    POLYMARKET_MONITOR_THRESHOLD_BPS: parsePositiveIntegerEnv(
      process.env.POLYMARKET_MONITOR_THRESHOLD_BPS,
      500,
      "POLYMARKET_MONITOR_THRESHOLD_BPS",
    ),
    SSL_CHECK_INTERVAL_MINUTES: parsePositiveIntegerEnv(
      process.env.SSL_CHECK_INTERVAL_MINUTES,
      360,
      "SSL_CHECK_INTERVAL_MINUTES",
    ),
    SSL_EXPIRING_SOON_DAYS: parsePositiveIntegerEnv(
      process.env.SSL_EXPIRING_SOON_DAYS,
      14,
      "SSL_EXPIRING_SOON_DAYS",
    ),
    SSL_EXPIRING_CRITICAL_DAYS: parsePositiveIntegerEnv(
      process.env.SSL_EXPIRING_CRITICAL_DAYS,
      3,
      "SSL_EXPIRING_CRITICAL_DAYS",
    ),
    DOMAIN_CHECK_INTERVAL_MINUTES: parsePositiveIntegerEnv(
      process.env.DOMAIN_CHECK_INTERVAL_MINUTES,
      1440,
      "DOMAIN_CHECK_INTERVAL_MINUTES",
    ),
    DOMAIN_EXPIRING_SOON_DAYS: parsePositiveIntegerEnv(
      process.env.DOMAIN_EXPIRING_SOON_DAYS,
      30,
      "DOMAIN_EXPIRING_SOON_DAYS",
    ),
    DOMAIN_EXPIRING_CRITICAL_DAYS: parsePositiveIntegerEnv(
      process.env.DOMAIN_EXPIRING_CRITICAL_DAYS,
      7,
      "DOMAIN_EXPIRING_CRITICAL_DAYS",
    ),
    GOOGLE_SEARCH_CONSOLE_CLIENT_ID: process.env.GOOGLE_SEARCH_CONSOLE_CLIENT_ID,
    GOOGLE_SEARCH_CONSOLE_CLIENT_SECRET: process.env.GOOGLE_SEARCH_CONSOLE_CLIENT_SECRET,
    GOOGLE_SEARCH_CONSOLE_REFRESH_TOKEN: process.env.GOOGLE_SEARCH_CONSOLE_REFRESH_TOKEN,
    SEARCH_CONSOLE_SYNC_LOOKBACK_DAYS: parsePositiveIntegerEnv(
      process.env.SEARCH_CONSOLE_SYNC_LOOKBACK_DAYS,
      60,
      "SEARCH_CONSOLE_SYNC_LOOKBACK_DAYS",
    ),
    SEARCH_CLICKS_DROP_THRESHOLD_PERCENT: parsePositiveIntegerEnv(
      process.env.SEARCH_CLICKS_DROP_THRESHOLD_PERCENT,
      30,
      "SEARCH_CLICKS_DROP_THRESHOLD_PERCENT",
    ),
    SEARCH_IMPRESSIONS_DROP_THRESHOLD_PERCENT: parsePositiveIntegerEnv(
      process.env.SEARCH_IMPRESSIONS_DROP_THRESHOLD_PERCENT,
      30,
      "SEARCH_IMPRESSIONS_DROP_THRESHOLD_PERCENT",
    ),
  });

  return cachedEnv;
}

export function hasSearchConsoleCredentials() {
  const env = getServerEnv();

  return Boolean(
    env.GOOGLE_SEARCH_CONSOLE_CLIENT_ID &&
      env.GOOGLE_SEARCH_CONSOLE_CLIENT_SECRET &&
      env.GOOGLE_SEARCH_CONSOLE_REFRESH_TOKEN,
  );
}
