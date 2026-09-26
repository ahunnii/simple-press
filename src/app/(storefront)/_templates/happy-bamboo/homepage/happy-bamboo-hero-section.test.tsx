import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { HappyBambooHeroSection } from "./happy-bamboo-hero-section";

describe("HappyBambooHeroSection heading semantics", () => {
  it("renders the title as the page's single <h1>, welcome line as non-heading", () => {
    render(
      <HappyBambooHeroSection
        heroWelcome="Welcome to"
        heroTitle="Elevate Your Everyday"
        heroDescription="Intro copy"
        heroPrimaryButtonText="Shop Now"
        heroPrimaryButtonLink="/shop"
      />,
    );

    const h1s = screen.getAllByRole("heading", { level: 1 });
    expect(h1s).toHaveLength(1);
    expect(h1s[0]).toHaveTextContent("Elevate Your Everyday");

    expect(
      screen.queryByRole("heading", { name: "Welcome to" }),
    ).not.toBeInTheDocument();
    expect(screen.getByText("Welcome to")).toBeInTheDocument();
  });

  it("renders a brand-gradient empty state (no <img>) when no hero image is saved", () => {
    const { container } = render(
      <HappyBambooHeroSection
        heroWelcome="Welcome to"
        heroTitle="Elevate Your Everyday"
        heroDescription="Intro copy"
        heroPrimaryButtonText="Shop Now"
        heroPrimaryButtonLink="/shop"
      />,
    );

    expect(container.querySelector("img")).not.toBeInTheDocument();
  });
});
