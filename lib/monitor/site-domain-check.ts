import "server-only";

import { domainToASCII } from "node:url";

const IANA_RDAP_BOOTSTRAP_URL = "https://data.iana.org/rdap/dns.json";
const DEFAULT_RDAP_TIMEOUT_MS = 12_000;

type RdapBootstrapResponse = {
  services?: Array<[string[], string[]]>;
};

type RdapEvent = {
  action?: string;
  eventDate?: string;
};

type RdapEntity = {
  roles?: string[];
  vcardArray?: unknown;
  entities?: RdapEntity[];
  handle?: string;
};

type RdapDomainResponse = {
  events?: RdapEvent[];
  entities?: RdapEntity[];
};

type BootstrapCache = {
  expiresAt: number;
  data: RdapBootstrapResponse;
};

export type SiteDomainCheckResult = {
  inputDomain: string;
  lookupDomain: string;
  checkedAt: Date;
  expiresAt: Date | null;
  daysRemaining: number | null;
  registrar: string | null;
  autoRenewEnabled: boolean;
  errorMessage: string | null;
};

let bootstrapCache: BootstrapCache | null = null;

function normalizeDomain(domain: string) {
  const trimmed = domain.trim().toLowerCase();

  if (!trimmed) {
    return "";
  }

  const rawHost = (() => {
    if (trimmed.includes("://")) {
      try {
        return new URL(trimmed).hostname;
      } catch {
        return trimmed;
      }
    }

    return trimmed.split("/")[0] ?? trimmed;
  })()
    .replace(/:\d+$/, "")
    .replace(/\.+$/, "");

  return domainToASCII(rawHost) || rawHost;
}

function buildDomainCandidates(domain: string) {
  const labels = domain.split(".").filter(Boolean);
  const candidates: string[] = [];

  for (let index = 0; index < labels.length - 1; index += 1) {
    candidates.push(labels.slice(index).join("."));
  }

  return [...new Set(candidates)];
}

async function fetchWithTimeout(url: string, timeoutMs: number) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      headers: {
        accept: "application/rdap+json, application/json",
      },
      cache: "no-store",
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}

async function getBootstrapData(timeoutMs: number) {
  if (bootstrapCache && bootstrapCache.expiresAt > Date.now()) {
    return bootstrapCache.data;
  }

  const response = await fetchWithTimeout(IANA_RDAP_BOOTSTRAP_URL, timeoutMs);

  if (!response.ok) {
    throw new Error(`RDAP bootstrap request failed with ${response.status}`);
  }

  const data = (await response.json()) as RdapBootstrapResponse;

  bootstrapCache = {
    data,
    expiresAt: Date.now() + 24 * 60 * 60 * 1000,
  };

  return data;
}

function findRdapBaseUrls(domain: string, bootstrap: RdapBootstrapResponse) {
  const labels = domain.split(".");
  const services = bootstrap.services ?? [];

  for (let index = 1; index < labels.length; index += 1) {
    const suffix = labels.slice(index).join(".");

    for (const [tlds, baseUrls] of services) {
      if (tlds.includes(suffix)) {
        return baseUrls;
      }
    }
  }

  return [];
}

function parseDate(value: string | undefined) {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function getDaysRemaining(expiresAt: Date | null, checkedAt: Date) {
  if (!expiresAt) {
    return null;
  }

  return Math.ceil(
    (expiresAt.getTime() - checkedAt.getTime()) / (24 * 60 * 60 * 1000),
  );
}

function getExpirationDate(events: RdapEvent[] | undefined) {
  const expirationEvent = events?.find((event) => {
    const action = event.action?.toLowerCase().trim();

    if (!action) {
      return false;
    }

    return (
      action.includes("expir") ||
      action === "expired" ||
      action === "expiration" ||
      action === "expiration date"
    );
  });

  return parseDate(expirationEvent?.eventDate);
}

function readVcardText(vcardArray: unknown, propertyName: string) {
  if (!Array.isArray(vcardArray) || !Array.isArray(vcardArray[1])) {
    return null;
  }

  for (const entry of vcardArray[1]) {
    if (!Array.isArray(entry) || entry[0] !== propertyName) {
      continue;
    }

    const value = entry[3];
    return typeof value === "string" && value.trim() ? value.trim() : null;
  }

  return null;
}

function extractRegistrar(entities: RdapEntity[] | undefined): string | null {
  if (!entities?.length) {
    return null;
  }

  for (const entity of entities) {
    const roles = entity.roles?.map((role) => role.toLowerCase()) ?? [];

    if (roles.includes("registrar")) {
      return (
        readVcardText(entity.vcardArray, "fn") ??
        readVcardText(entity.vcardArray, "org") ??
        entity.handle ??
        null
      );
    }

    const nestedRegistrar = extractRegistrar(entity.entities);

    if (nestedRegistrar) {
      return nestedRegistrar;
    }
  }

  for (const entity of entities) {
    const fallback =
      readVcardText(entity.vcardArray, "fn") ??
      readVcardText(entity.vcardArray, "org");

    if (fallback) {
      return fallback;
    }
  }

  return null;
}

async function lookupDomainAtBaseUrl(input: {
  baseUrl: string;
  domain: string;
  timeoutMs: number;
}) {
  const response = await fetchWithTimeout(
    `${input.baseUrl.replace(/\/+$/, "")}/domain/${encodeURIComponent(input.domain)}`,
    input.timeoutMs,
  );

  if (response.status === 400 || response.status === 404 || response.status === 422) {
    return null;
  }

  if (!response.ok) {
    throw new Error(`RDAP lookup failed with ${response.status}`);
  }

  return (await response.json()) as RdapDomainResponse;
}

export async function performSiteDomainCheck(input: {
  domain: string;
  timeoutMs?: number;
}): Promise<SiteDomainCheckResult> {
  const timeoutMs = input.timeoutMs ?? DEFAULT_RDAP_TIMEOUT_MS;
  const normalizedDomain = normalizeDomain(input.domain);
  const checkedAt = new Date();

  if (!normalizedDomain) {
    return {
      inputDomain: input.domain,
      lookupDomain: input.domain,
      checkedAt,
      expiresAt: null,
      daysRemaining: null,
      registrar: null,
      autoRenewEnabled: false,
      errorMessage: "Domain is empty",
    };
  }

  try {
    const bootstrap = await getBootstrapData(timeoutMs);
    const candidates = buildDomainCandidates(normalizedDomain);
    let lastErrorMessage: string | null = null;

    for (const candidate of candidates) {
      const baseUrls = findRdapBaseUrls(candidate, bootstrap);

      for (const baseUrl of baseUrls) {
        let rdapRecord: RdapDomainResponse | null = null;

        try {
          rdapRecord = await lookupDomainAtBaseUrl({
            baseUrl,
            domain: candidate,
            timeoutMs,
          });
        } catch (error) {
          lastErrorMessage =
            error instanceof Error ? error.message : "Unknown RDAP lookup error";
          continue;
        }

        if (!rdapRecord) {
          continue;
        }

        const expiresAt = getExpirationDate(rdapRecord.events);

        return {
          inputDomain: normalizedDomain,
          lookupDomain: candidate,
          checkedAt,
          expiresAt,
          daysRemaining: getDaysRemaining(expiresAt, checkedAt),
          registrar: extractRegistrar(rdapRecord.entities),
          autoRenewEnabled: false,
          errorMessage: null,
        };
      }
    }

    return {
      inputDomain: normalizedDomain,
      lookupDomain: normalizedDomain,
      checkedAt,
      expiresAt: null,
      daysRemaining: null,
      registrar: null,
      autoRenewEnabled: false,
      errorMessage: lastErrorMessage ?? "No RDAP service returned a domain record",
    };
  } catch (error) {
    return {
      inputDomain: normalizedDomain,
      lookupDomain: normalizedDomain,
      checkedAt,
      expiresAt: null,
      daysRemaining: null,
      registrar: null,
      autoRenewEnabled: false,
      errorMessage: error instanceof Error ? error.message : "Unknown RDAP lookup error",
    };
  }
}
