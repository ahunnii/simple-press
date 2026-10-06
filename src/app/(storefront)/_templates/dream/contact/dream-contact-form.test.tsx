import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { DreamContactForm } from "./dream-contact-form";

const resetSuccess = vi.fn();
const flags = { contactForm: true };

vi.mock("~/hooks/use-contact-form", () => ({
  useContactForm: () => ({
    form: { handleSubmit: () => vi.fn() },
    messageLength: 0,
    messageMaxLength: 180,
    isSubmitting: false,
    isSuccess: true,
    error: null,
    captchaToken: "",
    setCaptchaToken: vi.fn(),
    captchaRef: { current: null },
    onSubmit: vi.fn(),
    formRef: { current: null },
    resetSuccess,
    isDirty: false,
  }),
}));
vi.mock("~/hooks/use-keyboard-enter", () => ({ useKeyboardEnter: vi.fn() }));
vi.mock("~/hooks/use-dirty-form", () => ({ useDirtyForm: vi.fn() }));
vi.mock("~/providers/feature-flags-context", () => ({
  useStorefrontFlags: () => ({ isEnabled: () => flags.contactForm }),
}));

const props = {
  heading: "Ask a question",
  intro: "",
  submitLabel: "Send message",
  successHeading: "Your message is with Selest",
  successBody: "Selest will get back to you within 24 hours.",
  eventCardHeading: "Planning an event?",
  eventCardBody: "Tell Selest about your date and venue.",
  eventCardCtaLabel: "Request an Estimate Quote",
};

describe("DreamContactForm success state", () => {
  const scrollIntoView = vi.fn();

  beforeEach(() => {
    flags.contactForm = true;
    scrollIntoView.mockClear();
    Element.prototype.scrollIntoView = scrollIntoView;
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
    })) as unknown as typeof window.matchMedia;
  });

  it("focuses the success heading and scrolls the section into view", () => {
    render(<DreamContactForm {...props} />);
    const heading = screen.getByRole("heading", {
      level: 2,
      name: "Your message is with Selest",
    });
    expect(heading).toHaveFocus();
    expect(scrollIntoView).toHaveBeenCalledWith({
      block: "start",
      behavior: "smooth",
    });
  });

  it("uses instant scrolling when the visitor prefers reduced motion", () => {
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: true,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })) as unknown as typeof window.matchMedia;
    render(<DreamContactForm {...props} />);
    expect(scrollIntoView).toHaveBeenCalledWith({
      block: "start",
      behavior: "auto",
    });
  });

  it("offers a way home and a way to send another message", () => {
    render(<DreamContactForm {...props} />);
    expect(screen.getByRole("status")).toHaveTextContent(
      "Selest will get back to you within 24 hours.",
    );
    expect(screen.getByRole("link", { name: "Back to home" })).toHaveAttribute(
      "href",
      "/",
    );
    screen.getByRole("button", { name: "Send another message" }).click();
    expect(resetSuccess).toHaveBeenCalledTimes(1);
  });

  it("keeps the event card pointing at the Estimate Quote page", () => {
    render(<DreamContactForm {...props} />);
    expect(
      screen.getByRole("heading", { level: 3, name: "Planning an event?" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Request an Estimate Quote" }),
    ).toHaveAttribute("href", "/estimate");
  });

  it("renders nothing when the contact form is switched off", () => {
    flags.contactForm = false;
    const { container } = render(<DreamContactForm {...props} />);
    expect(container).toBeEmptyDOMElement();
  });
});
