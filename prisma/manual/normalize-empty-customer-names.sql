-- normalize-empty-customer-names.sql — 2026-08-07
--
-- Rewrites empty-string Customer names to NULL, the value every current write
-- path produces for "no name given".
--
-- Why it matters: the admin customer list sorts by name with an explicit
-- `nulls: "last"` in BOTH directions (see `customer.list`'s orderByMap), so a
-- nameless customer sinks to the end of A–Z and Z–A alike. An empty string is
-- not null — it sorts first in A–Z and last in Z–A, putting the least
-- informative rows at the top of the list exactly half the time. Rows written
-- before `splitCustomerName` landed, and by the Stripe webhook while it still
-- substituted a placeholder for a missing first name, can hold "".
--
-- Hand-apply only. Nothing runs this automatically; there is no migration for
-- it, because it changes data rather than schema.
--
--   psql "$DATABASE_URL" -f prisma/manual/normalize-empty-customer-names.sql
--
-- Idempotent: a second run matches zero rows, because the first turned every ""
-- into NULL and `'' = NULL` is never true.

UPDATE "Customer" SET "firstName" = NULL WHERE "firstName" = '';
UPDATE "Customer" SET "lastName" = NULL WHERE "lastName" = '';
