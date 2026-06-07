import type { TiptapJSON } from "~/components/tiptap-renderer";
import type { RouterOutputs } from "~/trpc/react";
import { PageTransition } from "~/components/page-animations";
import { PlatformPolicyNotice } from "~/components/platform-policy-notice";
import { TiptapRenderer } from "~/components/tiptap-renderer";

import {
  SLEDGE_PROSE,
  SledgePageHeader,
  SledgePageSection,
} from "./shared/sledge-page-layout";

type Props = {
  page: NonNullable<RouterOutputs["content"]["getPageBySlug"]>;
};

export function SledgeGenericPage({ page }: Props) {
  const isPolicyPage = page.type === "policy";

  return (
    <PageTransition>
      <SledgePageHeader
        title={page.title}
        eyebrow={isPolicyPage ? "Legal" : undefined}
        intro={page.excerpt ?? undefined}
      />

      <SledgePageSection animate>
        <TiptapRenderer
          content={page.content as TiptapJSON}
          className={SLEDGE_PROSE}
        />
        <PlatformPolicyNotice slug={page.slug} />
      </SledgePageSection>
    </PageTransition>
  );
}
