import { DollarSign, Clock, Store, TrendingUp, Percent, BarChart3 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@tanstack/react-query";
import type { PlatformCommission } from "@shared/schema";

interface CommissionData {
  commissions: (PlatformCommission & { storeName: string; orderStatus: string })[];
  summary: {
    totalRevenue: number;
    totalMerchantPayments: number;
    pendingCount: number;
    pendingAmount: number;
    collectedCount: number;
    collectedAmount: number;
  };
}

export function AdminCommissionsTab() {
  const { data: commissionsData, isLoading } = useQuery<CommissionData>({
    queryKey: ["/api/admin/commissions"],
  });

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          {
            label: "Comisiones Recaudadas", color: "text-green-600",
            bg: "bg-green-100 dark:bg-green-900/20", icon: <DollarSign className="h-5 w-5 text-green-600" />,
            value: `$${(commissionsData?.summary.collectedAmount || 0).toLocaleString()}`,
            sub: `${commissionsData?.summary.collectedCount || 0} ordenes`,
            testId: "text-commissions-collected",
          },
          {
            label: "Comisiones Pendientes", color: "text-orange-600",
            bg: "bg-orange-100 dark:bg-orange-900/20", icon: <Clock className="h-5 w-5 text-orange-600" />,
            value: `$${(commissionsData?.summary.pendingAmount || 0).toLocaleString()}`,
            sub: `${commissionsData?.summary.pendingCount || 0} ordenes`,
            testId: "text-commissions-pending",
          },
          {
            label: "Pago a Comerciantes", color: "text-blue-600",
            bg: "bg-blue-100 dark:bg-blue-900/20", icon: <Store className="h-5 w-5 text-blue-600" />,
            value: `$${(commissionsData?.summary.totalMerchantPayments || 0).toLocaleString()}`,
            sub: "Total acumulado",
            testId: "text-merchant-payments",
          },
          {
            label: "Total Ingresos Plataforma", color: "text-primary",
            bg: "bg-primary/10", icon: <TrendingUp className="h-5 w-5 text-primary" />,
            value: `$${(commissionsData?.summary.totalRevenue || 0).toLocaleString()}`,
            sub: "Historico",
            testId: "text-total-platform-revenue",
          },
        ].map(({ label, color, bg, icon, value, sub, testId }) => (
          <Card key={label}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className={`text-2xl font-bold ${color}`} data-testid={testId}>
                    {isLoading ? "-" : value}
                  </p>
                  <p className="text-xs text-muted-foreground">{sub}</p>
                </div>
                <div className={`w-10 h-10 rounded-full ${bg} flex items-center justify-center`}>{icon}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Percent className="h-5 w-5" />
            Tasas de Comision
          </CardTitle>
          <CardDescription>Configura las comisiones por tipo de transaccion</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[
              { tier: "Starter (Gratis)", rate: "7%", desc: "Comerciantes sin suscripción paga", testId: "button-edit-commission-free" },
              { tier: "Básico", rate: "3%", desc: "Comerciantes con plan Básico ($25.000/mes)", testId: "button-edit-commission-basic" },
              { tier: "Pro", rate: "1%", desc: "Comerciantes con plan Pro ($50.000/mes)", testId: "button-edit-commission-premium" },
              { tier: "Repartidores", rate: "10%", desc: "Porcentaje del delivery que recibe el repartidor", testId: "button-edit-commission-rider" },
            ].map(({ tier, rate, desc, testId }) => (
              <div key={tier} className="flex items-center justify-between p-4 border rounded-md">
                <div>
                  <p className="font-medium">Comision por venta (Tier {tier})</p>
                  <p className="text-sm text-muted-foreground">{desc}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-lg px-3">{rate}</Badge>
                  <Button variant="outline" size="sm" data-testid={testId}>Editar</Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Historial de Comisiones por Orden
          </CardTitle>
          <CardDescription>Registro detallado de comisiones por cada venta completada</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2"><Skeleton className="h-12 w-full" /><Skeleton className="h-12 w-full" /><Skeleton className="h-12 w-full" /></div>
          ) : (commissionsData?.commissions ?? []).length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No hay comisiones registradas aun</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-3">Tienda</th>
                    <th className="text-right py-2 px-3">Venta Total</th>
                    <th className="text-right py-2 px-3">Comision %</th>
                    <th className="text-right py-2 px-3">Plataforma</th>
                    <th className="text-right py-2 px-3">Comerciante</th>
                    <th className="text-center py-2 px-3">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {(commissionsData?.commissions ?? []).slice(0, 10).map((comm) => (
                    <tr key={comm.id} className="border-b" data-testid={`commission-row-${comm.id}`}>
                      <td className="py-2 px-3 font-medium" data-testid={`text-store-${comm.id}`}>{comm.storeName}</td>
                      <td className="py-2 px-3 text-right" data-testid={`text-total-${comm.id}`}>${parseFloat(comm.orderTotal as string).toLocaleString()}</td>
                      <td className="py-2 px-3 text-right" data-testid={`text-percent-${comm.id}`}>{comm.commissionPercent}%</td>
                      <td className="py-2 px-3 text-right text-green-600 dark:text-green-400 font-medium" data-testid={`text-platform-${comm.id}`}>${parseFloat(comm.commissionAmount as string).toLocaleString()}</td>
                      <td className="py-2 px-3 text-right text-blue-600 dark:text-blue-400" data-testid={`text-merchant-${comm.id}`}>${parseFloat(comm.merchantAmount as string).toLocaleString()}</td>
                      <td className="py-2 px-3 text-center">
                        <Badge variant={comm.status === "collected" ? "default" : "secondary"} data-testid={`badge-status-${comm.id}`}>
                          {comm.status === "collected" ? "Cobrada" : comm.status === "pending" ? "Pendiente" : "Pagada"}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
