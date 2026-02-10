"use client";

import { useState } from "react";

import { AccountDetailsStep } from "./account-details-step";
import { BusinessInfoStep } from "./business-info-step";
import { InvitationCodeStep } from "./invitation-code-step";
import { SignupProgress } from "./signup-progress";
import { StoreCustomizationStep } from "./store-customization-step";
import { TemplateSelectionStep } from "./template-selection-step";

export type SignupFormData = {
  // Invitation
  invitationCode: string;

  // Account
  email: string;
  password: string;
  name: string;

  // Business
  businessName: string;
  subdomain: string;
  customDomain?: string;

  // Template
  templateId: string;

  // Customization
  logoUrl?: string;
  heroImageUrl?: string;
  heroTitle?: string;
  heroSubtitle?: string;
  aboutText?: string;
  primaryColor?: string;
};

const STEPS = [
  { id: 1, name: "Invitation", component: InvitationCodeStep },
  { id: 2, name: "Account", component: AccountDetailsStep },
  { id: 3, name: "Business", component: BusinessInfoStep },
  { id: 4, name: "Template", component: TemplateSelectionStep },
  { id: 5, name: "Customize", component: StoreCustomizationStep },
] as const;

export function WizardClient() {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<Partial<SignupFormData>>({
    templateId: "modern", // Default template
  });

  const CurrentStepComponent = STEPS[currentStep - 1]?.component ?? null;

  const handleNext = (data: Partial<SignupFormData>) => {
    setFormData((prev) => ({ ...prev, ...data }));

    if (currentStep < STEPS.length) {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      {/* Header */}
      <header className="border-b bg-white">
        <div className="container mx-auto px-4 py-4">
          <h1 className="text-xl font-bold">Create Your Store</h1>
        </div>
      </header>

      {/* Progress Indicator */}
      <div className="border-b bg-white">
        <div className="container mx-auto px-4 py-6">
          <SignupProgress currentStep={currentStep} steps={STEPS} />
        </div>
      </div>

      {/* Form Content */}
      <main className="container mx-auto flex-1 px-4 py-8">
        <div className="mx-auto max-w-2xl">
          {CurrentStepComponent ? (
            <CurrentStepComponent
              formData={formData}
              onNext={handleNext}
              onBack={currentStep > 1 ? handleBack : undefined}
            />
          ) : null}
        </div>
      </main>
    </div>
  );
}
