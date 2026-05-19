"use client";

import { useState } from "react";

const STAMPS = ["Issue 02", "Numbered 001 / 200", "Hand-finished", "Detroit cut"] as const;

export function NoiseNewsletterCta() {
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setSubscribed(true);
  };

  return (
    <section
      className="grid grid-cols-1 border-b-2 border-foreground md:grid-cols-2"
      style={{ background: "var(--vn-paper)" }}
    >
      {/* Left — newsletter form */}
      <div
        className="px-6 py-12 sm:px-10 sm:py-20 border-b border-foreground md:border-b-0 md:border-r"
        style={{ background: "var(--vn-paper)" }}
      >
        <h2
          className="font-serif italic leading-[0.92] tracking-tight mb-6"
          style={{
            fontSize: "clamp(3rem, 6vw, 5.25rem)",
            letterSpacing: "-0.02em",
          }}
        >
          Tune in.
          <br />
          Stay loud.
        </h2>
        <p
          className="font-sans text-[15px] leading-relaxed max-w-[38ch] mb-8"
          style={{ color: "var(--vn-ink-soft)" }}
        >
          One transmission a month — new looks, studio notes, capsule
          announcements. Nothing else, no static.
        </p>

        {subscribed ? (
          <div
            className="flex items-center gap-3 border-2 border-foreground px-5 py-4 max-w-[460px]"
            style={{ background: "var(--vn-ink)", color: "var(--vn-bone)" }}
          >
            <span className="font-mono text-[11px] tracking-[0.22em] uppercase">
              Subscribed ✓ — transmission incoming
            </span>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="flex border-2 border-foreground max-w-[460px]"
          >
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="YOUR@FREQUENCY.COM"
              className="flex-1 bg-transparent px-4 py-4 font-mono text-[12px] tracking-[0.12em] uppercase outline-none placeholder:opacity-40"
              required
            />
            <button
              type="submit"
              className="px-5 py-4 font-mono text-[11px] tracking-[0.22em] uppercase transition-opacity hover:opacity-80 flex-shrink-0"
              style={{ background: "var(--vn-ink)", color: "var(--vn-bone)" }}
            >
              Subscribe →
            </button>
          </form>
        )}
      </div>

      {/* Right — visit & stockists */}
      <div
        className="grid grid-cols-1 gap-8 px-8 py-12 sm:grid-cols-2 sm:px-10 sm:py-16"
        style={{ background: "var(--vn-steel)", color: "var(--vn-bone)" }}
      >
        <div>
          <h5
            className="font-mono text-[10px] tracking-[0.22em] uppercase mb-3"
            style={{ color: "var(--vn-steel-mist)" }}
          >
            Visit
          </h5>
          <p className="font-serif italic leading-[1.18]" style={{ fontSize: "clamp(1.2rem, 2vw, 1.6rem)" }}>
            By appointment, Wed–Sat. Book a fitting at the Detroit studio.
          </p>
        </div>
        <div>
          <h5
            className="font-mono text-[10px] tracking-[0.22em] uppercase mb-3"
            style={{ color: "var(--vn-steel-mist)" }}
          >
            Stockists
          </h5>
          <p className="font-serif italic leading-[1.18]" style={{ fontSize: "clamp(1.2rem, 2vw, 1.6rem)" }}>
            Eastern Market Pop-Up · Special orders shipped worldwide.
          </p>
        </div>
        <div className="sm:col-span-2 flex flex-wrap gap-2.5 mt-4">
          {STAMPS.map((s) => (
            <span
              key={s}
              className="vn-stamp"
              style={{ borderColor: "var(--vn-bone)", color: "var(--vn-bone)" }}
            >
              {s}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
