import { getBusinessFlags } from "~/lib/features/get-business-flags";
import { GenericFeatureDisabledPage } from "~/components/shared/generic-feature-disabled-page";

type Props = {
  children: React.ReactNode;
};

/**
 * Feature gate for the calculator BUILDER subtree only.
 *
 * It deliberately sits here rather than at `/admin/quotes`: the quote inbox one
 * level up stays ungated, because turning the feature off must not hide leads a
 * business already captured. Switching `quoteCalculator` off stops new
 * calculators from being authored (and `getByIdPublic` from serving them); the
 * submissions those calculators produced remain readable in the inbox.
 */
export default async function AdminQuoteCalculatorsLayout({ children }: Props) {
  const flags = await getBusinessFlags();
  if (!flags.isEnabled("quoteCalculator")) {
    return <GenericFeatureDisabledPage featureName="Quote Calculator" />;
  }

  return <>{children}</>;
}
