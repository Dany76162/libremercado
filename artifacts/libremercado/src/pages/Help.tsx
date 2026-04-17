import { Link } from "wouter";
import { ChevronDown, MessageCircle, ShoppingBag, Truck, Star, Shield, CreditCard, Store, Phone, Mail, ArrowLeft, HelpCircle } from "lucide-react";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

const faqs = [
  {
    category: "Compras",
    icon: ShoppingBag,
    questions: [
      {
        q: "¿Cómo realizo una compra?",
        a: "Explorá los productos en el catálogo, hacé clic en 'Agregar al carrito' y luego completá tu pedido desde el carrito. Podés pagar con tarjeta de crédito/débito o efectivo.",
      },
      {
        q: "¿Puedo cancelar un pedido?",
        a: "Podés cancelar un pedido siempre que esté en estado 'Pendiente'. Una vez confirmado o en preparación, contactá directamente al comerciante.",
      },
      {
        q: "¿Cómo hago seguimiento de mi pedido?",
        a: "Desde 'Mis compras' podés ver el estado de cada pedido en tiempo real. También recibís notificaciones de cada cambio.",
      },
    ],
  },
  {
    category: "Envíos",
    icon: Truck,
    questions: [
      {
        q: "¿Cuánto tarda la entrega?",
        a: "El tiempo depende del comerciante y tu ubicación. En general, los pedidos locales se entregan en el día o al día siguiente.",
      },
      {
        q: "¿Puedo retirar en el local?",
        a: "Algunos comerciantes ofrecen retiro en el local. Revisá las opciones disponibles al finalizar la compra.",
      },
      {
        q: "¿Qué pasa si no estoy cuando llega el pedido?",
        a: "El repartidor intentará contactarte. Si no hay nadie, dejará una notificación y podrás coordinar una nueva entrega.",
      },
    ],
  },
  {
    category: "Pagos",
    icon: CreditCard,
    questions: [
      {
        q: "¿Qué métodos de pago aceptan?",
        a: "Aceptamos tarjeta de crédito/débito (Visa, Mastercard), transferencia bancaria y efectivo (en comercios seleccionados).",
      },
      {
        q: "¿Es seguro pagar en LibreMercado?",
        a: "Sí. Todos los pagos están encriptados y protegidos. Usamos Stripe para el procesamiento de tarjetas, uno de los sistemas más seguros del mundo.",
      },
      {
        q: "¿Puedo pedir factura?",
        a: "Sí, podés solicitar factura A o B al momento de la compra según corresponda.",
      },
    ],
  },
  {
    category: "Reseñas",
    icon: Star,
    questions: [
      {
        q: "¿Cómo dejo una reseña?",
        a: "Podés dejar tu opinión directamente en la página de la tienda. Buscá la sección 'Reseñas de clientes' y hacé clic en 'Escribir reseña'.",
      },
      {
        q: "¿Puedo editar o eliminar mi reseña?",
        a: "Por el momento las reseñas no pueden editarse una vez enviadas. Contactá soporte si hay un error.",
      },
    ],
  },
  {
    category: "Vendedores",
    icon: Store,
    questions: [
      {
        q: "¿Cómo me registro como vendedor?",
        a: "Hacé clic en 'Vender' en el menú, completá el formulario de alta con los datos de tu negocio y pasá por el proceso de verificación. Una vez aprobado tendrás acceso a tu panel de vendedor.",
      },
      {
        q: "¿Cuánto cobra LibreMercado?",
        a: "Tenemos planes desde gratuito (Starter) hasta Pro. El plan gratuito incluye hasta 10 productos. Consultá los detalles en la sección Vender.",
      },
      {
        q: "¿Cómo cargo mis productos?",
        a: "Desde tu panel de vendedor podés crear productos con fotos, precio, stock y descripción. También podés subir Reels para mostrarlos en ReelMark.",
      },
    ],
  },
  {
    category: "Seguridad",
    icon: Shield,
    questions: [
      {
        q: "¿Cómo están protegidos mis datos?",
        a: "Usamos encriptación de extremo a extremo y seguimos los estándares de la industria para proteger tus datos personales y financieros.",
      },
      {
        q: "¿Qué hago si recibo un producto dañado?",
        a: "Contactá al comerciante directamente. Si no hay solución, podés abrir una disputa desde tu pedido y nuestro equipo intervendrá.",
      },
    ],
  },
];

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border rounded-lg overflow-hidden">
      <button
        className="w-full flex items-center justify-between p-4 text-left hover:bg-muted/50 transition-colors"
        onClick={() => setOpen((v) => !v)}
      >
        <span className="font-medium text-sm pr-4">{q}</span>
        <ChevronDown className={`h-4 w-4 text-muted-foreground shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="px-4 pb-4 text-sm text-muted-foreground leading-relaxed border-t bg-muted/20">
          <p className="pt-3">{a}</p>
        </div>
      )}
    </div>
  );
}

export default function Help() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-8">
          <Link href="/">
            <button className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors">
              <ArrowLeft className="h-4 w-4" />
              Volver al inicio
            </button>
          </Link>
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-primary/10 rounded-full p-2">
              <HelpCircle className="h-6 w-6 text-primary" />
            </div>
            <h1 className="text-3xl font-bold">Centro de ayuda</h1>
          </div>
          <p className="text-muted-foreground">
            Encontrá respuestas a las preguntas más frecuentes sobre LibreMercado y PachaPay.
          </p>
        </div>

        <div className="grid sm:grid-cols-3 gap-4 mb-10">
          <Card className="text-center p-4 cursor-pointer hover:shadow-md transition-shadow">
            <div className="flex flex-col items-center gap-2">
              <div className="bg-primary/10 rounded-full p-3">
                <MessageCircle className="h-5 w-5 text-primary" />
              </div>
              <h3 className="font-semibold text-sm">Chat en vivo</h3>
              <p className="text-xs text-muted-foreground">Lun–Vie 9 a 18hs</p>
              <Badge variant="secondary" className="text-xs">Próximamente</Badge>
            </div>
          </Card>
          <a href="mailto:soporte@libremercado.com.ar" className="block">
            <Card className="text-center p-4 cursor-pointer hover:shadow-md transition-shadow h-full">
              <div className="flex flex-col items-center gap-2">
                <div className="bg-primary/10 rounded-full p-3">
                  <Mail className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-semibold text-sm">Email</h3>
                <p className="text-xs text-muted-foreground">soporte@libremercado.com.ar</p>
                <Badge variant="outline" className="text-xs">Respondemos en 24hs</Badge>
              </div>
            </Card>
          </a>
          <a href="https://wa.me/5491100000000" target="_blank" rel="noopener noreferrer" className="block">
            <Card className="text-center p-4 cursor-pointer hover:shadow-md transition-shadow h-full">
              <div className="flex flex-col items-center gap-2">
                <div className="bg-green-100 rounded-full p-3">
                  <Phone className="h-5 w-5 text-green-600" />
                </div>
                <h3 className="font-semibold text-sm">WhatsApp</h3>
                <p className="text-xs text-muted-foreground">+54 11 0000-0000</p>
                <Badge className="text-xs bg-green-500">Disponible</Badge>
              </div>
            </Card>
          </a>
        </div>

        <h2 className="text-xl font-bold mb-6">Preguntas frecuentes</h2>
        <div className="space-y-8">
          {faqs.map((section) => (
            <div key={section.category}>
              <div className="flex items-center gap-2 mb-3">
                <section.icon className="h-4 w-4 text-primary" />
                <h3 className="font-semibold text-base">{section.category}</h3>
              </div>
              <div className="space-y-2">
                {section.questions.map((item, i) => (
                  <FaqItem key={i} q={item.q} a={item.a} />
                ))}
              </div>
            </div>
          ))}
        </div>

        <Separator className="my-10" />

        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="pt-6 text-center">
            <HelpCircle className="h-8 w-8 text-primary mx-auto mb-3" />
            <h3 className="font-bold text-lg mb-2">¿No encontraste lo que buscabas?</h3>
            <p className="text-muted-foreground text-sm mb-4">
              Nuestro equipo de soporte está disponible para ayudarte personalmente.
            </p>
            <a href="mailto:soporte@libremercado.com.ar">
              <Button className="gap-2">
                <Mail className="h-4 w-4" />
                Contactar soporte
              </Button>
            </a>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
