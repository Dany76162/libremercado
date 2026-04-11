import { useEffect, useRef, useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import {
  Heart, ShoppingCart, Share2, Store, MapPin, Star, Play, Pause,
  Volume2, VolumeX, Clock, CheckCircle, ChevronUp, ChevronDown,
  Sparkles, ArrowRight, BadgePercent, UserPlus, UserCheck, ArrowLeft
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useCart } from "@/hooks/use-cart";
import { useAuth } from "@/hooks/use-auth";
import { useLocation as useLocationStore } from "@/hooks/use-location";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { VideoFeedItem } from "@shared/schema";

function formatPrice(price: string): string {
  return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(Number(price));
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const AMBIENT_COLORS = [
  "rgba(255,69,0,0.35)",
  "rgba(0,153,255,0.35)",
  "rgba(147,51,234,0.35)",
  "rgba(22,163,74,0.35)",
  "rgba(220,38,38,0.35)",
];

function discountPercent(price: string, original: string): number {
  const p = Number(price);
  const o = Number(original);
  if (!o || o <= p) return 0;
  return Math.round((1 - p / o) * 100);
}

interface VideoCardProps {
  video: VideoFeedItem;
  isActive: boolean;
  colorIdx: number;
  userLat?: number;
  userLng?: number;
}

function VideoCard({ video, isActive, colorIdx, userLat, userLng }: VideoCardProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [isLoaded, setIsLoaded] = useState(false);
  const [viewTracked, setViewTracked] = useState(false);
  const [localLikes, setLocalLikes] = useState(video.savesCount);
  const [liked, setLiked] = useState(false);
  const [isFollowing, setIsFollowing] = useState(video.store?.isFollowing ?? false);
  const [followersCount, setFollowersCount] = useState(video.store?.followersCount ?? 0);

  const { isAuthenticated } = useAuth();
  const addToCart = useCart((s) => s.addItem);
  const { toast } = useToast();
  const [, navigate] = useLocation();

  const ambientColor = AMBIENT_COLORS[colorIdx % AMBIENT_COLORS.length];
  const distanceKm = userLat && userLng && video.store?.lat && video.store?.lng
    ? haversineKm(userLat, userLng, Number(video.store.lat), Number(video.store.lng))
    : null;

  // Force muted attribute via ref (React muted prop bug)
  useEffect(() => {
    const v = videoRef.current;
    if (v) v.muted = true;
  }, []);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (isActive) {
      v.play().catch(() => {});
      if (!viewTracked) {
        apiRequest("POST", `/api/videos/${video.id}/view`).catch(() => {});
        setViewTracked(true);
      }
    } else {
      v.pause();
      setIsPaused(false);
    }
  }, [isActive, video.id, viewTracked]);

  const togglePause = (e: React.MouseEvent) => {
    e.stopPropagation();
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) { v.play(); setIsPaused(false); }
    else { v.pause(); setIsPaused(true); }
  };

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    const v = videoRef.current;
    if (!v) return;
    v.muted = !v.muted;
    setIsMuted(v.muted);
  };

  const handleAddToCart = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!video.product) { navigate(`/store/${video.storeId}`); return; }
    if (!isAuthenticated) { navigate("/auth"); return; }
    const product = {
      id: video.product.id, name: video.product.name, price: video.product.price,
      image: video.product.image, originalPrice: video.product.originalPrice,
      storeId: video.storeId, description: null, category: null,
      stock: 99, isActive: true, isSponsored: false, sponsoredUntil: null, sponsoredPriority: 0,
    };
    addToCart(product as any);
    apiRequest("POST", `/api/videos/${video.id}/add-to-cart`).catch(() => {});
    toast({ title: "Agregado al carrito", description: video.product.name });
  };

  const handleLike = (e: React.MouseEvent) => {
    e.stopPropagation();
    setLiked((v) => !v);
    setLocalLikes((n) => liked ? n - 1 : n + 1);
  };

  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try { await navigator.share({ title: video.title, url: window.location.href }); }
    catch { navigator.clipboard.writeText(window.location.href); toast({ title: "Enlace copiado" }); }
  };

  const handleFollow = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isAuthenticated) { navigate("/auth"); return; }
    if (!video.storeId) return;
    const next = !isFollowing;
    setIsFollowing(next);
    setFollowersCount((n) => next ? n + 1 : Math.max(0, n - 1));
    try {
      await apiRequest(next ? "POST" : "DELETE", `/api/stores/${video.storeId}/follow`);
    } catch {
      setIsFollowing(!next);
      setFollowersCount((n) => next ? Math.max(0, n - 1) : n + 1);
      toast({ title: "Error", description: "No se pudo actualizar el seguimiento", variant: "destructive" });
    }
  };

  const discount = video.product?.originalPrice
    ? discountPercent(video.product.price, video.product.originalPrice)
    : 0;

  return (
    <div
      className="relative w-full h-full overflow-hidden bg-zinc-950"
      data-testid={`video-card-${video.id}`}
    >
      {/* ── AMBIENT GLOW (desktop only, static color — no video element) ── */}
      <div
        className="hidden md:block absolute inset-0 pointer-events-none"
        style={{ background: `radial-gradient(ellipse at center, ${ambientColor} 0%, rgba(0,0,0,0.96) 65%)` }}
      />

      {/* ── CENTERED PHONE FRAME ── */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div
          className="relative h-full overflow-hidden"
          style={{ width: "min(100vw, calc(100vh * 9 / 16))" }}
        >
          {/* Main video */}
          <video
            ref={videoRef}
            className="absolute inset-0 w-full h-full object-cover"
            src={video.videoUrl}
            poster={video.thumbnailUrl ?? undefined}
            loop muted playsInline preload="auto"
            onCanPlay={() => setIsLoaded(true)}
            onClick={togglePause}
          />

          {/* Loading shimmer */}
          {!isLoaded && (
            <div className="absolute inset-0 bg-zinc-900 animate-pulse flex items-center justify-center">
              <Play className="h-10 w-10 text-zinc-600" />
            </div>
          )}

          {/* Gradient — transparent in center so video is visible */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ background: "linear-gradient(to top, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.08) 38%, transparent 55%, rgba(0,0,0,0.12) 100%)" }}
          />

          {/* Pause indicator */}
          {isPaused && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="bg-black/60 backdrop-blur-sm rounded-full p-5 shadow-2xl">
                <Play className="h-10 w-10 text-white fill-white" />
              </div>
            </div>
          )}

          {/* Top badges + mute */}
          <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              {video.isFeatured && (
                <Badge className="bg-yellow-400 text-black text-[10px] font-bold px-2 py-0.5 shadow-lg">
                  <Sparkles className="h-3 w-3 mr-1 fill-black" />Destacado
                </Badge>
              )}
              {video.isSponsored && (
                <Badge className="bg-primary/90 text-white text-[10px] px-2 py-0.5 shadow-lg">Patrocinado</Badge>
              )}
            </div>
            <button
              className="bg-black/50 backdrop-blur-sm rounded-full p-2 text-white shadow-lg"
              onClick={toggleMute}
              data-testid="button-mute"
            >
              {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </button>
          </div>

          {/* ── BOTTOM INFO ── */}
          <div
            className="absolute bottom-0 left-0 right-16 p-4 space-y-2"
            style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom, 1rem))" }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Store row */}
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center shadow-lg flex-none">
                <Store className="h-3.5 w-3.5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-white font-bold text-sm leading-tight truncate">{video.store?.name ?? "Tienda"}</p>
                  {video.storeId && (
                    <button
                      className={`flex-none text-[11px] font-semibold px-2 py-0.5 rounded-full border transition-all ${
                        isFollowing
                          ? "text-white/50 border-white/25"
                          : "text-white border-white/60"
                      }`}
                      onClick={handleFollow}
                      data-testid="button-follow-store-row"
                    >
                      {isFollowing ? "Siguiendo" : "Seguir"}
                    </button>
                  )}
                </div>
                <p className="text-white/55 text-xs">{video.store?.category}</p>
              </div>
              {video.store?.rating && (
                <div className="flex items-center gap-1 bg-yellow-400/20 rounded-full px-2 py-0.5 border border-yellow-400/30">
                  <Star className="h-3 w-3 text-yellow-400 fill-yellow-400" />
                  <span className="text-yellow-300 text-xs font-bold">{video.store.rating}</span>
                </div>
              )}
            </div>

            {/* Title */}
            <h3 className="text-white font-extrabold text-sm leading-snug line-clamp-2 drop-shadow-sm">
              {video.title}
            </h3>

            {/* Price — always inline, no glass card */}
            {video.product && (
              <div className="flex items-center gap-2">
                <span className="text-white font-black text-xl tracking-tight">
                  {formatPrice(video.product.price)}
                </span>
                {discount > 0 && (
                  <>
                    <span className="text-white/40 text-sm line-through">
                      {formatPrice(video.product.originalPrice!)}
                    </span>
                    <Badge className="bg-primary text-white text-[10px] font-bold px-2 py-0.5 rounded-full ml-auto">
                      <BadgePercent className="h-3 w-3 mr-0.5" />
                      -{discount}%
                    </Badge>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── ACTION BUTTONS (right strip — same style on mobile & desktop) ── */}
        <div
          className="absolute right-4 flex flex-col-reverse items-center gap-5"
          style={{ bottom: "max(0.75rem, env(safe-area-inset-bottom, 0.75rem))" }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Share — bottom */}
          <button className="flex flex-col items-center gap-0.5" onClick={handleShare} data-testid="button-share-mobile">
            <Share2 className="h-6 w-6 text-white" style={{ filter: "drop-shadow(0 1px 4px rgba(0,0,0,0.85))" }} />
            <span className="text-white text-[10px] font-semibold" style={{ textShadow: "0 1px 3px rgba(0,0,0,0.9)" }}>Compartir</span>
          </button>

          <Link href={`/store/${video.storeId}`} onClick={(e) => e.stopPropagation()}>
            <button className="flex flex-col items-center gap-0.5" data-testid="button-go-store-mobile">
              <Store className="h-6 w-6 text-white" style={{ filter: "drop-shadow(0 1px 4px rgba(0,0,0,0.85))" }} />
              <span className="text-white text-[10px] font-semibold" style={{ textShadow: "0 1px 3px rgba(0,0,0,0.9)" }}>Tienda</span>
            </button>
          </Link>

          <button className="flex flex-col items-center gap-0.5" onClick={handleAddToCart} data-testid="button-add-to-cart-mobile">
            <ShoppingCart className="h-6 w-6 text-white" style={{ filter: "drop-shadow(0 1px 4px rgba(0,0,0,0.85))" }} />
            <span className="text-white text-[10px] font-semibold" style={{ textShadow: "0 1px 3px rgba(0,0,0,0.9)" }}>{video.addToCartCount}</span>
          </button>

          {/* Heart — top */}
          <button className="flex flex-col items-center gap-0.5" onClick={handleLike} data-testid="button-like-mobile">
            <Heart
              className={`h-6 w-6 transition-colors ${liked ? "text-red-400 fill-red-400" : "text-white"}`}
              style={{ filter: "drop-shadow(0 1px 4px rgba(0,0,0,0.85))" }}
            />
            <span className="text-white text-[10px] font-semibold" style={{ textShadow: "0 1px 3px rgba(0,0,0,0.9)" }}>{localLikes}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

function VideoSkeleton() {
  return (
    <div className="relative w-full h-full bg-zinc-950 flex items-end p-5 space-y-3">
      <div className="absolute inset-0 bg-gradient-to-br from-zinc-800/50 via-zinc-900 to-black animate-pulse" />
      <div className="relative w-full space-y-3">
        <div className="flex items-center gap-3">
          <Skeleton className="w-9 h-9 rounded-full bg-zinc-700" />
          <Skeleton className="h-4 w-28 bg-zinc-700" />
        </div>
        <Skeleton className="h-5 w-3/4 bg-zinc-700" />
        <Skeleton className="h-4 w-1/2 bg-zinc-800" />
        <Skeleton className="h-24 w-full rounded-2xl bg-zinc-800" />
      </div>
    </div>
  );
}

export default function Videos() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [feedHeight, setFeedHeight] = useState("100dvh");
  const containerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Measure actual header height dynamically (re-runs on mount to capture after Navbar updates)
  useEffect(() => {
    const measure = () => {
      const header = document.querySelector("header");
      if (header) {
        const h = header.getBoundingClientRect().height;
        setFeedHeight(`calc(100dvh - ${h}px)`);
      }
    };
    measure();
    // Re-measure after a tick so Navbar has re-rendered with hidden secondary nav
    const t = setTimeout(measure, 50);
    window.addEventListener("resize", measure);
    return () => { clearTimeout(t); window.removeEventListener("resize", measure); };
  }, []);

  const locationStore = useLocationStore();
  const userLat = locationStore.lat ?? undefined;
  const userLng = locationStore.lng ?? undefined;
  const provinciaId = locationStore.provinciaId ?? undefined;
  const ciudadId = locationStore.ciudadId ?? undefined;

  const { data: videos, isLoading } = useQuery<VideoFeedItem[]>({
    queryKey: ["/api/videos/feed", { provinciaId, ciudadId }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (provinciaId) params.set("provinciaId", provinciaId);
      if (ciudadId) params.set("ciudadId", ciudadId);
      params.set("limit", "20");
      const res = await fetch(`/api/videos/feed?${params}`);
      return res.json();
    },
  });

  // Ensure first video plays immediately on load
  useEffect(() => {
    if (videos && videos.length > 0) setActiveIndex(0);
  }, [videos]);

  // IntersectionObserver with lower threshold for better detection
  useEffect(() => {
    const container = containerRef.current;
    if (!container || !videos?.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const idx = itemRefs.current.findIndex((el) => el === entry.target);
            if (idx !== -1) setActiveIndex(idx);
          }
        });
      },
      { root: container, threshold: 0.5 }
    );

    itemRefs.current.forEach((el) => { if (el) observer.observe(el); });
    return () => observer.disconnect();
  }, [videos]);

  const scrollToIndex = useCallback((idx: number) => {
    const el = itemRefs.current[idx];
    if (el) el.scrollIntoView({ behavior: "smooth" });
  }, []);

  const isEmpty = !isLoading && (!videos || videos.length === 0);

  return (
    <div className="relative bg-black" style={{ height: feedHeight }}>
      {/* Back to menu button — top left, always visible */}
      <div className="absolute top-4 left-4 z-50">
        <Link href="/">
          <button
            className="flex items-center gap-1.5 bg-black/50 backdrop-blur-sm text-white text-sm font-semibold px-3 py-1.5 rounded-full shadow-lg hover:bg-black/70 transition-colors"
            data-testid="button-back-home"
          >
            <ArrowLeft className="h-4 w-4" />
            Menú
          </button>
        </Link>
      </div>

      {/* Feed */}
      <div
        ref={containerRef}
        className="h-full overflow-y-scroll snap-y snap-mandatory"
        style={{ scrollbarWidth: "none" }}
      >
        {isLoading && [0, 1, 2].map((i) => (
          <div key={i} className="snap-start snap-always" style={{ height: feedHeight }}>
            <VideoSkeleton />
          </div>
        ))}

        {isEmpty && (
          <div className="flex flex-col items-center justify-center h-full text-white text-center px-8 bg-zinc-950">
            <div className="bg-zinc-800/80 rounded-full p-10 mb-6 shadow-2xl">
              <Play className="h-16 w-16 text-zinc-500" />
            </div>
            <h2 className="text-2xl font-bold mb-3">No hay videos disponibles</h2>
            <p className="text-zinc-500 text-sm max-w-xs">
              Los comerciantes aún no han publicado videos en tu zona.
            </p>
          </div>
        )}

        {videos?.map((video, idx) => (
          <div
            key={video.id}
            ref={(el) => { itemRefs.current[idx] = el; }}
            className="snap-start snap-always"
            style={{ height: feedHeight }}
          >
            <VideoCard
              video={video}
              isActive={activeIndex === idx}
              colorIdx={idx}
              userLat={userLat ? Number(userLat) : undefined}
              userLng={userLng ? Number(userLng) : undefined}
            />
          </div>
        ))}
      </div>

      {/* Desktop: nav arrows */}
      {videos && videos.length > 1 && (
        <div className="hidden md:flex flex-col gap-2 absolute left-4 top-1/2 -translate-y-1/2 z-30">
          <button
            onClick={() => activeIndex > 0 && scrollToIndex(activeIndex - 1)}
            disabled={activeIndex === 0}
            className="bg-white/15 backdrop-blur-sm hover:bg-white/30 disabled:opacity-20 text-white rounded-full p-2.5 transition-all shadow-lg"
            data-testid="button-prev-video"
          >
            <ChevronUp className="h-5 w-5" />
          </button>
          <button
            onClick={() => activeIndex < videos.length - 1 && scrollToIndex(activeIndex + 1)}
            disabled={activeIndex >= videos.length - 1}
            className="bg-white/15 backdrop-blur-sm hover:bg-white/30 disabled:opacity-20 text-white rounded-full p-2.5 transition-all shadow-lg"
            data-testid="button-next-video"
          >
            <ChevronDown className="h-5 w-5" />
          </button>
        </div>
      )}

      {/* Desktop: progress dots */}
      {videos && videos.length > 1 && (
        <div className="hidden md:flex flex-col gap-1.5 absolute right-3 top-1/2 -translate-y-1/2 z-30">
          {videos.map((_, idx) => (
            <button
              key={idx}
              onClick={() => scrollToIndex(idx)}
              className={`rounded-full transition-all duration-300 ${
                idx === activeIndex
                  ? "h-7 w-1.5 bg-white shadow-lg shadow-white/30"
                  : "h-1.5 w-1.5 bg-white/35 hover:bg-white/60"
              }`}
              data-testid={`dot-video-${idx}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
