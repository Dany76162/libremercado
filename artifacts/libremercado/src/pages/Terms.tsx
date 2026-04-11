import { ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Terms() {
  return (
    <div className="min-h-screen max-w-3xl mx-auto px-4 py-6">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/">
          <Button variant="ghost" size="icon" data-testid="button-back">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">Términos y Condiciones</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Términos de Uso de PachaPay</CardTitle>
        </CardHeader>
        <CardContent className="prose dark:prose-invert max-w-none">
          <p className="text-muted-foreground">
            Última actualización: Enero 2026
          </p>

          <h3>1. Aceptación de los Términos</h3>
          <p>
            Al acceder y utilizar la plataforma PachaPay, aceptás estos términos y condiciones en su totalidad. 
            Si no estás de acuerdo con alguna parte de estos términos, no podrás usar nuestros servicios.
          </p>

          <h3>2. Descripción del Servicio</h3>
          <p>
            PachaPay es una plataforma de comercio electrónico que conecta comerciantes locales con clientes, 
            facilitando la compra y venta de productos con servicio de delivery.
          </p>

          <h3>3. Registro de Cuenta</h3>
          <p>
            Para usar PachaPay debés crear una cuenta proporcionando información veraz y actualizada. 
            Sos responsable de mantener la confidencialidad de tu contraseña y de todas las actividades 
            que ocurran bajo tu cuenta.
          </p>

          <h3>4. Verificación de Identidad (KYC)</h3>
          <p>
            Para acceder a ciertas funciones de la plataforma, podemos requerir que verifiques tu identidad 
            proporcionando documentos oficiales. Esta información se utiliza exclusivamente para prevenir 
            fraudes y cumplir con regulaciones aplicables.
          </p>

          <h3>5. Uso Aceptable</h3>
          <p>
            Te comprometés a no usar la plataforma para actividades ilegales, fraudulentas o que violen 
            los derechos de terceros.
          </p>

          <h3>6. Pagos y Transacciones</h3>
          <p>
            Los pagos se procesan a través de proveedores de pago seguros. PachaPay no almacena 
            información de tarjetas de crédito. Las transacciones están sujetas a las políticas 
            del proveedor de pago.
          </p>

          <h3>7. Política de Devoluciones</h3>
          <p>
            Las políticas de devolución pueden variar según el comerciante. Consultá las políticas 
            específicas de cada tienda antes de realizar una compra.
          </p>

          <h3>8. Limitación de Responsabilidad</h3>
          <p>
            PachaPay actúa como intermediario entre comerciantes y clientes. No somos responsables 
            de la calidad, seguridad o legalidad de los productos ofrecidos por los comerciantes.
          </p>

          <h3>9. Modificaciones</h3>
          <p>
            Nos reservamos el derecho de modificar estos términos en cualquier momento. 
            Te notificaremos sobre cambios significativos a través de la plataforma.
          </p>

          <h3>10. Contacto</h3>
          <p>
            Para consultas sobre estos términos, podés contactarnos a través de la sección 
            de ayuda en la plataforma.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
