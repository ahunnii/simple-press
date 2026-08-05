import { redirect } from "next/navigation";

import { api } from "~/trpc/server";
import { DefaultAuthShell } from "~/app/(storefront)/_templates/default/auth/default-auth-shell";

import { AcceptInviteClient } from "./_components/accept-invite-client";

interface Props {
  searchParams: Promise<{ code?: string }>;
}

export default async function AcceptInvitePage({ searchParams }: Props) {
  const { code } = await searchParams;

  if (!code) {
    redirect("/");
  }

  let invite: {
    businessName: string;
    email: string;
    role: "OWNER" | "MANAGER" | "STAFF";
  } | null = null;
  let errorMessage: string | null = null;

  try {
    invite = await api.team.getInvite({ code });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Invalid or expired invite";
    errorMessage = message;
  }

  const business = await api.business.simplifiedGet();

  // The subhead always names the *invited* business (from the invite lookup),
  // never the shell's own `business` — accept-invite is typically reached on
  // the platform root domain, where `business` is null. Fall back to generic
  // wording when the invite failed to load (no businessName available).
  const subhead = invite
    ? `Join ${invite.businessName} on SimplePress.`
    : "This invitation link may be invalid or expired.";

  return (
    <DefaultAuthShell
      business={business}
      headline="You've been invited"
      subhead={subhead}
      badgeView={null}
      legalFooter="generic"
    >
      <AcceptInviteClient
        code={code}
        invite={invite}
        errorMessage={errorMessage}
      />
    </DefaultAuthShell>
  );
}

export const metadata = {
  title: "Accept Team Invitation",
};
