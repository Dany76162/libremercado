import { useState } from "react";
import { ShieldAlert, Clock, CheckCircle, XCircle, Loader2, ChevronDown, ChevronUp, RotateCcw } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Dispute, DisputeStatus } from "@shared/schema";

const STATUS_LABELS: Record<DisputeStatus, string> = {
  pending: "Pendiente",
  reviewing: "En revisión",
  resolved: "Resuelta",
  rejected: "Rechazada",
};

const STATUS_COLORS: Record<DisputeStatus, string> = {
  pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
  reviewing: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  resolved: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  rejected: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
};

const TYPE_LABELS: Record<string, string> = {
  return: "Devolución",
  not_received: "No recibido",
  damaged: "Dañado",
  wrong_item: "Producto incorrecto",
  other: "Otro",
};

function DisputeRow({ dispute }: { dispute: Dispute }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = useState(false);
  const [newStatus, setNewStatus] = useState<DisputeStatus>(dispute.status ?? "pending");
  const [resolution, setResolution] = useState(dispute.resolution ?? "");
  const [refundResult, setRefundResult] = useState<string | null>(null);

  const updateMutation = useMutation({
    mutationFn: () =>
      apiRequest("PATCH", `/api/admin/disputes/${dispute.id}`, {
        status: newStatus,
        resolution,
      }),
    onSuccess: () => {
      toast({ title: "Disputa actualizada" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/disputes"] });
    },
    onError: () => {
      toast({ title: "Error al actualizar", variant: "destructive" });
    },
  });

  const refundMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/admin/disputes/${dispute.id}/refund`);
      return res.json() as Promise<{ refundId: string; status: string }>;
    },
    onSuccess: (data) => {
      setRefundResult(data?.status ?? "procesado");
      toast({ title: "Reembolso emitido correctamente" });
    },
    onError: (err: any) => {
      toast({ title: err?.message ?? "Error al emitir reembolso", variant: "destructive" });
    },
  });

  return (
    <div className="border rounded-lg overflow-hidden" data-testid={`dispute-row-${dispute.id}`}>
      <div
        className="flex items-center gap-3 p-4 cursor-pointer hover:bg-muted/50 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <ShieldAlert className="h-4 w-4 text-muted-foreground shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-sm truncate">Pedido #{dispute.orderId.slice(-8)}</span>
            <Badge className={`text-xs px-1.5 py-0.5 border-0 ${STATUS_COLORS[dispute.status ?? "pending"]}`}>
              {STATUS_LABELS[dispute.status ?? "pending"]}
            </Badge>
            <Badge variant="outline" className="text-xs px-1.5 py-0.5">
              {TYPE_LABELS[dispute.type] ?? dispute.type}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            {dispute.createdAt
              ? new Date(dispute.createdAt).toLocaleDateString("es-AR", { day: "numeric", month: "short", year: "numeric" })
              : "—"}
          </p>
        </div>
        {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
      </div>

      {expanded && (
        <div className="border-t p-4 space-y-4 bg-muted/20">
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Descripción</p>
            <p className="text-sm">{dispute.description}</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Nuevo estado</p>
              <Select value={newStatus} onValueChange={(v) => setNewStatus(v as DisputeStatus)}>
                <SelectTrigger data-testid="select-dispute-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pendiente</SelectItem>
                  <SelectItem value="reviewing">En revisión</SelectItem>
                  <SelectItem value="resolved">Resuelta</SelectItem>
                  <SelectItem value="rejected">Rechazada</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Resolución (opcional)</p>
            <Textarea
              value={resolution}
              onChange={(e) => setResolution(e.target.value)}
              placeholder="Describe la resolución..."
              rows={3}
              data-testid="textarea-dispute-resolution"
            />
          </div>

          <div className="flex gap-2 flex-wrap">
            <Button
              size="sm"
              onClick={() => updateMutation.mutate()}
              disabled={updateMutation.isPending}
              data-testid="button-update-dispute"
            >
              {updateMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Actualizar
            </Button>
            {dispute.status === "resolved" && (
              <Button
                size="sm"
                variant="outline"
                className="text-destructive border-destructive/30 hover:bg-destructive/5"
                onClick={() => refundMutation.mutate()}
                disabled={refundMutation.isPending || !!refundResult}
                data-testid="button-refund-dispute"
              >
                {refundMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <RotateCcw className="h-4 w-4 mr-2" />
                )}
                {refundResult ? `Reembolso: ${refundResult}` : "Emitir reembolso"}
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminDisputesTab() {
  const { data: disputeList, isLoading } = useQuery<Dispute[]>({
    queryKey: ["/api/admin/disputes"],
  });

  const pending = disputeList?.filter((d) => d.status === "pending").length ?? 0;
  const reviewing = disputeList?.filter((d) => d.status === "reviewing").length ?? 0;
  const resolved = disputeList?.filter((d) => d.status === "resolved").length ?? 0;

  return (
    <div className="space-y-6" data-testid="admin-disputes-tab">
      <div>
        <h2 className="text-xl font-semibold">Disputas y devoluciones</h2>
        <p className="text-sm text-muted-foreground">Revisá y gestioná las disputas de los clientes</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-yellow-500" />
              <div>
                <p className="text-2xl font-bold">{pending}</p>
                <p className="text-xs text-muted-foreground">Pendientes</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Loader2 className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">{reviewing}</p>
                <p className="text-xs text-muted-foreground">En revisión</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-2xl font-bold">{resolved}</p>
                <p className="text-xs text-muted-foreground">Resueltas</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">Cargando disputas...</div>
      ) : !disputeList?.length ? (
        <Card>
          <CardContent className="py-12 text-center">
            <ShieldAlert className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="font-medium">Sin disputas</p>
            <p className="text-sm text-muted-foreground">No hay disputas para revisar en este momento</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {disputeList.map((d) => (
            <DisputeRow key={d.id} dispute={d} />
          ))}
        </div>
      )}
    </div>
  );
}
