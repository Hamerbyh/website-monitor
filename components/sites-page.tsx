"use client";

import Link from "next/link";
import { useState } from "react";

import monitoringContent from "@/content/monitoring.json";
import {
  createSiteAction,
  deleteSiteAction,
  runAllChecksAction,
  runSiteCheckAction,
  toggleSiteStarAction,
} from "@/app/(app)/actions";
import { getIntervalLabel } from "@/lib/monitor/site-config";

type CheckItem = {
  responseTimeMs: number | null;
  checkedAt: Date;
};

type SiteItem = {
  id: string;
  name: string;
  siteType: string;
  businessModel: string;
  domain: string;
  checkIntervalMinutes: number;
  isStarred: boolean;
  isActive: boolean;
  status: string;
  statusBadge: string;
  lastCheckedAt: Date | null;
  latestCheck: CheckItem | undefined;
  latestSslStatus:
    | {
        daysRemaining: number | null;
        matchedDomain: boolean;
        isValid: boolean;
      }
    | undefined;
  services: Array<unknown>;
  serviceSummary?: {
    total: number;
    alerts: number;
  };
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
  siteTypeOptions: string[];
  businessModelOptions: string[];
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

function getSiteTypeLabel(value: string) {
  return (
    monitoringContent.sitesPage.taxonomy.siteTypes[
      value as keyof typeof monitoringContent.sitesPage.taxonomy.siteTypes
    ] ?? value
  );
}

function getBusinessModelLabel(value: string) {
  return (
    monitoringContent.sitesPage.taxonomy.businessModels[
      value as keyof typeof monitoringContent.sitesPage.taxonomy.businessModels
    ] ?? value
  );
}

function getSslStatusLabel(
  site: Pick<SitesPageClientProps["sites"][number], "latestSslStatus">,
  sslExpiringSoonDays: number,
) {
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

export function SitesPageClient({
  summary,
  intervalOptions,
  siteTypeOptions,
  businessModelOptions,
  sites,
  intervalLabelMap,
  sslExpiringSoonDays,
}: SitesPageClientProps) {
  const content = monitoringContent.sitesPage;
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [siteTypeFilter, setSiteTypeFilter] = useState<string>("all");
  const [businessModelFilter, setBusinessModelFilter] = useState<string>("all");

  const filteredSites = sites.filter((site) => {
    const matchesSiteType = siteTypeFilter === "all" || site.siteType === siteTypeFilter;
    const matchesBusinessModel =
      businessModelFilter === "all" || site.businessModel === businessModelFilter;

    return matchesSiteType && matchesBusinessModel;
  });
  const filterResultLabel = content.filters.resultCount.replace(
    "{count}",
    String(filteredSites.length),
  );

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

        <article className="mt-5 rounded-[24px] border border-(--line-soft) bg-white/60 p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-[11px] uppercase tracking-[0.3em] text-(--muted-dark)">
                {content.filters.title}
              </p>
              <p className="mt-2 text-sm leading-6 text-(--text-subtle)">{filterResultLabel}</p>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <label className="grid gap-2">
                <span className="text-sm font-medium text-(--ink)">
                  {content.filters.siteType}
                </span>
                <select
                  value={siteTypeFilter}
                  onChange={(event) => setSiteTypeFilter(event.target.value)}
                  className="rounded-[16px] border border-(--line-soft) bg-white/80 px-4 py-3 outline-none transition focus:border-[rgba(223,139,73,0.5)]"
                >
                  <option value="all">{content.filters.allSiteTypes}</option>
                  {siteTypeOptions.map((option) => (
                    <option key={option} value={option}>
                      {getSiteTypeLabel(option)}
                    </option>
                  ))}
                </select>
              </label>

              <label className="grid gap-2">
                <span className="text-sm font-medium text-(--ink)">
                  {content.filters.businessModel}
                </span>
                <select
                  value={businessModelFilter}
                  onChange={(event) => setBusinessModelFilter(event.target.value)}
                  className="rounded-[16px] border border-(--line-soft) bg-white/80 px-4 py-3 outline-none transition focus:border-[rgba(223,139,73,0.5)]"
                >
                  <option value="all">{content.filters.allBusinessModels}</option>
                  {businessModelOptions.map((option) => (
                    <option key={option} value={option}>
                      {getBusinessModelLabel(option)}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>
        </article>

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
                  {content.form.fields.siteType.label}
                </span>
                <select
                  name="siteType"
                  defaultValue={siteTypeOptions[0]}
                  className="rounded-[16px] border border-(--line-soft) bg-white/80 px-4 py-3 outline-none transition focus:border-[rgba(223,139,73,0.5)]"
                >
                  {siteTypeOptions.map((option) => (
                    <option key={option} value={option}>
                      {getSiteTypeLabel(option)}
                    </option>
                  ))}
                </select>
              </label>

              <label className="grid gap-2">
                <span className="text-sm font-medium text-(--ink)">
                  {content.form.fields.businessModel.label}
                </span>
                <select
                  name="businessModel"
                  defaultValue={businessModelOptions[0]}
                  className="rounded-[16px] border border-(--line-soft) bg-white/80 px-4 py-3 outline-none transition focus:border-[rgba(223,139,73,0.5)]"
                >
                  {businessModelOptions.map((option) => (
                    <option key={option} value={option}>
                      {getBusinessModelLabel(option)}
                    </option>
                  ))}
                </select>
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

        {filteredSites.length === 0 ? (
          <div className="mt-6 rounded-[22px] border border-dashed border-(--line-soft) bg-white/42 p-6">
            <h2 className="text-lg font-semibold text-(--ink)">{content.table.emptyTitle}</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-(--text-subtle)">
              {content.table.emptyDescription}
            </p>
          </div>
        ) : (
          <div className="mt-6 grid gap-3">
            {filteredSites.map((site) => {
              const latestCheck = site.latestCheck;

              return (
                <article
                  key={site.id}
                  className={`rounded-[24px] border p-4 transition ${
                    site.statusBadge === monitoringContent.common.noError
                      ? "border-(--line-soft) bg-[rgba(255,255,255,0.74)]"
                      : "border-(--line-soft) bg-[rgba(255,255,255,0.74)]"
                  }`}
                >
                  <div className="grid gap-4 xl:grid-cols-[minmax(0,1.3fr)_repeat(6,minmax(0,0.7fr))_auto_auto_auto] xl:items-center">
                    <div className="min-w-0">
                      <div className="flex items-center gap-3">
                        <span className={`status-dot status-${site.status}`} aria-hidden="true" />
                        <div className="min-w-0">
                          <Link
                            href={`/sites/${site.id}`}
                            className="truncate text-lg font-semibold text-(--ink) underline-offset-4 hover:underline"
                          >
                            {site.name}
                          </Link>
                          <div className="mt-1 flex flex-wrap items-center gap-2">
                            <p className="truncate text-sm text-(--text-subtle)">{site.domain}</p>
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
                      <p className="table-label">{content.table.columns.profile}</p>
                      <p className="mt-2 text-sm font-semibold text-(--ink)">
                        {getSiteTypeLabel(site.siteType)}
                      </p>
                      <p className="mt-1 text-xs text-(--text-subtle)">
                        {getBusinessModelLabel(site.businessModel)}
                      </p>
                    </div>

                    <div>
                      <p className="table-label">{content.table.columns.interval}</p>
                      <p className="mt-2 text-sm font-semibold text-(--ink)">
                        {intervalLabelMap[site.checkIntervalMinutes] ??
                          getIntervalLabel(site.checkIntervalMinutes)}
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

                    <div>
                      <p className="table-label">{content.table.columns.services}</p>
                      <p className="mt-2 text-sm font-semibold text-(--ink)">
                        {site.serviceSummary?.total ?? site.services.length}
                        {site.serviceSummary && site.serviceSummary.alerts > 0 ? (
                          <span className="ml-2 text-xs text-[#a32626]">
                            / {site.serviceSummary.alerts}{" "}
                            {monitoringContent.common.units.serviceAlertSuffix}
                          </span>
                        ) : null}
                      </p>
                    </div>

                    <form action={runSiteCheckAction} className="xl:justify-self-end">
                      <input type="hidden" name="siteId" value={site.id} />
                      <button
                        type="submit"
                        className="rounded-full border border-(--line-soft) bg-white/90 px-4 py-2 text-sm font-medium text-(--ink) transition hover:bg-white"
                      >
                        {content.actions.runNow}
                      </button>
                    </form>

                    <form action={toggleSiteStarAction} className="xl:justify-self-end">
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
                      className="xl:justify-self-end"
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
                </article>
              );
            })}
          </div>
        )}
      </article>
    </section>
  );
}
