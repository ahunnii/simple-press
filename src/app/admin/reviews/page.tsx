import { TrailHeader } from "../_components/trail-header";
import { ReviewsAdminList } from "./_components/reviews-admin-list";

export default async function ReviewsPage() {
  return (
    <>
      <TrailHeader breadcrumbs={[{ label: "Product Reviews" }]} />
      <ReviewsAdminList />
    </>
  );
}

export const metadata = {
  title: "Product Reviews",
};
