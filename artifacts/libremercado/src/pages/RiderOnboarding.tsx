import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Bike, CheckCircle, Clock, XCircle, Car, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { RiderProfile } from "@shared/schema";

const vehicleTypes = [
  { value: "moto", label: "Moto", icon: Bike, description: "Ideal para entregas rápidas en la ciudad" },
  { value: "auto", label: "Auto", icon: Car, description: "Mayor capacidad de carga" },
  { value: "utilitario", label: "Utilitario", icon: Truck, description: "Para entregas grandes" },
];

export default function RiderOnboarding() {
  const { user, isLoading: authLoading } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    vehicleType: "" as "moto" | "auto" | "utilitario" | "",
    vehiclePlate: "",
    licenseNumber: "",
  });

  const { data: profile, isLoading: profileLoading } = useQuery<RiderProfile | null>({
    queryKey: ["/api/rider/profile"],
    enabled: !!user,
  });

  const applyMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const response = await apiRequest("POST", "/api/rider/apply", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/rider/profile"] });
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
    if (!formData.vehicleType) {
      toast({
        title: "Error",
        description: "Seleccioná un tipo de vehículo",
        variant: "destructive",
      });
      return;
    }
    applyMutation.mutate(formData as { vehicleType: "moto" | "auto" | "utilitario"; vehiclePlate: string; licenseNumber: string });
  };

  if (authLoading || profileLoading) {
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
            <Bike className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">Convertite en repartidor</h2>
            <p className="text-muted-foreground mb-6">
              Para aplicar como repartidor, primero necesitás crear una cuenta.
            </p>
            <Button onClick={() => navigate("/auth")} data-testid="button-login-to-apply">
              Iniciar sesión o registrarse
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (user.role === "rider") {
    return (
      <div className="min-h-screen max-w-4xl mx-auto px-4 py-12">
        <Card>
          <CardContent className="py-12 text-center">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">Ya sos repartidor</h2>
            <p className="text-muted-foreground mb-6">
              Tu cuenta ya está habilitada para hacer entregas en PachaPay.
            </p>
            <Button onClick={() => navigate("/panel")} data-testid="button-go-to-panel">
              Ir al Panel de Repartidor
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (profile) {
    return (
      <div className="min-h-screen max-w-4xl mx-auto px-4 py-12">
        <Card>
          <CardContent className="py-12">
            <div className="text-center mb-8">
              {profile.status === "pending" && (
                <>
                  <Clock className="h-16 w-16 text-yellow-500 mx-auto mb-4" />
                  <h2 className="text-2xl font-bold mb-2">Solicitud en revisión</h2>
                  <p className="text-muted-foreground">
                    Tu solicitud está siendo evaluada. Te notificaremos cuando tengamos una respuesta.
                  </p>
                </>
              )}
              {profile.status === "active" && (
                <>
                  <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
                  <h2 className="text-2xl font-bold mb-2">Cuenta activa</h2>
                  <p className="text-muted-foreground mb-6">
                    Tu cuenta está activa. Ya podés acceder al panel de repartidor.
                  </p>
                  <Button onClick={() => navigate("/panel")} data-testid="button-go-to-panel-active">
                    Ir al Panel de Repartidor
                  </Button>
                </>
              )}
              {profile.status === "inactive" && (
                <>
                  <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
                  <h2 className="text-2xl font-bold mb-2">Solicitud rechazada</h2>
                  <p className="text-muted-foreground">
                    Lamentablemente tu solicitud no fue aprobada. Contactanos para más información.
                  </p>
                </>
              )}
            </div>

            <div className="bg-muted/50 rounded-lg p-4">
              <h3 className="font-semibold mb-3">Datos del perfil</h3>
              <div className="grid gap-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tipo de vehículo:</span>
                  <span className="capitalize">{profile.vehicleType}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Patente:</span>
                  <span>{profile.vehiclePlate}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Licencia:</span>
                  <span>{profile.licenseNumber}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen max-w-4xl mx-auto px-4 py-8">
      <div className="text-center mb-8">
        <Bike className="h-12 w-12 text-primary mx-auto mb-4" />
        <h1 className="text-3xl font-bold mb-2">Convertite en repartidor</h1>
        <p className="text-muted-foreground">
          Trabajá con flexibilidad y ganá dinero haciendo entregas
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-4 mb-8">
        <Card>
          <CardContent className="py-6 text-center">
            <div className="text-3xl font-bold text-primary mb-1">10%</div>
            <div className="text-sm text-muted-foreground">Por cada entrega</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-6 text-center">
            <div className="text-3xl font-bold text-primary mb-1">24/7</div>
            <div className="text-sm text-muted-foreground">Horarios flexibles</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-6 text-center">
            <div className="text-3xl font-bold text-primary mb-1">Semanal</div>
            <div className="text-sm text-muted-foreground">Cobro de ganancias</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Registro de repartidor</CardTitle>
          <CardDescription>
            Completá el formulario con los datos de tu vehículo.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-3">
              <Label>Tipo de vehículo</Label>
              <RadioGroup
                value={formData.vehicleType}
                onValueChange={(value) => setFormData({ ...formData, vehicleType: value as "moto" | "auto" | "utilitario" })}
                className="grid md:grid-cols-3 gap-4"
              >
                {vehicleTypes.map((vehicle) => {
                  const Icon = vehicle.icon;
                  return (
                    <div key={vehicle.value}>
                      <RadioGroupItem
                        value={vehicle.value}
                        id={vehicle.value}
                        className="peer sr-only"
                      />
                      <Label
                        htmlFor={vehicle.value}
                        className="flex flex-col items-center justify-center rounded-md border-2 border-muted bg-popover p-4 hover-elevate cursor-pointer peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                        data-testid={`radio-${vehicle.value}`}
                      >
                        <Icon className="h-8 w-8 mb-2" />
                        <div className="font-semibold">{vehicle.label}</div>
                        <div className="text-xs text-muted-foreground text-center mt-1">
                          {vehicle.description}
                        </div>
                      </Label>
                    </div>
                  );
                })}
              </RadioGroup>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="vehiclePlate">Patente del vehículo</Label>
                <Input
                  id="vehiclePlate"
                  placeholder="Ej: ABC 123"
                  value={formData.vehiclePlate}
                  onChange={(e) => setFormData({ ...formData, vehiclePlate: e.target.value })}
                  required
                  data-testid="input-vehicle-plate"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="licenseNumber">Número de licencia</Label>
                <Input
                  id="licenseNumber"
                  placeholder="Ej: 12345678"
                  value={formData.licenseNumber}
                  onChange={(e) => setFormData({ ...formData, licenseNumber: e.target.value })}
                  required
                  data-testid="input-license-number"
                />
              </div>
            </div>

            <div className="bg-muted/50 p-4 rounded-lg text-sm text-muted-foreground">
              Al enviar esta solicitud, aceptás nuestros{" "}
              <a href="/terms" className="text-primary underline">términos y condiciones</a> para repartidores.
              Deberás tener tu documentación al día y vehículo en buen estado.
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
