import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import CreateCampaignPage from "@/app/create/page";
import CampaignsDiscoveryPage from "@/app/campaigns/page";
import { useWalletStore } from "@/stores/walletStore";
import { ToastProvider } from "@/components/ui/toast";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
  useParams: () => ({ id: "1" }),
}));

function renderWithToast(ui: React.ReactNode) {
  return render(<ToastProvider>{ui}</ToastProvider>);
}

describe("Campaign Creation & Discovery Flow", () => {
  beforeEach(() => {
    useWalletStore.getState().disconnect();
  });

  it("renders campaign creation form with all required inputs", async () => {
    await act(async () => {
      renderWithToast(<CreateCampaignPage />);
    });

    expect(screen.getByText(/Launch a Micro-Funding Campaign/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/e.g. Solar Study Lights/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Describe what your community campaign is about/i)).toBeInTheDocument();
    expect(screen.getByText(/Connect Wallet to Create/i)).toBeInTheDocument();
  });

  it("updates live preview card as inputs change", async () => {
    await act(async () => {
      renderWithToast(<CreateCampaignPage />);
    });

    const titleInput = screen.getByPlaceholderText(/e.g. Solar Study Lights/i);
    await act(async () => {
      fireEvent.change(titleInput, { target: { value: "Community Solar Lights" } });
    });

    expect(screen.getAllByText("Community Solar Lights").length).toBeGreaterThan(0);
  });

  it("shows error validation when submitting short title or description", async () => {
    // Connect wallet
    useWalletStore.getState().setWallet("GBZCR2Z4UGP5J44N64C72BMSN657XQ4F4J4B7W4UGQO676S47M4UGW5M", "freighter", "Freighter", "testnet");

    const { container } = renderWithToast(<CreateCampaignPage />);

    const titleInput = screen.getByPlaceholderText(/e.g. Solar Study Lights/i);
    await act(async () => {
      fireEvent.change(titleInput, { target: { value: "Ab" } });
    });

    const form = container.querySelector("form")!;
    await act(async () => {
      fireEvent.submit(form);
    });

    expect(screen.getByText(/Please provide a title with at least 5 characters/i)).toBeInTheDocument();
  });

  it("renders campaign discovery page with search and category filters", async () => {
    await act(async () => {
      renderWithToast(<CampaignsDiscoveryPage />);
    });

    expect(screen.getByText(/Discover Active Campaigns/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Search campaigns by keyword/i)).toBeInTheDocument();
    expect(screen.getAllByText("Education").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Environment").length).toBeGreaterThan(0);
  });
});
