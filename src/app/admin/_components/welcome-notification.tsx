"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { api } from "~/trpc/react";
import {
  Alert,
  AlertAction,
  AlertDescription,
  AlertTitle,
} from "~/components/ui/alert";
import { Button } from "~/components/ui/button";

export default function WelcomeNotification() {
  const { data: business } = api.business.simplifiedGet.useQuery();

  if (business?.customDomain || !business) {
    return null;
  }
  return (
    <Alert variant="default" className="mx-auto my-6 w-full max-w-3xl">
      <AlertTitle>Almost there!</AlertTitle>
      <AlertDescription>
        <p>Complete setup to start selling.</p>{" "}
      </AlertDescription>
      <AlertAction>
        <Button variant="outline" asChild size="xs">
          <Link href="/admin/welcome">
            Finish setup <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </AlertAction>
    </Alert>
  );
}
