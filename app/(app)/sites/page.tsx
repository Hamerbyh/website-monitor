import { SitesPageClient } from "@/components/sites-page";
import { getServerEnv } from "@/lib/env";
import { CHECK_INTERVAL_OPTIONS } from "@/lib/monitor/site-config";
import { getSitesDashboardData } from "@/lib/monitor/site-dashboard";
import { BUSINESS_MODEL_OPTIONS, SITE_TYPE_OPTIONS } from "@/lib/sites/site-config";

export default async function SitesPage() {
  const dashboard = await getSitesDashboardData();
  const env = getServerEnv();

  return (
    <SitesPageClient
      summary={{
        totalSites: dashboard.totalSites,
        activeSitesCount: dashboard.activeSitesCount,
        alertSitesCount: dashboard.alertSitesCount,
        lastCheckedAt: dashboard.lastCheckedAt,
      }}
      intervalOptions={CHECK_INTERVAL_OPTIONS}
      intervalLabelMap={Object.fromEntries(
        CHECK_INTERVAL_OPTIONS.map((option) => [option.value, option.label]),
      )}
      siteTypeOptions={[...SITE_TYPE_OPTIONS]}
      businessModelOptions={[...BUSINESS_MODEL_OPTIONS]}
      sites={dashboard.sites}
      sslExpiringSoonDays={env.SSL_EXPIRING_SOON_DAYS}
    />
  );
}
