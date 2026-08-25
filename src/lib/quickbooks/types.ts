import type {
  QboConnectionStatus,
  QboDepositMode,
  QboInvoiceKind,
  QboInvoiceStatus,
} from "~/lib/validators/quickbooks";

/**
 * Minimal QuickBooks Online (QBO) wire shapes — only the fields this
 * integration actually reads or writes. Intuit's real entities carry many
 * more fields than these; adding one here should be a deliberate "we now
 * read this" decision, not a reflexive mirror of the API docs. All fields
 * beyond `Id`/`SyncToken` are optional-safe: never assume a field Intuit
 * "always" sends actually arrived.
 */

/** A `{ value, name? }` reference, e.g. `CustomerRef`, `ItemRef`. */
export type QboRef = {
  value: string;
  name?: string;
};

export type QboCustomer = {
  Id: string;
  SyncToken: string;
  DisplayName: string;
  Active?: boolean;
  PrimaryEmailAddr?: { Address?: string };
  PrimaryPhone?: { FreeFormNumber?: string };
};

export type QboAccount = {
  Id: string;
  Name: string;
  AccountType?: string;
  AccountSubType?: string;
  Active?: boolean;
};

export type QboItem = {
  Id: string;
  Name: string;
  Type?: string;
  Active?: boolean;
  IncomeAccountRef?: QboRef;
};

export type QboInvoice = {
  Id: string;
  SyncToken: string;
  DocNumber?: string;
  TotalAmt?: number;
  Balance?: number;
  DueDate?: string;
  TxnDate?: string;
  EmailStatus?: string;
  PrivateNote?: string;
  CustomerRef?: QboRef;
};

/** One entry of Intuit's `Fault.Error[]`. */
export type QboFaultError = {
  Message?: string;
  Detail?: string;
  code?: string;
  element?: string;
};

/** The error-response envelope Intuit returns for a non-2xx API call. */
export type QboFaultBody = {
  Fault?: {
    Error?: QboFaultError[];
    type?: string;
  };
  time?: string;
};

/**
 * Intuit's `/query` response envelope. Deliberately loose — `QueryResponse`
 * is a grab-bag keyed by entity name (`"Invoice"`, `"Customer"`, ...)
 * alongside paging metadata (`startPosition`/`maxResults`/`totalCount`). Read
 * it through `pickQueryRows` (mapping.ts) rather than indexing it directly.
 */
export type QboQueryResponse<T> = {
  QueryResponse?: Record<string, T[] | number | undefined> & {
    startPosition?: number;
    maxResults?: number;
    totalCount?: number;
  };
};

/**
 * Intuit wraps a single-entity create/read/update response as
 * `{ Invoice: {...}, time }` — the entity name is the key. Read it through
 * `pickEntity` (mapping.ts) rather than indexing it directly.
 */
export type QboEntityResponse<T> = Record<string, T>;

/** Response body from `QBO_TOKEN_URL` (both the initial code exchange and a refresh grant). */
export type QboTokenResponse = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  x_refresh_token_expires_in: number;
  token_type: string;
};

export type QboCompanyInfo = {
  CompanyName?: string;
  LegalName?: string;
};

// ─── Local domain types ─────────────────────────────────────────────────────
//
// These string unions are OWNED by `src/lib/validators/quickbooks.ts` — one
// source of truth for the tuple + zod schema + label map. This module just
// re-exports the derived types under the shorter, non-"Qbo"-prefixed names
// used throughout the pure QBO modules (mapping.ts, errors.ts, and the
// not-yet-built client/sync modules). Importing the TYPE from here (rather
// than every pure module importing directly from `~/lib/validators/quickbooks`)
// keeps the dependency direction one-way — pure modules depend on validators,
// never the reverse — with a single place to redirect it later if that ever
// needs to change.

export type InvoiceKind = QboInvoiceKind;
export type InvoiceStatus = QboInvoiceStatus;
export type ConnectionStatus = QboConnectionStatus;
export type DepositMode = QboDepositMode;

/** Owner-configured deposit calculation rule — see `computeDepositCents`. */
export type DepositRule = {
  depositMode: DepositMode;
  depositPercent: number;
  depositFixedCents: number;
};
