import type { Election, Member } from "@prisma/client";

export type ElectionPhase = "UPCOMING" | "OPEN" | "CLOSED";

export function phaseOf(e: Pick<Election, "opensAt" | "closesAt">, now = new Date()): ElectionPhase {
  if (now < e.opensAt) return "UPCOMING";
  if (now <= e.closesAt) return "OPEN";
  return "CLOSED";
}

/** Why a member may not vote (null = eligible). */
export function ineligibleReason(m: Pick<Member, "status" | "affiliateId" | "duesPaidUntil">, e: Pick<Election, "affiliateId" | "requireDuesPaid">, now = new Date()): string | null {
  if (m.status !== "ACTIVE") return "Only active members can vote.";
  if (e.affiliateId && m.affiliateId !== e.affiliateId) return "This election is for members of another workplace union.";
  if (e.requireDuesPaid && (!m.duesPaidUntil || m.duesPaidUntil < now)) return "Your dues need to be up to date to vote. Pay your dues, then come back to vote.";
  return null;
}

/** Prisma filter for members eligible to vote in an election. */
export function eligibleWhere(e: Pick<Election, "affiliateId" | "requireDuesPaid">, now = new Date()) {
  return {
    status: "ACTIVE",
    ...(e.affiliateId ? { affiliateId: e.affiliateId } : {}),
    ...(e.requireDuesPaid ? { duesPaidUntil: { gte: now } } : {}),
  };
}

/** Rank candidates per position; winners are the top `seats` (ties at the cut-off are flagged). */
export function tally(position: { seats: number; candidates: { id: string; name: string; votes: number }[] }) {
  const sorted = [...position.candidates].sort((a, b) => b.votes - a.votes);
  const cutoff = sorted[position.seats - 1]?.votes;
  const tieAtCutoff = cutoff !== undefined && cutoff > 0 && sorted.filter((c) => c.votes === cutoff).length > sorted.slice(0, position.seats).filter((c) => c.votes === cutoff).length;
  return sorted.map((c, i) => ({ ...c, elected: i < position.seats && c.votes > 0 && !(tieAtCutoff && c.votes === cutoff), tie: tieAtCutoff && c.votes === cutoff }));
}
