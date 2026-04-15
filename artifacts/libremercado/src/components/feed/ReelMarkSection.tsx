import { Play, Sparkles, ChevronRight } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { useVideoFeed } from "@/hooks/use-marketplace";
import { useLocation } from "@/hooks/use-location";
import { Skeleton } from "@/components/ui/skeleton";
import { resolveMediaUrl } from "@/lib/apiBase";

interface ReelCardProps {
  id: string;
  title: string;
  thumbnailUrl: string | null;
  storeName: string;
  isFeatured?: boolean;
}

function ReelMarkCard({ id, title, thumbnailUrl, storeName, isFeatured }: ReelCardProps) {
  return (
    <Link href={`/videos?productId=${id}`}>
      <div className="relative flex-none w-32 md:w-40 aspect-[9/16] rounded-2xl overflow-hidden cursor-pointer group shadow-lg hover:shadow-primary/20 transition-all border border-white/10">
        {/* Thumbnail */}
        <img
          src={resolveMediaUrl(thumbnailUrl) ?? thumbnailUrl ?? "/placeholder-video.jpg"}
          alt={title}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
        />
        
        {/* Overlay Gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-80" />
        
        {/* Play Icon */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="bg-white/20 backdrop-blur-md rounded-full p-3 border border-white/30">
            <Play className="h-6 w-6 text-white fill-white" />
          </div>
        </div>

        {/* Content */}
        <div className="absolute bottom-0 left-0 right-0 p-3">
          <p className="text-white text-[10px] font-bold uppercase tracking-wider opacity-70 truncate">
            {storeName}
          </p>
          <h4 className="text-white text-xs font-semibold line-clamp-2 leading-snug group-hover:text-primary transition-colors">
            {title}
          </h4>
        </div>

        {/* Glowing Badge if featured */}
        {isFeatured && (
          <div className="absolute top-2 right-2">
            <div className="bg-primary/90 text-white p-1 rounded-full shadow-lg">
              <Sparkles className="h-3 w-3 animate-pulse" />
            </div>
          </div>
        )}
      </div>
    </Link>
  );
}

export function ReelMarkSection() {
  const location = useLocation();
  const { data: videos, isLoading } = useVideoFeed({
    provinciaId: location.provinciaId ?? undefined,
    limit: 10
  });

  if (!isLoading && (!videos || videos.length === 0)) return null;

  return (
    <section className="py-6 sm:py-8 bg-zinc-50/50">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <div className="bg-primary/10 p-2 rounded-xl">
              <Play className="h-5 w-5 text-primary fill-primary" />
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-zinc-900 tracking-tight">ReelMark</h2>
              <p className="text-xs text-zinc-500 font-medium">Comprá mirando la realidad</p>
            </div>
          </div>
          <Link href="/videos">
            <Button variant="ghost" size="sm" className="text-primary font-bold hover:bg-primary/5 gap-1">
              Ver todos <ChevronRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>

        <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide snap-x snap-mandatory md:justify-center">
          {isLoading ? (
            Array(5).fill(0).map((_, i) => (
              <Skeleton key={i} className="flex-none w-32 md:w-40 aspect-[9/16] rounded-2xl bg-zinc-200" />
            ))
          ) : (
            videos?.map((video) => (
              <div key={video.id} className="snap-start">
                <ReelMarkCard
                  id={video.id}
                  title={video.title}
                  thumbnailUrl={video.thumbnailUrl ?? null}
                  storeName={video.store?.name ?? "Tienda"}
                  isFeatured={video.isFeatured ?? undefined}
                />
              </div>
            ))
          )}
        </div>
      </div>
    </section>
  );
}
