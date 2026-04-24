"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";

import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { issues, siteSearchConsoleProperties, siteServices, sites } from "@/lib/db/schema";
import { CHECK_INTERVAL_OPTIONS } from "@/lib/monitor/site-config";
import {
  runChecksForActiveSites,
  runSiteCheckForSite,
  runSiteDomainCheckForSite,
} from "@/lib/monitor/site-check-store";
import { syncSearchConsoleForSite } from "@/lib/monitor/site-search-console";
import { runServiceCheckForService } from "@/lib/monitor/site-service-check-store";
import {
  BUSINESS_MODEL_OPTIONS,
  SERVICE_CATEGORY_OPTIONS,
  SITE_TYPE_OPTIONS,
} from "@/lib/sites/site-config";

const allowedIntervals = CHECK_INTERVAL_OPTIONS.map((option) => option.value);

const createSiteSchema = z.object({
  name: z.string().trim().min(1).max(160),
  siteType: z.enum(SITE_TYPE_OPTIONS),
  businessModel: z.enum(BUSINESS_MODEL_OPTIONS),
  domain: z.string().trim().min(1).max(255),
  checkUrl: z.url(),
  checkIntervalMinutes: z
    .coerce
    .number()
    .int()
    .refine((value) => allowedIntervals.includes(value)),
  notes: z.string().trim().max(1000).optional(),
  isActive: z.boolean(),
  isStarred: z.boolean(),
});

const createSiteServiceSchema = z.object({
  siteId: z.uuid(),
  category: z.enum(SERVICE_CATEGORY_OPTIONS),
  providerKey: z.string().trim().min(1).max(80),
  displayName: z.string().trim().max(160).optional(),
  healthCheckUrl: z.url().optional(),
  checkIntervalMinutes: z
    .coerce
    .number()
    .int()
    .refine((value) => allowedIntervals.includes(value)),
  notes: z.string().trim().max(1000).optional(),
  isActive: z.boolean(),
});

const updateSiteServiceSchema = createSiteServiceSchema.extend({
  siteServiceId: z.uuid(),
});

const updateSiteSchema = createSiteSchema.extend({
  siteId: z.uuid(),
});

const updateSearchConsolePropertySchema = z.object({
  siteId: z.uuid(),
  propertyUrl: z.string().trim().min(1).max(255),
  isEnabled: z.boolean(),
});

export async function createSiteAction(formData: FormData) {
  const session = await requireSession();
  const parsed = createSiteSchema.parse({
    name: formData.get("name"),
    siteType: formData.get("siteType"),
    businessModel: formData.get("businessModel"),
    domain: formData.get("domain"),
    checkUrl: formData.get("checkUrl"),
    checkIntervalMinutes: formData.get("checkIntervalMinutes"),
    notes: formData.get("notes") || undefined,
    isActive: formData.get("isActive") === "on",
    isStarred: formData.get("isStarred") === "on",
  });

  const insertedSites = await db
    .insert(sites)
    .values({
      ownerId: session.user.id,
      name: parsed.name,
      siteType: parsed.siteType,
      businessModel: parsed.businessModel,
      domain: parsed.domain,
      checkUrl: parsed.checkUrl,
      checkIntervalMinutes: parsed.checkIntervalMinutes,
      isStarred: parsed.isStarred,
      notes: parsed.notes || null,
      isActive: parsed.isActive,
    })
    .returning({ id: sites.id });

  const insertedSite = insertedSites[0];

  if (parsed.isActive && insertedSite) {
    await runSiteCheckForSite({ siteId: insertedSite.id });
  }

  revalidatePath("/");
  revalidatePath("/sites");
  redirect("/sites");
}

export async function updateSiteAction(formData: FormData) {
  await requireSession();

  const parsed = updateSiteSchema.parse({
    siteId: formData.get("siteId"),
    name: formData.get("name"),
    siteType: formData.get("siteType"),
    businessModel: formData.get("businessModel"),
    domain: formData.get("domain"),
    checkUrl: formData.get("checkUrl"),
    checkIntervalMinutes: formData.get("checkIntervalMinutes"),
    notes: formData.get("notes") || undefined,
    isActive: formData.get("isActive") === "on",
    isStarred: formData.get("isStarred") === "on",
  });

  await db
    .update(sites)
    .set({
      name: parsed.name,
      siteType: parsed.siteType,
      businessModel: parsed.businessModel,
      domain: parsed.domain,
      checkUrl: parsed.checkUrl,
      checkIntervalMinutes: parsed.checkIntervalMinutes,
      notes: parsed.notes || null,
      isActive: parsed.isActive,
      isStarred: parsed.isStarred,
      updatedAt: new Date(),
    })
    .where(eq(sites.id, parsed.siteId));

  revalidatePath("/");
  revalidatePath("/sites");
  revalidatePath(`/sites/${parsed.siteId}`);
  redirect(`/sites/${parsed.siteId}`);
}

export async function createSiteServiceAction(formData: FormData) {
  await requireSession();

  const parsed = createSiteServiceSchema.parse({
    siteId: formData.get("siteId"),
    category: formData.get("category"),
    providerKey: formData.get("providerKey"),
    displayName: formData.get("displayName") || undefined,
    healthCheckUrl: formData.get("healthCheckUrl") || undefined,
    checkIntervalMinutes: formData.get("checkIntervalMinutes"),
    notes: formData.get("notes") || undefined,
    isActive: formData.get("isActive") === "on",
  });

  const providerKey = parsed.providerKey.toLowerCase();

  await db.insert(siteServices).values({
    siteId: parsed.siteId,
    category: parsed.category,
    providerKey,
    displayName: parsed.displayName || parsed.providerKey,
    healthCheckUrl: parsed.healthCheckUrl || null,
    checkIntervalMinutes: parsed.checkIntervalMinutes,
    notes: parsed.notes || null,
    isActive: parsed.isActive,
  });

  revalidatePath("/sites");
  redirect("/sites");
}

export async function runSiteServiceCheckAction(formData: FormData) {
  await requireSession();

  const siteServiceId = z.uuid().parse(formData.get("siteServiceId"));

  await runServiceCheckForService({ siteServiceId });

  revalidatePath("/");
  revalidatePath("/sites");
  redirect("/sites");
}

export async function updateSiteServiceAction(formData: FormData) {
  await requireSession();

  const parsed = updateSiteServiceSchema.parse({
    siteServiceId: formData.get("siteServiceId"),
    siteId: formData.get("siteId"),
    category: formData.get("category"),
    providerKey: formData.get("providerKey"),
    displayName: formData.get("displayName") || undefined,
    healthCheckUrl: formData.get("healthCheckUrl") || undefined,
    checkIntervalMinutes: formData.get("checkIntervalMinutes"),
    notes: formData.get("notes") || undefined,
    isActive: formData.get("isActive") === "on",
  });

  const providerKey = parsed.providerKey.toLowerCase();

  await db
    .update(siteServices)
    .set({
      siteId: parsed.siteId,
      category: parsed.category,
      providerKey,
      displayName: parsed.displayName || parsed.providerKey,
      healthCheckUrl: parsed.healthCheckUrl || null,
      checkIntervalMinutes: parsed.checkIntervalMinutes,
      notes: parsed.notes || null,
      isActive: parsed.isActive,
      updatedAt: new Date(),
    })
    .where(eq(siteServices.id, parsed.siteServiceId));

  revalidatePath("/");
  revalidatePath("/sites");
  redirect("/sites");
}

export async function deleteSiteServiceAction(formData: FormData) {
  await requireSession();

  const siteServiceId = z.uuid().parse(formData.get("siteServiceId"));

  await db.delete(siteServices).where(eq(siteServices.id, siteServiceId));

  revalidatePath("/sites");
  redirect("/sites");
}

export async function runAllChecksAction() {
  await requireSession();

  await runChecksForActiveSites();

  revalidatePath("/");
  revalidatePath("/sites");
  redirect("/sites");
}

export async function runSiteCheckAction(formData: FormData) {
  await requireSession();

  const siteId = z.uuid().parse(formData.get("siteId"));

  await runSiteCheckForSite({ siteId });

  revalidatePath("/");
  revalidatePath("/sites");
  redirect("/sites");
}

export async function runSiteDomainCheckAction(formData: FormData) {
  await requireSession();

  const siteId = z.uuid().parse(formData.get("siteId"));

  await runSiteDomainCheckForSite({ siteId });

  revalidatePath("/");
  revalidatePath("/sites");
  revalidatePath(`/sites/${siteId}`);
  redirect(`/sites/${siteId}`);
}

export async function updateSearchConsolePropertyAction(formData: FormData) {
  await requireSession();

  const parsed = updateSearchConsolePropertySchema.parse({
    siteId: formData.get("siteId"),
    propertyUrl: formData.get("propertyUrl"),
    isEnabled: formData.get("isEnabled") === "on",
  });

  const existingProperty = await db.query.siteSearchConsoleProperties.findFirst({
    where: eq(siteSearchConsoleProperties.siteId, parsed.siteId),
  });

  if (existingProperty) {
    await db
      .update(siteSearchConsoleProperties)
      .set({
        propertyUrl: parsed.propertyUrl,
        isEnabled: parsed.isEnabled,
        updatedAt: new Date(),
      })
      .where(eq(siteSearchConsoleProperties.id, existingProperty.id));
  } else {
    await db.insert(siteSearchConsoleProperties).values({
      siteId: parsed.siteId,
      propertyUrl: parsed.propertyUrl,
      isEnabled: parsed.isEnabled,
    });
  }

  revalidatePath("/");
  revalidatePath("/sites");
  revalidatePath(`/sites/${parsed.siteId}`);
  redirect(`/sites/${parsed.siteId}`);
}

export async function runSearchConsoleSyncAction(formData: FormData) {
  await requireSession();

  const siteId = z.uuid().parse(formData.get("siteId"));

  await syncSearchConsoleForSite(siteId);

  revalidatePath("/");
  revalidatePath("/sites");
  revalidatePath(`/sites/${siteId}`);
  redirect(`/sites/${siteId}`);
}

export async function deleteSiteAction(formData: FormData) {
  await requireSession();

  const siteId = z.uuid().parse(formData.get("siteId"));

  await db.delete(sites).where(eq(sites.id, siteId));

  revalidatePath("/");
  revalidatePath("/sites");
  redirect("/sites");
}

export async function toggleSiteStarAction(formData: FormData) {
  await requireSession();

  const siteId = z.uuid().parse(formData.get("siteId"));
  const nextValue = z
    .enum(["true", "false"])
    .transform((value) => value === "true")
    .parse(formData.get("nextValue"));

  await db
    .update(sites)
    .set({
      isStarred: nextValue,
      updatedAt: new Date(),
    })
    .where(eq(sites.id, siteId));

  revalidatePath("/");
  revalidatePath("/sites");
  redirect("/sites");
}

export async function resolveIssueAction(formData: FormData) {
  await requireSession();

  const issueId = z.uuid().parse(formData.get("issueId"));
  const siteId = z.uuid().parse(formData.get("siteId"));

  await db
    .update(issues)
    .set({
      isResolved: true,
      resolvedAt: new Date(),
    })
    .where(eq(issues.id, issueId));

  revalidatePath("/");
  revalidatePath("/sites");
  revalidatePath(`/sites/${siteId}`);
  redirect(`/sites/${siteId}`);
}
