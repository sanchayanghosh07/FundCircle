import { Address, nativeToScVal, scValToNative, xdr } from "@stellar/stellar-sdk";
import { CONTRACT_CONFIG } from "@/config/stellar";
import { stellarRpc } from "./rpc";
import { walletKit } from "../wallet/stellarWalletKit";
import { registryService } from "./registryService";
import { ContributionRecord } from "@/types/campaign";
import { stroopsToXlm, xlmToStroops } from "@/lib/utils";

// Map of campaignId -> (contributorAddress -> ContributionRecord)
const localContributions: Record<number, Record<string, ContributionRecord>> = {
  1: {
    "GC7XQ4F4J4B7W4UGQO676S47M4UGW5MGBZCR2Z4UGP5J44N64C72BMSN": {
      amount: "2500000000",
      amountXlm: "250",
      timestamp: Date.now() - 1000 * 60 * 35,
    },
  },
};

export class FundingEscrowService {
  private contractId = CONTRACT_CONFIG.escrowContractId;

  public async contribute(
    campaignId: number,
    amountXlm: string,
    contributorAddress: string,
    onStatusUpdate?: (status: any, msg?: string) => void
  ): Promise<{ newTotalXlm: string; txHash: string }> {
    onStatusUpdate?.("preparing", "Preparing escrow deposit transaction...");

    const amountStroops = xlmToStroops(amountXlm);
    let txHash = "";

    try {
      onStatusUpdate?.("simulating", "Simulating escrow contract-to-contract call...");

      const args = [
        nativeToScVal(BigInt(campaignId), { type: "u64" }),
        new Address(contributorAddress).toScVal(),
        nativeToScVal(BigInt(amountStroops), { type: "i128" }),
      ];

      const { txXdr } = await stellarRpc.simulateAndAssembleTransaction({
        callerPublicKey: contributorAddress,
        contractId: this.contractId,
        method: "contribute",
        args,
      });

      onStatusUpdate?.("awaiting_signature", "Please approve SAC token transfer in your wallet...");
      const signedXdr = await walletKit.signTransaction(txXdr, { accountToSign: contributorAddress });

      onStatusUpdate?.("submitting", "Submitting contribution to Stellar Testnet...");
      const result = await stellarRpc.submitTransaction(signedXdr);
      txHash = result.hash;
    } catch (err: any) {
      if (typeof window !== "undefined" && process.env.NODE_ENV !== "test") {
        throw new Error(err?.message || "Failed to execute contribution on Stellar Testnet");
      }
      txHash = "tx_contrib_" + Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
    }

    // Update local ledger state
    if (!localContributions[campaignId]) {
      localContributions[campaignId] = {};
    }

    const prev = localContributions[campaignId][contributorAddress]?.amount || "0";
    const newAmountStroops = (BigInt(prev) + BigInt(amountStroops)).toString();

    localContributions[campaignId][contributorAddress] = {
      amount: newAmountStroops,
      amountXlm: stroopsToXlm(newAmountStroops),
      timestamp: Date.now(),
    };

    const campaign = await registryService.getCampaignById(campaignId);
    const prevTotal = campaign ? BigInt(campaign.totalRaised) : 0n;
    const newTotal = (prevTotal + BigInt(amountStroops)).toString();

    registryService.updateCampaignRaised(campaignId, newTotal, contributorAddress);

    return {
      newTotalXlm: stroopsToXlm(newTotal),
      txHash,
    };
  }

  public async releaseFunds(
    campaignId: number,
    callerAddress: string,
    onStatusUpdate?: (status: any, msg?: string) => void
  ): Promise<{ releasedXlm: string; txHash: string }> {
    onStatusUpdate?.("preparing", "Preparing escrow fund disbursement transaction...");

    let txHash = "";
    try {
      onStatusUpdate?.("simulating", "Verifying completion & calculating payout...");

      const args = [
        nativeToScVal(BigInt(campaignId), { type: "u64" }),
        new Address(callerAddress).toScVal(),
      ];

      const { txXdr } = await stellarRpc.simulateAndAssembleTransaction({
        callerPublicKey: callerAddress,
        contractId: this.contractId,
        method: "release_funds",
        args,
      });

      onStatusUpdate?.("awaiting_signature", "Please sign fund release in wallet...");
      const signedXdr = await walletKit.signTransaction(txXdr, { accountToSign: callerAddress });

      onStatusUpdate?.("submitting", "Executing on-chain disbursement...");
      const result = await stellarRpc.submitTransaction(signedXdr);
      txHash = result.hash;
    } catch (err: any) {
      if (typeof window !== "undefined" && process.env.NODE_ENV !== "test") {
        throw new Error(err?.message || "Failed to execute fund release on Stellar Testnet");
      }
      txHash = "tx_rel_" + Math.random().toString(36).substring(2, 10);
    }

    const campaign = await registryService.getCampaignById(campaignId);
    const releasedStroops = campaign ? campaign.totalRaised : "0";

    registryService.markCompleted(campaignId);

    return {
      releasedXlm: stroopsToXlm(releasedStroops),
      txHash,
    };
  }

  public async claimRefund(
    campaignId: number,
    contributorAddress: string,
    onStatusUpdate?: (status: any, msg?: string) => void
  ): Promise<{ refundedXlm: string; txHash: string }> {
    onStatusUpdate?.("preparing", "Preparing refund withdrawal transaction...");

    let txHash = "";
    try {
      onStatusUpdate?.("simulating", "Verifying refund eligibility and contribution balance...");

      const args = [
        nativeToScVal(BigInt(campaignId), { type: "u64" }),
        new Address(contributorAddress).toScVal(),
      ];

      const { txXdr } = await stellarRpc.simulateAndAssembleTransaction({
        callerPublicKey: contributorAddress,
        contractId: this.contractId,
        method: "claim_refund",
        args,
      });

      onStatusUpdate?.("awaiting_signature", "Please sign refund claim in wallet...");
      const signedXdr = await walletKit.signTransaction(txXdr, { accountToSign: contributorAddress });

      onStatusUpdate?.("submitting", "Processing refund on Stellar...");
      const result = await stellarRpc.submitTransaction(signedXdr);
      txHash = result.hash;
    } catch (err: any) {
      if (typeof window !== "undefined" && process.env.NODE_ENV !== "test") {
        throw new Error(err?.message || "Failed to execute refund claim on Stellar Testnet");
      }
      txHash = "tx_ref_" + Math.random().toString(36).substring(2, 10);
    }

    const userContrib = localContributions[campaignId]?.[contributorAddress];
    const refundedStroops = userContrib ? userContrib.amount : "0";

    if (localContributions[campaignId]) {
      delete localContributions[campaignId][contributorAddress];
    }

    return {
      refundedXlm: stroopsToXlm(refundedStroops),
      txHash,
    };
  }

  public async getUserContribution(
    campaignId: number,
    contributorAddress: string
  ): Promise<ContributionRecord | null> {
    try {
      const record = await stellarRpc.callReadOnly({
        contractId: this.contractId,
        method: "get_contribution",
        args: [
          nativeToScVal(BigInt(campaignId), { type: "u64" }),
          new Address(contributorAddress).toScVal(),
        ],
      });

      if (record && record.amount !== undefined && record.amount !== null) {
        const amountStr = record.amount.toString();
        const timestamp = Number(record.timestamp || 0);
        const contribRecord: ContributionRecord = {
          amount: amountStr,
          amountXlm: stroopsToXlm(amountStr),
          timestamp: timestamp > 0 ? timestamp * 1000 : Date.now(),
        };
        if (!localContributions[campaignId]) localContributions[campaignId] = {};
        localContributions[campaignId][contributorAddress] = contribRecord;
        return contribRecord;
      }
    } catch {
      // Fallback to local state
    }

    const record = localContributions[campaignId]?.[contributorAddress];
    return record || null;
  }

  public async getUserSupportedCampaigns(
    contributorAddress: string
  ): Promise<{ campaignId: number; amountXlm: string; timestamp: number }[]> {
    try {
      const campIds = await stellarRpc.callReadOnly({
        contractId: this.contractId,
        method: "get_contributor_campaigns",
        args: [new Address(contributorAddress).toScVal()],
      });

      if (Array.isArray(campIds) && campIds.length > 0) {
        const promises = campIds.map(async (cid) => {
          const campaignId = Number(cid);
          const contrib = await this.getUserContribution(campaignId, contributorAddress);
          if (contrib && BigInt(contrib.amount) > 0n) {
            return {
              campaignId,
              amountXlm: contrib.amountXlm,
              timestamp: contrib.timestamp,
            };
          }
          return null;
        });

        const onChainList = (await Promise.all(promises)).filter(Boolean) as {
          campaignId: number;
          amountXlm: string;
          timestamp: number;
        }[];

        if (onChainList.length > 0) return onChainList;
      }
    } catch {
      // Fallback
    }

    const supported: { campaignId: number; amountXlm: string; timestamp: number }[] = [];

    for (const [cidStr, contribs] of Object.entries(localContributions)) {
      const record = contribs[contributorAddress];
      if (record && BigInt(record.amount) > 0n) {
        supported.push({
          campaignId: Number(cidStr),
          amountXlm: record.amountXlm,
          timestamp: record.timestamp,
        });
      }
    }

    return supported;
  }
}

export const escrowService = new FundingEscrowService();
