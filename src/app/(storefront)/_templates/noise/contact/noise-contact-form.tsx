"use client";

import { useState } from "react";

import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";

export function NoiseContactForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Form submission handled by mailto or future API
    setSubmitted(true);
  };

  const labelClass = "font-sans text-[9px] tracking-[0.25em] uppercase text-foreground";
  const inputClass = "rounded-none border-border font-sans text-sm placeholder:text-muted-foreground/50";

  if (submitted) {
    return (
      <div className="border border-border p-8 text-center">
        <p className="font-serif text-2xl font-light text-foreground">Message Sent</p>
        <p className="mt-2 font-sans text-sm text-muted-foreground">
          We&apos;ll be in touch soon.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="contact-name" className={labelClass}>Name *</Label>
        <Input
          id="contact-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your name"
          required
          className={inputClass}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="contact-email" className={labelClass}>Email *</Label>
        <Input
          id="contact-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          required
          className={inputClass}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="contact-message" className={labelClass}>Message *</Label>
        <Textarea
          id="contact-message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Tell us about your inquiry..."
          required
          rows={5}
          className={inputClass}
        />
      </div>
      <Button
        type="submit"
        className="w-full rounded-none font-sans text-[10px] tracking-[0.25em] uppercase"
        size="lg"
      >
        Send Message
      </Button>
    </form>
  );
}
