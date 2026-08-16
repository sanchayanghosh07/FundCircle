import { describe, it, expect } from "vitest";
import { render, screen, act } from "@testing-library/react";
import LandingPage from "@/app/page";

describe("Landing Page Component", () => {
  it("renders hero headline and key calls to action", async () => {
    await act(async () => {
      render(<LandingPage />);
    });

    expect(
      screen.getByText(/Transparent Micro-Funding/i)
    ).toBeInTheDocument();

    expect(screen.getAllByText(/Explore Campaigns/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Start a Campaign/i).length).toBeGreaterThan(0);
  });

  it("renders Stellar & Soroban architecture trust pillars", async () => {
    await act(async () => {
      render(<LandingPage />);
    });

    expect(screen.getByText(/Smart Contract Escrow/i)).toBeInTheDocument();
    expect(screen.getByText(/Micro-Pledges at Scale/i)).toBeInTheDocument();
    expect(screen.getByText(/100% Refund Guarantee/i)).toBeInTheDocument();
  });
});
