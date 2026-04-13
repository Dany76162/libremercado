import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Building2, Lock, ShieldCheck, Store } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { ProductCard } from "@/components/marketplace/ProductCard";
import { useAuth } from "@/hooks/use-auth";
import { useLocation as useUserLocation } from "@/hooks/use-location";
import { apiUrl } from "@/lib/apiBase";
import { canAccessWholesaleChannel, resolveMarketAccess } from "@/lib/market-access";
import type { Product } from "@shared/schema";

function RestrictedState({ isAuthenticated, status }: { isAuthenticated: boolean; status: "none" | "pending" | "approved" }) {
  const ctaHref = !isAuthenticated ? "/auth" : "/account/kyc";
  const ctaLabel = !isAuthenticated
    ? "Iniciar sesión"
    : status === "pending"
      ? "Ver estado de verificación"
      : "Solicitar acceso";

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <Card className="overflow-hidden border-amber-200 bg-[linear-gradient(135deg,#fff7ed_0%,#ffffff_100%)] shadow-sm">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-amber-100 p-3 text-amber-700">
              <Lock className="h-6 w-6" />
            </div>
            <div>
              <CardTitle>Acceso restringido al canal mayorista</CardTitle>
              <CardDescription>
                Esta sección está reservada para cuentas verificadas, comercios aprobados y perfiles institucionales habilitados.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-2xl border border-amber-200 bg-white p-4">
              <Store className="h-5 w-5 text-amber-700" />
              <p className="mt-3 font-semibold">Comercios verificados</p>
              <p className="mt-1 text-sm text-muted-foreground">Merchants con KYC aprobado o acceso mayorista explícito.</p>
            </div>
            <div className="rounded-2xl border border-amber-200 bg-white p-4">
              <Building2 className="h-5 w-5 text-amber-700" />
              <p className="mt-3 font-semibold">Sector institucional</p>
              <p className="mt-1 text-sm text-muted-foreground">Organismos y cuentas oficiales con necesidad de compra especializada.</p>
            </div>
            <div className="rounded-2xl border border-amber-200 bg-white p-4">
              <ShieldCheck className="h-5 w-5 text-amber-700" />
              <p className="mt-3 font-semibold">Sin exposición pública</p>
              <p className="mt-1 text-sm text-muted-foreground">Los productos mayoristas no se muestran al comprador común.</p>
            </div>
          </div>

          {status === "pending" && (
            <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
              Tu cuenta ya está en revisión. Apenas se apruebe, vas a poder ver el catálogo mayorista.
            </div>
          )}

          <div className="flex flex-wrap gap-3">
            <Link href={ctaHref}>
              <Button>{ctaLabel}</Button>
            </Link>
            <Link href="/explore">
              <Button variant="outline">Volver al catálogo general</Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function WholesaleHub() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { provinciaId, ciudadId, useGps, lat, lng, radiusKm } = useUserLocation();
  const marketStatus = resolveMarketAccess(user);
  const hasAccess = canAccessWholesaleChannel(user);

  const params = new URLSearchParams();
  if (useGps && lat != null && lng != null && radiusKm != null) {
    params.set("lat", String(lat));
    params.set("lng", String(lng));
    params.set("radiusKm", String(radiusKm));
  } else if (provinciaId) {
    params.set("provinciaId", provinciaId);
    if (ciudadId) params.set("ciudadId", ciudadId);
  }

  const { data, isLoading, error } = useQuery<Product[]>({
    queryKey: ["/api/wholesale/products", params.toString()],
    enabled: hasAccess,
    queryFn: async () => {
      const res = await fetch(apiUrl(`/api/wholesale/products${params.toString() ? `?${params.toString()}` : ""}`), {
        credentials: "include",
      });

      if (res.status === 403) {
        throw new Error("restricted");
      }
      if (!res.ok) {
        throw new Error("No se pudo cargar el canal mayorista");
      }
      return res.json();
    },
  });

  if (authLoading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-10">
        <Skeleton className="h-12 w-72" />
        <Skeleton className="mt-4 h-28 w-full" />
      </div>
    );
  }

  if (!hasAccess || (error instanceof Error && error.message === "restricted")) {
    return <RestrictedState isAuthenticated={isAuthenticated} status={marketStatus} />;
  }

  return (
    <div className="min-h-screen bg-muted/20">
      <section className="border-b bg-[linear-gradient(135deg,#052e16_0%,#064e3b_50%,#022c22_100%)] text-white">
        <div className="mx-auto max-w-7xl px-4 py-10">
          <Badge className="border border-white/20 bg-white/10 text-white">Canal profesional aprobado</Badge>
          <h1 className="mt-4 text-4xl font-black">Mercado mayorista y distribuidoras</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-white/80 md:text-base">
            Catálogo exclusivo para cuentas aprobadas. Los productos visibles en este espacio no aparecen en el canal minorista público.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-black">Catálogo mayorista</h2>
            <p className="mt-1 text-sm text-muted-foreground">Precios y publicaciones protegidas para usuarios aprobados.</p>
          </div>
          <Link href="/explore">
            <Button variant="outline">Volver al minorista</Button>
          </Link>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, index) => (
              <Card key={index}>
                <Skeleton className="aspect-square w-full" />
                <CardContent className="space-y-2 p-4">
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-6 w-1/3" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : data && data.length > 0 ? (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {data.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <Card className="border-dashed">
            <CardContent className="py-12 text-center">
              <AlertTriangle className="mx-auto h-10 w-10 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">Todavía no hay productos mayoristas cargados</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                El acceso ya está activo, pero falta publicar artículos marcados como <code>wholesale</code>.
              </p>
            </CardContent>
          </Card>
        )}
      </section>
    </div>
  );
}
