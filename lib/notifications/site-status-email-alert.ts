import "server-only";

import { z } from "zod";

import alertsContent from "@/content/alerts.json";
import { getServerEnv, type AlertTriggerStatus } from "@/lib/env";
import type { SiteCheckResult } from "@/lib/monitor/site-check";

type MonitoredSite = {
  id: string;
  name: string;
  domain: string;
  checkUrl: string;
  isActive: boolean;
  status: AlertTriggerStatus;
};

const resendConfigSchema = z.object({
  apiKey: z.string().min(1, "RESEND_API_KEY is required when alert emails are enabled"),
  from: z.string().min(1, "ALERT_EMAIL_FROM is required when alert emails are enabled"),
  to: z.array(z.string().email()).min(1, "ALERT_EMAIL_TO must include at least one email"),
});

function formatStatus(status: AlertTriggerStatus) {
  return alertsContent.email.statusLabels[status];
}

function formatCheckedAt(date: Date) {
  return new Intl.DateTimeFormat("zh-CN", {
    dateStyle: "medium",
    timeStyle: "medium",
    timeZone: "Asia/Shanghai",
  }).format(date);
}

function parseRecipients(value: string | undefined) {
  return (
    value
      ?.split(",")
      .map((entry) => entry.trim())
      .filter(Boolean) ?? []
  );
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function createFieldRows(input: {
  site: MonitoredSite;
  previousStatus: AlertTriggerStatus;
  result: SiteCheckResult;
}) {
  const { fieldLabels, fallbacks, units } = alertsContent.email;

  return [
    [fieldLabels.siteName, input.site.name],
    [fieldLabels.domain, input.site.domain],
    [fieldLabels.checkUrl, input.site.checkUrl],
    [fieldLabels.previousStatus, formatStatus(input.previousStatus)],
    [fieldLabels.currentStatus, formatStatus(input.result.status)],
    [fieldLabels.checkedAt, formatCheckedAt(input.result.checkedAt)],
    [fieldLabels.statusCode, input.result.statusCode?.toString() ?? fallbacks.unknown],
    [fieldLabels.responseTime, `${input.result.responseTimeMs}${units.milliseconds}`],
    [fieldLabels.error, input.result.errorMessage ?? fallbacks.none],
  ] as const;
}

function createTextBody(rows: ReadonlyArray<readonly [string, string]>) {
  return [
    alertsContent.email.intro,
    "",
    ...rows.map(([label, value]) => `${label}: ${value}`),
    "",
    alertsContent.email.footnote,
  ].join("\n");
}

function createHtmlBody(rows: ReadonlyArray<readonly [string, string]>) {
  const rowMarkup = rows
    .map(
      ([label, value]) =>
        `<tr><td style="padding:8px 12px;border:1px solid #d9d9d9;font-weight:600;">${escapeHtml(label)}</td><td style="padding:8px 12px;border:1px solid #d9d9d9;">${escapeHtml(value)}</td></tr>`,
    )
    .join("");

  return `<div style="font-family:Arial,sans-serif;color:#111827;line-height:1.6;">
    <p>${alertsContent.email.intro}</p>
    <table style="border-collapse:collapse;border:1px solid #d9d9d9;">${rowMarkup}</table>
    <p style="margin-top:16px;color:#6b7280;">${alertsContent.email.footnote}</p>
  </div>`;
}

function shouldSendAlert(input: {
  site: MonitoredSite;
  previousStatus: AlertTriggerStatus;
  result: SiteCheckResult;
  triggerStatuses: AlertTriggerStatus[];
}) {
  if (!input.site.isActive) {
    return false;
  }

  if (input.previousStatus === input.result.status) {
    return false;
  }

  return input.triggerStatuses.includes(input.result.status);
}

export async function sendSiteStatusEmailAlert(input: {
  site: MonitoredSite;
  previousStatus: AlertTriggerStatus;
  result: SiteCheckResult;
}) {
  const env = getServerEnv();

  if (!env.ALERT_EMAIL_ENABLED) {
    return;
  }

  if (
    !shouldSendAlert({
      site: input.site,
      previousStatus: input.previousStatus,
      result: input.result,
      triggerStatuses: env.ALERT_EMAIL_TRIGGER_STATUSES,
    })
  ) {
    return;
  }

  const config = resendConfigSchema.parse({
    apiKey: env.RESEND_API_KEY,
    from: env.ALERT_EMAIL_FROM,
    to: parseRecipients(env.ALERT_EMAIL_TO),
  });

  const rows = createFieldRows(input);
  const subject = [
    alertsContent.email.subjectPrefix,
    input.site.name,
    alertsContent.email.subjectEntered,
    formatStatus(input.result.status),
  ].join(" ");

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: config.from,
      to: config.to,
      subject,
      text: createTextBody(rows),
      html: createHtmlBody(rows),
    }),
  });

  if (!response.ok) {
    const responseText = await response.text();
    throw new Error(
      `Resend email request failed with ${response.status}: ${responseText}`,
    );
  }
}
