import { getBusinessFlags } from "~/lib/features/get-business-flags";
import { GenericFeatureDisabledPage } from "~/components/shared/generic-feature-disabled-page";

type Props = {
  children: React.ReactNode;
};
export default async function AdminMediaLayout({ children }: Props) {
  const flags = await getBusinessFlags();
  if (!flags.isEnabled("media")) {
    return <GenericFeatureDisabledPage featureName="Media Library" />;
  }

  return <>{children}</>;
}
