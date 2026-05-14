import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

const PUBLIC_URL = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/\/$/, "");

export const StorageBuckets = {
  service: "service-images",
  banner: "banner-images",
  onboarding: "onboarding-images",
} as const;

export type StorageBucket = (typeof StorageBuckets)[keyof typeof StorageBuckets];

const ACCEPT = ["image/jpeg", "image/png", "image/webp"];
const MAX_BYTES = 5 * 1024 * 1024;

export type UploadedImage = { path: string; publicUrl: string };

export async function uploadImage(
  bucket: StorageBucket,
  folder: string,
  file: File,
): Promise<UploadedImage> {
  if (!ACCEPT.includes(file.type)) {
    throw new Error("صيغة غير مدعومة. يُقبل JPG, PNG, WebP فقط.");
  }
  if (file.size > MAX_BYTES) {
    throw new Error("الحجم أكبر من 5MB.");
  }

  const supabase = createSupabaseBrowserClient();
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
  const stamp = Date.now();
  const rand = Math.random().toString(36).slice(2, 8);
  const path = `${folder}/${stamp}-${rand}.${ext}`;

  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
    contentType: file.type,
  });
  if (error) throw new Error(error.message);

  return { path, publicUrl: publicUrlFor(bucket, path) };
}

export function publicUrlFor(bucket: StorageBucket, path: string): string {
  return `${PUBLIC_URL}/storage/v1/object/public/${bucket}/${path}`;
}

// Pull the storage path back out of a public URL we previously stored.
export function pathFromPublicUrl(bucket: StorageBucket, url: string): string | null {
  const prefix = `${PUBLIC_URL}/storage/v1/object/public/${bucket}/`;
  return url.startsWith(prefix) ? url.slice(prefix.length) : null;
}

export async function deleteImage(bucket: StorageBucket, urlOrPath: string): Promise<void> {
  const path = urlOrPath.startsWith("http")
    ? pathFromPublicUrl(bucket, urlOrPath)
    : urlOrPath;
  if (!path) return;
  const supabase = createSupabaseBrowserClient();
  await supabase.storage.from(bucket).remove([path]);
}

// Append Supabase image-transform params for a thumbnail-sized render.
export function transformedUrl(
  url: string,
  opts: { width?: number; height?: number; quality?: number } = {},
): string {
  const params = new URLSearchParams();
  if (opts.width) params.set("width", String(opts.width));
  if (opts.height) params.set("height", String(opts.height));
  params.set("quality", String(opts.quality ?? 75));
  params.set("resize", "cover");
  return `${url}?${params.toString()}`;
}
