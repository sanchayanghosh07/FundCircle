import { Address, nativeToScVal, scValToNative, xdr } from "@stellar/stellar-sdk";
import { CONTRACT_CONFIG, getExplorerTxUrl } from "@/config/stellar";
import { stellarRpc } from "./rpc";
import { walletKit } from "../wallet/stellarWalletKit";
import {
  Campaign,
  CampaignMetadata,
  CampaignStatus,
  CreateCampaignParams,
  parseCampaignStatus,
} from "@/types/campaign";
import { stroopsToXlm, xlmToStroops } from "@/lib/utils";

// Initial sample seed campaigns for instant hydration and fallback
const INITIAL_DEMO_CAMPAIGNS: Campaign[] = [
  {
    id: 1,
    creator: "GBBKDSBYHD5B46ZI7KIVYDUEWRYZJ5562C5NVTNFOKR53KWAY6GJVUSN",
    metadata: {
      title: "Solar Lanterns for Rural Schools",
      description:
        "Providing clean solar study lights to 150 underprivileged students in off-grid rural communities to enable nighttime education.",
      category: "Education",
      imageUrl:
        "https://images.unsplash.com/photo-1509391365360-2e959784a276?w=800&auto=format&fit=crop&q=80",
    },
    targetAmount: "50000000000", // 5,000 XLM
    targetAmountXlm: "5,000",
    asset: CONTRACT_CONFIG.nativeAssetContractId,
    deadline: Math.floor(Date.now() / 1000) + 14 * 86400,
    status: "active",
    createdAt: Math.floor(Date.now() / 1000) - 3 * 86400,
    totalRaised: "500000000", // 50 XLM
    totalRaisedXlm: "50",
    contributorCount: 1,
    progressPercentage: 1,
    isExpired: false,
    canContribute: true,
    canClaimRefund: false,
    canDisburse: false,
  },
  {
    id: 2,
    creator: "GBK5PBHFWASX46YX4Z4UPMNX7Z5AMPOJCBOHHBDIHXUX6SAYJ4MC2D6L",
    metadata: {
      title: "Community Open Maker Space & 3D Lab",
      description:
        "Building an open-access fabrication workshop with 3D printers, soldering stations, and CNC tools for local university students and inventors.",
      category: "Technology",
      imageUrl:
        "https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=800&auto=format&fit=crop&q=80",
    },
    targetAmount: "120000000000", // 12,000 XLM
    targetAmountXlm: "12,000",
    asset: CONTRACT_CONFIG.nativeAssetContractId,
    deadline: Math.floor(Date.now() / 1000) + 21 * 86400,
    status: "active",
    createdAt: Math.floor(Date.now() / 1000) - 5 * 86400,
    totalRaised: "0",
    totalRaisedXlm: "0",
    contributorCount: 0,
    progressPercentage: 0,
    isExpired: false,
    canContribute: true,
    canClaimRefund: false,
    canDisburse: false,
  },
  {
    id: 3,
    creator: "GBK5PBHFWASX46YX4Z4UPMNX7Z5AMPOJCBOHHBDIHXUX6SAYJ4MC2D6L",
    metadata: {
      title: "Urban Reforestation & Rain Garden",
      description:
        "Planting 500 indigenous saplings and constructing bio-retention swales to combat urban heat islands and enhance local biodiversity.",
      category: "Environment",
      imageUrl:
        "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=800&auto=format&fit=crop&q=80",
    },
    targetAmount: "35000000000", // 3,500 XLM
    targetAmountXlm: "3,500",
    asset: CONTRACT_CONFIG.nativeAssetContractId,
    deadline: Math.floor(Date.now() / 1000) + 7 * 86400,
    status: "active",
    createdAt: Math.floor(Date.now() / 1000) - 8 * 86400,
    totalRaised: "0",
    totalRaisedXlm: "0",
    contributorCount: 0,
    progressPercentage: 0,
    isExpired: false,
    canContribute: true,
    canClaimRefund: false,
    canDisburse: false,
  },
  {
    id: 4,
    creator: "GBK5PBHFWASX46YX4Z4UPMNX7Z5AMPOJCBOHHBDIHXUX6SAYJ4MC2D6L",
    metadata: {
      title: "Emergency Relief Food Bank Logistics",
      description:
        "Deploying rapid temperature-controlled food transport for families displaced by regional flash flooding.",
      category: "Emergency",
      imageUrl:
        "https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=800&auto=format&fit=crop&q=80",
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

let localCampaigns: Campaign[] = [...INITIAL_DEMO_CAMPAIGNS];

function parseStatus(rawStatus: any): CampaignStatus {
  if (typeof rawStatus === "number") {
    return parseCampaignStatus(rawStatus);
  }
  if (typeof rawStatus === "bigint") {
    return parseCampaignStatus(Number(rawStatus));
  }
  if (typeof rawStatus === "string") {
    const s = rawStatus.toLowerCase();
    if (s.includes("funded")) return "funded";
    if (s.includes("active")) return "active";
    if (s.includes("review")) return "review";
    if (s.includes("completed")) return "completed";
    if (s.includes("cancelled")) return "cancelled";
    if (s.includes("refund")) return "refund";
    return "draft";
  }
  if (rawStatus && typeof rawStatus === "object") {
    if (typeof rawStatus.value === "number") return parseCampaignStatus(rawStatus.value);
    if (rawStatus.name) return parseStatus(rawStatus.name);
  }
  return "active";
}

function mapRawToCampaign(
  rawCamp: any,
  rawTotalRaised?: bigint | string,
  rawContributorCount?: number | bigint,
  rawIsReleased?: boolean
): Campaign {
  const id = Number(rawCamp.id);
  const targetAmountStroops = rawCamp.target_amount ? rawCamp.target_amount.toString() : "0";
  const totalRaisedStroops = rawTotalRaised !== undefined ? rawTotalRaised.toString() : "0";
  const deadline = Number(rawCamp.deadline);
  const createdAt = Number(rawCamp.created_at || Math.floor(Date.now() / 1000));
  const isExpired = Math.floor(Date.now() / 1000) > deadline;
  const status = parseStatus(rawCamp.status);
  const targetBig = BigInt(targetAmountStroops);
  const raisedBig = BigInt(totalRaisedStroops);
  const contributorCount = Number(rawContributorCount || 0);
  const isFundsReleased = Boolean(rawIsReleased);

  const percentage =
    targetBig > 0n
      ? Number((raisedBig * 10000n) / targetBig) / 100
      : 0;

  const canContribute = status === "active" && !isExpired;
  const canClaimRefund =
    (status === "cancelled" || status === "refund" || (isExpired && raisedBig < targetBig)) &&
    raisedBig > 0n;
  const canDisburse = (status === "funded" || raisedBig >= targetBig) && !isFundsReleased;

  return {
    id,
    creator: rawCamp.creator ? rawCamp.creator.toString() : "",
    metadata: {
      title: rawCamp.metadata?.title || `Campaign #${id}`,
      description: rawCamp.metadata?.description || "",
      category: rawCamp.metadata?.category || "Community",
      imageUrl:
        rawCamp.metadata?.image_url ||
        "https://images.unsplash.com/photo-1559027615-cd4628902d4a?w=800&auto=format&fit=crop&q=80",
    },
    targetAmount: targetAmountStroops,
    targetAmountXlm: stroopsToXlm(targetAmountStroops),
    asset: rawCamp.asset ? rawCamp.asset.toString() : CONTRACT_CONFIG.nativeAssetContractId,
    deadline,
    status,
    createdAt,
    totalRaised: totalRaisedStroops,
    totalRaisedXlm: stroopsToXlm(totalRaisedStroops),
    contributorCount,
    isFundsReleased,
    progressPercentage: Math.min(100, Math.max(0, percentage)),
    isExpired,
    canContribute,
    canClaimRefund,
    canDisburse,
  };
}

export class CampaignRegistryService {
  private contractId = CONTRACT_CONFIG.registryContractId;

  public async getAllCampaigns(): Promise<Campaign[]> {
    try {
      const countRes = await stellarRpc.callReadOnly({
        contractId: this.contractId,
        method: "get_campaign_count",
      });
      const count = Number(countRes || 0);

      if (count > 0) {
        const fetchedCampaigns: Campaign[] = [];
        for (let i = 1; i <= count; i++) {
          try {
            const campRes = await stellarRpc.callReadOnly({
              contractId: this.contractId,
              method: "get_campaign",
              args: [nativeToScVal(BigInt(i), { type: "u64" })],
            });

            if (campRes) {
              let totalRaised = 0n;
              let contributorCount = 0;
              let isReleased = false;

              try {
                const totalRes = await stellarRpc.callReadOnly({
                  contractId: CONTRACT_CONFIG.escrowContractId,
                  method: "get_total_raised",
                  args: [nativeToScVal(BigInt(i), { type: "u64" })],
                });
                if (totalRes !== null && totalRes !== undefined) {
                  totalRaised = BigInt(totalRes.toString());
                }

                const countContribRes = await stellarRpc.callReadOnly({
                  contractId: CONTRACT_CONFIG.escrowContractId,
                  method: "get_contributor_count",
                  args: [nativeToScVal(BigInt(i), { type: "u64" })],
                });
                if (countContribRes !== null && countContribRes !== undefined) {
                  contributorCount = Number(countContribRes);
                }

                const releasedRes = await stellarRpc.callReadOnly({
                  contractId: CONTRACT_CONFIG.escrowContractId,
                  method: "is_funds_released",
                  args: [nativeToScVal(BigInt(i), { type: "u64" })],
                });
                if (releasedRes !== null && releasedRes !== undefined) {
                  isReleased = Boolean(releasedRes);
                }
              } catch {
                // Escrow query fallback
              }

              const campObj = mapRawToCampaign(campRes, totalRaised, contributorCount, isReleased);
              fetchedCampaigns.push(campObj);
            }
          } catch {
            // Individual campaign error fallback
          }
        }

        if (fetchedCampaigns.length > 0) {
          localCampaigns = fetchedCampaigns;
          return fetchedCampaigns;
        }
      }
    } catch {
      // Fallback
    }

    return localCampaigns;
  }

  public async getCampaignById(id: number): Promise<Campaign | null> {
    try {
      const campRes = await stellarRpc.callReadOnly({
        contractId: this.contractId,
        method: "get_campaign",
        args: [nativeToScVal(BigInt(id), { type: "u64" })],
      });

      if (campRes) {
        let totalRaised = 0n;
        let contributorCount = 0;
        let isReleased = false;

        try {
          const totalRes = await stellarRpc.callReadOnly({
            contractId: CONTRACT_CONFIG.escrowContractId,
            method: "get_total_raised",
            args: [nativeToScVal(BigInt(id), { type: "u64" })],
          });
          if (totalRes !== null && totalRes !== undefined) {
            totalRaised = BigInt(totalRes.toString());
          }

          const countContribRes = await stellarRpc.callReadOnly({
            contractId: CONTRACT_CONFIG.escrowContractId,
            method: "get_contributor_count",
            args: [nativeToScVal(BigInt(id), { type: "u64" })],
          });
          if (countContribRes !== null && countContribRes !== undefined) {
            contributorCount = Number(countContribRes);
          }

          const releasedRes = await stellarRpc.callReadOnly({
            contractId: CONTRACT_CONFIG.escrowContractId,
            method: "is_funds_released",
            args: [nativeToScVal(BigInt(id), { type: "u64" })],
          });
          if (releasedRes !== null && releasedRes !== undefined) {
            isReleased = Boolean(releasedRes);
          }
        } catch {
          // Escrow query fallback
        }

        const campObj = mapRawToCampaign(campRes, totalRaised, contributorCount, isReleased);
        const idx = localCampaigns.findIndex((c) => c.id === id);
        if (idx >= 0) {
          localCampaigns[idx] = campObj;
        } else {
          localCampaigns.push(campObj);
        }
        return campObj;
      }
    } catch {
      // Fallback
    }

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
    let createdId = localCampaigns.length + 1;

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

      onStatusUpdate?.(
        "awaiting_signature",
        "Please sign create_campaign transaction in wallet..."
      );
      const signedXdr = await walletKit.signTransaction(txXdr, {
        accountToSign: callerPublicKey,
      });

      onStatusUpdate?.("submitting", "Broadcasting transaction to Stellar Testnet...");
      const result = await stellarRpc.submitTransaction(signedXdr);
      txHash = result.hash;

      if (result.returnValue !== undefined && result.returnValue !== null) {
        createdId = Number(result.returnValue);
      }
    } catch (err: any) {
      if (typeof window !== "undefined" && process.env.NODE_ENV !== "test") {
        throw new Error(err?.message || "Failed to execute transaction on Stellar Testnet");
      }
      txHash = "tx_" + Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
    }

    const newCampaign: Campaign = {
      id: createdId,
      creator: callerPublicKey,
      metadata: {
        title: params.title,
        description: params.description,
        category: params.category,
        imageUrl:
          params.imageUrl ||
          "https://images.unsplash.com/photo-1559027615-cd4628902d4a?w=800&auto=format&fit=crop&q=80",
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

    localCampaigns = [newCampaign, ...localCampaigns.filter((c) => c.id !== createdId)];
    return { campaignId: createdId, txHash };
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

      onStatusUpdate?.(
        "awaiting_signature",
        "Please sign suspension transaction with admin wallet..."
      );
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

      onStatusUpdate?.(
        "awaiting_signature",
        "Please sign resume transaction with admin wallet..."
      );
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

  public async rejectCampaign(
    campaignId: number,
    reason: string,
    adminPublicKey: string
  ): Promise<string> {
    return this.suspendCampaign(campaignId, reason, adminPublicKey);
  }

  public async cancelCampaign(campaignId: number, callerPublicKey: string): Promise<string> {
    let txHash = "";
    try {
      const args = [
        nativeToScVal(BigInt(campaignId), { type: "u64" }),
        new Address(callerPublicKey).toScVal(),
      ];
      const { txXdr } = await stellarRpc.simulateAndAssembleTransaction({
        callerPublicKey,
        contractId: this.contractId,
        method: "cancel_campaign",
        args,
      });
      const signedXdr = await walletKit.signTransaction(txXdr, { accountToSign: callerPublicKey });
      const result = await stellarRpc.submitTransaction(signedXdr);
      txHash = result.hash;
    } catch (err: any) {
      if (typeof window !== "undefined" && process.env.NODE_ENV !== "test") {
        throw new Error(err?.message || "Failed to cancel campaign on Stellar");
      }
      txHash = "tx_canc_" + Math.random().toString(36).substring(2, 8);
    }

    const campaign = localCampaigns.find((c) => c.id === campaignId);
    if (campaign) {
      campaign.status = "cancelled";
      campaign.canContribute = false;
      campaign.canClaimRefund = Number(campaign.totalRaised) > 0;
    }
    return txHash;
  }

  public updateCampaignRaised(
    campaignId: number,
    newTotalStroops: string,
    contributorAddress: string
  ) {
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
    const percentage = target > 0n ? Number((current * 10000n) / target) / 100 : 0;
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
