import { getBusinessFlags } from "~/lib/features/get-business-flags";
import { GenericFeatureDisabledPage } from "~/components/shared/generic-feature-disabled-page";

type Props = {
  children: React.ReactNode;
};

export default async function AdminServicesLayout({ children }: Props) {
  const flags = await getBusinessFlags();
  if (!flags.isEnabled("services")) {
    return <GenericFeatureDisabledPage featureName="Services" />;
  }

  return <>{children}</>;
}
