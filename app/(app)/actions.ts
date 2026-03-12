"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";

import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { sites } from "@/lib/db/schema";
import { CHECK_INTERVAL_OPTIONS } from "@/lib/monitor/site-config";
import { runChecksForActiveSites, runSiteCheckForSite } from "@/lib/monitor/site-check-store";

const allowedIntervals = CHECK_INTERVAL_OPTIONS.map((option) => option.value);

const createSiteSchema = z.object({
  name: z.string().trim().min(1).max(160),
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

export async function createSiteAction(formData: FormData) {
  const session = await requireSession();
  const parsed = createSiteSchema.parse({
    name: formData.get("name"),
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
