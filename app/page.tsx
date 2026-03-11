import dashboardContent from "@/content/dashboard.json";

function statusLabel(status: string) {
  switch (status) {
    case "healthy":
      return "Healthy";
    case "degraded":
      return "Degraded";
    case "warning":
      return "Warning";
    case "down":
      return "Down";
    default:
      return "Unknown";
  }
}

export default function Home() {
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
    <main className="min-h-screen overflow-hidden bg-[var(--page-bg)] text-[var(--ink)]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,176,96,0.2),transparent_32%),radial-gradient(circle_at_80%_20%,rgba(255,255,255,0.14),transparent_18%),linear-gradient(180deg,rgba(255,255,255,0.05),transparent_35%)]" />

      <section className="relative mx-auto flex w-full max-w-7xl flex-col gap-10 px-5 pb-14 pt-6 sm:px-8 lg:px-10">
        <header className="grid gap-6 rounded-[32px] border border-[var(--line)] bg-[var(--panel-strong)] p-5 shadow-[0_24px_90px_rgba(9,12,10,0.24)] backdrop-blur md:grid-cols-[1.35fr_0.95fr] md:p-8">
          <div className="flex flex-col gap-8">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.35em] text-[var(--muted)]">
                  {hero.eyebrow}
                </p>
                <h1 className="mt-3 max-w-3xl font-display text-5xl leading-[0.92] tracking-[-0.04em] text-[var(--paper)] sm:text-6xl lg:text-7xl">
                  {hero.titleLines[0]}
                  <br />
                  {hero.titleLines[1]}
                </h1>
              </div>

              <div className="hidden rounded-full border border-[var(--line)] bg-white/6 px-4 py-2 text-xs uppercase tracking-[0.28em] text-[var(--paper)] md:block">
                {hero.badge}
              </div>
            </div>

            <p className="max-w-2xl text-sm leading-7 text-[var(--soft)] sm:text-base">
              {hero.description}
            </p>

            <div className="grid gap-3 sm:grid-cols-3">
              {strategyCards.map((card) => (
                <div
                  key={card.title}
                  className={`rounded-[24px] border border-[var(--line)] p-4 ${
                    card.accent
                      ? "bg-[var(--accent)] text-[var(--accent-ink)]"
                      : "bg-black/14"
                  }`}
                >
                  <p
                    className={`text-[10px] uppercase tracking-[0.28em] ${
                      card.accent ? "opacity-70" : "text-[var(--muted)]"
                    }`}
                  >
                    {card.eyebrow}
                  </p>
                  <p className="mt-3 text-lg font-semibold">{card.title}</p>
                  <p
                    className={`mt-2 text-sm leading-6 ${
                      card.accent ? "opacity-80" : "text-[var(--soft)]"
                    }`}
                  >
                    {card.description}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-4">
            <div className="rounded-[28px] border border-[var(--line)] bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.02))] p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.32em] text-[var(--muted)]">
                    {statusPanel.eyebrow}
                  </p>
                  <p className="mt-3 max-w-[14ch] font-display text-3xl leading-tight text-[var(--paper)]">
                    {statusPanel.title}
                  </p>
                </div>
                <div className="rounded-full border border-[var(--line)] px-3 py-1 text-xs text-[var(--paper)]">
                  {hero.dateLabel}
                </div>
              </div>

              <div className="mt-6 space-y-3">
                {issueItems.map((issue) => (
                  <article
                    key={`${issue.site}-${issue.title}`}
                    className="rounded-[20px] border border-[var(--line)] bg-black/15 p-4"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="rounded-full bg-white/10 px-2.5 py-1 text-[10px] uppercase tracking-[0.24em] text-[var(--paper)]">
                        {issue.level}
                      </span>
                      <span className="text-xs text-[var(--muted)]">{issue.site}</span>
                    </div>
                    <h2 className="mt-3 text-base font-semibold text-[var(--paper)]">
                      {issue.title}
                    </h2>
                    <p className="mt-2 text-sm leading-6 text-[var(--soft)]">
                      {issue.detail}
                    </p>
                  </article>
                ))}
              </div>
            </div>

            <div className="rounded-[28px] border border-[var(--line)] bg-black/16 p-5">
              <p className="text-[10px] uppercase tracking-[0.32em] text-[var(--muted)]">
                {integrations.eyebrow}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {integrations.items.map((item) => (
                  <span
                    key={item}
                    className="rounded-full border border-[var(--line)] px-3 py-1.5 text-xs text-[var(--paper)]"
                  >
                    {item}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {metrics.map((metric) => (
            <article
              key={metric.label}
              className="rounded-[28px] border border-[var(--line-soft)] bg-[var(--panel)] p-5 shadow-[0_18px_60px_rgba(9,12,10,0.12)]"
            >
              <p className="text-[10px] uppercase tracking-[0.28em] text-[var(--muted-dark)]">
                {metric.label}
              </p>
              <p className="mt-4 font-display text-5xl leading-none tracking-[-0.05em] text-[var(--ink)]">
                {metric.value}
              </p>
              <p className="mt-3 text-sm leading-6 text-[var(--text-subtle)]">
                {metric.note}
              </p>
            </article>
          ))}
        </section>

        <section className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
          <article className="rounded-[30px] border border-[var(--line-soft)] bg-[var(--panel)] p-5 shadow-[0_18px_60px_rgba(9,12,10,0.12)] sm:p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-[10px] uppercase tracking-[0.28em] text-[var(--muted-dark)]">
                  {watchlist.eyebrow}
                </p>
                <h2 className="mt-2 font-display text-3xl text-[var(--ink)]">
                  {watchlist.title}
                </h2>
              </div>
              <p className="max-w-xl text-sm leading-6 text-[var(--text-subtle)]">
                {watchlist.description}
              </p>
            </div>

            <div className="mt-6 space-y-3">
              {sites.map((site) => (
                <article
                  key={site.name}
                  className="grid gap-4 rounded-[24px] border border-[var(--line-soft)] bg-[var(--panel-subtle)] p-4 lg:grid-cols-[1.2fr_repeat(4,minmax(0,1fr))]"
                >
                  <div>
                    <div className="flex items-center gap-3">
                      <span
                        className={`status-dot status-${site.status}`}
                        aria-hidden="true"
                      />
                      <h3 className="text-base font-semibold text-[var(--ink)]">
                        {site.name}
                      </h3>
                    </div>
                    <p className="mt-2 text-sm text-[var(--text-subtle)]">
                      {statusLabel(site.status)}
                    </p>
                  </div>

                  <div>
                    <p className="table-label">Uptime</p>
                    <p className="table-value">{site.uptime}</p>
                  </div>
                  <div>
                    <p className="table-label">Response</p>
                    <p className="table-value">{site.response}</p>
                  </div>
                  <div>
                    <p className="table-label">SSL</p>
                    <p className="table-value">{site.ssl}</p>
                  </div>
                  <div>
                    <p className="table-label">DNS / Domain</p>
                    <p className="table-value">{site.dns}</p>
                  </div>
                </article>
              ))}
            </div>
          </article>

          <div className="grid gap-4">
            <article className="rounded-[30px] border border-[var(--line-soft)] bg-[var(--panel)] p-5 shadow-[0_18px_60px_rgba(9,12,10,0.12)] sm:p-6">
              <p className="text-[10px] uppercase tracking-[0.28em] text-[var(--muted-dark)]">
                {trendPanel.eyebrow}
              </p>
              <div className="mt-2 flex items-end justify-between gap-4">
                <h2 className="font-display text-3xl text-[var(--ink)]">
                  {trendPanel.title}
                </h2>
                <span className="rounded-full bg-[var(--accent-soft)] px-3 py-1 text-xs text-[var(--accent-ink)]">
                  {trendPanel.tag}
                </span>
              </div>

              <div className="mt-6 flex h-52 items-end gap-3">
                {trendBars.map((bar) => (
                  <div key={bar.day} className="flex flex-1 flex-col items-center gap-3">
                    <div
                      className="w-full rounded-t-[20px] bg-[linear-gradient(180deg,var(--accent),#a75d31)]"
                      style={{ height: `${bar.value}%` }}
                    />
                    <span className="text-xs uppercase tracking-[0.18em] text-[var(--muted-dark)]">
                      {bar.day}
                    </span>
                  </div>
                ))}
              </div>
            </article>

            <article className="rounded-[30px] border border-[var(--line-soft)] bg-[var(--ink)] p-5 text-[var(--paper)] shadow-[0_18px_60px_rgba(9,12,10,0.18)] sm:p-6">
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
    </main>
  );
}
