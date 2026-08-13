import Link from "next/link";
import { notFound } from "next/navigation";
import { TRPCError } from "@trpc/server";
import { AlertTriangle } from "lucide-react";

import { rethrowTrpcForErrorBoundary } from "~/lib/trpc/rethrow-trpc-error";
import { quoteCalculatorDefinitionSchema } from "~/lib/validators/quote-calculator";
import { api } from "~/trpc/server";
import { Button } from "~/components/ui/button";

import { CalculatorBuilder } from "../_components/calculator-builder";
import { AdminEmpty } from "../../../_components/admin-empty";
import { TrailHeader } from "../../../_components/trail-header";

type PageProps = {
  params: Promise<{ id: string }>;
};

const LIST_PATH = "/admin/quotes/calculators";

/**
 * `quoteCalculator.getById` THROWS `NOT_FOUND` rather than returning null (it
 * is tenant-scoped, so "not yours" and "does not exist" are the same answer),
 * which is why this cannot use the bare `.catch(rethrowTrpcForErrorBoundary)`
 * that the Events pages use — that would route a missing id to the error
 * boundary instead of a 404. Everything else still goes to the boundary.
 */
async function loadCalculator(id: string) {
  return api.quoteCalculator.getById({ id }).catch((error: unknown): never => {
    if (error instanceof TRPCError && error.code === "NOT_FOUND") notFound();
    return rethrowTrpcForErrorBoundary(error);
  });
}

export default async function EditQuoteCalculatorPage({ params }: PageProps) {
  const { id } = await params;
  const calculator = await loadCalculator(id);

  const breadcrumbs = [
    { label: "Quotes", href: "/admin/quotes" },
    { label: "Calculators", href: LIST_PATH },
    { label: calculator.name },
  ];

  // The stored `definition` is an untyped JSON column, so it has to be proven
  // before it can seed a typed form.
  //
  // A failure here is drift — a definition written by an older shape, or edited
  // in the database — and it gets an error state rather than a best-effort
  // form. Seeding the builder with the parts that happened to parse would look
  // like it worked, and the first Save would write that lossy version over the
  // owner's real one. Refusing to open it keeps the stored definition intact
  // until a developer can look at it.
  const parsed = quoteCalculatorDefinitionSchema.safeParse(
    calculator.definition,
  );

  if (!parsed.success) {
    return (
      <>
        <TrailHeader breadcrumbs={breadcrumbs} />
        <div className="admin-container">
          <AdminEmpty
            icon={AlertTriangle}
            title="This calculator can't be opened"
            description="Its saved setup no longer matches what the builder understands, so opening it here could overwrite it. Nothing has been lost — contact support and we'll sort it out."
            action={
              <Button variant="outline" asChild>
                <Link href={LIST_PATH}>Back to calculators</Link>
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
      <CalculatorBuilder
        calculator={{
          id: calculator.id,
          name: calculator.name,
          published: calculator.published,
          definition: parsed.data,
        }}
      />
    </>
  );
}

export const generateMetadata = async ({ params }: PageProps) => {
  const { id } = await params;
  const calculator = await loadCalculator(id);
  return { title: `Edit ${calculator.name}` };
};
