import { requireMember } from "@/lib/auth";
import { formatDate } from "@/lib/utils";
import { Card, CardHeader, PageHeader } from "@/components/ui";
import { ProfileForm, PasswordForm } from "@/components/members/forms";

export const metadata = { title: "Profile" };

export default async function ProfilePage() {
  const { member } = await requireMember();
  return (
    <div>
      <PageHeader title="Profile & security" desc="Keep your contact and workplace details current so we can reach you." />
      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <Card>
          <CardHeader title="Your details" />
          <div className="p-5"><ProfileForm m={member} /></div>
        </Card>
        <div className="space-y-6">
          <Card>
            <CardHeader title="Membership record" desc="Contact the office to change these." />
            <dl className="divide-y divide-line text-sm">
              {[["Name", member.fullName], ["Membership no.", member.membershipNo], ["ID / passport", member.idNumber.replace(/.(?=.{3})/g, "•")], ["Nationality", member.nationality], ["Profession", member.profession], ["Joined", formatDate(member.joinedAt)]].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-3 px-5 py-3"><dt className="text-muted">{k}</dt><dd className="text-end font-semibold">{v}</dd></div>
              ))}
            </dl>
          </Card>
          <Card>
            <CardHeader title="Change password" />
            <div className="p-5"><PasswordForm /></div>
          </Card>
        </div>
      </div>
    </div>
  );
}
