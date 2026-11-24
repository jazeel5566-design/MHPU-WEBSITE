import "server-only";
import { mkdir, writeFile, readFile } from "node:fs/promises";
import path from "node:path";
import { randomBytes } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/*
 * File storage with two drivers:
 *  - Supabase Storage (production): used when SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY are set.
 *      bucket "media"        public   — images used in articles
 *      bucket "resources"    private  — documents (incl. members-only), streamed by /api/resources/[id]
 *      bucket "applications" private  — applicants' ID copies & signatures, ADMIN-only via /api/applications/[id]/[kind]
 *  - Local disk (development): public/uploads, storage/resources, storage/applications.
 *
 * Note: Vercel limits request bodies to ~4.5 MB, so uploads are capped at 4 MB on
 * the server; the join form shrinks ID photos in the browser before uploading.
 */

const BUCKETS = { media: "media", resources: "resources", applications: "applications" } as const;
type Bucket = keyof typeof BUCKETS;

const LOCAL_DIRS: Record<Bucket, string> = {
  media: path.join(process.cwd(), "public", "uploads"),
  resources: path.join(process.cwd(), "storage", "resources"),
  applications: path.join(process.cwd(), "storage", "applications"),
};

const MAX_UPLOAD = 4 * 1024 * 1024;
const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"];
const DOC_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ...IMAGE_TYPES,
];
const ID_DOC_TYPES = ["application/pdf", "image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];

let client: SupabaseClient | null = null;
function supabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  client ??= createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  return client;
}

function safeName(name: string) {
  const ext = path.extname(name).toLowerCase().replace(/[^.a-z0-9]/g, "").slice(0, 6);
  const base = path.basename(name, path.extname(name)).toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40) || "file";
  return `${base}-${randomBytes(6).toString("hex")}${ext}`;
}

async function put(bucket: Bucket, name: string, data: Buffer, contentType: string) {
  const sb = supabase();
  if (sb) {
    const { error } = await sb.storage.from(BUCKETS[bucket]).upload(name, data, { contentType, upsert: false });
    if (error) throw new Error(`Upload failed: ${error.message}`);
    return;
  }
  await mkdir(LOCAL_DIRS[bucket], { recursive: true });
  await writeFile(path.join(LOCAL_DIRS[bucket], name), data);
}

async function get(bucket: Bucket, name: string): Promise<Buffer> {
  const safe = path.basename(name);
  const sb = supabase();
  if (sb) {
    const { data, error } = await sb.storage.from(BUCKETS[bucket]).download(safe);
    if (error || !data) throw new Error("File not found");
    return Buffer.from(await data.arrayBuffer());
  }
  return readFile(path.join(LOCAL_DIRS[bucket], safe));
}

function publicUrl(bucket: Bucket, name: string) {
  const sb = supabase();
  if (sb) return sb.storage.from(BUCKETS[bucket]).getPublicUrl(name).data.publicUrl;
  return `/uploads/${name}`;
}

const tooBig = () => new Error("File is larger than 4 MB. Please upload a smaller file.");

// ─── Article images (public) ────────────────────────────────────────
export async function saveImage(file: File) {
  if (!IMAGE_TYPES.includes(file.type)) throw new Error("Only JPG, PNG, WebP, GIF or AVIF images are allowed.");
  if (file.size > MAX_UPLOAD) throw tooBig();
  const name = safeName(file.name);
  await put("media", name, Buffer.from(await file.arrayBuffer()), file.type);
  return { url: publicUrl("media", name), filename: file.name, mimeType: file.type, size: file.size };
}

// ─── Documents (public or members-only; always streamed via the app) ─
export async function saveDocument(file: File) {
  if (!DOC_TYPES.includes(file.type)) throw new Error("Upload a PDF, Word, Excel or image file.");
  if (file.size > MAX_UPLOAD) throw tooBig();
  const name = safeName(file.name);
  await put("resources", name, Buffer.from(await file.arrayBuffer()), file.type);
  return { fileUrl: `storage:${name}`, size: file.size };
}

export async function readDocument(fileUrl: string) {
  return get("resources", fileUrl.replace(/^storage:/, ""));
}

// ─── Membership applications (ADMIN-only) ───────────────────────────
export async function saveIdDocument(file: File) {
  if (!ID_DOC_TYPES.includes(file.type)) throw new Error("Upload your ID or passport as a photo (JPG/PNG) or PDF.");
  if (file.size > MAX_UPLOAD) throw new Error("The ID/passport file is larger than 4 MB. Please upload a smaller photo or PDF.");
  const ext = path.extname(file.name) || (file.type === "application/pdf" ? ".pdf" : ".jpg");
  const name = safeName(`id${ext}`);
  await put("applications", name, Buffer.from(await file.arrayBuffer()), file.type);
  return name;
}

/** Save a drawn signature sent as a PNG data URL from the signature pad. */
export async function saveSignature(dataUrl: string) {
  const m = /^data:image\/png;base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl);
  if (!m) throw new Error("Please sign in the signature box.");
  const buf = Buffer.from(m[1], "base64");
  if (buf.length < 500) throw new Error("Please sign in the signature box.");
  if (buf.length > 1024 * 1024) throw new Error("Signature image is too large.");
  if (buf.subarray(0, 8).toString("hex") !== "89504e470d0a1a0a") throw new Error("Invalid signature image.");
  const name = safeName("signature.png");
  await put("applications", name, buf, "image/png");
  return name;
}

export async function readApplicationFile(name: string) {
  return get("applications", name);
}

/** Create the buckets if missing (run by scripts/bootstrap-prod.ts). */
export async function ensureBuckets() {
  const sb = supabase();
  if (!sb) return "local disk (no Supabase configured)";
  const { data: existing } = await sb.storage.listBuckets();
  const have = new Set((existing ?? []).map((b) => b.name));
  for (const [key, isPublic] of [["media", true], ["resources", false], ["applications", false]] as const) {
    if (!have.has(BUCKETS[key])) {
      const { error } = await sb.storage.createBucket(BUCKETS[key], { public: isPublic, fileSizeLimit: MAX_UPLOAD });
      if (error) throw new Error(`Could not create bucket ${key}: ${error.message}`);
    }
  }
  return "supabase";
}

export function mimeFor(name: string) {
  const ext = path.extname(name).toLowerCase();
  return ({
    ".pdf": "application/pdf", ".doc": "application/msword",
    ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp",
    ".heic": "image/heic", ".heif": "image/heif",
  } as Record<string, string>)[ext] ?? "application/octet-stream";
}
