import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Package, Navigation, Clock, CheckCircle, MapPin, Phone, DollarSign, Power, PowerOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { OrderTrackingMap } from "@/components/maps/OrderTrackingMap";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { apiUrl } from "@/lib/apiBase";
import type { Order, RiderProfile, RiderEarning } from "@shared/schema";

const statusLabels: Record<Order["status"], string> = {
  pending: "Pendiente",
  confirmed: "Confirmado",
  preparing: "Preparando",
  ready: "Listo para recoger",
  in_transit: "En camino",
  delivered: "Entregado",
  cancelled: "Cancelado",
};

export default function RiderPanel() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("available");
  const [visibleMaps, setVisibleMaps] = useState<Record<string, boolean>>({});

  const toggleMap = (orderId: string) => {
    setVisibleMaps(prev => ({ ...prev, [orderId]: !prev[orderId] }));
  };

  const { data: profile, isLoading: profileLoading } = useQuery<RiderProfile | null>({
    queryKey: ["/api/rider/profile"],
  });

  const { data: availableOrders, isLoading: availableLoading } = useQuery<Order[]>({
    queryKey: ["/api/orders/rider/available"],
    enabled: profile?.status === "active",
  });

  const { data: assignedOrders, isLoading: assignedLoading } = useQuery<Order[]>({
    queryKey: ["/api/rider/orders/assigned"],
    enabled: profile?.status === "active",
  });

  const { data: earnings } = useQuery<RiderEarning[]>({
    queryKey: ["/api/rider/earnings"],
    enabled: profile?.status === "active",
  });

  const toggleAvailabilityMutation = useMutation({
    mutationFn: async (isAvailable: boolean) => {
      const response = await apiRequest("PATCH", "/api/rider/availability", { isAvailable });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/rider/profile"] });
      toast({ title: profile?.isAvailable ? "Ahora estás offline" : "Ahora estás online" });
    },
    onError: () => {
      toast({ title: "Error al cambiar estado", variant: "destructive" });
    },
  });

  const acceptOrderMutation = useMutation({
    mutationFn: async (orderId: string) => {
      const response = await apiRequest("POST", `/api/rider/orders/${orderId}/accept`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders/rider/available"] });
      queryClient.invalidateQueries({ queryKey: ["/api/rider/orders/assigned"] });
      toast({ title: "Pedido aceptado" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deliverOrderMutation = useMutation({
    mutationFn: async (orderId: string) => {
      const response = await apiRequest("POST", `/api/rider/orders/${orderId}/deliver`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/rider/orders/assigned"] });
      queryClient.invalidateQueries({ queryKey: ["/api/rider/earnings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/rider/profile"] });
      toast({ title: "Pedido entregado" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const inTransitOrders = (assignedOrders ?? []).filter((o) => o.status === "in_transit");
  const deliveredOrders = (assignedOrders ?? []).filter((o) => o.status === "delivered");

  // GPS tracking: send location every 10s when there are active deliveries
  const watchIdRef = useRef<number | null>(null);
  useEffect(() => {
    if (inTransitOrders.length === 0 || !navigator.geolocation) return;

    const sendLocation = (lat: number, lng: number) => {
      inTransitOrders.forEach((order) => {
        fetch(apiUrl(`/api/rider/orders/${order.id}/location`), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ lat, lng }),
        }).catch(() => {});
      });
    };

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => sendLocation(pos.coords.latitude, pos.coords.longitude),
      () => {},
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
    );

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, [inTransitOrders.length]);

  const totalEarnings = (earnings ?? []).reduce((sum, e) => sum + parseFloat(e.amount), 0);
  const pendingEarnings = (earnings ?? []).filter((e) => e.status === "pending").reduce((sum, e) => sum + parseFloat(e.amount), 0);

  if (profileLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Cargando...</div>
      </div>
    );
  }

  if (!profile || profile.status !== "active") {
    return (
      <div className="min-h-screen max-w-4xl mx-auto px-4 py-12">
        <Card>
          <CardContent className="py-12 text-center">
            <Navigation className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">
              {!profile ? "No sos repartidor" : "Tu cuenta no está activa"}
            </h2>
            <p className="text-muted-foreground mb-6">
              {!profile
                ? "Registrate como repartidor para empezar a hacer entregas."
                : profile.status === "pending"
                ? "Tu solicitud está siendo revisada. Te notificaremos pronto."
                : "Tu cuenta de repartidor fue desactivada. Contactá soporte."}
            </p>
            {!profile && (
              <Button onClick={() => window.location.href = "/repartidor"}>
                Registrarme como repartidor
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen max-w-7xl mx-auto px-4 py-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-rider-panel-title">
            Panel de Repartidor
          </h1>
          <p className="text-muted-foreground">
            Bienvenido, {user?.username}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center space-x-2">
            <Switch
              id="availability"
              checked={profile.isAvailable ?? false}
              onCheckedChange={(checked) => toggleAvailabilityMutation.mutate(checked)}
              disabled={toggleAvailabilityMutation.isPending}
              data-testid="switch-availability"
            />
            <Label htmlFor="availability" className="flex items-center gap-2">
              {profile.isAvailable ? (
                <>
                  <Power className="h-4 w-4 text-green-500" />
                  <span className="text-green-600 font-medium">Online</span>
                </>
              ) : (
                <>
                  <PowerOff className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Offline</span>
                </>
              )}
            </Label>
          </div>
          <Badge variant="secondary" className="capitalize">
            {profile.vehicleType}
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Disponibles</p>
                <p className="text-2xl font-bold" data-testid="text-available-count">
                  {(availableOrders ?? []).length}
                </p>
              </div>
              <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
                <Package className="h-5 w-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">En Camino</p>
                <p className="text-2xl font-bold" data-testid="text-in-transit-count">
                  {inTransitOrders.length}
                </p>
              </div>
              <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900/20 flex items-center justify-center">
                <Navigation className="h-5 w-5 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Entregados</p>
                <p className="text-2xl font-bold" data-testid="text-delivered-count">
                  {profile.totalDeliveries}
                </p>
              </div>
              <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Ganancias</p>
                <p className="text-2xl font-bold" data-testid="text-earnings">
                  ${totalEarnings.toLocaleString("es-AR")}
                </p>
              </div>
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="available" data-testid="tab-available">
            <Package className="h-4 w-4 mr-2" />
            Disponibles
          </TabsTrigger>
          <TabsTrigger value="assigned" data-testid="tab-assigned">
            <Navigation className="h-4 w-4 mr-2" />
            Mis Entregas
          </TabsTrigger>
          <TabsTrigger value="history" data-testid="tab-history">
            <Clock className="h-4 w-4 mr-2" />
            Historial
          </TabsTrigger>
          <TabsTrigger value="earnings" data-testid="tab-earnings">
            <DollarSign className="h-4 w-4 mr-2" />
            Ganancias
          </TabsTrigger>
        </TabsList>

        <TabsContent value="available" className="mt-6">
          {!profile.isAvailable ? (
            <Card>
              <CardContent className="py-12 text-center">
                <PowerOff className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Estás offline</h3>
                <p className="text-muted-foreground mb-4">
                  Activá tu disponibilidad para ver pedidos disponibles
                </p>
                <Button onClick={() => toggleAvailabilityMutation.mutate(true)}>
                  <Power className="h-4 w-4 mr-2" />
                  Ponerme Online
                </Button>
              </CardContent>
            </Card>
          ) : availableLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-4">
                    <Skeleton className="h-20 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (availableOrders ?? []).length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Sin pedidos disponibles</h3>
                <p className="text-muted-foreground">
                  Los nuevos pedidos aparecerán aquí cuando estén listos
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {(availableOrders ?? []).map((order) => (
                <Card key={order.id} data-testid={`card-available-order-${order.id}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="secondary">
                            {statusLabels[order.status]}
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            #{order.id.slice(0, 8)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-sm mb-1">
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                          <span>{order.address}</span>
                        </div>
                        <p className="font-semibold text-lg">
                          ${parseFloat(order.total).toLocaleString("es-AR")}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Ganancia estimada: ${(parseFloat(order.total) * 0.1).toLocaleString("es-AR")}
                        </p>
                      </div>
                      <Button
                        onClick={() => acceptOrderMutation.mutate(order.id)}
                        disabled={acceptOrderMutation.isPending}
                        data-testid={`button-accept-${order.id}`}
                      >
                        Aceptar
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="assigned" className="mt-6">
          {assignedLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 2 }).map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-4">
                    <Skeleton className="h-24 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : inTransitOrders.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Navigation className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Sin entregas activas</h3>
                <p className="text-muted-foreground">
                  Aceptá un pedido para comenzar
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {inTransitOrders.map((order) => (
                <Card key={order.id} data-testid={`card-assigned-order-${order.id}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4 mb-4">
                      <div>
                        <p className="font-semibold mb-1">
                          Pedido #{order.id.slice(0, 8)}
                        </p>
                        <Badge className="bg-purple-500 text-white">
                          En camino
                        </Badge>
                      </div>
                      <p className="font-bold text-lg">
                        ${parseFloat(order.total).toLocaleString("es-AR")}
                      </p>
                    </div>

                    <div className="space-y-2 mb-4">
                      <div className="flex items-center gap-2 text-sm">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span>{order.address}</span>
                      </div>
                      {order.notes && (
                        <p className="text-sm text-muted-foreground">
                          Nota: {order.notes}
                        </p>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <Button variant="outline" className="flex-1">
                        <Phone className="h-4 w-4 mr-2" />
                        Llamar
                      </Button>
                      <Button
                        className="flex-1"
                        onClick={() => deliverOrderMutation.mutate(order.id)}
                        disabled={deliverOrderMutation.isPending}
                        data-testid={`button-delivered-${order.id}`}
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Entregado
                      </Button>
                    </div>

                    {visibleMaps[order.id] && (
                      <div className="mt-4 animate-in fade-in slide-in-from-top-2 duration-300">
                        <OrderTrackingMap
                          storeLat={order.storeLat ? parseFloat(order.storeLat) : undefined}
                          storeLng={order.storeLng ? parseFloat(order.storeLng) : undefined}
                          deliveryLat={order.deliveryLat ? parseFloat(order.deliveryLat) : undefined}
                          deliveryLng={order.deliveryLng ? parseFloat(order.deliveryLng) : undefined}
                          status={order.status}
                          deliveryAddress={order.address ?? undefined}
                        />
                      </div>
                    )}
                    
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="w-full mt-2 text-xs text-muted-foreground"
                      onClick={() => toggleMap(order.id)}
                    >
                      {visibleMaps[order.id] ? "Ocultar Mapa" : "Ver Mapa de Entrega"}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="history" className="mt-6">
          {deliveredOrders.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Sin entregas</h3>
                <p className="text-muted-foreground">
                  Tu historial de entregas aparecerá aquí
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {deliveredOrders.map((order) => (
                <Card key={order.id} data-testid={`card-history-order-${order.id}`}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold">Pedido #{order.id.slice(0, 8)}</p>
                        <p className="text-sm text-muted-foreground">{order.address}</p>
                      </div>
                      <div className="text-right">
                        <Badge className="bg-green-600 text-white">Entregado</Badge>
                        <p className="font-bold mt-1">${parseFloat(order.total).toLocaleString("es-AR")}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="earnings" className="mt-6">
          <div className="grid md:grid-cols-2 gap-6 mb-6">
            <Card>
              <CardHeader>
                <CardTitle>Ganancias totales</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-primary">
                  ${totalEarnings.toLocaleString("es-AR")}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Pendiente de cobro</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">
                  ${pendingEarnings.toLocaleString("es-AR")}
                </p>
              </CardContent>
            </Card>
          </div>

          {(earnings ?? []).length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <DollarSign className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Sin ganancias</h3>
                <p className="text-muted-foreground">
                  Tus ganancias aparecerán aquí cuando completes entregas
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Historial de ganancias</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {(earnings ?? []).map((earning) => (
                    <div key={earning.id} className="flex items-center justify-between py-2 border-b last:border-0">
                      <div>
                        <p className="font-medium">Pedido #{earning.orderId.slice(0, 8)}</p>
                        <Badge variant={earning.status === "paid" ? "default" : "secondary"} className="text-xs">
                          {earning.status === "paid" ? "Pagado" : "Pendiente"}
                        </Badge>
                      </div>
                      <p className="font-bold">${parseFloat(earning.amount).toLocaleString("es-AR")}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
