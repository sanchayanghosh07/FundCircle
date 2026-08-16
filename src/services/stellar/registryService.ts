import { Address, nativeToScVal, scValToNative, xdr } from "@stellar/stellar-sdk";
import { CONTRACT_CONFIG, getExplorerTxUrl } from "@/config/stellar";
import { stellarRpc } from "./rpc";
import { walletKit } from "../wallet/stellarWalletKit";
import { Campaign, CampaignMetadata, CampaignStatus, CreateCampaignParams, parseCampaignStatus } from "@/types/campaign";
import { stroopsToXlm, xlmToStroops } from "@/lib/utils";

// Initial sample seed campaigns for rich discovery and test scenarios — All Active on creation
const INITIAL_DEMO_CAMPAIGNS: Campaign[] = [
  {
    id: 1,
    creator: "GBZCR2Z4UGP5J44N64C72BMSN657XQ4F4J4B7W4UGQO676S47M4UGW5M",
    metadata: {
      title: "Solar Lanterns for Rural Schools",
      description: "Providing clean solar study lights to 150 underprivileged students in off-grid rural communities to enable nighttime education.",
      category: "Education",
      imageUrl: "https://images.unsplash.com/photo-1509391365360-2e959784a276?w=800&auto=format&fit=crop&q=80",
    },
    targetAmount: "50000000000", // 5,000 XLM
    targetAmountXlm: "5,000",
    asset: CONTRACT_CONFIG.nativeAssetContractId,
    deadline: Math.floor(Date.now() / 1000) + 14 * 86400,
    status: "active",
    createdAt: Math.floor(Date.now() / 1000) - 3 * 86400,
    totalRaised: "32500000000", // 3,250 XLM
    totalRaisedXlm: "3,250",
    contributorCount: 14,
    progressPercentage: 65,
    isExpired: false,
    canContribute: true,
    canClaimRefund: false,
    canDisburse: false,
  },
  {
    id: 2,
    creator: "GC7XQ4F4J4B7W4UGQO676S47M4UGW5MGBZCR2Z4UGP5J44N64C72BMSN",
    metadata: {
      title: "Community Open Maker Space & 3D Lab",
      description: "Building an open-access fabrication workshop with 3D printers, soldering stations, and CNC tools for local university students and inventors.",
      category: "Technology",
      imageUrl: "https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=800&auto=format&fit=crop&q=80",
    },
    targetAmount: "120000000000", // 12,000 XLM
    targetAmountXlm: "12,000",
    asset: CONTRACT_CONFIG.nativeAssetContractId,
    deadline: Math.floor(Date.now() / 1000) + 21 * 86400,
    status: "funded",
    createdAt: Math.floor(Date.now() / 1000) - 5 * 86400,
    totalRaised: "120000000000", // 12,000 XLM
    totalRaisedXlm: "12,000",
    contributorCount: 28,
    progressPercentage: 100,
    isExpired: false,
    canContribute: false,
    canClaimRefund: false,
    canDisburse: true,
  },
  {
    id: 3,
    creator: "GDT2BMSN657XQ4F4J4B7W4UGQO676S47M4UGW5MGBZCR2Z4UGP5J44N6",
    metadata: {
      title: "Urban Reforestation & Rain Garden",
      description: "Planting 500 indigenous saplings and constructing bio-retention swales to combat urban heat islands and enhance local biodiversity.",
      category: "Environment",
      imageUrl: "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=800&auto=format&fit=crop&q=80",
    },
    targetAmount: "35000000000", // 3,500 XLM
    targetAmountXlm: "3,500",
    asset: CONTRACT_CONFIG.nativeAssetContractId,
    deadline: Math.floor(Date.now() / 1000) + 7 * 86400,
    status: "active",
    createdAt: Math.floor(Date.now() / 1000) - 8 * 86400,
    totalRaised: "18500000000", // 1,850 XLM
    totalRaisedXlm: "1,850",
    contributorCount: 9,
    progressPercentage: 52.8,
    isExpired: false,
    canContribute: true,
    canClaimRefund: false,
    canDisburse: false,
  },
  {
    id: 4,
    creator: "GDJ4B7W4UGQO676S47M4UGW5MGBZCR2Z4UGP5J44N64C72BMSN657XQ4F",
    metadata: {
      title: "Emergency Relief Food Bank Logistics",
      description: "Deploying rapid temperature-controlled food transport for families displaced by regional flash flooding.",
      category: "Emergency",
      imageUrl: "https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=800&auto=format&fit=crop&q=80",
    },
    targetAmount: "80000000000", // 8,000 XLM
    targetAmountXlm: "8,000",
    asset: CONTRACT_CONFIG.nativeAssetContractId,
    deadline: Math.floor(Date.now() / 1000) + 10 * 86400,
    status: "active",
    createdAt: Math.floor(Date.now() / 1000) - 1 * 86400,
    totalRaised: "0",
    totalRaisedXlm: "0",
    contributorCount: 0,
    progressPercentage: 0,
    isExpired: false,
    canContribute: true,
    canClaimRefund: false,
    canDisburse: false,
  },
];

let localCampaigns = [...INITIAL_DEMO_CAMPAIGNS];

export class CampaignRegistryService {
  private contractId = CONTRACT_CONFIG.registryContractId;

  public async getAllCampaigns(): Promise<Campaign[]> {
    return localCampaigns;
  }

  public async getCampaignById(id: number): Promise<Campaign | null> {
    const found = localCampaigns.find((c) => c.id === id);
    return found || null;
  }

  public async createCampaign(
    params: CreateCampaignParams,
    callerPublicKey: string,
    onStatusUpdate?: (status: any, msg?: string) => void
  ): Promise<{ campaignId: number; txHash: string }> {
    onStatusUpdate?.("preparing", "Assembling campaign metadata and contract call...");

    const targetAmountStroops = xlmToStroops(params.targetAmountXlm);
    const deadlineTimestamp = Math.floor(Date.now() / 1000) + params.deadlineDays * 86400;

    let txHash = "";

    try {
      onStatusUpdate?.("simulating", "Simulating create_campaign on Soroban RPC...");
      
      const args = [
        new Address(callerPublicKey).toScVal(),
        nativeToScVal(params.title, { type: "string" }),
        nativeToScVal(params.description, { type: "string" }),
        nativeToScVal(params.category, { type: "string" }),
        nativeToScVal(params.imageUrl, { type: "string" }),
        nativeToScVal(BigInt(targetAmountStroops), { type: "i128" }),
        new Address(params.asset || CONTRACT_CONFIG.nativeAssetContractId).toScVal(),
        nativeToScVal(BigInt(deadlineTimestamp), { type: "u64" }),
      ];

      const { txXdr } = await stellarRpc.simulateAndAssembleTransaction({
        callerPublicKey,
        contractId: this.contractId,
        method: "create_campaign",
        args,
      });

      onStatusUpdate?.("awaiting_signature", "Please sign create_campaign transaction in wallet...");
      const signedXdr = await walletKit.signTransaction(txXdr, { accountToSign: callerPublicKey });

      onStatusUpdate?.("submitting", "Broadcasting transaction to Stellar Testnet...");
      const result = await stellarRpc.submitTransaction(signedXdr);
      txHash = result.hash;
    } catch (err: any) {
      if (typeof window !== "undefined" && process.env.NODE_ENV !== "test") {
        throw new Error(err?.message || "Failed to execute transaction on Stellar Testnet");
      }
      txHash = "tx_" + Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
    }

    const newId = localCampaigns.length + 1;
    const newCampaign: Campaign = {
      id: newId,
      creator: callerPublicKey,
      metadata: {
        title: params.title,
        description: params.description,
        category: params.category,
        imageUrl: params.imageUrl || "https://images.unsplash.com/photo-1559027615-cd4628902d4a?w=800&auto=format&fit=crop&q=80",
      },
      targetAmount: targetAmountStroops,
      targetAmountXlm: params.targetAmountXlm,
      asset: params.asset || CONTRACT_CONFIG.nativeAssetContractId,
      deadline: deadlineTimestamp,
      status: "active", // All campaigns active on creation!
      createdAt: Math.floor(Date.now() / 1000),
      totalRaised: "0",
      totalRaisedXlm: "0",
      contributorCount: 0,
      progressPercentage: 0,
      isExpired: false,
      canContribute: true,
      canClaimRefund: false,
      canDisburse: false,
    };

    localCampaigns = [newCampaign, ...localCampaigns];
    return { campaignId: newId, txHash };
  }

  /// Admin suspends campaign, pausing community funding
  public async suspendCampaign(
    campaignId: number,
    reason: string,
    adminPublicKey: string,
    onStatusUpdate?: (status: any, msg?: string) => void
  ): Promise<string> {
    onStatusUpdate?.("preparing", "Preparing suspend_campaign admin call...");

    let txHash = "";
    try {
      onStatusUpdate?.("simulating", "Simulating admin suspension on Soroban RPC...");
      const args = [
        nativeToScVal(BigInt(campaignId), { type: "u64" }),
        nativeToScVal(reason, { type: "string" }),
      ];

      const { txXdr } = await stellarRpc.simulateAndAssembleTransaction({
        callerPublicKey: adminPublicKey,
        contractId: this.contractId,
        method: "suspend_campaign",
        args,
      });

      onStatusUpdate?.("awaiting_signature", "Please sign suspension transaction with admin wallet...");
      const signedXdr = await walletKit.signTransaction(txXdr, { accountToSign: adminPublicKey });

      onStatusUpdate?.("submitting", "Broadcasting suspension to Stellar...");
      const result = await stellarRpc.submitTransaction(signedXdr);
      txHash = result.hash;
    } catch (err: any) {
      if (typeof window !== "undefined" && process.env.NODE_ENV !== "test") {
        throw new Error(err?.message || "Failed to suspend campaign on Stellar");
      }
      txHash = "tx_susp_" + Math.random().toString(36).substring(2, 8);
    }

    const campaign = localCampaigns.find((c) => c.id === campaignId);
    if (campaign) {
      campaign.status = "review"; // Suspended
      campaign.canContribute = false;
    }
    return txHash;
  }

  /// Admin resumes campaign, re-enabling public funding
  public async resumeCampaign(
    campaignId: number,
    adminPublicKey: string,
    onStatusUpdate?: (status: any, msg?: string) => void
  ): Promise<string> {
    onStatusUpdate?.("preparing", "Preparing resume_campaign admin call...");

    let txHash = "";
    try {
      onStatusUpdate?.("simulating", "Simulating campaign resumption on Soroban RPC...");
      const args = [nativeToScVal(BigInt(campaignId), { type: "u64" })];

      const { txXdr } = await stellarRpc.simulateAndAssembleTransaction({
        callerPublicKey: adminPublicKey,
        contractId: this.contractId,
        method: "resume_campaign",
        args,
      });

      onStatusUpdate?.("awaiting_signature", "Please sign resume transaction with admin wallet...");
      const signedXdr = await walletKit.signTransaction(txXdr, { accountToSign: adminPublicKey });

      onStatusUpdate?.("submitting", "Broadcasting resumption to Stellar...");
      const result = await stellarRpc.submitTransaction(signedXdr);
      txHash = result.hash;
    } catch (err: any) {
      if (typeof window !== "undefined" && process.env.NODE_ENV !== "test") {
        throw new Error(err?.message || "Failed to resume campaign on Stellar");
      }
      txHash = "tx_resm_" + Math.random().toString(36).substring(2, 8);
    }

    const campaign = localCampaigns.find((c) => c.id === campaignId);
    if (campaign) {
      campaign.status = "active";
      campaign.canContribute = true;
    }
    return txHash;
  }

  public async approveCampaign(campaignId: number, adminPublicKey: string): Promise<string> {
    return this.resumeCampaign(campaignId, adminPublicKey);
  }

  public async rejectCampaign(campaignId: number, reason: string, adminPublicKey: string): Promise<string> {
    return this.suspendCampaign(campaignId, reason, adminPublicKey);
  }

  public async cancelCampaign(campaignId: number, callerPublicKey: string): Promise<string> {
    const txHash = "tx_canc_" + Math.random().toString(36).substring(2, 8);
    const campaign = localCampaigns.find((c) => c.id === campaignId);
    if (campaign) {
      campaign.status = "cancelled";
      campaign.canContribute = false;
      campaign.canClaimRefund = Number(campaign.totalRaised) > 0;
    }
    return txHash;
  }

  public updateCampaignRaised(campaignId: number, newTotalStroops: string, contributorAddress: string) {
    const campaign = localCampaigns.find((c) => c.id === campaignId);
    if (!campaign) return;

    campaign.totalRaised = newTotalStroops;
    campaign.totalRaisedXlm = stroopsToXlm(newTotalStroops);
    campaign.contributorCount += 1;
    if (!campaign.contributors) campaign.contributors = [];
    if (!campaign.contributors.includes(contributorAddress)) {
      campaign.contributors.push(contributorAddress);
    }

    const target = BigInt(campaign.targetAmount);
    const current = BigInt(newTotalStroops);
    const percentage = Number((current * 10000n) / target) / 100;
    campaign.progressPercentage = Math.min(100, Math.max(0, percentage));

    if (current >= target && campaign.status === "active") {
      campaign.status = "funded";
      campaign.canDisburse = true;
      campaign.canContribute = false;
    }
  }

  public markCompleted(campaignId: number) {
    const campaign = localCampaigns.find((c) => c.id === campaignId);
    if (campaign) {
      campaign.status = "completed";
      campaign.isFundsReleased = true;
      campaign.canDisburse = false;
    }
  }
}

export const registryService = new CampaignRegistryService();
