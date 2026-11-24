import { PageHero } from "@/components/public/cards";

export const metadata = { title: "Privacy notice" };

export default function PrivacyPage() {
  return (
    <>
      <PageHero title="Privacy notice" desc="How MHPU handles your personal information." />
      <div className="prose-mhpu mx-auto max-w-3xl px-4 py-12">
        <h2>What we collect</h2>
        <p>Membership details (name, ID/passport number, contact details, profession and workplace), dues records, casework you share with us, and petition signatures.</p>
        <h2>Why</h2>
        <p>To administer your membership, represent you at work, run democratic ballots, and keep you informed. We never sell your data.</p>
        <h2>Who can see it</h2>
        <p>Only authorised MHPU staff and officers, on a need-to-know basis. Casework is confidential and is only shared with your employer with your consent.</p>
        <h2>Your rights</h2>
        <p>You can view and update your details in the member portal, and ask us to correct or delete information by contacting the membership office.</p>
      </div>
    </>
  );
}
