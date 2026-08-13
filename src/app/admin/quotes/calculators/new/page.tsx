import { CalculatorBuilder } from "../_components/calculator-builder";
import { TrailHeader } from "../../../_components/trail-header";

export default function NewQuoteCalculatorPage() {
  return (
    <>
      <TrailHeader
        breadcrumbs={[
          { label: "Quotes", href: "/admin/quotes" },
          { label: "Calculators", href: "/admin/quotes/calculators" },
          { label: "New calculator" },
        ]}
      />
      <CalculatorBuilder />
    </>
  );
}

export const metadata = {
  title: "New Quote Calculator",
};
