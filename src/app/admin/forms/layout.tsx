import { getBusinessFlags } from "~/lib/features/get-business-flags";
import { GenericFeatureDisabledPage } from "~/components/shared/generic-feature-disabled-page";

type Props = {
  children: React.ReactNode;
};

/**
 * Feature gate for the whole `/admin/forms` subtree, including
 * `[id]/entries` — unlike quote calculators, a form's entries have no
 * meaning without the form itself (the schema cascades their delete), so
 * there is no reason to keep the inbox reachable once the feature is off.
 */
export default async function AdminFormsLayout({ children }: Props) {
  const flags = await getBusinessFlags();
  if (!flags.isEnabled("forms")) {
    return <GenericFeatureDisabledPage featureName="Forms" />;
  }

  return <>{children}</>;
}
