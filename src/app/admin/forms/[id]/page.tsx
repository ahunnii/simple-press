import Link from "next/link";
import { notFound } from "next/navigation";
import { TRPCError } from "@trpc/server";
import { AlertTriangle } from "lucide-react";

import { rethrowTrpcForErrorBoundary } from "~/lib/trpc/rethrow-trpc-error";
import { api } from "~/trpc/server";
import { Button } from "~/components/ui/button";

import type { FormDefinitionInput } from "../_components/builder-shared";
import { AdminEmpty } from "../../_components/admin-empty";
import { TrailHeader } from "../../_components/trail-header";
import { FormBuilder } from "../_components/form-builder";

type PageProps = {
  params: Promise<{ id: string }>;
};

const LIST_PATH = "/admin/forms";

/**
 * `form.getById` THROWS `NOT_FOUND` rather than returning null (it is
 * tenant-scoped, so "not yours" and "does not exist" are the same answer) —
 * mirrors `loadCalculator` in the quote calculator builder.
 */
async function loadForm(id: string) {
  return api.form.getById({ id }).catch((error: unknown): never => {
    if (error instanceof TRPCError && error.code === "NOT_FOUND") notFound();
    return rethrowTrpcForErrorBoundary(error);
  });
}

export default async function EditFormPage({ params }: PageProps) {
  const { id } = await params;
  const form = await loadForm(id);

  const breadcrumbs = [
    { label: "Forms", href: LIST_PATH },
    { label: form.name },
  ];

  // `form.getById` already ran the stored blob through the tolerant read
  // schema and reports whether it parsed (`definitionValid`) — a definition
  // that fails even that is real drift (a shape neither the schema nor a
  // migration knows), and gets an error state rather than a best-effort form
  // that would overwrite it on the first Save.
  if (!form.definitionValid) {
    return (
      <>
        <TrailHeader breadcrumbs={breadcrumbs} />
        <div className="admin-container">
          <AdminEmpty
            icon={AlertTriangle}
            title="This form can't be opened"
            description="Its saved setup no longer matches what the builder understands, so opening it here could overwrite it. Nothing has been lost — contact support and we'll sort it out."
            action={
              <Button variant="outline" asChild>
                <Link href={LIST_PATH}>Back to forms</Link>
              </Button>
            }
          />
        </div>
      </>
    );
  }

  return (
    <>
      <TrailHeader breadcrumbs={breadcrumbs} />
      <FormBuilder
        form={{
          id: form.id,
          name: form.name,
          published: form.published,
          // Cast: `definitionValid` guarantees this parsed against the read
          // schema, but that schema's OUTPUT type (`FormDefinition`) is not
          // literally the builder's `z.input` type — every field the two
          // disagree on is a `.default()`, always concrete after parsing.
          definition: form.definition as unknown as FormDefinitionInput,
          totalEntries: form.totalEntries,
        }}
      />
    </>
  );
}

export const generateMetadata = async ({ params }: PageProps) => {
  const { id } = await params;
  const form = await loadForm(id);
  return { title: `Edit ${form.name}` };
};
