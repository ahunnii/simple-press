import { redirect } from "next/navigation";

/**
 * Tax Guide moved into the combined "Finances" page.
 * Kept as a redirect so bookmarks and older links keep working.
 */
export default function TaxGuidePage() {
  redirect("/admin/finances/tax-guide");
}
