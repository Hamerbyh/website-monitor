"use client";

import { useState } from "react";

import monitoringContent from "@/content/monitoring.json";
import {
  createSiteAction,
  deleteSiteAction,
  runAllChecksAction,
  runSiteCheckAction,
  toggleSiteStarAction,
} from "@/app/(app)/actions";

type CheckItem = {
  id: string;
  method: string;
  status: string;
  statusCode: number | null;
  responseTimeMs: number | null;
  errorMessage: string | null;
  checkedAt: Date;
  meta: unknown;
};

type SiteItem = {
  id: string;
  name: string;
  domain: string;
  checkUrl: string;
  checkIntervalMinutes: number;
  isStarred: boolean;
  notes: string | null;
  isActive: boolean;
  status: string;
  lastCheckedAt: Date | null;
  statusBadge: string;
  latestCheck: CheckItem | undefined;
  latestSslStatus:
    | {
        isValid: boolean;
        expiresAt: Date | null;
        daysRemaining: number | null;
        issuer: string | null;
        commonName: string | null;
        matchedDomain: boolean;
        checkedAt: Date;
      }
    | undefined;
  recentChecks: CheckItem[];
};

type SitesPageClientProps = {
  summary: {
    totalSites: number;
    activeSitesCount: number;
    alertSitesCount: number;
    lastCheckedAt: Date | null;
  };
  intervalOptions: Array<{
    value: number;
    label: string;
  }>;
  sites: SiteItem[];
  intervalLabelMap: Record<number, string>;
  sslExpiringSoonDays: number;
};

function formatDateTime(value: Date | null) {
  if (!value) {
    return monitoringContent.common.notCheckedYet;
  }

  return new Intl.DateTimeFormat("zh-CN", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(value);
}

function getResponseLabel(responseTimeMs: number | null) {
  if (responseTimeMs === null) {
    return monitoringContent.common.notCheckedYet;
  }

  return `${responseTimeMs}${monitoringContent.sitesPage.table.details.responseUnit}`;
}

function getFinalUrl(meta: unknown) {
  if (!meta || typeof meta !== "object") {
    return null;
  }

  const candidate = (meta as { finalUrl?: unknown }).finalUrl;
  return typeof candidate === "string" && candidate.length > 0 ? candidate : null;
}

function getRedirected(meta: unknown) {
  if (!meta || typeof meta !== "object") {
    return false;
  }

  return (meta as { redirected?: unknown }).redirected === true;
}

function formatSslDateTime(value: Date | null) {
  if (!value) {
    return monitoringContent.sitesPage.table.details.sslStates.notChecked;
  }

  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(value);
}

function getSslStatusLabel(site: SiteItem, sslExpiringSoonDays: number) {
  const sslStatus = site.latestSslStatus;

  if (!sslStatus) {
    return monitoringContent.sitesPage.table.details.sslStates.notChecked;
  }

  if (!sslStatus.matchedDomain) {
    return monitoringContent.sitesPage.table.details.sslStates.mismatch;
  }

  if (!sslStatus.isValid || (sslStatus.daysRemaining !== null && sslStatus.daysRemaining <= 0)) {
    return monitoringContent.sitesPage.table.details.sslStates.expired;
  }

  if (
    sslStatus.daysRemaining !== null &&
    sslStatus.daysRemaining <= sslExpiringSoonDays
  ) {
    return monitoringContent.sitesPage.table.details.sslStates.expiringSoon;
  }

  return monitoringContent.sitesPage.table.details.sslStates.healthy;
}

function getSslErrorLabel(site: SiteItem) {
  const sslStatus = site.latestSslStatus;

  if (!sslStatus) {
    return monitoringContent.sitesPage.table.details.sslStates.notChecked;
  }

  if (!sslStatus.matchedDomain) {
    return monitoringContent.sitesPage.table.details.sslStates.mismatch;
  }

  if (!sslStatus.isValid && sslStatus.expiresAt === null) {
    return monitoringContent.sitesPage.table.details.sslStates.error;
  }

  return monitoringContent.common.noError;
}

export function SitesPageClient({
  summary,
  intervalOptions,
  sites,
  intervalLabelMap,
  sslExpiringSoonDays,
}: SitesPageClientProps) {
  const content = monitoringContent.sitesPage;
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [expandedSiteId, setExpandedSiteId] = useState<string | null>(null);

  return (
    <section className="mx-auto flex w-full max-w-none flex-col gap-4">
      <article className="rounded-[28px] border border-(--line-soft) bg-(--panel) p-5 shadow-[0_22px_70px_rgba(9,12,10,0.1)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => setIsCreateOpen((value) => !value)}
              className="rounded-[18px] bg-(--accent) px-4 py-3 text-sm font-semibold text-(--accent-ink) transition hover:brightness-95"
            >
              {isCreateOpen ? content.actions.hideForm : content.actions.createSite}
            </button>

            <form action={runAllChecksAction}>
              <button
                type="submit"
                className="rounded-[18px] bg-(--ink) px-4 py-3 text-sm font-semibold text-(--paper) transition hover:opacity-92"
              >
                {content.actions.runAll}
              </button>
            </form>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <article className="rounded-[22px] border border-(--line-soft) bg-white/70 p-4">
            <p className="text-[10px] uppercase tracking-[0.26em] text-(--muted-dark)">
              {content.summary.totalSites}
            </p>
            <p className="mt-3 font-display text-4xl leading-none text-(--ink)">
              {summary.totalSites}
            </p>
          </article>

          <article className="rounded-[22px] border border-(--line-soft) bg-[rgba(31,143,85,0.08)] p-4">
            <p className="text-[10px] uppercase tracking-[0.26em] text-(--muted-dark)">
              {content.summary.activeSites}
            </p>
            <p className="mt-3 font-display text-4xl leading-none text-[#1c6b43]">
              {summary.activeSitesCount}
            </p>
          </article>

          <article className="rounded-[22px] border border-[#e0b4b1] bg-[rgba(195,48,48,0.08)] p-4">
            <p className="text-[10px] uppercase tracking-[0.26em] text-[#8a3a36]">
              {content.summary.alertSites}
            </p>
            <p className="mt-3 font-display text-4xl leading-none text-[#a32626]">
              {summary.alertSitesCount}
            </p>
          </article>

          <article className="rounded-[22px] border border-(--line-soft) bg-white/60 p-4">
            <p className="text-[10px] uppercase tracking-[0.26em] text-(--muted-dark)">
              {content.summary.lastCheck}
            </p>
            <p className="mt-3 text-lg font-semibold text-(--ink)">
              {formatDateTime(summary.lastCheckedAt)}
            </p>
          </article>
        </div>

        {isCreateOpen ? (
          <article className="mt-5 rounded-[24px] border border-(--line-soft) bg-white/60 p-5">
            <div>
              <p className="text-[11px] uppercase tracking-[0.3em] text-(--muted-dark)">
                {content.form.title}
              </p>
              <p className="mt-2 text-sm leading-6 text-(--text-subtle)">
                {content.form.description}
              </p>
            </div>

            <form action={createSiteAction} className="mt-5 grid gap-4 lg:grid-cols-2">
              <label className="grid gap-2">
                <span className="text-sm font-medium text-(--ink)">
                  {content.form.fields.name.label}
                </span>
                <input
                  name="name"
                  required
                  className="rounded-[16px] border border-(--line-soft) bg-white/80 px-4 py-3 outline-none transition focus:border-[rgba(223,139,73,0.5)]"
                  placeholder={content.form.fields.name.placeholder}
                />
              </label>

              <label className="grid gap-2">
                <span className="text-sm font-medium text-(--ink)">
                  {content.form.fields.domain.label}
                </span>
                <input
                  name="domain"
                  required
                  className="rounded-[16px] border border-(--line-soft) bg-white/80 px-4 py-3 outline-none transition focus:border-[rgba(223,139,73,0.5)]"
                  placeholder={content.form.fields.domain.placeholder}
                />
              </label>

              <label className="grid gap-2 lg:col-span-2">
                <span className="text-sm font-medium text-(--ink)">
                  {content.form.fields.checkUrl.label}
                </span>
                <input
                  name="checkUrl"
                  type="url"
                  required
                  className="rounded-[16px] border border-(--line-soft) bg-white/80 px-4 py-3 outline-none transition focus:border-[rgba(223,139,73,0.5)]"
                  placeholder={content.form.fields.checkUrl.placeholder}
                />
              </label>

              <label className="grid gap-2">
                <span className="text-sm font-medium text-(--ink)">
                  {content.form.fields.checkInterval.label}
                </span>
                <select
                  name="checkIntervalMinutes"
                  defaultValue={String(intervalOptions[1]?.value ?? 60)}
                  className="rounded-[16px] border border-(--line-soft) bg-white/80 px-4 py-3 outline-none transition focus:border-[rgba(223,139,73,0.5)]"
                >
                  {intervalOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="grid gap-2">
                <span className="text-sm font-medium text-(--ink)">
                  {content.form.fields.notes.label}
                </span>
                <input
                  name="notes"
                  className="rounded-[16px] border border-(--line-soft) bg-white/80 px-4 py-3 outline-none transition focus:border-[rgba(223,139,73,0.5)]"
                  placeholder={content.form.fields.notes.placeholder}
                />
              </label>

              <label className="flex items-center gap-3 rounded-[16px] border border-(--line-soft) bg-white/70 px-4 py-3 lg:col-span-2">
                <input
                  name="isActive"
                  type="checkbox"
                  defaultChecked
                  className="h-4 w-4 accent-[var(--accent)]"
                />
                <span className="text-sm text-(--ink)">
                  {content.form.fields.isActive.label}
                </span>
              </label>

              <label className="flex items-center gap-3 rounded-[16px] border border-(--line-soft) bg-white/70 px-4 py-3 lg:col-span-2">
                <input
                  name="isStarred"
                  type="checkbox"
                  className="h-4 w-4 accent-[var(--accent)]"
                />
                <span className="text-sm text-(--ink)">
                  {content.form.fields.isStarred.label}
                </span>
              </label>

              <div className="lg:col-span-2">
                <button
                  type="submit"
                  className="rounded-[18px] bg-(--accent) px-4 py-3 text-sm font-semibold text-(--accent-ink) transition hover:brightness-95"
                >
                  {content.actions.addSite}
                </button>
              </div>
            </form>
          </article>
        ) : null}
      </article>

      <article className="rounded-[28px] border border-(--line-soft) bg-(--panel) p-5 shadow-[0_22px_70px_rgba(9,12,10,0.1)]">
        <div>
          <p className="text-[11px] uppercase tracking-[0.3em] text-(--muted-dark)">
            {content.table.title}
          </p>
          <p className="mt-2 text-sm leading-6 text-(--text-subtle)">
            {content.table.description}
          </p>
        </div>

        {sites.length === 0 ? (
          <div className="mt-6 rounded-[22px] border border-dashed border-(--line-soft) bg-white/42 p-6">
            <h2 className="text-lg font-semibold text-(--ink)">{content.table.emptyTitle}</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-(--text-subtle)">
              {content.table.emptyDescription}
            </p>
          </div>
        ) : (
          <div className="mt-6 grid gap-3">
            {sites.map((site) => {
              const isExpanded = expandedSiteId === site.id;
              const latestCheck = site.latestCheck ?? site.recentChecks[0];

              return (
                <article
                  key={site.id}
                  className={`overflow-hidden rounded-[24px] border transition ${
                    site.status === "healthy"
                      ? "border-(--line-soft) bg-[rgba(255,255,255,0.74)]"
                      : site.status === "down"
                        ? "border-[#c96a6a] bg-[linear-gradient(135deg,rgba(195,48,48,0.22),rgba(255,235,235,0.96))]"
                        : "border-[#d9a2a2] bg-[linear-gradient(135deg,rgba(195,48,48,0.14),rgba(255,245,245,0.9))]"
                  }`}
                >
                  <div className="grid gap-4 p-4 lg:grid-cols-[minmax(0,1.25fr)_repeat(5,minmax(0,0.7fr))_auto_auto_auto] lg:items-center">
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedSiteId((current) => (current === site.id ? null : site.id))
                      }
                      className="grid min-w-0 gap-4 text-left lg:col-span-6 lg:grid-cols-[minmax(0,1.25fr)_repeat(5,minmax(0,0.7fr))] lg:items-center"
                      aria-expanded={isExpanded}
                      aria-label={
                        isExpanded ? content.actions.collapseRow : content.actions.expandRow
                      }
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-3">
                          <span className={`status-dot status-${site.status}`} aria-hidden="true" />
                          <div className="min-w-0">
                            <h2 className="truncate text-lg font-semibold text-(--ink)">
                              {site.name}
                            </h2>
                            <div className="mt-1 flex flex-wrap items-center gap-2">
                              <p className="truncate text-sm text-(--text-subtle)">
                                {site.domain}
                              </p>
                              {site.isStarred ? (
                                <span className="rounded-full bg-[rgba(223,139,73,0.16)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-(--accent-ink)">
                                  {content.star.starred}
                                </span>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div>
                        <p className="table-label">{content.table.columns.status}</p>
                        <p className="mt-2 text-sm font-semibold text-(--ink)">{site.statusBadge}</p>
                      </div>

                      <div>
                        <p className="table-label">{content.table.columns.interval}</p>
                        <p className="mt-2 text-sm font-semibold text-(--ink)">
                          {intervalLabelMap[site.checkIntervalMinutes] ??
                            `${site.checkIntervalMinutes} 分钟`}
                        </p>
                      </div>

                      <div>
                        <p className="table-label">{content.table.columns.responseTime}</p>
                        <p className="mt-2 text-sm font-semibold text-(--ink)">
                          {getResponseLabel(latestCheck?.responseTimeMs ?? null)}
                        </p>
                      </div>

                      <div>
                        <p className="table-label">{content.table.columns.lastCheckedAt}</p>
                        <p className="mt-2 text-sm font-semibold text-(--ink)">
                          {formatDateTime(latestCheck?.checkedAt ?? site.lastCheckedAt)}
                        </p>
                      </div>

                      <div>
                        <p className="table-label">{content.table.columns.ssl}</p>
                        <p className="mt-2 text-sm font-semibold text-(--ink)">
                          {getSslStatusLabel(site, sslExpiringSoonDays)}
                        </p>
                      </div>

                    </button>

                    <form action={runSiteCheckAction} className="lg:justify-self-end">
                      <input type="hidden" name="siteId" value={site.id} />
                      <button
                        type="submit"
                        className="rounded-full border border-(--line-soft) bg-white/90 px-4 py-2 text-sm font-medium text-(--ink) transition hover:bg-white"
                      >
                        {content.actions.runNow}
                      </button>
                    </form>

                    <form action={toggleSiteStarAction} className="lg:justify-self-end">
                      <input type="hidden" name="siteId" value={site.id} />
                      <input
                        type="hidden"
                        name="nextValue"
                        value={site.isStarred ? "false" : "true"}
                      />
                      <button
                        type="submit"
                        className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                          site.isStarred
                            ? "border-[rgba(223,139,73,0.42)] bg-[rgba(223,139,73,0.12)] text-(--accent-ink) hover:bg-[rgba(223,139,73,0.18)]"
                            : "border-(--line-soft) bg-white/90 text-(--ink) hover:bg-white"
                        }`}
                      >
                        {site.isStarred
                          ? monitoringContent.siteActions.unstar
                          : monitoringContent.siteActions.star}
                      </button>
                    </form>

                    <form
                      action={deleteSiteAction}
                      className="lg:justify-self-end"
                      onSubmit={(event) => {
                        if (!window.confirm(content.confirmations.deleteSite)) {
                          event.preventDefault();
                        }
                      }}
                    >
                      <input type="hidden" name="siteId" value={site.id} />
                      <button
                        type="submit"
                        className="rounded-full border border-[#d7a5a5] bg-[rgba(195,48,48,0.08)] px-4 py-2 text-sm font-medium text-[#8a2f2f] transition hover:bg-[rgba(195,48,48,0.14)]"
                      >
                        {content.actions.deleteSite}
                      </button>
                    </form>
                  </div>

                  {isExpanded ? (
                    <div className="border-t border-(--line-soft) bg-[rgba(246,239,229,0.7)] p-4">
                      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
                        <div className="grid gap-4">
                          <section className="rounded-[20px] border border-(--line-soft) bg-white/72 p-4">
                            <div className="flex items-center justify-between gap-3">
                              <div>
                                <p className="text-[10px] uppercase tracking-[0.24em] text-(--muted-dark)">
                                  {content.table.details.title}
                                </p>
                                <p className="mt-2 text-base font-semibold text-(--ink)">
                                  {content.table.details.latest}
                                </p>
                              </div>

                              <form action={runSiteCheckAction}>
                                <input type="hidden" name="siteId" value={site.id} />
                                <button
                                  type="submit"
                                  className="rounded-full border border-(--line-soft) bg-white/90 px-4 py-2 text-sm font-medium text-(--ink) transition hover:bg-white"
                                >
                                  {content.actions.runNow}
                                </button>
                              </form>
                            </div>

                            <div className="mt-4 grid gap-3 md:grid-cols-2">
                              <div>
                                <p className="table-label">{content.table.columns.checkUrl}</p>
                                <p className="mt-2 break-all text-sm text-(--ink)">{site.checkUrl}</p>
                              </div>
                              <div>
                                <p className="table-label">{content.table.details.active}</p>
                                <p className="mt-2 text-sm font-semibold text-(--ink)">
                                  {site.isActive
                                    ? content.table.details.activeValue
                                    : content.table.details.inactiveValue}
                                </p>
                              </div>
                              <div>
                                <p className="table-label">{content.table.details.statusCode}</p>
                                <p className="mt-2 text-sm font-semibold text-(--ink)">
                                  {latestCheck
                                    ? (latestCheck.statusCode ??
                                        monitoringContent.common.noStatusCode)
                                    : monitoringContent.common.notCheckedYet}
                                </p>
                              </div>
                              <div>
                                <p className="table-label">{content.table.details.method}</p>
                                <p className="mt-2 text-sm font-semibold uppercase text-(--ink)">
                                  {latestCheck?.method ?? monitoringContent.common.notCheckedYet}
                                </p>
                              </div>
                              <div>
                                <p className="table-label">{content.table.details.redirected}</p>
                                <p className="mt-2 text-sm font-semibold text-(--ink)">
                                  {getRedirected(latestCheck?.meta)
                                    ? content.table.details.yes
                                    : content.table.details.no}
                                </p>
                              </div>
                              <div>
                                <p className="table-label">{content.table.details.finalUrl}</p>
                                <p className="mt-2 break-all text-sm text-(--ink)">
                                  {latestCheck
                                    ? (getFinalUrl(latestCheck?.meta) ??
                                        monitoringContent.common.noFinalUrl)
                                    : monitoringContent.common.notCheckedYet}
                                </p>
                              </div>
                              <div className="md:col-span-2">
                                <p className="table-label">{content.table.details.error}</p>
                                <p className="mt-2 text-sm text-(--ink)">
                                  {latestCheck
                                    ? (latestCheck.errorMessage ?? monitoringContent.common.noError)
                                    : monitoringContent.common.notCheckedYet}
                                </p>
                              </div>
                              <div className="md:col-span-2">
                                <p className="table-label">{content.table.details.notes}</p>
                                <p className="mt-2 text-sm text-(--ink)">
                                  {site.notes || monitoringContent.common.noNotes}
                                </p>
                              </div>
                            </div>
                          </section>

                          <section className="rounded-[20px] border border-(--line-soft) bg-white/72 p-4">
                            <p className="text-[10px] uppercase tracking-[0.24em] text-(--muted-dark)">
                              {content.table.details.sslTitle}
                            </p>

                            <div className="mt-4 grid gap-3 md:grid-cols-2">
                              <div>
                                <p className="table-label">{content.table.columns.ssl}</p>
                                <p className="mt-2 text-sm font-semibold text-(--ink)">
                                  {getSslStatusLabel(site, sslExpiringSoonDays)}
                                </p>
                              </div>
                              <div>
                                <p className="table-label">{content.table.details.sslCheckedAt}</p>
                                <p className="mt-2 text-sm font-semibold text-(--ink)">
                                  {formatSslDateTime(site.latestSslStatus?.checkedAt ?? null)}
                                </p>
                              </div>
                              <div>
                                <p className="table-label">{content.table.details.sslExpiresAt}</p>
                                <p className="mt-2 text-sm font-semibold text-(--ink)">
                                  {formatSslDateTime(site.latestSslStatus?.expiresAt ?? null)}
                                </p>
                              </div>
                              <div>
                                <p className="table-label">{content.table.details.sslDaysRemaining}</p>
                                <p className="mt-2 text-sm font-semibold text-(--ink)">
                                  {site.latestSslStatus?.daysRemaining ??
                                    monitoringContent.sitesPage.table.details.sslStates.notChecked}
                                </p>
                              </div>
                              <div>
                                <p className="table-label">{content.table.details.sslIssuer}</p>
                                <p className="mt-2 text-sm text-(--ink)">
                                  {site.latestSslStatus?.issuer ?? monitoringContent.common.noStatusCode}
                                </p>
                              </div>
                              <div>
                                <p className="table-label">{content.table.details.sslCommonName}</p>
                                <p className="mt-2 text-sm text-(--ink)">
                                  {site.latestSslStatus?.commonName ??
                                    monitoringContent.common.noStatusCode}
                                </p>
                              </div>
                              <div>
                                <p className="table-label">{content.table.details.sslDomainMatch}</p>
                                <p className="mt-2 text-sm font-semibold text-(--ink)">
                                  {site.latestSslStatus
                                    ? site.latestSslStatus.matchedDomain
                                      ? content.table.details.yes
                                      : content.table.details.no
                                    : monitoringContent.sitesPage.table.details.sslStates.notChecked}
                                </p>
                              </div>
                              <div>
                                <p className="table-label">{content.table.details.sslError}</p>
                                <p className="mt-2 text-sm text-(--ink)">
                                  {getSslErrorLabel(site)}
                                </p>
                              </div>
                            </div>
                          </section>

                          <section className="rounded-[20px] border border-(--line-soft) bg-white/72 p-4">
                            <p className="text-[10px] uppercase tracking-[0.24em] text-(--muted-dark)">
                              {content.table.details.historyTitle}
                            </p>

                            {site.recentChecks.length === 0 ? (
                              <p className="mt-4 text-sm text-(--text-subtle)">
                                {content.table.details.noHistory}
                              </p>
                            ) : (
                              <div className="mt-4 grid gap-2">
                                {site.recentChecks.map((check) => (
                                  <div
                                    key={check.id}
                                    className="grid gap-3 rounded-[16px] border border-(--line-soft) bg-white/78 px-4 py-3 md:grid-cols-[1fr_auto_auto_auto]"
                                  >
                                    <p className="text-sm font-medium text-(--ink)">
                                      {formatDateTime(check.checkedAt)}
                                    </p>
                                    <p className="text-sm text-(--text-subtle) uppercase">
                                      {check.method}
                                    </p>
                                    <p className="text-sm text-(--text-subtle)">
                                      {check.statusCode ?? "-"}
                                    </p>
                                    <p className="text-sm font-semibold text-(--ink)">
                                      {getResponseLabel(check.responseTimeMs)}
                                    </p>
                                  </div>
                                ))}
                              </div>
                            )}
                          </section>
                        </div>

                        <aside className="rounded-[20px] border border-(--line-soft) bg-[rgba(24,22,16,0.95)] p-4 text-(--paper)">
                          <p className="text-[10px] uppercase tracking-[0.24em] text-white/45">
                            {content.table.columns.site}
                          </p>
                          <h3 className="mt-2 text-2xl font-display">{site.name}</h3>
                          <div className="mt-4 grid gap-3 text-sm text-white/74">
                            <p>{site.domain}</p>
                            <p>{site.checkUrl}</p>
                            <p>
                              {content.table.columns.interval}{" "}
                              {intervalLabelMap[site.checkIntervalMinutes] ??
                                `${site.checkIntervalMinutes} 分钟`}
                            </p>
                            <p>
                              {site.isStarred
                                ? content.star.starred
                                : content.star.notStarred}
                            </p>
                            <p>
                              {content.table.columns.lastCheckedAt}{" "}
                              {formatDateTime(latestCheck?.checkedAt ?? site.lastCheckedAt)}
                            </p>
                          </div>
                        </aside>
                      </div>
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>
        )}
      </article>
    </section>
  );
}
