import Link from "next/link";
import { notFound } from "next/navigation";

import monitoringContent from "@/content/monitoring.json";
import {
  createSiteServiceAction,
  deleteSiteServiceAction,
  resolveIssueAction,
  runSearchConsoleSyncAction,
  runSiteDomainCheckAction,
  runSiteServiceCheckAction,
  updateSearchConsolePropertyAction,
  updateSiteAction,
  updateSiteServiceAction,
} from "@/app/(app)/actions";
import { CHECK_INTERVAL_OPTIONS } from "@/lib/monitor/site-config";
import { getSiteDetailData } from "@/lib/monitor/site-detail";
import {
  BUSINESS_MODEL_OPTIONS,
  SERVICE_CATEGORY_OPTIONS,
  SITE_TYPE_OPTIONS,
} from "@/lib/sites/site-config";
import { getIntervalLabel } from "@/lib/monitor/site-config";

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

function getServiceCategoryLabel(value: string) {
  return (
    monitoringContent.sitesPage.taxonomy.serviceCategories[
      value as keyof typeof monitoringContent.sitesPage.taxonomy.serviceCategories
    ] ?? value
  );
}

function getServiceHealthLabel(value: string | undefined) {
  if (!value) {
    return monitoringContent.sitesPage.taxonomy.serviceHealth.unknown;
  }

  return (
    monitoringContent.sitesPage.taxonomy.serviceHealth[
      value as keyof typeof monitoringContent.sitesPage.taxonomy.serviceHealth
    ] ?? value
  );
}

function formatIssueDuration(start: Date, end: Date | null) {
  const finish = end ?? new Date();
  const diffMs = Math.max(0, finish.getTime() - start.getTime());
  const diffMinutes = Math.floor(diffMs / (60 * 1000));
  const diffHours = Math.floor(diffMs / (60 * 60 * 1000));
  const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));

  if (diffDays > 0) {
    return `${diffDays}${monitoringContent.common.units.day}`;
  }

  if (diffHours > 0) {
    return `${diffHours}${monitoringContent.common.units.hour}`;
  }

  return `${Math.max(diffMinutes, 1)}${monitoringContent.common.units.minute}`;
}

function formatPercent(value: number) {
  return `${value.toFixed(1)}%`;
}

function formatSignedPercent(value: number) {
  const prefix = value > 0 ? "+" : "";
  return `${prefix}${value.toFixed(1)}%`;
}

function getDeltaTone(value: number) {
  if (value > 0) {
    return "text-[#1c6b43]";
  }

  if (value < 0) {
    return "text-[#a32626]";
  }

  return "text-(--ink)";
}

function buildSeriesPath(values: number[], width: number, height: number) {
  if (values.length === 0) {
    return "";
  }

  const max = Math.max(...values, 1);
  const step = values.length === 1 ? width : width / (values.length - 1);

  return values
    .map((value, index) => {
      const x = Math.round(index * step * 100) / 100;
      const y = Math.round((height - (value / max) * height) * 100) / 100;
      return `${index === 0 ? "M" : "L"} ${x} ${y}`;
    })
    .join(" ");
}

export default async function SiteDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ siteId: string }>;
  searchParams: Promise<{ issueType?: string }>;
}) {
  const { siteId } = await params;
  const { issueType } = await searchParams;
  const site = await getSiteDetailData(siteId, issueType);

  if (!site) {
    notFound();
  }

  const content = monitoringContent.siteDetailPage;
  const intervalLabelMap = Object.fromEntries(
    CHECK_INTERVAL_OPTIONS.map((option) => [option.value, option.label]),
  );
  const searchClicksPath = buildSeriesPath(
    site.searchConsole.points.map((point) => point.clicks),
    320,
    90,
  );
  const searchImpressionsPath = buildSeriesPath(
    site.searchConsole.points.map((point) => point.impressions),
    320,
    90,
  );
  const serviceAlerts = site.services.filter((service) => {
    const status = service.latestStatus?.status;
    return status === "warning" || status === "down";
  }).length;

  return (
    <section className="mx-auto flex w-full max-w-none flex-col gap-4">
      <article className="rounded-[30px] border border-(--line-soft) bg-(--panel) p-5 shadow-[0_24px_80px_rgba(9,12,10,0.12)] sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <Link
              href="/sites"
              className="inline-flex rounded-full border border-(--line-soft) bg-white px-4 py-2 text-xs uppercase tracking-[0.22em] text-(--ink) transition hover:bg-(--panel-subtle)"
            >
              {content.backToSites}
            </Link>
            <p className="mt-4 text-[10px] uppercase tracking-[0.28em] text-(--muted-dark)">
              {content.overviewTitle}
            </p>
            <h1 className="mt-2 font-display text-5xl leading-[0.9] tracking-[-0.05em] text-(--ink) sm:text-6xl">
              {site.name}
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-(--text-subtle)">
              {content.overviewDescription}
            </p>
          </div>

          <div className="grid gap-2 text-right">
            <span className="rounded-full border border-(--line-soft) bg-white/82 px-4 py-2 text-sm font-semibold text-(--ink)">
              {site.statusBadge}
            </span>
            <span className="text-xs uppercase tracking-[0.22em] text-(--muted-dark)">
              {site.domain}
            </span>
          </div>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-6">
          <article className="rounded-[22px] border border-(--line-soft) bg-white/72 p-4">
            <p className="table-label">{content.summary.status}</p>
            <p className="mt-2 text-lg font-semibold text-(--ink)">{site.statusBadge}</p>
          </article>
          <article className="rounded-[22px] border border-(--line-soft) bg-white/72 p-4">
            <p className="table-label">{content.summary.siteType}</p>
            <p className="mt-2 text-lg font-semibold text-(--ink)">
              {getSiteTypeLabel(site.siteType)}
            </p>
          </article>
          <article className="rounded-[22px] border border-(--line-soft) bg-white/72 p-4">
            <p className="table-label">{content.summary.businessModel}</p>
            <p className="mt-2 text-lg font-semibold text-(--ink)">
              {getBusinessModelLabel(site.businessModel)}
            </p>
          </article>
          <article className="rounded-[22px] border border-(--line-soft) bg-white/72 p-4">
            <p className="table-label">{content.summary.services}</p>
            <p className="mt-2 text-lg font-semibold text-(--ink)">{site.services.length}</p>
          </article>
          <article className="rounded-[22px] border border-(--line-soft) bg-white/72 p-4">
            <p className="table-label">{content.summary.serviceAlerts}</p>
            <p className="mt-2 text-lg font-semibold text-[#a32626]">{serviceAlerts}</p>
          </article>
          <article className="rounded-[22px] border border-(--line-soft) bg-white/72 p-4">
            <p className="table-label">{content.summary.lastCheck}</p>
            <p className="mt-2 text-sm font-semibold text-(--ink)">
              {formatDateTime(site.latestCheck?.checkedAt ?? site.lastCheckedAt)}
            </p>
          </article>
        </div>
      </article>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
        <div className="grid gap-4">
          <section className="rounded-[28px] border border-(--line-soft) bg-(--panel) p-5 shadow-[0_20px_70px_rgba(9,12,10,0.1)]">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-[10px] uppercase tracking-[0.28em] text-(--muted-dark)">
                  {content.sections.issues}
                </p>
                <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-(--ink)">
                  {site.openIssues.length}
                </h2>
              </div>
            </div>

            {site.openIssues.length === 0 ? (
              <p className="mt-4 text-sm text-(--text-subtle)">{content.empty.issues}</p>
            ) : (
              <div className="mt-4 grid gap-3">
                {site.openIssues.map((issue) => (
                  <article
                    key={issue.id}
                    className="rounded-[20px] border border-(--line-soft) bg-white/78 p-4"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <span className="rounded-full bg-[rgba(24,22,16,0.08)] px-2.5 py-1 text-[10px] uppercase tracking-[0.22em] text-(--muted-dark)">
                          {issue.level}
                        </span>
                        <span className="text-xs text-(--text-subtle)">{issue.type}</span>
                      </div>

                      <form action={resolveIssueAction}>
                        <input type="hidden" name="issueId" value={issue.id} />
                        <input type="hidden" name="siteId" value={site.id} />
                        <button
                          type="submit"
                          className="rounded-full border border-(--line-soft) bg-white px-3 py-1.5 text-xs uppercase tracking-[0.18em] text-(--ink) transition hover:bg-(--panel-subtle)"
                        >
                          {content.resolveIssue}
                        </button>
                      </form>
                    </div>
                    <p className="mt-3 text-base font-semibold text-(--ink)">{issue.title}</p>
                    {issue.detail ? (
                      <p className="mt-2 text-sm leading-6 text-(--text-subtle)">
                        {issue.detail}
                      </p>
                    ) : null}
                  </article>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-[28px] border border-(--line-soft) bg-(--panel) p-5 shadow-[0_20px_70px_rgba(9,12,10,0.1)]">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-[10px] uppercase tracking-[0.28em] text-(--muted-dark)">
                  {content.sections.issueHistory}
                </p>
                <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-(--ink)">
                  {content.issueHistoryTitle}
                </h2>
              </div>

              <div className="flex flex-wrap gap-2">
                <Link
                  href={`/sites/${site.id}`}
                  className={`rounded-full border px-3 py-1.5 text-[10px] uppercase tracking-[0.18em] transition ${
                    site.selectedIssueType === null
                      ? "border-(--ink) bg-(--ink) text-(--paper)"
                      : "border-(--line-soft) bg-white text-(--ink) hover:bg-(--panel-subtle)"
                  }`}
                >
                  {content.filters.allIssueTypes}
                </Link>
                {site.issueTypes.map((type) => (
                  <Link
                    key={type}
                    href={`/sites/${site.id}?issueType=${encodeURIComponent(type)}`}
                    className={`rounded-full border px-3 py-1.5 text-[10px] uppercase tracking-[0.18em] transition ${
                      site.selectedIssueType === type
                        ? "border-(--ink) bg-(--ink) text-(--paper)"
                        : "border-(--line-soft) bg-white text-(--ink) hover:bg-(--panel-subtle)"
                    }`}
                  >
                    {type}
                  </Link>
                ))}
              </div>
            </div>

            {site.issueHistory.length === 0 ? (
              <p className="mt-4 text-sm text-(--text-subtle)">{content.empty.issueHistory}</p>
            ) : (
              <div className="mt-4 grid gap-3">
                {site.issueHistory.map((issue) => (
                  <article
                    key={issue.id}
                    className="rounded-[20px] border border-(--line-soft) bg-white/78 p-4"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-[rgba(24,22,16,0.08)] px-2.5 py-1 text-[10px] uppercase tracking-[0.22em] text-(--muted-dark)">
                        {issue.level}
                      </span>
                      <span className="rounded-full border border-(--line-soft) px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] text-(--ink)">
                        {issue.isResolved ? content.states.issueResolved : content.states.issueOpen}
                      </span>
                      <span className="text-xs text-(--text-subtle)">{issue.type}</span>
                    </div>

                    <p className="mt-3 text-base font-semibold text-(--ink)">{issue.title}</p>
                    {issue.detail ? (
                      <p className="mt-2 text-sm leading-6 text-(--text-subtle)">
                        {issue.detail}
                      </p>
                    ) : null}

                    <div className="mt-4 grid gap-3 md:grid-cols-4">
                      <div>
                        <p className="table-label">{content.labels.issueDetectedAt}</p>
                        <p className="mt-2 text-sm font-semibold text-(--ink)">
                          {formatDateTime(issue.detectedAt)}
                        </p>
                      </div>
                      <div>
                        <p className="table-label">{content.labels.issueResolvedAt}</p>
                        <p className="mt-2 text-sm font-semibold text-(--ink)">
                          {formatDateTime(issue.resolvedAt ?? null)}
                        </p>
                      </div>
                      <div>
                        <p className="table-label">{content.labels.issueDuration}</p>
                        <p className="mt-2 text-sm font-semibold text-(--ink)">
                          {formatIssueDuration(issue.detectedAt, issue.resolvedAt ?? null)}
                        </p>
                      </div>
                      <div>
                        <p className="table-label">{content.labels.issueStatus}</p>
                        <p className="mt-2 text-sm font-semibold text-(--ink)">
                          {issue.isResolved
                            ? content.states.issueResolved
                            : content.states.issueOngoing}
                        </p>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-[28px] border border-(--line-soft) bg-(--panel) p-5 shadow-[0_20px_70px_rgba(9,12,10,0.1)]">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-[10px] uppercase tracking-[0.28em] text-(--muted-dark)">
                  {content.sections.searchConsole}
                </p>
                <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-(--ink)">
                  {content.searchConsoleTitle}
                </h2>
              </div>

              {site.searchConsole.property?.propertyUrl ? (
                <div className="flex flex-wrap gap-2">
                  <form action={runSearchConsoleSyncAction}>
                    <input type="hidden" name="siteId" value={site.id} />
                    <button
                      type="submit"
                      className="rounded-full border border-(--line-soft) bg-white px-4 py-2 text-[10px] uppercase tracking-[0.18em] text-(--ink) transition hover:bg-(--panel-subtle)"
                    >
                      {content.syncSearchConsole}
                    </button>
                  </form>

                  <a
                    href={`https://search.google.com/search-console?resource_id=${encodeURIComponent(
                      site.searchConsole.property.propertyUrl,
                    )}`}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-full border border-(--line-soft) bg-white px-4 py-2 text-[10px] uppercase tracking-[0.18em] text-(--ink) transition hover:bg-(--panel-subtle)"
                  >
                    {content.searchConsole.openInGoogleLabel}
                  </a>
                </div>
              ) : null}
            </div>

            <div className="mt-4 rounded-[22px] border border-(--line-soft) bg-white/72 p-4">
              <form action={updateSearchConsolePropertyAction} className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto]">
                <input type="hidden" name="siteId" value={site.id} />

                <label className="grid gap-2">
                  <span className="text-sm font-medium text-(--ink)">
                    {content.labels.searchConsoleProperty}
                  </span>
                  <input
                    name="propertyUrl"
                    defaultValue={site.searchConsole.property?.propertyUrl ?? ""}
                    placeholder={content.searchConsole.propertyPlaceholder}
                    className="rounded-[16px] border border-(--line-soft) bg-white/80 px-4 py-3 outline-none transition focus:border-[rgba(223,139,73,0.5)]"
                  />
                </label>

                <div className="grid gap-3">
                  <label className="flex items-center gap-3 rounded-[16px] border border-(--line-soft) bg-white/70 px-4 py-3">
                    <input
                      name="isEnabled"
                      type="checkbox"
                      defaultChecked={site.searchConsole.property?.isEnabled ?? true}
                      className="h-4 w-4 accent-[var(--accent)]"
                    />
                    <span className="text-sm text-(--ink)">
                      {site.searchConsole.property?.isEnabled
                        ? content.states.searchConsoleReady
                        : content.states.searchConsoleIdle}
                    </span>
                  </label>

                  <button
                    type="submit"
                    className="rounded-[18px] bg-(--accent) px-4 py-3 text-sm font-semibold text-(--accent-ink) transition hover:brightness-95"
                  >
                    {content.saveSearchConsole}
                  </button>
                </div>
              </form>
            </div>

            <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
              <div className="rounded-[22px] border border-(--line-soft) bg-white/72 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.28em] text-(--muted-dark)">
                      {content.searchConsole.clickSeriesLabel}
                    </p>
                    <p className="mt-2 text-sm text-(--text-subtle)">
                      {content.searchConsole.windowLabel}
                    </p>
                  </div>
                  <p className="font-metric text-4xl leading-none text-(--ink)">
                    {site.searchConsole.recentClicks}
                  </p>
                </div>

                {site.searchConsole.points.length === 0 ? (
                  <p className="mt-4 text-sm text-(--text-subtle)">{content.empty.searchConsole}</p>
                ) : (
                  <div className="mt-4">
                    <svg viewBox="0 0 320 90" className="h-28 w-full overflow-visible">
                      <path
                        d={searchClicksPath}
                        fill="none"
                        stroke="#8d5029"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                )}
              </div>

              <div className="rounded-[22px] border border-(--line-soft) bg-white/72 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.28em] text-(--muted-dark)">
                      {content.searchConsole.impressionSeriesLabel}
                    </p>
                    <p className="mt-2 text-sm text-(--text-subtle)">
                      {content.searchConsole.windowLabel}
                    </p>
                  </div>
                  <p className="font-metric text-4xl leading-none text-(--ink)">
                    {site.searchConsole.recentImpressions}
                  </p>
                </div>

                {site.searchConsole.points.length === 0 ? (
                  <p className="mt-4 text-sm text-(--text-subtle)">{content.empty.searchConsole}</p>
                ) : (
                  <div className="mt-4">
                    <svg viewBox="0 0 320 90" className="h-28 w-full overflow-visible">
                      <path
                        d={searchImpressionsPath}
                        fill="none"
                        stroke="#1c6b43"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-6">
              <article className="rounded-[20px] border border-(--line-soft) bg-white/72 p-4">
                <p className="table-label">{content.labels.searchConsoleStatus}</p>
                <p className="mt-2 text-sm font-semibold text-(--ink)">
                  {site.searchConsole.property?.syncStatus === "error"
                    ? content.states.searchConsoleError
                    : site.searchConsole.property?.lastSyncedAt
                      ? content.states.searchConsoleReady
                      : content.states.searchConsoleIdle}
                </p>
              </article>
              <article className="rounded-[20px] border border-(--line-soft) bg-white/72 p-4">
                <p className="table-label">{content.labels.searchConsoleLastSynced}</p>
                <p className="mt-2 text-sm font-semibold text-(--ink)">
                  {formatDateTime(site.searchConsole.property?.lastSyncedAt ?? null)}
                </p>
              </article>
              <article className="rounded-[20px] border border-(--line-soft) bg-white/72 p-4">
                <p className="table-label">{content.labels.searchClicksDelta}</p>
                <p className={`mt-2 text-sm font-semibold ${getDeltaTone(site.searchConsole.clicksDeltaPercent)}`}>
                  {formatSignedPercent(site.searchConsole.clicksDeltaPercent)}
                </p>
              </article>
              <article className="rounded-[20px] border border-(--line-soft) bg-white/72 p-4">
                <p className="table-label">{content.labels.searchImpressionsDelta}</p>
                <p
                  className={`mt-2 text-sm font-semibold ${getDeltaTone(
                    site.searchConsole.impressionsDeltaPercent,
                  )}`}
                >
                  {formatSignedPercent(site.searchConsole.impressionsDeltaPercent)}
                </p>
              </article>
              <article className="rounded-[20px] border border-(--line-soft) bg-white/72 p-4">
                <p className="table-label">{content.labels.searchCtr}</p>
                <p className="mt-2 text-sm font-semibold text-(--ink)">
                  {formatPercent(site.searchConsole.recentCtr)}
                </p>
              </article>
              <article className="rounded-[20px] border border-(--line-soft) bg-white/72 p-4">
                <p className="table-label">{content.labels.searchPosition}</p>
                <p className="mt-2 text-sm font-semibold text-(--ink)">
                  {site.searchConsole.recentPosition.toFixed(1)}
                </p>
              </article>
            </div>

            <div className="mt-4 rounded-[22px] border border-(--line-soft) bg-white/72 p-4">
              <div className="grid gap-3 md:grid-cols-3">
                <div>
                  <p className="table-label">{content.labels.searchConsoleProperty}</p>
                  <p className="mt-2 break-all text-sm text-(--ink)">
                    {site.searchConsole.property?.propertyUrl ?? monitoringContent.common.notCheckedYet}
                  </p>
                </div>
                <div>
                  <p className="table-label">{content.labels.searchWindow}</p>
                  <p className="mt-2 text-sm text-(--ink)">
                    {content.searchConsole.windowLabel} / {content.searchConsole.comparisonLabel}
                  </p>
                </div>
                <div>
                  <p className="table-label">{content.labels.searchConsoleSyncError}</p>
                  <p className="mt-2 text-sm text-[#8a3a36]">
                    {site.searchConsole.property?.syncError ?? monitoringContent.common.noError}
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-[28px] border border-(--line-soft) bg-(--panel) p-5 shadow-[0_20px_70px_rgba(9,12,10,0.1)]">
            <div className="grid gap-4 lg:grid-cols-3">
              <div className="rounded-[22px] border border-(--line-soft) bg-white/72 p-4">
                <p className="text-[10px] uppercase tracking-[0.28em] text-(--muted-dark)">
                  {content.sections.http}
                </p>
                <div className="mt-4 grid gap-3">
                  <div>
                    <p className="table-label">{content.labels.checkUrl}</p>
                    <p className="mt-2 break-all text-sm text-(--ink)">{site.checkUrl}</p>
                  </div>
                  <div>
                    <p className="table-label">{content.labels.interval}</p>
                    <p className="mt-2 text-sm font-semibold text-(--ink)">
                      {intervalLabelMap[site.checkIntervalMinutes] ??
                        getIntervalLabel(site.checkIntervalMinutes)}
                    </p>
                  </div>
                  <div>
                    <p className="table-label">{content.labels.statusCode}</p>
                    <p className="mt-2 text-sm font-semibold text-(--ink)">
                      {site.latestCheck?.statusCode ?? monitoringContent.common.noStatusCode}
                    </p>
                  </div>
                  <div>
                    <p className="table-label">{content.labels.method}</p>
                    <p className="mt-2 text-sm font-semibold uppercase text-(--ink)">
                      {site.latestCheck?.method ?? monitoringContent.common.notCheckedYet}
                    </p>
                  </div>
                  <div>
                    <p className="table-label">{content.labels.response}</p>
                    <p className="mt-2 text-sm font-semibold text-(--ink)">
                      {site.latestCheck?.responseTimeMs !== null &&
                      site.latestCheck?.responseTimeMs !== undefined
                        ? `${site.latestCheck.responseTimeMs}ms`
                        : monitoringContent.common.notCheckedYet}
                    </p>
                  </div>
                  <div>
                    <p className="table-label">{content.labels.checkedAt}</p>
                    <p className="mt-2 text-sm font-semibold text-(--ink)">
                      {formatDateTime(site.latestCheck?.checkedAt ?? null)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-[22px] border border-(--line-soft) bg-white/72 p-4">
                <p className="text-[10px] uppercase tracking-[0.28em] text-(--muted-dark)">
                  {content.sections.ssl}
                </p>
                <div className="mt-4 grid gap-3">
                  <div>
                    <p className="table-label">{content.labels.sslExpiresAt}</p>
                    <p className="mt-2 text-sm font-semibold text-(--ink)">
                      {formatSslDateTime(site.latestSslStatus?.expiresAt ?? null)}
                    </p>
                  </div>
                  <div>
                    <p className="table-label">{content.labels.sslDaysRemaining}</p>
                    <p className="mt-2 text-sm font-semibold text-(--ink)">
                      {site.latestSslStatus?.daysRemaining ??
                        monitoringContent.sitesPage.table.details.sslStates.notChecked}
                    </p>
                  </div>
                  <div>
                    <p className="table-label">{content.labels.sslIssuer}</p>
                    <p className="mt-2 text-sm text-(--ink)">
                      {site.latestSslStatus?.issuer ?? monitoringContent.common.noStatusCode}
                    </p>
                  </div>
                  <div>
                    <p className="table-label">{content.labels.sslCommonName}</p>
                    <p className="mt-2 text-sm text-(--ink)">
                      {site.latestSslStatus?.commonName ?? monitoringContent.common.noStatusCode}
                    </p>
                  </div>
                  <div>
                    <p className="table-label">{content.labels.sslDomainMatch}</p>
                    <p className="mt-2 text-sm font-semibold text-(--ink)">
                      {site.latestSslStatus
                        ? site.latestSslStatus.matchedDomain
                          ? monitoringContent.sitesPage.table.details.yes
                          : monitoringContent.sitesPage.table.details.no
                        : monitoringContent.sitesPage.table.details.sslStates.notChecked}
                    </p>
                  </div>
                  <div>
                    <p className="table-label">{content.labels.checkedAt}</p>
                    <p className="mt-2 text-sm font-semibold text-(--ink)">
                      {formatSslDateTime(site.latestSslStatus?.checkedAt ?? null)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-[22px] border border-(--line-soft) bg-white/72 p-4">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-[10px] uppercase tracking-[0.28em] text-(--muted-dark)">
                    {content.sections.domain}
                  </p>
                  <form action={runSiteDomainCheckAction}>
                    <input type="hidden" name="siteId" value={site.id} />
                    <button
                      type="submit"
                      className="rounded-full border border-(--line-soft) bg-white px-3 py-1.5 text-[10px] uppercase tracking-[0.18em] text-(--ink) transition hover:bg-(--panel-subtle)"
                    >
                      {content.refreshDomain}
                    </button>
                  </form>
                </div>
                <div className="mt-4 grid gap-3">
                  <div>
                    <p className="table-label">{content.labels.domainExpiresAt}</p>
                    <p className="mt-2 text-sm font-semibold text-(--ink)">
                      {formatSslDateTime(site.latestDomainStatus?.expiresAt ?? null)}
                    </p>
                  </div>
                  <div>
                    <p className="table-label">{content.labels.domainDaysRemaining}</p>
                    <p className="mt-2 text-sm font-semibold text-(--ink)">
                      {site.latestDomainStatus?.daysRemaining ??
                        monitoringContent.common.notCheckedYet}
                    </p>
                  </div>
                  <div>
                    <p className="table-label">{content.labels.domainRegistrar}</p>
                    <p className="mt-2 text-sm text-(--ink)">
                      {site.latestDomainStatus?.registrar ??
                        monitoringContent.common.notCheckedYet}
                    </p>
                  </div>
                  <div>
                    <p className="table-label">{content.labels.domainLookup}</p>
                    <p className="mt-2 text-sm text-(--ink)">
                      {site.latestDomainStatus?.lookupDomain ??
                        monitoringContent.common.notCheckedYet}
                    </p>
                  </div>
                  <div>
                    <p className="table-label">{content.labels.domainAutoRenew}</p>
                    <p className="mt-2 text-sm font-semibold text-(--ink)">
                      {site.latestDomainStatus
                        ? site.latestDomainStatus.autoRenewEnabled
                          ? monitoringContent.sitesPage.table.details.yes
                          : monitoringContent.sitesPage.table.details.no
                        : monitoringContent.common.notCheckedYet}
                    </p>
                  </div>
                  <div>
                    <p className="table-label">{content.labels.checkedAt}</p>
                    <p className="mt-2 text-sm font-semibold text-(--ink)">
                      {formatSslDateTime(site.latestDomainStatus?.checkedAt ?? null)}
                    </p>
                  </div>
                  <div className="lg:col-span-2">
                    <p className="table-label">{content.labels.domainError}</p>
                    <p className="mt-2 text-sm text-[#8a3a36]">
                      {site.latestDomainStatus?.errorMessage ?? monitoringContent.common.noError}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-[28px] border border-(--line-soft) bg-(--panel) p-5 shadow-[0_20px_70px_rgba(9,12,10,0.1)]">
            <p className="text-[10px] uppercase tracking-[0.28em] text-(--muted-dark)">
              {content.sections.services}
            </p>

            <div className="mt-4 rounded-[22px] border border-(--line-soft) bg-white/72 p-4">
              <p className="text-[10px] uppercase tracking-[0.28em] text-(--muted-dark)">
                {content.serviceManagementTitle}
              </p>
              <form action={createSiteServiceAction} className="mt-4 grid gap-3 lg:grid-cols-2">
                <input type="hidden" name="siteId" value={site.id} />

                <label className="grid gap-2">
                  <span className="text-sm font-medium text-(--ink)">
                    {monitoringContent.sitesPage.table.serviceForm.fields.category.label}
                  </span>
                  <select
                    name="category"
                    defaultValue={SERVICE_CATEGORY_OPTIONS[0]}
                    className="rounded-[16px] border border-(--line-soft) bg-white/80 px-4 py-3 outline-none transition focus:border-[rgba(223,139,73,0.5)]"
                  >
                    {SERVICE_CATEGORY_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {getServiceCategoryLabel(option)}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="grid gap-2">
                  <span className="text-sm font-medium text-(--ink)">
                    {monitoringContent.sitesPage.table.serviceForm.fields.providerKey.label}
                  </span>
                  <input
                    name="providerKey"
                    required
                    className="rounded-[16px] border border-(--line-soft) bg-white/80 px-4 py-3 outline-none transition focus:border-[rgba(223,139,73,0.5)]"
                    placeholder={
                      monitoringContent.sitesPage.table.serviceForm.fields.providerKey.placeholder
                    }
                  />
                </label>

                <label className="grid gap-2">
                  <span className="text-sm font-medium text-(--ink)">
                    {monitoringContent.sitesPage.table.serviceForm.fields.displayName.label}
                  </span>
                  <input
                    name="displayName"
                    className="rounded-[16px] border border-(--line-soft) bg-white/80 px-4 py-3 outline-none transition focus:border-[rgba(223,139,73,0.5)]"
                    placeholder={
                      monitoringContent.sitesPage.table.serviceForm.fields.displayName.placeholder
                    }
                  />
                </label>

                <label className="grid gap-2">
                  <span className="text-sm font-medium text-(--ink)">
                    {monitoringContent.sitesPage.table.serviceForm.fields.healthCheckUrl.label}
                  </span>
                  <input
                    name="healthCheckUrl"
                    type="url"
                    className="rounded-[16px] border border-(--line-soft) bg-white/80 px-4 py-3 outline-none transition focus:border-[rgba(223,139,73,0.5)]"
                    placeholder={
                      monitoringContent.sitesPage.table.serviceForm.fields.healthCheckUrl.placeholder
                    }
                  />
                </label>

                <label className="grid gap-2">
                  <span className="text-sm font-medium text-(--ink)">
                    {monitoringContent.sitesPage.table.serviceForm.fields.checkInterval.label}
                  </span>
                  <select
                    name="checkIntervalMinutes"
                    defaultValue={String(CHECK_INTERVAL_OPTIONS[1]?.value ?? 60)}
                    className="rounded-[16px] border border-(--line-soft) bg-white/80 px-4 py-3 outline-none transition focus:border-[rgba(223,139,73,0.5)]"
                  >
                    {CHECK_INTERVAL_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="grid gap-2">
                  <span className="text-sm font-medium text-(--ink)">
                    {monitoringContent.sitesPage.table.serviceForm.fields.notes.label}
                  </span>
                  <input
                    name="notes"
                    className="rounded-[16px] border border-(--line-soft) bg-white/80 px-4 py-3 outline-none transition focus:border-[rgba(223,139,73,0.5)]"
                    placeholder={
                      monitoringContent.sitesPage.table.serviceForm.fields.notes.placeholder
                    }
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
                    {monitoringContent.sitesPage.table.serviceForm.fields.isActive.label}
                  </span>
                </label>

                <div className="lg:col-span-2">
                  <button
                    type="submit"
                    className="rounded-[18px] bg-(--accent) px-4 py-3 text-sm font-semibold text-(--accent-ink) transition hover:brightness-95"
                  >
                    {monitoringContent.sitesPage.actions.addService}
                  </button>
                </div>
              </form>
            </div>

            {site.services.length === 0 ? (
              <p className="mt-4 text-sm text-(--text-subtle)">{content.empty.services}</p>
            ) : (
              <div className="mt-4 grid gap-3">
                {site.services.map((service) => (
                  <article
                    key={service.id}
                    className="rounded-[22px] border border-(--line-soft) bg-white/78 p-4"
                  >
                    <div className="grid gap-3">
                      <form action={updateSiteServiceAction} className="grid gap-3 lg:grid-cols-2">
                        <input type="hidden" name="siteServiceId" value={service.id} />
                        <input type="hidden" name="siteId" value={site.id} />

                        <label className="grid gap-2">
                          <span className="text-sm font-medium text-(--ink)">
                            {monitoringContent.sitesPage.table.serviceForm.fields.category.label}
                          </span>
                          <select
                            name="category"
                            defaultValue={service.category}
                            className="rounded-[16px] border border-(--line-soft) bg-white/80 px-4 py-3 outline-none transition focus:border-[rgba(223,139,73,0.5)]"
                          >
                            {SERVICE_CATEGORY_OPTIONS.map((option) => (
                              <option key={option} value={option}>
                                {getServiceCategoryLabel(option)}
                              </option>
                            ))}
                          </select>
                        </label>

                        <label className="grid gap-2">
                          <span className="text-sm font-medium text-(--ink)">
                            {monitoringContent.sitesPage.table.serviceForm.fields.providerKey.label}
                          </span>
                          <input
                            name="providerKey"
                            required
                            defaultValue={service.providerKey}
                            className="rounded-[16px] border border-(--line-soft) bg-white/80 px-4 py-3 outline-none transition focus:border-[rgba(223,139,73,0.5)]"
                          />
                        </label>

                        <label className="grid gap-2">
                          <span className="text-sm font-medium text-(--ink)">
                            {monitoringContent.sitesPage.table.serviceForm.fields.displayName.label}
                          </span>
                          <input
                            name="displayName"
                            defaultValue={service.displayName}
                            className="rounded-[16px] border border-(--line-soft) bg-white/80 px-4 py-3 outline-none transition focus:border-[rgba(223,139,73,0.5)]"
                          />
                        </label>

                        <label className="grid gap-2">
                          <span className="text-sm font-medium text-(--ink)">
                            {monitoringContent.sitesPage.table.serviceForm.fields.healthCheckUrl.label}
                          </span>
                          <input
                            name="healthCheckUrl"
                            type="url"
                            defaultValue={service.healthCheckUrl ?? ""}
                            className="rounded-[16px] border border-(--line-soft) bg-white/80 px-4 py-3 outline-none transition focus:border-[rgba(223,139,73,0.5)]"
                          />
                        </label>

                        <label className="grid gap-2">
                          <span className="text-sm font-medium text-(--ink)">
                            {monitoringContent.sitesPage.table.serviceForm.fields.checkInterval.label}
                          </span>
                          <select
                            name="checkIntervalMinutes"
                            defaultValue={String(service.checkIntervalMinutes)}
                            className="rounded-[16px] border border-(--line-soft) bg-white/80 px-4 py-3 outline-none transition focus:border-[rgba(223,139,73,0.5)]"
                          >
                            {CHECK_INTERVAL_OPTIONS.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </label>

                        <label className="grid gap-2">
                          <span className="text-sm font-medium text-(--ink)">
                            {monitoringContent.sitesPage.table.serviceForm.fields.notes.label}
                          </span>
                          <input
                            name="notes"
                            defaultValue={service.notes ?? ""}
                            className="rounded-[16px] border border-(--line-soft) bg-white/80 px-4 py-3 outline-none transition focus:border-[rgba(223,139,73,0.5)]"
                          />
                        </label>

                        <label className="flex items-center gap-3 rounded-[16px] border border-(--line-soft) bg-white/70 px-4 py-3 lg:col-span-2">
                          <input
                            name="isActive"
                            type="checkbox"
                            defaultChecked={service.isActive}
                            className="h-4 w-4 accent-[var(--accent)]"
                          />
                          <span className="text-sm text-(--ink)">
                            {monitoringContent.sitesPage.table.serviceForm.fields.isActive.label}
                          </span>
                        </label>

                        <div className="lg:col-span-2">
                          <button
                            type="submit"
                            className="rounded-[18px] bg-(--accent) px-4 py-3 text-sm font-semibold text-(--accent-ink) transition hover:brightness-95"
                          >
                            {monitoringContent.sitesPage.actions.saveService}
                          </button>
                        </div>
                      </form>

                      <div className="rounded-[18px] border border-(--line-soft) bg-white/70 px-4 py-3">
                        <div className="grid gap-3 md:grid-cols-4">
                          <div>
                            <p className="table-label">{content.labels.serviceStatus}</p>
                            <p className="table-value">
                              {getServiceHealthLabel(service.latestStatus?.status)}
                            </p>
                          </div>
                          <div>
                            <p className="table-label">{content.labels.serviceLastCheck}</p>
                            <p className="table-value">
                              {formatDateTime(service.latestStatus?.checkedAt ?? null)}
                            </p>
                          </div>
                          <div>
                            <p className="table-label">{content.labels.response}</p>
                            <p className="table-value">
                              {service.latestStatus?.responseTimeMs !== null &&
                              service.latestStatus?.responseTimeMs !== undefined
                                ? `${service.latestStatus.responseTimeMs}ms`
                                : monitoringContent.common.notCheckedYet}
                            </p>
                          </div>
                          <div>
                            <p className="table-label">{content.labels.serviceError}</p>
                            <p className="mt-1 text-sm text-(--ink)">
                              {service.latestStatus?.errorMessage ??
                                monitoringContent.common.noError}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {service.healthCheckUrl ? (
                          <form action={runSiteServiceCheckAction}>
                            <input type="hidden" name="siteServiceId" value={service.id} />
                            <button
                              type="submit"
                              className="rounded-[18px] border border-(--line-soft) bg-white px-4 py-3 text-sm font-semibold text-(--ink) transition hover:bg-(--panel-subtle)"
                            >
                              {monitoringContent.sitesPage.actions.runServiceCheck}
                            </button>
                          </form>
                        ) : null}

                        <form action={deleteSiteServiceAction}>
                          <input type="hidden" name="siteServiceId" value={service.id} />
                          <button
                            type="submit"
                            className="rounded-[18px] border border-[#d7a5a5] bg-[rgba(195,48,48,0.08)] px-4 py-3 text-sm font-semibold text-[#8a2f2f] transition hover:bg-[rgba(195,48,48,0.14)]"
                          >
                            {monitoringContent.sitesPage.actions.deleteService}
                          </button>
                        </form>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>

        <aside className="grid gap-4">
          <section className="rounded-[28px] border border-(--line-soft) bg-[rgba(24,22,16,0.96)] p-5 text-(--paper) shadow-[0_20px_70px_rgba(9,12,10,0.16)]">
            <p className="text-[10px] uppercase tracking-[0.28em] text-white/42">
              {content.sections.activity}
            </p>
            {site.recentChecks.length === 0 ? (
              <p className="mt-4 text-sm text-white/60">{content.empty.activity}</p>
            ) : (
              <div className="mt-4 grid gap-2">
                {site.recentChecks.map((check) => (
                  <article
                    key={check.id}
                    className="grid gap-2 rounded-[18px] border border-white/10 bg-white/6 px-4 py-3"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm font-medium text-white/84">
                        {formatDateTime(check.checkedAt)}
                      </span>
                      <span className="text-xs uppercase tracking-[0.18em] text-white/45">
                        {check.method}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-3 text-sm text-white/64">
                      <span>{check.statusCode ?? "-"}</span>
                      <span>
                        {check.responseTimeMs !== null
                          ? `${check.responseTimeMs}ms`
                          : monitoringContent.common.notCheckedYet}
                      </span>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-[28px] border border-(--line-soft) bg-(--panel) p-5 shadow-[0_20px_70px_rgba(9,12,10,0.1)]">
            <p className="text-[10px] uppercase tracking-[0.28em] text-(--muted-dark)">
              {content.editTitle}
            </p>

            <form action={updateSiteAction} className="mt-4 grid gap-3">
              <input type="hidden" name="siteId" value={site.id} />

              <label className="grid gap-2">
                <span className="text-sm font-medium text-(--ink)">
                  {monitoringContent.sitesPage.form.fields.name.label}
                </span>
                <input
                  name="name"
                  required
                  defaultValue={site.name}
                  className="rounded-[16px] border border-(--line-soft) bg-white/80 px-4 py-3 outline-none transition focus:border-[rgba(223,139,73,0.5)]"
                />
              </label>

              <label className="grid gap-2">
                <span className="text-sm font-medium text-(--ink)">
                  {monitoringContent.sitesPage.form.fields.siteType.label}
                </span>
                <select
                  name="siteType"
                  defaultValue={site.siteType}
                  className="rounded-[16px] border border-(--line-soft) bg-white/80 px-4 py-3 outline-none transition focus:border-[rgba(223,139,73,0.5)]"
                >
                  {SITE_TYPE_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {getSiteTypeLabel(option)}
                    </option>
                  ))}
                </select>
              </label>

              <label className="grid gap-2">
                <span className="text-sm font-medium text-(--ink)">
                  {monitoringContent.sitesPage.form.fields.businessModel.label}
                </span>
                <select
                  name="businessModel"
                  defaultValue={site.businessModel}
                  className="rounded-[16px] border border-(--line-soft) bg-white/80 px-4 py-3 outline-none transition focus:border-[rgba(223,139,73,0.5)]"
                >
                  {BUSINESS_MODEL_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {getBusinessModelLabel(option)}
                    </option>
                  ))}
                </select>
              </label>

              <label className="grid gap-2">
                <span className="text-sm font-medium text-(--ink)">{content.labels.domain}</span>
                <input
                  name="domain"
                  required
                  defaultValue={site.domain}
                  className="rounded-[16px] border border-(--line-soft) bg-white/80 px-4 py-3 outline-none transition focus:border-[rgba(223,139,73,0.5)]"
                />
              </label>

              <label className="grid gap-2">
                <span className="text-sm font-medium text-(--ink)">
                  {content.labels.checkUrl}
                </span>
                <input
                  name="checkUrl"
                  type="url"
                  required
                  defaultValue={site.checkUrl}
                  className="rounded-[16px] border border-(--line-soft) bg-white/80 px-4 py-3 outline-none transition focus:border-[rgba(223,139,73,0.5)]"
                />
              </label>

              <label className="grid gap-2">
                <span className="text-sm font-medium text-(--ink)">
                  {content.labels.interval}
                </span>
                <select
                  name="checkIntervalMinutes"
                  defaultValue={String(site.checkIntervalMinutes)}
                  className="rounded-[16px] border border-(--line-soft) bg-white/80 px-4 py-3 outline-none transition focus:border-[rgba(223,139,73,0.5)]"
                >
                  {CHECK_INTERVAL_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="grid gap-2">
                <span className="text-sm font-medium text-(--ink)">{content.labels.notes}</span>
                <input
                  name="notes"
                  defaultValue={site.notes ?? ""}
                  className="rounded-[16px] border border-(--line-soft) bg-white/80 px-4 py-3 outline-none transition focus:border-[rgba(223,139,73,0.5)]"
                />
              </label>

              <label className="flex items-center gap-3 rounded-[16px] border border-(--line-soft) bg-white/70 px-4 py-3">
                <input
                  name="isActive"
                  type="checkbox"
                  defaultChecked={site.isActive}
                  className="h-4 w-4 accent-[var(--accent)]"
                />
                <span className="text-sm text-(--ink)">
                  {site.isActive ? content.states.active : content.states.inactive}
                </span>
              </label>

              <label className="flex items-center gap-3 rounded-[16px] border border-(--line-soft) bg-white/70 px-4 py-3">
                <input
                  name="isStarred"
                  type="checkbox"
                  defaultChecked={site.isStarred}
                  className="h-4 w-4 accent-[var(--accent)]"
                />
                <span className="text-sm text-(--ink)">
                  {site.isStarred ? content.states.starred : content.states.notStarred}
                </span>
              </label>

              <button
                type="submit"
                className="rounded-[18px] bg-(--accent) px-4 py-3 text-sm font-semibold text-(--accent-ink) transition hover:brightness-95"
              >
                {content.saveSite}
              </button>
            </form>
          </section>
        </aside>
      </div>
    </section>
  );
}
