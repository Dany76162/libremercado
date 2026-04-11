import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Favorite, FavoriteType } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";

export function useFavorites(type?: FavoriteType) {
  const { isAuthenticated } = useAuth();
  return useQuery<Favorite[]>({
    queryKey: ["/api/favorites", type ?? "all"],
    queryFn: async () => {
      const url = type ? `/api/favorites?type=${type}` : "/api/favorites";
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: isAuthenticated,
  });
}

export function useIsFavorite(targetId: string, type: FavoriteType) {
  const { isAuthenticated } = useAuth();
  return useQuery<{ isFavorite: boolean }>({
    queryKey: ["/api/favorites/check", targetId, type],
    queryFn: async () => {
      const res = await fetch(`/api/favorites/check?targetId=${targetId}&type=${type}`, { credentials: "include" });
      if (!res.ok) return { isFavorite: false };
      return res.json();
    },
    enabled: isAuthenticated && !!targetId,
  });
}

export function useToggleFavorite() {
  return useMutation({
    mutationFn: async ({ targetId, type, isFav }: { targetId: string; type: FavoriteType; isFav: boolean }) => {
      if (isFav) {
        await apiRequest("DELETE", "/api/favorites", { targetId, type });
      } else {
        await apiRequest("POST", "/api/favorites", { targetId, type });
      }
      return !isFav;
    },
    onSuccess: (_result, vars) => {
      queryClient.invalidateQueries({ queryKey: ["/api/favorites"] });
      queryClient.invalidateQueries({ queryKey: ["/api/favorites/check", vars.targetId, vars.type] });
    },
  });
}
