"use client";

import React, { useState } from "react";
import { ArrowRight, Check } from "lucide-react";

export function ElegantNewsletter() {
  const [email, setEmail] = useState("");
  const [isSubscribed, setIsSubscribed] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      setIsSubscribed(true);
      setEmail("");
    }
  };

  return (
    <section className="bg-primary py-24">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-primary-foreground mb-4 font-serif text-4xl leading-tight text-balance md:text-7xl">
            Join the ritual
          </h2>
          <p className="text-primary-foreground/80 mb-10 text-lg">
            Subscribe for exclusive offers, skincare tips, and early access to
            new products.
          </p>

          {isSubscribed ? (
            <div className="bg-primary-foreground/10 inline-flex items-center gap-3 rounded-full px-8 py-4 backdrop-blur-sm">
              <Check className="text-primary-foreground h-5 w-5" />
              <span className="text-primary-foreground">
                Welcome to the Boty family!
              </span>
            </div>
          ) : (
            <form
              onSubmit={handleSubmit}
              className="mx-auto flex max-w-md flex-col gap-4 sm:flex-row"
            >
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                className="bg-primary-foreground/10 border-primary-foreground/20 text-primary-foreground placeholder:text-primary-foreground/50 focus:border-primary-foreground/40 boty-transition flex-1 rounded-full border px-6 py-4 backdrop-blur-sm focus:outline-none"
                required
              />
              <button
                type="submit"
                className="group bg-primary-foreground text-primary boty-transition hover:bg-primary-foreground/90 inline-flex items-center justify-center gap-2 rounded-full px-8 py-4 text-sm tracking-wide"
              >
                Subscribe
                <ArrowRight className="boty-transition h-4 w-4 group-hover:translate-x-1" />
              </button>
            </form>
          )}

          <p className="text-primary-foreground/60 mt-6 text-sm">
            Unsubscribe anytime. We respect your inbox.
          </p>
        </div>
      </div>
    </section>
  );
}
