/**
 * Split a display name ("Ada Lovelace", "Cher", "", null) into the
 * `Customer.firstName` / `Customer.lastName` pair.
 *
 * Four call sites used to inline `name?.split(" ")[0]` and
 * `name?.split(" ").slice(1).join(" ")`, and they disagreed on what to store
 * when a half was missing: some wrote `""`, some wrote `undefined` (which
 * Prisma leaves unset, so the nullable column becomes NULL). Both columns
 * therefore held two different spellings of "no name".
 *
 * That is not cosmetic. The admin customer list offers Name A–Z / Z–A, ordering
 * on these columns with `nulls: "last"` so nameless customers sit at the end of
 * both directions. NULL obeys that; `""` does not — it is an ordinary value
 * that sorts before every real name ascending and after every one descending.
 * With both spellings present, nameless customers land at *both* ends of the
 * same list, and flipping the sort moves each group to the opposite end.
 *
 * So: exactly one spelling of missing, and it is `null`.
 *
 * Note this deliberately uses `||` rather than `??` on the last-name join —
 * `Array.join` returns `""`, never nullish, and `""` is precisely the value
 * being rejected.
 */
export function splitCustomerName(name: string | null | undefined): {
  firstName: string | null;
  lastName: string | null;
} {
  // Filtering empties (rather than a bare `split(" ")`) also collapses runs of
  // whitespace, so "Ada  Lovelace" doesn't yield a first name of "Ada" and a
  // last name of " Lovelace".
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);

  return {
    firstName: parts[0] ?? null,
    lastName: parts.slice(1).join(" ") || null,
  };
}
