import { useState } from "react";
import { Link } from "wouter";
import { ArrowLeft, Package, Clock, CheckCircle, Truck, XCircle, Star, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/use-auth";
import { useOrders } from "@/hooks/use-marketplace";
import { ReviewDialog } from "@/components/ReviewDialog";
import { DisputeDialog } from "@/components/DisputeDialog";

const statusConfig: Record<string, { label: string; icon: typeof Package; color: string }> = {
  pending: { label: "Pendiente", icon: Clock, color: "text-yellow-600" },
  confirmed: { label: "Confirmado", icon: CheckCircle, color: "text-blue-600" },
  preparing: { label: "Preparando", icon: Package, color: "text-orange-600" },
  ready: { label: "Listo", icon: Package, color: "text-green-600" },
  in_transit: { label: "En camino", icon: Truck, color: "text-purple-600" },
  delivered: { label: "Entregado", icon: CheckCircle, color: "text-green-600" },
  cancelled: { label: "Cancelado", icon: XCircle, color: "text-destructive" },
};

export default function Orders() {
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();
  const { data: orders, isLoading: ordersLoading } = useOrders();
  const [reviewOrderId, setReviewOrderId] = useState<string | null>(null);
  const [disputeOrderId, setDisputeOrderId] = useState<string | null>(null);

  if (authLoading || ordersLoading) {
    return (
      <div className="min-h-screen max-w-3xl mx-auto px-4 py-6">
        <Skeleton className="h-8 w-48 mb-6" />
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h1 className="text-xl font-bold mb-2">Inicia sesión</h1>
            <p className="text-muted-foreground mb-4">
              Necesitas iniciar sesión para ver tus pedidos
            </p>
            <Link href="/auth">
              <Button>Iniciar Sesión</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const userOrders = (orders ?? []).filter((o) => (o as any).customerId === user.id || (o as any).userId === user.id);

  return (
    <div className="min-h-screen max-w-3xl mx-auto px-4 py-6">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/account">
          <Button variant="ghost" size="icon" data-testid="button-back">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">Mis Pedidos</h1>
      </div>

      {userOrders.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-lg font-semibold mb-2">No tenés pedidos</h2>
            <p className="text-muted-foreground mb-4">
              Cuando hagas tu primer pedido, aparecerá aquí
            </p>
            <Link href="/explore">
              <Button>Explorar productos</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {userOrders.map((order) => {
            const config = statusConfig[order.status] || statusConfig.pending;
            const StatusIcon = config.icon;
            return (
              <Card key={order.id} data-testid={`order-${order.id}`}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold">Pedido #{order.id.slice(-6)}</p>
                      <p className="text-sm text-muted-foreground">{order.address}</p>
                    </div>
                    <div className="text-right">
                      <Badge variant="secondary" className="gap-1">
                        <StatusIcon className={`h-3 w-3 ${config.color}`} />
                        {config.label}
                      </Badge>
                      <p className="text-lg font-bold mt-1">
                        ${parseFloat(order.total).toLocaleString("es-AR")}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-3 flex-wrap">
                    {order.status === "in_transit" && (
                      <Link href={`/order/${order.id}/tracking`}>
                        <Button variant="outline" size="sm">
                          <Truck className="h-4 w-4 mr-2" />
                          Seguir pedido
                        </Button>
                      </Link>
                    )}
                    {order.status === "delivered" && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setReviewOrderId(order.id)}
                          data-testid={`button-review-${order.id}`}
                        >
                          <Star className="h-4 w-4 mr-2 text-yellow-500" />
                          Calificar
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setDisputeOrderId(order.id)}
                          className="text-destructive hover:text-destructive border-destructive/30 hover:bg-destructive/5"
                          data-testid={`button-dispute-${order.id}`}
                        >
                          <ShieldAlert className="h-4 w-4 mr-2" />
                          Problema
                        </Button>
                      </>
                    )}
                    {(order.status === "pending" || order.status === "confirmed" || order.status === "preparing" || order.status === "ready") && (
                      <Link href={`/order/${order.id}/tracking`}>
                        <Button variant="ghost" size="sm">
                          Ver estado
                        </Button>
                      </Link>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {reviewOrderId && (
        <ReviewDialog
          orderId={reviewOrderId}
          open={!!reviewOrderId}
          onOpenChange={(open) => { if (!open) setReviewOrderId(null); }}
        />
      )}

      {disputeOrderId && (
        <DisputeDialog
          orderId={disputeOrderId}
          open={!!disputeOrderId}
          onOpenChange={(open) => { if (!open) setDisputeOrderId(null); }}
        />
      )}
    </div>
  );
}
