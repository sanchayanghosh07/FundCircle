import { stellarRpc } from "./rpc";
import { ActivityItem, ActivityType } from "@/types/activity";
import { stroopsToXlm } from "@/lib/utils";

export class EventIngestionService {
  private seenEventIds = new Set<string>();

  public async fetchLatestEvents(): Promise<ActivityItem[]> {
    try {
      const rawEvents = await stellarRpc.getEvents();
      if (!rawEvents || rawEvents.length === 0) return [];

      const parsed: ActivityItem[] = [];

      for (const ev of rawEvents) {
        try {
          const item = this.parseRawEvent(ev);
          if (item && !this.seenEventIds.has(item.id)) {
            this.seenEventIds.add(item.id);
            parsed.push(item);
          }
        } catch {
          // ignore unparseable events
        }
      }

      return parsed.sort((a, b) => b.timestamp - a.timestamp);
    } catch {
      return [];
    }
  }

  public parseRawEvent(ev: any): ActivityItem | null {
    const topic = ev.topic?.[0] || "";
    const id = `ev_${ev.id || Math.random().toString(36).substring(2, 7)}`;
    const timestamp = ev.ledgerClosedAt ? new Date(ev.ledgerClosedAt).getTime() : Date.now();

    if (topic.includes("contrib")) {
      return {
        id,
        type: "contributed",
        campaignId: Number(ev.topic?.[1] || 1),
        campaignTitle: ev.campaignTitle || "Community Campaign",
        actor: ev.topic?.[2] || "GBZCR2Z4UGP5J44N64C72BMSN657XQ4F4J4B7W4UGQO676S47M4UGW5M",
        amountXlm: stroopsToXlm(ev.value || "0"),
        timestamp,
        txHash: ev.txHash,
        details: "Contributed funds via Escrow",
      };
    }

    if (topic.includes("cmp_creat")) {
      return {
        id,
        type: "campaign_created",
        campaignId: Number(ev.topic?.[2] || 1),
        campaignTitle: ev.campaignTitle || "New Community Campaign",
        actor: ev.topic?.[1] || "GBZCR2Z4UGP5J44N64C72BMSN657XQ4F4J4B7W4UGQO676S47M4UGW5M",
        timestamp,
        txHash: ev.txHash,
        details: "Campaign created on Stellar Registry",
      };
    }

    if (topic.includes("cmp_appr")) {
      return {
        id,
        type: "campaign_approved",
        campaignId: Number(ev.topic?.[1] || 1),
        campaignTitle: ev.campaignTitle || "Approved Campaign",
        actor: ev.topic?.[2] || "GBZCR2Z4UGP5J44N64C72BMSN657XQ4F4J4B7W4UGQO676S47M4UGW5M",
        timestamp,
        txHash: ev.txHash,
        details: "Campaign approved by reviewer and opened for funding",
      };
    }

    if (topic.includes("fund_rel")) {
      return {
        id,
        type: "funds_released",
        campaignId: Number(ev.topic?.[1] || 1),
        campaignTitle: ev.campaignTitle || "Funded Campaign",
        actor: ev.topic?.[2] || "GBZCR2Z4UGP5J44N64C72BMSN657XQ4F4J4B7W4UGQO676S47M4UGW5M",
        amountXlm: ev.value ? stroopsToXlm(ev.value) : undefined,
        timestamp,
        txHash: ev.txHash,
        details: "Funds disbursed to campaign creator",
      };
    }

    if (topic.includes("refund")) {
      return {
        id,
        type: "refund_claimed",
        campaignId: Number(ev.topic?.[1] || 1),
        campaignTitle: ev.campaignTitle || "Campaign Refund",
        actor: ev.topic?.[2] || "GBZCR2Z4UGP5J44N64C72BMSN657XQ4F4J4B7W4UGQO676S47M4UGW5M",
        amountXlm: ev.value ? stroopsToXlm(ev.value) : undefined,
        timestamp,
        txHash: ev.txHash,
        details: "Contributor claimed refund from Escrow",
      };
    }

    return null;
  }
}

export const eventIngestion = new EventIngestionService();
