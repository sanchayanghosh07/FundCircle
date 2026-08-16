import { StellarWalletsKit, Networks } from "@creit.tech/stellar-wallets-kit";
import { FreighterModule } from "@creit.tech/stellar-wallets-kit/modules/freighter";
import { xBullModule } from "@creit.tech/stellar-wallets-kit/modules/xbull";
import { AlbedoModule } from "@creit.tech/stellar-wallets-kit/modules/albedo";
import { LobstrModule } from "@creit.tech/stellar-wallets-kit/modules/lobstr";
import { HanaModule } from "@creit.tech/stellar-wallets-kit/modules/hana";
import { RabetModule } from "@creit.tech/stellar-wallets-kit/modules/rabet";
import { ACTIVE_NETWORK } from "@/config/stellar";

class WalletKitManager {
  private initialized = false;

  private ensureInitialized() {
    if (this.initialized || typeof window === "undefined") return;

    try {
      StellarWalletsKit.init({
        modules: [
          new FreighterModule(),
          new xBullModule(),
          new AlbedoModule(),
          new LobstrModule(),
          new HanaModule(),
          new RabetModule(),
        ],
        network: Networks.TESTNET,
      });
      this.initialized = true;
    } catch (err) {
      console.warn("Wallet kit initialization warning:", err);
    }
  }

  public setWallet(walletId: string) {
    this.ensureInitialized();
    try {
      StellarWalletsKit.setWallet(walletId);
    } catch {
      // ignore
    }
  }

  public async openModal(): Promise<{ address: string; walletId: string; name: string } | null> {
    this.ensureInitialized();
    try {
      const { address } = await StellarWalletsKit.authModal();
      return {
        address,
        walletId: "freighter",
        name: "Freighter Wallet",
      };
    } catch (err: any) {
      if (err?.code === -1 || err?.message?.includes("closed")) {
        return null;
      }
      console.error("Wallet connection error:", err);
      return null;
    }
  }

  public async signTransaction(
    xdr: string,
    options?: { networkPassphrase?: string; accountToSign?: string }
  ): Promise<string> {
    this.ensureInitialized();
    const networkPassphrase =
      options?.networkPassphrase || ACTIVE_NETWORK.networkPassphrase;

    // 1. Check if Freighter extension is available directly in window
    if (typeof window !== "undefined" && (window as any).freighter) {
      try {
        const res = await (window as any).freighter.signTransaction(xdr, {
          networkPassphrase,
          accountToSign: options?.accountToSign,
        });
        if (typeof res === "string") return res;
        if (res && res.signedTxXdr) return res.signedTxXdr;
      } catch (err: any) {
        if (
          err?.message?.includes("User declined") ||
          err?.message?.includes("declined") ||
          err?.message?.includes("cancel") ||
          err?.message?.includes("reject")
        ) {
          throw new Error("Transaction signature was cancelled by user.");
        }
      }
    }

    // 2. Use StellarWalletsKit
    try {
      const { signedTxXdr } = await StellarWalletsKit.signTransaction(xdr, {
        networkPassphrase,
      });
      return signedTxXdr;
    } catch (err: any) {
      if (
        err?.message?.includes("User declined") ||
        err?.message?.includes("declined") ||
        err?.message?.includes("cancel") ||
        err?.message?.includes("reject") ||
        err?.code === -1
      ) {
        throw new Error("Transaction signature was cancelled by user.");
      }

      // If selected wallet wasn't set, fallback to setting freighter and retry
      if (err?.message?.includes("Please set the wallet first") || err?.code === -3) {
        try {
          StellarWalletsKit.setWallet("freighter");
          const { signedTxXdr } = await StellarWalletsKit.signTransaction(xdr, {
            networkPassphrase,
          });
          return signedTxXdr;
        } catch (innerErr: any) {
          if (
            innerErr?.message?.includes("User declined") ||
            innerErr?.message?.includes("declined") ||
            innerErr?.message?.includes("cancel")
          ) {
            throw new Error("Transaction signature was cancelled by user.");
          }
          throw innerErr;
        }
      }

      throw err;
    }
  }

  public async getAddress(): Promise<string> {
    this.ensureInitialized();
    const { address } = await StellarWalletsKit.getAddress();
    return address;
  }
}

export const walletKit = new WalletKitManager();
