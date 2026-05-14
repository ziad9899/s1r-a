"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { Loader2, Upload, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  uploadImage,
  deleteImage,
  type StorageBucket,
} from "@/lib/storage";

type Props = {
  bucket: StorageBucket;
  folder: string;
  value: string | null;
  onChange: (url: string | null) => void;
  aspect?: "16/9" | "1/1" | "3/4";
  label?: string;
  /** Recommended pixel size shown in the hint (e.g. "1920×1080"). */
  recommendedSize?: string;
  /** Optional aspect ratio label shown alongside the size hint. */
  recommendedRatio?: string;
};

const aspectClass: Record<NonNullable<Props["aspect"]>, string> = {
  "16/9": "aspect-[16/9]",
  "1/1": "aspect-square",
  "3/4": "aspect-[3/4]",
};

export function ImageUploader({
  bucket,
  folder,
  value,
  onChange,
  aspect = "16/9",
  label,
  recommendedSize = "1920×1080",
  recommendedRatio = "16:9",
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function pickFile(file: File) {
    setBusy(true);
    try {
      const previousUrl = value;
      const { publicUrl } = await uploadImage(bucket, folder, file);
      onChange(publicUrl);
      // Best-effort cleanup of the previous file. Failure shouldn't block.
      if (previousUrl) {
        deleteImage(bucket, previousUrl).catch(() => {});
      }
      toast.success("تمّ رفع الصورة");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "فشل الرفع";
      toast.error(msg);
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function clear() {
    if (!value) return;
    setBusy(true);
    try {
      await deleteImage(bucket, value);
    } catch {
      // Swallow: if the file is already gone, the link removal is what counts.
    }
    onChange(null);
    setBusy(false);
  }

  return (
    <div className="grid gap-2">
      {label && <span className="text-sm font-medium">{label}</span>}
      <div
        className={`relative w-full overflow-hidden rounded-md border bg-muted/30 ${aspectClass[aspect]}`}
      >
        {value ? (
          <Image
            src={value}
            alt=""
            fill
            sizes="(max-width: 768px) 100vw, 600px"
            className="object-cover"
            unoptimized
          />
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
            لا توجد صورة
          </div>
        )}
        {busy && (
          <div className="absolute inset-0 grid place-items-center bg-black/30">
            <Loader2 className="size-6 animate-spin text-white" />
          </div>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) pickFile(f);
          }}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
        >
          <Upload className="size-4" />
          {value ? "تغيير الصورة" : "رفع صورة"}
        </Button>
        {value && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={busy}
            onClick={clear}
          >
            <Trash2 className="size-4" />
            حذف
          </Button>
        )}
      </div>
      <div className="rounded-md border border-dashed bg-muted/30 p-2 text-xs text-muted-foreground space-y-0.5">
        <p>
          <span className="font-semibold text-foreground">الصيغ المقبولة:</span>{" "}
          JPG · PNG · WebP
        </p>
        <p>
          <span className="font-semibold text-foreground">الحجم الأقصى:</span>{" "}
          5 ميجابايت
        </p>
        <p>
          <span className="font-semibold text-foreground">الأبعاد المُفضّلة:</span>{" "}
          <span dir="ltr">{recommendedSize}</span> (نسبة{" "}
          <span dir="ltr">{recommendedRatio}</span>)
        </p>
      </div>
    </div>
  );
}
