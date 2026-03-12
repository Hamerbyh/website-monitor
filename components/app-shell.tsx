"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";

import navigationContent from "@/content/navigation.json";
import uiContent from "@/content/ui.json";

type AppShellProps = {
  children: React.ReactNode;
};

type NavIconName = keyof typeof iconMap;

type NavigationItem = {
  label: string;
  href: string;
  icon: NavIconName;
  active?: boolean;
  badge?: string;
};

type NavigationSection = {
  title: string;
  items: NavigationItem[];
};

type FooterCard = {
  eyebrow: string;
  value: string;
};

const iconMap = {
  dashboard: (
    <path
      d="M4 4h6v6H4zM14 4h6v9h-6zM4 14h6v6H4zM14 16h6v4h-6z"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.6"
    />
  ),
  sites: (
    <path
      d="M3.5 7.5h17M6 4h12l2 3v11.5H4V7zm3 7h6M9 14h4"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.6"
    />
  ),
  issues: (
    <path
      d="M12 4l8 14H4L12 4zm0 5.2v3.8m0 3.2h.01"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.6"
    />
  ),
  integrations: (
    <path
      d="M7 6h4v4H7zM13 14h4v4h-4zM11 8h2v2h-2zm-2 7H7m10-6V7m-8 8v2"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.6"
    />
  ),
  trends: (
    <path
      d="M4 17l4-4 3 3 7-8M4 20h16"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.6"
    />
  ),
  settings: (
    <path
      d="M12 8.5A3.5 3.5 0 1 1 8.5 12 3.5 3.5 0 0 1 12 8.5zm0-4.5v2.2m0 11.6V20m8-8h-2.2M6.2 12H4m13.1-5.1-1.6 1.6M8.5 15.5l-1.6 1.6m0-10.2 1.6 1.6m8.6 8.6-1.6-1.6"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.6"
    />
  ),
};

function NavIcon({ icon }: { icon: keyof typeof iconMap }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4">
      {iconMap[icon]}
    </svg>
  );
}

export function AppShell({ children }: AppShellProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const pathname = usePathname();
  const ui = navigationContent.ui ?? uiContent.sidebar;
  const sections = navigationContent.sections as NavigationSection[];
  const footerCards = navigationContent.footerCards as FooterCard[];
  const header = {
    productName:
      navigationContent.ui?.headerProductName ?? uiContent.header.productName,
    productDescription:
      navigationContent.ui?.headerProductDescription ??
      uiContent.header.productDescription,
    workspaceStatus:
      navigationContent.ui?.headerWorkspaceStatus ??
      uiContent.header.workspaceStatus,
  };

  const isActiveItem = (href: string) => {
    if (href === "/") {
      return pathname === "/";
    }

    return pathname === href || pathname.startsWith(`${href}/`);
  };

  return (
    <div className="min-h-screen bg-(--page-bg) text-(--ink)">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,176,96,0.16),transparent_24%),radial-gradient(circle_at_85%_12%,rgba(255,255,255,0.1),transparent_16%),linear-gradient(180deg,rgba(255,255,255,0.05),transparent_35%)]" />

      <div className="relative flex min-h-screen">
        <aside
          className={`app-sidebar ${isCollapsed ? "app-sidebar-collapsed" : ""} ${
            isMobileOpen ? "app-sidebar-mobile-open" : ""
          }`}
        >
          <div className="flex h-full flex-col">
            <div className="flex items-center justify-between gap-3 border-b border-(--line-soft) px-3 py-3">
              <div className={`${isCollapsed ? "hidden" : "block"}`}>
                <p className="text-[11px] uppercase tracking-[0.28em] text-(--muted-dark)">
                  {ui.workspaceLabel}
                </p>
                <p className="mt-2 text-sm font-semibold text-(--ink)">
                  {navigationContent.workspace.name}
                </p>
                <p className="mt-1 text-xs text-(--text-subtle)">
                  {navigationContent.workspace.description}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsCollapsed((value) => !value)}
                className="hidden h-10 w-10 items-center justify-center rounded-2xl border border-(--line-soft) bg-white/70 text-(--ink) transition hover:bg-white md:flex"
                aria-label={
                  isCollapsed ? ui.expandAriaLabel : ui.collapseAriaLabel
                }
              >
                <span className={`sidebar-chevron ${isCollapsed ? "rotate-180" : ""}`}>
                  ‹
                </span>
              </button>

              <button
                type="button"
                onClick={() => setIsMobileOpen(false)}
                className="flex h-10 w-10 items-center justify-center rounded-2xl border border-(--line-soft) bg-white/70 text-(--ink) md:hidden"
                aria-label={ui.closeSidebarAriaLabel}
              >
                ✕
              </button>
            </div>

            <nav className="flex-1 space-y-5 px-3 py-4">
              {sections.map((section) => (
                <div key={section.title}>
                  {!isCollapsed ? (
                    <p className="px-2 text-[10px] uppercase tracking-[0.3em] text-(--muted-dark)">
                      {section.title}
                    </p>
                  ) : null}

                  <div className="mt-2 space-y-1.5">
                    {section.items.map((item) => (
                      <a
                        key={item.label}
                        href={item.href}
                        className={`sidebar-link ${isActiveItem(item.href) ? "sidebar-link-active" : ""}`}
                        onClick={() => setIsMobileOpen(false)}
                        title={item.label}
                      >
                        <span className="sidebar-icon-wrap">
                          <NavIcon icon={item.icon} />
                        </span>
                        {!isCollapsed ? (
                          <>
                            <span className="truncate text-sm">{item.label}</span>
                            {item.badge ? (
                              <span className="sidebar-badge">{item.badge}</span>
                            ) : null}
                          </>
                        ) : null}
                      </a>
                    ))}
                  </div>
                </div>
              ))}
            </nav>

            <div className="space-y-2 border-t border-(--line-soft) px-3 py-3">
              {footerCards.map((card) => (
                <div
                  key={card.eyebrow}
                  className={`rounded-[22px] border border-(--line-soft) bg-(--panel) px-3 py-3 ${
                    isCollapsed ? "text-center" : ""
                  }`}
                >
                  <p className="text-[10px] uppercase tracking-[0.25em] text-(--muted-dark)">
                    {isCollapsed ? card.eyebrow.split(" ")[0] : card.eyebrow}
                  </p>
                  <p className="mt-2 text-sm font-semibold text-(--ink)">
                    {isCollapsed ? card.value.split(" ")[0] : card.value}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </aside>

        {isMobileOpen ? (
          <button
            type="button"
            className="fixed inset-0 z-30 bg-black/30 md:hidden"
            onClick={() => setIsMobileOpen(false)}
            aria-label={ui.closeOverlayAriaLabel}
          />
        ) : null}

        <div className="app-main relative flex min-h-screen min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-20 border-b border-(--line-soft) bg-[rgba(242,236,225,0.82)] backdrop-blur">
            <div className="flex items-center justify-between gap-4 px-3 py-3 sm:px-4 lg:px-5">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setIsMobileOpen(true)}
                  className="flex h-10 w-10 items-center justify-center rounded-2xl border border-(--line-soft) bg-white/70 text-(--ink) md:hidden"
                  aria-label={ui.openSidebarAriaLabel}
                >
                  <span className="space-y-1">
                    <span className="block h-0.5 w-4 rounded-full bg-current" />
                    <span className="block h-0.5 w-4 rounded-full bg-current" />
                    <span className="block h-0.5 w-4 rounded-full bg-current" />
                  </span>
                </button>

                <div>
                  <p className="text-[11px] uppercase tracking-[0.28em] text-(--muted-dark)">
                    {header.productName}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-(--ink)">
                    {header.productDescription}
                  </p>
                </div>
              </div>

              <div className="hidden items-center gap-2 rounded-full border border-(--line-soft) bg-white/70 px-3 py-2 text-xs text-(--text-subtle) sm:flex">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                {header.workspaceStatus}
              </div>
            </div>
          </header>

          <main className="min-w-0 flex-1 px-3 py-3 sm:px-4 sm:py-4 lg:px-5 lg:py-5">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
