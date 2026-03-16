import "server-only";

import tls from "node:tls";

const DEFAULT_SSL_PORT = 443;

export const DEFAULT_SSL_CHECK_TIMEOUT_MS = 10_000;

export type SiteSslCheckResult = {
  host: string;
  port: number;
  checkedAt: Date;
  isValid: boolean;
  expiresAt: Date | null;
  daysRemaining: number | null;
  issuer: string | null;
  commonName: string | null;
  matchedDomain: boolean;
  errorMessage: string | null;
};

function normalizeHost(domain: string) {
  return domain.trim().toLowerCase();
}

function parseCertificateDate(value: string | undefined) {
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

function normalizeCertificateName(
  value: string | string[] | undefined,
): string | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}

export async function performSiteSslCheck(input: {
  domain: string;
  timeoutMs?: number;
  port?: number;
}): Promise<SiteSslCheckResult> {
  const host = normalizeHost(input.domain);
  const port = input.port ?? DEFAULT_SSL_PORT;
  const timeoutMs = input.timeoutMs ?? DEFAULT_SSL_CHECK_TIMEOUT_MS;
  const checkedAt = new Date();

  return new Promise((resolve) => {
    let settled = false;

    const socket = tls.connect({
      host,
      port,
      servername: host,
      rejectUnauthorized: false,
    });

    const finish = (result: SiteSslCheckResult) => {
      if (settled) {
        return;
      }

      settled = true;
      socket.destroy();
      resolve(result);
    };

    socket.setTimeout(timeoutMs);

    socket.once("secureConnect", () => {
      const certificate = socket.getPeerCertificate();

      if (!certificate || Object.keys(certificate).length === 0) {
        finish({
          host,
          port,
          checkedAt,
          isValid: false,
          expiresAt: null,
          daysRemaining: null,
          issuer: null,
          commonName: null,
          matchedDomain: false,
          errorMessage: "No peer certificate presented",
        });
        return;
      }

      const expiresAt = parseCertificateDate(certificate.valid_to);
      const daysRemaining = getDaysRemaining(expiresAt, checkedAt);
      const matchedDomain =
        tls.checkServerIdentity(host, certificate) === undefined;
      const isExpired = expiresAt ? expiresAt.getTime() <= checkedAt.getTime() : true;

      finish({
        host,
        port,
        checkedAt,
        isValid: !isExpired,
        expiresAt,
        daysRemaining,
        issuer: normalizeCertificateName(
          certificate.issuer?.CN ?? certificate.issuer?.O,
        ),
        commonName: normalizeCertificateName(certificate.subject?.CN),
        matchedDomain,
        errorMessage: null,
      });
    });

    socket.once("timeout", () => {
      finish({
        host,
        port,
        checkedAt,
        isValid: false,
        expiresAt: null,
        daysRemaining: null,
        issuer: null,
        commonName: null,
        matchedDomain: false,
        errorMessage: `TLS handshake timed out after ${timeoutMs}ms`,
      });
    });

    socket.once("error", (error) => {
      finish({
        host,
        port,
        checkedAt,
        isValid: false,
        expiresAt: null,
        daysRemaining: null,
        issuer: null,
        commonName: null,
        matchedDomain: false,
        errorMessage: error.message,
      });
    });
  });
}
