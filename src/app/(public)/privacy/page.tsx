import { PageHero } from "@/components/public/cards";
import { getT } from "@/lib/i18n";

export const metadata = { title: "Privacy notice" };

export default async function PrivacyPage() {
  const T = await getT();
  return (
    <>
      <PageHero title={T("Privacy notice")} desc={T("How MHPU handles your personal information.")} />
      <div className="prose-mhpu mx-auto max-w-3xl px-4 py-12">
        <h2>{T("What we collect")}</h2>
        <p>{T("Membership details (name, ID/passport number, contact details, profession and workplace), dues records, casework you share with us, and petition signatures.")}</p>
        <h2>{T("Why")}</h2>
        <p>{T("To administer your membership, represent you at work, run democratic ballots, and keep you informed. We never sell your data.")}</p>
        <h2>{T("Who can see it")}</h2>
        <p>{T("Only authorised MHPU staff and officers, on a need-to-know basis. Casework is confidential and is only shared with your employer with your consent.")}</p>
        <h2>{T("Your rights")}</h2>
        <p>{T("You can view and update your details in the member portal, and ask us to correct or delete information by contacting the membership office.")}</p>
      </div>
    </>
  );
}
