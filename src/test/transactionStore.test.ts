import { describe, it, expect, beforeEach } from "vitest";
import { useTransactionStore } from "@/stores/transactionStore";

describe("Transaction Store & Lifecycle Manager", () => {
  beforeEach(() => {
    useTransactionStore.getState().clearHistory();
  });

  it("opens modal with preparing state", () => {
    useTransactionStore.getState().openModal("contribute", "Contribute 50 XLM", {
      amount: "50",
      campaignTitle: "Solar Study Lights",
    });

    const state = useTransactionStore.getState();
    expect(state.isOpen).toBe(true);
    expect(state.activeTx?.status).toBe("preparing");
    expect(state.activeTx?.amount).toBe("50");
  });

  it("advances through states and records success", () => {
    useTransactionStore.getState().openModal("contribute", "Contribute 100 XLM");
    useTransactionStore.getState().updateStatus("simulating");
    expect(useTransactionStore.getState().activeTx?.status).toBe("simulating");

    useTransactionStore.getState().recordSuccess("tx_hash_123", "https://stellar.expert/tx_hash_123");
    
    const state = useTransactionStore.getState();
    expect(state.activeTx?.status).toBe("confirmed");
    expect(state.activeTx?.hash).toBe("tx_hash_123");
    expect(state.history.length).toBe(1);
  });

  it("records transaction failure with error message", () => {
    useTransactionStore.getState().openModal("release_funds", "Release Funds");
    useTransactionStore.getState().recordFailure("Campaign is not eligible for release.");

    const state = useTransactionStore.getState();
    expect(state.activeTx?.status).toBe("failed");
    expect(state.activeTx?.errorMessage).toBe("Campaign is not eligible for release.");
  });
});
