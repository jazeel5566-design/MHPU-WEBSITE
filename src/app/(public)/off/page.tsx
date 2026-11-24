import { FeatureOff } from "@/components/feature-off";

export const metadata = { title: "Not available", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function Off({ searchParams }: { searchParams: Promise<{ f?: string }> }) {
  const { f } = await searchParams;
  return <FeatureOff f={f} home="/" />;
}
