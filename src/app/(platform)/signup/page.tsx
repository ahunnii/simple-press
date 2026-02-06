"use client";

import { useState } from "react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { OnboardingForm } from "../_components/onboarding-form";

export default function SignupPage() {
  const [step, setStep] = useState(1);

  if (step === 1) {
    return (
      <form onSubmit={handleVerifyCode}>
        <h2>Enter Invitation Code</h2>
        <Input name="invitationCode" placeholder="Enter your code" required />
        <Button type="submit">Continue</Button>
      </form>
    );
  }

  if (step === 2) {
    return (
      <form onSubmit={handleCreateAccount}>
        <h2>Create Your Account</h2>
        <Input name="email" type="email" placeholder="Email" required />
        <Input
          name="password"
          type="password"
          placeholder="Password"
          required
        />
        <Input name="name" placeholder="Your Name" required />
        <Button type="submit">Create Account</Button>
      </form>
    );
  }

  if (step === 3) {
    return <OnboardingForm />;
  }
}
