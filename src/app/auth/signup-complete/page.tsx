"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle, Loader2, XCircle } from "lucide-react";

import { authClient } from "~/server/better-auth/client";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";

function SignupCompleteContent() {
  const router = useRouter();
  const { data: session } = authClient.useSession();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<"loading" | "success" | "error">(
    "loading",
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const completeSignup = async () => {
      const token = searchParams.get("token");

      if (!token) {
        setStatus("error");
        setError("Missing signup token");
        return;
      }

      if (!session) {
        setStatus("error");
        setError("You are not logged in");
        return;
      }

      try {
        // Exchange token for session
        const response = await fetch("/api/signup/verify-token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });

        if (!response.ok) {
          const data = (await response.json()) as { error: string };
          throw new Error(data.error ?? "Failed to verify signup");
        }

        const data = (await response.json()) as { success: boolean };

        if (!data.success) {
          throw new Error("Signup verification failed");
        }

        // Successfully verified and logged in
        setStatus("success");

        // Redirect to welcome page after a brief delay
        setTimeout(() => {
          router.push("/admin/welcome");
        }, 1500);
      } catch (err: unknown) {
        console.error("Signup verification error:", err);
        setStatus("error");
        setError(
          err instanceof Error ? err.message : "Failed to verify signup",
        );
      }
    };

    void completeSignup();
  }, [searchParams, router, session]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>
            {status === "loading" && "Verifying your account..."}
            {status === "success" && "Welcome!"}
            {status === "error" && "Something went wrong"}
          </CardTitle>
          <CardDescription>
            {status === "loading" &&
              "Please wait while we set up your dashboard"}
            {status === "success" && "Taking you to your store dashboard"}
            {status === "error" &&
              "There was a problem setting up your account"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center gap-4">
            {status === "loading" && (
              <>
                <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
                <p className="text-sm text-gray-600">
                  Setting up your dashboard...
                </p>
              </>
            )}

            {status === "success" && (
              <>
                <CheckCircle className="h-12 w-12 text-green-600" />
                <p className="text-sm text-gray-600">
                  Your store is ready! Redirecting...
                </p>
              </>
            )}

            {status === "error" && (
              <>
                <XCircle className="h-12 w-12 text-red-600" />
                <p className="mb-4 text-sm text-red-600">{error}</p>
                <div className="flex gap-2">
                  <Button
                    onClick={() =>
                      router.push("/auth/sign-in?redirectTo=/admin/welcome")
                    }
                  >
                    Try Logging In
                  </Button>
                  <Button variant="outline" onClick={() => router.push("/")}>
                    Go Home
                  </Button>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function SignupCompleteFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Verifying your account...</CardTitle>
          <CardDescription>
            Please wait while we set up your dashboard
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function SignupCompletePage() {
  return (
    <Suspense fallback={<SignupCompleteFallback />}>
      <SignupCompleteContent />
    </Suspense>
  );
}
