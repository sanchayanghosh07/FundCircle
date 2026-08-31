import { scValToNative, xdr } from "@stellar/stellar-sdk";
import { stellarRpc } from "./rpc";
import { ActivityItem, ActivityType } from "@/types/activity";
import { useActivityStore } from "@/stores/activityStore";
import { stroopsToXlm } from "@/lib/utils";

export function parseScValOrNative(val: any): any {
  if (val === null || val === undefined) return undefined;

  if (typeof val === "number" || typeof val === "boolean" || typeof val === "bigint") {
    return val;
  }

  if (typeof val === "string") {
    try {
      const decoded = xdr.ScVal.fromXDR(val, "base64");
      return scValToNative(decoded);
    } catch {
      return val;
    }
  }

  try {
    return scValToNative(val);
  } catch {
    if (val && typeof val === "object") {
      if (val.value !== undefined) {
        try {
          return scValToNative(val.value);
        } catch {
          return val.value;
        }
      }
      if (val._value !== undefined) {
        return val._value;
      }
    }
    return val;
  }
}

export class EventIngestionService {
  private seenEventIds = new Set<string>();
  private pollingTimer: NodeJS.Timeout | null = null;

  public async fetchLatestEvents(): Promise<ActivityItem[]> {
    try {
      const rawEvents = await stellarRpc.getEvents();
      if (!rawEvents || rawEvents.length === 0) return [];

      const parsed: ActivityItem[] = [];

      for (const ev of rawEvents) {
        try {
          const item = this.parseRawEvent(ev);
          if (item) {
            this.seenEventIds.add(item.id);
            parsed.push(item);
          }
        } catch (err) {
          console.warn("Error parsing individual Soroban event:", err);
        }
      }

      if (parsed.length > 0) {
        useActivityStore.getState().addActivities(parsed);
      }

      return parsed.sort((a, b) => b.timestamp - a.timestamp);
    } catch (err) {
      console.warn("Event ingestion failed:", err);
      return [];
    }
  }

  public parseRawEvent(ev: any): ActivityItem | null {
    if (!ev) return null;

    let rawTopics: any[] = [];
    if (Array.isArray(ev.topic)) {
      rawTopics = ev.topic;
    } else if (ev.topic) {
      rawTopics = [ev.topic];
    }

    const topics = rawTopics.map((t) => parseScValOrNative(t));
    const rawVal = parseScValOrNative(ev.value);

    const topic0 = (topics[0] !== undefined && topics[0] !== null ? String(topics[0]) : "").toLowerCase();
    const id = `ev_${ev.id || ev.pagingToken || Math.random().toString(36).substring(2, 9)}`;
    const timestamp = ev.ledgerClosedAt
      ? new Date(ev.ledgerClosedAt).getTime()
      : ev.timestamp || Date.now();
    const txHash = ev.txHash || "";

    // 1. Contribution: (symbol_short!("contrib"), campaign_id, contributor), amount
    if (topic0.includes("contrib")) {
      const campaignId = Number(topics[1] || 1);
      const actor = topics[2] ? String(topics[2]) : (topics[1] ? String(topics[1]) : "Contributor");
      const amountVal = rawVal !== undefined ? String(rawVal) : "0";
      const amountXlm = stroopsToXlm(amountVal);

      return {
        id,
        type: "contributed",
        campaignId,
        campaignTitle: ev.campaignTitle || `Campaign #${campaignId}`,
        actor,
        amountXlm,
        timestamp,
        txHash,
        details: `Contributed ${amountXlm} XLM via Soroban Escrow`,
      };
    }

    // 2. Campaign Created: (symbol_short!("cmp_creat"), creator, count), target_amount
    if (topic0.includes("cmp_creat")) {
      const actor = topics[1] ? String(topics[1]) : "Creator";
      const campaignId = Number(topics[2] || 1);
      const targetVal = rawVal !== undefined ? String(rawVal) : "0";
      const amountXlm = targetVal !== "0" ? stroopsToXlm(targetVal) : undefined;

      return {
        id,
        type: "campaign_created",
        campaignId,
        campaignTitle: ev.campaignTitle || `Campaign #${campaignId}`,
        actor,
        amountXlm,
        timestamp,
        txHash,
        details: `Campaign #${campaignId} created on Stellar Registry${amountXlm ? ` (${amountXlm} XLM goal)` : ""}`,
      };
    }

    // 3. Status Changed (Funded / Completed / Refund): (symbol_short!("cmp_stat"), campaign_id), symbol_short!("funded" | "completed" | "refund")
    if (topic0.includes("cmp_stat")) {
      const campaignId = Number(topics[1] || 1);
      const statStr = (rawVal !== undefined && rawVal !== null ? String(rawVal) : "").toLowerCase();

      let details = `Campaign #${campaignId} on-chain state updated to ${statStr || "active"}`;
      if (statStr.includes("fund")) {
        details = `Campaign #${campaignId} reached 100% funding goal! Status: Funded`;
      } else if (statStr.includes("comp")) {
        details = `Campaign #${campaignId} completed successfully on-chain`;
      } else if (statStr.includes("ref")) {
        details = `Campaign #${campaignId} transitioned to Refund state`;
      }

      return {
        id,
        type: "state_changed",
        campaignId,
        campaignTitle: ev.campaignTitle || `Campaign #${campaignId}`,
        actor: topics[2] ? String(topics[2]) : "Soroban Protocol Escrow",
        timestamp,
        txHash,
        details,
      };
    }

    // 4. Funds Released: (symbol_short!("fund_rel"), campaign_id, creator), total_raised
    if (topic0.includes("fund_rel")) {
      const campaignId = Number(topics[1] || 1);
      const actor = topics[2] ? String(topics[2]) : "Creator";
      const amountVal = rawVal !== undefined ? String(rawVal) : undefined;
      const amountXlm = amountVal ? stroopsToXlm(amountVal) : undefined;

      return {
        id,
        type: "funds_released",
        campaignId,
        campaignTitle: ev.campaignTitle || `Campaign #${campaignId}`,
        actor,
        amountXlm,
        timestamp,
        txHash,
        details: `Disbursed ${amountXlm ? amountXlm + " XLM" : "funds"} to campaign creator`,
      };
    }

    // 5. Refund Claimed: (symbol_short!("refund"), campaign_id, contributor), refund_amount
    if (topic0.includes("refund")) {
      const campaignId = Number(topics[1] || 1);
      const actor = topics[2] ? String(topics[2]) : "Contributor";
      const amountVal = rawVal !== undefined ? String(rawVal) : undefined;
      const amountXlm = amountVal ? stroopsToXlm(amountVal) : undefined;

      return {
        id,
        type: "refund_claimed",
        campaignId,
        campaignTitle: ev.campaignTitle || `Campaign #${campaignId}`,
        actor,
        amountXlm,
        timestamp,
        txHash,
        details: `Contributor claimed refund of ${amountXlm ? amountXlm + " XLM" : "pledged funds"} from Escrow`,
      };
    }

    // 6. Campaign Approved / Resumed: (symbol_short!("cmp_resm" | "cmp_appr"), admin, campaign_id), status
    if (topic0.includes("cmp_resm") || topic0.includes("cmp_appr")) {
      const actor = topics[1] ? String(topics[1]) : "Protocol Administrator";
      const campaignId = Number(topics[2] || 1);

      return {
        id,
        type: "campaign_approved",
        campaignId,
        campaignTitle: ev.campaignTitle || `Campaign #${campaignId}`,
        actor,
        timestamp,
        txHash,
        details: `Campaign #${campaignId} approved and opened for funding`,
      };
    }

    // 7. Campaign Suspended: (symbol_short!("cmp_susp"), admin, campaign_id), reason
    if (topic0.includes("cmp_susp")) {
      const actor = topics[1] ? String(topics[1]) : "Protocol Moderator";
      const campaignId = Number(topics[2] || 1);
      const reason = rawVal ? String(rawVal) : "Under community compliance review";

      return {
        id,
        type: "campaign_rejected",
        campaignId,
        campaignTitle: ev.campaignTitle || `Campaign #${campaignId}`,
        actor,
        timestamp,
        txHash,
        details: `Campaign #${campaignId} suspended: ${reason}`,
      };
    }

    // 8. Campaign Submitted: (symbol_short!("cmp_sub"), creator, campaign_id)
    if (topic0.includes("cmp_sub")) {
      const actor = topics[1] ? String(topics[1]) : "Campaign Creator";
      const campaignId = Number(topics[2] || 1);

      return {
        id,
        type: "campaign_submitted",
        campaignId,
        campaignTitle: ev.campaignTitle || `Campaign #${campaignId}`,
        actor,
        timestamp,
        txHash,
        details: `Campaign #${campaignId} submitted for review`,
      };
    }

    // 9. Campaign Rejected: (symbol_short!("cmp_rej"), admin, campaign_id), reason
    if (topic0.includes("cmp_rej")) {
      const actor = topics[1] ? String(topics[1]) : "Protocol Moderator";
      const campaignId = Number(topics[2] || 1);
      const reason = rawVal ? String(rawVal) : "Draft revisions required";

      return {
        id,
        type: "campaign_rejected",
        campaignId,
        campaignTitle: ev.campaignTitle || `Campaign #${campaignId}`,
        actor,
        timestamp,
        txHash,
        details: `Campaign #${campaignId} rejected: ${reason}`,
      };
    }

    // 10. Campaign Cancelled: (symbol_short!("cmp_canc"), campaign_id)
    if (topic0.includes("cmp_canc")) {
      const campaignId = Number(topics[1] || 1);

      return {
        id,
        type: "campaign_cancelled",
        campaignId,
        campaignTitle: ev.campaignTitle || `Campaign #${campaignId}`,
        actor: topics[2] ? String(topics[2]) : "Campaign Authority",
        timestamp,
        txHash,
        details: `Campaign #${campaignId} cancelled on-chain`,
      };
    }

    // 11. Initializations
    if (topic0.includes("reg_init") || topic0.includes("esc_init")) {
      return {
        id,
        type: "state_changed",
        campaignId: 1,
        campaignTitle: "FundCircle Protocol Contracts",
        actor: topics[1] ? String(topics[1]) : "Protocol Administrator",
        timestamp,
        txHash,
        details: "Soroban Smart Contract initialized on ledger",
      };
    }

    return null;
  }

  public startPolling(onEvents?: (events: ActivityItem[]) => void, intervalMs = 8000): () => void {
    if (this.pollingTimer) {
      clearInterval(this.pollingTimer);
    }

    const poll = async () => {
      const events = await this.fetchLatestEvents();
      if (events.length > 0 && onEvents) {
        onEvents(events);
      }
    };

    poll();
    this.pollingTimer = setInterval(poll, intervalMs);

    return () => {
      if (this.pollingTimer) {
        clearInterval(this.pollingTimer);
        this.pollingTimer = null;
      }
    };
  }
}

export const eventIngestion = new EventIngestionService();

