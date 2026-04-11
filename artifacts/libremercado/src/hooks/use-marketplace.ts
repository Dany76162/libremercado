import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Store, Product, Order, Promo, TravelOffer, InsertStore, InsertProduct, InsertOrder } from "@shared/schema";

interface LocationFilter {
  provinciaId?: string | null;
  ciudadId?: string | null;
  lat?: number | null;
  lng?: number | null;
  radiusKm?: number | null;
  useGps?: boolean;
}

function buildLocationParams(location?: LocationFilter): URLSearchParams {
  const params = new URLSearchParams();
  if (!location) return params;

  if (location.useGps && location.lat != null && location.lng != null && location.radiusKm != null) {
    params.set("lat", String(location.lat));
    params.set("lng", String(location.lng));
    params.set("radiusKm", String(location.radiusKm));
  } else if (location.provinciaId) {
    params.set("provinciaId", location.provinciaId);
    if (location.ciudadId) {
      params.set("ciudadId", location.ciudadId);
    }
  }
  return params;
}

export function useFeaturedStores(location?: LocationFilter) {
  const params = buildLocationParams(location);
  const queryString = params.toString();
  const url = queryString ? `/api/stores/featured?${queryString}` : "/api/stores/featured";
  const key = location?.useGps
    ? ["/api/stores/featured", "gps", location.lat, location.lng, location.radiusKm]
    : ["/api/stores/featured", location?.provinciaId, location?.ciudadId];

  return useQuery<Store[]>({
    queryKey: key,
    queryFn: async () => {
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch featured stores");
      return res.json();
    },
  });
}

export function useStores(location?: LocationFilter) {
  const params = buildLocationParams(location);
  const queryString = params.toString();
  const url = queryString ? `/api/stores?${queryString}` : "/api/stores";
  const key = location?.useGps
    ? ["/api/stores", "gps", location.lat, location.lng, location.radiusKm]
    : ["/api/stores", location?.provinciaId, location?.ciudadId];

  return useQuery<Store[]>({
    queryKey: key,
    queryFn: async () => {
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch stores");
      return res.json();
    },
  });
}

export function useStore(id: string) {
  return useQuery<Store>({
    queryKey: ["/api/stores", id],
    enabled: !!id,
  });
}

export function useStoreProducts(storeId: string) {
  return useQuery<Product[]>({
    queryKey: ["/api/stores", storeId, "products"],
    enabled: !!storeId,
  });
}

export function useProducts(location?: LocationFilter) {
  const params = buildLocationParams(location);
  const queryString = params.toString();
  const url = queryString ? `/api/products?${queryString}` : "/api/products";
  const key = location?.useGps
    ? ["/api/products", "gps", location.lat, location.lng, location.radiusKm]
    : ["/api/products", location?.provinciaId, location?.ciudadId];

  return useQuery<Product[]>({
    queryKey: key,
    queryFn: async () => {
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch products");
      return res.json();
    },
  });
}

export function useFeaturedProducts(location?: LocationFilter) {
  const params = buildLocationParams(location);
  const queryString = params.toString();
  const url = queryString ? `/api/products/featured?${queryString}` : "/api/products/featured";
  const key = location?.useGps
    ? ["/api/products/featured", "gps", location.lat, location.lng, location.radiusKm]
    : ["/api/products/featured", location?.provinciaId, location?.ciudadId];

  return useQuery<Product[]>({
    queryKey: key,
    queryFn: async () => {
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch featured products");
      return res.json();
    },
  });
}

export function useProduct(id: string) {
  return useQuery<Product>({
    queryKey: ["/api/products", id],
    enabled: !!id,
  });
}

export function useOrders() {
  return useQuery<Order[]>({
    queryKey: ["/api/orders"],
  });
}

export function useStoreOrders(storeId: string) {
  return useQuery<Order[]>({
    queryKey: ["/api/orders/store", storeId],
    enabled: !!storeId,
  });
}

export function useAvailableOrders() {
  return useQuery<Order[]>({
    queryKey: ["/api/orders/rider/available"],
  });
}

export function useAssignedOrders() {
  return useQuery<Order[]>({
    queryKey: ["/api/orders/rider/assigned"],
  });
}

export interface BannerLocationFilter {
  provinciaId?: string | null;
  ciudadId?: string | null;
  lat?: number | null;
  lng?: number | null;
}

export function usePromoBanners(location?: BannerLocationFilter) {
  const params = new URLSearchParams();
  if (location?.lat != null && location?.lng != null) {
    params.set("lat", String(location.lat));
    params.set("lng", String(location.lng));
    if (location?.provinciaId) params.set("provinciaId", location.provinciaId);
    if (location?.ciudadId) params.set("ciudadId", location.ciudadId);
  } else {
    if (location?.provinciaId) params.set("provinciaId", location.provinciaId);
    if (location?.ciudadId) params.set("ciudadId", location.ciudadId);
  }
  const queryString = params.toString();
  const url = queryString ? `/api/promos/banners?${queryString}` : "/api/promos/banners";
  const key = location?.lat != null && location?.lng != null
    ? ["/api/promos/banners", "gps", location.lat, location.lng]
    : ["/api/promos/banners", location?.provinciaId, location?.ciudadId];
  return useQuery<Promo[]>({
    queryKey: key,
    queryFn: async () => {
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch banners");
      return res.json();
    },
  });
}

export function usePromoNotices() {
  return useQuery<Promo[]>({
    queryKey: ["/api/promos/notices"],
  });
}

export function usePromoCategories() {
  return useQuery<Promo[]>({
    queryKey: ["/api/promos/categories"],
  });
}

export function useTravelOffers() {
  return useQuery<TravelOffer[]>({
    queryKey: ["/api/travel/offers"],
  });
}

export function useTrackPromoImpression() {
  return useMutation({
    mutationFn: (promoId: string) => apiRequest("POST", `/api/promos/${promoId}/impression`, {}),
  });
}

export function useTrackPromoClick() {
  return useMutation({
    mutationFn: (promoId: string) => apiRequest("POST", `/api/promos/${promoId}/click`, {}),
  });
}

export function useCreateStore() {
  return useMutation({
    mutationFn: (data: InsertStore) => apiRequest("POST", "/api/stores", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/stores"] });
    },
  });
}

export function useUpdateStore() {
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<InsertStore> }) =>
      apiRequest("PATCH", `/api/stores/${id}`, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/stores"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stores", id] });
    },
  });
}

export function useCreateProduct() {
  return useMutation({
    mutationFn: (data: InsertProduct) => apiRequest("POST", "/api/products", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
    },
  });
}

export function useUpdateProduct() {
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<InsertProduct> }) =>
      apiRequest("PATCH", `/api/products/${id}`, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      queryClient.invalidateQueries({ queryKey: ["/api/products", id] });
    },
  });
}

export function useCreateOrder() {
  return useMutation({
    mutationFn: (data: InsertOrder & { items: { productId: string; quantity: number }[] }) =>
      apiRequest("POST", "/api/orders", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
    },
  });
}

export function useUpdateOrder() {
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<InsertOrder> }) =>
      apiRequest("PATCH", `/api/orders/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
    },
  });
}

export function useDiscountedProducts(category?: string, limit = 8) {
  const params = new URLSearchParams();
  if (category) params.set("category", category);
  params.set("limit", String(limit));
  return useQuery<Product[]>({
    queryKey: ["/api/products/discounted", category, limit],
    queryFn: () => fetch(`/api/products/discounted?${params.toString()}`).then((r) => r.json()),
  });
}

export function useHomeSettings() {
  return useQuery<Record<string, string>>({
    queryKey: ["/api/config/home-settings"],
    queryFn: () => fetch("/api/config/home-settings").then((r) => r.json()),
  });
}

export function useNovedades(filters?: { provincia?: string; official?: boolean; category?: string; limit?: number }) {
  const params = new URLSearchParams();
  if (filters?.provincia) params.set("provincia", filters.provincia);
  if (filters?.official !== undefined) params.set("official", String(filters.official));
  if (filters?.category) params.set("category", filters.category);
  if (filters?.limit) params.set("limit", String(filters.limit));
  const qs = params.toString();
  return useQuery<import("@/components/feed/NovedadCard").Novedad[]>({
    queryKey: ["/api/novedades", qs],
    queryFn: () => fetch(`/api/novedades${qs ? `?${qs}` : ""}`).then((r) => r.json()),
  });
}
