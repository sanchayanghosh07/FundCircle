import { describe, it, expect, beforeEach } from "vitest";
import { useWalletStore } from "@/stores/walletStore";

describe("Wallet Store State Management", () => {
  beforeEach(() => {
    useWalletStore.getState().disconnect();
  });

  it("initializes with disconnected state", () => {
    const state = useWalletStore.getState();
    expect(state.isConnected).toBe(false);
    expect(state.address).toBeNull();
  });

  it("sets wallet and updates connection state", () => {
    const testAddress = "GBZCR2Z4UGP5J44N64C72BMSN657XQ4F4J4B7W4UGQO676S47M4UGW5M";
    useWalletStore.getState().setWallet(testAddress, "freighter", "Freighter", "testnet");

    const state = useWalletStore.getState();
    expect(state.isConnected).toBe(true);
    expect(state.address).toBe(testAddress);
    expect(state.walletName).toBe("Freighter");
  });

  it("updates balance", () => {
    useWalletStore.getState().setBalance("150.75");
    expect(useWalletStore.getState().balanceXlm).toBe("150.75");
  });

  it("disconnects and clears state", () => {
    useWalletStore.getState().setWallet("G...", "freighter", "Freighter", "testnet");
    useWalletStore.getState().disconnect();

    const state = useWalletStore.getState();
    expect(state.isConnected).toBe(false);
    expect(state.address).toBeNull();
  });
});
