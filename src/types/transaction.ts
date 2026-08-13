export type TxStatus =
  | "idle"
  | "preparing"
  | "simulating"
  | "awaiting_signature"
  | "submitting"
  | "pending"
  | "confirmed"
  | "failed"
  | "rejected";

export type TxType =
  | "create_campaign"
  | "submit_for_review"
  | "approve_campaign"
  | "reject_campaign"
  | "cancel_campaign"
  | "contribute"
  | "release_funds"
  | "claim_refund"
  | "initialize_registry"
  | "initialize_escrow";

export interface TransactionRecord {
  id: string;
  type: TxType;
  title: string;
  hash?: string;
  campaignId?: number;
  campaignTitle?: string;
  amount?: string;
  assetSymbol?: string;
  from?: string;
  to?: string;
  status: TxStatus;
  timestamp: number;
  explorerUrl?: string;
  errorMessage?: string;
  technicalDetails?: string;
}

export interface TransactionLifecycleState {
  isOpen: boolean;
  status: TxStatus;
  activeTx?: TransactionRecord;
  currentStepMessage?: string;
}
