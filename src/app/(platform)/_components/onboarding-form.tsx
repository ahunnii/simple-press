"use client";

import { useState } from "react";
import { Input } from "~/components/ui/input";

export function OnboardingForm() {
  const [formData, setFormData] = useState({
    businessName: "",
    ownerEmail: "",
    password: "",
    templateId: "modern",
    customDomain: "",
    // ... other fields
  });

  return (
    <form onSubmit={handleSubmit}>
      <h2>Set Up Your Store</h2>

      {/* Step 1: Business Info */}
      <section>
        <h3>Business Information</h3>
        <Input
          name="businessName"
          value={formData.businessName}
          onChange={(e) =>
            setFormData({ ...formData, businessName: e.target.value })
          }
          required
        />
        <Input
          name="ownerEmail"
          type="email"
          value={formData.ownerEmail}
          onChange={(e) =>
            setFormData({ ...formData, ownerEmail: e.target.value })
          }
          required
        />
        <Input
          name="password"
          type="password"
          value={formData.password}
          required
        />
      </section>

      {/* Step 2: Choose Template */}
      <section>
        <h3>Choose Your Template</h3>
        <TemplateSelector
          selected={formData.templateId}
          onChange={(id) => setFormData({ ...formData, templateId: id })}
        />
      </section>

      {/* Step 3: Domain (optional) */}
      <section>
        <h3>Your Domain (Optional - can add later)</h3>
        <p>
          You'll get a free subdomain: {slugify(formData.businessName)}
          .myapplication.com
        </p>
        <Input
          label="Custom Domain (optional)"
          placeholder="coolbusiness.com"
          value={formData.customDomain}
          onChange={(e) =>
            setFormData({ ...formData, customDomain: e.target.value })
          }
        />
        <p className="text-sm text-gray-500">
          You can add this later if you don't have a domain yet
        </p>
      </section>

      {/* Step 4: Basic Content */}
      <section>
        <h3>Customize Your Store</h3>
        <ImageUpload label="Logo" />
        <ImageUpload label="Hero Image" />
        <Input label="Hero Title" placeholder="Welcome to our store" />
        <Textarea label="About Your Business" rows={4} />
      </section>

      <Button type="submit">Create My Store</Button>
    </form>
  );
}
