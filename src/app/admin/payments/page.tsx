import { redirect } from "next/navigation";

/**
 * Payments page merged into the combined "Finances" page.
 * Kept as a redirect so bookmarks and older links keep working.
 */
export default function PaymentsPage() {
  redirect("/admin/finances");
}
