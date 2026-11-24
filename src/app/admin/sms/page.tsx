import Link from "next/link";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { formatDateTime } from "@/lib/utils";
import { Badge, Card, CardHeader, EmptyState, Notice, PageHeader, Table, Td, Th } from "@/components/ui";
import { SmsComposer, ReminderPanel } from "@/components/admin/sms-forms";

export const metadata = { title: "SMS" };
export const dynamic = "force-dynamic";

const KIND: Record<string, string> = { MANUAL: "Message", DUES_UPCOMING: "Dues due soon", DUES_OVERDUE: "Dues overdue", MEETING: "Meeting", PAYMENT_RECEIPT: "Payment receipt" };

export default async function SmsPage() {
  await requireRole(["ADMIN"], "/admin");
  const [s, unions, events, log, monthCount] = await Promise.all([
    getSettings(),
    db.affiliate.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    db.event.findMany({ where: { startsAt: { gte: new Date(Date.now() - 864e5) } }, select: { id: true, title: true }, orderBy: { startsAt: "asc" }, take: 20 }),
    db.smsMessage.findMany({ include: { member: { select: { id: true, fullName: true } } }, orderBy: { createdAt: "desc" }, take: 100 }),
    db.smsMessage.count({ where: { status: "SENT", createdAt: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) } } }),
  ]);
  const testMode = s.smsProvider !== "DHIRAAGU";
  return (
    <div className="space-y-6">
      <PageHeader title="SMS" desc={`Send messages to members and manage automatic dues reminders. ${monthCount} SMS sent this month.`} />
      {s.smsEnabled !== "true" ? <Notice tone="amber">SMS is switched off. Turn it on in <Link href="/admin/settings#integrations" className="font-semibold underline">Site settings → SMS</Link>.</Notice>
        : testMode ? <Notice tone="amber">Test mode: messages are logged below but not actually sent. Switch the provider to Dhiraagu in Site settings when your Bulk SMS account is ready.</Notice> : null}
      <Card><CardHeader title="Send an SMS" /><div className="p-5"><SmsComposer unions={unions} events={events} testMode={testMode} /></div></Card>
      <Card>
        <CardHeader title="Automatic dues reminders" desc={s.remindersEnabled === "true" ? `On — checked every morning at 9:00. “Due soon” goes ${s.reminderDaysBefore} days before; “overdue” repeats every ${s.reminderRepeatDays} days, up to ${s.reminderMaxOverdue} times.` : "Off — turn on in Site settings → Dues reminders."} />
        <div className="p-5"><ReminderPanel /></div>
      </Card>
      <Card>
        <CardHeader title="Message log" desc="Latest 100 messages" />
        {log.length === 0 ? <div className="p-6"><EmptyState title="No messages yet" /></div> : (
          <Table>
            <thead><tr><Th>When</Th><Th>To</Th><Th>Type</Th><Th>Message</Th><Th>Status</Th></tr></thead>
            <tbody>
              {log.map((m) => (
                <tr key={m.id}>
                  <Td className="whitespace-nowrap text-xs text-muted">{formatDateTime(m.createdAt)}</Td>
                  <Td className="text-xs">{m.member ? <Link href={`/admin/members/${m.member.id}`} className="font-semibold hover:text-brand-700">{m.member.fullName}</Link> : null}<div className="font-mono text-muted">{m.to}</div></Td>
                  <Td className="text-xs">{KIND[m.kind] ?? m.kind}</Td>
                  <Td className="max-w-sm text-xs">{m.body}{m.error && <div className="mt-1 text-red-600">{m.error}</div>}</Td>
                  <Td><Badge tone={m.status === "SENT" ? "green" : m.status === "TEST" ? "amber" : "red"}>{m.status.toLowerCase()}</Badge></Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </div>
  );
}
