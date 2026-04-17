import { Shield, MapPin, ExternalLink, Building2, Store, BadgeCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { resolveMediaUrl } from "@/lib/apiBase";

export interface Novedad {
  id: string;
  emitterType: string;
  emitterName: string;
  emitterLogo?: string | null;
  isOfficial: boolean;
  title: string;
  summary?: string | null;
  description?: string | null;
  image?: string | null;
  videoUrl?: string | null;
  contentType: string;
  category: string;
  link?: string | null;
  provinciaId?: string | null;
  municipioName?: string | null;
  status: string;
  isFeatured: boolean;
  priority: number;
}

const CATEGORY_CONFIG: Record<string, { label: string; color: string }> = {
  health:      { label: "Salud",       color: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30" },
  tourism:     { label: "Turismo",     color: "bg-sky-500/15 text-sky-600 border-sky-500/30" },
  culture:     { label: "Cultura",     color: "bg-purple-500/15 text-purple-600 border-purple-500/30" },
  events:      { label: "Eventos",     color: "bg-orange-500/15 text-orange-600 border-orange-500/30" },
  education:   { label: "Educación",   color: "bg-blue-500/15 text-blue-600 border-blue-500/30" },
  environment: { label: "Ambiente",    color: "bg-green-500/15 text-green-600 border-green-500/30" },
  fashion:     { label: "Moda",        color: "bg-pink-500/15 text-pink-600 border-pink-500/30" },
  launch:      { label: "Lanzamiento", color: "bg-yellow-500/15 text-yellow-700 border-yellow-500/30" },
  promo:       { label: "Promoción",   color: "bg-red-500/15 text-red-600 border-red-500/30" },
  news:        { label: "Noticias",    color: "bg-slate-500/15 text-slate-600 border-slate-500/30" },
  campaign:    { label: "Campaña",     color: "bg-teal-500/15 text-teal-600 border-teal-500/30" },
  other:       { label: "Información", color: "bg-gray-500/15 text-gray-600 border-gray-500/30" },
};

const EMITTER_TYPE_ICON: Record<string, React.ReactNode> = {
  municipality: <Building2 className="h-3 w-3" />,
  province:     <Building2 className="h-3 w-3" />,
  ministry:     <Shield className="h-3 w-3" />,
  secretaria:   <Shield className="h-3 w-3" />,
  organism:     <Shield className="h-3 w-3" />,
  store:        <Store className="h-3 w-3" />,
  brand:        <Store className="h-3 w-3" />,
  company:      <Store className="h-3 w-3" />,
};

interface NovedadCardProps {
  novedad: Novedad;
  size?: "sm" | "md" | "lg";
}

export function NovedadCard({ novedad, size = "md" }: NovedadCardProps) {
  const cat = CATEGORY_CONFIG[novedad.category] ?? CATEGORY_CONFIG.other;
  const isLg = size === "lg";
  const isSm = size === "sm";

  const handleClick = () => {
    if (novedad.link) {
      if (novedad.link.startsWith("http")) {
        window.open(novedad.link, "_blank", "noopener,noreferrer");
      } else {
        window.location.href = novedad.link;
      }
    }
  };

  return (
    <div
      className={`group relative rounded-2xl overflow-hidden bg-card border border-border/50 shadow-sm transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 ${novedad.link ? "cursor-pointer" : ""} ${isLg ? "w-80" : isSm ? "w-56" : "w-72"} flex-shrink-0`}
      onClick={novedad.link ? handleClick : undefined}
      data-testid={`novedad-card-${novedad.id}`}
    >
      {/* IMAGE */}
      {novedad.image && (
        <div className={`w-full overflow-hidden relative ${isLg ? "h-44" : isSm ? "h-28" : "h-36"}`}>
          <img
            src={resolveMediaUrl(novedad.image) ?? novedad.image}
            alt={novedad.title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
          {/* OVERLAY */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent" />

          {/* FEATURED BADGE */}
          {novedad.isFeatured && (
            <div className="absolute top-2 left-2">
              <span className="bg-yellow-400 text-yellow-900 text-[10px] font-bold px-2 py-0.5 rounded-full shadow">
                DESTACADO
              </span>
            </div>
          )}

          {/* CATEGORY BADGE top-right */}
          <div className="absolute top-2 right-2">
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${cat.color} bg-white/90 backdrop-blur-sm`}>
              {cat.label}
            </span>
          </div>

          {/* LINK ICON */}
          {novedad.link && (
            <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="bg-white/90 rounded-full p-1">
                <ExternalLink className="h-3 w-3 text-gray-700" />
              </div>
            </div>
          )}
        </div>
      )}

      {/* BODY */}
      <div className={`p-3 ${isLg ? "p-4" : ""}`}>
        {/* EMITTER ROW */}
        <div className="flex items-center gap-2 mb-2">
          {novedad.emitterLogo ? (
            <div className={`rounded-full overflow-hidden border-2 shrink-0 ${novedad.isOfficial ? "border-blue-400 shadow-[0_0_0_2px_rgba(59,130,246,0.2)]" : "border-border"} ${isSm ? "w-7 h-7" : "w-8 h-8"}`}>
              <img src={resolveMediaUrl(novedad.emitterLogo) ?? novedad.emitterLogo} alt={novedad.emitterName} className="w-full h-full object-cover" />
            </div>
          ) : (
            <div className={`rounded-full border-2 shrink-0 flex items-center justify-center ${novedad.isOfficial ? "border-blue-400 bg-blue-50" : "border-border bg-muted"} ${isSm ? "w-7 h-7" : "w-8 h-8"}`}>
              {EMITTER_TYPE_ICON[novedad.emitterType] ?? <Building2 className="h-3 w-3" />}
            </div>
          )}

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1">
              <span className="text-xs font-semibold text-foreground truncate leading-tight">
                {novedad.emitterName}
              </span>
              {novedad.isOfficial && (
                <BadgeCheck className="h-3.5 w-3.5 text-blue-500 shrink-0" />
              )}
            </div>
            {novedad.isOfficial ? (
              <span className="text-[10px] font-medium text-blue-500 flex items-center gap-0.5 leading-tight">
                <Shield className="h-2.5 w-2.5" /> Cuenta Oficial
              </span>
            ) : (
              <span className="text-[10px] text-muted-foreground leading-tight capitalize">
                {novedad.emitterType === "store" ? "Tienda verificada" : novedad.emitterType}
              </span>
            )}
          </div>

          {!novedad.image && (
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border shrink-0 ${cat.color}`}>
              {cat.label}
            </span>
          )}
        </div>

        {/* TITLE */}
        <h3 className={`font-bold leading-tight line-clamp-2 text-foreground mb-1 ${isLg ? "text-base" : isSm ? "text-xs" : "text-sm"}`}>
          {novedad.title}
        </h3>

        {/* SUMMARY */}
        {novedad.summary && !isSm && (
          <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed mb-2">
            {novedad.summary}
          </p>
        )}

        {/* LOCATION */}
        {(novedad.municipioName || novedad.provinciaId) && (
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground mt-1">
            <MapPin className="h-2.5 w-2.5" />
            <span className="truncate">
              {[novedad.municipioName, novedad.provinciaId ? novedad.provinciaId.charAt(0).toUpperCase() + novedad.provinciaId.slice(1) : null].filter(Boolean).join(", ")}
            </span>
          </div>
        )}
      </div>

      {/* OFFICIAL BORDER ACCENT */}
      {novedad.isOfficial && (
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-500 via-blue-400 to-transparent" />
      )}
    </div>
  );
}
