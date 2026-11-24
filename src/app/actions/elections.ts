"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireRole, requireMember } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { str, optStr } from "@/lib/utils";
import { phaseOf, ineligibleReason } from "@/lib/elections";
import { seal } from "@/lib/security";
import { flushBallots } from "@/lib/ballots";

export type EState = { ok?: boolean; error?: string; message?: string };
const ADMIN = ["ADMIN"] as const;

async function editable(electionId: string) {
  const e = await db.election.findUnique({ where: { id: electionId } });
  if (!e) return { e: null, error: "Election not found." };
  if (phaseOf(e) !== "UPCOMING") return { e, error: "Voting has opened — candidates and positions are locked." };
  return { e, error: null };
}

export async function saveElection(_: EState, fd: FormData): Promise<EState> {
  const admin = await requireRole([...ADMIN], "/admin");
  const id = optStr(fd, "id");
  const title = str(fd, "title");
  const opensAt = new Date(str(fd, "opensAt"));
  const closesAt = new Date(str(fd, "closesAt"));
  if (title.length < 3) return { error: "Give the election a title, e.g. “IGMH Staff Union ExCom election 2027”." };
  if (isNaN(+opensAt) || isNaN(+closesAt) || closesAt <= opensAt) return { error: "Voting must close after it opens." };
  const affiliateId = optStr(fd, "affiliateId");
  const data = { title, description: optStr(fd, "description"), affiliateId, opensAt, closesAt, requireDuesPaid: fd.get("requireDuesPaid") === "on" };
  if (id) {
    const { error } = await editable(id);
    if (error) return { error };
    await db.election.update({ where: { id }, data });
    await audit(admin.id, "election_update", "Election", id, title);
    revalidatePath(`/admin/elections/${id}`);
    return { ok: true, message: "Saved." };
  }
  const e = await db.election.create({ data });
  await audit(admin.id, "election_create", "Election", e.id, title);
  redirect(`/admin/elections/${e.id}`);
}

export async function addPosition(_: EState, fd: FormData): Promise<EState> {
  await requireRole([...ADMIN], "/admin");
  const electionId = str(fd, "electionId");
  const { error } = await editable(electionId);
  if (error) return { error };
  const title = str(fd, "title");
  const seats = Math.max(1, Math.min(20, Number(str(fd, "seats")) || 1));
  if (title.length < 2) return { error: "Enter the position, e.g. President." };
  const order = await db.electionPosition.count({ where: { electionId } });
  await db.electionPosition.create({ data: { electionId, title, seats, order } });
  revalidatePath(`/admin/elections/${electionId}`);
  return { ok: true };
}

export async function removePosition(fd: FormData) {
  await requireRole([...ADMIN], "/admin");
  const p = await db.electionPosition.findUnique({ where: { id: str(fd, "id") } });
  if (!p || (await editable(p.electionId)).error) return;
  await db.electionPosition.delete({ where: { id: p.id } });
  revalidatePath(`/admin/elections/${p.electionId}`);
}

export async function addCandidate(_: EState, fd: FormData): Promise<EState> {
  await requireRole([...ADMIN], "/admin");
  const position = await db.electionPosition.findUnique({ where: { id: str(fd, "positionId") }, include: { election: true } });
  if (!position) return { error: "Position not found." };
  const { error } = await editable(position.electionId);
  if (error) return { error };
  const no = str(fd, "membershipNo").toUpperCase();
  const m = await db.member.findUnique({ where: { membershipNo: no } });
  if (!m) return { error: `No member with membership number ${no}.` };
  if (m.status !== "ACTIVE") return { error: `${m.fullName} is not an active member.` };
  if (position.election.affiliateId && m.affiliateId !== position.election.affiliateId) return { error: `${m.fullName} is not a member of this workplace union.` };
  try {
    await db.electionCandidate.create({ data: { positionId: position.id, memberId: m.id, statement: optStr(fd, "statement") } });
  } catch {
    return { error: `${m.fullName} is already a candidate for this position.` };
  }
  revalidatePath(`/admin/elections/${position.electionId}`);
  return { ok: true, message: `${m.fullName} added.` };
}

export async function removeCandidate(fd: FormData) {
  await requireRole([...ADMIN], "/admin");
  const c = await db.electionCandidate.findUnique({ where: { id: str(fd, "id") }, include: { position: true } });
  if (!c || (await editable(c.position.electionId)).error) return;
  await db.electionCandidate.delete({ where: { id: c.id } });
  revalidatePath(`/admin/elections/${c.position.electionId}`);
}

export async function publishResults(fd: FormData) {
  const admin = await requireRole([...ADMIN], "/admin");
  const e = await db.election.findUnique({ where: { id: str(fd, "id") } });
  if (!e || phaseOf(e) !== "CLOSED") return;
  await flushBallots(e.id, true);
  await db.election.update({ where: { id: e.id }, data: { resultsPublished: fd.get("publish") === "1" } });
  await audit(admin.id, fd.get("publish") === "1" ? "election_publish" : "election_unpublish", "Election", e.id, e.title);
  revalidatePath(`/admin/elections/${e.id}`);
  revalidatePath("/members/elections");
}

export async function deleteElection(fd: FormData) {
  const admin = await requireRole([...ADMIN], "/admin");
  const e = await db.election.findUnique({ where: { id: str(fd, "id") }, include: { _count: { select: { voters: true } } } });
  if (!e) redirect("/admin/elections");
  if (e!._count.voters > 0) redirect(`/admin/elections/${e!.id}?error=` + encodeURIComponent("Votes have been cast, so this election can't be deleted."));
  await db.election.delete({ where: { id: e!.id } });
  await audit(admin.id, "election_delete", "Election", e!.id, e!.title);
  redirect("/admin/elections");
}

/** Cast a secret ballot: records that the member voted, and (separately, unlinked) their choices. */
export async function castElectionBallot(_: EState, fd: FormData): Promise<EState> {
  const { user, member } = await requireMember();
  const e = await db.election.findUnique({ where: { id: str(fd, "electionId") }, include: { positions: { include: { candidates: { select: { id: true } } } } } });
  if (!e) return { error: "Election not found." };
  if (phaseOf(e) !== "OPEN") return { error: "Voting is not open." };
  const why = ineligibleReason(member, e);
  if (why) return { error: why };
  const choices: { positionId: string; candidateId: string }[] = [];
  for (const p of e.positions) {
    const picked = [...new Set(fd.getAll(`pos_${p.id}`).map(String))];
    if (picked.length > p.seats) return { error: `You can choose at most ${p.seats} for ${p.title}.` };
    const valid = new Set(p.candidates.map((c) => c.id));
    for (const cid of picked) {
      if (!valid.has(cid)) return { error: "Invalid choice." };
      choices.push({ positionId: p.id, candidateId: cid });
    }
  }
  try {
    // Record THAT the member voted, plus a SEALED (encrypted) ballot with no link to them.
    // The choices are only counted later, shuffled together with other ballots, in a
    // separate transaction — see src/lib/ballots.ts.
    await db.$transaction([
      db.electionVoter.create({ data: { electionId: e.id, memberId: member.id } }),
      db.electionPendingBallot.create({ data: { electionId: e.id, sealed: seal(choices) } }),
    ]);
  } catch {
    return { error: "You have already voted in this election." };
  }
  await flushBallots(e.id).catch(() => {}); // counts only once enough ballots are waiting
  await audit(user.id, "election_vote", "Election", e.id);
  revalidatePath("/members/elections");
  return { ok: true, message: "Your vote has been recorded. Thank you for taking part!" };
}
