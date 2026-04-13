import { Link } from "wouter";
import { ShieldCheck, Headphones, Smartphone, CreditCard, CircleHelp, Instagram, Facebook, Youtube, BadgeCheck, Store, Building2 } from "lucide-react";
import { Logo } from "@/components/brand/Logo";

const companyLinks = [
  { label: "Inicio", href: "/" },
  { label: "Explorar catálogo", href: "/explore" },
  { label: "Tiendas destacadas", href: "/explore?tab=stores&featured=true" },
  { label: "Reelmark", href: "/videos" },
];

const supportLinks = [
  { label: "Centro de ayuda", href: "/help" },
  { label: "Compras y pedidos", href: "/account/orders" },
  { label: "Favoritos", href: "/account/favorites" },
  { label: "Privacidad", href: "/privacy" },
];

const commerceLinks = [
  { label: "Vender en PachaPay", href: "/vender" },
  { label: "Trabajar como repartidor", href: "/repartidor" },
  { label: "Solicitar acceso mayorista", href: "/account/kyc" },
  { label: "Panel institucional", href: "/panel-institucional" },
];

const paymentMethods = ["Visa", "Mastercard", "Cabal", "Naranja X", "Amex", "Mercado Pago", "Apple Pay"];
const trustPills = ["Pagos protegidos", "Tiendas verificadas", "Soporte 24/7", "Escalable para app móvil"];

export function Footer() {
  return (
    <footer className="mt-auto border-t bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-7xl px-4 py-14">
        <div className="grid gap-10 lg:grid-cols-[1.2fr_0.8fr_0.8fr_1fr]">
          <div className="space-y-5">
            <div data-testid="text-footer-brand">
              <Logo size="lg" variant="light" />
            </div>
            <p className="max-w-md text-sm leading-7 text-slate-300">
              Plataforma de ecommerce pensada para conectar comercio minorista, operación profesional y contenido institucional en una experiencia moderna, confiable y preparada para escalar.
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              {trustPills.map((pill) => (
                <div key={pill} className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-slate-200">
                  {pill}
                </div>
              ))}
            </div>
          </div>

          <div>
            <h4 className="mb-4 text-sm font-bold uppercase tracking-[0.18em] text-slate-400">Plataforma</h4>
            <nav className="flex flex-col gap-3">
              {companyLinks.map((link) => (
                <Link key={link.label} href={link.href}>
                  <span className="text-sm text-slate-300 transition-colors hover:text-white" data-testid={`link-footer-${link.label.toLowerCase().replace(/\s+/g, "-")}`}>
                    {link.label}
                  </span>
                </Link>
              ))}
            </nav>
          </div>

          <div>
            <h4 className="mb-4 text-sm font-bold uppercase tracking-[0.18em] text-slate-400">Ayuda y atención</h4>
            <nav className="flex flex-col gap-3">
              {supportLinks.map((link) => (
                <Link key={link.label} href={link.href}>
                  <span className="text-sm text-slate-300 transition-colors hover:text-white">
                    {link.label}
                  </span>
                </Link>
              ))}
            </nav>
          </div>

          <div className="space-y-6">
            <div>
              <h4 className="mb-4 text-sm font-bold uppercase tracking-[0.18em] text-slate-400">Canales y crecimiento</h4>
              <nav className="flex flex-col gap-3">
                {commerceLinks.map((link) => (
                  <Link key={link.label} href={link.href}>
                    <span className="text-sm text-slate-300 transition-colors hover:text-white">
                      {link.label}
                    </span>
                  </Link>
                ))}
              </nav>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-white/10 p-3">
                  <Smartphone className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">Próximamente app móvil</p>
                  <p className="text-xs text-slate-400">Reservá este espacio para iOS y Android sin romper la experiencia actual.</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-10 grid gap-6 rounded-[28px] border border-white/10 bg-white/[0.03] p-6 lg:grid-cols-[1fr_1fr]">
          <div>
            <h5 className="mb-4 text-sm font-bold uppercase tracking-[0.18em] text-slate-400">Confianza y seguridad</h5>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="flex items-start gap-3 rounded-2xl border border-white/8 bg-slate-900/60 p-4">
                <ShieldCheck className="mt-0.5 h-5 w-5 text-emerald-400" />
                <div>
                  <p className="text-sm font-semibold text-white">Protección comercial</p>
                  <p className="text-xs leading-6 text-slate-400">Buenas prácticas de seguridad, privacidad y control de accesos.</p>
                </div>
              </div>
              <div className="flex items-start gap-3 rounded-2xl border border-white/8 bg-slate-900/60 p-4">
                <BadgeCheck className="mt-0.5 h-5 w-5 text-sky-400" />
                <div>
                  <p className="text-sm font-semibold text-white">Cuentas verificadas</p>
                  <p className="text-xs leading-6 text-slate-400">Preparado para roles institucionales, comercios y canal profesional.</p>
                </div>
              </div>
              <div className="flex items-start gap-3 rounded-2xl border border-white/8 bg-slate-900/60 p-4">
                <Headphones className="mt-0.5 h-5 w-5 text-amber-400" />
                <div>
                  <p className="text-sm font-semibold text-white">Atención al cliente</p>
                  <p className="text-xs leading-6 text-slate-400">Ayuda, seguimiento de pedidos y soporte postventa centralizado.</p>
                </div>
              </div>
              <div className="flex items-start gap-3 rounded-2xl border border-white/8 bg-slate-900/60 p-4">
                <CircleHelp className="mt-0.5 h-5 w-5 text-violet-400" />
                <div>
                  <p className="text-sm font-semibold text-white">Estructura escalable</p>
                  <p className="text-xs leading-6 text-slate-400">Pensado para sumar nuevas verticales, app móvil y permisos avanzados.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-5">
            <div>
              <h5 className="mb-4 text-sm font-bold uppercase tracking-[0.18em] text-slate-400">Medios y presencia</h5>
              <div className="flex flex-wrap gap-2">
                {paymentMethods.map((method) => (
                  <span key={method} className="inline-flex items-center rounded-full border border-white/10 bg-white/[0.05] px-3 py-1.5 text-xs text-slate-200">
                    <CreditCard className="mr-2 h-3.5 w-3.5 text-slate-400" />
                    {method}
                  </span>
                ))}
              </div>
            </div>

            <div>
              <h5 className="mb-4 text-sm font-bold uppercase tracking-[0.18em] text-slate-400">Canales sociales y reputación</h5>
              <div className="flex flex-wrap items-center gap-3">
                {[Instagram, Facebook, Youtube].map((Icon, index) => (
                  <span key={index} className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/[0.05] text-slate-200">
                    <Icon className="h-5 w-5" />
                  </span>
                ))}
                <span className="ml-2 text-xs text-slate-400">Placeholders listos para conectar redes reales.</span>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                <div className="flex items-center gap-2">
                  <Store className="h-4 w-4 text-amber-300" />
                  <p className="text-sm font-semibold text-white">Minorista y comercios</p>
                </div>
                <p className="mt-2 text-xs leading-6 text-slate-400">Experiencia orientada a descubrimiento, confianza y compra rápida.</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-sky-300" />
                  <p className="text-sm font-semibold text-white">Institucional y municipal</p>
                </div>
                <p className="mt-2 text-xs leading-6 text-slate-400">Canal preparado para organismos, municipios y cuentas verificadas.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-10 border-t border-white/10 pt-6">
          <div className="flex flex-col gap-4 text-sm text-slate-400 md:flex-row md:items-center md:justify-between">
            <p data-testid="text-copyright">
              © {new Date().getFullYear()} PachaPay. Plataforma preparada para comercio local, institucional y profesional.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link href="/terms">
                <span className="transition-colors hover:text-white">Términos de uso</span>
              </Link>
              <Link href="/privacy">
                <span className="transition-colors hover:text-white">Política de privacidad</span>
              </Link>
              <Link href="/help">
                <span className="transition-colors hover:text-white">Ayuda</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
