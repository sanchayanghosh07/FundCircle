import { describe, it, expect, beforeEach } from "vitest";
import { nativeToScVal } from "@stellar/stellar-sdk";
import { eventIngestion, parseScValOrNative } from "@/services/stellar/events";
import { useActivityStore } from "@/stores/activityStore";

describe("On-Chain Soroban Event Ingestion & Activity Processing", () => {
  beforeEach(() => {
    useActivityStore.setState({ activities: [] });
  });

  it("decodes native ScVal objects and base64 strings correctly", () => {
    const scSymbol = nativeToScVal("contrib", { type: "symbol" });
    expect(parseScValOrNative(scSymbol)).toBe("contrib");

    const scU64 = nativeToScVal(BigInt(42), { type: "u64" });
    expect(Number(parseScValOrNative(scU64))).toBe(42);

    const base64Str = scU64.toXDR("base64");
    expect(Number(parseScValOrNative(base64Str))).toBe(42);
  });

  it("parses contribution events with amounts and actors", () => {
    const rawEvent = {
      id: "ev_contrib_123",
      topic: ["contrib", 1, "GBZCR2Z4UGP5J44N64C72BMSN657XQ4F4J4B7W4UGQO676S47M4UGW5M"],
      value: "500000000", // 50 XLM
      txHash: "e9a7b6c5d4e3f2a10b8c7d6e5f4a3b2c1d0e9f8a7b6c5d4e3f2a1b0c9d8e7f6a",
      ledgerClosedAt: new Date(1700000000000).toISOString(),
    };

    const parsed = eventIngestion.parseRawEvent(rawEvent);
    expect(parsed).not.toBeNull();
    expect(parsed?.type).toBe("contributed");
    expect(parsed?.campaignId).toBe(1);
    expect(parsed?.amountXlm).toBe("50");
    expect(parsed?.txHash).toBe(rawEvent.txHash);
  });

  it("parses campaign creation events", () => {
    const rawEvent = {
      id: "ev_creat_456",
      topic: ["cmp_creat", "GBZCR2Z4UGP5J44N64C72BMSN657XQ4F4J4B7W4UGQO676S47M4UGW5M", 2],
      value: "40000000000", // 4,000 XLM
      txHash: "3c2b1a0f9e8d7c6b5a4f3e2d1c0b9a8f7e6d5c4b3a2f1e0d9c8b7a6f5e4d3c2b",
      ledgerClosedAt: new Date(1700000100000).toISOString(),
    };

    const parsed = eventIngestion.parseRawEvent(rawEvent);
    expect(parsed).not.toBeNull();
    expect(parsed?.type).toBe("campaign_created");
    expect(parsed?.campaignId).toBe(2);
    expect(parsed?.amountXlm).toBe("4,000");
  });

  it("parses status milestone events (funded, completed, refund)", () => {
    const rawFunded = {
      id: "ev_stat_funded_1",
      topic: ["cmp_stat", 5],
      value: "funded",
    };
    const parsedFunded = eventIngestion.parseRawEvent(rawFunded);
    expect(parsedFunded?.type).toBe("state_changed");
    expect(parsedFunded?.campaignId).toBe(5);
    expect(parsedFunded?.details).toContain("Funded");

    const rawCompleted = {
      id: "ev_stat_comp_1",
      topic: ["cmp_stat", 5],
      value: "completed",
    };
    const parsedCompleted = eventIngestion.parseRawEvent(rawCompleted);
    expect(parsedCompleted?.type).toBe("state_changed");
    expect(parsedCompleted?.details).toContain("completed");
  });

  it("parses approvals, suspensions, and cancellations", () => {
    const rawAppr = {
      id: "ev_appr_1",
      topic: ["cmp_appr", "GCPUZLCKI4...", 7],
      value: "active",
    };
    const parsedAppr = eventIngestion.parseRawEvent(rawAppr);
    expect(parsedAppr?.type).toBe("campaign_approved");
    expect(parsedAppr?.campaignId).toBe(7);

    const rawSusp = {
      id: "ev_susp_1",
      topic: ["cmp_susp", "GCPUZLCKI4...", 7],
      value: "Moderation review",
    };
    const parsedSusp = eventIngestion.parseRawEvent(rawSusp);
    expect(parsedSusp?.type).toBe("campaign_rejected");
    expect(parsedSusp?.details).toContain("Moderation review");

    const rawCanc = {
      id: "ev_canc_1",
      topic: ["cmp_canc", 7],
      value: "cancelled",
    };
    const parsedCanc = eventIngestion.parseRawEvent(rawCanc);
    expect(parsedCanc?.type).toBe("campaign_cancelled");
    expect(parsedCanc?.campaignId).toBe(7);
  });

  it("parses funds released and refund events", () => {
    const rawRelease = {
      id: "ev_rel_789",
      topic: ["fund_rel", 3, "GBZCR2Z4UGP5J44N64C72BMSN657XQ4F4J4B7W4UGQO676S47M4UGW5M"],
      value: "100000000000",
      txHash: "7f6e5d4c3b2a1f0e9d8c7b6a5f4e3d2c1b0a9f8e7d6c5b4a3f2e1d0c9b8a7f6e",
    };
    const parsedRelease = eventIngestion.parseRawEvent(rawRelease);
    expect(parsedRelease?.type).toBe("funds_released");
    expect(parsedRelease?.amountXlm).toBe("10,000");

    const rawRefund = {
      id: "ev_ref_999",
      topic: ["refund", 3, "GC7XQ4F4J4B7W4UGQO676S47M4UGW5MGBZCR2Z4UGP5J44N64C72BMSN"],
      value: "2500000000",
      txHash: "1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b",
    };
    const parsedRefund = eventIngestion.parseRawEvent(rawRefund);
    expect(parsedRefund?.type).toBe("refund_claimed");
    expect(parsedRefund?.amountXlm).toBe("250");
  });

  it("updates activity store and deduplicates incoming activities", () => {
    const item1 = {
      id: "custom_act_1",
      type: "contributed" as const,
      campaignId: 1,
      campaignTitle: "Study Lights",
      actor: "GBZCR...",
      amountXlm: "25",
      timestamp: 1000,
    };

    const item2 = {
      id: "custom_act_2",
      type: "campaign_created" as const,
      campaignId: 2,
      campaignTitle: "Community Park",
      actor: "GBZCR...",
      timestamp: 2000,
    };

    useActivityStore.getState().addActivity(item1);
    useActivityStore.getState().addActivity(item2);
    // Duplicate item1
    useActivityStore.getState().addActivity(item1);

    const activities = useActivityStore.getState().activities;
    expect(activities.length).toBe(2);
    // Newest first
    expect(activities[0].id).toBe("custom_act_2");
    expect(activities[1].id).toBe("custom_act_1");
  });

  it("supports batch addition with addActivities", () => {
    const batch = [
      {
        id: "batch_1",
        type: "contributed" as const,
        campaignId: 1,
        campaignTitle: "Study Lights",
        actor: "GBZCR...",
        timestamp: 3000,
      },
      {
        id: "batch_2",
        type: "state_changed" as const,
        campaignId: 1,
        campaignTitle: "Study Lights",
        actor: "Escrow",
        timestamp: 4000,
      },
    ];

    useActivityStore.getState().addActivities(batch);
    const activities = useActivityStore.getState().activities;
    expect(activities.length).toBe(2);
    expect(activities[0].id).toBe("batch_2");
  });
});
