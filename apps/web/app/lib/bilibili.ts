export const BILIBILI_EMBED_PATTERN = /^\[\[bilibili:(BV[0-9A-Za-z]+)\]\]$/i;

export interface BilibiliCardData {
  bvid: string;
  title: string;
  author: string;
  description: string;
  coverUrl: string;
  videoUrl: string;
  degraded?: boolean;
}

export function normalizeBilibiliBvid(value?: string | null) {
  if (!value) return null;

  const trimmed = value.trim();
  const directMatch = trimmed.match(/^BV([0-9A-Za-z]+)$/i);
  if (directMatch) {
    return `BV${directMatch[1]}`;
  }

  const embedMatch = trimmed.match(BILIBILI_EMBED_PATTERN);
  if (embedMatch) {
    const payloadMatch = embedMatch[1].match(/^BV([0-9A-Za-z]+)$/i);
    if (payloadMatch) {
      return `BV${payloadMatch[1]}`;
    }
  }

  return null;
}

export function getBilibiliVideoUrl(bvid: string) {
  return `https://www.bilibili.com/video/${bvid}`;
}

export function normalizeBilibiliImageUrl(url?: string | null) {
  if (!url) return "";
  if (url.startsWith("//")) {
    return `https:${url}`;
  }
  return url;
}
