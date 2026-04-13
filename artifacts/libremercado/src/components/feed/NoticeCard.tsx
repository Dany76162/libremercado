import { Megaphone, ExternalLink } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Promo } from "@shared/schema";
import { resolveMediaUrl } from "@/lib/apiBase";

interface NoticeCardProps {
  notice: Promo;
}

export function NoticeCard({ notice }: NoticeCardProps) {
  const handleClick = () => {
    if (notice.link) {
      window.open(notice.link, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <Card
      className={`overflow-hidden ${notice.link ? "cursor-pointer hover-elevate active-elevate-2" : ""}`}
      onClick={notice.link ? handleClick : undefined}
      data-testid={`card-notice-${notice.id}`}
    >
      <CardContent className="p-4">
        <div className="flex gap-4">
          {notice.image ? (
            <div className="w-20 h-20 shrink-0 rounded-md overflow-hidden bg-muted">
              <img
                src={resolveMediaUrl(notice.image) ?? notice.image}
                alt={notice.title}
                className="w-full h-full object-cover"
              />
            </div>
          ) : (
            <div className="w-20 h-20 shrink-0 rounded-md bg-accent/10 flex items-center justify-center">
              <Megaphone className="h-8 w-8 text-accent" />
            </div>
          )}

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-1">
              <h3
                className="font-semibold text-base line-clamp-1"
                data-testid={`text-notice-title-${notice.id}`}
              >
                {notice.title}
              </h3>
              {notice.link && (
                <ExternalLink className="h-4 w-4 shrink-0 text-muted-foreground" />
              )}
            </div>

            {notice.description && (
              <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                {notice.description}
              </p>
            )}

            {notice.advertiser && (
              <Badge variant="outline" className="text-xs">
                {notice.advertiser}
              </Badge>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
