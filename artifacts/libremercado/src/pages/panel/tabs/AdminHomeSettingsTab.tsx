import { useState } from "react";
import { Image, RefreshCw, CheckCircle, Settings2, LayoutGrid } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useHomeSettings } from "@/hooks/use-marketplace";
import { resolveMediaUrl } from "@/lib/apiBase";
import { UtensilsCrossed, ShoppingCart, Pill, Smartphone, Shirt, Home as HomeIcon, Sparkles, PawPrint } from "lucide-react";

const CATEGORIES = [
  { id: "food", name: "Comida", icon: UtensilsCrossed, defaultImg: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=300&h=200&fit=crop&auto=format&q=80" },
  { id: "grocery", name: "Supermercado", icon: ShoppingCart, defaultImg: "https://images.unsplash.com/photo-1542838132-92c53300491e?w=300&h=200&fit=crop&auto=format&q=80" },
  { id: "pharmacy", name: "Farmacia", icon: Pill, defaultImg: "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=300&h=200&fit=crop&auto=format&q=80" },
  { id: "electronics", name: "Electrónica", icon: Smartphone, defaultImg: "https://images.unsplash.com/photo-1498049794561-7780e7231661?w=300&h=200&fit=crop&auto=format&q=80" },
  { id: "fashion", name: "Moda", icon: Shirt, defaultImg: "https://images.unsplash.com/photo-1445205170230-053b83016050?w=300&h=200&fit=crop&auto=format&q=80" },
  { id: "home", name: "Hogar", icon: HomeIcon, defaultImg: "https://images.unsplash.com/photo-1484101403633-562f891dc89a?w=300&h=200&fit=crop&auto=format&q=80" },
  { id: "beauty", name: "Belleza", icon: Sparkles, defaultImg: "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=300&h=200&fit=crop&auto=format&q=80" },
  { id: "pets", name: "Mascotas", icon: PawPrint, defaultImg: "https://images.unsplash.com/photo-1415369629372-26f2fe60c467?w=300&h=200&fit=crop&auto=format&q=80" },
];

function CategoryImageEditor({
  catId,
  catName,
  CatIcon,
  currentImg,
  defaultImg,
}: {
  catId: string;
  catName: string;
  CatIcon: React.ElementType;
  currentImg?: string;
  defaultImg: string;
}) {
  const { toast } = useToast();
  const [inputVal, setInputVal] = useState(currentImg ?? "");
  const displayImg = inputVal || defaultImg;

  const saveMutation = useMutation({
    mutationFn: () =>
      apiRequest("PATCH", "/api/config/home-settings", {
        key: `cat_img_${catId}`,
        value: inputVal || defaultImg,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/config/home-settings"] });
      toast({ title: "Imagen guardada", description: `Imagen de ${catName} actualizada` });
    },
    onError: () => toast({ title: "Error al guardar", variant: "destructive" }),
  });

  const resetMutation = useMutation({
    mutationFn: () =>
      apiRequest("PATCH", "/api/config/home-settings", {
        key: `cat_img_${catId}`,
        value: defaultImg,
      }),
    onSuccess: () => {
      setInputVal("");
      queryClient.invalidateQueries({ queryKey: ["/api/config/home-settings"] });
      toast({ title: "Imagen restablecida", description: `${catName} usa imagen por defecto` });
    },
    onError: () => toast({ title: "Error", variant: "destructive" }),
  });

  return (
    <Card className="overflow-hidden">
      <div className="relative h-28 bg-muted overflow-hidden group">
        <img
          src={resolveMediaUrl(displayImg) ?? displayImg}
          alt={catName}
          className="w-full h-full object-cover"
          onError={(e) => { (e.target as HTMLImageElement).src = defaultImg; }}
        />
        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
          <CatIcon className="h-8 w-8 text-white drop-shadow-lg" />
        </div>
        <div className="absolute top-2 right-2">
          <span className="text-xs text-white bg-black/50 px-2 py-0.5 rounded-full font-medium">{catName}</span>
        </div>
      </div>
      <CardContent className="p-3 space-y-2">
        <Label className="text-xs text-muted-foreground">URL de imagen</Label>
        <Input
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
          placeholder="https://images.unsplash.com/..."
          className="text-xs h-8"
        />
        <div className="flex gap-2">
          <Button
            size="sm"
            className="flex-1 h-7 text-xs"
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
          >
            {saveMutation.isPending ? <RefreshCw className="h-3 w-3 animate-spin" /> : <CheckCircle className="h-3 w-3 mr-1" />}
            Guardar
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs"
            onClick={() => resetMutation.mutate()}
            disabled={resetMutation.isPending}
            title="Restablecer imagen por defecto"
          >
            <RefreshCw className="h-3 w-3" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function AdminHomeSettingsTab() {
  const { data: homeSettings } = useHomeSettings();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LayoutGrid className="h-5 w-5" />
            Imágenes de Categorías
          </CardTitle>
          <CardDescription>
            Personalizá las imágenes de fondo de cada categoría en la página principal. Usá URLs de imágenes públicas (ej: Unsplash).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {CATEGORIES.map((cat) => (
              <CategoryImageEditor
                key={cat.id}
                catId={cat.id}
                catName={cat.name}
                CatIcon={cat.icon}
                currentImg={homeSettings?.[`cat_img_${cat.id}`]}
                defaultImg={cat.defaultImg}
              />
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings2 className="h-5 w-5" />
            Guía de imágenes
          </CardTitle>
          <CardDescription>Recomendaciones para las imágenes de categorías</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <div className="flex items-start gap-2">
            <Image className="h-4 w-4 mt-0.5 text-primary shrink-0" />
            <p>Tamaño recomendado: <span className="font-medium text-foreground">300 × 200 px</span> (relación 3:2)</p>
          </div>
          <div className="flex items-start gap-2">
            <Image className="h-4 w-4 mt-0.5 text-primary shrink-0" />
            <p>Podés usar imágenes de Unsplash con el formato: <code className="bg-muted px-1 rounded text-xs">https://images.unsplash.com/photo-[ID]?w=300&h=200&fit=crop</code></p>
          </div>
          <div className="flex items-start gap-2">
            <Image className="h-4 w-4 mt-0.5 text-primary shrink-0" />
            <p>Las imágenes se muestran con un overlay oscuro semitransparente para que el ícono y el nombre sean legibles.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
