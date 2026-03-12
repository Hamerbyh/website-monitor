import dashboardContent from "@/content/dashboard.json";
import uiContent from "@/content/ui.json";

function statusLabel(status: string) {
  switch (status) {
    case "healthy":
      return uiContent.siteStatusLabels.healthy;
    case "degraded":
      return uiContent.siteStatusLabels.degraded;
    case "warning":
      return uiContent.siteStatusLabels.warning;
    case "down":
      return uiContent.siteStatusLabels.down;
    default:
      return uiContent.siteStatusLabels.unknown;
  }
}

export default function PageContent() {
  const {
    hero,
    integrations,
    issueItems = dashboardContent.issues,
    metrics,
    roadmapPanel,
    sites,
    statusPanel,
    strategyCards,
    trendBars,
    trendPanel,
    watchlist,
  } = {
    hero: dashboardContent.hero,
    integrations: dashboardContent.integrations,
    issueItems: dashboardContent.issues,
    metrics: dashboardContent.metrics,
    roadmapPanel: dashboardContent.roadmapPanel,
    sites: dashboardContent.sites,
    statusPanel: dashboardContent.statusPanel,
    strategyCards: dashboardContent.strategyCards,
    trendBars: dashboardContent.trendBars,
    trendPanel: dashboardContent.trendPanel,
    watchlist: dashboardContent.watchlist,
  };

  return (
    <section className="mx-auto flex w-full max-w-none flex-col gap-4">
      <header className="grid gap-4 rounded-[28px] border border-(--line) bg-(--panel-strong) p-4 shadow-[0_24px_90px_rgba(9,12,10,0.24)] backdrop-blur xl:grid-cols-[minmax(0,1.7fr)_minmax(320px,1fr)] xl:p-5">
        <div className="flex flex-col gap-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-(--muted)">
                {hero.eyebrow}
              </p>
              <h1 className="mt-2 max-w-3xl font-display text-4xl leading-[0.92] tracking-[-0.04em] text-(--paper) sm:text-5xl 2xl:text-6xl">
                {hero.titleLines[0]}
                <br />
                {hero.titleLines[1]}
              </h1>
            </div>

            <div className="hidden rounded-full border border-(--line) bg-white/6 px-4 py-2 text-xs uppercase tracking-[0.28em] text-(--paper) md:block">
              {hero.badge}
            </div>
          </div>

          <p className="max-w-3xl text-sm leading-6 text-(--soft) sm:text-[15px]">
            {hero.description}
          </p>

          <div className="grid gap-3 lg:grid-cols-3">
            {strategyCards.map((card) => (
              <div
                key={card.title}
                className={`rounded-[24px] border border-(--line) p-4 ${
                  card.accent ? "bg-(--accent) text-(--accent-ink)" : "bg-black/14"
                }`}
              >
                <p
                  className={`text-[10px] uppercase tracking-[0.28em] ${
                    card.accent ? "opacity-70" : "text-(--muted)"
                  }`}
                >
                  {card.eyebrow}
                </p>
                <p className="mt-3 text-lg font-semibold">{card.title}</p>
                <p
                  className={`mt-2 text-sm leading-6 ${
                    card.accent ? "opacity-80" : "text-(--soft)"
                  }`}
                >
                  {card.description}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="grid gap-4">
          <div
            id="issues"
            className="rounded-[24px] border border-(--line) bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.02))] p-4"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] uppercase tracking-[0.32em] text-(--muted)">
                  {statusPanel.eyebrow}
                </p>
                <p className="mt-3 max-w-[14ch] font-display text-3xl leading-tight text-(--paper)">
                  {statusPanel.title}
                </p>
              </div>
              <div className="rounded-full border border-(--line) px-3 py-1 text-xs text-(--paper)">
                {hero.dateLabel}
              </div>
            </div>

            <div className="mt-4 space-y-3">
              {issueItems.map((issue) => (
                <article
                  key={`${issue.site}-${issue.title}`}
                  className="rounded-[18px] border border-(--line) bg-black/15 p-3.5"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="rounded-full bg-white/10 px-2.5 py-1 text-[10px] uppercase tracking-[0.24em] text-(--paper)">
                      {issue.level}
                    </span>
                    <span className="text-xs text-(--muted)">{issue.site}</span>
                  </div>
                  <h2 className="mt-3 text-base font-semibold text-(--paper)">
                    {issue.title}
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-(--soft)">
                    {issue.detail}
                  </p>
                </article>
              ))}
            </div>
          </div>

          <div
            id="integrations"
            className="rounded-[24px] border border-(--line) bg-black/16 p-4"
          >
            <p className="text-[10px] uppercase tracking-[0.32em] text-(--muted)">
              {integrations.eyebrow}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {integrations.items.map((item) => (
                <span
                  key={item}
                  className="rounded-full border border-(--line) px-3 py-1.5 text-xs text-(--paper)"
                >
                  {item}
                </span>
              ))}
            </div>
          </div>
        </div>
      </header>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.7fr)_minmax(320px,1fr)]">
        <div className="grid gap-4">
          <section className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-4">
            {metrics.map((metric) => (
              <article
                key={metric.label}
                className="rounded-[24px] border border-(--line-soft) bg-(--panel) p-4 shadow-[0_18px_60px_rgba(9,12,10,0.12)]"
              >
                <p className="text-[10px] uppercase tracking-[0.28em] text-(--muted-dark)">
                  {metric.label}
                </p>
                <p className="mt-3 font-display text-4xl leading-none tracking-[-0.05em] text-(--ink)">
                  {metric.value}
                </p>
                <p className="mt-2 text-sm leading-6 text-(--text-subtle)">
                  {metric.note}
                </p>
              </article>
            ))}
          </section>

          <article
            id="sites"
            className="rounded-[26px] border border-(--line-soft) bg-(--panel) p-4 shadow-[0_18px_60px_rgba(9,12,10,0.12)] sm:p-5"
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-[10px] uppercase tracking-[0.28em] text-(--muted-dark)">
                  {watchlist.eyebrow}
                </p>
                <h2 className="mt-2 font-display text-3xl text-(--ink)">
                  {watchlist.title}
                </h2>
              </div>
              <p className="max-w-xl text-sm leading-6 text-(--text-subtle)">
                {watchlist.description}
              </p>
            </div>

            <div className="mt-5 space-y-3">
              {sites.map((site) => (
                <article
                  key={site.name}
                  className="grid gap-3 rounded-[20px] border border-(--line-soft) bg-(--panel-subtle) p-3.5 xl:grid-cols-[1.3fr_repeat(4,minmax(0,1fr))]"
                >
                  <div>
                    <div className="flex items-center gap-3">
                      <span
                        className={`status-dot status-${site.status}`}
                        aria-hidden="true"
                      />
                      <h3 className="text-base font-semibold text-(--ink)">
                        {site.name}
                      </h3>
                    </div>
                    <p className="mt-2 text-sm text-(--text-subtle)">
                      {statusLabel(site.status)}
                    </p>
                  </div>

                  <div>
                    <p className="table-label">{uiContent.siteTable.uptime}</p>
                    <p className="table-value">{site.uptime}</p>
                  </div>
                  <div>
                    <p className="table-label">{uiContent.siteTable.response}</p>
                    <p className="table-value">{site.response}</p>
                  </div>
                  <div>
                    <p className="table-label">{uiContent.siteTable.ssl}</p>
                    <p className="table-value">{site.ssl}</p>
                  </div>
                  <div>
                    <p className="table-label">{uiContent.siteTable.dnsDomain}</p>
                    <p className="table-value">{site.dns}</p>
                  </div>
                </article>
              ))}
            </div>
          </article>
        </div>

        <div className="grid gap-4">
          <article
            id="trends"
            className="rounded-[26px] border border-(--line-soft) bg-(--panel) p-4 shadow-[0_18px_60px_rgba(9,12,10,0.12)] sm:p-5"
          >
            <p className="text-[10px] uppercase tracking-[0.28em] text-(--muted-dark)">
              {trendPanel.eyebrow}
            </p>
            <div className="mt-2 flex items-end justify-between gap-4">
              <h2 className="font-display text-3xl text-(--ink)">{trendPanel.title}</h2>
              <span className="rounded-full bg-(--accent-soft) px-3 py-1 text-xs text-(--accent-ink)">
                {trendPanel.tag}
              </span>
            </div>

            <div className="mt-5 flex h-44 items-end gap-2">
              {trendBars.map((bar) => (
                <div key={bar.day} className="flex flex-1 flex-col items-center gap-2">
                  <div
                    className="w-full rounded-t-[20px] bg-[linear-gradient(180deg,var(--accent),#a75d31)]"
                    style={{ height: `${bar.value}%` }}
                  />
                  <span className="text-xs uppercase tracking-[0.18em] text-(--muted-dark)">
                    {bar.day}
                  </span>
                </div>
              ))}
            </div>
          </article>

          <article
            id="settings"
            className="rounded-[26px] border border-(--line-soft) bg-(--ink) p-4 text-(--paper) shadow-[0_18px_60px_rgba(9,12,10,0.18)] sm:p-5"
          >
            <p className="text-[10px] uppercase tracking-[0.28em] text-white/50">
              {roadmapPanel.eyebrow}
            </p>
            <h2 className="mt-2 font-display text-3xl leading-tight">
              {roadmapPanel.title}
            </h2>
            <div className="mt-5 space-y-3 text-sm leading-6 text-white/72">
              {roadmapPanel.items.map((item) => (
                <p key={item}>{item}</p>
              ))}
            </div>
          </article>
        </div>
      </section>
    </section>
  );
}
