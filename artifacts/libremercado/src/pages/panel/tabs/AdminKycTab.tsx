import { useState } from "react";
import { Shield, CheckCircle, XCircle, Clock, Eye } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { KycDocument, KycDocType } from "@shared/schema";

interface PendingKycDoc extends KycDocument {
  user: { id: string; username: string; email: string } | null;
}

const docTypeLabels: Record<KycDocType, string> = {
  dni_front: "DNI Frente",
  dni_back: "DNI Dorso",
  passport: "Pasaporte",
  selfie: "Selfie con DNI",
};

export function AdminKycTab() {
  const { toast } = useToast();
  const [selectedDoc, setSelectedDoc] = useState<PendingKycDoc | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectDialog, setShowRejectDialog] = useState(false);

  const { data: pendingKycDocs, isLoading } = useQuery<PendingKycDoc[]>({
    queryKey: ["/api/admin/kyc/pending"],
  });

  const approveMutation = useMutation({
    mutationFn: async (docId: string) => {
      const res = await apiRequest("PATCH", `/api/admin/kyc/${docId}/approve`, {});
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/kyc/pending"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      toast({ title: "Documento aprobado" });
      setSelectedDoc(null);
    },
    onError: () => toast({ title: "Error", description: "No se pudo aprobar el documento", variant: "destructive" }),
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ docId, reason }: { docId: string; reason: string }) => {
      const res = await apiRequest("PATCH", `/api/admin/kyc/${docId}/reject`, { reason });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/kyc/pending"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      toast({ title: "Documento rechazado" });
      setSelectedDoc(null);
      setShowRejectDialog(false);
      setRejectReason("");
    },
    onError: () => toast({ title: "Error", description: "No se pudo rechazar el documento", variant: "destructive" }),
  });

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Verificacion de Identidad (KYC)
          </CardTitle>
          <CardDescription>Revisa y aprueba los documentos de identidad de los usuarios</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}</div>
          ) : (pendingKycDocs ?? []).length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <p className="text-lg font-medium">No hay documentos pendientes</p>
              <p className="text-muted-foreground">Todos los documentos han sido revisados</p>
            </div>
          ) : (
            <div className="space-y-4">
              {(pendingKycDocs ?? []).map((doc) => (
                <div key={doc.id} className="flex items-center justify-between p-4 border rounded-lg" data-testid={`kyc-pending-${doc.id}`}>
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-lg overflow-hidden bg-muted">
                      <img src={doc.imageUrl} alt={docTypeLabels[doc.docType]} className="w-full h-full object-cover" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{doc.user?.username || "Usuario desconocido"}</p>
                        <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Pendiente</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{docTypeLabels[doc.docType]} - {doc.user?.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => setSelectedDoc(doc)} data-testid={`button-view-${doc.id}`}>
                      <Eye className="h-4 w-4 mr-1" />Ver
                    </Button>
                    <Button size="sm" onClick={() => approveMutation.mutate(doc.id)} disabled={approveMutation.isPending} data-testid={`button-approve-${doc.id}`}>
                      <CheckCircle className="h-4 w-4 mr-1" />Aprobar
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => { setSelectedDoc(doc); setShowRejectDialog(true); }} data-testid={`button-reject-${doc.id}`}>
                      <XCircle className="h-4 w-4 mr-1" />Rechazar
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Document Preview Dialog */}
      <Dialog open={!!selectedDoc && !showRejectDialog} onOpenChange={() => setSelectedDoc(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Documento: {selectedDoc && docTypeLabels[selectedDoc.docType]}</DialogTitle>
            <DialogDescription>Usuario: {selectedDoc?.user?.username} ({selectedDoc?.user?.email})</DialogDescription>
          </DialogHeader>
          <div className="aspect-video w-full rounded-lg overflow-hidden bg-muted">
            <img src={selectedDoc?.imageUrl} alt="Documento" className="w-full h-full object-contain" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedDoc(null)}>Cerrar</Button>
            <Button onClick={() => selectedDoc && approveMutation.mutate(selectedDoc.id)} disabled={approveMutation.isPending}>
              <CheckCircle className="h-4 w-4 mr-2" />Aprobar
            </Button>
            <Button variant="destructive" onClick={() => setShowRejectDialog(true)}>
              <XCircle className="h-4 w-4 mr-2" />Rechazar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rechazar Documento</DialogTitle>
            <DialogDescription>Indica el motivo del rechazo para que el usuario pueda subir un documento valido.</DialogDescription>
          </DialogHeader>
          <Input
            placeholder="Motivo del rechazo (ej: Imagen borrosa, documento incompleto...)"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            data-testid="input-reject-reason"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowRejectDialog(false); setRejectReason(""); }}>Cancelar</Button>
            <Button variant="destructive" onClick={() => selectedDoc && rejectMutation.mutate({ docId: selectedDoc.id, reason: rejectReason })} disabled={rejectMutation.isPending}>
              Confirmar Rechazo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
