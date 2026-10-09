import { getBusinessFlags } from "~/lib/features/get-business-flags";
import { navHrefOffFlag } from "~/app/(storefront)/_components/nav";

/**
 * B2.5: an owner-editable link that points at a feature that is switched off
 * must hide its button, never swap in another destination. Returns the
 * trimmed href, or "" when it should hide (blank, or its feature is off).
 */
export async function getGatedHref(raw: string): Promise<string> {
  const target = raw.trim();
  if (!target) return "";
  const { isEnabled } = await getBusinessFlags();
  return navHrefOffFlag(target, isEnabled) === null ? target : "";
}
