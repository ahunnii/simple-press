import { getBusinessFlags } from "~/lib/features/get-business-flags";
import { GenericFeatureDisabledPage } from "~/components/shared/generic-feature-disabled-page";

type Props = {
  children: React.ReactNode;
};

// Finances has no flag of its own: it is available when the store takes
// payments OR donations (a donations-only store still needs its breakdown).
// Mirrors the `finances` admin-nav item and `finance.getBreakdown`'s gate.
// `GenericFeatureDisabledPage` only takes a feature name and links to the
// Features page, so name "Payments" — the flag an owner would actually turn on.
export default async function AdminFinancesLayout({ children }: Props) {
  const flags = await getBusinessFlags();
  if (!flags.isEnabled("payments") && !flags.isEnabled("donations")) {
    return <GenericFeatureDisabledPage featureName="Payments" />;
  }

  return <>{children}</>;
}
