import { Link } from "wouter";
import { ArrowLeft, CreditCard, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";

export default function Payments() {
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <CreditCard className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h1 className="text-xl font-bold mb-2">Inicia sesión</h1>
            <p className="text-muted-foreground mb-4">
              Necesitas iniciar sesión para gestionar tus métodos de pago
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
        <h1 className="text-2xl font-bold">Métodos de Pago</h1>
      </div>

      <Card className="mb-4">
        <CardContent className="py-8 text-center">
          <CreditCard className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-lg font-semibold mb-2">Pago seguro con Stripe</p>
          <p className="text-muted-foreground">
            Ingresá tu tarjeta al momento de pagar. No guardamos tus datos de pago.
          </p>
        </CardContent>
      </Card>

      <Button className="w-full gap-2" variant="outline" data-testid="button-add-payment">
        <Plus className="h-4 w-4" />
        Agregar método de pago
      </Button>
    </div>
  );
}
