import { Link } from "wouter";
import { MapPin, Phone, Mail, Clock, Loader2, Facebook, Instagram, Twitter, Youtube, Send, MessageCircle } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { useQuery } from "@tanstack/react-query";

// Datos por defecto (mismos que en el Admin)
const DEFAULT_FOOTER = {
  description: "Tu plataforma de comercio local. Conectamos comerciantes y clientes para ofrecer la mejor experiencia de compra con la fuerza de la Pachamama.",
  email: "info@pachapay.com",
  phone: "+1 234 567 890",
  address: "Tu Ciudad, País",
  hours: "Lun - Dom: 8:00 - 22:00",
  copyright: "PachaPay. Todos los derechos reservados."
};
const PAYMENT_METHODS_ICONS: Record<string, string> = {
  visa: "https://upload.wikimedia.org/wikipedia/commons/5/5e/Visa_Inc._logo.svg",
  mastercard: "https://upload.wikimedia.org/wikipedia/commons/2/2a/Mastercard-logo.svg",
  mercadopago: "https://logodownload.org/wp-content/uploads/2019/06/mercado-pago-logo-0.png",
  amex: "https://upload.wikimedia.org/wikipedia/commons/f/fa/American_Express_logo_%282018%29.svg",
  pachapay_visa: "https://cdn-icons-png.flaticon.com/512/349/349221.png",
  cash: "https://cdn-icons-png.flaticon.com/512/2331/2331717.png"
};


export function Footer() {
  // Cargar configuraciones
  const { data: footerConfig } = useQuery<typeof DEFAULT_FOOTER>({
    queryKey: ["/api/config/footer_config"],
  });
  

  const { data: activePayments } = useQuery<string[]>({
    queryKey: ["/api/config/payment_methods"],
  });

  const footerData = footerConfig || DEFAULT_FOOTER;

  return (
    <footer className="bg-card border-t mt-auto">
      <div className="mx-auto max-w-7xl px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          <div className="space-y-4">
            <div data-testid="text-footer-brand">
              <Logo size="lg" variant="primary" type="footer" />
            </div>
            <p className="text-muted-foreground text-sm leading-relaxed">
              {footerData.description}
            </p>
            
            {/* Cinta de métodos de pago */}
            {activePayments && activePayments.length > 0 && (
              <div className="pt-4">
                <p className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground mb-3">Medios de pago</p>
                <div className="flex flex-wrap gap-3 grayscale opacity-70 hover:grayscale-0 hover:opacity-100 transition-all">
                  {activePayments.map(id => (
                    <div key={id} className="h-6 w-10 bg-white rounded border flex items-center justify-center p-0.5 shadow-sm" title={id}>
                      <img 
                        src={PAYMENT_METHODS_ICONS[id]} 
                        alt={id} 
                        className="max-w-full max-h-full object-contain" 
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Redes Sociales Dinámicas */}
            <div className="flex gap-4 pt-6">
              {footerData.facebook && (
                <a href={footerData.facebook} target="_blank" rel="noreferrer" className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-blue-600 hover:text-white transition-all shadow-sm">
                  <Facebook className="h-4 w-4" />
                </a>
              )}
              {footerData.instagram && (
                <a href={footerData.instagram} target="_blank" rel="noreferrer" className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-pink-600 hover:text-white transition-all shadow-sm">
                  <Instagram className="h-4 w-4" />
                </a>
              )}
              {footerData.twitter && (
                <a href={footerData.twitter} target="_blank" rel="noreferrer" className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-sky-500 hover:text-white transition-all shadow-sm">
                  <Twitter className="h-4 w-4" />
                </a>
              )}
              {footerData.youtube && (
                <a href={footerData.youtube} target="_blank" rel="noreferrer" className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-red-600 hover:text-white transition-all shadow-sm">
                  <Youtube className="h-4 w-4" />
                </a>
              )}
              {footerData.telegram && (
                <a href={footerData.telegram} target="_blank" rel="noreferrer" className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-sky-400 hover:text-white transition-all shadow-sm">
                  <Send className="h-4 w-4" />
                </a>
              )}
              {footerData.whatsapp && (
                <a href={footerData.whatsapp} target="_blank" rel="noreferrer" className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-green-500 hover:text-white transition-all shadow-sm">
                  <MessageCircle className="h-4 w-4" />
                </a>
              )}
            </div>
          </div>

          <div>
            <h4 className="font-semibold mb-6">Enlaces</h4>
            <nav className="flex flex-col gap-3">
              <Link href="/">
                <span className="text-sm text-muted-foreground hover:text-primary transition-colors cursor-pointer" data-testid="link-footer-home">
                  Inicio
                </span>
              </Link>
              <Link href="/explore">
                <span className="text-sm text-muted-foreground hover:text-primary transition-colors cursor-pointer" data-testid="link-footer-explore">
                  Explorar Tiendas
                </span>
              </Link>
              <Link href="/cart">
                <span className="text-sm text-muted-foreground hover:text-primary transition-colors cursor-pointer" data-testid="link-footer-cart">
                  Mi Carrito
                </span>
              </Link>
              <Link href="/account">
                <span className="text-sm text-muted-foreground hover:text-primary transition-colors cursor-pointer" data-testid="link-footer-account">
                  Mi Cuenta
                </span>
              </Link>
            </nav>
          </div>

          <div>
            <h4 className="font-semibold mb-6">Para Comerciantes</h4>
            <nav className="flex flex-col gap-3">
              <Link href="/panel">
                <span className="text-sm text-muted-foreground hover:text-primary transition-colors cursor-pointer" data-testid="link-footer-panel">
                  Vender en PachaPay
                </span>
              </Link>
              <Link href="/panel">
                <span className="text-sm text-muted-foreground hover:text-primary transition-colors cursor-pointer">
                  Panel de Control
                </span>
              </Link>
              <span className="text-sm text-muted-foreground hover:text-primary transition-colors cursor-pointer">
                Términos de Servicio
              </span>
            </nav>
          </div>

          <div>
            <h4 className="font-semibold mb-6">Contacto</h4>
            <div className="flex flex-col gap-4">
              <div className="flex items-start gap-3 text-sm text-muted-foreground group">
                <MapPin className="h-4 w-4 shrink-0 text-primary mt-0.5" />
                <span className="group-hover:text-foreground transition-colors">{footerData.address}</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-muted-foreground group">
                <Phone className="h-4 w-4 shrink-0 text-primary" />
                <span className="group-hover:text-foreground transition-colors">{footerData.phone}</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-muted-foreground group">
                <Mail className="h-4 w-4 shrink-0 text-primary" />
                <span className="group-hover:text-foreground transition-colors">{footerData.email}</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-muted-foreground group">
                <Clock className="h-4 w-4 shrink-0 text-primary" />
                <span className="group-hover:text-foreground transition-colors">{footerData.hours}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t mt-12 pt-8 text-center">
          <p className="text-sm text-muted-foreground" data-testid="text-copyright">
            © {new Date().getFullYear()} {footerData.copyright}
          </p>
        </div>
      </div>
    </footer>
  );
}
