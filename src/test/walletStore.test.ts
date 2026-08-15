import { describe, it, expect, beforeEach } from "vitest";
import { useWalletStore } from "@/stores/walletStore";

describe("Wallet Store State Management & Error Handling", () => {
  beforeEach(() => {
    useWalletStore.getState().disconnect();
  });

  it("initializes with clean disconnected state", () => {
    const state = useWalletStore.getState();
    expect(state.isConnected).toBe(false);
    expect(state.address).toBeNull();
    expect(state.walletId).toBeNull();
    expect(state.balanceXlm).toBe("0");
    expect(state.error).toBeNull();
  });

  it("handles wallet connected state and updates account info", () => {
    const testAddress = "GBZCR2Z4UGP5J44N64C72BMSN657XQ4F4J4B7W4UGQO676S47M4UGW5M";
    useWalletStore.getState().setWallet(testAddress, "freighter", "Freighter", "testnet");

    const state = useWalletStore.getState();
    expect(state.isConnected).toBe(true);
    expect(state.address).toBe(testAddress);
    expect(state.walletName).toBe("Freighter");
    expect(state.network).toBe("testnet");
    expect(state.error).toBeNull();
  });

  it("updates balance accurately", () => {
    useWalletStore.getState().setBalance("150.75");
    expect(useWalletStore.getState().balanceXlm).toBe("150.75");
  });

  it("handles wallet error states", () => {
    useWalletStore.getState().setError("User rejected wallet connection request.");
    const state = useWalletStore.getState();
    expect(state.error).toBe("User rejected wallet connection request.");
    expect(state.isConnected).toBe(false);
  });

  it("disconnects and resets all persisted state", () => {
    useWalletStore.getState().setWallet("GBZCR...", "freighter", "Freighter", "testnet");
    useWalletStore.getState().setBalance("500");
    useWalletStore.getState().disconnect();

    const state = useWalletStore.getState();
    expect(state.isConnected).toBe(false);
    expect(state.address).toBeNull();
    expect(state.balanceXlm).toBe("0");
    expect(state.error).toBeNull();
  });
});
