import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "wouter";
import { ChevronLeft, ChevronRight, ShieldCheck, Sparkles, Store, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Promo } from "@shared/schema";
import { resolveMediaUrl } from "@/lib/apiBase";

interface PromoBannerProps {
  promos: Promo[];
}

const supportHighlights = [
  {
    icon: ShieldCheck,
    title: "Comprá con confianza",
    description: "Tiendas verificadas, pagos seguros y experiencia cuidada.",
  },
  {
    icon: Truck,
    title: "Entrega y cobertura",
    description: "Comercios locales, distribuidores y servicios en una sola plataforma.",
  },
  {
    icon: Store,
    title: "Catálogo en movimiento",
    description: "Promociones activas, categorías claras y navegación directa.",
  },
];

export function PromoBanner({ promos }: PromoBannerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const resumeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activePromos = useMemo(
    () => promos.filter((promo) => promo.isActive && promo.mediaType !== "video"),
    [promos],
  );

  const pauseTemporarily = () => {
    setIsPaused(true);
    if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
    resumeTimerRef.current = setTimeout(() => setIsPaused(false), 7000);
  };

  useEffect(() => {
    return () => {
      if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (isPaused || activePromos.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % activePromos.length);
    }, 12000);
    return () => clearInterval(interval);
  }, [activePromos.length, currentIndex, isPaused]);

  if (activePromos.length === 0) {
    return (
      <div
        className="relative overflow-hidden rounded-[28px] bg-[linear-gradient(135deg,#1f2937_0%,#0f172a_45%,#111827_100%)] px-6 py-10 text-white shadow-[0_24px_80px_rgba(15,23,42,0.24)] md:px-10 md:py-14"
        data-testid="banner-placeholder"
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(250,204,21,0.24),transparent_35%),radial-gradient(circle_at_bottom_right,rgba(59,130,246,0.18),transparent_32%)]" />
        <div className="relative grid gap-8 lg:grid-cols-[1.25fr_0.75fr] lg:items-end">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-white/80">
              <Sparkles className="h-3.5 w-3.5" />
              Plataforma comercial
            </span>
            <h2 className="mt-4 text-4xl font-black leading-none md:text-6xl">
              Un catálogo vivo para comprar, vender y crecer.
            </h2>
            <p className="mt-4 max-w-xl text-sm leading-6 text-white/78 md:text-base">
              Tiendas, promos, categorías y contenido verificado en una experiencia de ecommerce pensada para inspirar confianza desde el primer pantallazo.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/explore">
                <Button size="lg" className="rounded-full px-6" data-testid="button-banner-primary">
                  Explorar catálogo
                </Button>
              </Link>
              <Link href="/vender">
                <Button size="lg" variant="secondary" className="rounded-full px-6" data-testid="button-banner-secondary">
                  Quiero vender
                </Button>
              </Link>
            </div>
          </div>

          <div className="grid gap-3">
            {supportHighlights.map((highlight) => (
              <div key={highlight.title} className="rounded-3xl border border-white/12 bg-white/8 p-4 backdrop-blur-sm">
                <div className="flex items-center gap-3">
                  <div className="rounded-2xl bg-white/10 p-3">
                    <highlight.icon className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">{highlight.title}</p>
                    <p className="text-xs leading-5 text-white/70">{highlight.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const currentPromo = activePromos[currentIndex];

  return (
    <div
      className="group relative overflow-hidden rounded-[28px] bg-slate-950 shadow-[0_26px_90px_rgba(15,23,42,0.28)]"
      data-testid="promo-banner"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div className="grid min-h-[440px] lg:min-h-[520px] lg:grid-cols-[1.3fr_0.7fr]">
        <div className="relative overflow-hidden">
          {currentPromo.image ? (
            <img
              src={resolveMediaUrl(currentPromo.image) ?? currentPromo.image}
              alt={currentPromo.title}
              className="absolute inset-0 h-full w-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 bg-[linear-gradient(135deg,#f59e0b_0%,#ea580c_55%,#991b1b_100%)]" />
          )}

          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(2,6,23,0.92)_0%,rgba(2,6,23,0.74)_36%,rgba(2,6,23,0.42)_64%,rgba(2,6,23,0.14)_100%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(250,204,21,0.22),transparent_34%),radial-gradient(circle_at_bottom_left,rgba(56,189,248,0.18),transparent_28%)]" />

          <div className="relative flex h-full flex-col justify-between px-6 py-8 text-white md:px-10 md:py-10">
            <div className="max-w-2xl">
              <div className="flex flex-wrap items-center gap-2">
                {currentPromo.discount && (
                  <span className="inline-flex rounded-full bg-amber-400 px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-amber-950 shadow-lg">
                    {currentPromo.discount}
                  </span>
                )}
                <span className="inline-flex rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-white/75">
                  Campaña destacada
                </span>
              </div>

              <h2
                className="mt-5 max-w-2xl text-4xl font-black leading-none md:text-6xl"
                data-testid="text-promo-title"
              >
                {currentPromo.title}
              </h2>

              {currentPromo.description && (
                <p className="mt-4 max-w-xl text-sm leading-6 text-white/82 md:text-lg">
                  {currentPromo.description}
                </p>
              )}

              <div className="mt-6 flex flex-wrap gap-3">
                {currentPromo.link ? (
                  <Link href={currentPromo.link}>
                    <Button className="rounded-full px-6" size="lg" data-testid="button-promo-cta">
                      Ver campaña
                    </Button>
                  </Link>
                ) : (
                  <Link href="/explore">
                    <Button className="rounded-full px-6" size="lg" data-testid="button-promo-cta">
                      Ver catálogo
                    </Button>
                  </Link>
                )}
                <Link href="/explore">
                  <Button variant="secondary" className="rounded-full px-6" size="lg" data-testid="button-promo-secondary">
                    Explorar productos
                  </Button>
                </Link>
              </div>

              {currentPromo.advertiser && (
                <p className="mt-5 text-xs font-medium uppercase tracking-[0.16em] text-white/64">
                  Impulsado por {currentPromo.advertiser}
                </p>
              )}
            </div>

            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/12 bg-white/10 p-4 backdrop-blur-sm">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/60">Cobertura</p>
                <p className="mt-2 text-lg font-bold">Minorista, institucional y profesional</p>
              </div>
              <div className="rounded-2xl border border-white/12 bg-white/10 p-4 backdrop-blur-sm">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/60">Confianza</p>
                <p className="mt-2 text-lg font-bold">Promos activas y destinos correctos</p>
              </div>
              <div className="rounded-2xl border border-white/12 bg-white/10 p-4 backdrop-blur-sm">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/60">Descubrimiento</p>
                <p className="mt-2 text-lg font-bold">Categorías, tiendas y contenido verificado</p>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-white/10 bg-slate-950/96 p-5 text-white lg:border-l lg:border-t-0 lg:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/55">Accesos rápidos</p>
              <p className="mt-1 text-xl font-bold">Impulso comercial</p>
            </div>
            <span className="rounded-full border border-white/12 bg-white/6 px-3 py-1 text-xs text-white/70">
              {String(currentIndex + 1).padStart(2, "0")} / {String(activePromos.length).padStart(2, "0")}
            </span>
          </div>

          <div className="mt-4 grid gap-3">
            {supportHighlights.map((highlight) => (
              <div key={highlight.title} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                <div className="flex items-start gap-3">
                  <div className="rounded-2xl bg-white/10 p-3">
                    <highlight.icon className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="font-semibold text-white">{highlight.title}</p>
                    <p className="mt-1 text-sm leading-6 text-white/64">{highlight.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {activePromos.length > 1 && (
            <div className="mt-5 flex items-center justify-between gap-3">
              <div className="flex gap-2">
                {activePromos.map((promo, index) => (
                  <button
                    key={promo.id}
                    className={`h-2 rounded-full transition-all ${index === currentIndex ? "w-8 bg-white" : "w-2 bg-white/30 hover:bg-white/60"}`}
                    onClick={() => {
                      pauseTemporarily();
                      setCurrentIndex(index);
                    }}
                    data-testid={`button-banner-dot-${index}`}
                  />
                ))}
              </div>

              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  size="icon"
                  className="bg-white/10 text-white hover:bg-white/20"
                  onClick={() => {
                    pauseTemporarily();
                    setCurrentIndex((prev) => (prev - 1 + activePromos.length) % activePromos.length);
                  }}
                  data-testid="button-banner-prev"
                >
                  <ChevronLeft className="h-5 w-5" />
                </Button>
                <Button
                  variant="secondary"
                  size="icon"
                  className="bg-white/10 text-white hover:bg-white/20"
                  onClick={() => {
                    pauseTemporarily();
                    setCurrentIndex((prev) => (prev + 1) % activePromos.length);
                  }}
                  data-testid="button-banner-next"
                >
                  <ChevronRight className="h-5 w-5" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
