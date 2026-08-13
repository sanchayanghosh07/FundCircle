export type CampaignStatus =
  | "draft"
  | "review"
  | "active"
  | "funded"
  | "completed"
  | "cancelled"
  | "refund";

export const CampaignStatusEnum = {
  Draft: 0,
  Review: 1,
  Active: 2,
  Funded: 3,
  Completed: 4,
  Cancelled: 5,
  Refund: 6,
} as const;

export function parseCampaignStatus(code: number): CampaignStatus {
  switch (code) {
    case 0:
      return "draft";
    case 1:
      return "review";
    case 2:
      return "active";
    case 3:
      return "funded";
    case 4:
      return "completed";
    case 5:
      return "cancelled";
    case 6:
      return "refund";
    default:
      return "draft";
  }
}

export type CampaignCategory =
  | "Education"
  | "Community"
  | "Environment"
  | "Technology"
  | "Emergency"
  | "Creator"
  | "Social";

export interface CampaignMetadata {
  title: string;
  description: string;
  category: CampaignCategory | string;
  imageUrl: string;
}

export interface ContributionRecord {
  amount: string; // stroops
  amountXlm: string; // formatted XLM
  timestamp: number;
}

export interface Campaign {
  id: number;
  creator: string;
  metadata: CampaignMetadata;
  targetAmount: string; // stroops
  targetAmountXlm: string; // formatted XLM
  asset: string; // SAC address
  deadline: number; // unix timestamp in seconds
  status: CampaignStatus;
  createdAt: number;
  totalRaised: string; // stroops
  totalRaisedXlm: string; // formatted XLM
  contributorCount: number;
  contributors?: string[];
  isFundsReleased?: boolean;
  progressPercentage: number;
  isExpired: boolean;
  canContribute: boolean;
  canClaimRefund: boolean;
  canDisburse: boolean;
}

export interface CreateCampaignParams {
  title: string;
  description: string;
  category: string;
  imageUrl: string;
  targetAmountXlm: string;
  asset: string;
  deadlineDays: number;
}

export interface ContributionParams {
  campaignId: number;
  amountXlm: string;
}
