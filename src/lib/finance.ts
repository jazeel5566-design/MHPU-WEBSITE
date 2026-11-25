import "server-only";
import type { Prisma } from "@prisma/client";
import { db } from "./db";
import { getSettings } from "./settings";
import { duesCollectionOf, overdueWhere, owedFrom } from "./dues";

export type FinanceFilter = { from: Date; to: Date; unionId?: string; method?: string };

export const METHOD_LABELS: Record<string, string> = {
  SALARY_DEDUCTION: "Salary deduction", BANK_TRANSFER: "Bank transfer", CASH: "Cash", CARD: "Card (online)", TEST: "Test payments",
};

/** Parse ?from=YYYY-MM-DD&to=YYYY-MM-DD&union=&method= (defaults: 1 Jan this year → today). */
export function parseFilter(sp: Record<string, string | undefined>): FinanceFilter {
  const now = new Date();
  const d = (v: string | undefined, fb: Date) => { const x = v ? new Date(v + "T00:00:00Z") : fb; return isNaN(+x) ? fb : x; };
  const from = d(sp.from, new Date(Date.UTC(now.getUTCFullYear(), 0, 1)));
  const toDay = d(sp.to, new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())));
  const to = new Date(toDay.getTime() + 864e5 - 1); // inclusive end of day
  return { from, to, unionId: sp.union || undefined, method: sp.method || undefined };
}

export function paymentWhere(f: FinanceFilter): Prisma.PaymentWhereInput {
  return {
    paidAt: { gte: f.from, lte: f.to },
    ...(f.method ? { method: f.method } : { method: { not: "TEST" } }),
    ...(f.unionId ? { member: { affiliateId: f.unionId === "none" ? null : f.unionId } } : {}),
  };
}

export async function financeReport(f: FinanceFilter) {
  const s = await getSettings();
  const monthly = Number(s.monthlyDues) || 100;
  const where = paymentWhere(f);
  const payments = await db.payment.findMany({
    where, orderBy: { paidAt: "desc" },
    include: { member: { select: { id: true, fullName: true, membershipNo: true, affiliateId: true, affiliate: { select: { name: true, shortName: true } } } } },
  });
  const total = payments.reduce((a, p) => a + p.amount, 0);
  const payers = new Set(payments.map((p) => p.memberId)).size;

  // by month
  const byMonthMap = new Map<string, { amount: number; count: number }>();
  for (const p of payments) {
    const k = p.paidAt.toISOString().slice(0, 7);
    const v = byMonthMap.get(k) ?? { amount: 0, count: 0 };
    v.amount += p.amount; v.count++; byMonthMap.set(k, v);
  }
  const months: { key: string; label: string; amount: number; count: number }[] = [];
  for (let d = new Date(Date.UTC(f.from.getUTCFullYear(), f.from.getUTCMonth(), 1)); d <= f.to; d = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1))) {
    const key = d.toISOString().slice(0, 7);
    months.push({ key, label: d.toLocaleString("en-GB", { month: "short", year: "numeric", timeZone: "UTC" }), ...(byMonthMap.get(key) ?? { amount: 0, count: 0 }) });
  }

  // by method
  const byMethod = Object.entries(payments.reduce<Record<string, { amount: number; count: number }>>((acc, p) => {
    (acc[p.method] ??= { amount: 0, count: 0 }); acc[p.method].amount += p.amount; acc[p.method].count++; return acc;
  }, {})).map(([method, v]) => ({ method, label: METHOD_LABELS[method] ?? method, ...v })).sort((a, b) => b.amount - a.amount);

  // by workplace union (with collection rate among active members)
  const unions = await db.affiliate.findMany({ select: { id: true, name: true, shortName: true, _count: { select: { members: { where: { status: "ACTIVE" } } } } } });
  const unionRows = [...unions.map((u) => ({ id: u.id, name: u.name, active: u._count.members })), { id: "none", name: "No workplace union", active: await db.member.count({ where: { status: "ACTIVE", affiliateId: null } }) }]
    .filter((u) => !f.unionId || f.unionId === u.id)
    .map((u) => {
      const ps = payments.filter((p) => (p.member.affiliateId ?? "none") === u.id);
      const payersU = new Set(ps.map((p) => p.memberId)).size;
      return { ...u, amount: ps.reduce((a, p) => a + p.amount, 0), count: ps.length, payers: payersU, rate: u.active ? Math.round((payersU / u.active) * 100) : 0 };
    })
    .filter((u) => u.active > 0 || u.amount > 0)
    .sort((a, b) => b.amount - a.amount);

  // outstanding arrears today (estimate: whole months overdue × monthly dues)
  const now = new Date();
  const dues = duesCollectionOf(await getSettings());
  const start = dues.start;
  const overdue = await db.member.findMany({
    where: { status: "ACTIVE", NOT: { profession: "Student" }, ...overdueWhere(dues, now), ...(f.unionId ? { affiliateId: f.unionId === "none" ? null : f.unionId } : {}) },
    select: { duesPaidUntil: true, joinedAt: true },
  });
  const arrearsMonths = overdue.reduce((a, m) => a + Math.max(1, Math.ceil((now.getTime() - (m.duesPaidUntil ?? owedFrom(m.joinedAt, start)).getTime()) / (30.44 * 864e5))), 0);
  const activeMembers = await db.member.count({ where: { status: "ACTIVE", ...(f.unionId ? { affiliateId: f.unionId === "none" ? null : f.unionId } : {}) } });

  return {
    monthlyDues: monthly, total, count: payments.length, payers, activeMembers,
    collectionRate: activeMembers ? Math.round((payers / activeMembers) * 100) : 0,
    months, byMethod, unionRows,
    arrears: { members: overdue.length, months: arrearsMonths, amount: arrearsMonths * monthly },
    payments,
  };
}
