import { api } from "~/trpc/server";

import { TrailHeader } from "../_components/trail-header";
import { FinanceBreakdown } from "./_components/finance-breakdown";

type Range = "7d" | "30d" | "90d" | "ytd" | "year";

const VALID_RANGES: Range[] = ["7d", "30d", "90d", "ytd", "year"];

function parseRange(raw: string | undefined): Range {
  if (raw && (VALID_RANGES as string[]).includes(raw)) {
    return raw as Range;
  }
  return "30d";
}

type Props = {
  searchParams: Promise<{ range?: string }>;
};

export default async function FinancesPage({ searchParams }: Props) {
  const params = await searchParams;
  const range = parseRange(params.range);

  const data = await api.finance.getBreakdown({ range });

  return (
    <>
      <TrailHeader breadcrumbs={[{ label: "Finances" }]} />
      <FinanceBreakdown data={data} />
    </>
  );
}

export const metadata = {
  title: "Finances",
};
