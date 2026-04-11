import { Bike, CheckCircle, XCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { RiderProfile } from "@shared/schema";

export function AdminRidersTab() {
  const { toast } = useToast();

  const { data: pendingRiders, isLoading } = useQuery<RiderProfile[]>({
    queryKey: ["/api/admin/riders/pending"],
  });

  const approveMutation = useMutation({
    mutationFn: async (riderId: string) => {
      const res = await apiRequest("PATCH", `/api/admin/riders/${riderId}/approve`, {});
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/riders/pending"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      toast({ title: "Repartidor aprobado" });
    },
    onError: () => toast({ title: "Error", description: "No se pudo aprobar el repartidor", variant: "destructive" }),
  });

  const rejectMutation = useMutation({
    mutationFn: async (riderId: string) => {
      const res = await apiRequest("PATCH", `/api/admin/riders/${riderId}/reject`, {});
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/riders/pending"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      toast({ title: "Repartidor rechazado" });
    },
    onError: () => toast({ title: "Error", description: "No se pudo rechazar el repartidor", variant: "destructive" }),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bike className="h-5 w-5" />
          Solicitudes de Repartidores
        </CardTitle>
        <CardDescription>Revisa y aprueba las solicitudes de nuevos repartidores</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-4">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}</div>
        ) : (pendingRiders ?? []).length === 0 ? (
          <div className="text-center py-12">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <p className="text-lg font-medium">No hay solicitudes pendientes</p>
            <p className="text-muted-foreground">Todas las solicitudes han sido procesadas</p>
          </div>
        ) : (
          <div className="space-y-4">
            {(pendingRiders ?? []).map((rider) => (
              <div key={rider.id} className="p-4 border rounded-lg" data-testid={`rider-pending-${rider.id}`}>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold">Repartidor #{rider.userId.slice(-6)}</p>
                    <p className="text-sm text-muted-foreground">
                      Vehiculo: {rider.vehicleType} - Patente: {rider.vehiclePlate}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => approveMutation.mutate(rider.userId)} disabled={approveMutation.isPending}>
                      <CheckCircle className="h-4 w-4 mr-1" />Aprobar
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => rejectMutation.mutate(rider.userId)} disabled={rejectMutation.isPending}>
                      <XCircle className="h-4 w-4 mr-1" />Rechazar
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
