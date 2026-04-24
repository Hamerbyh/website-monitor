import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

export const siteStatusEnum = pgEnum("site_status", [
  "healthy",
  "degraded",
  "warning",
  "down",
]);

export const siteTypeEnum = pgEnum("site_type", [
  "content",
  "subscription",
  "commerce",
  "tool",
  "app",
  "leadgen",
  "other",
]);

export const businessModelEnum = pgEnum("business_model", [
  "ads",
  "affiliate",
  "subscription",
  "one_time",
  "lead_generation",
  "saas",
  "internal",
  "other",
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
  "service_down",
  "search_clicks_drop",
  "search_impressions_drop",
]);

export const checkMethodEnum = pgEnum("check_method", ["head", "get"]);

export const serviceCategoryEnum = pgEnum("service_category", [
  "payment",
  "analytics",
  "email",
  "auth",
  "cdn",
  "storage",
  "search",
  "advertising",
  "automation",
  "other",
]);

export const serviceHealthEnum = pgEnum("service_health", [
  "healthy",
  "degraded",
  "warning",
  "down",
  "unknown",
]);

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  name: varchar("name", { length: 255 }),
  image: text("image"),
  emailVerified: boolean("email_verified").default(false).notNull(),
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
    siteType: siteTypeEnum("site_type").default("content").notNull(),
    businessModel: businessModelEnum("business_model")
      .default("ads")
      .notNull(),
    domain: varchar("domain", { length: 255 }).notNull(),
    checkUrl: text("check_url").notNull(),
    checkIntervalMinutes: integer("check_interval_minutes")
      .default(60)
      .notNull(),
    isStarred: boolean("is_starred").default(false).notNull(),
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
    index("sites_site_type_idx").on(table.siteType),
    index("sites_business_model_idx").on(table.businessModel),
    index("sites_status_idx").on(table.status),
    index("sites_active_idx").on(table.isActive),
  ],
);

export const sessions = pgTable(
  "sessions",
  {
    id: text("id").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    token: text("token").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("sessions_token_unique").on(table.token),
    index("sessions_user_id_idx").on(table.userId),
    index("sessions_expires_at_idx").on(table.expiresAt),
  ],
);

export const accounts = pgTable(
  "accounts",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at", {
      withTimezone: true,
    }),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at", {
      withTimezone: true,
    }),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("accounts_user_id_idx").on(table.userId),
    uniqueIndex("accounts_provider_account_unique").on(
      table.providerId,
      table.accountId,
    ),
  ],
);

export const verifications = pgTable(
  "verifications",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("verifications_identifier_idx").on(table.identifier),
    uniqueIndex("verifications_value_unique").on(table.value),
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
    lookupDomain: varchar("lookup_domain", { length: 255 }),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    daysRemaining: integer("days_remaining"),
    autoRenewEnabled: boolean("auto_renew_enabled").default(false).notNull(),
    errorMessage: text("error_message"),
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

export const siteServices = pgTable(
  "site_services",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    siteId: uuid("site_id")
      .notNull()
      .references(() => sites.id, { onDelete: "cascade" }),
    category: serviceCategoryEnum("category").notNull(),
    providerKey: varchar("provider_key", { length: 80 }).notNull(),
    displayName: varchar("display_name", { length: 160 }).notNull(),
    healthCheckUrl: text("health_check_url"),
    checkIntervalMinutes: integer("check_interval_minutes")
      .default(60)
      .notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    notes: text("notes"),
    configMeta: jsonb("config_meta"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("site_services_site_id_idx").on(table.siteId),
    index("site_services_category_idx").on(table.category),
    index("site_services_active_idx").on(table.isActive),
    uniqueIndex("site_services_site_provider_unique").on(table.siteId, table.providerKey),
  ],
);

export const siteServiceStatus = pgTable(
  "site_service_status",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    siteServiceId: uuid("site_service_id")
      .notNull()
      .references(() => siteServices.id, { onDelete: "cascade" }),
    status: serviceHealthEnum("status").default("unknown").notNull(),
    statusDetail: varchar("status_detail", { length: 255 }),
    responseTimeMs: integer("response_time_ms"),
    errorMessage: text("error_message"),
    checkedAt: timestamp("checked_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    lastSuccessAt: timestamp("last_success_at", { withTimezone: true }),
    meta: jsonb("meta"),
  },
  (table) => [
    uniqueIndex("site_service_status_service_unique").on(table.siteServiceId),
    index("site_service_status_status_idx").on(table.status),
    index("site_service_status_checked_at_idx").on(table.checkedAt),
  ],
);

export const siteServiceChecks = pgTable(
  "site_service_checks",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    siteServiceId: uuid("site_service_id")
      .notNull()
      .references(() => siteServices.id, { onDelete: "cascade" }),
    status: serviceHealthEnum("status").notNull(),
    statusCode: integer("status_code"),
    responseTimeMs: integer("response_time_ms"),
    errorMessage: text("error_message"),
    checkedAt: timestamp("checked_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    meta: jsonb("meta"),
  },
  (table) => [
    index("site_service_checks_service_id_idx").on(table.siteServiceId),
    index("site_service_checks_checked_at_idx").on(table.checkedAt),
  ],
);

export const siteSearchConsoleProperties = pgTable(
  "site_search_console_properties",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    siteId: uuid("site_id")
      .notNull()
      .references(() => sites.id, { onDelete: "cascade" }),
    propertyUrl: varchar("property_url", { length: 255 }).notNull(),
    isEnabled: boolean("is_enabled").default(true).notNull(),
    lastSyncedAt: timestamp("last_synced_at", { withTimezone: true }),
    syncStatus: varchar("sync_status", { length: 40 }),
    syncError: text("sync_error"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("site_search_console_property_site_unique").on(table.siteId),
    index("site_search_console_property_enabled_idx").on(table.isEnabled),
  ],
);

export const siteSearchConsoleDaily = pgTable(
  "site_search_console_daily",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    siteId: uuid("site_id")
      .notNull()
      .references(() => sites.id, { onDelete: "cascade" }),
    metricDate: date("metric_date", { mode: "string" }).notNull(),
    clicks: integer("clicks").default(0).notNull(),
    impressions: integer("impressions").default(0).notNull(),
    ctrBasisPoints: integer("ctr_basis_points").default(0).notNull(),
    positionMilli: integer("position_milli").default(0).notNull(),
    syncedAt: timestamp("synced_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("site_search_console_daily_site_date_unique").on(
      table.siteId,
      table.metricDate,
    ),
    index("site_search_console_daily_site_idx").on(table.siteId),
    index("site_search_console_daily_date_idx").on(table.metricDate),
  ],
);

export const schema = {
  accounts,
  users,
  sessions,
  verifications,
  sites,
  siteChecks,
  siteSslStatus,
  siteDomainStatus,
  issues,
  siteServices,
  siteServiceStatus,
  siteServiceChecks,
  siteSearchConsoleProperties,
  siteSearchConsoleDaily,
};
