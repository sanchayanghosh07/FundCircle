import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { CampaignCard } from "@/features/campaigns/CampaignCard";
import { Campaign } from "@/types/campaign";

const mockCampaign: Campaign = {
  id: 1,
  creator: "GBZCR2Z4UGP5J44N64C72BMSN657XQ4F4J4B7W4UGQO676S47M4UGW5M",
  metadata: {
    title: "Solar Study Lights",
    description: "Empowering rural students with clean study lights.",
    category: "Education",
    imageUrl: "https://images.fundcircle.org/solar.jpg",
  },
  targetAmount: "50000000000",
  targetAmountXlm: "5,000",
  asset: "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC",
  deadline: Math.floor(Date.now() / 1000) + 86400 * 10,
  status: "active",
  createdAt: Math.floor(Date.now() / 1000) - 86400,
  totalRaised: "25000000000",
  totalRaisedXlm: "2,500",
  contributorCount: 8,
  progressPercentage: 50,
  isExpired: false,
  canContribute: true,
  canClaimRefund: false,
  canDisburse: false,
};

describe("CampaignCard Component", () => {
  it("renders campaign title, category, and target amounts", () => {
    render(<CampaignCard campaign={mockCampaign} />);

    expect(screen.getByText("Solar Study Lights")).toBeInTheDocument();
    expect(screen.getByText("Education")).toBeInTheDocument();
    expect(screen.getByText("2,500")).toBeInTheDocument();
    expect(screen.getByText(/5,000/i)).toBeInTheDocument();
    expect(screen.getByText(/ACTIVE/i)).toBeInTheDocument();
  });
});
