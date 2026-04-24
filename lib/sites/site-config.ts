export const SITE_TYPE_OPTIONS = [
  "content",
  "subscription",
  "commerce",
  "tool",
  "app",
  "leadgen",
  "other",
] as const;

export const BUSINESS_MODEL_OPTIONS = [
  "ads",
  "affiliate",
  "subscription",
  "one_time",
  "lead_generation",
  "saas",
  "internal",
  "other",
] as const;

export const SERVICE_CATEGORY_OPTIONS = [
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
] as const;

export type SiteTypeOption = (typeof SITE_TYPE_OPTIONS)[number];
export type BusinessModelOption = (typeof BUSINESS_MODEL_OPTIONS)[number];
export type ServiceCategoryOption = (typeof SERVICE_CATEGORY_OPTIONS)[number];
