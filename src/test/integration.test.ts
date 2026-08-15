import { describe, it, expect } from "vitest";
import { registryService } from "@/services/stellar/registryService";
import { escrowService } from "@/services/stellar/escrowService";

describe("Contract Service Layer Integration", () => {
  it("fetches list of registered campaigns", async () => {
    const campaigns = await registryService.getAllCampaigns();
    expect(campaigns.length).toBeGreaterThan(0);
    expect(campaigns[0].metadata.title).toBeDefined();
  });

  it("fetches single campaign by ID", async () => {
    const campaign = await registryService.getCampaignById(1);
    expect(campaign).not.toBeNull();
    expect(campaign?.id).toBe(1);
  });

  it("handles contribution and updates campaign raised totals", async () => {
    const testContributor = "GC7XQ4F4J4B7W4UGQO676S47M4UGW5MGBZCR2Z4UGP5J44N64C72BMSN";
    const initialCamp = await registryService.getCampaignById(1);
    const initialRaised = BigInt(initialCamp?.totalRaised || "0");

    const result = await escrowService.contribute(1, "100", testContributor);
    expect(result.txHash).toBeDefined();

    const updatedCamp = await registryService.getCampaignById(1);
    expect(BigInt(updatedCamp?.totalRaised || "0")).toBeGreaterThan(initialRaised);
  });
});
