import { redirect } from "next/navigation";

/**
 * Export to WordPress moved into the combined "Data & Export" settings page.
 * Kept as a redirect so bookmarks and older links keep working.
 */
export default function WordPressExportPage() {
  redirect("/admin/settings/data");
}
