import type { Ref } from "react";

type Props = {
  /** Pass the `honeypotRef` from `useNewsletterSignup` so `submit` can read it. */
  inputRef?: Ref<HTMLInputElement>;
};

/**
 * Spam-bot trap for the newsletter sign-up. Real visitors never see or reach
 * this field (off-screen, aria-hidden, not tabbable, autofill disabled); bots
 * that fill every input give themselves away, and the server then quietly
 * pretends the sign-up worked.
 *
 * The off-screen positioning is inline on purpose: it must hold in every
 * template, including any whose CSS doesn't ship an `sr-only` helper.
 */
export function NewsletterHoneypot({ inputRef }: Props) {
  return (
    <div
      aria-hidden="true"
      style={{
        position: "absolute",
        left: "-10000px",
        top: "auto",
        width: 1,
        height: 1,
        overflow: "hidden",
      }}
    >
      <label>
        Website
        <input
          ref={inputRef}
          type="text"
          name="website"
          tabIndex={-1}
          autoComplete="off"
          defaultValue=""
        />
      </label>
    </div>
  );
}
