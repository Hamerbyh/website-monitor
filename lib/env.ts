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
  });

  return cachedEnv;
}
