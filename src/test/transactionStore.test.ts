import { describe, it, expect, beforeEach } from "vitest";
import { useTransactionStore } from "@/stores/transactionStore";

describe("Production Transaction Lifecycle Manager & Store", () => {
  beforeEach(() => {
    useTransactionStore.getState().closeModal();
    useTransactionStore.getState().clearHistory();
  });

  it("initializes with idle state", () => {
    const state = useTransactionStore.getState();
    expect(state.isOpen).toBe(false);
    expect(state.activeTx).toBeNull();
    expect(state.history.length).toBe(0);
  });

  it("opens modal in preparing state with campaign context", () => {
    useTransactionStore.getState().openModal("contribute", "Contribute 50 XLM", {
      campaignId: 1,
      campaignTitle: "Solar Study Lights",
      amount: "50",
      assetSymbol: "XLM",
    });

    const state = useTransactionStore.getState();
    expect(state.isOpen).toBe(true);
    expect(state.activeTx?.type).toBe("contribute");
    expect(state.activeTx?.status).toBe("preparing");
    expect(state.activeTx?.amount).toBe("50");
    expect(state.activeTx?.campaignTitle).toBe("Solar Study Lights");
  });

  it("transitions sequentially through simulating, awaiting_signature, submitting, and pending", () => {
    useTransactionStore.getState().openModal("contribute", "Contribute 100 XLM");

    // Simulating footprint & fees
    useTransactionStore.getState().updateStatus("simulating", "Simulating invocation footprint...");
    expect(useTransactionStore.getState().activeTx?.status).toBe("simulating");
    expect(useTransactionStore.getState().activeTx?.statusMessage).toBe("Simulating invocation footprint...");

    // Awaiting wallet signature
    useTransactionStore.getState().updateStatus("awaiting_signature", "Please sign in your Stellar wallet");
    expect(useTransactionStore.getState().activeTx?.status).toBe("awaiting_signature");

    // Submitting envelope
    useTransactionStore.getState().updateStatus("submitting", "Broadcasting to Soroban RPC node...");
    expect(useTransactionStore.getState().activeTx?.status).toBe("submitting");

    // Pending consensus
    useTransactionStore.getState().updateStatus("pending", "Waiting for ledger consensus...");
    expect(useTransactionStore.getState().activeTx?.status).toBe("pending");
  });

  it("records confirmed state with transaction hash and explorer URL", () => {
    useTransactionStore.getState().openModal("contribute", "Contribute 250 XLM", {
      campaignId: 2,
      campaignTitle: "Community Greenhouse",
      amount: "250",
    });

    const txHash = "e9a7b6c5d4e3f2a10b8c7d6e5f4a3b2c1d0e9f8a7b6c5d4e3f2a1b0c9d8e7f6a";
    const explorerUrl = `https://stellar.expert/explorer/testnet/tx/${txHash}`;

    useTransactionStore.getState().recordSuccess(txHash, explorerUrl);

    const state = useTransactionStore.getState();
    expect(state.activeTx?.status).toBe("confirmed");
    expect(state.activeTx?.hash).toBe(txHash);
    expect(state.activeTx?.explorerUrl).toBe(explorerUrl);

    // Persisted to history
    expect(state.history.length).toBe(1);
    expect(state.history[0].hash).toBe(txHash);
    expect(state.history[0].status).toBe("confirmed");
  });

  it("handles wallet rejection and failure states with diagnostics", () => {
    useTransactionStore.getState().openModal("claim_refund", "Claim Contributor Refund");

    // User rejects signature in wallet
    useTransactionStore.getState().updateStatus("rejected", "Transaction signature was cancelled by user.");
    expect(useTransactionStore.getState().activeTx?.status).toBe("rejected");

    // Simulation/Contract error failure
    useTransactionStore.getState().recordFailure("ContractError(CampaignNotEligibleForRefund)");
    const state = useTransactionStore.getState();
    expect(state.activeTx?.status).toBe("failed");
    expect(state.activeTx?.errorMessage).toBe("ContractError(CampaignNotEligibleForRefund)");
  });

  it("clears transaction history", () => {
    useTransactionStore.getState().openModal("contribute", "Tx 1");
    useTransactionStore.getState().recordSuccess("hash_1", "url_1");
    expect(useTransactionStore.getState().history.length).toBe(1);

    useTransactionStore.getState().clearHistory();
    expect(useTransactionStore.getState().history.length).toBe(0);
  });
});
