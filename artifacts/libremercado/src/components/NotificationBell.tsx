import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Bell, CheckCheck, Package, Truck, Star, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { apiRequest } from "@/lib/queryClient";
import { Link } from "wouter";
import type { Notification } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";

const typeIcons: Record<string, typeof Package> = {
  order_status: Package,
  order_delivered: Truck,
  review: Star,
};

export function NotificationBell() {
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  const { data } = useQuery<{ notifications: Notification[]; unread: number }>({
    queryKey: ["/api/notifications"],
    refetchInterval: 30000,
    enabled: isAuthenticated,
  });

  const markAllMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/notifications/read-all");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
    },
  });

  const markOneMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("PATCH", `/api/notifications/${id}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
    },
  });

  if (!isAuthenticated) return null;

  const unread = data?.unread ?? 0;
  const items = data?.notifications ?? [];

  return (
    <Popover open={open} onOpenChange={(o) => {
      setOpen(o);
      if (o && unread > 0) {
        // Auto-mark all as read after 3s of opening
        setTimeout(() => markAllMutation.mutate(), 3000);
      }
    }}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          data-testid="button-notification-bell"
        >
          <Bell className="h-5 w-5" />
          {unread > 0 && (
            <span
              className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-destructive text-destructive-foreground text-[10px] flex items-center justify-center font-bold"
              data-testid="badge-unread-count"
            >
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end" data-testid="popover-notifications">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h3 className="font-semibold text-sm">Notificaciones</h3>
          {unread > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs h-7 gap-1"
              onClick={() => markAllMutation.mutate()}
              data-testid="button-mark-all-read"
            >
              <CheckCheck className="h-3 w-3" />
              Marcar leídas
            </Button>
          )}
        </div>

        <ScrollArea className="h-80">
          {items.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground text-sm">
              <Bell className="h-8 w-8 mx-auto mb-2 opacity-30" />
              Sin notificaciones
            </div>
          ) : (
            <div>
              {items.map((n, i) => {
                const Icon = typeIcons[n.type] ?? Info;
                return (
                  <div key={n.id}>
                    {i > 0 && <Separator />}
                    <button
                      className={`w-full text-left px-4 py-3 hover:bg-muted/50 transition-colors flex items-start gap-3 ${
                        !n.isRead ? "bg-primary/5" : ""
                      }`}
                      onClick={() => {
                        if (!n.isRead) markOneMutation.mutate(n.id);
                        if (n.link) setOpen(false);
                      }}
                      data-testid={`notification-${n.id}`}
                    >
                      <div className={`mt-0.5 p-1.5 rounded-full ${!n.isRead ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                        <Icon className="h-3.5 w-3.5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm leading-tight ${!n.isRead ? "font-semibold" : ""}`}>
                          {n.title}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                          {n.body}
                        </p>
                        <p className="text-xs text-muted-foreground/70 mt-1">
                          {n.createdAt ? new Date(n.createdAt).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" }) : ""}
                        </p>
                      </div>
                      {!n.isRead && (
                        <div className="h-2 w-2 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                      )}
                    </button>
                    {n.link && (
                      <div className="px-4 pb-2">
                        <Link href={n.link} onClick={() => setOpen(false)}>
                          <span className="text-xs text-primary hover:underline">Ver detalle</span>
                        </Link>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
