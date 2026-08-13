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

  public async openModal(): Promise<{ address: string; walletId: string; name: string } | null> {
    this.ensureInitialized();
    try {
      const { address } = await StellarWalletsKit.authModal();
      return {
        address,
        walletId: "freighter",
        name: "Stellar Wallet",
      };
    } catch (err) {
      console.error("Wallet connection cancelled or failed:", err);
      return null;
    }
  }

  public async signTransaction(xdr: string, options?: { networkPassphrase?: string }): Promise<string> {
    this.ensureInitialized();
    const networkPassphrase = options?.networkPassphrase || ACTIVE_NETWORK.networkPassphrase;
    const { signedTxXdr } = await StellarWalletsKit.signTransaction(xdr, {
      networkPassphrase,
    });
    return signedTxXdr;
  }

  public async getAddress(): Promise<string> {
    this.ensureInitialized();
    const { address } = await StellarWalletsKit.getAddress();
    return address;
  }
}

export const walletKit = new WalletKitManager();
