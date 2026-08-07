import { getBusinessFlags } from "~/lib/features/get-business-flags";
import { GenericFeatureDisabledPage } from "~/components/shared/generic-feature-disabled-page";

type Props = {
  children: React.ReactNode;
};
export default async function AdminCustomersLayout({ children }: Props) {
  const flags = await getBusinessFlags();
  if (!flags.isEnabled("customerAccounts")) {
    return <GenericFeatureDisabledPage featureName="Customers" />;
  }

  return <>{children}</>;
}
