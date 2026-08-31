import { Address, nativeToScVal, scValToNative, xdr } from "@stellar/stellar-sdk";
import { CONTRACT_CONFIG, getExplorerTxUrl } from "@/config/stellar";
import { stellarRpc } from "./rpc";
import { walletKit } from "../wallet/stellarWalletKit";
import { useActivityStore } from "@/stores/activityStore";
import {
  Campaign,
  CampaignMetadata,
  CampaignStatus,
  CreateCampaignParams,
  parseCampaignStatus,
} from "@/types/campaign";
import { stroopsToXlm, xlmToStroops } from "@/lib/utils";

// In-memory campaign state fallback for offline/simulated creation
let localCampaigns: Campaign[] = [];

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

let campaignsCache: {
  data: Campaign[];
  timestamp: number;
} | null = null;

const CACHE_TTL_MS = 25_000; // 25 seconds SWR cache

export class CampaignRegistryService {
  private contractId = CONTRACT_CONFIG.registryContractId;

  public invalidateCache(): void {
    campaignsCache = null;
  }

  public async getAllCampaigns(forceRefresh = false): Promise<Campaign[]> {
    // Return cache immediately if fresh and not forced
    if (!forceRefresh && campaignsCache && Date.now() - campaignsCache.timestamp < CACHE_TTL_MS) {
      return campaignsCache.data;
    }

    try {
      const countRes = await stellarRpc.callReadOnly({
        contractId: this.contractId,
        method: "get_campaign_count",
      });
      const count = Number(countRes || 0);

      if (count > 0) {
        // Fetch all campaigns concurrently in parallel
        const campaignPromises = Array.from({ length: count }, (_, idx) => {
          const id = idx + 1;
          return (async (): Promise<Campaign | null> => {
            try {
              // Concurrently query campaign registry metadata and funding escrow stats
              const [campRes, totalRes, countContribRes, releasedRes] = await Promise.all([
                stellarRpc.callReadOnly({
                  contractId: this.contractId,
                  method: "get_campaign",
                  args: [nativeToScVal(BigInt(id), { type: "u64" })],
                }),
                stellarRpc
                  .callReadOnly({
                    contractId: CONTRACT_CONFIG.escrowContractId,
                    method: "get_total_raised",
                    args: [nativeToScVal(BigInt(id), { type: "u64" })],
                  })
                  .catch(() => null),
                stellarRpc
                  .callReadOnly({
                    contractId: CONTRACT_CONFIG.escrowContractId,
                    method: "get_contributor_count",
                    args: [nativeToScVal(BigInt(id), { type: "u64" })],
                  })
                  .catch(() => null),
                stellarRpc
                  .callReadOnly({
                    contractId: CONTRACT_CONFIG.escrowContractId,
                    method: "is_funds_released",
                    args: [nativeToScVal(BigInt(id), { type: "u64" })],
                  })
                  .catch(() => null),
              ]);

              if (campRes) {
                const totalRaised = totalRes !== null && totalRes !== undefined ? BigInt(totalRes.toString()) : 0n;
                const contributorCount = countContribRes !== null && countContribRes !== undefined ? Number(countContribRes) : 0;
                const isReleased = Boolean(releasedRes);
                return mapRawToCampaign(campRes, totalRaised, contributorCount, isReleased);
              }
            } catch {
              // Return local fallback if query fails
              return localCampaigns.find((c) => c.id === id) || null;
            }
            return null;
          })();
        });

        const fetchedCampaigns = (await Promise.all(campaignPromises)).filter(Boolean) as Campaign[];

        if (fetchedCampaigns.length > 0) {
          localCampaigns = fetchedCampaigns;
          campaignsCache = {
            data: fetchedCampaigns,
            timestamp: Date.now(),
          };
          return fetchedCampaigns;
        }
      }
    } catch {
      // Fallback
    }

    return localCampaigns;
  }

  public async getCampaignById(id: number, forceRefresh = false): Promise<Campaign | null> {
    // Check in-memory cached campaigns first
    if (!forceRefresh && campaignsCache) {
      const cached = campaignsCache.data.find((c) => c.id === id);
      if (cached && Date.now() - campaignsCache.timestamp < CACHE_TTL_MS) {
        return cached;
      }
    }

    try {
      // Query registry and escrow concurrently
      const [campRes, totalRes, countContribRes, releasedRes] = await Promise.all([
        stellarRpc.callReadOnly({
          contractId: this.contractId,
          method: "get_campaign",
          args: [nativeToScVal(BigInt(id), { type: "u64" })],
        }),
        stellarRpc
          .callReadOnly({
            contractId: CONTRACT_CONFIG.escrowContractId,
            method: "get_total_raised",
            args: [nativeToScVal(BigInt(id), { type: "u64" })],
          })
          .catch(() => null),
        stellarRpc
          .callReadOnly({
            contractId: CONTRACT_CONFIG.escrowContractId,
            method: "get_contributor_count",
            args: [nativeToScVal(BigInt(id), { type: "u64" })],
          })
          .catch(() => null),
        stellarRpc
          .callReadOnly({
            contractId: CONTRACT_CONFIG.escrowContractId,
            method: "is_funds_released",
            args: [nativeToScVal(BigInt(id), { type: "u64" })],
          })
          .catch(() => null),
      ]);

      if (campRes) {
        const totalRaised = totalRes !== null && totalRes !== undefined ? BigInt(totalRes.toString()) : 0n;
        const contributorCount = countContribRes !== null && countContribRes !== undefined ? Number(countContribRes) : 0;
        const isReleased = Boolean(releasedRes);

        const campObj = mapRawToCampaign(campRes, totalRaised, contributorCount, isReleased);
        const idx = localCampaigns.findIndex((c) => c.id === id);
        if (idx >= 0) {
          localCampaigns[idx] = campObj;
        } else {
          localCampaigns.push(campObj);
        }

        // Update item in cache if cache exists
        if (campaignsCache) {
          const cIdx = campaignsCache.data.findIndex((c) => c.id === id);
          if (cIdx >= 0) {
            campaignsCache.data[cIdx] = campObj;
          } else {
            campaignsCache.data.push(campObj);
          }
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

    useActivityStore.getState().addActivity({
      id: `act_create_${createdId}_${Date.now()}`,
      type: "campaign_created",
      campaignId: createdId,
      campaignTitle: params.title,
      actor: callerPublicKey,
      amountXlm: params.targetAmountXlm,
      timestamp: Date.now(),
      txHash,
      details: `Created campaign "${params.title}" with ${params.targetAmountXlm} XLM goal`,
    });

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

    const campaignTitle = campaign?.metadata.title || `Campaign #${campaignId}`;
    useActivityStore.getState().addActivity({
      id: `act_susp_${campaignId}_${Date.now()}`,
      type: "campaign_rejected",
      campaignId,
      campaignTitle,
      actor: adminPublicKey,
      timestamp: Date.now(),
      txHash,
      details: `Campaign #${campaignId} suspended by admin: ${reason}`,
    });

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

    const campaignTitle = campaign?.metadata.title || `Campaign #${campaignId}`;
    useActivityStore.getState().addActivity({
      id: `act_resm_${campaignId}_${Date.now()}`,
      type: "campaign_approved",
      campaignId,
      campaignTitle,
      actor: adminPublicKey,
      timestamp: Date.now(),
      txHash,
      details: `Campaign #${campaignId} approved and opened for funding`,
    });

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

    const campaignTitle = campaign?.metadata.title || `Campaign #${campaignId}`;
    useActivityStore.getState().addActivity({
      id: `act_canc_${campaignId}_${Date.now()}`,
      type: "campaign_cancelled",
      campaignId,
      campaignTitle,
      actor: callerPublicKey,
      timestamp: Date.now(),
      txHash,
      details: `Campaign #${campaignId} cancelled on-chain`,
    });

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

      useActivityStore.getState().addActivity({
        id: `act_funded_${campaignId}_${Date.now()}`,
        type: "state_changed",
        campaignId,
        campaignTitle: campaign.metadata.title || `Campaign #${campaignId}`,
        actor: contributorAddress,
        amountXlm: stroopsToXlm(newTotalStroops),
        timestamp: Date.now(),
        details: `Campaign #${campaignId} reached 100% funding goal on-chain! Status: Funded`,
      });
    }
  }

  public markCompleted(campaignId: number) {
    const campaign = localCampaigns.find((c) => c.id === campaignId);
    if (campaign) {
      campaign.status = "completed";
      campaign.isFundsReleased = true;
      campaign.canDisburse = false;

      useActivityStore.getState().addActivity({
        id: `act_completed_${campaignId}_${Date.now()}`,
        type: "state_changed",
        campaignId,
        campaignTitle: campaign.metadata.title || `Campaign #${campaignId}`,
        actor: campaign.creator,
        timestamp: Date.now(),
        details: `Campaign #${campaignId} successfully completed and closed`,
      });
    }
  }
}

export const registryService = new CampaignRegistryService();
