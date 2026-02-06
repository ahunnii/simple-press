"use client";

import { useEffect } from "react";

export function OnboardingSuccess({ redirectUrl }: { redirectUrl: string }) {
  useEffect(() => {
    // Redirect to their subdomain
    window.location.href = redirectUrl;
  }, [redirectUrl]);

  return (
    <div>
      <h2>Success! Setting up your store...</h2>
      <p>Redirecting to {redirectUrl}</p>
    </div>
  );
}
