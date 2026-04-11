import { Link } from "wouter";
import { MapPin, Phone, Mail, Clock } from "lucide-react";
import { Logo } from "@/components/brand/Logo";

export function Footer() {
  return (
    <footer className="bg-card border-t mt-auto">
      <div className="mx-auto max-w-7xl px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          <div>
            <div className="mb-4" data-testid="text-footer-brand">
              <Logo size="lg" variant="primary" />
            </div>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Tu plataforma de comercio local. Conectamos comerciantes y clientes
              para ofrecer la mejor experiencia de compra con la fuerza de la Pachamama.
            </p>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Enlaces</h4>
            <nav className="flex flex-col gap-2">
              <Link href="/">
                <span className="text-sm text-muted-foreground hover:text-foreground transition-colors" data-testid="link-footer-home">
                  Inicio
                </span>
              </Link>
              <Link href="/explore">
                <span className="text-sm text-muted-foreground hover:text-foreground transition-colors" data-testid="link-footer-explore">
                  Explorar Tiendas
                </span>
              </Link>
              <Link href="/cart">
                <span className="text-sm text-muted-foreground hover:text-foreground transition-colors" data-testid="link-footer-cart">
                  Mi Carrito
                </span>
              </Link>
              <Link href="/account">
                <span className="text-sm text-muted-foreground hover:text-foreground transition-colors" data-testid="link-footer-account">
                  Mi Cuenta
                </span>
              </Link>
            </nav>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Para Comerciantes</h4>
            <nav className="flex flex-col gap-2">
              <Link href="/panel">
                <span className="text-sm text-muted-foreground hover:text-foreground transition-colors" data-testid="link-footer-panel">
                  Panel de Control
                </span>
              </Link>
              <span className="text-sm text-muted-foreground">
                Vender en PachaPay
              </span>
              <span className="text-sm text-muted-foreground">
                Términos de Servicio
              </span>
            </nav>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Contacto</h4>
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4 shrink-0" />
                <span>Tu Ciudad, País</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Phone className="h-4 w-4 shrink-0" />
                <span>+1 234 567 890</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Mail className="h-4 w-4 shrink-0" />
                <span>info@pachapay.com</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4 shrink-0" />
                <span>Lun - Dom: 8:00 - 22:00</span>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t mt-8 pt-8 text-center">
          <p className="text-sm text-muted-foreground" data-testid="text-copyright">
            © {new Date().getFullYear()} PachaPay. Todos los derechos reservados.
          </p>
        </div>
      </div>
    </footer>
  );
}
