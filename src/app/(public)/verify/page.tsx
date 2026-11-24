import { redirect } from "next/navigation";
import { PageHero } from "@/components/public/cards";
import { Button, Input } from "@/components/ui";

export const metadata = { title: "Verify a membership" };

export default function VerifyPage() {
  async function go(fd: FormData) {
    "use server";
    const no = String(fd.get("no") ?? "").trim().toUpperCase();
    if (no) redirect(`/verify/${encodeURIComponent(no)}`);
  }
  return (
    <>
      <PageHero kicker="Verification" title="Verify a membership card" desc="Employers and partners can confirm a member's status by scanning the QR code on their card or entering the membership number." />
      <form action={go} className="mx-auto mt-10 flex max-w-md gap-2 px-4">
        <Input name="no" placeholder="e.g. MHPU-0123" required />
        <Button type="submit">Verify</Button>
      </form>
    </>
  );
}
