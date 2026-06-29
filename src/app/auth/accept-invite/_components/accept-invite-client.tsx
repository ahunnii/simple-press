"use client";

import { useRouter } from "next/navigation";
import { CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";

import { authClient } from "~/server/better-auth/client";
import { api } from "~/trpc/react";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";

interface Props {
  code: string;
  invite: {
    businessName: string;
    email: string;
    role: "OWNER" | "MANAGER";
  } | null;
  errorMessage: string | null;
}

export function AcceptInviteClient({ code, invite, errorMessage }: Props) {
  const router = useRouter();
  const { data: session } = authClient.useSession();

  const acceptMutation = api.team.acceptInvite.useMutation({
    onSuccess: () => {
      toast.success("Invitation accepted! Redirecting to your dashboard...");
      setTimeout(() => {
        router.push("/auth/sign-in?redirect=/admin/dashboard");
      }, 1500);
    },
    onError: (err) => {
      toast.error(err.message ?? "Failed to accept invitation");
    },
  });

  const roleLabel = invite?.role === "OWNER" ? "Owner" : "Manager";

  // Error state
  if (errorMessage ?? !invite) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="flex items-center gap-2">
              <XCircle className="h-6 w-6 text-red-500" />
              <CardTitle>Invalid Invitation</CardTitle>
            </div>
            <CardDescription>
              {errorMessage ?? "This invitation link is not valid."}
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Button variant="outline" onClick={() => router.push("/")}>
              Go home
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  // Not logged in
  if (!session?.user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Team Invitation</CardTitle>
            <CardDescription>
              You&apos;ve been invited to join{" "}
              <strong>{invite.businessName}</strong> as a{" "}
              <strong>{roleLabel}</strong>.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm">
              Sign in or create an account with{" "}
              <strong>{invite.email}</strong> to accept this invitation.
            </p>
          </CardContent>
          <CardFooter className="flex gap-3">
            <Button
              onClick={() =>
                router.push(
                  `/auth/sign-in?redirect=${encodeURIComponent(`/auth/accept-invite?code=${code}`)}`,
                )
              }
            >
              Sign In
            </Button>
            <Button
              variant="outline"
              onClick={() =>
                router.push(
                  `/auth/sign-up?redirect=${encodeURIComponent(`/auth/accept-invite?code=${code}`)}`,
                )
              }
            >
              Create Account
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  // Email mismatch
  const emailsMatch =
    session.user.email.toLowerCase() === invite.email.toLowerCase();

  if (!emailsMatch) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="flex items-center gap-2">
              <XCircle className="h-6 w-6 text-amber-500" />
              <CardTitle>Wrong Account</CardTitle>
            </div>
            <CardDescription>
              This invitation was sent to <strong>{invite.email}</strong>, but
              you&apos;re signed in as <strong>{session.user.email}</strong>.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm">
              Sign in with the correct account to accept this invitation.
            </p>
          </CardContent>
          <CardFooter>
            <Button
              onClick={() =>
                router.push(
                  `/auth/sign-in?redirect=${encodeURIComponent(`/auth/accept-invite?code=${code}`)}`,
                )
              }
            >
              Sign in with different account
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  // Ready to accept
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-6 w-6 text-green-500" />
            <CardTitle>Accept Invitation</CardTitle>
          </div>
          <CardDescription>
            You&apos;ve been invited to join{" "}
            <strong>{invite.businessName}</strong> as a{" "}
            <strong>{roleLabel}</strong>.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            Click Accept to join the team. You&apos;ll need to sign in again
            after accepting so your new role is loaded.
          </p>
        </CardContent>
        <CardFooter className="flex gap-3">
          <Button
            onClick={() => acceptMutation.mutate({ code })}
            disabled={acceptMutation.isPending}
          >
            {acceptMutation.isPending ? "Accepting..." : "Accept Invitation"}
          </Button>
          <Button variant="outline" onClick={() => router.push("/")}>
            Decline
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
