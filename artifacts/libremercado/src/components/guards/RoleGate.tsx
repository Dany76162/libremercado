import { useAuth } from "@/hooks/use-auth";
import type { UserRole } from "@shared/schema";
import { Loader2, ShieldX } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";

interface RoleGateProps {
  children: React.ReactNode;
  allowedRoles: UserRole[];
  fallback?: React.ReactNode;
}

export function RoleGate({ children, allowedRoles, fallback }: RoleGateProps) {
  const { user, isLoading, isAuthenticated } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      fallback ?? (
        <div className="flex items-center justify-center min-h-[400px] p-4">
          <Card className="max-w-md w-full">
            <CardContent className="pt-6 text-center">
              <ShieldX className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">
                Acceso Restringido
              </h2>
              <p className="text-muted-foreground mb-6">
                Debes iniciar sesión para acceder a esta sección.
              </p>
              <Link href="/account">
                <Button data-testid="button-login-redirect">
                  Iniciar Sesión
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      )
    );
  }

  if (!user || !allowedRoles.includes(user.role)) {
    return (
      fallback ?? (
        <div className="flex items-center justify-center min-h-[400px] p-4">
          <Card className="max-w-md w-full">
            <CardContent className="pt-6 text-center">
              <ShieldX className="h-12 w-12 text-destructive mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">
                Sin Permisos
              </h2>
              <p className="text-muted-foreground mb-6">
                No tienes los permisos necesarios para acceder a esta sección.
              </p>
              <Link href="/">
                <Button variant="secondary" data-testid="button-go-home">
                  Volver al Inicio
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      )
    );
  }

  return <>{children}</>;
}
