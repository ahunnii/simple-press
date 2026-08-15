import { Info } from "lucide-react";

import { getBusinessFlags } from "~/lib/features/get-business-flags";
import { requireAdminAccess } from "~/lib/require-admin-access";
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import { GenericFeatureDisabledPage } from "~/components/shared/generic-feature-disabled-page";
import { HubSubNav } from "~/app/admin/_components/hub-sub-nav";

import { TrailHeader } from "../../_components/trail-header";
import { StoreTransferClient } from "./_components/store-transfer-client";
import { WordPressExportClient } from "./_components/wordpress-export-client";

export default async function DataSettingsPage() {
  const { session, membershipRole } = await requireAdminAccess();

  // `membershipRole` is null for PLATFORM_ADMIN — they have no
  // BusinessMembership row, so `requireAdminAccess` skips the membership
  // lookup for them. Treat that null as full access rather than "not an
  // owner" — mirrors the `canManage` logic in settings/team/page.tsx.
  const isPlatformAdmin = session.user.platformRole === "PLATFORM_ADMIN";
  const canExportToWordPress = isPlatformAdmin || membershipRole === "OWNER";

  const flags = await getBusinessFlags();
  const wordpressExportEnabled = flags.isEnabled("wordpressExport");

  // Store Transfer is platform-admin-only, so with the WordPress flag off
  // there is nothing on this page for a business user to see — fall back to
  // the same disabled page the old /admin/settings/wordpress-export showed.
  if (!wordpressExportEnabled && !isPlatformAdmin) {
    return <GenericFeatureDisabledPage featureName="Export to WordPress" />;
  }

  return (
    <>
      <TrailHeader
        breadcrumbs={[
          { label: "Settings", href: "/admin/settings" },
          { label: "Data & Export" },
        ]}
      />
      <HubSubNav hub="settings" />

      <div className="admin-container space-y-10">
        <div className="admin-header">
          <div>
            <h1>Data &amp; Export</h1>
            <p>Take your store content with you, in bulk</p>
          </div>
        </div>

        {/* ── Export to WordPress ──────────────────────────────────────── */}
        <section className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold">Export to WordPress</h2>
            <p className="text-muted-foreground text-sm">
              Download your store content in WordPress/WooCommerce import
              formats
            </p>
          </div>

          {!wordpressExportEnabled ? (
            // Only reachable as PLATFORM_ADMIN — business users already got
            // the disabled page above.
            <Alert>
              <Info className="h-4 w-4" />
              <AlertTitle>
                Export to WordPress is disabled for this business
              </AlertTitle>
              <AlertDescription>
                Turn the feature on in Settings → Features to make this section
                available to the store owner.
              </AlertDescription>
            </Alert>
          ) : canExportToWordPress ? (
            <WordPressExportClient isPlatformAdmin={isPlatformAdmin} />
          ) : (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertTitle>Exporting your store is Owner-only</AlertTitle>
              <AlertDescription>
                Only the store owner can download a full export of the
                store&apos;s content, products, and customer records.
              </AlertDescription>
            </Alert>
          )}
        </section>

        {/* ── Store Transfer (platform admin only) ─────────────────────── */}
        {isPlatformAdmin && (
          <section className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold">Store Transfer</h2>
              <p className="text-muted-foreground text-sm">
                Platform admin only — export a store to a SimplePress ZIP
                archive, or import one into this store
              </p>
            </div>

            <StoreTransferClient isPlatformAdmin={isPlatformAdmin} />
          </section>
        )}
      </div>
    </>
  );
}

export const metadata = {
  title: "Data & Export",
};
