import { useRoute } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { OrderTrackingMap } from "@/components/maps/OrderTrackingMap";
import { ArrowLeft, Package, Store, Truck, CheckCircle, Clock, MapPin, Wifi, WifiOff } from "lucide-react";
import type { Order, Store as StoreType } from "@shared/schema";
import { useOrderTracking } from "@/hooks/use-order-tracking";
import { useEffect } from "react";

const statusConfig: Record<string, { label: string; color: string; icon: typeof Package }> = {
  pending: { label: "Pendiente", color: "bg-yellow-500", icon: Clock },
  confirmed: { label: "Confirmado", color: "bg-blue-500", icon: Package },
  preparing: { label: "Preparando", color: "bg-orange-500", icon: Store },
  ready: { label: "Listo para envío", color: "bg-purple-500", icon: Package },
  in_transit: { label: "En camino", color: "bg-blue-600", icon: Truck },
  delivered: { label: "Entregado", color: "bg-green-500", icon: CheckCircle },
  cancelled: { label: "Cancelado", color: "bg-red-500", icon: Package },
};

const STATUS_ORDER = ["pending", "confirmed", "preparing", "ready", "in_transit", "delivered"];

export default function OrderTracking() {
  const [, params] = useRoute("/order/:id/tracking");
  const orderId = params?.id;
  const queryClient = useQueryClient();

  const { data: order, isLoading: orderLoading } = useQuery<Order & { items?: any[] }>({
    queryKey: ["/api/orders", orderId],
    enabled: !!orderId,
  });

  const { data: store } = useQuery<StoreType>({
    queryKey: ["/api/stores", order?.storeId],
    enabled: !!order?.storeId,
  });

  const tracking = useOrderTracking(orderId);

  // Sync WebSocket status updates to the query cache
  useEffect(() => {
    if (tracking.status && order && tracking.status !== order.status) {
      queryClient.setQueryData(["/api/orders", orderId], (old: any) =>
        old ? { ...old, status: tracking.status } : old
      );
    }
  }, [tracking.status, order, orderId, queryClient]);

  if (orderLoading) {
    return (
      <div className="min-h-screen p-4 max-w-4xl mx-auto">
        <Skeleton className="h-8 w-48 mb-6" />
        <Skeleton className="h-[400px] w-full mb-6" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen p-4 max-w-4xl mx-auto">
        <Card>
          <CardContent className="p-8 text-center">
            <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-xl font-semibold mb-2">Pedido no encontrado</h2>
            <p className="text-muted-foreground mb-4">
              No pudimos encontrar el pedido que buscas.
            </p>
            <Link href="/">
              <Button>Volver al inicio</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentStatus = tracking.status || order.status;
  const status = statusConfig[currentStatus] || statusConfig.pending;
  const StatusIcon = status.icon;

  const storeLat = order.storeLat ? parseFloat(order.storeLat) : -34.6037;
  const storeLng = order.storeLng ? parseFloat(order.storeLng) : -58.3816;
  const deliveryLat = order.deliveryLat ? parseFloat(order.deliveryLat) : -34.6137;
  const deliveryLng = order.deliveryLng ? parseFloat(order.deliveryLng) : -58.3916;

  const riderLat = tracking.riderLat
    ?? (order.riderLat ? parseFloat(order.riderLat) : undefined);
  const riderLng = tracking.riderLng
    ?? (order.riderLng ? parseFloat(order.riderLng) : undefined);

  return (
    <div className="min-h-screen p-4 max-w-4xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/account">
          <Button variant="ghost" size="icon" data-testid="button-back-tracking">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold" data-testid="text-tracking-title">
            Seguimiento de Pedido
          </h1>
          <p className="text-muted-foreground text-sm">
            Pedido #{order.id.slice(0, 8).toUpperCase()}
          </p>
        </div>
        <div
          className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full ${
            tracking.connected
              ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
              : "bg-muted text-muted-foreground"
          }`}
          data-testid="badge-ws-status"
        >
          {tracking.connected ? (
            <><Wifi className="h-3 w-3" /> En vivo</>
          ) : (
            <><WifiOff className="h-3 w-3" /> Reconectando</>
          )}
        </div>
      </div>

      <div className="grid gap-6">
        {/* Status card */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <StatusIcon className="h-5 w-5" />
                Estado del Pedido
              </CardTitle>
              <Badge className={`${status.color} text-white`} data-testid="badge-order-status">
                {status.label}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 mb-4">
              <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className={`h-full ${status.color} transition-all duration-700`}
                  style={{
                    width:
                      currentStatus === "pending" ? "16%" :
                      currentStatus === "confirmed" ? "33%" :
                      currentStatus === "preparing" ? "50%" :
                      currentStatus === "ready" ? "66%" :
                      currentStatus === "in_transit" ? "83%" :
                      currentStatus === "delivered" ? "100%" : "0%",
                  }}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 md:grid-cols-6 gap-2 text-center text-xs">
              {STATUS_ORDER.map((s, i) => {
                const cfg = statusConfig[s];
                const isActive = STATUS_ORDER.indexOf(currentStatus) >= i;
                const isCurrent = currentStatus === s;
                return (
                  <div
                    key={s}
                    className={`flex flex-col items-center gap-1 ${
                      isActive ? "text-foreground" : "text-muted-foreground"
                    }`}
                  >
                    <div
                      className={`w-3 h-3 rounded-full transition-all ${
                        isCurrent ? `${cfg.color} ring-2 ring-offset-1 ring-current` :
                        isActive ? cfg.color : "bg-muted"
                      }`}
                    />
                    <span className="hidden md:block">{cfg.label}</span>
                  </div>
                );
              })}
            </div>

            {tracking.lastUpdate && (
              <p className="text-xs text-muted-foreground text-right mt-3">
                Última actualización: {tracking.lastUpdate.toLocaleTimeString("es-AR")}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Live map */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Ubicación en Tiempo Real
              {currentStatus === "in_transit" && riderLat && (
                <span className="text-xs font-normal text-green-600 animate-pulse ml-2">
                  Repartidor en camino
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <OrderTrackingMap
              storeLat={storeLat}
              storeLng={storeLng}
              deliveryLat={deliveryLat}
              deliveryLng={deliveryLng}
              riderLat={riderLat}
              riderLng={riderLng}
              storeName={store?.name}
              deliveryAddress={order.address ?? undefined}
              status={currentStatus}
            />
          </CardContent>
        </Card>

        {/* Order details */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Detalles del Pedido</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <Store className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="font-medium">{store?.name || "Tienda"}</p>
                  <p className="text-sm text-muted-foreground">{store?.category}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="font-medium">Dirección de entrega</p>
                  <p className="text-sm text-muted-foreground">{order.address}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Package className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="font-medium">Total</p>
                  <p className="text-lg font-bold text-primary">
                    ${parseFloat(order.total).toLocaleString("es-AR")}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
