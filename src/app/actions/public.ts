"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { str } from "@/lib/utils";
import { saveIdDocument, saveSignature } from "@/lib/storage";
import { matchWorkplaceUnion } from "@/lib/workplace";

export type FormState = { ok?: boolean; error?: string; message?: string };

const email = z.string().trim().toLowerCase().email("Enter a valid email address");

export async function subscribe(_: FormState, fd: FormData): Promise<FormState> {
  const parsed = email.safeParse(str(fd, "email"));
  if (!parsed.success) return { error: "Enter a valid email address." };
  await db.subscriber.upsert({ where: { email: parsed.data }, update: {}, create: { email: parsed.data } });
  return { ok: true, message: "You're subscribed. Thank you!" };
}

const contactSchema = z.object({
  name: z.string().trim().min(2, "Please enter your name"),
  email,
  phone: z.string().trim().optional(),
  topic: z.string().trim().min(1),
  message: z.string().trim().min(10, "Please tell us a little more (10+ characters)"),
});

export async function sendContact(_: FormState, fd: FormData): Promise<FormState> {
  const r = contactSchema.safeParse(Object.fromEntries(fd));
  if (!r.success) return { error: r.error.issues[0].message };
  await db.contactMessage.create({ data: r.data });
  return { ok: true, message: "Message sent. Our team usually replies within two working days." };
}

// Mirrors MHPU's official membership application form (fields, declaration, fees).
const joinSchema = z.object({
  fullName: z.string().trim().min(3, "Enter your full name"),
  address: z.string().trim().min(5, "Enter your present address"),
  country: z.string().trim().min(2, "Enter your country"),
  idNumber: z.string().trim().min(4, "Enter your National ID or passport number"),
  email,
  phone: z.string().trim().min(7, "Enter a phone number we can reach you on"),
  jobTitle: z.string().trim().min(2, "Enter your job / job title"),
  employer: z.string().trim().min(2, "Enter your hospital or company"),
  profession: z.string().optional(),
  atoll: z.string().optional(),
  island: z.string().trim().optional(),
  category: z.string().optional(),
  affiliateId: z.string().optional(),
  referredBy: z.string().trim().optional(),
  declarationDate: z.string().min(1, "Enter the date"),
  consent: z.literal("on", { message: "Please confirm the declaration to continue" }),
});

export async function applyToJoin(_: FormState, fd: FormData): Promise<FormState> {
  const fields = Object.fromEntries([...fd.entries()].filter(([, v]) => typeof v === "string"));
  const r = joinSchema.safeParse(fields);
  if (!r.success) return { error: r.error.issues[0].message };
  const idFile = fd.get("idFile");
  if (!(idFile instanceof File) || idFile.size === 0) return { error: "Please upload a copy of your National ID or passport." };
  const signature = str(fd, "signature");
  if (!signature) return { error: "Please sign in the signature box before submitting." };

  const { consent, declarationDate, ...data } = r.data;
  // Every member comes through a workplace union: required whenever unions are listed on the form.
  const unionCount = await db.affiliate.count({ where: { active: true } });
  // The workplace union is picked automatically from the hospital/company entered.
  // If that workplace has no union, the applicant joins MHPU directly.
  const unions = unionCount ? await db.affiliate.findMany({ where: { active: true }, select: { id: true, name: true, workplace: true } }) : [];
  data.affiliateId = matchWorkplaceUnion(data.employer, unions)?.id;
  const existing = await db.application.findFirst({ where: { OR: [{ email: data.email }, { idNumber: data.idNumber }], status: "PENDING" } });
  if (existing) return { error: `We already have a pending application for these details (reference ${existing.reference}). We'll be in touch soon.` };
  const member = await db.member.findFirst({ where: { OR: [{ email: data.email }, { idNumber: data.idNumber }] } });
  if (member) return { error: "You appear to be a member already. Try logging in to the member portal." };

  let idDocFile: string, signatureFile: string;
  try {
    idDocFile = await saveIdDocument(idFile);
    signatureFile = await saveSignature(signature);
  } catch (e) {
    return { error: (e as Error).message };
  }

  const year = new Date().getFullYear();
  const count = await db.application.count({ where: { reference: { startsWith: `APP-${year}-` } } });
  const reference = `APP-${year}-${String(count + 1).padStart(4, "0")}`;
  await db.application.create({
    data: {
      ...data, reference, idDocFile, signatureFile, consent: consent === "on",
      declarationDate: new Date(declarationDate),
      profession: data.profession || null, atoll: data.atoll || null, island: data.island || null,
      category: data.category || null, referredBy: data.referredBy || null, affiliateId: data.affiliateId || null,
    },
  });
  revalidatePath("/admin", "layout");
  return { ok: true, message: `${data.fullName.split(" ")[0]}|${reference}` };
}

const signSchema = z.object({
  campaignId: z.string().min(1),
  name: z.string().trim().min(2, "Enter your name"),
  email,
  atoll: z.string().optional(),
  isHealthWorker: z.string().optional(),
});

export async function signPetition(_: FormState, fd: FormData): Promise<FormState> {
  const r = signSchema.safeParse(Object.fromEntries(fd));
  if (!r.success) return { error: r.error.issues[0].message };
  const c = await db.campaign.findUnique({ where: { id: r.data.campaignId } });
  if (!c || c.status !== "ACTIVE" || !c.hasPetition) return { error: "This petition is closed." };
  try {
    await db.petitionSignature.create({
      data: { campaignId: c.id, name: r.data.name, email: r.data.email, atoll: r.data.atoll || null, isHealthWorker: r.data.isHealthWorker === "on" },
    });
  } catch {
    return { ok: true, message: "You've already signed — thank you! Now share it with a colleague." };
  }
  revalidatePath(`/campaigns/${c.slug}`);
  return { ok: true, message: "Thank you for signing! Share this campaign with your colleagues." };
}

export async function trackDownload(id: string) {
  await db.resource.update({ where: { id }, data: { downloads: { increment: 1 } } }).catch(() => null);
}
