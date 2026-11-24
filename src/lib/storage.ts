import "server-only";
import { mkdir, writeFile, readFile, unlink } from "node:fs/promises";
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

/** Storage name: a cleaned base name + random suffix + the extension of the VERIFIED type. */
function safeName(name: string, ext: string) {
  const base = path.basename(name, path.extname(name)).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "file";
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

/** Identify a file from its first bytes. The uploader's file name and declared type are never trusted. */
function sniff(buf: Buffer): { mime: string; ext: string } | null {
  const hex = buf.subarray(0, 12).toString("hex");
  const ascii = buf.subarray(0, 12).toString("latin1");
  if (hex.startsWith("89504e470d0a1a0a")) return { mime: "image/png", ext: ".png" };
  if (hex.startsWith("ffd8ff")) return { mime: "image/jpeg", ext: ".jpg" };
  if (ascii.startsWith("GIF87a") || ascii.startsWith("GIF89a")) return { mime: "image/gif", ext: ".gif" };
  if (ascii.startsWith("RIFF") && ascii.slice(8, 12) === "WEBP") return { mime: "image/webp", ext: ".webp" };
  if (ascii.slice(4, 8) === "ftyp") {
    const brand = ascii.slice(8, 12);
    if (brand.startsWith("avif") || brand.startsWith("avis")) return { mime: "image/avif", ext: ".avif" };
    if (["heic", "heix", "hevc", "mif1", "msf1", "heis"].includes(brand)) return { mime: "image/heic", ext: ".heic" };
  }
  if (ascii.startsWith("%PDF-")) return { mime: "application/pdf", ext: ".pdf" };
  if (hex.startsWith("504b0304")) return { mime: "application/zip", ext: ".zip" }; // docx/xlsx (refined below)
  if (hex.startsWith("d0cf11e0a1b11ae1")) return { mime: "application/x-ole", ext: ".ole" }; // doc/xls (refined below)
  return null;
}

/** Check the real content matches an allowed type; returns the safe MIME type and extension to store. */
function verifyContent(buf: Buffer, declared: string, allowed: string[]): { mime: string; ext: string } {
  const s = sniff(buf);
  if (!s) throw new Error("That file type isn't allowed.");
  if (s.mime === "application/zip") {
    if (declared.includes("wordprocessingml") && allowed.includes(declared)) return { mime: declared, ext: ".docx" };
    if (declared.includes("spreadsheetml") && allowed.includes(declared)) return { mime: declared, ext: ".xlsx" };
    throw new Error("That file type isn't allowed.");
  }
  if (s.mime === "application/x-ole") {
    if (declared === "application/msword" && allowed.includes(declared)) return { mime: declared, ext: ".doc" };
    if (declared === "application/vnd.ms-excel" && allowed.includes(declared)) return { mime: declared, ext: ".xls" };
    throw new Error("That file type isn't allowed.");
  }
  if (!allowed.includes(s.mime) && !(s.mime === "image/heic" && allowed.includes("image/heif"))) throw new Error("That file type isn't allowed.");
  return s;
}

// ─── Article images (public) ────────────────────────────────────────
export async function saveImage(file: File) {
  if (file.size > MAX_UPLOAD) throw tooBig();
  const buf = Buffer.from(await file.arrayBuffer());
  let t;
  try { t = verifyContent(buf, file.type, IMAGE_TYPES); } catch { throw new Error("Only JPG, PNG, WebP, GIF or AVIF images are allowed."); }
  const name = safeName(file.name, t.ext);
  await put("media", name, buf, t.mime);
  return { url: publicUrl("media", name), filename: file.name.slice(0, 120), mimeType: t.mime, size: file.size };
}

// ─── Documents (public or members-only; always streamed via the app) ─
export async function saveDocument(file: File) {
  if (file.size > MAX_UPLOAD) throw tooBig();
  const buf = Buffer.from(await file.arrayBuffer());
  let t;
  try { t = verifyContent(buf, file.type, DOC_TYPES); } catch { throw new Error("Upload a PDF, Word, Excel or image file."); }
  const name = safeName(file.name, t.ext);
  await put("resources", name, buf, t.mime);
  return { fileUrl: `storage:${name}`, size: file.size };
}

export async function readDocument(fileUrl: string) {
  return get("resources", fileUrl.replace(/^storage:/, ""));
}

// ─── Membership applications (ADMIN-only) ───────────────────────────
export async function saveIdDocument(file: File) {
  if (file.size > MAX_UPLOAD) throw new Error("The ID/passport file is larger than 4 MB. Please upload a smaller photo or PDF.");
  const buf = Buffer.from(await file.arrayBuffer());
  let t;
  try { t = verifyContent(buf, file.type, ID_DOC_TYPES); } catch { throw new Error("Upload your ID or passport as a photo (JPG/PNG) or PDF."); }
  const name = safeName("id", t.ext);
  await put("applications", name, buf, t.mime);
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
  const name = safeName("signature", ".png");
  await put("applications", name, buf, "image/png");
  return name;
}

export async function readApplicationFile(name: string) {
  return get("applications", name);
}

/** Permanently delete an applicant's files (ID copy, signature). */
export async function removeApplicationFiles(names: (string | null | undefined)[]) {
  const list = names.filter((n): n is string => !!n).map((n) => path.basename(n));
  if (!list.length) return;
  const sb = supabase();
  if (sb) {
    const { error } = await sb.storage.from(BUCKETS.applications).remove(list);
    if (error) throw new Error(`Could not delete files: ${error.message}`);
    return;
  }
  await Promise.all(list.map((n) => unlink(path.join(LOCAL_DIRS.applications, n)).catch(() => {})));
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
