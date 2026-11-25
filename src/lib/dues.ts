import type { Prisma } from "@prisma/client";
import { getSettings, type Settings } from "./settings";

/*
 * Dues collection, shared by payments, finance, reminders and the member lists.
 * An admin starts collection for everyone from a chosen date (Finance → Dues collection).
 * Until collection is started, and before its start date, nobody is overdue and no reminders go out.
 * A payment made before the start date counts from the start date.
 */

export type DuesCollection = { on: boolean; start: Date | null };

export function duesCollectionOf(s: Pick<Settings, "duesCollectionOn" | "duesStartDate">): DuesCollection {
  const d = new Date(s.duesStartDate);
  return { on: s.duesCollectionOn === "true", start: s.duesStartDate && !isNaN(+d) ? d : null };
}

export async function duesCollection() {
  return duesCollectionOf(await getSettings());
}

/** Dues are being collected today (collection started and its start date reached). */
export const collecting = (c: DuesCollection, now = new Date()) => c.on && (!c.start || now >= c.start);

/** Date a new payment extends from: whichever is latest of paid-until, today and the start date. */
export function duesBase(paidUntil: Date | null, start: Date | null, now = new Date()) {
  const base = [paidUntil, now, start].filter((d): d is Date => !!d && d >= now).sort((a, b) => +b - +a)[0] ?? now;
  return new Date(base);
}

/** Paying dues turns a not-yet-active or lapsed member active. Suspended / resigned stay as they are. */
export const statusAfterPayment = (status: string) => (status === "INACTIVE" || status === "LAPSED" ? "ACTIVE" : status);

/** Members whose dues are overdue right now (nobody, until collection has started). */
export function overdueWhere(c: DuesCollection, now = new Date()): Prisma.MemberWhereInput {
  if (!collecting(c, now)) return { id: { in: [] } };
  return { OR: [{ duesPaidUntil: null }, { duesPaidUntil: { lt: now } }] };
}

/** When dues became owed for a member who has never paid: joining date, but never before the start date. */
export const owedFrom = (joinedAt: Date, start: Date | null) => (start && start > joinedAt ? start : joinedAt);
