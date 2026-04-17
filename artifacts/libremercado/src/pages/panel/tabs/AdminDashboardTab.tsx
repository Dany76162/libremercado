import { 
  Users, Store, Package, Megaphone, BarChart3, Settings, Shield,
  CheckCircle, Bike, Building2, DollarSign, TrendingUp, Activity, 
  AlertCircle, ShoppingCart, Sparkles
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

interface PlatformStats {
  users: { total: number; byRole: { customer: number; merchant: number; rider: number; admin: number } };
  stores: { total: number; active: number };
  products: { total: number; featured: number };
  orders: { total: number; byStatus: { pending: number; confirmed: number; preparing: number; ready: number; in_transit: number; delivered: number; cancelled: number }; totalRevenue: string };
  pending: { merchants: number; riders: number; kyc: number };
  riders: { total: number; active: number };
}

interface AdminAiUsage {
  currentUser: { email: string; username: string; aiGenerationsUsed: number; subscriptionTier: string } | null;
  freeLimit: number;
  remainingFreeGenerations: number | null;
  isUnlimited: boolean;
}

interface Props {
  stats: PlatformStats | undefined;
  statsLoading: boolean;
  aiUsage: AdminAiUsage | undefined;
  totalPending: number;
  totalPendingMerchants: number;
  totalPendingRiders: number;
  totalPendingKyc: number;
  bannersCount: number;
  noticesCount: number;
  onNavigate: (tab: string) => void;
}

export function AdminDashboardTab({
  stats,
  statsLoading,
  aiUsage,
  totalPending,
  totalPendingMerchants,
  totalPendingRiders,
  totalPendingKyc,
  bannersCount,
  noticesCount,
  onNavigate,
}: Props) {
  return (
    <div className="space-y-6">
      {/* AI Usage */}
      <Card className="border-blue-200 dark:border-blue-800">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-blue-500" />
            Uso de IA
          </CardTitle>
          <CardDescription>
            El plan gratuito incluye 1 creacion gratis. Los planes pagos tienen generaciones ilimitadas.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">Plan actual</p>
            <p className="font-semibold capitalize" data-testid="text-ai-plan">
              {aiUsage?.currentUser?.subscriptionTier || "free"}
            </p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">Usos realizados</p>
            <p className="font-semibold" data-testid="text-ai-used">
              {aiUsage?.currentUser?.aiGenerationsUsed ?? 0}
            </p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">Restantes gratis</p>
            <p className="font-semibold" data-testid="text-ai-remaining">
              {aiUsage?.isUnlimited ? "Ilimitado" : (aiUsage?.remainingFreeGenerations ?? 1)}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Usuarios</p>
                <p className="text-2xl font-bold" data-testid="text-total-users">
                  {statsLoading ? "-" : stats?.users.total}
                </p>
              </div>
              <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Tiendas</p>
                <p className="text-2xl font-bold" data-testid="text-total-stores">
                  {statsLoading ? "-" : stats?.stores.total}
                </p>
              </div>
              <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
                <Store className="h-5 w-5 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Productos</p>
                <p className="text-2xl font-bold" data-testid="text-total-products">
                  {statsLoading ? "-" : stats?.products.total}
                </p>
              </div>
              <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900/20 flex items-center justify-center">
                <Package className="h-5 w-5 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Pedidos</p>
                <p className="text-2xl font-bold" data-testid="text-total-orders">
                  {statsLoading ? "-" : stats?.orders.total}
                </p>
              </div>
              <div className="w-10 h-10 rounded-full bg-orange-100 dark:bg-orange-900/20 flex items-center justify-center">
                <ShoppingCart className="h-5 w-5 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Repartidores</p>
                <p className="text-2xl font-bold" data-testid="text-total-riders">
                  {statsLoading ? "-" : stats?.riders.total}
                </p>
              </div>
              <div className="w-10 h-10 rounded-full bg-teal-100 dark:bg-teal-900/20 flex items-center justify-center">
                <Bike className="h-5 w-5 text-teal-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Ingresos</p>
                <p className="text-2xl font-bold" data-testid="text-total-revenue">
                  ${statsLoading ? "-" : parseFloat(stats?.orders.totalRevenue || "0").toLocaleString()}
                </p>
              </div>
              <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/20 flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pending Actions */}
      {totalPending > 0 && (
        <Card className="border-orange-200 dark:border-orange-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-orange-500" />
              Acciones Pendientes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {totalPendingMerchants > 0 && (
                <Card className="cursor-pointer hover-elevate" onClick={() => onNavigate("merchants")} data-testid="card-pending-merchants">
                  <CardContent className="p-4 flex items-center gap-3">
                    <Building2 className="h-5 w-5 text-blue-500" />
                    <div>
                      <p className="font-medium">{totalPendingMerchants} Comerciante{totalPendingMerchants > 1 ? "s" : ""}</p>
                      <p className="text-xs text-muted-foreground">Esperando aprobacion</p>
                    </div>
                  </CardContent>
                </Card>
              )}
              {totalPendingRiders > 0 && (
                <Card className="cursor-pointer hover-elevate" onClick={() => onNavigate("riders")} data-testid="card-pending-riders">
                  <CardContent className="p-4 flex items-center gap-3">
                    <Bike className="h-5 w-5 text-green-500" />
                    <div>
                      <p className="font-medium">{totalPendingRiders} Repartidor{totalPendingRiders > 1 ? "es" : ""}</p>
                      <p className="text-xs text-muted-foreground">Esperando aprobacion</p>
                    </div>
                  </CardContent>
                </Card>
              )}
              {totalPendingKyc > 0 && (
                <Card className="cursor-pointer hover-elevate" onClick={() => onNavigate("kyc")} data-testid="card-pending-kyc">
                  <CardContent className="p-4 flex items-center gap-3">
                    <Shield className="h-5 w-5 text-purple-500" />
                    <div>
                      <p className="font-medium">{totalPendingKyc} Documento{totalPendingKyc > 1 ? "s" : ""}</p>
                      <p className="text-xs text-muted-foreground">KYC pendiente</p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Dashboard Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Users by Role */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Usuarios por Rol
            </CardTitle>
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <div className="space-y-3">{[1,2,3,4].map(i => <Skeleton key={i} className="h-10 w-full" />)}</div>
            ) : (
              <div className="space-y-3">
                {[
                  { label: "Clientes", icon: <Users className="h-4 w-4 text-blue-500" />, count: stats?.users.byRole.customer },
                  { label: "Comerciantes", icon: <Building2 className="h-4 w-4 text-green-500" />, count: stats?.users.byRole.merchant },
                  { label: "Repartidores", icon: <Bike className="h-4 w-4 text-orange-500" />, count: stats?.users.byRole.rider },
                  { label: "Administradores", icon: <Shield className="h-4 w-4 text-purple-500" />, count: stats?.users.byRole.admin },
                ].map(({ label, icon, count }) => (
                  <div key={label} className="flex items-center justify-between p-3 rounded-md bg-muted/50">
                    <div className="flex items-center gap-2">{icon}<span>{label}</span></div>
                    <Badge variant="secondary">{count || 0}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Orders by Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Estado de Pedidos
            </CardTitle>
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <div className="space-y-3">{[1,2,3,4].map(i => <Skeleton key={i} className="h-10 w-full" />)}</div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: "Pendientes", key: "pending", color: "bg-yellow-50 dark:bg-yellow-900/20" },
                  { label: "Confirmados", key: "confirmed", color: "bg-blue-50 dark:bg-blue-900/20" },
                  { label: "Preparando", key: "preparing", color: "bg-purple-50 dark:bg-purple-900/20" },
                  { label: "Listos", key: "ready", color: "bg-orange-50 dark:bg-orange-900/20" },
                  { label: "En camino", key: "in_transit", color: "bg-teal-50 dark:bg-teal-900/20" },
                  { label: "Entregados", key: "delivered", color: "bg-green-50 dark:bg-green-900/20" },
                ].map(({ label, key, color }) => (
                  <div key={key} className={`flex items-center justify-between p-2 rounded-md ${color}`}>
                    <span className="text-sm">{label}</span>
                    <Badge variant="outline">{stats?.orders.byStatus[key as keyof typeof stats.orders.byStatus] || 0}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Platform Stats */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Estadisticas de la Plataforma
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between"><span className="text-muted-foreground">Tiendas activas</span><span className="font-medium">{stats?.stores.active || 0} / {stats?.stores.total || 0}</span></div>
              <div className="flex items-center justify-between"><span className="text-muted-foreground">Productos destacados</span><span className="font-medium">{stats?.products.featured || 0}</span></div>
              <div className="flex items-center justify-between"><span className="text-muted-foreground">Repartidores activos</span><span className="font-medium">{stats?.riders.active || 0}</span></div>
              <div className="flex items-center justify-between"><span className="text-muted-foreground">Publicidades activas</span><span className="font-medium">{bannersCount + noticesCount}</span></div>
              <div className="flex items-center justify-between"><span className="text-muted-foreground">Pedidos cancelados</span><span className="font-medium">{stats?.orders.byStatus.cancelled || 0}</span></div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Acciones Rapidas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              <Button variant="outline" onClick={() => onNavigate("stores")} data-testid="button-quick-stores"><Store className="h-4 w-4 mr-2" />Ver Tiendas</Button>
              <Button variant="outline" onClick={() => onNavigate("orders")} data-testid="button-quick-orders"><Package className="h-4 w-4 mr-2" />Ver Pedidos</Button>
              <Button variant="outline" onClick={() => onNavigate("users")} data-testid="button-quick-users"><Users className="h-4 w-4 mr-2" />Ver Usuarios</Button>
              <Button variant="outline" onClick={() => onNavigate("promos")} data-testid="button-quick-promos"><Megaphone className="h-4 w-4 mr-2" />Ver Promos</Button>
              <Button variant="outline" onClick={() => onNavigate("commissions")} data-testid="button-quick-commissions"><BarChart3 className="h-4 w-4 mr-2" />Comisiones</Button>
              <Button variant="outline" onClick={() => onNavigate("kyc")} data-testid="button-quick-kyc"><Activity className="h-4 w-4 mr-2" />KYC</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
