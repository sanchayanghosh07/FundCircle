import { describe, it, expect } from "vitest";
import { registryService } from "@/services/stellar/registryService";
import { escrowService } from "@/services/stellar/escrowService";
import { eventIngestion } from "@/services/stellar/events";
import { CONTRACT_CONFIG } from "@/config/stellar";

describe("Contract Service Layer Integration & End-to-End Flows", () => {
  let createdCampaignId = 1;
  const testCreator = "GBZCR2Z4UGP5J44N64C72BMSN657XQ4F4J4B7W4UGQO676S47M4UGW5M";
  const testContributor = "GC7XQ4F4J4B7W4UGQO676S47M4UGW5MGBZCR2Z4UGP5J44N64C72BMSN";

  it("creates a new campaign via registryService", async () => {
    const res = await registryService.createCampaign(
      {
        title: "Community Solar Lights",
        description: "Providing solar study lights for rural off-grid students.",
        category: "Education",
        imageUrl: "https://images.unsplash.com/photo-1509391365360-2e959784a276?w=800",
        targetAmountXlm: "5000",
        asset: CONTRACT_CONFIG.nativeAssetContractId,
        deadlineDays: 14,
      },
      testCreator
    );

    expect(res.campaignId).toBeGreaterThan(0);
    createdCampaignId = res.campaignId;
  });

  it("fetches list of registered campaigns", async () => {
    const campaigns = await registryService.getAllCampaigns();
    expect(campaigns.length).toBeGreaterThan(0);
    expect(campaigns[0].metadata.title).toBeDefined();
  });

  it("fetches single campaign by ID with complete metadata", async () => {
    const campaign = await registryService.getCampaignById(createdCampaignId);
    expect(campaign).not.toBeNull();
    expect(campaign?.id).toBe(createdCampaignId);
    expect(campaign?.creator).toBeDefined();
    expect(campaign?.targetAmountXlm).toBeDefined();
  });

  it("handles contribution and updates campaign raised totals", async () => {
    const initialCamp = await registryService.getCampaignById(createdCampaignId);
    const initialRaised = BigInt(initialCamp?.totalRaised || "0");

    const result = await escrowService.contribute(createdCampaignId, "100", testContributor);
    expect(result.txHash).toBeDefined();
    expect(result.newTotalXlm).toBeDefined();

    const updatedCamp = await registryService.getCampaignById(createdCampaignId);
    expect(BigInt(updatedCamp?.totalRaised || "0")).toBeGreaterThan(initialRaised);
  });

  it("retrieves contributor specific pledge records and supported campaigns", async () => {
    const contrib = await escrowService.getUserContribution(createdCampaignId, testContributor);
    expect(contrib).not.toBeNull();
    expect(contrib?.amount).toBeDefined();

    const supported = await escrowService.getUserSupportedCampaigns(testContributor);
    expect(supported.length).toBeGreaterThan(0);
  });

  it("handles campaign fund release by creator", async () => {
    const campaign = await registryService.getCampaignById(createdCampaignId);
    if (campaign) {
      const result = await escrowService.releaseFunds(createdCampaignId, campaign.creator);
      expect(result.txHash).toBeDefined();
      expect(result.releasedXlm).toBeDefined();
    }
  });

  it("handles contributor refund claim on eligible campaigns", async () => {
    const result = await escrowService.claimRefund(createdCampaignId, testContributor);
    expect(result.txHash).toBeDefined();
    expect(result.refundedXlm).toBeDefined();
  });

  it("handles admin approval and moderation workflows", async () => {
    const adminAddr = "GADM1111111111111111111111111111111111111111111111111111";
    const txHash = await registryService.approveCampaign(createdCampaignId, adminAddr);
    expect(txHash).toBeDefined();

    const rejectTx = await registryService.rejectCampaign(createdCampaignId, "Need more details", adminAddr);
    expect(rejectTx).toBeDefined();
  });
});
