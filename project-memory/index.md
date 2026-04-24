# Project Memory Index

This index groups change notes by topic so future work can find the right context quickly.

## Auth
- [2026-03-12](./changes/2026-03-12.md)
  - Better Auth integration
  - login-only flow
  - local admin creation
  - auth schema compatibility fix

## Monitoring
- [2026-03-12](./changes/2026-03-12.md)
  - first-pass server-side HTTP checks
  - single-site and batch check endpoints
  - per-site check interval storage
  - homepage monitoring overview sourced from database
  - `/sites` configuration and manual checks
  - expandable per-site check history in `/sites`
  - `GET`-only availability checks with relaxed degraded threshold
  - site deletion from `/sites`
  - site starring and starred-site priority on homepage
- [2026-03-16](./changes/2026-03-16.md)
  - site-level TLS certificate checks
  - shared cron flow for HTTP and SSL monitoring
  - `site_ssl_status` persistence and SSL issue sync
  - `/sites` certificate status and expiry details
- [2026-04-07](./changes/2026-04-07.md)
  - confirmed `sites` as the primary product entity
  - set `site_id` as the main expansion key for future modules
  - defined site-centric operations dashboard direction beyond uptime-only monitoring
  - outlined cross-site, service, and site-type-specific feature areas
  - added `site_type` and `business_model` site classification fields
  - added initial service inventory schema and `/sites` service registration UI
  - added generic service health checks and cron integration for `site_services`
  - surfaced unresolved issues and service alert counts on the homepage
  - added `/sites` filtering and inline service editing for larger site portfolios
  - refined homepage into a denser ops-console style
  - added dedicated `/sites/[siteId]` detail pages
  - added direct site editing on detail pages
  - added service management on detail pages
  - reduced `/sites` to a clearer index page
  - added manual issue resolution on detail pages
  - added RDAP-based domain expiry checks and domain expiry issue sync
  - added detail-page domain refresh action and RDAP error visibility
  - added issue history and issue-type filtering on site detail pages
  - added repeatable `npm run smoke` regression coverage for auth, pages, and monitoring flows
  - reduced remaining user-visible hardcoded copy by moving interval and SSL fallback text into `/content`
  - removed remaining hardcoded issue severity labels from app code
  - tightened homepage into a denser control-board style with less dead space
  - added first-pass Google Search Console daily metrics, sync flow, and 30-day site-detail trends
  - added Search Console auto-sync participation in the shared due-check cron flow

## Product Strategy
- [2026-04-07](./changes/2026-04-07.md)
  - site-centric product model
  - modular child-table expansion around `site_id`
  - candidate roadmap for payments, subscriptions, analytics, and service operations
  - clarified open-source repo guidance in `AGENTS.md`

## Site Inventory
- [2026-04-07](./changes/2026-04-07.md)
  - first-pass site taxonomy on `sites`
  - `site_services`, `site_service_status`, and `site_service_checks` scaffold
  - `/sites` service inventory management entry point
  - optional service health-check URL and per-service check cadence

## Dashboard UI
- [2026-03-12](./changes/2026-03-12.md)
  - dense app shell
  - collapsible sidebar
  - dashboard layout tightening
  - homepage simplified to one monitoring summary module
  - homepage reduced to colored status counts and starred alert names

## Content System
- [2026-03-12](./changes/2026-03-12.md)
  - UI copy centralized into JSON under `/content`

## Process Rules
- [2026-03-12](./changes/2026-03-12.md)
  - project memory workflow
  - privacy rule for tracked notes

## Deployment
- [2026-03-13](./changes/2026-03-13.md)
  - Dockerfile-based Dokploy deployment flow
  - container DB wait and optional schema push
  - deployment env documentation for Dokploy PostgreSQL

## Alerting
- [2026-03-13](./changes/2026-03-13.md)
  - Resend email alerts on configured site status changes
  - env-driven alert enablement, recipients, sender, and trigger statuses

## Scheduling
- [2026-03-13](./changes/2026-03-13.md)
  - due-site auto-check endpoint for Dokploy cron
  - cron-secret protected monitoring trigger
