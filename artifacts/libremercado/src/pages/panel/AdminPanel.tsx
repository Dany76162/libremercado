import { useState } from "react";
import {
  Users, Store, Package, Megaphone, Settings, Shield,
  Bike, Building2, Activity, AlertCircle, Headphones, Percent, Truck, Plane, BarChart3, ShieldAlert, Play, LayoutGrid, BadgeCheck
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import { usePromoBanners, usePromoNotices } from "@/hooks/use-marketplace";

import { AdminDashboardTab } from "./tabs/AdminDashboardTab";
import { AdminMerchantsTab } from "./tabs/AdminMerchantsTab";
import { AdminRidersTab } from "./tabs/AdminRidersTab";
import { AdminKycTab } from "./tabs/AdminKycTab";
import { AdminStoresTab } from "./tabs/AdminStoresTab";
import { AdminOrdersTab } from "./tabs/AdminOrdersTab";
import { AdminUsersTab } from "./tabs/AdminUsersTab";
import { AdminPromosTab } from "./tabs/AdminPromosTab";
import { AdminCommissionsTab } from "./tabs/AdminCommissionsTab";
import { AdminSupportTab } from "./tabs/AdminSupportTab";
import { AdminSettingsTab } from "./tabs/AdminSettingsTab";
import { AdminCampaignsTab } from "./tabs/AdminCampaignsTab";
import AdminDisputesTab from "./tabs/AdminDisputesTab";
import { AdminVideosTab } from "./tabs/AdminVideosTab";
import { AdminHomeSettingsTab } from "./tabs/AdminHomeSettingsTab";
import { AdminNovedadesTab } from "./tabs/AdminNovedadesTab";
import { AdminHealthTab } from "./tabs/AdminHealthTab";

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

export default function AdminPanel() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("dashboard");

  const { data: stats, isLoading: statsLoading } = useQuery<PlatformStats>({ queryKey: ["/api/admin/stats"] });
  const { data: aiUsage } = useQuery<AdminAiUsage>({ queryKey: ["/api/admin/ai-usage"] });
  const { data: banners } = usePromoBanners();
  const { data: notices } = usePromoNotices();

  const totalPendingMerchants = stats?.pending.merchants ?? 0;
  const totalPendingRiders = stats?.pending.riders ?? 0;
  const totalPendingKyc = stats?.pending.kyc ?? 0;
  const totalPending = totalPendingMerchants + totalPendingRiders + totalPendingKyc;

  return (
    <div className="min-h-screen max-w-7xl mx-auto px-4 py-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2" data-testid="text-admin-panel-title">
            <Shield className="h-7 w-7 text-primary" />
            Centro de Control PachaPay
          </h1>
          <p className="text-muted-foreground">
            Panel de gestion principal - Bienvenido, {user?.username}
          </p>
        </div>
        {totalPending > 0 && (
          <Badge variant="destructive" className="text-sm px-3 py-1">
            <AlertCircle className="h-4 w-4 mr-1" />
            {totalPending} pendiente{totalPending > 1 ? "s" : ""}
          </Badge>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex-wrap mb-6">
          <TabsTrigger value="dashboard" data-testid="tab-dashboard">
            <Activity className="h-4 w-4 mr-2" />Dashboard
          </TabsTrigger>
          <TabsTrigger value="merchants" data-testid="tab-merchants">
            <Building2 className="h-4 w-4 mr-2" />Comerciantes
            {totalPendingMerchants > 0 && <Badge variant="destructive" className="ml-2">{totalPendingMerchants}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="riders" data-testid="tab-riders">
            <Bike className="h-4 w-4 mr-2" />Repartidores
            {totalPendingRiders > 0 && <Badge variant="destructive" className="ml-2">{totalPendingRiders}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="kyc" data-testid="tab-kyc">
            <Shield className="h-4 w-4 mr-2" />KYC
            {totalPendingKyc > 0 && <Badge variant="destructive" className="ml-2">{totalPendingKyc}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="stores" data-testid="tab-stores">
            <Store className="h-4 w-4 mr-2" />Tiendas
          </TabsTrigger>
          <TabsTrigger value="orders" data-testid="tab-orders">
            <Package className="h-4 w-4 mr-2" />Pedidos
          </TabsTrigger>
          <TabsTrigger value="users" data-testid="tab-users">
            <Users className="h-4 w-4 mr-2" />Usuarios
          </TabsTrigger>
          <TabsTrigger value="promos" data-testid="tab-promos">
            <Megaphone className="h-4 w-4 mr-2" />Publicidad
          </TabsTrigger>
          <TabsTrigger value="campaigns" data-testid="tab-campaigns">
            <BarChart3 className="h-4 w-4 mr-2" />Campañas
          </TabsTrigger>
          <TabsTrigger value="commissions" data-testid="tab-commissions">
            <Percent className="h-4 w-4 mr-2" />Comisiones
          </TabsTrigger>
          <TabsTrigger value="disputes" data-testid="tab-disputes">
            <ShieldAlert className="h-4 w-4 mr-2" />Disputas
          </TabsTrigger>
          <TabsTrigger value="support" data-testid="tab-support">
            <Headphones className="h-4 w-4 mr-2" />Soporte
          </TabsTrigger>
          <TabsTrigger value="transport" data-testid="tab-transport">
            <Truck className="h-4 w-4 mr-2" />Transporte
          </TabsTrigger>
          <TabsTrigger value="flights" data-testid="tab-flights">
            <Plane className="h-4 w-4 mr-2" />Vuelos
          </TabsTrigger>
          <TabsTrigger value="videos" data-testid="tab-videos">
            <Play className="h-4 w-4 mr-2" />Reelmark
          </TabsTrigger>
          <TabsTrigger value="novedades" data-testid="tab-novedades">
            <BadgeCheck className="h-4 w-4 mr-2" />Novedades
          </TabsTrigger>
          <TabsTrigger value="home-settings" data-testid="tab-home-settings">
            <LayoutGrid className="h-4 w-4 mr-2" />Inicio
          </TabsTrigger>
          <TabsTrigger value="health" data-testid="tab-health">
            <Activity className="h-4 w-4 mr-2" />Salud del Sistema
          </TabsTrigger>
          <TabsTrigger value="settings" data-testid="tab-settings">
            <Settings className="h-4 w-4 mr-2" />Configuracion
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="mt-0">
          <AdminDashboardTab
            stats={stats}
            statsLoading={statsLoading}
            aiUsage={aiUsage}
            totalPending={totalPending}
            totalPendingMerchants={totalPendingMerchants}
            totalPendingRiders={totalPendingRiders}
            totalPendingKyc={totalPendingKyc}
            bannersCount={(banners ?? []).length}
            noticesCount={(notices ?? []).length}
            onNavigate={setActiveTab}
          />
        </TabsContent>

        <TabsContent value="merchants" className="mt-0">
          <AdminMerchantsTab />
        </TabsContent>

        <TabsContent value="riders" className="mt-0">
          <AdminRidersTab />
        </TabsContent>

        <TabsContent value="kyc" className="mt-0">
          <AdminKycTab />
        </TabsContent>

        <TabsContent value="stores" className="mt-0">
          <AdminStoresTab />
        </TabsContent>

        <TabsContent value="orders" className="mt-0">
          <AdminOrdersTab />
        </TabsContent>

        <TabsContent value="users" className="mt-0">
          <AdminUsersTab />
        </TabsContent>

        <TabsContent value="promos" className="mt-0">
          <AdminPromosTab />
        </TabsContent>

        <TabsContent value="campaigns" className="mt-0">
          <AdminCampaignsTab />
        </TabsContent>

        <TabsContent value="commissions" className="mt-0">
          <AdminCommissionsTab />
        </TabsContent>

        <TabsContent value="disputes" className="mt-0">
          <AdminDisputesTab />
        </TabsContent>

        <TabsContent value="support" className="mt-0">
          <AdminSupportTab />
        </TabsContent>

        <TabsContent value="transport" className="mt-0">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Truck className="h-5 w-5" />
                Modulo de Transporte
              </CardTitle>
              <CardDescription>
                Gestion de empresas y rutas de transporte terrestre. Disponible en una proxima version.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-16">
                <Truck className="h-20 w-20 text-muted-foreground mx-auto mb-4 opacity-40" />
                <h3 className="text-xl font-semibold mb-2">Proximo Lanzamiento</h3>
                <p className="text-muted-foreground max-w-sm mx-auto">
                  El modulo de transporte permitira gestionar empresas, rutas, viajes y reservas de pasajes en una plataforma unificada.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="flights" className="mt-0">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plane className="h-5 w-5" />
                Modulo de Vuelos
              </CardTitle>
              <CardDescription>
                Busqueda y reserva de vuelos. Disponible en una proxima version.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-16">
                <Plane className="h-20 w-20 text-muted-foreground mx-auto mb-4 opacity-40" />
                <h3 className="text-xl font-semibold mb-2">Proximo Lanzamiento</h3>
                <p className="text-muted-foreground max-w-sm mx-auto">
                  El modulo de vuelos integrara aerolineas, busqueda de asientos, reservas y emision de e-tickets directamente en la plataforma.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="videos" className="mt-0">
          <AdminVideosTab />
        </TabsContent>

        <TabsContent value="novedades" className="mt-0">
          <AdminNovedadesTab />
        </TabsContent>

        <TabsContent value="home-settings" className="mt-0">
          <AdminHomeSettingsTab />
        </TabsContent>

        <TabsContent value="health" className="mt-0">
          <AdminHealthTab />
        </TabsContent>

        <TabsContent value="settings" className="mt-0">
          <AdminSettingsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
