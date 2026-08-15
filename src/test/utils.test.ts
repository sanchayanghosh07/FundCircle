import { describe, it, expect } from "vitest";
import {
  stroopsToXlm,
  xlmToStroops,
  shortenAddress,
  getCountdown,
} from "@/lib/utils";

describe("Formatting and Conversion Utilities", () => {
  it("converts stroops to XLM decimal string accurately", () => {
    expect(stroopsToXlm("10000000")).toBe("1");
    expect(stroopsToXlm("50000000")).toBe("5");
    expect(stroopsToXlm("50000000000")).toBe("5,000");
    expect(stroopsToXlm("12500000")).toBe("1.25");
    expect(stroopsToXlm("0")).toBe("0");
  });

  it("converts XLM to stroops accurately", () => {
    expect(xlmToStroops("1")).toBe("10000000");
    expect(xlmToStroops("5000")).toBe("50000000000");
    expect(xlmToStroops("0.5")).toBe("5000000");
    expect(xlmToStroops("0")).toBe("0");
  });

  it("shortens public keys cleanly", () => {
    const address = "GBZCR2Z4UGP5J44N64C72BMSN657XQ4F4J4B7W4UGQO676S47M4UGW5M";
    expect(shortenAddress(address, 4)).toBe("GBZCR2...GW5M");
    expect(shortenAddress("")).toBe("");
  });

  it("calculates countdown time remaining properly", () => {
    const future = Math.floor(Date.now() / 1000) + 86400 * 2 + 3600;
    const cd = getCountdown(future);
    expect(cd.isExpired).toBe(false);
    expect(cd.days).toBe(2);

    const past = Math.floor(Date.now() / 1000) - 100;
    const expiredCd = getCountdown(past);
    expect(expiredCd.isExpired).toBe(true);
    expect(expiredCd.formatted).toBe("Ended");
  });
});
