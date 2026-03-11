import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

export const siteStatusEnum = pgEnum("site_status", [
  "healthy",
  "degraded",
  "warning",
  "down",
]);

export const issueSeverityEnum = pgEnum("issue_severity", [
  "notice",
  "warning",
  "critical",
]);

export const issueTypeEnum = pgEnum("issue_type", [
  "site_down",
  "ssl_expired",
  "ssl_expiring_soon",
  "domain_expiring_soon",
  "dns_failed",
  "healthcheck_failed",
]);

export const checkMethodEnum = pgEnum("check_method", ["head", "get"]);

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  name: varchar("name", { length: 255 }),
  image: text("image"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const sites = pgTable(
  "sites",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    ownerId: uuid("owner_id").references(() => users.id, {
      onDelete: "set null",
    }),
    name: varchar("name", { length: 160 }).notNull(),
    domain: varchar("domain", { length: 255 }).notNull(),
    checkUrl: text("check_url").notNull(),
    notes: text("notes"),
    isActive: boolean("is_active").default(true).notNull(),
    status: siteStatusEnum("status").default("healthy").notNull(),
    lastCheckedAt: timestamp("last_checked_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("sites_owner_id_idx").on(table.ownerId),
    index("sites_status_idx").on(table.status),
    index("sites_active_idx").on(table.isActive),
  ],
);

export const siteChecks = pgTable(
  "site_checks",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    siteId: uuid("site_id")
      .notNull()
      .references(() => sites.id, { onDelete: "cascade" }),
    method: checkMethodEnum("method").notNull(),
    status: siteStatusEnum("status").notNull(),
    statusCode: integer("status_code"),
    responseTimeMs: integer("response_time_ms"),
    errorMessage: text("error_message"),
    checkedAt: timestamp("checked_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    meta: jsonb("meta"),
  },
  (table) => [
    index("site_checks_site_id_idx").on(table.siteId),
    index("site_checks_checked_at_idx").on(table.checkedAt),
  ],
);

export const siteSslStatus = pgTable(
  "site_ssl_status",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    siteId: uuid("site_id")
      .notNull()
      .references(() => sites.id, { onDelete: "cascade" }),
    isValid: boolean("is_valid").default(false).notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    daysRemaining: integer("days_remaining"),
    issuer: varchar("issuer", { length: 255 }),
    commonName: varchar("common_name", { length: 255 }),
    matchedDomain: boolean("matched_domain").default(true).notNull(),
    checkedAt: timestamp("checked_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("site_ssl_status_site_id_idx").on(table.siteId),
    index("site_ssl_status_expires_at_idx").on(table.expiresAt),
  ],
);

export const siteDomainStatus = pgTable(
  "site_domain_status",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    siteId: uuid("site_id")
      .notNull()
      .references(() => sites.id, { onDelete: "cascade" }),
    registrar: varchar("registrar", { length: 255 }),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    daysRemaining: integer("days_remaining"),
    autoRenewEnabled: boolean("auto_renew_enabled").default(false).notNull(),
    checkedAt: timestamp("checked_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("site_domain_status_site_id_idx").on(table.siteId),
    index("site_domain_status_expires_at_idx").on(table.expiresAt),
  ],
);

export const issues = pgTable(
  "issues",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    siteId: uuid("site_id").references(() => sites.id, {
      onDelete: "cascade",
    }),
    type: issueTypeEnum("type").notNull(),
    severity: issueSeverityEnum("severity").notNull(),
    title: varchar("title", { length: 255 }).notNull(),
    detail: text("detail"),
    isResolved: boolean("is_resolved").default(false).notNull(),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    detectedAt: timestamp("detected_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    meta: jsonb("meta"),
  },
  (table) => [
    index("issues_site_id_idx").on(table.siteId),
    index("issues_severity_idx").on(table.severity),
    index("issues_resolved_idx").on(table.isResolved),
  ],
);

export const schema = {
  users,
  sites,
  siteChecks,
  siteSslStatus,
  siteDomainStatus,
  issues,
};
