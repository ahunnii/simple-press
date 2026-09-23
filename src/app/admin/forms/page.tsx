import Link from "next/link";
import { ClipboardList, Plus } from "lucide-react";

import { rethrowTrpcForErrorBoundary } from "~/lib/trpc/rethrow-trpc-error";
import { api } from "~/trpc/server";
import { Button } from "~/components/ui/button";

import { AdminEmpty } from "../_components/admin-empty";
import { TrailHeader } from "../_components/trail-header";
import { FormsList } from "./_components/forms-list";

const BASE_PATH = "/admin/forms";

/**
 * No filters, no sort, no pagination — same call `QuoteCalculatorsPage`
 * makes (see its comment): a form is authored once and edited for months,
 * not a record set an owner scrolls through. `form.list` already returns
 * newest-updated first.
 */
export default async function FormsPage() {
  const forms = await api.form.list().catch(rethrowTrpcForErrorBoundary);

  return (
    <>
      <TrailHeader breadcrumbs={[{ label: "Forms" }]} />

      <div className="admin-container">
        <div className="admin-header">
          <div>
            <h1>Forms</h1>
            <p>
              Build custom forms — applications, intake, sign-ups — and embed
              them in any page.
            </p>
          </div>
          <Button asChild>
            <Link href={`${BASE_PATH}/new`}>
              <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
              New form
            </Link>
          </Button>
        </div>

        {forms.length === 0 ? (
          <AdminEmpty
            icon={ClipboardList}
            title="No forms yet"
            description="Create one to start collecting submissions."
            action={
              <Button asChild>
                <Link href={`${BASE_PATH}/new`}>Create form</Link>
              </Button>
            }
          />
        ) : (
          <FormsList forms={forms} />
        )}
      </div>
    </>
  );
}

export const metadata = {
  title: "Forms",
};
