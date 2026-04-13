import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Shield, CheckCircle, Clock, AlertCircle, ArrowLeft, Camera, CreditCard, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ImageUpload } from "@/components/ui/ImageUpload";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { KycDocument, KycDocType, KycStatus } from "@shared/schema";
import { resolveMediaUrl } from "@/lib/apiBase";

const docTypes: { type: KycDocType; label: string; description: string; icon: typeof CreditCard }[] = [
  { type: "dni_front", label: "DNI Frente", description: "Foto del frente de tu DNI", icon: CreditCard },
  { type: "dni_back", label: "DNI Dorso", description: "Foto del dorso de tu DNI", icon: CreditCard },
  { type: "selfie", label: "Selfie con DNI", description: "Foto tuya sosteniendo tu DNI", icon: User },
];

function getDocStatusBadge(doc: KycDocument | undefined) {
  if (!doc) return null;
  switch (doc.status) {
    case "approved":
      return <Badge variant="default" className="gap-1"><CheckCircle className="h-3 w-3" /> Aprobado</Badge>;
    case "pending":
      return <Badge variant="secondary" className="gap-1"><Clock className="h-3 w-3" /> En revisión</Badge>;
    case "rejected":
      return <Badge variant="destructive" className="gap-1"><AlertCircle className="h-3 w-3" /> Rechazado</Badge>;
    default:
      return null;
  }
}

export default function KycVerification() {
  const [, setLocation] = useLocation();
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [uploadingType, setUploadingType] = useState<KycDocType | null>(null);

  const { data: kycData, isLoading: kycLoading } = useQuery<{ status: KycStatus; documents: KycDocument[] }>({
    queryKey: ["/api/kyc/status"],
    enabled: isAuthenticated,
  });

  const uploadMutation = useMutation({
    mutationFn: async ({ docType, imageUrl }: { docType: KycDocType; imageUrl: string }) => {
      const res = await apiRequest("POST", "/api/kyc/documents", { docType, imageUrl });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/kyc/status"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({
        title: "Documento enviado",
        description: "Tu documento ha sido enviado para revisión",
      });
      setUploadingType(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Error al subir el documento",
        variant: "destructive",
      });
    },
  });

  const handleUpload = (docType: KycDocType, imageUrl: string) => {
    if (!imageUrl) return;
    uploadMutation.mutate({ docType, imageUrl });
  };

  if (authLoading || kycLoading) {
    return (
      <div className="min-h-screen max-w-2xl mx-auto px-4 py-6">
        <Skeleton className="h-8 w-48 mb-6" />
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h1 className="text-xl font-bold mb-2">Inicia sesión</h1>
            <p className="text-muted-foreground mb-4">
              Necesitas iniciar sesión para verificar tu identidad
            </p>
            <Link href="/auth">
              <Button>Iniciar Sesión</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const documents = kycData?.documents || [];
  const getDocByType = (type: KycDocType) => documents.find((d) => d.docType === type);

  return (
    <div className="min-h-screen max-w-2xl mx-auto px-4 py-6">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="icon" onClick={() => setLocation("/account")} data-testid="button-back">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Verificación de Identidad</h1>
          <p className="text-muted-foreground">
            Sube tus documentos para verificar tu cuenta
          </p>
        </div>
      </div>

      {kycData?.status === "approved" && (
        <Card className="mb-6 border-green-200 bg-green-50 dark:bg-green-950/20 dark:border-green-800">
          <CardContent className="p-4 flex items-center gap-4">
            <CheckCircle className="h-8 w-8 text-green-600" />
            <div>
              <p className="font-semibold text-green-800 dark:text-green-200">Cuenta Verificada</p>
              <p className="text-sm text-green-700 dark:text-green-300">
                Tu identidad ha sido verificada exitosamente
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {kycData?.status === "rejected" && (
        <Card className="mb-6 border-destructive/50 bg-destructive/10">
          <CardContent className="p-4 flex items-center gap-4">
            <AlertCircle className="h-8 w-8 text-destructive" />
            <div>
              <p className="font-semibold text-destructive">Verificación Rechazada</p>
              <p className="text-sm text-muted-foreground">
                Por favor, sube documentos válidos nuevamente
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Documentos Requeridos
          </CardTitle>
          <CardDescription>
            Sube fotos claras de tus documentos de identidad
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {docTypes.map((docType) => {
            const existingDoc = getDocByType(docType.type);
            const DocIcon = docType.icon;
            const isUploading = uploadingType === docType.type;

            return (
              <div
                key={docType.type}
                className="border rounded-lg p-4 space-y-3"
                data-testid={`kyc-doc-${docType.type}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                      <DocIcon className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-medium">{docType.label}</p>
                      <p className="text-sm text-muted-foreground">{docType.description}</p>
                    </div>
                  </div>
                  {getDocStatusBadge(existingDoc)}
                </div>

                {existingDoc?.imageUrl && (
                  <div className="relative aspect-video w-full max-w-xs rounded-lg overflow-hidden bg-muted">
                    <img
                      src={resolveMediaUrl(existingDoc.imageUrl) ?? existingDoc.imageUrl}
                      alt={docType.label}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}

                {existingDoc?.status === "rejected" && existingDoc.rejectionReason && (
                  <p className="text-sm text-destructive">
                    Motivo: {existingDoc.rejectionReason}
                  </p>
                )}

                {(!existingDoc || existingDoc.status === "rejected") && (
                  <div className="space-y-2">
                    <ImageUpload
                      endpoint="kyc"
                      value={null}
                      onChange={(url) => {
                        if (url) {
                          setUploadingType(docType.type);
                          handleUpload(docType.type, url);
                        }
                      }}
                      label={existingDoc ? "Subir nuevo documento" : "Subir documento"}
                      aspectRatio="landscape"
                    />
                    {uploadMutation.isPending && uploadingType === docType.type && (
                      <p className="text-xs text-muted-foreground">Enviando para revisión...</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Camera className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div className="text-sm text-muted-foreground">
              <p className="font-medium text-foreground mb-1">Consejos para fotos válidas:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Asegurate de que la foto esté bien iluminada</li>
                <li>Todos los datos deben ser legibles</li>
                <li>Evitá reflejos o sombras sobre el documento</li>
                <li>El documento debe verse completo en la imagen</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
