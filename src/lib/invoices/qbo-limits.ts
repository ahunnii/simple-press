/**
 * Hard ceiling on QuickBooks invoice rows read into memory for the admin
 * invoice list and the invoice summary. Lives here (not in the quickbooks
 * router) so lib code can share it without importing a tRPC router; the router
 * re-exports it for existing callers.
 */
export const QBO_INVOICE_LIST_MAX_ROWS = 1000;
