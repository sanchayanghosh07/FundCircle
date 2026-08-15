export type TransactionStatus =
  | "idle"
  | "preparing"
  | "simulating"
  | "awaiting_signature"
  | "submitting"
  | "pending"
  | "confirmed"
  | "failed"
  | "rejected";

export type TransactionType =
  | "create_campaign"
  | "contribute"
  | "release_funds"
  | "claim_refund"
  | "cancel_campaign"
  | "approve_campaign"
  | "reject_campaign";

export interface TransactionRecord {
  id: string;
  type: TransactionType;
  title: string;
  status: TransactionStatus;
  statusMessage?: string;
  campaignId?: number;
  campaignTitle?: string;
  amount?: string;
  assetSymbol?: string;
  from?: string;
  to?: string;
  hash?: string;
  explorerUrl?: string;
  errorMessage?: string;
  timestamp: number;
}
