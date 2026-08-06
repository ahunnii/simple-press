import { notFound } from "next/navigation";

import { api } from "~/trpc/server";
import { ACCOUNT_PATHS, SETTINGS_VIEW_PATHS } from "~/lib/auth-paths";

import { getTemplate } from "../../_templates/registry";

export const dynamicParams = false;

export const metadata = {
  title: "Account",
  robots: { index: false, follow: false },
};

/**
 * Prerender exactly the two account views this page can render.
 *
 * Driven off `ACCOUNT_PATHS` — the same constant that configures
 * `viewPaths.settings` on `<AuthProvider>` — so the routes that exist and the
 * routes the auth UI links to cannot drift apart.
 *
 * This previously mapped over the legacy library's `accountViewPaths`, which
 * also contained `teams`, `api-keys`, and `organizations`. With
 * `dynamicParams = false` those were prerendered as real routes, and since the
 * component only ever branched on "security", all three silently served the
 * *settings* page. They now correctly 404.
 */
export function generateStaticParams() {
  return ACCOUNT_PATHS.map((path) => ({ path }));
}

type Props = {
  params: Promise<{ path: string }>;
};

export default async function AccountPage({ params }: Props) {
  const { path } = await params;
  const business = await api.business.simplifiedGet();
  if (!business) notFound();

  const t = getTemplate(business.templateId);

  if (path === SETTINGS_VIEW_PATHS.security) {
    return <t.AccountSecurityPage />;
  }
  return <t.AccountSettingsPage />;
}
