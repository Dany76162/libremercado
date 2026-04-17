import { create } from "zustand";
import { persist } from "zustand/middleware";
import { provincias, getLocationName, type Provincia, type Ciudad } from "@shared/argentina";
import { apiRequest, queryClient } from "@/lib/queryClient";

export interface LocationState {
  provinciaId: string | null;
  ciudadId: string | null;
  lat: number | null;
  lng: number | null;
  radiusKm: number;
  locationName: string;
  useGps: boolean;
  setLocation: (provinciaId: string, ciudadId?: string) => void;
  setGpsLocation: (lat: number, lng: number, radiusKm?: number) => void;
  setRadius: (km: number) => void;
  clearLocation: () => void;
  requestGps: () => Promise<{ lat: number; lng: number } | null>;
  getProvincias: () => Provincia[];
  getCiudades: (provinciaId: string) => Ciudad[];
  syncToServer: () => Promise<void>;
}

export const useLocation = create<LocationState>()(
  persist(
    (set, get) => ({
      provinciaId: null,
      ciudadId: null,
      lat: null,
      lng: null,
      radiusKm: 25,
      locationName: "Seleccionar ubicación",
      useGps: false,

      setLocation: (provinciaId: string, ciudadId?: string) => {
        const name = getLocationName(provinciaId, ciudadId);
        set({
          provinciaId,
          ciudadId: ciudadId || null,
          lat: null,
          lng: null,
          useGps: false,
          locationName: name,
        });
        get().syncToServer();
      },

      setGpsLocation: (lat: number, lng: number, radiusKm?: number) => {
        set({
          lat,
          lng,
          provinciaId: null,
          ciudadId: null,
          useGps: true,
          radiusKm: radiusKm ?? get().radiusKm,
          locationName: `Mi ubicación (${radiusKm ?? get().radiusKm}km)`,
        });
        get().syncToServer();
      },

      setRadius: (km: number) => {
        const state = get();
        set({
          radiusKm: km,
          locationName: state.useGps
            ? `Mi ubicación (${km}km)`
            : state.locationName,
        });
        if (state.useGps) {
          get().syncToServer();
        }
      },

      clearLocation: () => {
        set({
          provinciaId: null,
          ciudadId: null,
          lat: null,
          lng: null,
          useGps: false,
          locationName: "Seleccionar ubicación",
        });
        get().syncToServer();
      },

      requestGps: async () => {
        if (!navigator.geolocation) return null;
        return new Promise((resolve) => {
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude });
            },
            () => resolve(null),
            { timeout: 8000 }
          );
        });
      },

      syncToServer: async () => {
        try {
          // Only sync if there is an active authenticated session in the cache
          const authUser = queryClient.getQueryData<{ id: string } | null>(["/api/auth/user"]);
          if (!authUser) return;
          const state = get();
          await apiRequest("PUT", "/api/account/location-preferences", {
            provinciaId: state.provinciaId,
            ciudadId: state.ciudadId,
            lat: state.lat,
            lng: state.lng,
            radiusKm: state.radiusKm,
          });
          queryClient.invalidateQueries({ queryKey: ["/api/account/location-preferences"] });
        } catch {
          // Silently fail on network errors
        }
      },

      getProvincias: () => provincias,

      getCiudades: (provinciaId: string) => {
        const provincia = provincias.find((p) => p.id === provinciaId);
        return provincia?.ciudades || [];
      },
    }),
    {
      name: "pachapay-location-v2",
    }
  )
);
