import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";

interface FollowStatus {
  isFollowing: boolean;
  followersCount: number;
}

export function useFollowStore(storeId: string) {
  const { isAuthenticated } = useAuth();

  const { data, isLoading } = useQuery<FollowStatus>({
    queryKey: ["/api/stores", storeId, "follow"],
    queryFn: async () => {
      const res = await fetch(`/api/stores/${storeId}/follow`);
      if (!res.ok) return { isFollowing: false, followersCount: 0 };
      return res.json();
    },
    enabled: isAuthenticated && !!storeId,
  });

  const followMutation = useMutation({
    mutationFn: () => apiRequest("POST", `/api/stores/${storeId}/follow`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/stores", storeId, "follow"] });
      queryClient.invalidateQueries({ queryKey: ["/api/videos/feed"] });
    },
  });

  const unfollowMutation = useMutation({
    mutationFn: () => apiRequest("DELETE", `/api/stores/${storeId}/follow`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/stores", storeId, "follow"] });
      queryClient.invalidateQueries({ queryKey: ["/api/videos/feed"] });
    },
  });

  const toggle = () => {
    if (!isAuthenticated) return;
    if (data?.isFollowing) {
      unfollowMutation.mutate();
    } else {
      followMutation.mutate();
    }
  };

  return {
    isFollowing: data?.isFollowing ?? false,
    followersCount: data?.followersCount ?? 0,
    isLoading,
    isPending: followMutation.isPending || unfollowMutation.isPending,
    toggle,
  };
}
