import "dotenv/config";

import { hashPassword } from "better-auth/crypto";
import postgres from "postgres";

const baseUrl = process.env.SMOKE_BASE_URL ?? process.env.BETTER_AUTH_URL ?? "http://localhost:3000";
const smokeEmail = process.env.SMOKE_EMAIL ?? "smoke-admin@example.com";
const smokePassword = process.env.SMOKE_PASSWORD ?? "smoke-pass-123";
const smokeName = process.env.SMOKE_NAME ?? "Smoke Admin";
const cronSecret = process.env.MONITOR_CRON_SECRET;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required.");
}

const sql = postgres(process.env.DATABASE_URL);
const results = [];

function logResult(status, label, detail) {
  results.push({ status, label, detail });
  const prefix = status === "pass" ? "PASS" : status === "warn" ? "WARN" : "FAIL";
  console.log(`${prefix} ${label}${detail ? `: ${detail}` : ""}`);
}

function assert(condition, label, detail) {
  if (!condition) {
    logResult("fail", label, detail);
    return false;
  }

  logResult("pass", label, detail);
  return true;
}

async function ensureSmokeUser() {
  const passwordHash = await hashPassword(smokePassword);
  const now = new Date();

  const users = await sql`
    insert into users (email, name, image, email_verified, created_at, updated_at)
    values (${smokeEmail.toLowerCase()}, ${smokeName}, null, true, ${now}, ${now})
    on conflict (email)
    do update set
      name = excluded.name,
      email_verified = true,
      updated_at = excluded.updated_at
    returning id
  `;

  const userId = users[0]?.id;

  await sql`
    insert into accounts (
      id,
      account_id,
      provider_id,
      user_id,
      password,
      created_at,
      updated_at
    )
    values (${crypto.randomUUID()}, ${userId}, 'credential', ${userId}, ${passwordHash}, ${now}, ${now})
    on conflict (provider_id, account_id)
    do update set
      password = excluded.password,
      updated_at = excluded.updated_at
  `;

  return userId;
}

async function ensureSmokeSite(ownerId) {
  const now = new Date();
  const siteName = "Smoke Test Site";
  const rows = await sql`
    select id
    from sites
    where name = ${siteName}
    order by created_at asc
    limit 1
  `;

  if (rows[0]?.id) {
    await sql`
      update sites
      set
        owner_id = ${ownerId},
        site_type = 'content',
        business_model = 'ads',
        domain = 'example.com',
        check_url = 'https://example.com',
        check_interval_minutes = 60,
        is_starred = false,
        notes = 'Smoke test site',
        is_active = true,
        updated_at = ${now}
      where id = ${rows[0].id}
    `;

    return rows[0].id;
  }

  const inserted = await sql`
    insert into sites (
      owner_id,
      name,
      site_type,
      business_model,
      domain,
      check_url,
      check_interval_minutes,
      is_starred,
      notes,
      is_active,
      status,
      created_at,
      updated_at
    )
    values (
      ${ownerId},
      ${siteName},
      'content',
      'ads',
      'example.com',
      'https://example.com',
      60,
      false,
      'Smoke test site',
      true,
      'healthy',
      ${now},
      ${now}
    )
    returning id
  `;

  return inserted[0].id;
}

async function ensureSmokeService(siteId) {
  const now = new Date();
  const providerKey = "smoke-example";
  const rows = await sql`
    select id
    from site_services
    where site_id = ${siteId} and provider_key = ${providerKey}
    limit 1
  `;

  if (rows[0]?.id) {
    await sql`
      update site_services
      set
        category = 'other',
        display_name = 'Smoke Example Service',
        health_check_url = 'https://example.com',
        check_interval_minutes = 60,
        is_active = true,
        notes = 'Smoke test service',
        updated_at = ${now}
      where id = ${rows[0].id}
    `;

    return rows[0].id;
  }

  const inserted = await sql`
    insert into site_services (
      site_id,
      category,
      provider_key,
      display_name,
      health_check_url,
      check_interval_minutes,
      is_active,
      notes,
      created_at,
      updated_at
    )
    values (
      ${siteId},
      'other',
      ${providerKey},
      'Smoke Example Service',
      'https://example.com',
      60,
      true,
      'Smoke test service',
      ${now},
      ${now}
    )
    returning id
  `;

  return inserted[0].id;
}

async function request(path, input = {}) {
  const response = await fetch(`${baseUrl}${path}`, input);
  const text = await response.text();

  return {
    response,
    text,
    json: () => JSON.parse(text),
  };
}

function getCookieHeader(response) {
  const setCookies = response.headers.getSetCookie?.() ?? [];
  return setCookies.map((cookie) => cookie.split(";")[0]).join("; ");
}

async function main() {
  const ownerId = await ensureSmokeUser();
  const siteId = await ensureSmokeSite(ownerId);
  const serviceId = await ensureSmokeService(siteId);

  const unauthHome = await fetch(`${baseUrl}/`, { redirect: "manual" });
  assert(
    unauthHome.status === 307 && unauthHome.headers.get("location") === "/login",
    "Unauthenticated home redirect",
    `${unauthHome.status} -> ${unauthHome.headers.get("location")}`,
  );

  const unauthSites = await fetch(`${baseUrl}/sites`, { redirect: "manual" });
  assert(
    unauthSites.status === 307 && unauthSites.headers.get("location") === "/login",
    "Unauthenticated sites redirect",
    `${unauthSites.status} -> ${unauthSites.headers.get("location")}`,
  );

  const login = await fetch(`${baseUrl}/api/auth/sign-in/email`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin: baseUrl,
      referer: `${baseUrl}/login`,
    },
    body: JSON.stringify({
      email: smokeEmail,
      password: smokePassword,
    }),
  });

  const loginText = await login.text();
  const loginJson = JSON.parse(loginText);
  const cookieHeader = getCookieHeader(login);

  assert(login.status === 200, "Login request", `status=${login.status}`);
  assert(Boolean(cookieHeader), "Login session cookie", cookieHeader || "missing");
  assert(loginJson.user?.email === smokeEmail, "Login response payload", loginJson.user?.email);

  const authHeaders = {
    cookie: cookieHeader,
  };

  const authHome = await fetch(`${baseUrl}/`, { headers: authHeaders, redirect: "manual" });
  assert(authHome.status === 200, "Authenticated home page", `status=${authHome.status}`);

  const authSites = await fetch(`${baseUrl}/sites`, { headers: authHeaders, redirect: "manual" });
  assert(authSites.status === 200, "Authenticated sites page", `status=${authSites.status}`);

  const siteDetail = await fetch(`${baseUrl}/sites/${siteId}`, {
    headers: authHeaders,
    redirect: "manual",
  });
  const siteDetailText = await siteDetail.text();
  assert(siteDetail.status === 200, "Site detail page", `status=${siteDetail.status}`);
  assert(
    siteDetailText.includes("刷新域名信息") && siteDetailText.includes("Issue 历史"),
    "Site detail content",
    "contains domain refresh and issue history",
  );

  const filteredIssuePage = await fetch(
    `${baseUrl}/sites/${siteId}?issueType=domain_expiring_soon`,
    {
      headers: authHeaders,
      redirect: "manual",
    },
  );
  assert(
    filteredIssuePage.status === 200,
    "Issue history filtered page",
    `status=${filteredIssuePage.status}`,
  );

  const adhocCheck = await request("/api/monitor/check", {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({
      url: "https://example.com",
    }),
  });
  const adhocJson = adhocCheck.json();
  assert(
    adhocCheck.response.status === 200 && adhocJson.ok === true && adhocJson.mode === "adhoc",
    "Adhoc monitor check API",
    `status=${adhocCheck.response.status}`,
  );

  const siteCheck = await request("/api/monitor/check", {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({
      siteId,
    }),
  });
  const siteCheckJson = siteCheck.json();
  assert(
    siteCheck.response.status === 200 && siteCheckJson.ok === true && siteCheckJson.mode === "site",
    "Site monitor check API",
    `status=${siteCheck.response.status}`,
  );
  assert(Boolean(siteCheckJson.sslResult), "Site SSL check result", siteCheckJson.sslResult?.host);
  assert(
    Object.hasOwn(siteCheckJson, "domainResult"),
    "Site RDAP check result",
    siteCheckJson.domainResult?.lookupDomain ?? "present",
  );

  const [siteCheckRows, sslRows, domainRows] = await Promise.all([
    sql`select count(*)::int as count from site_checks where site_id = ${siteId}`,
    sql`select count(*)::int as count from site_ssl_status where site_id = ${siteId}`,
    sql`select count(*)::int as count from site_domain_status where site_id = ${siteId}`,
  ]);

  assert(siteCheckRows[0].count > 0, "Site check persisted", `count=${siteCheckRows[0].count}`);
  assert(sslRows[0].count > 0, "SSL status persisted", `count=${sslRows[0].count}`);
  assert(domainRows[0].count > 0, "Domain status persisted", `count=${domainRows[0].count}`);

  if (cronSecret) {
    await sql`
      update sites
      set last_checked_at = now()
      where id = ${siteId}
    `;

    await sql`
      delete from site_service_status
      where site_service_id = ${serviceId}
    `;

    const dueCheck = await request("/api/monitor/check-due", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-monitor-cron-secret": cronSecret,
      },
      body: JSON.stringify({}),
    });
    const dueJson = dueCheck.json();
    assert(
      dueCheck.response.status === 200 && dueJson.ok === true,
      "Due monitor batch API",
      `status=${dueCheck.response.status}`,
    );
    assert(
      typeof dueJson.serviceCheckedCount === "number",
      "Due monitor service batch result",
      `serviceCheckedCount=${dueJson.serviceCheckedCount}`,
    );

    const [serviceStatusRows, serviceCheckRows] = await Promise.all([
      sql`select count(*)::int as count from site_service_status where site_service_id = ${serviceId}`,
      sql`select count(*)::int as count from site_service_checks where site_service_id = ${serviceId}`,
    ]);

    assert(
      serviceStatusRows[0].count > 0,
      "Service status persisted",
      `count=${serviceStatusRows[0].count}`,
    );
    assert(
      serviceCheckRows[0].count > 0,
      "Service check history persisted",
      `count=${serviceCheckRows[0].count}`,
    );
  } else {
    logResult("warn", "Due monitor batch API", "MONITOR_CRON_SECRET is not configured");
  }

  const abortController = new AbortController();
  const timeout = setTimeout(() => abortController.abort(), 20_000);

  try {
    const checkAll = await fetch(`${baseUrl}/api/monitor/check-all`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({}),
      signal: abortController.signal,
    });

    assert(checkAll.status === 200, "Full monitor batch API", `status=${checkAll.status}`);
  } catch (error) {
    logResult(
      "warn",
      "Full monitor batch API",
      error instanceof Error ? error.message : "timed out",
    );
  } finally {
    clearTimeout(timeout);
  }

  const failed = results.filter((result) => result.status === "fail");
  const warned = results.filter((result) => result.status === "warn");

  console.log(
    `\nSummary: ${results.length - failed.length - warned.length} passed, ${warned.length} warnings, ${failed.length} failed.`,
  );

  if (failed.length > 0) {
    process.exitCode = 1;
  }
}

try {
  await main();
} finally {
  await sql.end();
}
