import { Package } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useOrders } from "@/hooks/use-marketplace";

export function AdminOrdersTab() {
  const { data: orders, isLoading } = useOrders();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="h-5 w-5" />
          Todos los Pedidos
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-4">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
        ) : (orders ?? []).length === 0 ? (
          <p className="text-muted-foreground text-center py-8">No hay pedidos registrados</p>
        ) : (
          <div className="space-y-4">
            {(orders ?? []).slice(0, 20).map((order) => (
              <div key={order.id} className="flex items-center justify-between p-4 border rounded-md" data-testid={`row-order-${order.id}`}>
                <div>
                  <p className="font-semibold">Pedido #{order.id.slice(-8)}</p>
                  <p className="text-sm text-muted-foreground">Total: ${parseFloat(order.total || "0").toLocaleString()}</p>
                </div>
                <Badge variant={order.status === "delivered" ? "default" : "secondary"}>{order.status}</Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
