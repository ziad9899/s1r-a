"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { Loader2, Plus, Trash2 } from "lucide-react";

import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { uploadImage, deleteImage, transformedUrl } from "@/lib/storage";
import { Button } from "@/components/ui/button";

type GalleryImage = {
  id: string;
  url: string;
  sort_order: number;
};

export function GalleryUploader({ serviceId }: { serviceId: string }) {
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const supabase = createSupabaseBrowserClient();
      const { data, error } = await supabase
        .from("service_gallery_images")
        .select("id, url, sort_order")
        .eq("service_id", serviceId)
        .order("sort_order", { ascending: true });
      if (cancelled) return;
      if (error) {
        toast.error(`تعذّر جلب الصور: ${error.message}`);
      } else {
        setImages((data ?? []) as GalleryImage[]);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [serviceId]);

  async function handleFile(file: File) {
    setUploading(true);
    try {
      const uploaded = await uploadImage(
        "service-images",
        `${serviceId}/gallery`,
        file,
      );
      const supabase = createSupabaseBrowserClient();
      const nextSort = images.length
        ? Math.max(...images.map((i) => i.sort_order)) + 1
        : 1;
      const { data, error } = await supabase
        .from("service_gallery_images")
        .insert({
          service_id: serviceId,
          url: uploaded.publicUrl,
          sort_order: nextSort,
        })
        .select("id, url, sort_order")
        .single();
      if (error) throw new Error(error.message);
      setImages((prev) => [...prev, data as GalleryImage]);
      toast.success("أُضيفت الصورة");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "فشل الرفع.");
    } finally {
      setUploading(false);
    }
  }

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    handleFile(file);
    e.target.value = ""; // allow re-uploading the same file
  }

  function onDelete(img: GalleryImage) {
    if (!confirm("حذف هذه الصورة من المعرض؟")) return;
    setDeleting(async () => {
      const supabase = createSupabaseBrowserClient();
      const { error } = await supabase
        .from("service_gallery_images")
        .delete()
        .eq("id", img.id);
      if (error) {
        toast.error(`تعذّر الحذف: ${error.message}`);
        return;
      }
      deleteImage("service-images", img.url).catch(() => {});
      setImages((prev) => prev.filter((p) => p.id !== img.id));
      toast.success("حُذفت الصورة");
    });
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-6">
        <Loader2 className="size-4 animate-spin" />
        جارٍ التحميل…
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 md:grid-cols-4 gap-3">
        {images.map((img) => (
          <div
            key={img.id}
            className="relative group rounded-md overflow-hidden border bg-muted"
          >
            <div className="aspect-square relative">
              <Image
                src={transformedUrl(img.url, { width: 200, height: 200 })}
                alt=""
                fill
                className="object-cover"
                sizes="200px"
                unoptimized
              />
            </div>
            <button
              type="button"
              onClick={() => onDelete(img)}
              disabled={deleting}
              className="absolute top-1 right-1 grid place-items-center size-7 rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive disabled:opacity-50"
              aria-label="حذف"
            >
              <Trash2 className="size-3.5" />
            </button>
          </div>
        ))}

        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="aspect-square rounded-md border-2 border-dashed border-border hover:border-primary hover:bg-primary/5 transition-colors grid place-items-center text-muted-foreground"
        >
          {uploading ? (
            <Loader2 className="size-6 animate-spin" />
          ) : (
            <div className="flex flex-col items-center gap-1">
              <Plus className="size-6" />
              <span className="text-xs">إضافة</span>
            </div>
          )}
        </button>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={onPick}
        className="hidden"
      />

      {images.length === 0 && (
        <p className="text-xs text-muted-foreground">
          لا توجد صور بعد. اضغط &quot;إضافة&quot; لرفع الصورة الأولى.
        </p>
      )}

      <div className="rounded-md border border-dashed bg-muted/30 p-2 text-xs text-muted-foreground space-y-0.5">
        <p>
          <span className="font-semibold text-foreground">الصيغ المقبولة:</span>{" "}
          JPG · PNG · WebP
        </p>
        <p>
          <span className="font-semibold text-foreground">الحجم الأقصى:</span>{" "}
          5 ميجابايت لكل صورة
        </p>
        <p>
          <span className="font-semibold text-foreground">الأبعاد المُفضّلة:</span>{" "}
          <span dir="ltr">1600×900</span> (نسبة <span dir="ltr">16:9</span>)
        </p>
      </div>
    </div>
  );
}
