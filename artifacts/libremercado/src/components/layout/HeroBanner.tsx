import { useState, useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Promo } from "@shared/schema";
import { resolveMediaUrl } from "@/lib/apiBase";
import { Link } from "wouter";

interface HeroBannerProps {
  promos: Promo[];
}

export function HeroBanner({ promos }: HeroBannerProps) {
  const [current, setCurrent] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const activePromos = promos.filter((p) => p.isActive && p.mediaType !== "video");

  useEffect(() => {
    if (isPaused || activePromos.length <= 1) return;
    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % activePromos.length);
    }, 8000);
    return () => clearInterval(timer);
  }, [isPaused, activePromos.length]);

  const next = () => setCurrent((prev) => (prev + 1) % activePromos.length);
  const prev = () => setCurrent((prev) => (prev - 1 + activePromos.length) % activePromos.length);

  // Si no hay promos, mostramos un diseño base elegante
  if (activePromos.length === 0) {
    return (
      <div className="relative w-full overflow-hidden">
        <div 
          className="relative h-[300px] md:h-[400px] w-full bg-gradient-to-r from-primary to-accent flex items-center justify-center text-white"
          style={{ clipPath: "ellipse(150% 100% at 50% 0%)" }}
        >
          <div className="text-center px-4">
            <h2 className="text-3xl md:text-5xl font-black mb-2 uppercase italic">Bienvenido a PachaPay</h2>
            <p className="text-lg opacity-80 font-medium">Las mejores ofertas de tu región en un solo lugar</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="relative w-full overflow-hidden group"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div 
        className="relative h-[380px] md:h-[480px] w-full"
        style={{ clipPath: "ellipse(150% 100% at 50% 0%)" }}
      >
        {activePromos.map((promo, index) => (
          <div
            key={promo.id}
            className={cn(
              "absolute inset-0 w-full h-full transition-all duration-1000 ease-in-out flex items-center justify-center",
              index === current ? "opacity-100 translate-x-0 z-10" : "opacity-0 translate-x-full z-0"
            )}
          >
            {/* Fondo de Imagen con Overlay */}
            <div className="absolute inset-0 z-0">
              {promo.image ? (
                <img 
                  src={resolveMediaUrl(promo.image) ?? promo.image} 
                  alt={promo.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-r from-primary to-accent" />
              )}
              <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent" />
            </div>

            <div className="container mx-auto px-6 relative z-10 flex flex-col md:flex-row items-center justify-between gap-10">
              {/* Texto de la Promo */}
              <div className="text-white max-w-2xl space-y-5 text-center md:text-left">
                {promo.discount && (
                  <span className="inline-block px-4 py-1.5 bg-amber-400 text-slate-900 font-black rounded-full text-xs tracking-widest uppercase shadow-lg">
                    {promo.discount}
                  </span>
                )}
                
                <h2 className="text-4xl md:text-6xl font-black tracking-tighter leading-none italic uppercase drop-shadow-lg">
                  {promo.title}
                </h2>
                
                {promo.description && (
                  <p className="text-lg md:text-xl text-white/90 font-medium line-clamp-2 max-w-lg mb-2">
                    {promo.description}
                  </p>
                )}

                {promo.advertiser && (
                  <p className="text-sm font-bold text-amber-400/90 uppercase tracking-widest">
                    Por {promo.advertiser}
                  </p>
                )}

                {promo.link && (
                  <Link href={promo.link}>
                    <Button size="lg" className="bg-white text-slate-900 hover:bg-amber-400 hover:text-white rounded-full font-bold mt-4 shadow-2xl transition-all hover:scale-105 active:scale-95 group">
                      <ShoppingBag className="mr-2 h-5 w-5 transition-transform group-hover:rotate-12" /> Ver ofertas
                    </Button>
                  </Link>
                )}
              </div>

              {/* Espacio para imagen lateral si existiera (aquí usamos la misma promo img con efecto flotación para darle profundidad) */}
              <div className="hidden md:block relative w-1/3">
                <div className="relative z-10 transform scale-110 hover:scale-125 transition-transform duration-700 drop-shadow-[0_45px_45px_rgba(0,0,0,0.6)]">
                  {promo.image && (
                    <img 
                      src={resolveMediaUrl(promo.image) ?? promo.image} 
                      className="rounded-3xl border-8 border-white/10 shadow-inner"
                      alt="Product Accent"
                    />
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}

        {/* Controles del Slider (Solo si hay más de 1) */}
        {activePromos.length > 1 && (
          <>
            <button 
              onClick={prev}
              className="absolute left-6 top-1/2 -translate-y-1/2 z-30 p-2.5 rounded-full bg-black/20 hover:bg-white/40 text-white transition-all backdrop-blur-md opacity-0 group-hover:opacity-100"
            >
              <ChevronLeft className="h-8 w-8" />
            </button>
            <button 
              onClick={next}
              className="absolute right-6 top-1/2 -translate-y-1/2 z-30 p-2.5 rounded-full bg-black/20 hover:bg-white/40 text-white transition-all backdrop-blur-md opacity-0 group-hover:opacity-100"
            >
              <ChevronRight className="h-8 w-8" />
            </button>

            {/* Indicadores */}
            <div className="absolute bottom-16 left-1/2 -translate-x-1/2 z-30 flex gap-2.5">
              {activePromos.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrent(i)}
                  className={cn(
                    "h-2 transition-all rounded-full shadow-lg",
                    i === current ? "w-10 bg-white" : "w-2.5 bg-white/40 hover:bg-white/60"
                  )}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
