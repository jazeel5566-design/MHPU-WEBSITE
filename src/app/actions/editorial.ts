"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { slugify, str, optStr } from "@/lib/utils";
import { saveImage, saveDocument } from "@/lib/storage";

export type EState = { ok?: boolean; error?: string; message?: string };

const STAFF = ["ADMIN", "GENERAL_SECRETARY", "PRESIDENT", "EDITOR", "AUTHOR"] as const;
const PUBLISHERS = ["ADMIN", "GENERAL_SECRETARY", "PRESIDENT", "EDITOR"] as const;
const canPublish = (role: string) => (PUBLISHERS as readonly string[]).includes(role);

async function uniqueSlug(base: string, model: "post" | "campaign", excludeId?: string) {
  const root = slugify(base) || "untitled";
  let slug = root;
  for (let i = 2; ; i++) {
    const hit = model === "post"
      ? await db.post.findUnique({ where: { slug }, select: { id: true } })
      : await db.campaign.findUnique({ where: { slug }, select: { id: true } });
    if (!hit || hit.id === excludeId) return slug;
    slug = `${root}-${i}`;
  }
}

function revalidateContent() {
  revalidatePath("/", "layout");
}

// ─── Posts ──────────────────────────────────────────────────────────

const postSchema = z.object({
  title: z.string().trim().min(3, "Add a headline (3+ characters)"),
  body: z.string().trim().min(1, "The article body is empty"),
  category: z.string().min(1),
  visibility: z.enum(["PUBLIC", "MEMBERS"]),
});

export async function savePost(_: EState, fd: FormData): Promise<EState> {
  const user = await requireRole([...STAFF], "/editorial");
  // NB: never name a form field "id" in forms with named submit buttons — it
  // clobbers form.id in the DOM and React then drops the submitter's value.
  const id = optStr(fd, "postId");
  const intent = str(fd, "intent") || "draft";
  const r = postSchema.safeParse({ title: str(fd, "title"), body: str(fd, "body"), category: str(fd, "category"), visibility: str(fd, "visibility") });
  if (!r.success) return { error: r.error.issues[0].message };

  const existing = id ? await db.post.findUnique({ where: { id } }) : null;
  if (id && !existing) return { error: "Post not found." };
  if (existing && !canPublish(user.role) && existing.authorId !== user.id) return { error: "You can only edit your own articles." };
  if (existing && !canPublish(user.role) && ["PUBLISHED", "SCHEDULED"].includes(existing.status)) return { error: "This article is live. Ask an editor to make changes." };
  if (["publish", "schedule", "unpublish", "archive", "return"].includes(intent) && !canPublish(user.role)) return { error: "Only editors can publish." };

  const publishAtRaw = str(fd, "publishAt");
  const publishAt = publishAtRaw ? new Date(publishAtRaw) : null;
  if (intent === "schedule" && (!publishAt || publishAt <= new Date())) return { error: "Choose a future date and time to schedule." };

  let status = existing?.status ?? "DRAFT";
  let publishedAt = existing?.publishedAt ?? null;
  let reviewerId = existing?.reviewerId ?? null;
  const reviewNote = optStr(fd, "reviewNote") ?? existing?.reviewNote ?? null;
  switch (intent) {
    case "draft": break; // keep current status (a live post stays live with the edits)
    case "submit": status = "IN_REVIEW"; break;
    case "publish": status = "PUBLISHED"; publishedAt = publishedAt ?? new Date(); reviewerId = user.id; break;
    case "schedule": status = "SCHEDULED"; publishedAt = publishAt; reviewerId = user.id; break;
    case "unpublish": status = "DRAFT"; break;
    case "archive": status = "ARCHIVED"; break;
    case "return": status = "DRAFT"; reviewerId = user.id; break;
  }

  const slugInput = str(fd, "slug");
  const slug = await uniqueSlug(slugInput || r.data.title, "post", existing?.id);

  const data = {
    ...r.data,
    slug,
    titleDv: optStr(fd, "titleDv"),
    excerpt: optStr(fd, "excerpt"),
    excerptDv: optStr(fd, "excerptDv"),
    bodyDv: optStr(fd, "bodyDv"),
    coverImage: optStr(fd, "coverImage"),
    tags: optStr(fd, "tags"),
    featured: fd.get("featured") === "on" && canPublish(user.role),
    publishAt,
    status,
    publishedAt,
    reviewerId,
    reviewNote: intent === "return" ? reviewNote : intent === "publish" ? null : reviewNote,
  };

  const post = existing
    ? await db.post.update({ where: { id: existing.id }, data })
    : await db.post.create({ data: { ...data, authorId: user.id } });

  await audit(user.id, `post_${intent}`, "Post", post.id, post.title);
  revalidateContent();
  const messages: Record<string, string> = {
    draft: "Draft saved.", submit: "Sent to editors for review.", publish: "Published! It's now live on the website.",
    schedule: `Scheduled for ${publishAt?.toLocaleString("en-GB")}.`, unpublish: "Unpublished — moved back to drafts.",
    archive: "Archived.", return: "Returned to the author with your notes.",
  };
  if (!existing) redirect(`/editorial/posts/${post.id}?saved=${intent}`);
  return { ok: true, message: messages[intent] ?? "Saved." };
}

export async function deletePost(fd: FormData) {
  const user = await requireRole([...STAFF], "/editorial");
  const id = str(fd, "id");
  const p = await db.post.findUnique({ where: { id } });
  if (!p) redirect("/editorial/posts");
  if (!canPublish(user.role) && (p.authorId !== user.id || p.status !== "DRAFT")) redirect(`/editorial/posts/${id}`);
  await db.post.delete({ where: { id } });
  await audit(user.id, "post_delete", "Post", id, p.title);
  revalidateContent();
  redirect("/editorial/posts?deleted=1");
}

// ─── Campaigns ──────────────────────────────────────────────────────

export async function saveCampaign(_: EState, fd: FormData): Promise<EState> {
  const user = await requireRole([...PUBLISHERS], "/editorial");
  const id = optStr(fd, "id");
  const title = str(fd, "title");
  const summary = str(fd, "summary");
  if (title.length < 3) return { error: "Add a campaign title." };
  if (summary.length < 10) return { error: "Add a one-line summary (10+ characters)." };
  const slug = await uniqueSlug(str(fd, "slug") || title, "campaign", id ?? undefined);
  const featured = fd.get("featured") === "on";
  const data = {
    title, summary, slug,
    titleDv: optStr(fd, "titleDv"), summaryDv: optStr(fd, "summaryDv"),
    body: str(fd, "body"), coverImage: optStr(fd, "coverImage"),
    status: str(fd, "status") || "DRAFT",
    goal: Math.max(1, Number(str(fd, "goal")) || 1000),
    hasPetition: fd.get("hasPetition") === "on",
    petitionAsk: optStr(fd, "petitionAsk"),
    featured,
  };
  if (featured) await db.campaign.updateMany({ where: { featured: true, NOT: id ? { id } : undefined }, data: { featured: false } });
  const c = id ? await db.campaign.update({ where: { id }, data }) : await db.campaign.create({ data });
  await audit(user.id, id ? "campaign_update" : "campaign_create", "Campaign", c.id, c.title);
  revalidateContent();
  if (!id) redirect(`/editorial/campaigns/${c.id}?saved=1`);
  return { ok: true, message: "Campaign saved." };
}

export async function deleteCampaign(fd: FormData) {
  const user = await requireRole([...PUBLISHERS], "/editorial");
  const id = str(fd, "id");
  await db.campaign.delete({ where: { id } });
  await audit(user.id, "campaign_delete", "Campaign", id);
  revalidateContent();
  redirect("/editorial/campaigns");
}

// ─── Events ─────────────────────────────────────────────────────────

export async function saveEvent(_: EState, fd: FormData): Promise<EState> {
  const user = await requireRole([...PUBLISHERS], "/editorial");
  const id = optStr(fd, "id");
  const title = str(fd, "title");
  const startsAt = str(fd, "startsAt");
  if (title.length < 3) return { error: "Add an event title." };
  if (!startsAt) return { error: "Choose a start date and time." };
  const endsAt = str(fd, "endsAt");
  const data = {
    title, titleDv: optStr(fd, "titleDv"),
    description: str(fd, "description"),
    startsAt: new Date(startsAt), endsAt: endsAt ? new Date(endsAt) : null,
    location: str(fd, "location") || "TBC",
    isOnline: fd.get("isOnline") === "on",
    type: str(fd, "type") || "MEETING",
    visibility: str(fd, "visibility") === "MEMBERS" ? "MEMBERS" : "PUBLIC",
    capacity: str(fd, "capacity") ? Number(str(fd, "capacity")) : null,
    cpdHours: str(fd, "cpdHours") ? Number(str(fd, "cpdHours")) : null,
    published: fd.get("published") === "on",
    meetingUrl: null as string | null,
  };
  const rawMeet = str(fd, "meetingUrl");
  if (rawMeet) {
    const { cleanMeetingUrl } = await import("@/lib/meetings");
    data.meetingUrl = cleanMeetingUrl(rawMeet);
    if (!data.meetingUrl) return { error: "The meeting link must be a full https:// link, e.g. https://meet.google.com/abc-defg-hij" };
    data.isOnline = true;
  }
  const e = id ? await db.event.update({ where: { id }, data }) : await db.event.create({ data });
  await audit(user.id, id ? "event_update" : "event_create", "Event", e.id, e.title);
  revalidateContent();
  if (!id) redirect(`/editorial/events/${e.id}?saved=1`);
  return { ok: true, message: "Event saved." };
}

export async function deleteEvent(fd: FormData) {
  const user = await requireRole([...PUBLISHERS], "/editorial");
  const id = str(fd, "id");
  await db.event.delete({ where: { id } });
  await audit(user.id, "event_delete", "Event", id);
  revalidateContent();
  redirect("/editorial/events");
}

// ─── Media & resources ──────────────────────────────────────────────

export async function uploadMedia(_: EState, fd: FormData): Promise<EState> {
  const user = await requireRole([...STAFF], "/editorial");
  const files = fd.getAll("files").filter((f): f is File => f instanceof File && f.size > 0);
  if (!files.length) return { error: "Choose at least one image." };
  try {
    for (const f of files) {
      const saved = await saveImage(f);
      await db.media.create({ data: { ...saved, alt: optStr(fd, "alt"), uploadedById: user.id } });
    }
  } catch (e) {
    return { error: (e as Error).message };
  }
  revalidatePath("/editorial/media");
  return { ok: true, message: `${files.length} image${files.length > 1 ? "s" : ""} uploaded.` };
}

export async function deleteMedia(fd: FormData) {
  await requireRole([...PUBLISHERS], "/editorial");
  await db.media.delete({ where: { id: str(fd, "id") } });
  revalidatePath("/editorial/media");
}

export async function saveResource(_: EState, fd: FormData): Promise<EState> {
  const user = await requireRole([...PUBLISHERS], "/editorial");
  const title = str(fd, "title");
  const file = fd.get("file");
  if (title.length < 3) return { error: "Add a document title." };
  if (!(file instanceof File) || file.size === 0) return { error: "Choose a file to upload." };
  try {
    const saved = await saveDocument(file);
    const r = await db.resource.create({
      data: { title, description: optStr(fd, "description"), category: str(fd, "category") || "GUIDE", visibility: str(fd, "visibility") === "MEMBERS" ? "MEMBERS" : "PUBLIC", fileUrl: saved.fileUrl, fileSize: saved.size },
    });
    await audit(user.id, "resource_create", "Resource", r.id, title);
  } catch (e) {
    return { error: (e as Error).message };
  }
  revalidatePath("/editorial/resources");
  revalidatePath("/resources");
  return { ok: true, message: "Document uploaded." };
}

export async function updateResourceVisibility(fd: FormData) {
  await requireRole([...PUBLISHERS], "/editorial");
  await db.resource.update({ where: { id: str(fd, "id") }, data: { visibility: str(fd, "visibility") } });
  revalidatePath("/editorial/resources");
}

export async function deleteResource(fd: FormData) {
  const user = await requireRole([...PUBLISHERS], "/editorial");
  const id = str(fd, "id");
  await db.resource.delete({ where: { id } });
  await audit(user.id, "resource_delete", "Resource", id);
  revalidatePath("/editorial/resources");
}
