/** Members can join from 15 minutes before the start until the end (or 4 hours after the start). */
export function meetingWindow(e: { startsAt: Date; endsAt: Date | null }) {
  const opens = new Date(e.startsAt.getTime() - 15 * 60 * 1000);
  const closes = e.endsAt ?? new Date(e.startsAt.getTime() + 4 * 60 * 60 * 1000);
  return { opens, closes };
}

export function meetingState(e: { startsAt: Date; endsAt: Date | null }, now = new Date()): "SOON" | "LIVE" | "ENDED" {
  const { opens, closes } = meetingWindow(e);
  return now < opens ? "SOON" : now <= closes ? "LIVE" : "ENDED";
}

/** Accept Google Meet (and other https meeting) links only. */
export function cleanMeetingUrl(raw: string): string | null {
  const v = raw.trim();
  if (!v) return null;
  try {
    const u = new URL(v.startsWith("http") ? v : `https://${v}`);
    if (u.protocol !== "https:") return null;
    return u.toString();
  } catch {
    return null;
  }
}
