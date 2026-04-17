import { Link, useLocation, Redirect } from "wouter";
import { User, Package, MapPin, CreditCard, Settings, LogOut, ChevronRight, Store, Shield, CheckCircle, AlertCircle, Clock, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/use-auth";
import { useOrders } from "@/hooks/use-marketplace";
import type { KycStatus } from "@shared/schema";

const menuItems = [
  { icon: Package, label: "Mis Pedidos", href: "/account/orders", badge: null },
  { icon: Heart, label: "Favoritos", href: "/account/favorites", badge: null },
  { icon: MapPin, label: "Direcciones", href: "/account/addresses", badge: null },
  { icon: CreditCard, label: "Métodos de Pago", href: "/account/payments", badge: null },
  { icon: Settings, label: "Configuración", href: "/account/settings", badge: null },
];


function getKycStatusInfo(status: KycStatus) {
  switch (status) {
    case "approved":
      return {
        icon: CheckCircle,
        label: "Verificado",
        description: "Tu identidad ha sido verificada",
        variant: "default" as const,
        color: "text-green-600",
      };
    case "pending":
      return {
        icon: Clock,
        label: "En revisión",
        description: "Tus documentos están siendo revisados",
        variant: "secondary" as const,
        color: "text-yellow-600",
      };
    case "rejected":
      return {
        icon: AlertCircle,
        label: "Rechazado",
        description: "Tu verificación fue rechazada. Por favor, sube nuevos documentos.",
        variant: "destructive" as const,
        color: "text-destructive",
      };
    default:
      return {
        icon: Shield,
        label: "Sin verificar",
        description: "Verifica tu identidad para acceder a todas las funciones",
        variant: "outline" as const,
        color: "text-muted-foreground",
      };
  }
}

export default function Account() {
  const [, setLocation] = useLocation();
  const { user, isLoading, isAuthenticated, logout } = useAuth();
  const { data: orders } = useOrders();

  const handleLogout = async () => {
    await logout();
    setLocation("/");
  };

  const pendingOrders = (orders ?? []).filter(
    (o) => o.status !== "delivered" && o.status !== "cancelled"
  ).length;

  if (isLoading) {
    return (
      <div className="min-h-screen max-w-3xl mx-auto px-4 py-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4 mb-6">
              <Skeleton className="h-16 w-16 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-6 w-40" />
                <Skeleton className="h-4 w-32" />
              </div>
            </div>
            <div className="space-y-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full" />
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
            <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mx-auto mb-6">
              <User className="h-10 w-10 text-muted-foreground" />
            </div>
            <h1 className="text-2xl font-bold mb-2" data-testid="text-login-required">
              Inicia sesión
            </h1>
            <p className="text-muted-foreground mb-6">
              Accede a tu cuenta para ver tus pedidos, direcciones y más
            </p>
            <Link href="/auth">
              <Button className="w-full mb-3" data-testid="button-login">
                Iniciar Sesión
              </Button>
            </Link>
            <Link href="/auth">
              <Button variant="outline" className="w-full" data-testid="button-register">
                Crear Cuenta
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (user.role === "admin") {
    return <Redirect to="/admin" />;
  }

  return (
    <div className="min-h-screen max-w-3xl mx-auto px-4 py-6">
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={user.avatar || undefined} alt={user.username} />
              <AvatarFallback className="text-xl">
                {user.username.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <h1
                className="text-xl font-bold truncate"
                data-testid="text-username"
              >
                {user.username}
              </h1>
              {user.email && (
                <p className="text-sm text-muted-foreground truncate">
                  {user.email}
                </p>
              )}
              <Badge variant="secondary" className="mt-1 capitalize">
                {user.role}
              </Badge>
            </div>
            <Button variant="outline" size="sm" data-testid="button-edit-profile">
              Editar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* KYC Verification Card */}
      <Card className="mb-6">
        <CardContent className="p-4">
          {(() => {
            const kycInfo = getKycStatusInfo((user.kycStatus as KycStatus) || "none");
            const KycIcon = kycInfo.icon;
            return (
              <Link href="/account/kyc">
                <div
                  className="flex items-center justify-between hover-elevate rounded-md p-2 -m-2 cursor-pointer"
                  data-testid="link-kyc-verification"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full bg-muted flex items-center justify-center`}>
                      <KycIcon className={`h-5 w-5 ${kycInfo.color}`} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold">Verificación de Identidad</p>
                        <Badge variant={kycInfo.variant}>{kycInfo.label}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {kycInfo.description}
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </div>
              </Link>
            );
          })()}
        </CardContent>
      </Card>

      {(user.role === "merchant" || user.role === "rider") && (
        <Card className="mb-6">
          <CardContent className="p-4">
            <Link href="/admin">
              <div
                className="flex items-center justify-between hover-elevate rounded-md p-2 -m-2 cursor-pointer"
                data-testid="link-panel"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Store className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold">Panel de Control</p>
                    <p className="text-sm text-muted-foreground">
                      {user.role === "merchant"
                        ? "Gestiona tu tienda"
                        : "Ver entregas disponibles"}
                    </p>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </div>
            </Link>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Mi Cuenta</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {menuItems.map((item, index) => (
            <div key={item.href}>
              <Link href={item.href}>
                <div
                  className="flex items-center justify-between px-6 py-4 hover:bg-muted/50 transition-colors cursor-pointer"
                  data-testid={`link-menu-${item.label.toLowerCase().replace(/\s/g, "-")}`}
                >
                  <div className="flex items-center gap-3">
                    <item.icon className="h-5 w-5 text-muted-foreground" />
                    <span>{item.label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {item.label === "Mis Pedidos" && pendingOrders > 0 && (
                      <Badge>{pendingOrders}</Badge>
                    )}
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  </div>
                </div>
              </Link>
              {index < menuItems.length - 1 && <Separator />}
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardContent className="p-0">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-6 py-4 text-destructive hover:bg-destructive/5 transition-colors"
            data-testid="button-logout"
          >
            <LogOut className="h-5 w-5" />
            <span>Cerrar Sesión</span>
          </button>
        </CardContent>
      </Card>
    </div>
  );
}
