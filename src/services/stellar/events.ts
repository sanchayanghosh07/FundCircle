import { stellarRpc } from "./rpc";
import { ActivityItem, ActivityType } from "@/types/activity";
import { stroopsToXlm } from "@/lib/utils";

export class EventIngestionService {
  public async fetchLatestEvents(): Promise<ActivityItem[]> {
    try {
      const rawEvents = await stellarRpc.getEvents();
      if (!rawEvents || rawEvents.length === 0) return [];

      const parsed: ActivityItem[] = [];

      for (const ev of rawEvents) {
        try {
          const item = this.parseRawEvent(ev);
          if (item) parsed.push(item);
        } catch {
          // ignore unparseable events
        }
      }

      return parsed;
    } catch {
      return [];
    }
  }

  private parseRawEvent(ev: any): ActivityItem | null {
    const topic = ev.topic?.[0] || "";
    const id = `ev_${ev.id || Math.random().toString(36).substring(2, 7)}`;
    const timestamp = ev.ledgerClosedAt ? new Date(ev.ledgerClosedAt).getTime() : Date.now();

    if (topic.includes("contrib")) {
      return {
        id,
        type: "contributed",
        campaignId: Number(ev.topic?.[1] || 1),
        campaignTitle: "Community Campaign",
        actor: ev.topic?.[2] || "G...",
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
        campaignTitle: "New Community Campaign",
        actor: ev.topic?.[1] || "G...",
        timestamp,
        txHash: ev.txHash,
        details: "Campaign created on Stellar Registry",
      };
    }

    if (topic.includes("fund_rel")) {
      return {
        id,
        type: "funds_released",
        campaignId: Number(ev.topic?.[1] || 1),
        campaignTitle: "Funded Campaign",
        actor: ev.topic?.[2] || "G...",
        timestamp,
        txHash: ev.txHash,
        details: "Funds disbursed to creator",
      };
    }

    if (topic.includes("refund")) {
      return {
        id,
        type: "refund_claimed",
        campaignId: Number(ev.topic?.[1] || 1),
        campaignTitle: "Campaign Refund",
        actor: ev.topic?.[2] || "G...",
        timestamp,
        txHash: ev.txHash,
        details: "Contributor claimed refund",
      };
    }

    return null;
  }
}

export const eventIngestion = new EventIngestionService();
