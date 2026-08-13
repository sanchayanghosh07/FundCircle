export type SupportedWalletId =
  | "freighter"
  | "xbull"
  | "albedo"
  | "lobstr"
  | "hana"
  | "rabet";

export interface ConnectedWallet {
  address: string;
  walletId: string;
  walletName: string;
  balanceXlm: string;
  network: string;
}

export interface WalletState {
  isConnected: boolean;
  isConnecting: boolean;
  address: string | null;
  walletId: string | null;
  walletName: string | null;
  balanceXlm: string;
  network: string;
  error: string | null;
}
