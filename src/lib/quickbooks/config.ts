import "server-only";

import type { QboEnvironment } from "~/lib/quickbooks/constants";
import { env } from "~/env";
import { getMainDomainUrl } from "~/lib/domain-utils";
import { QBO_API_BASE, QBO_REDIRECT_PATH } from "~/lib/quickbooks/constants";
import { QboNotConfiguredError } from "~/lib/quickbooks/errors";

/**
 * Platform-level QuickBooks Online app credentials, resolved from `~/env`.
 *
 * These are OUR Intuit app's credentials — one pair for the whole platform,
 * shared by every connected business. Per-business material (realm id, access
 * and refresh tokens) lives on `QuickBooksConnection`, never here.
 *
 * The whole integration is optional: `QBO_CLIENT_ID` / `QBO_CLIENT_SECRET` are
 * `.optional()` in `env.js`, so a deployment that never registered an Intuit
 * app boots fine and simply has QuickBooks switched off. That is why
 * `getQuickBooksConfig()` returns `null` rather than throwing — callers that
 * only need to know whether to render a "Connect QuickBooks" button ask
 * `isQuickBooksConfigured()`, and only callers about to actually talk to Intuit
 * use `requireQuickBooksConfig()`.
 */
export type QuickBooksConfig = {
  clientId: string;
  clientSecret: string;
  environment: QboEnvironment;
};

/**
 * Narrows an arbitrary stored/env string to a `QboEnvironment`, defaulting to
 * `"sandbox"`.
 *
 * Both the env var and `QuickBooksConnection.environment` are plain strings at
 * the type level (the column is `String`), so every read has to make this
 * choice. Defaulting to sandbox is the deliberate safe direction: an
 * unrecognized value pointing at the sandbox API fails loudly against a
 * throwaway company, whereas defaulting to production would aim a
 * misconfigured connection at a real business's books.
 */
export function coerceQboEnvironment(
  value: string | null | undefined,
): QboEnvironment {
  return value === "production" ? "production" : "sandbox";
}

/**
 * Returns the platform QBO app credentials, or `null` when the integration is
 * not configured for this deployment. An empty-string env var counts as unset.
 */
export function getQuickBooksConfig(): QuickBooksConfig | null {
  const clientId = env.QBO_CLIENT_ID;
  const clientSecret = env.QBO_CLIENT_SECRET;

  if (!clientId || !clientSecret) return null;

  return {
    clientId,
    clientSecret,
    environment: coerceQboEnvironment(env.QBO_ENVIRONMENT),
  };
}

/** Whether this deployment has QBO app credentials at all — cheap enough to call from a page render. */
export function isQuickBooksConfigured(): boolean {
  return getQuickBooksConfig() !== null;
}

/**
 * Same as `getQuickBooksConfig()` but throws `QboNotConfiguredError` when the
 * credentials are missing. Use this at the point of an outbound Intuit call;
 * `toTrpcError` reports it as `PRECONDITION_FAILED`, not a 500.
 */
export function requireQuickBooksConfig(): QuickBooksConfig {
  const config = getQuickBooksConfig();
  if (!config) {
    throw new QboNotConfiguredError(
      "QuickBooks is not configured for this deployment",
    );
  }
  return config;
}

/**
 * The OAuth `redirect_uri`, which must be byte-identical between the authorize
 * request and the token exchange or Intuit rejects the grant — and must also
 * match one of the redirect URIs registered on the Intuit app.
 *
 * It always resolves on the MAIN platform domain (never a tenant subdomain or
 * custom domain): one registered URI serves every business, the same reasoning
 * behind `getCallbackUrl()` for Stripe Connect.
 */
export function getQuickBooksRedirectUri(): string {
  return getMainDomainUrl(QBO_REDIRECT_PATH);
}

/** Accounting API base URL for an environment. No trailing slash — see `QBO_API_BASE`. */
export function getQboApiBase(environment: QboEnvironment): string {
  return QBO_API_BASE[environment];
}
