import "server-only";
import { db } from "./db";
import { unseal } from "./security";

type Choice = { positionId: string; candidateId: string };
export const FLUSH_THRESHOLD = 5;

/**
 * Move sealed ballots into the count. Runs in its own transaction (separate from any
 * voter's), opens every pending ballot for the election, shuffles ALL individual choices
 * together, writes them as anonymous ElectionVote rows, and deletes the sealed copies.
 * With `force=false` it only runs once at least FLUSH_THRESHOLD ballots are waiting,
 * so a single counted batch never corresponds to a single voter.
 */
export async function flushBallots(electionId: string, force = false) {
  return db.$transaction(async (tx) => {
    const pending = await tx.electionPendingBallot.findMany({ where: { electionId } });
    if (!pending.length || (!force && pending.length < FLUSH_THRESHOLD)) return 0;
    const choices: Choice[] = pending.flatMap((p) => unseal<Choice[]>(p.sealed));
    for (let i = choices.length - 1; i > 0; i--) { // Fisher–Yates shuffle
      const j = Math.floor(Math.random() * (i + 1));
      [choices[i], choices[j]] = [choices[j], choices[i]];
    }
    if (choices.length) await tx.electionVote.createMany({ data: choices });
    await tx.electionPendingBallot.deleteMany({ where: { id: { in: pending.map((p) => p.id) } } });
    return pending.length;
  });
}

/** Count every remaining sealed ballot for elections that have closed (used before showing results, and daily). */
export async function flushClosedElections() {
  const closed = await db.election.findMany({ where: { closesAt: { lt: new Date() } }, select: { id: true } });
  let n = 0;
  for (const e of closed) n += await flushBallots(e.id, true);
  return n;
}
