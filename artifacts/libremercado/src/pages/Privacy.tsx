import { ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Privacy() {
  return (
    <div className="min-h-screen max-w-3xl mx-auto px-4 py-6">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/">
          <Button variant="ghost" size="icon" data-testid="button-back">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">Política de Privacidad</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Política de Privacidad de PachaPay</CardTitle>
        </CardHeader>
        <CardContent className="prose dark:prose-invert max-w-none">
          <p className="text-muted-foreground">
            Última actualización: Enero 2026
          </p>

          <h3>1. Información que Recopilamos</h3>
          <p>
            Recopilamos información que nos proporcionás directamente:
          </p>
          <ul>
            <li>Nombre de usuario y email al registrarte</li>
            <li>Dirección de envío para los pedidos</li>
            <li>Número de teléfono para contacto</li>
            <li>Documentos de identidad para verificación KYC</li>
          </ul>

          <h3>2. Uso de la Información</h3>
          <p>
            Utilizamos tu información para:
          </p>
          <ul>
            <li>Procesar y entregar tus pedidos</li>
            <li>Verificar tu identidad y prevenir fraudes</li>
            <li>Comunicarnos contigo sobre tu cuenta y pedidos</li>
            <li>Mejorar nuestros servicios</li>
          </ul>

          <h3>3. Verificación de Identidad (KYC)</h3>
          <p>
            Los documentos de identidad que subís son utilizados exclusivamente para verificar 
            tu identidad. Estos documentos son almacenados de forma segura y solo son accesibles 
            por personal autorizado para la revisión.
          </p>

          <h3>4. Compartir Información</h3>
          <p>
            Compartimos tu información solo cuando es necesario:
          </p>
          <ul>
            <li>Con comerciantes para procesar tus pedidos</li>
            <li>Con repartidores para realizar las entregas</li>
            <li>Con proveedores de pago para procesar transacciones</li>
            <li>Cuando la ley lo requiera</li>
          </ul>

          <h3>5. Seguridad de los Datos</h3>
          <p>
            Implementamos medidas de seguridad técnicas y organizativas para proteger tu 
            información personal contra acceso no autorizado, pérdida o alteración.
          </p>

          <h3>6. Tus Derechos</h3>
          <p>
            Tenés derecho a:
          </p>
          <ul>
            <li>Acceder a tu información personal</li>
            <li>Corregir datos inexactos</li>
            <li>Solicitar la eliminación de tu cuenta</li>
            <li>Retirar tu consentimiento en cualquier momento</li>
          </ul>

          <h3>7. Cookies</h3>
          <p>
            Utilizamos cookies para mantener tu sesión activa y mejorar tu experiencia 
            en la plataforma. Podés configurar tu navegador para rechazar cookies, 
            aunque esto podría afectar algunas funcionalidades.
          </p>

          <h3>8. Retención de Datos</h3>
          <p>
            Conservamos tu información mientras tu cuenta esté activa o según sea necesario 
            para cumplir con obligaciones legales.
          </p>

          <h3>9. Cambios a esta Política</h3>
          <p>
            Podemos actualizar esta política ocasionalmente. Te notificaremos sobre cambios 
            significativos a través de la plataforma o por email.
          </p>

          <h3>10. Contacto</h3>
          <p>
            Para consultas sobre privacidad o para ejercer tus derechos, contactanos 
            a través de la sección de ayuda en la plataforma.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
