import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import CreatorDashboardPage from "@/app/dashboard/creator/page";
import ContributorDashboardPage from "@/app/dashboard/contributor/page";
import PlatformAnalyticsPage from "@/app/analytics/page";
import SettingsPage from "@/app/settings/page";
import { useWalletStore } from "@/stores/walletStore";

describe("Dashboards, Analytics & Settings Suite", () => {
  beforeEach(() => {
    useWalletStore.getState().disconnect();
  });

  it("renders Creator Dashboard with aggregate metrics and campaigns", async () => {
    await act(async () => {
      render(<CreatorDashboardPage />);
    });

    expect(screen.getByText(/Creator Dashboard/i)).toBeInTheDocument();
    expect(screen.getByText(/Total Raised/i)).toBeInTheDocument();
    expect(screen.getByText(/Active Campaigns/i)).toBeInTheDocument();
    expect(screen.getByText(/Total Backers/i)).toBeInTheDocument();
    expect(screen.getByText(/Total Campaigns/i)).toBeInTheDocument();
  });

  it("renders Contributor Dashboard with pledge history and refund guarantees", async () => {
    await act(async () => {
      render(<ContributorDashboardPage />);
    });

    expect(screen.getByText(/My Supported Campaigns/i)).toBeInTheDocument();
    expect(screen.getByText(/Total Pledged/i)).toBeInTheDocument();
    expect(screen.getByText(/Campaigns Backed/i)).toBeInTheDocument();
    expect(screen.getByText(/Refund Protection/i)).toBeInTheDocument();
  });

  it("renders Platform Analytics with Level 4 verified ledger metrics", async () => {
    await act(async () => {
      render(<PlatformAnalyticsPage />);
    });

    expect(screen.getByText(/FundCircle Protocol Analytics/i)).toBeInTheDocument();
    expect(screen.getByText(/Total Raised/i)).toBeInTheDocument();
    expect(screen.getByText(/Contributions/i)).toBeInTheDocument();
    expect(screen.getByText(/Success Rate/i)).toBeInTheDocument();
    expect(screen.getByText(/Category Distribution/i)).toBeInTheDocument();
  });

  it("renders Settings page with network and contract addresses", async () => {
    await act(async () => {
      render(<SettingsPage />);
    });

    expect(screen.getByText(/Protocol & Network Settings/i)).toBeInTheDocument();
    expect(screen.getByText(/Wallet Status/i)).toBeInTheDocument();
    expect(screen.getByText(/Soroban Network & Contracts/i)).toBeInTheDocument();
    expect(screen.getByText(/Campaign Registry Contract:/i)).toBeInTheDocument();
    expect(screen.getByText(/Funding Escrow Contract:/i)).toBeInTheDocument();
  });
});
