import { getBusinessFlags } from "~/lib/features/get-business-flags";
import { GenericFeatureDisabledPage } from "~/components/shared/generic-feature-disabled-page";

type Props = {
  children: React.ReactNode;
};
export default async function AdminGalleriesLayout({ children }: Props) {
  const flags = await getBusinessFlags();
  if (!flags.isEnabled("galleries")) {
    return <GenericFeatureDisabledPage featureName="Galleries" />;
  }

  return <>{children}</>;
}
