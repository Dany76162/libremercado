import { useState, useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight, Volume2, VolumeX, Play, Pause } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Promo } from "@shared/schema";

interface PromoBannerProps {
  promos: Promo[];
}

export function PromoBanner({ promos }: PromoBannerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const [isVideoPaused, setIsVideoPaused] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const activePromos = promos.filter((p) => p.isActive);

  useEffect(() => {
    if (!isAutoPlaying || activePromos.length <= 1) return;

    const currentPromo = activePromos[currentIndex];
    const isVideo = currentPromo?.mediaType === "video" && currentPromo?.videoUrl;
    
    if (isVideo) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % activePromos.length);
    }, 30000);

    return () => clearInterval(interval);
  }, [isAutoPlaying, activePromos.length, currentIndex, activePromos]);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = isMuted;
    }
  }, [isMuted]);

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
  const isVideo = currentPromo.mediaType === "video" && currentPromo.videoUrl;

  const goToPrevious = () => {
    setIsAutoPlaying(false);
    setCurrentIndex((prev) => (prev - 1 + activePromos.length) % activePromos.length);
  };

  const goToNext = () => {
    setIsAutoPlaying(false);
    setCurrentIndex((prev) => (prev + 1) % activePromos.length);
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
  };

  const togglePlayPause = () => {
    if (videoRef.current) {
      if (isVideoPaused) {
        videoRef.current.play();
      } else {
        videoRef.current.pause();
      }
      setIsVideoPaused(!isVideoPaused);
    }
  };

  const handleVideoEnded = () => {
    if (activePromos.length > 1) {
      setCurrentIndex((prev) => (prev + 1) % activePromos.length);
    }
  };

  return (
    <div
      className="relative w-full aspect-[21/9] md:aspect-[21/6] rounded-md overflow-hidden group"
      data-testid="promo-banner"
      onMouseEnter={() => setIsAutoPlaying(false)}
      onMouseLeave={() => setIsAutoPlaying(true)}
    >
      {isVideo ? (
        <video
          ref={videoRef}
          src={currentPromo.videoUrl!}
          className="w-full h-full object-cover"
          autoPlay
          muted={isMuted}
          playsInline
          onEnded={handleVideoEnded}
          data-testid="video-promo"
        />
      ) : currentPromo.image ? (
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

      {isVideo && (
        <div className="absolute bottom-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            variant="secondary"
            size="icon"
            className="bg-black/50 text-white"
            onClick={togglePlayPause}
            data-testid="button-video-playpause"
          >
            {isVideoPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
          </Button>
          <Button
            variant="secondary"
            size="icon"
            className="bg-black/50 text-white"
            onClick={toggleMute}
            data-testid="button-video-mute"
          >
            {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </Button>
        </div>
      )}

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
                  setIsAutoPlaying(false);
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
