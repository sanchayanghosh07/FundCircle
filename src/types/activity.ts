export type ActivityType =
  | "campaign_created"
  | "campaign_submitted"
  | "campaign_approved"
  | "campaign_rejected"
  | "campaign_cancelled"
  | "contributed"
  | "funds_released"
  | "refund_claimed"
  | "state_changed";

export interface ActivityItem {
  id: string;
  type: ActivityType;
  campaignId: number;
  campaignTitle: string;
  actor: string;
  amount?: string;
  amountXlm?: string;
  timestamp: number;
  txHash?: string;
  details?: string;
}
