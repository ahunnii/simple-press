import { redirect } from "next/navigation";

/**
 * Store Transfer moved into the combined "Data & Export" settings page.
 * Kept as a redirect so bookmarks and older links keep working.
 */
export default function StoreTransferPage() {
  redirect("/admin/settings/data");
}
