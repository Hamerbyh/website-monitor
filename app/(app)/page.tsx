import Link from "next/link";

import monitoringContent from "@/content/monitoring.json";
import uiContent from "@/content/ui.json";
import { getSitesDashboardData } from "@/lib/monitor/site-dashboard";

function getIssueAccent(level: string) {
  switch (level) {
    case monitoringContent.common.issueLevels.critical:
      return "border-[#cf5f5f] bg-[linear-gradient(180deg,rgba(255,241,241,0.98),rgba(255,248,246,0.94))] text-[#8f2727]";
    case monitoringContent.common.issueLevels.warning:
      return "border-[#d6ab57] bg-[linear-gradient(180deg,rgba(255,248,233,0.98),rgba(255,251,242,0.94))] text-[#8a6200]";
    default:
      return "border-[rgba(24,22,16,0.08)] bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(250,245,237,0.92))] text-(--ink)";
  }
}

function getSiteTone(status: string) {
  switch (status) {
    case "down":
      return "border-[#cf5f5f] bg-[linear-gradient(180deg,rgba(255,241,241,0.98),rgba(255,247,245,0.94))]";
    case "warning":
    case "degraded":
      return "border-[#d6ab57] bg-[linear-gradient(180deg,rgba(255,248,233,0.98),rgba(255,251,242,0.94))]";
    default:
      return "border-[rgba(24,22,16,0.08)] bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(248,241,233,0.92))]";
  }
}

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

export default async function DashboardPage() {
  const content = monitoringContent.home;
  const dashboard = await getSitesDashboardData();
  const prioritySites = dashboard.sites.slice(0, 6);

  return (
    <section className="mx-auto flex w-full max-w-none flex-col gap-3">
      <article className="relative overflow-hidden rounded-[34px] border border-[rgba(24,22,16,0.08)] bg-[linear-gradient(180deg,rgba(252,248,241,0.98),rgba(244,235,223,0.96))] p-3 shadow-[0_30px_100px_rgba(28,20,9,0.08)] sm:p-4">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_0%_0%,rgba(222,125,51,0.2),transparent_20%),radial-gradient(circle_at_100%_0%,rgba(24,22,16,0.08),transparent_18%),linear-gradient(135deg,rgba(255,255,255,0.28),transparent_56%)]" />
        <div className="pointer-events-none absolute inset-x-0 top-[42%] h-px bg-[linear-gradient(90deg,transparent,rgba(24,22,16,0.08),transparent)]" />

        <div className="relative grid gap-3 xl:grid-cols-[minmax(0,1.42fr)_380px]">
          <div className="grid gap-3">
            <section className="rounded-[28px] border border-[rgba(24,22,16,0.08)] bg-[rgba(255,255,255,0.76)] p-4">
              <div className="grid gap-3 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
                <div className="grid gap-3">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.34em] text-(--muted-dark)">
                        {content.issuesPanel.eyebrow}
                      </p>
                      <h1 className="mt-2 max-w-[11ch] font-display text-[2.5rem] leading-[0.86] tracking-[-0.055em] text-(--ink) sm:text-[3.25rem]">
                        {content.issuesPanel.title}
                      </h1>
                    </div>

                    <Link
                      href="/sites"
                      className="inline-flex items-center justify-center rounded-full border border-[rgba(24,22,16,0.08)] bg-(--ink) px-4 py-2 text-[11px] uppercase tracking-[0.24em] text-(--paper) transition hover:opacity-92"
                    >
                      {content.actions.manageSites}
                    </Link>
                  </div>

                  <div className="grid gap-2 md:grid-cols-5">
                    <div className="rounded-[22px] border border-[rgba(195,48,48,0.16)] bg-[rgba(255,244,244,0.82)] p-3 md:col-span-2">
                      <p className="text-[10px] uppercase tracking-[0.24em] text-[#9e4646]">
                        {content.statusSummary.issuesLabel}
                      </p>
                      <div className="mt-2 flex items-end justify-between gap-3">
                        <p className="font-metric text-5xl leading-none text-[#8f2727]">
                          {dashboard.openIssues.length}
                        </p>
                        <p className="text-right text-xs leading-5 text-[#8f2727]/70">
                          {content.watchlist.panelTitle}
                        </p>
                      </div>
                    </div>

                    <div className="rounded-[22px] border border-[rgba(143,69,31,0.14)] bg-[rgba(255,247,240,0.86)] p-3">
                      <p className="text-[10px] uppercase tracking-[0.24em] text-[#9f6841]">
                        {content.statusSummary.servicesLabel}
                      </p>
                      <p className="mt-2 font-metric text-4xl leading-none text-[#8d5029]">
                        {dashboard.alertServicesCount}
                      </p>
                    </div>

                    <div className="rounded-[22px] border border-[rgba(31,143,85,0.14)] bg-[rgba(241,249,244,0.86)] p-3">
                      <p className="text-[10px] uppercase tracking-[0.24em] text-[#3c7a57]">
                        {content.statusSummary.healthyServicesLabel}
                      </p>
                      <p className="mt-2 font-metric text-4xl leading-none text-[#1c6b43]">
                        {dashboard.healthyServicesCount}
                      </p>
                    </div>

                    <div className="rounded-[22px] border border-[rgba(24,22,16,0.08)] bg-white/74 p-3">
                      <p className="text-[10px] uppercase tracking-[0.24em] text-(--muted-dark)">
                        {monitoringContent.sitesPage.summary.lastCheck}
                      </p>
                      <p className="mt-2 text-sm font-semibold leading-5 text-(--ink)">
                        {formatDateTime(dashboard.lastCheckedAt)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid gap-2 rounded-[24px] border border-[rgba(24,22,16,0.08)] bg-[linear-gradient(180deg,rgba(255,255,255,0.82),rgba(247,240,232,0.78))] p-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-[18px] border border-[rgba(24,22,16,0.08)] bg-white/72 p-3">
                      <p className="text-[10px] uppercase tracking-[0.24em] text-(--muted-dark)">
                        {content.totals.healthySites}
                      </p>
                      <p className="mt-2 font-metric text-4xl leading-none text-(--ink)">
                        {dashboard.healthySitesCount}
                      </p>
                    </div>
                    <div className="rounded-[18px] border border-[rgba(24,22,16,0.08)] bg-white/72 p-3">
                      <p className="text-[10px] uppercase tracking-[0.24em] text-(--muted-dark)">
                        {content.totals.degradedSites}
                      </p>
                      <p className="mt-2 font-metric text-4xl leading-none text-[#8a6200]">
                        {dashboard.degradedSitesCount}
                      </p>
                    </div>
                    <div className="rounded-[18px] border border-[rgba(24,22,16,0.08)] bg-white/72 p-3">
                      <p className="text-[10px] uppercase tracking-[0.24em] text-(--muted-dark)">
                        {content.totals.downSites}
                      </p>
                      <p className="mt-2 font-metric text-4xl leading-none text-[#8f2727]">
                        {dashboard.downSitesCount}
                      </p>
                    </div>
                    <div className="rounded-[18px] border border-[rgba(24,22,16,0.08)] bg-white/72 p-3">
                      <p className="text-[10px] uppercase tracking-[0.24em] text-(--muted-dark)">
                        {content.watchlist.services}
                      </p>
                      <p className="mt-2 font-metric text-4xl leading-none text-(--ink)">
                        {dashboard.totalServicesCount}
                      </p>
                    </div>
                  </div>

                  <div className="rounded-[18px] border border-[rgba(24,22,16,0.08)] bg-[rgba(24,22,16,0.92)] px-3 py-3 text-(--paper)">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-[10px] uppercase tracking-[0.28em] text-white/42">
                        {content.starredAlerts.eyebrow}
                      </p>
                      <span className="rounded-full border border-white/10 bg-white/6 px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-white/56">
                        {content.statusSummary.liveLabel}
                      </span>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {dashboard.starredAlertSites.length > 0 ? (
                        dashboard.starredAlertSites.map((site) => (
                          <span
                            key={site.id}
                            className="rounded-full border border-[#9f4a4a] bg-[rgba(195,48,48,0.16)] px-3 py-2 text-sm text-[#ffd7d7]"
                          >
                            {site.name}
                          </span>
                        ))
                      ) : (
                        <span className="rounded-full border border-white/10 bg-white/6 px-3 py-2 text-sm text-white/58">
                          {content.starredAlerts.none}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section className="rounded-[28px] border border-[rgba(24,22,16,0.08)] bg-[rgba(255,255,255,0.76)] p-3">
              {dashboard.openIssues.length === 0 ? (
                <div className="rounded-[22px] border border-[rgba(31,143,85,0.12)] bg-[rgba(245,252,247,0.86)] p-4">
                  <p className="text-sm text-[#2d6c47]">{content.issuesPanel.empty}</p>
                </div>
              ) : (
                <div className="grid gap-2 xl:grid-cols-2">
                  {dashboard.openIssues.map((issue) => (
                    <article
                      key={issue.id}
                      className={`rounded-[22px] border p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.45)] ${getIssueAccent(
                        issue.level,
                      )}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded-full border border-current/12 bg-white/60 px-2.5 py-1 text-[10px] uppercase tracking-[0.22em]">
                              {issue.level}
                            </span>
                            <span className="text-xs opacity-70">
                              {issue.siteName ?? content.issuesPanel.siteFallback}
                            </span>
                          </div>
                          <h2 className="mt-2 text-base font-semibold tracking-[-0.02em]">
                            {issue.title}
                          </h2>
                        </div>

                        <div className="rounded-[16px] border border-current/10 bg-white/45 px-3 py-2 text-right">
                          <p className="text-[10px] uppercase tracking-[0.18em] opacity-60">
                            {content.issuesPanel.typeLabel}
                          </p>
                          <p className="mt-1 text-xs font-medium">{issue.type}</p>
                        </div>
                      </div>

                      {issue.detail ? (
                        <p className="mt-3 text-sm leading-6 opacity-85">{issue.detail}</p>
                      ) : null}
                    </article>
                  ))}
                </div>
              )}
            </section>
          </div>

          <aside className="grid gap-3">
            <section className="rounded-[30px] border border-[rgba(24,22,16,0.08)] bg-[rgba(24,22,16,0.95)] p-3 text-(--paper) shadow-[0_28px_90px_rgba(18,15,10,0.18)]">
              <div className="rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))] p-4">
                <p className="text-[10px] uppercase tracking-[0.32em] text-white/42">
                  {content.statusSummary.title}
                </p>
                <h2 className="mt-3 max-w-[11ch] font-display text-[2.35rem] leading-[0.86] tracking-[-0.05em] text-white">
                  {content.statusSummary.panelTitle}
                </h2>

                <div className="mt-4 grid gap-2">
                  {prioritySites.map((site) => (
                    <article
                      key={site.id}
                      className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-[18px] border border-white/10 bg-white/6 px-3 py-3"
                    >
                      <span className={`status-dot status-${site.status}`} aria-hidden="true" />
                      <div className="min-w-0">
                        <Link
                          href={`/sites/${site.id}`}
                          className="truncate text-sm font-semibold text-white underline-offset-4 hover:underline"
                        >
                          {site.name}
                        </Link>
                        <p className="mt-1 truncate text-xs text-white/56">{site.domain}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[11px] font-medium text-white">
                          {site.statusBadge}
                        </p>
                        <p className="mt-1 text-[11px] text-white/48">
                          {site.serviceSummary.alerts}
                        </p>
                      </div>
                    </article>
                  ))}
                </div>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2">
                <div className="rounded-[20px] border border-white/10 bg-[rgba(255,255,255,0.06)] p-3">
                  <p className="text-[10px] uppercase tracking-[0.22em] text-white/42">
                    {content.statusSummary.servicesLabel}
                  </p>
                  <p className="mt-2 font-metric text-4xl leading-none text-[#f0b487]">
                    {dashboard.alertServicesCount}
                  </p>
                </div>
                <div className="rounded-[20px] border border-white/10 bg-[rgba(255,255,255,0.06)] p-3">
                  <p className="text-[10px] uppercase tracking-[0.22em] text-white/42">
                    {content.statusSummary.healthyServicesLabel}
                  </p>
                  <p className="mt-2 font-metric text-4xl leading-none text-[#8ed39e]">
                    {dashboard.healthyServicesCount}
                  </p>
                </div>
              </div>
            </section>
          </aside>
        </div>
      </article>

      <section className="rounded-[32px] border border-[rgba(24,22,16,0.08)] bg-[linear-gradient(180deg,rgba(255,255,255,0.94),rgba(248,241,233,0.9))] p-3 shadow-[0_26px_90px_rgba(28,20,9,0.06)] sm:p-4">
        <div className="flex flex-col gap-3 border-b border-[rgba(24,22,16,0.08)] pb-3 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-[0.32em] text-(--muted-dark)">
              {content.watchlist.title}
            </p>
            <h2 className="mt-2 font-display text-[2.2rem] leading-[0.9] tracking-[-0.05em] text-(--ink)">
              {content.watchlist.panelTitle}
            </h2>
          </div>

          <div className="grid gap-2 sm:grid-cols-3 xl:min-w-[560px]">
            <div className="rounded-[18px] border border-[rgba(24,22,16,0.08)] bg-white/76 px-3 py-2.5">
              <p className="text-[10px] uppercase tracking-[0.22em] text-(--muted-dark)">
                {content.totals.healthySites}
              </p>
              <p className="mt-1 text-lg font-semibold text-(--ink)">
                {dashboard.totalSites}
              </p>
            </div>
            <div className="rounded-[18px] border border-[rgba(24,22,16,0.08)] bg-white/76 px-3 py-2.5">
              <p className="text-[10px] uppercase tracking-[0.22em] text-(--muted-dark)">
                {content.watchlist.services}
              </p>
              <p className="mt-1 text-lg font-semibold text-(--ink)">
                {dashboard.totalServicesCount}
              </p>
            </div>
            <div className="rounded-[18px] border border-[rgba(24,22,16,0.08)] bg-white/76 px-3 py-2.5">
              <p className="text-[10px] uppercase tracking-[0.22em] text-(--muted-dark)">
                {content.totals.serviceAlerts}
              </p>
              <p className="mt-1 text-lg font-semibold text-[#8f2727]">
                {dashboard.alertServicesCount}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-3 grid gap-2 xl:grid-cols-3">
          {dashboard.sites.map((site) => (
            <article
              key={site.id}
              className={`rounded-[22px] border p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.5)] ${getSiteTone(
                site.status,
              )}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-3">
                    <span className={`status-dot status-${site.status}`} aria-hidden="true" />
                    <Link
                      href={`/sites/${site.id}`}
                      className="truncate text-base font-semibold text-(--ink) underline-offset-4 hover:underline"
                    >
                      {site.name}
                    </Link>
                  </div>
                  <p className="mt-2 truncate text-sm text-(--text-subtle)">{site.domain}</p>
                </div>

                <div className="rounded-full border border-[rgba(24,22,16,0.08)] bg-white/84 px-3 py-1 text-[11px] font-medium text-(--ink)">
                  {site.statusBadge}
                </div>
              </div>

              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <div className="rounded-[16px] border border-[rgba(24,22,16,0.08)] bg-white/58 px-3 py-2.5">
                  <p className="table-label">{uiContent.siteTable.response}</p>
                  <p className="table-value">
                    {site.latestCheck?.responseTimeMs !== null &&
                    site.latestCheck?.responseTimeMs !== undefined
                      ? `${site.latestCheck.responseTimeMs}ms`
                      : monitoringContent.common.notCheckedYet}
                  </p>
                </div>

                <div className="rounded-[16px] border border-[rgba(24,22,16,0.08)] bg-white/58 px-3 py-2.5">
                  <p className="table-label">{uiContent.siteTable.ssl}</p>
                  <p className="table-value">
                    {site.latestSslStatus?.daysRemaining !== null &&
                    site.latestSslStatus?.daysRemaining !== undefined
                      ? `${site.latestSslStatus.daysRemaining} ${monitoringContent.common.units.day}`
                      : monitoringContent.sitesPage.table.details.sslStates.notChecked}
                  </p>
                </div>

                <div className="rounded-[16px] border border-[rgba(24,22,16,0.08)] bg-white/58 px-3 py-2.5">
                  <p className="table-label">{content.watchlist.services}</p>
                  <p className="table-value">{site.serviceSummary.total}</p>
                </div>

                <div className="rounded-[16px] border border-[rgba(24,22,16,0.08)] bg-white/58 px-3 py-2.5">
                  <p className="table-label">{content.watchlist.serviceAlerts}</p>
                  <p
                    className={`mt-1 text-lg font-semibold ${
                      site.serviceSummary.alerts > 0 ? "text-[#a32626]" : "text-(--ink)"
                    }`}
                  >
                    {site.serviceSummary.alerts}
                  </p>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </section>
  );
}
