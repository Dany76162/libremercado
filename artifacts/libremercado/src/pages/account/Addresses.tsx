import { Link } from "wouter";
import { ArrowLeft, MapPin, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";

export default function Addresses() {
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h1 className="text-xl font-bold mb-2">Inicia sesión</h1>
            <p className="text-muted-foreground mb-4">
              Necesitas iniciar sesión para gestionar tus direcciones
            </p>
            <Link href="/auth">
              <Button>Iniciar Sesión</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen max-w-3xl mx-auto px-4 py-6">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/account">
          <Button variant="ghost" size="icon" data-testid="button-back">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">Mis Direcciones</h1>
      </div>

      <Card className="mb-4">
        <CardContent className="p-4">
          {user.address ? (
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <MapPin className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <p className="font-semibold">Dirección principal</p>
                <p className="text-muted-foreground">{user.address}</p>
              </div>
            </div>
          ) : (
            <div className="text-center py-4">
              <MapPin className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-muted-foreground">No tenés direcciones guardadas</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Button className="w-full gap-2" data-testid="button-add-address">
        <Plus className="h-4 w-4" />
        Agregar nueva dirección
      </Button>
    </div>
  );
}
