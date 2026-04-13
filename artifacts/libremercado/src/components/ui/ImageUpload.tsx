import { useRef, useState } from "react";
import { Upload, X, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { resolveMediaUrl } from "@/lib/apiBase";

interface ImageUploadProps {
  value?: string | null;
  onChange: (url: string) => void;
  endpoint: "product" | "store" | "avatar" | "kyc" | "promo";
  label?: string;
  className?: string;
  aspectRatio?: "square" | "landscape" | "portrait";
}

export function ImageUpload({
  value,
  onChange,
  endpoint,
  label = "Subir imagen",
  className = "",
  aspectRatio = "square",
}: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(value ?? null);
  const { toast } = useToast();

  const aspectClass =
    aspectRatio === "landscape"
      ? "aspect-video"
      : aspectRatio === "portrait"
      ? "aspect-[3/4]"
      : "aspect-square";

  async function handleFile(file: File) {
    if (!file) return;

    const formData = new FormData();
    formData.append("image", file);

    setUploading(true);
    try {
      const res = await fetch(`/api/upload/${endpoint}`, {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: "Error desconocido" }));
        throw new Error(err.message || "Error al subir imagen");
      }

      const data = await res.json();
      setPreview(data.url);
      onChange(data.url);
    } catch (err: any) {
      toast({
        title: "Error al subir imagen",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  function handleRemove() {
    setPreview(null);
    onChange("");
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div className={`relative ${className}`}>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        data-testid={`input-upload-${endpoint}`}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
      />

      {preview ? (
        <div className="relative group">
          <div className={`w-full ${aspectClass} overflow-hidden rounded-lg border border-border`}>
            <img
              src={resolveMediaUrl(preview) ?? preview}
              alt="Preview"
              className="w-full h-full object-cover"
            />
          </div>
          <div className="absolute inset-0 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 rounded-lg">
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => inputRef.current?.click()}
              data-testid={`button-change-image-${endpoint}`}
              disabled={uploading}
            >
              <Upload className="w-4 h-4 mr-1" />
              Cambiar
            </Button>
            <Button
              type="button"
              size="sm"
              variant="destructive"
              onClick={handleRemove}
              data-testid={`button-remove-image-${endpoint}`}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      ) : (
        <div
          className={`w-full ${aspectClass} border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-primary/50 hover:bg-muted/30 transition-colors`}
          onClick={() => inputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          data-testid={`dropzone-${endpoint}`}
        >
          {uploading ? (
            <div className="flex flex-col items-center gap-2 text-muted-foreground">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <span className="text-sm">Subiendo...</span>
            </div>
          ) : (
            <>
              <ImageIcon className="w-10 h-10 text-muted-foreground" />
              <span className="text-sm font-medium text-muted-foreground">{label}</span>
              <span className="text-xs text-muted-foreground">JPG, PNG, WEBP — máx. 5 MB</span>
            </>
          )}
        </div>
      )}
    </div>
  );
}
