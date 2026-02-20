"use client";

import { Suspense, useEffect, useState } from "react";
import { CheckCircle, Loader2 } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";

function SignupCompleteContent() {
  const [countdown, setCountdown] = useState(3);

  useEffect(() => {
    // Countdown timer
    if (countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }

    // Redirect to sign-in page on the current subdomain
    if (countdown === 0) {
      const currentUrl = window.location.href;
      const url = new URL(currentUrl);
      const signInUrl = `${url.protocol}//${url.host}/auth/sign-in?redirectTo=/admin/welcome`;
      window.location.href = signInUrl;
    }
  }, [countdown]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Account Created!</CardTitle>
          <CardDescription>
            Your account has been successfully created. Redirecting to sign
            in...
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center gap-4">
            <CheckCircle className="h-12 w-12 text-green-600" />
            <p className="text-sm text-gray-600">
              Redirecting in {countdown} second{countdown !== 1 ? "s" : ""}...
            </p>
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
          <CardTitle>Account Created!</CardTitle>
          <CardDescription>
            Your account has been successfully created. Redirecting to sign
            in...
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

export function SignupCompleteClient() {
  return (
    <Suspense fallback={<SignupCompleteFallback />}>
      <SignupCompleteContent />
    </Suspense>
  );
}
