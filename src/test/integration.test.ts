import { describe, it, expect } from "vitest";
import { registryService } from "@/services/stellar/registryService";
import { escrowService } from "@/services/stellar/escrowService";
import { eventIngestion } from "@/services/stellar/events";

describe("Contract Service Layer Integration & End-to-End Flows", () => {
  it("fetches list of registered campaigns", async () => {
    const campaigns = await registryService.getAllCampaigns();
    expect(campaigns.length).toBeGreaterThan(0);
    expect(campaigns[0].metadata.title).toBeDefined();
  });

  it("fetches single campaign by ID with complete metadata", async () => {
    const campaign = await registryService.getCampaignById(1);
    expect(campaign).not.toBeNull();
    expect(campaign?.id).toBe(1);
    expect(campaign?.creator).toBeDefined();
    expect(campaign?.targetAmountXlm).toBeDefined();
  });

  it("handles contribution and updates campaign raised totals", async () => {
    const testContributor = "GC7XQ4F4J4B7W4UGQO676S47M4UGW5MGBZCR2Z4UGP5J44N64C72BMSN";
    const initialCamp = await registryService.getCampaignById(1);
    const initialRaised = BigInt(initialCamp?.totalRaised || "0");

    const result = await escrowService.contribute(1, "100", testContributor);
    expect(result.txHash).toBeDefined();
    expect(result.newTotalXlm).toBeDefined();

    const updatedCamp = await registryService.getCampaignById(1);
    expect(BigInt(updatedCamp?.totalRaised || "0")).toBeGreaterThan(initialRaised);
  });

  it("retrieves contributor specific pledge records and supported campaigns", async () => {
    const testContributor = "GC7XQ4F4J4B7W4UGQO676S47M4UGW5MGBZCR2Z4UGP5J44N64C72BMSN";
    const contrib = await escrowService.getUserContribution(1, testContributor);
    expect(contrib).not.toBeNull();
    expect(contrib?.amount).toBeDefined();

    const supported = await escrowService.getUserSupportedCampaigns(testContributor);
    expect(supported.length).toBeGreaterThan(0);
  });

  it("handles campaign fund release by creator", async () => {
    const campaign = await registryService.getCampaignById(1);
    if (campaign) {
      const result = await escrowService.releaseFunds(1, campaign.creator);
      expect(result.txHash).toBeDefined();
      expect(result.releasedXlm).toBeDefined();
    }
  });

  it("handles contributor refund claim on eligible campaigns", async () => {
    const testContributor = "GC7XQ4F4J4B7W4UGQO676S47M4UGW5MGBZCR2Z4UGP5J44N64C72BMSN";
    const result = await escrowService.claimRefund(1, testContributor);
    expect(result.txHash).toBeDefined();
    expect(result.refundedXlm).toBeDefined();
  });

  it("handles admin approval and moderation workflows", async () => {
    const adminAddr = "GADM1111111111111111111111111111111111111111111111111111";
    const txHash = await registryService.approveCampaign(1, adminAddr);
    expect(txHash).toBeDefined();

    const rejectTx = await registryService.rejectCampaign(1, "Need more details", adminAddr);
    expect(rejectTx).toBeDefined();
  });
});
