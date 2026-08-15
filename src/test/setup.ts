import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";

// Mock matchMedia
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock wallet kit singleton
vi.mock("@/services/wallet/stellarWalletKit", () => ({
  walletKit: {
    openModal: vi.fn().mockResolvedValue({
      address: "GBZCR2Z4UGP5J44N64C72BMSN657XQ4F4J4B7W4UGQO676S47M4UGW5M",
      walletId: "freighter",
      name: "Freighter",
    }),
    signTransaction: vi.fn().mockResolvedValue("mock_signed_xdr"),
    getAddress: vi.fn().mockResolvedValue("GBZCR2Z4UGP5J44N64C72BMSN657XQ4F4J4B7W4UGQO676S47M4UGW5M"),
  },
}));
