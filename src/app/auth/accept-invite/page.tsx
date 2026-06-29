import { redirect } from "next/navigation";

import { api } from "~/trpc/server";

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
    role: "OWNER" | "MANAGER";
  } | null = null;
  let errorMessage: string | null = null;

  try {
    invite = await api.team.getInvite({ code });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Invalid or expired invite";
    errorMessage = message;
  }

  return (
    <AcceptInviteClient code={code} invite={invite} errorMessage={errorMessage} />
  );
}

export const metadata = {
  title: "Accept Team Invitation",
};
