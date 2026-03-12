import Link from "next/link";

import monitoringContent from "@/content/monitoring.json";
import { getSitesDashboardData } from "@/lib/monitor/site-dashboard";

export default async function DashboardPage() {
  const content = monitoringContent.home;
  const dashboard = await getSitesDashboardData();
  const hasStarredAlerts = dashboard.starredAlertSites.length > 0;

  return (
    <section className="mx-auto flex w-full max-w-none flex-col">
      <article className="relative overflow-hidden rounded-[30px] border border-(--line-soft) bg-(--panel) p-5 shadow-[0_24px_80px_rgba(9,12,10,0.12)] sm:p-6">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_18%,rgba(31,143,85,0.12),transparent_18%),radial-gradient(circle_at_50%_0%,rgba(202,138,4,0.1),transparent_16%),radial-gradient(circle_at_92%_14%,rgba(195,48,48,0.14),transparent_18%)]" />

        <div className="relative grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
          <div className="grid gap-3 sm:grid-cols-3">
            <article className="rounded-[26px] border border-[rgba(31,143,85,0.18)] bg-[linear-gradient(180deg,rgba(31,143,85,0.12),rgba(255,255,255,0.72))] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.35)]">
              <p className="text-[10px] uppercase tracking-[0.24em] text-[#1c6b43]">
                {content.totals.healthySites}
              </p>
              <p className="font-metric mt-2 text-[5.25rem] leading-none tracking-[-0.04em] text-[#1c6b43] sm:text-[6.5rem]">
                {dashboard.healthySitesCount}
              </p>
            </article>

            <article className="rounded-[26px] border border-[rgba(202,138,4,0.22)] bg-[linear-gradient(180deg,rgba(202,138,4,0.14),rgba(255,250,234,0.82))] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.35)]">
              <p className="text-[10px] uppercase tracking-[0.24em] text-[#926c00]">
                {content.totals.degradedSites}
              </p>
              <p className="font-metric mt-2 text-[5.25rem] leading-none tracking-[-0.04em] text-[#b37d00] sm:text-[6.5rem]">
                {dashboard.degradedSitesCount}
              </p>
            </article>

            <article className="rounded-[26px] border border-[rgba(195,48,48,0.22)] bg-[linear-gradient(180deg,rgba(195,48,48,0.16),rgba(255,240,240,0.9))] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.3)]">
              <p className="text-[10px] uppercase tracking-[0.24em] text-[#8a2f2f]">
                {content.totals.downSites}
              </p>
              <p className="font-metric mt-2 text-[5.25rem] leading-none tracking-[-0.04em] text-[#a32626] sm:text-[6.5rem]">
                {dashboard.downSitesCount}
              </p>
            </article>
          </div>

          <div
            className={`rounded-[28px] border p-5 ${
              hasStarredAlerts
                ? "border-[#d79b9b] bg-[linear-gradient(145deg,rgba(255,244,244,0.98),rgba(255,255,255,0.96))] text-[#7b1f1f] shadow-[0_18px_48px_rgba(120,22,22,0.12)]"
                : "border-(--line-soft) bg-white/78 text-(--ink)"
            }`}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-3">
                  <span
                    className={`h-3 w-3 rounded-full ${
                      hasStarredAlerts
                        ? "bg-[#ff6a6a] shadow-[0_0_18px_rgba(255,106,106,0.9)]"
                        : "bg-[#3f7f62]"
                    }`}
                    aria-hidden="true"
                  />
                  <p
                    className={`text-[10px] uppercase tracking-[0.28em] ${
                      hasStarredAlerts ? "text-[#b45a5a]" : "text-(--muted-dark)"
                    }`}
                  >
                    {hasStarredAlerts
                      ? content.starredAlerts.active
                      : content.starredAlerts.allClear}
                  </p>
                </div>

                <div className="mt-4 flex flex-wrap gap-3">
                  {hasStarredAlerts ? (
                    dashboard.starredAlertSites.map((site) => (
                      <span
                        key={site.id}
                        className="rounded-[18px] border border-[#d78f8f] bg-[rgba(195,48,48,0.08)] px-4 py-3 text-lg font-semibold tracking-[-0.02em] text-[#a32626]"
                      >
                        {site.name}
                      </span>
                    ))
                  ) : (
                    <span className="rounded-[18px] border border-(--line-soft) bg-white/84 px-4 py-3 text-base text-(--muted-dark)">
                      {content.starredAlerts.none}
                    </span>
                  )}
                </div>
              </div>

              <Link
                href="/sites"
                className={`rounded-full border px-4 py-2 text-xs uppercase tracking-[0.22em] transition ${
                  hasStarredAlerts
                    ? "border-[#d59a9a] bg-white text-[#8a2f2f] hover:bg-[#fff4f4]"
                    : "border-(--line-soft) bg-white text-(--ink) hover:bg-(--panel-subtle)"
                }`}
              >
                {content.actions.manageSites}
              </Link>
            </div>
          </div>
        </div>
      </article>
    </section>
  );
}
