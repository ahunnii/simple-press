"use client";

import React from "react";

import { ArrowRight, Check } from "lucide-react";
import { useState } from "react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";

export function CTA() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      setSubmitted(true);
    }
  };

  return (
    <section id="contact" className="py-20 md:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="bg-primary relative overflow-hidden rounded-3xl">
          <div className="from-primary-foreground/10 absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] via-transparent to-transparent" />

          <div className="relative px-8 py-16 md:px-16 md:py-24">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-primary-foreground mb-6 text-3xl font-bold text-balance md:text-4xl">
                Stay Connected with Your Neighborhood
              </h2>
              <p className="text-primary-foreground/80 mb-8 leading-relaxed">
                Get the latest updates on CCA meetings, community cleanups, and
                city resources. Join us in building a safer, cleaner, and more
                vibrant Detroit.
              </p>

              {submitted ? (
                <div className="text-primary-foreground flex items-center justify-center gap-2">
                  <div className="bg-primary-foreground/20 flex h-10 w-10 items-center justify-center rounded-full">
                    <Check className="h-5 w-5" />
                  </div>
                  <span className="font-medium">
                    {"Thank you! We'll be in touch soon."}
                  </span>
                </div>
              ) : (
                <form
                  onSubmit={handleSubmit}
                  className="mx-auto flex max-w-md flex-col gap-3 sm:flex-row"
                >
                  <Input
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="bg-primary-foreground/10 border-primary-foreground/20 text-primary-foreground placeholder:text-primary-foreground/60 focus-visible:ring-primary-foreground/30"
                    required
                  />
                  <Button
                    type="submit"
                    variant="secondary"
                    className="gap-2 whitespace-nowrap"
                  >
                    Join the Movement
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </form>
              )}

              <p className="text-primary-foreground/60 mt-4 text-xs">
                By subscribing, you agree to receive neighborhood updates.
                Unsubscribe at any time.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
