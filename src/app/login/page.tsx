import Link from "next/link";
import { redirect } from "next/navigation";
import { ShieldCheck, IdCard, MessageSquare, Vote } from "lucide-react";
import { getCurrentUser, homeFor } from "@/lib/auth";
import { Logo } from "@/components/logo";
import { Notice } from "@/components/ui";
import { LoginForm } from "./login-form";
import { getSitePhotos } from "@/lib/site-photos";

export const metadata = { title: "Log in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; denied?: string; out?: string; nomember?: string }> }) {
  const photos = await getSitePhotos();
  const sp = await searchParams;
  const user = await getCurrentUser();
  if (user && !sp.denied) redirect(sp.next?.startsWith("/") ? sp.next : homeFor(user.role));

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="flex flex-col px-6 py-8 sm:px-12">
        <Link href="/"><Logo /></Link>
        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-12">
          <h1 className="text-3xl font-extrabold tracking-tight">Welcome back</h1>
          <p className="mt-2 text-muted">Sign in to the member, editorial or admin portal. We&apos;ll take you to the right place.</p>
          <div className="mt-6 space-y-3">
            {sp.denied && <Notice tone="amber">Your account doesn&apos;t have access to that area. {user && <>Signed in as {user.name}.</>}</Notice>}
            {sp.out && <Notice tone="brand">You&apos;ve been signed out.</Notice>}
            {sp.nomember && <Notice tone="amber">This account isn&apos;t linked to a membership record. Please contact the membership office.</Notice>}
          </div>
          <div className="mt-6"><LoginForm next={sp.next} /></div>
          <p className="mt-6 text-center text-sm text-muted">Forgot your password? Call the help line or email the membership office.</p>
          <p className="mt-2 text-center text-sm">Not a member? <Link href="/join" className="font-semibold text-coral-600 hover:underline">Join MHPU</Link></p>
          {process.env.NODE_ENV !== "production" && (
            <div className="mt-8 rounded-xl border border-dashed border-line bg-sand-50 p-4 text-xs text-muted">
              <div className="mb-1 font-bold text-ink">Demo accounts (password: <code>mhpu1234</code>)</div>
              admin@mhpu.mv · editor@mhpu.mv · author@mhpu.mv · caseworker@mhpu.mv · member@mhpu.mv
            </div>
          )}
        </div>
      </div>
      <div className="relative hidden overflow-hidden bg-brand-900 lg:block">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={photos.islands} alt="" className="absolute inset-0 size-full object-cover opacity-40" />
        <div className="absolute inset-0 bg-gradient-to-t from-brand-950 via-brand-950/60 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-12 text-white">
          <h2 className="text-3xl font-extrabold">Your union, in your pocket.</h2>
          <ul className="mt-6 grid grid-cols-2 gap-4 text-sm">
            {[[IdCard, "Digital membership card"], [MessageSquare, "Open & track cases"], [Vote, "Vote in e-ballots"], [ShieldCheck, "Member-only resources"]].map(([Icon, label]) => {
              const I = Icon as React.ElementType;
              return <li key={label as string} className="flex items-center gap-2.5 rounded-xl bg-white/10 p-3 backdrop-blur"><I className="size-5 text-brand-300" />{label as string}</li>;
            })}
          </ul>
        </div>
      </div>
    </div>
  );
}
