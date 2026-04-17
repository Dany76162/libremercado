import { Link } from "wouter";
import { ArrowLeft, Settings as SettingsIcon, Bell, Shield, Moon, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/hooks/use-auth";

export default function Settings() {
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <SettingsIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h1 className="text-xl font-bold mb-2">Inicia sesión</h1>
            <p className="text-muted-foreground mb-4">
              Necesitas iniciar sesión para acceder a la configuración
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
        <h1 className="text-2xl font-bold">Configuración</h1>
      </div>

      <Card className="mb-4">
        <CardHeader>
          <CardTitle className="text-lg">Notificaciones</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Bell className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="font-medium">Notificaciones push</p>
                <p className="text-sm text-muted-foreground">Recibí alertas de tus pedidos</p>
              </div>
            </div>
            <Switch data-testid="switch-notifications" />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Bell className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="font-medium">Promociones</p>
                <p className="text-sm text-muted-foreground">Ofertas y descuentos exclusivos</p>
              </div>
            </div>
            <Switch data-testid="switch-promos" />
          </div>
        </CardContent>
      </Card>

      <Card className="mb-4">
        <CardHeader>
          <CardTitle className="text-lg">Apariencia</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Moon className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="font-medium">Modo oscuro</p>
                <p className="text-sm text-muted-foreground">Cambia la apariencia de la app</p>
              </div>
            </div>
            <Switch data-testid="switch-dark-mode" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Privacidad</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Link href="/terms">
            <div className="flex items-center gap-3 hover:bg-muted/50 -mx-2 px-2 py-2 rounded-md cursor-pointer">
              <Shield className="h-5 w-5 text-muted-foreground" />
              <p className="font-medium">Términos y Condiciones</p>
            </div>
          </Link>
          <Separator />
          <Link href="/privacy">
            <div className="flex items-center gap-3 hover:bg-muted/50 -mx-2 px-2 py-2 rounded-md cursor-pointer">
              <Shield className="h-5 w-5 text-muted-foreground" />
              <p className="font-medium">Política de Privacidad</p>
            </div>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
