import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format stroops (1 XLM = 10,000,000 stroops = 10^7) into human-readable XLM decimal string
 */
export function stroopsToXlm(stroops: string | number | bigint | i128Like): string {
  try {
    const val = BigInt(stroops.toString());
    const xlmInteger = val / 10000000n;
    const remainder = val % 10000000n;
    if (remainder === 0n) {
      return xlmInteger.toLocaleString();
    }
    const fractionalStr = remainder.toString().padStart(7, "0").replace(/0+$/, "");
    return `${xlmInteger.toLocaleString()}.${fractionalStr}`;
  } catch {
    return "0";
  }
}

type i128Like = { toString(): string };

/**
 * Convert an XLM number or decimal string into stroops (BigInt string)
 */
export function xlmToStroops(xlmAmount: string | number): string {
  const cleanStr = xlmAmount.toString().trim();
  if (!cleanStr || isNaN(Number(cleanStr)) || Number(cleanStr) < 0) {
    return "0";
  }
  const [whole, fractional = ""] = cleanStr.split(".");
  const paddedFractional = (fractional + "0000000").slice(0, 7);
  const total = BigInt(whole || "0") * 10000000n + BigInt(paddedFractional);
  return total.toString();
}

/**
 * Shorten public key / address for display (e.g. GABC...XYZ9)
 */
export function shortenAddress(address?: string | null, chars = 4): string {
  if (!address) return "";
  if (address.length <= chars * 2 + 3) return address;
  return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`;
}

/**
 * Format timestamp (seconds or milliseconds) to readable date
 */
export function formatDate(timestamp: number | string | bigint): string {
  if (!timestamp) return "N/A";
  const num = typeof timestamp === "bigint" ? Number(timestamp) : Number(timestamp);
  const ms = num < 10000000000 ? num * 1000 : num;
  return new Date(ms).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/**
 * Format timestamp with time
 */
export function formatDateTime(timestamp: number | string | bigint): string {
  if (!timestamp) return "N/A";
  const num = typeof timestamp === "bigint" ? Number(timestamp) : Number(timestamp);
  const ms = num < 10000000000 ? num * 1000 : num;
  return new Date(ms).toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Calculate time remaining from target timestamp in seconds
 */
export function getCountdown(deadlineInSeconds: number | bigint): {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isExpired: boolean;
  formatted: string;
} {
  const now = Math.floor(Date.now() / 1000);
  const target = typeof deadlineInSeconds === "bigint" ? Number(deadlineInSeconds) : deadlineInSeconds;
  const diff = target - now;

  if (diff <= 0) {
    return {
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      isExpired: true,
      formatted: "Ended",
    };
  }

  const days = Math.floor(diff / 86400);
  const hours = Math.floor((diff % 86400) / 3600);
  const minutes = Math.floor((diff % 3600) / 60);
  const seconds = diff % 60;

  let formatted = "";
  if (days > 0) {
    formatted = `${days}d ${hours}h left`;
  } else if (hours > 0) {
    formatted = `${hours}h ${minutes}m left`;
  } else {
    formatted = `${minutes}m ${seconds}s left`;
  }

  return { days, hours, minutes, seconds, isExpired: false, formatted };
}

/**
 * Safely copy text to clipboard with fallback
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
    const textArea = document.createElement("textarea");
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand("copy");
    document.body.removeChild(textArea);
    return true;
  } catch {
    return false;
  }
}
