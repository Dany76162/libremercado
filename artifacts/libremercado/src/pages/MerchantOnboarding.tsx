import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Store, CheckCircle, Clock, XCircle, Building2, MapPin, Phone, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { MerchantApplication, SubscriptionPlan } from "@shared/schema";
import { provincias } from "@shared/argentina";

const businessTypes = [
  { value: "Supermercado", label: "Supermercado / Almacén" },
  { value: "Farmacia", label: "Farmacia / Perfumería" },
  { value: "Comida", label: "Restaurante / Comida" },
  { value: "Electrónica", label: "Electrónica / Tecnología" },
  { value: "Moda", label: "Ropa / Moda" },
  { value: "Mascotas", label: "Mascotas" },
  { value: "Hogar", label: "Hogar / Decoración" },
  { value: "Servicios", label: "Servicios" },
  { value: "Otro", label: "Otro" },
];

export default function MerchantOnboarding() {
  const { user, isLoading: authLoading } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    businessName: "",
    businessType: "",
    description: "",
    address: "",
    provinciaId: "",
    ciudadId: "",
    phone: "",
  });

  const selectedProvincia = provincias.find((p) => p.id === formData.provinciaId);
  const ciudades = selectedProvincia?.ciudades || [];

  const { data: application, isLoading: appLoading } = useQuery<MerchantApplication | null>({
    queryKey: ["/api/merchant/application"],
    enabled: !!user,
  });

  const { data: plans } = useQuery<SubscriptionPlan[]>({
    queryKey: ["/api/subscription-plans"],
  });

  const applyMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const response = await apiRequest("POST", "/api/merchant/apply", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/merchant/application"] });
      toast({
        title: "Solicitud enviada",
        description: "Tu solicitud fue enviada correctamente. Te notificaremos cuando sea revisada.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "No se pudo enviar la solicitud",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    applyMutation.mutate(formData);
  };

  if (authLoading || appLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Cargando...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen max-w-4xl mx-auto px-4 py-12">
        <Card>
          <CardContent className="py-12 text-center">
            <Store className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">Empezá a vender en PachaPay</h2>
            <p className="text-muted-foreground mb-6">
              Para aplicar como comerciante, primero necesitás crear una cuenta.
            </p>
            <Button onClick={() => navigate("/auth")} data-testid="button-login-to-apply">
              Iniciar sesión o registrarse
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (user.role === "merchant") {
    return (
      <div className="min-h-screen max-w-4xl mx-auto px-4 py-12">
        <Card>
          <CardContent className="py-12 text-center">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">Ya sos comerciante</h2>
            <p className="text-muted-foreground mb-6">
              Tu cuenta ya está habilitada para vender en PachaPay.
            </p>
            <Button onClick={() => navigate("/panel")} data-testid="button-go-to-panel">
              Ir al Panel de Comerciante
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (application) {
    return (
      <div className="min-h-screen max-w-4xl mx-auto px-4 py-12">
        <Card>
          <CardContent className="py-12">
            <div className="text-center mb-8">
              {application.status === "pending" && (
                <>
                  <Clock className="h-16 w-16 text-yellow-500 mx-auto mb-4" />
                  <h2 className="text-2xl font-bold mb-2">Solicitud en revisión</h2>
                  <p className="text-muted-foreground">
                    Tu solicitud está siendo evaluada. Te notificaremos cuando tengamos una respuesta.
                  </p>
                </>
              )}
              {application.status === "approved" && (
                <>
                  <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
                  <h2 className="text-2xl font-bold mb-2">Solicitud aprobada</h2>
                  <p className="text-muted-foreground mb-6">
                    Tu solicitud fue aprobada. Ya podés acceder al panel de comerciante.
                  </p>
                  <Button onClick={() => navigate("/panel")} data-testid="button-go-to-panel-approved">
                    Ir al Panel de Comerciante
                  </Button>
                </>
              )}
              {application.status === "rejected" && (
                <>
                  <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
                  <h2 className="text-2xl font-bold mb-2">Solicitud rechazada</h2>
                  <p className="text-muted-foreground mb-2">
                    Lamentablemente tu solicitud no fue aprobada.
                  </p>
                  {application.rejectionReason && (
                    <p className="text-sm text-muted-foreground bg-muted p-4 rounded-md">
                      Motivo: {application.rejectionReason}
                    </p>
                  )}
                </>
              )}
            </div>

            <div className="bg-muted/50 rounded-lg p-4">
              <h3 className="font-semibold mb-3">Datos de la solicitud</h3>
              <div className="grid gap-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Nombre del negocio:</span>
                  <span>{application.businessName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tipo:</span>
                  <span>{application.businessType}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Dirección:</span>
                  <span>{application.address}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Teléfono:</span>
                  <span>{application.phone}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen max-w-6xl mx-auto px-4 py-8">
      <div className="text-center mb-8">
        <Store className="h-12 w-12 text-primary mx-auto mb-4" />
        <h1 className="text-3xl font-bold mb-2">Vendé en PachaPay</h1>
        <p className="text-muted-foreground">
          Unite a miles de comerciantes que ya venden en nuestra plataforma
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6 mb-8">
        {plans?.map((plan) => (
          <Card key={plan.id} className={plan.tier === "premium" ? "border-primary" : ""}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {plan.name}
                {plan.tier === "premium" && (
                  <span className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded">
                    Recomendado
                  </span>
                )}
              </CardTitle>
              <CardDescription>
                <span className="text-2xl font-bold">
                  ${parseFloat(plan.monthlyFee).toLocaleString("es-AR")}
                </span>
                <span className="text-muted-foreground">/mes</span>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm">
                {plan.features?.split(",").map((feature, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                    <span>{feature.trim()}</span>
                  </li>
                ))}
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                  <span>Comisión: {parseFloat(plan.commissionPercent)}% por venta</span>
                </li>
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Solicitud de comerciante</CardTitle>
          <CardDescription>
            Completá el formulario con los datos de tu negocio. Revisaremos tu solicitud en 24-48hs.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="businessName">
                  <Building2 className="h-4 w-4 inline mr-1" />
                  Nombre del negocio
                </Label>
                <Input
                  id="businessName"
                  placeholder="Ej: Mi Almacén"
                  value={formData.businessName}
                  onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                  required
                  data-testid="input-business-name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="businessType">Tipo de negocio</Label>
                <Select
                  value={formData.businessType}
                  onValueChange={(value) => setFormData({ ...formData, businessType: value })}
                  required
                >
                  <SelectTrigger data-testid="select-business-type">
                    <SelectValue placeholder="Seleccioná un tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    {businessTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">
                <FileText className="h-4 w-4 inline mr-1" />
                Descripción (opcional)
              </Label>
              <Textarea
                id="description"
                placeholder="Contanos sobre tu negocio..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="resize-none"
                rows={3}
                data-testid="textarea-description"
              />
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="provinciaId">
                  <MapPin className="h-4 w-4 inline mr-1" />
                  Provincia
                </Label>
                <Select
                  value={formData.provinciaId}
                  onValueChange={(value) => setFormData({ ...formData, provinciaId: value, ciudadId: "" })}
                  required
                >
                  <SelectTrigger data-testid="select-provincia">
                    <SelectValue placeholder="Seleccioná tu provincia" />
                  </SelectTrigger>
                  <SelectContent>
                    {provincias.map((prov) => (
                      <SelectItem key={prov.id} value={prov.id}>
                        {prov.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="ciudadId">Ciudad</Label>
                <Select
                  value={formData.ciudadId}
                  onValueChange={(value) => setFormData({ ...formData, ciudadId: value })}
                  disabled={!formData.provinciaId}
                >
                  <SelectTrigger data-testid="select-ciudad">
                    <SelectValue placeholder={formData.provinciaId ? "Seleccioná tu ciudad" : "Primero elegí provincia"} />
                  </SelectTrigger>
                  <SelectContent>
                    {ciudades.map((ciudad) => (
                      <SelectItem key={ciudad.id} value={ciudad.id}>
                        {ciudad.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="address">
                  Dirección del local
                </Label>
                <Input
                  id="address"
                  placeholder="Ej: Av. Rivadavia 1234"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  required
                  data-testid="input-address"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">
                  <Phone className="h-4 w-4 inline mr-1" />
                  Teléfono de contacto
                </Label>
                <Input
                  id="phone"
                  placeholder="Ej: +54 11 1234-5678"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  required
                  data-testid="input-phone"
                />
              </div>
            </div>

            <div className="bg-muted/50 p-4 rounded-lg text-sm text-muted-foreground">
              Al enviar esta solicitud, aceptás nuestros{" "}
              <a href="/terms" className="text-primary underline">términos y condiciones</a> para comerciantes.
              Todas las tiendas comienzan con el plan Starter (gratuito) y pueden actualizar en cualquier momento.
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={applyMutation.isPending}
              data-testid="button-submit-application"
            >
              {applyMutation.isPending ? "Enviando..." : "Enviar solicitud"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
