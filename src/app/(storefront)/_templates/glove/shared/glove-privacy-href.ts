/**
 * Privacy policy link for consent notes: the store's own published
 * `privacy-policy` page when there is one, else the platform policy (the same
 * rule the footer uses, B10.1). Pure, so server and client code can share it.
 */
export function resolveGlovePrivacyHref(
  policyPages: readonly { slug: string }[] | undefined,
): string {
  const privacy = policyPages?.find((page) => page.slug === "privacy-policy");
  return privacy ? `/${privacy.slug}` : "/platform/policies/privacy-policy";
}
