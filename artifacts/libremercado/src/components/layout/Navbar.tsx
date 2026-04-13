import { Link, useLocation } from "wouter";
import {
  ShoppingCart,
  User,
  Menu,
  ChevronDown,
  Tag,
  Ticket,
  ShoppingBag,
  Store,
  Headphones,
  Heart,
  Smartphone,
  Shirt,
  Home as HomeIcon,
  Pill,
  UtensilsCrossed,
  Sparkles,
  PawPrint,
  LogOut,
  Bike,
  Play,
  Shield,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/use-auth";
import { useCart } from "@/hooks/use-cart";
import { useToast } from "@/hooks/use-toast";
import { Logo } from "@/components/brand/Logo";
import { LocationSelector } from "@/components/layout/LocationSelector";
import { NotificationBell } from "@/components/NotificationBell";
import { SearchBar } from "@/components/layout/SearchBar";
import { CATALOG_CATEGORIES, type CatalogCategoryId } from "@/lib/catalog";

const categoryIcons: Record<CatalogCategoryId, LucideIcon> = {
  electronics: Smartphone,
  fashion: Shirt,
  home: HomeIcon,
  grocery: ShoppingBag,
  pharmacy: Pill,
  food: UtensilsCrossed,
  beauty: Sparkles,
  pets: PawPrint,
};

const categories = CATALOG_CATEGORIES.map((category) => ({
  ...category,
  icon: categoryIcons[category.id],
}));

export function Navbar() {
  const [location, setLocation] = useLocation();
  const { user, isAuthenticated, logout, isLoggingOut } = useAuth();
  const { toast } = useToast();
  const itemCount = useCart((state) =>
    state.items.reduce((acc, item) => acc + item.quantity, 0),
  );

  const featuredStoresHref = "/explore?tab=stores&featured=true";
  const isOfficial = isAuthenticated && user?.role === "official";
  const canSeePanel = isAuthenticated && user?.role && user.role !== "customer" && user.role !== "official";
  const canAccessProfessionalChannel =
    !!user &&
    (
      user.role === "admin" ||
      user.role === "official" ||
      (user.role === "merchant" && user.kycStatus === "approved")
    );
  const isVideosRoute = location === "/videos";

  if (isVideosRoute) return null;

  const handleLogout = async () => {
    try {
      await logout();
      toast({
        title: "Sesión cerrada",
        description: "Has cerrado sesión exitosamente",
      });
      setLocation("/");
    } catch {
      toast({
        title: "Error",
        description: "No se pudo cerrar la sesión",
        variant: "destructive",
      });
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full">
      <div className="bg-primary text-primary-foreground shadow-sm">
        <div className="mx-auto max-w-7xl px-4">
          <div className="flex h-16 items-center gap-4">
            <Sheet>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="md:hidden text-primary-foreground hover:bg-primary-foreground/10"
                  data-testid="button-mobile-menu"
                >
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>

              <SheetContent side="left" className="w-80 sm:w-96">
                <nav className="mt-8 flex flex-col gap-2">
                  <Link href="/">
                    <span className="block rounded-md px-4 py-2 font-medium hover-elevate" data-testid="link-mobile-inicio">
                      Inicio
                    </span>
                  </Link>
                  <Link href="/explore">
                    <span className="block rounded-md px-4 py-2 hover-elevate" data-testid="link-mobile-explorar">
                      Explorar
                    </span>
                  </Link>
                  <Link href={featuredStoresHref}>
                    <span className="block rounded-md px-4 py-2 hover-elevate" data-testid="link-mobile-featured-stores">
                      Tiendas destacadas
                    </span>
                  </Link>
                  <Link href="/videos">
                    <span className="flex items-center gap-2 rounded-md px-4 py-2 hover-elevate" data-testid="link-mobile-videos">
                      <Play className="h-4 w-4" />
                      Reelmark
                    </span>
                  </Link>
                  <Link href="/explore?filter=ofertas">
                    <span className="block rounded-md px-4 py-2 hover-elevate" data-testid="link-mobile-ofertas">
                      Ofertas
                    </span>
                  </Link>
                  <Link href="/explore?filter=cupones">
                    <span className="block rounded-md px-4 py-2 hover-elevate" data-testid="link-mobile-cupones">
                      Cupones
                    </span>
                  </Link>

                  {!isAuthenticated && (
                    <>
                      <div className="mt-2 px-4 py-2 text-sm font-semibold text-muted-foreground">
                        Unite a PachaPay
                      </div>
                      <Link href="/vender">
                        <span className="flex items-center gap-2 rounded-md px-4 py-2 font-medium text-primary hover-elevate" data-testid="link-mobile-vender">
                          <Store className="h-4 w-4" />
                          Vender
                        </span>
                      </Link>
                      <Link href="/repartidor">
                        <span className="flex items-center gap-2 rounded-md px-4 py-2 font-medium text-accent hover-elevate" data-testid="link-mobile-repartidor">
                          <Bike className="h-4 w-4" />
                          Ser repartidor
                        </span>
                      </Link>
                    </>
                  )}

                  <div className="mt-2 px-4 py-2 text-sm font-semibold text-muted-foreground">
                    Categorías
                  </div>
                  {categories.map((category) => (
                    <Link key={category.id} href={category.href}>
                      <span className="flex items-start gap-3 rounded-md px-4 py-3 hover-elevate" data-testid={`link-mobile-cat-${category.id}`}>
                        <category.icon className="mt-0.5 h-4 w-4 shrink-0" />
                        <span className="flex flex-col">
                          <span>{category.name}</span>
                          <span className="text-xs text-muted-foreground">{category.shortDescription}</span>
                        </span>
                      </span>
                    </Link>
                  ))}

                  {!canAccessProfessionalChannel && (
                    <>
                      <div className="mt-2 px-4 py-2 text-sm font-semibold text-muted-foreground">
                        Canal profesional
                      </div>
                      <Link href={isAuthenticated ? "/account/kyc" : "/vender"}>
                        <span className="block rounded-md px-4 py-2 font-medium text-amber-600 hover-elevate" data-testid="link-mobile-request-professional-access">
                          Solicitar acceso mayorista
                        </span>
                      </Link>
                    </>
                  )}

                  {isOfficial && (
                    <>
                      <div className="mt-2 px-4 py-2 text-sm font-semibold text-muted-foreground">
                        Mi organismo
                      </div>
                      <Link href="/institucional">
                        <span className="block rounded-md px-4 py-2 font-medium text-blue-600 hover-elevate" data-testid="link-mobile-institucional">
                          Panel institucional
                        </span>
                      </Link>
                    </>
                  )}

                  {canSeePanel && (
                    <>
                      <div className="mt-2 px-4 py-2 text-sm font-semibold text-muted-foreground">
                        Gestión
                      </div>
                      <Link href="/admin">
                        <span className="block rounded-md px-4 py-2 font-medium text-primary hover-elevate" data-testid="link-mobile-panel">
                          Panel admin
                        </span>
                      </Link>
                    </>
                  )}
                </nav>
              </SheetContent>
            </Sheet>

            <Link href="/">
              <span data-testid="link-logo">
                <Logo size="md" variant="light" />
              </span>
            </Link>

            <div className="mx-4 hidden max-w-xl flex-1 sm:flex">
              <SearchBar inputClassName="border-0 bg-white focus-visible:ring-2 focus-visible:ring-white/50" />
            </div>

            <div className="ml-auto flex items-center gap-1">
              <LocationSelector />

              <div className="ml-2 hidden items-center gap-1 border-l border-primary-foreground/20 pl-2 md:flex">
                {isAuthenticated ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="gap-1 text-primary-foreground/90 hover:bg-primary-foreground/10 hover:text-primary-foreground"
                        data-testid="button-user-menu"
                      >
                        <User className="h-4 w-4" />
                        {user?.username || "Mi cuenta"}
                        <ChevronDown className="h-3 w-3" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuItem asChild>
                        <Link href="/account">
                          <span className="flex items-center gap-2" data-testid="link-my-account">
                            <User className="h-4 w-4" />
                            Mi cuenta
                          </span>
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href="/account/orders">
                          <span className="flex items-center gap-2" data-testid="link-my-orders">
                            <ShoppingCart className="h-4 w-4" />
                            Mis compras
                          </span>
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={handleLogout}
                        disabled={isLoggingOut}
                        className="text-destructive focus:text-destructive"
                        data-testid="button-logout"
                      >
                        <LogOut className="mr-2 h-4 w-4" />
                        {isLoggingOut ? "Cerrando..." : "Cerrar sesión"}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : (
                  <>
                    <Link href="/auth">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-primary-foreground/90 hover:bg-primary-foreground/10 hover:text-primary-foreground"
                        data-testid="button-create-account"
                      >
                        Creá tu cuenta
                      </Button>
                    </Link>
                    <Link href="/auth">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-primary-foreground/90 hover:bg-primary-foreground/10 hover:text-primary-foreground"
                        data-testid="button-login"
                      >
                        Ingresá
                      </Button>
                    </Link>
                  </>
                )}
              </div>

              <div className="text-primary-foreground [&_button]:text-primary-foreground [&_button:hover]:bg-primary-foreground/10">
                <NotificationBell />
              </div>

              <Link href="/cart">
                <Button
                  variant="ghost"
                  size="icon"
                  className="relative text-primary-foreground hover:bg-primary-foreground/10"
                  data-testid="button-cart"
                >
                  <ShoppingCart className="h-5 w-5" />
                  {itemCount > 0 && (
                    <Badge
                      variant="destructive"
                      className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center px-1 text-xs"
                      data-testid="badge-cart-count"
                    >
                      {itemCount > 99 ? "99+" : itemCount}
                    </Badge>
                  )}
                </Button>
              </Link>

              <Link href={isAuthenticated ? "/account" : "/auth"} className="md:hidden">
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-primary-foreground hover:bg-primary-foreground/10"
                  data-testid="button-account"
                >
                  <User className="h-5 w-5" />
                </Button>
              </Link>
            </div>
          </div>

          <div className="pb-3 sm:hidden">
            <SearchBar inputClassName="border-0 bg-white" />
          </div>
        </div>
      </div>

      <nav className="hidden border-t border-primary-foreground/10 bg-primary/95 md:block">
        <div className="mx-auto max-w-7xl px-4">
          <div className="flex h-10 items-center gap-1">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1 text-primary-foreground/90 hover:bg-primary-foreground/10 hover:text-primary-foreground"
                  data-testid="button-categories"
                >
                  Categorías
                  <ChevronDown className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-[360px] p-2">
                <div className="px-2 py-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    Comprar por rubro
                  </p>
                </div>
                <div className="grid gap-1">
                  {categories.map((category) => (
                    <DropdownMenuItem key={category.id} asChild className="rounded-lg px-2 py-2">
                      <Link href={category.href}>
                        <span className="flex items-start gap-3" data-testid={`link-cat-${category.id}`}>
                          <span className="mt-0.5 rounded-lg bg-primary/10 p-2 text-primary">
                            <category.icon className="h-4 w-4" />
                          </span>
                          <span className="flex flex-col">
                            <span className="font-medium text-foreground">{category.name}</span>
                            <span className="text-xs text-muted-foreground">{category.shortDescription}</span>
                          </span>
                        </span>
                      </Link>
                    </DropdownMenuItem>
                  ))}
                </div>
                <DropdownMenuSeparator />
                <div className="grid gap-1 px-1 py-1">
                  <DropdownMenuItem asChild className="rounded-lg">
                    <Link href={featuredStoresHref}>
                      <span className="flex items-center gap-2 font-medium text-primary" data-testid="link-featured-stores">
                        <Sparkles className="h-4 w-4" />
                        Tiendas destacadas
                      </span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild className="rounded-lg">
                    <Link href="/explore">
                      <span className="flex items-center gap-2 font-medium text-primary" data-testid="link-all-categories">
                        Ver todo el catálogo
                      </span>
                    </Link>
                  </DropdownMenuItem>
                </div>
              </DropdownMenuContent>
            </DropdownMenu>

            <Link href="/explore?filter=ofertas">
              <Button
                variant="ghost"
                size="sm"
                className="gap-1 text-primary-foreground/90 hover:bg-primary-foreground/10 hover:text-primary-foreground"
                data-testid="link-ofertas"
              >
                <Tag className="h-3 w-3" />
                Ofertas
              </Button>
            </Link>

            <Link href="/explore?filter=cupones">
              <Button
                variant="ghost"
                size="sm"
                className="gap-1 text-primary-foreground/90 hover:bg-primary-foreground/10 hover:text-primary-foreground"
                data-testid="link-cupones"
              >
                <Ticket className="h-3 w-3" />
                Cupones
              </Button>
            </Link>

            <Link href="/explore?category=grocery">
              <Button
                variant="ghost"
                size="sm"
                className="gap-1 text-primary-foreground/90 hover:bg-primary-foreground/10 hover:text-primary-foreground"
                data-testid="link-supermercado"
              >
                <ShoppingBag className="h-3 w-3" />
                Supermercado
              </Button>
            </Link>

            <Link href="/explore?category=fashion">
              <Button
                variant="ghost"
                size="sm"
                className="gap-1 text-primary-foreground/90 hover:bg-primary-foreground/10 hover:text-primary-foreground"
                data-testid="link-moda"
              >
                <Shirt className="h-3 w-3" />
                Moda
              </Button>
            </Link>

            <Link href={featuredStoresHref}>
              <Button
                variant="ghost"
                size="sm"
                className="gap-1 text-primary-foreground/90 hover:bg-primary-foreground/10 hover:text-primary-foreground"
                data-testid="link-tiendas"
              >
                <Store className="h-3 w-3" />
                Tiendas destacadas
              </Button>
            </Link>

            <Link href="/account/favorites">
              <Button
                variant="ghost"
                size="sm"
                className="gap-1 text-primary-foreground/90 hover:bg-primary-foreground/10 hover:text-primary-foreground"
                data-testid="link-favoritos"
              >
                <Heart className="h-3 w-3" />
                Favoritos
              </Button>
            </Link>

            <Link href="/videos">
              <Button
                variant="ghost"
                size="sm"
                className="gap-1 bg-white/15 font-semibold text-primary-foreground hover:bg-white/25 hover:text-primary-foreground"
                data-testid="link-videos"
              >
                <Play className="h-3 w-3 fill-current" />
                Reelmark
              </Button>
            </Link>

            <div className="ml-auto flex items-center gap-1">
              {!isAuthenticated && (
                <>
                  <Link href="/vender">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-1 text-primary-foreground/90 hover:bg-primary-foreground/10 hover:text-primary-foreground"
                      data-testid="link-vender"
                    >
                      <Store className="h-3 w-3" />
                      Vender
                    </Button>
                  </Link>

                  <Link href="/repartidor">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-1 text-primary-foreground/90 hover:bg-primary-foreground/10 hover:text-primary-foreground"
                      data-testid="link-repartidor"
                    >
                      <Bike className="h-3 w-3" />
                      Repartidor
                    </Button>
                  </Link>
                </>
              )}

              <Link href="/help">
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1 text-primary-foreground/90 hover:bg-primary-foreground/10 hover:text-primary-foreground"
                  data-testid="link-ayuda"
                >
                  <Headphones className="h-3 w-3" />
                  Ayuda
                </Button>
              </Link>

              {!canAccessProfessionalChannel && (
                <Link href={isAuthenticated ? "/account/kyc" : "/vender"}>
                  <Button
                    size="sm"
                    variant="secondary"
                    className="gap-1 font-semibold"
                    data-testid="link-professional-access"
                  >
                    <Shield className="h-3 w-3" />
                    Acceso mayorista
                  </Button>
                </Link>
              )}

              {isOfficial && (
                <Link href="/institucional">
                  <Button
                    size="sm"
                    className="gap-1 border border-blue-500/50 bg-blue-600 font-semibold text-white hover:bg-blue-700"
                    data-testid="link-institucional"
                  >
                    <Shield className="h-3 w-3" />
                    Panel institucional
                  </Button>
                </Link>
              )}

              {canSeePanel && (
                <Link href="/admin">
                  <Button
                    size="sm"
                    className="gap-1 border border-primary-foreground/30 bg-primary-foreground/20 font-semibold text-primary-foreground hover:bg-primary-foreground/30"
                    data-testid="link-panel"
                  >
                    <Store className="h-3 w-3" />
                    Panel admin
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>
      </nav>
    </header>
  );
}
