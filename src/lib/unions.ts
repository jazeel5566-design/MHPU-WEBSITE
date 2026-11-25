import type { Prisma } from "@prisma/client";

/*
 * Workplace union membership numbers. Each union hands out its own numbers
 * (its short name + a running number, e.g. IGMH-SU-0001). A member gets a new number
 * every time they are placed in a union; numbers are never reused.
 */

/** Data to save on the member when their union changes (or is removed). Call inside a transaction. */
export async function unionNumberFor(tx: Prisma.TransactionClient, affiliateId: string | null) {
  if (!affiliateId) return { affiliateId: null, unionMemberNo: null };
  const a = await tx.affiliate.update({ where: { id: affiliateId }, data: { nextMemberNo: { increment: 1 } }, select: { shortName: true, nextMemberNo: true } });
  const n = a.nextMemberNo - 1;
  return { affiliateId, unionMemberNo: `${a.shortName.trim().toUpperCase()}-${String(n).padStart(4, "0")}` };
}
