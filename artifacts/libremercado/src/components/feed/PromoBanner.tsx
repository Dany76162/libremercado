import { useState, useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Promo } from "@shared/schema";

interface PromoBannerProps {
  promos: Promo[];
}

export function PromoBanner({ promos }: PromoBannerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const resumeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const activePromos = promos.filter((p) => p.isActive && p.mediaType !== "video");

  const pauseTemporarily = () => {
    setIsPaused(true);
    if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
    resumeTimerRef.current = setTimeout(() => setIsPaused(false), 6000);
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
    }, 15000);

    return () => clearInterval(interval);
  }, [isPaused, activePromos.length, currentIndex]);

  if (activePromos.length === 0) {
    return (
      <div
        className="relative w-full aspect-[21/9] md:aspect-[21/6] bg-gradient-to-r from-primary to-accent rounded-md overflow-hidden"
        data-testid="banner-placeholder"
      >
        <div className="absolute inset-0 flex items-center justify-center text-primary-foreground">
          <div className="text-center px-4">
            <h2 className="text-2xl md:text-4xl font-bold mb-2">
              Bienvenido a PachaPay
            </h2>
            <p className="text-sm md:text-base opacity-90">
              Descubre las mejores ofertas locales
            </p>
          </div>
        </div>
      </div>
    );
  }

  const currentPromo = activePromos[currentIndex];

  const goToPrevious = () => {
    pauseTemporarily();
    setCurrentIndex((prev) => (prev - 1 + activePromos.length) % activePromos.length);
  };

  const goToNext = () => {
    pauseTemporarily();
    setCurrentIndex((prev) => (prev + 1) % activePromos.length);
  };

  return (
    <div
      className="relative w-full aspect-[21/9] md:aspect-[21/6] rounded-md overflow-hidden group"
      data-testid="promo-banner"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {currentPromo.image ? (
        <img
          src={currentPromo.image}
          alt={currentPromo.title}
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="w-full h-full bg-gradient-to-r from-primary to-accent" />
      )}

      <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/30 to-transparent">
        <div className="h-full flex flex-col justify-center px-6 md:px-12 max-w-xl">
          {currentPromo.discount && (
            <span className="inline-block bg-accent text-accent-foreground px-3 py-1 rounded text-sm font-bold mb-2 w-fit">
              {currentPromo.discount}
            </span>
          )}
          <h2
            className="text-xl md:text-4xl font-bold text-white mb-2"
            data-testid="text-promo-title"
          >
            {currentPromo.title}
          </h2>
          {currentPromo.description && (
            <p className="text-sm md:text-lg text-white/90 line-clamp-2">
              {currentPromo.description}
            </p>
          )}
          {currentPromo.advertiser && (
            <p className="text-xs text-white/70 mt-3">
              Por {currentPromo.advertiser}
            </p>
          )}
          {currentPromo.link && (
            <Button
              className="mt-4 w-fit"
              size="lg"
              data-testid="button-promo-cta"
            >
              Ver ofertas
            </Button>
          )}
        </div>
      </div>

      {activePromos.length > 1 && (
        <>
          <Button
            variant="secondary"
            size="icon"
            className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/30 text-white opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={goToPrevious}
            data-testid="button-banner-prev"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <Button
            variant="secondary"
            size="icon"
            className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/30 text-white opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={goToNext}
            data-testid="button-banner-next"
          >
            <ChevronRight className="h-5 w-5" />
          </Button>

          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
            {activePromos.map((promo, index) => (
              <button
                key={promo.id}
                className={`w-2 h-2 rounded-full transition-all ${
                  index === currentIndex
                    ? "bg-white w-6"
                    : "bg-white/50 hover:bg-white/75"
                }`}
                onClick={() => {
                  pauseTemporarily();
                  setCurrentIndex(index);
                }}
                data-testid={`button-banner-dot-${index}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
