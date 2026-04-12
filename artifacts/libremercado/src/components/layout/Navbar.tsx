import { Link, useLocation } from "wouter";
import { ShoppingCart, User, Menu, ChevronDown, Tag, Ticket, ShoppingBag, Store, Headphones, Heart, Smartphone, Shirt, Home as HomeIcon, Pill, UtensilsCrossed, Sparkles, PawPrint, LogOut, Bike, Play, Shield, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/use-auth";
import { useCart } from "@/hooks/use-cart";
import { useToast } from "@/hooks/use-toast";
import { Logo } from "@/components/brand/Logo";
import { LocationSelector } from "@/components/layout/LocationSelector";
import { NotificationBell } from "@/components/NotificationBell";
import { SearchBar } from "@/components/layout/SearchBar";

const categories: { id: string; name: string; icon: LucideIcon }[] = [
  { id: "electronics", name: "Electrónica", icon: Smartphone },
  { id: "fashion", name: "Moda", icon: Shirt },
  { id: "home", name: "Hogar", icon: HomeIcon },
  { id: "grocery", name: "Supermercado", icon: ShoppingBag },
  { id: "pharmacy", name: "Farmacia", icon: Pill },
  { id: "food", name: "Comida", icon: UtensilsCrossed },
  { id: "beauty", name: "Belleza", icon: Sparkles },
  { id: "pets", name: "Mascotas", icon: PawPrint },
];

export function Navbar() {
  const [location, setLocation] = useLocation();
  const { user, isAuthenticated, logout, isLoggingOut } = useAuth();
  const { toast } = useToast();

  const itemCount = useCart((state) =>
    state.items.reduce((acc, item) => acc + item.quantity, 0),
  );

  const isOfficial = isAuthenticated && user?.role === "official";
  const canSeePanel = isAuthenticated && user?.role && user.role !== "customer" && user.role !== "official";
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
    <header className={`sticky top-0 z-50 w-full${isVideosRoute ? " max-md:hidden" : ""}`}>
      <div className="bg-primary">
        <div className="mx-auto max-w-7xl px-4">
          <div className="flex h-16 items-center gap-4">
            <Sheet>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="md:hidden text-primary-foreground"
                  data-testid="button-mobile-menu"
                >
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>

              <SheetContent side="left" className="w-72">
                <nav className="flex flex-col gap-2 mt-8">
                  <Link href="/">
                    <span className="block px-4 py-2 rounded-md hover-elevate font-medium" data-testid="link-mobile-inicio">
                      Inicio
                    </span>
                  </Link>
                  <Link href="/explore">
                    <span className="block px-4 py-2 rounded-md hover-elevate" data-testid="link-mobile-explorar">
                      Explorar
                    </span>
                  </Link>
                  <Link href="/videos">
                    <span className="flex items-center gap-2 px-4 py-2 rounded-md hover-elevate" data-testid="link-mobile-videos">
                      <Play className="h-4 w-4" />
                      Reelmark
                    </span>
                  </Link>
                  <Link href="/explore?filter=ofertas">
                    <span className="block px-4 py-2 rounded-md hover-elevate" data-testid="link-mobile-ofertas">
                      Ofertas
                    </span>
                  </Link>
                  <Link href="/explore?filter=cupones">
                    <span className="block px-4 py-2 rounded-md hover-elevate" data-testid="link-mobile-cupones">
                      Cupones
                    </span>
                  </Link>

                  {!isAuthenticated && (
                    <>
                      <div className="px-4 py-2 text-sm font-semibold text-muted-foreground mt-2">
                        Unite a PachaPay
                      </div>
                      <Link href="/vender">
                        <span className="flex items-center gap-2 px-4 py-2 rounded-md hover-elevate text-primary font-medium" data-testid="link-mobile-vender">
                          <Store className="h-4 w-4" />
                          Vender
                        </span>
                      </Link>
                      <Link href="/repartidor">
                        <span className="flex items-center gap-2 px-4 py-2 rounded-md hover-elevate text-accent font-medium" data-testid="link-mobile-repartidor">
                          <Bike className="h-4 w-4" />
                          Ser Repartidor
                        </span>
                      </Link>
                    </>
                  )}
                  
                  <div className="px-4 py-2 text-sm font-semibold text-muted-foreground mt-2">
                    Categorías
                  </div>
                  {categories.map((cat) => (
                    <Link key={cat.id} href={`/explore?category=${cat.id}`}>
                      <span className="flex items-center gap-2 px-4 py-2 rounded-md hover-elevate" data-testid={`link-mobile-cat-${cat.id}`}>
                        <cat.icon className="h-4 w-4" />
                        {cat.name}
                      </span>
                    </Link>
                  ))}

                  {isOfficial && (
                    <>
                      <div className="px-4 py-2 text-sm font-semibold text-muted-foreground mt-2">
                        Mi organismo
                      </div>
                      <Link href="/institucional">
                        <span className="block px-4 py-2 rounded-md hover-elevate font-medium text-blue-600" data-testid="link-mobile-institucional">
                          Panel Institucional
                        </span>
                      </Link>
                    </>
                  )}
                  {canSeePanel && (
                    <>
                      <div className="px-4 py-2 text-sm font-semibold text-muted-foreground mt-2">
                        Gestión
                      </div>
                      <Link href="/admin">
                        <span className="block px-4 py-2 rounded-md hover-elevate font-medium text-primary" data-testid="link-mobile-panel">
                          Panel Admin
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

            <div className="hidden sm:flex flex-1 max-w-xl mx-4">
              <SearchBar inputClassName="bg-white border-0 focus-visible:ring-2 focus-visible:ring-white/50" />
            </div>

            <div className="flex items-center gap-1 ml-auto">
              <LocationSelector />

              <div className="hidden md:flex items-center gap-1 border-l border-primary-foreground/20 ml-2 pl-2">
                {isAuthenticated ? (
                  <>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-primary-foreground/90 hover:text-primary-foreground hover:bg-primary-foreground/10 gap-1"
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
                          <LogOut className="h-4 w-4 mr-2" />
                          {isLoggingOut ? "Cerrando..." : "Cerrar sesión"}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </>
                ) : (
                  <>
                    <Link href="/auth">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-primary-foreground/90 hover:text-primary-foreground hover:bg-primary-foreground/10"
                        data-testid="button-create-account"
                      >
                        Creá tu cuenta
                      </Button>
                    </Link>
                    <Link href="/auth">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-primary-foreground/90 hover:text-primary-foreground hover:bg-primary-foreground/10"
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
                      className="absolute -top-1 -right-1 h-5 min-w-5 px-1 text-xs flex items-center justify-center"
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

          <div className="sm:hidden pb-3">
            <SearchBar inputClassName="bg-white border-0" />
          </div>
        </div>
      </div>

      {!isVideosRoute && <nav className="hidden md:block bg-primary/95 border-t border-primary-foreground/10">
        <div className="mx-auto max-w-7xl px-4">
          <div className="flex items-center h-10 gap-1">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-primary-foreground/90 hover:text-primary-foreground hover:bg-primary-foreground/10 gap-1"
                  data-testid="button-categories"
                >
                  Categorías
                  <ChevronDown className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56">
                {categories.map((cat) => (
                  <DropdownMenuItem key={cat.id} asChild>
                    <Link href={`/explore?category=${cat.id}`}>
                      <span className="flex items-center gap-2" data-testid={`link-cat-${cat.id}`}>
                        <cat.icon className="h-4 w-4" />
                        {cat.name}
                      </span>
                    </Link>
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/explore">
                    <span className="flex items-center gap-2 text-primary font-medium" data-testid="link-all-categories">
                      Ver todas las categorías
                    </span>
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Link href="/explore?filter=ofertas">
              <Button
                variant="ghost"
                size="sm"
                className="text-primary-foreground/90 hover:text-primary-foreground hover:bg-primary-foreground/10 gap-1"
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
                className="text-primary-foreground/90 hover:text-primary-foreground hover:bg-primary-foreground/10 gap-1"
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
                className="text-primary-foreground/90 hover:text-primary-foreground hover:bg-primary-foreground/10 gap-1"
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
                className="text-primary-foreground/90 hover:text-primary-foreground hover:bg-primary-foreground/10 gap-1"
                data-testid="link-moda"
              >
                <Shirt className="h-3 w-3" />
                Moda
              </Button>
            </Link>

            <Link href="/explore?filter=oficial">
              <Button
                variant="ghost"
                size="sm"
                className="text-primary-foreground/90 hover:text-primary-foreground hover:bg-primary-foreground/10 gap-1"
                data-testid="link-tiendas"
              >
                <Store className="h-3 w-3" />
                Tiendas Oficiales
              </Button>
            </Link>

            <Link href="/account/favorites">
              <Button
                variant="ghost"
                size="sm"
                className="text-primary-foreground/90 hover:text-primary-foreground hover:bg-primary-foreground/10 gap-1"
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
                className="text-primary-foreground hover:text-primary-foreground bg-white/15 hover:bg-white/25 gap-1 font-semibold"
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
                      className="text-primary-foreground/90 hover:text-primary-foreground hover:bg-primary-foreground/10 gap-1"
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
                      className="text-primary-foreground/90 hover:text-primary-foreground hover:bg-primary-foreground/10 gap-1"
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
                  className="text-primary-foreground/90 hover:text-primary-foreground hover:bg-primary-foreground/10 gap-1"
                  data-testid="link-ayuda"
                >
                  <Headphones className="h-3 w-3" />
                  Ayuda
                </Button>
              </Link>

              {isOfficial && (
                <Link href="/institucional">
                  <Button
                    size="sm"
                    className="bg-blue-600 text-white hover:bg-blue-700 font-semibold gap-1 border border-blue-500/50"
                    data-testid="link-institucional"
                  >
                    <Shield className="h-3 w-3" />
                    Panel Institucional
                  </Button>
                </Link>
              )}
              {canSeePanel && (
                <Link href="/admin">
                  <Button
                    size="sm"
                    className="bg-primary-foreground/20 text-primary-foreground hover:bg-primary-foreground/30 font-semibold gap-1 border border-primary-foreground/30"
                    data-testid="link-panel"
                  >
                    <Store className="h-3 w-3" />
                    Panel Admin
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>
      </nav>}
    </header>
  );
}
