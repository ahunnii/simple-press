// Client-safe helpers for the QuickBooks Online (QBO) OAuth connect flow.
// Mirrors `src/app/admin/_components/payment/stripe-connect-utils.ts` — the
// one structural difference is that `/api/quickbooks/connect/state` returns
// the fully-built Intuit authorize URL directly (`authorizeUrl`) rather than
// a signed state string for the client to assemble a URL from, since
// `QBO_CLIENT_ID` stays server-only (no `NEXT_PUBLIC_` twin). See the
// docblock on that route for the full reasoning.

export type QuickBooksStateErrorCode =
  | "unauthorized"
  | "forbidden"
  | "not_configured"
  | "feature_disabled"
  | "unknown";

export class QuickBooksConnectError extends Error {
  code: QuickBooksStateErrorCode;

  constructor(code: QuickBooksStateErrorCode, message?: string) {
    super(message ?? code);
    this.name = "QuickBooksConnectError";
    this.code = code;
  }
}

type AuthorizeUrlResponse = {
  authorizeUrl?: string;
  error?: string;
};

function errorCodeFromResponse(
  status: number,
  body: AuthorizeUrlResponse,
): QuickBooksStateErrorCode {
  if (status === 401) return "unauthorized";
  if (status === 503) return "not_configured";
  if (status === 403) {
    return body.error === "feature_disabled" ? "feature_disabled" : "forbidden";
  }
  return "unknown";
}

/**
 * POSTs to /api/quickbooks/connect/state and returns the Intuit authorize
 * URL. Throws `QuickBooksConnectError` with a code mapped from the
 * response status/body on any non-2xx response.
 */
export async function requestQuickBooksAuthorizeUrl(params: {
  businessId: string;
  returnUrl?: string;
}): Promise<string> {
  const returnUrl =
    params.returnUrl ?? window.location.href.split("?")[0] ?? "";

  const res = await fetch("/api/quickbooks/connect/state", {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ businessId: params.businessId, returnUrl }),
  });

  let data: AuthorizeUrlResponse = {};
  try {
    data = (await res.json()) as AuthorizeUrlResponse;
  } catch {
    // Non-JSON body (unexpected) — fall through to the generic error below.
  }

  if (!res.ok) {
    throw new QuickBooksConnectError(
      errorCodeFromResponse(res.status, data),
      data.error,
    );
  }

  if (!data.authorizeUrl) {
    throw new QuickBooksConnectError("unknown", "Missing authorize URL");
  }

  return data.authorizeUrl;
}

/** Convenience: request the authorize URL and navigate to it. */
export async function startQuickBooksConnect(params: {
  businessId: string;
}): Promise<void> {
  const url = await requestQuickBooksAuthorizeUrl({
    businessId: params.businessId,
  });
  window.location.href = url;
}

type DisconnectResponse = {
  success?: boolean;
  error?: string;
};

/**
 * POSTs to /api/quickbooks/connect/disconnect. Resolves when the response
 * body reports `{ success: true }`; throws otherwise.
 */
export async function disconnectQuickBooks(businessId: string): Promise<void> {
  const res = await fetch("/api/quickbooks/connect/disconnect", {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ businessId }),
  });

  let data: DisconnectResponse = {};
  try {
    data = (await res.json()) as DisconnectResponse;
  } catch {
    // Non-JSON body (unexpected) — fall through to the generic error below.
  }

  if (!res.ok || !data.success) {
    throw new Error(data.error ?? "Failed to disconnect QuickBooks");
  }
}
