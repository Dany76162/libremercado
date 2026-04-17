import { Building2, CheckCircle, XCircle, MapPin } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { MerchantApplication } from "@shared/schema";

export function AdminMerchantsTab() {
  const { toast } = useToast();

  const { data: pendingMerchants, isLoading } = useQuery<MerchantApplication[]>({
    queryKey: ["/api/admin/merchants/pending"],
  });

  const approveMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("PATCH", `/api/admin/merchants/${id}/approve`, {});
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/merchants/pending"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      toast({ title: "Comerciante aprobado", description: "Se ha creado la tienda automaticamente" });
    },
    onError: () => toast({ title: "Error", description: "No se pudo aprobar la solicitud", variant: "destructive" }),
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ applicationId, reason }: { applicationId: string; reason: string }) => {
      const res = await apiRequest("PATCH", `/api/admin/merchants/${applicationId}/reject`, { reason });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/merchants/pending"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      toast({ title: "Solicitud rechazada" });
    },
    onError: () => toast({ title: "Error", description: "No se pudo rechazar la solicitud", variant: "destructive" }),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="h-5 w-5" />
          Solicitudes de Comerciantes
        </CardTitle>
        <CardDescription>Revisa y aprueba las solicitudes de nuevos comerciantes</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-4">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}</div>
        ) : (pendingMerchants ?? []).length === 0 ? (
          <div className="text-center py-12">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <p className="text-lg font-medium">No hay solicitudes pendientes</p>
            <p className="text-muted-foreground">Todas las solicitudes han sido procesadas</p>
          </div>
        ) : (
          <div className="space-y-4">
            {(pendingMerchants ?? []).map((app) => (
              <div key={app.id} className="p-4 border rounded-lg" data-testid={`merchant-pending-${app.id}`}>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold">{app.businessName}</p>
                    <p className="text-sm text-muted-foreground">{app.businessType}</p>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                      <MapPin className="h-3 w-3" />
                      {app.address}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => approveMutation.mutate(app.id)} disabled={approveMutation.isPending}>
                      <CheckCircle className="h-4 w-4 mr-1" />Aprobar
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => rejectMutation.mutate({ applicationId: app.id, reason: "No aprobado" })} disabled={rejectMutation.isPending}>
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
