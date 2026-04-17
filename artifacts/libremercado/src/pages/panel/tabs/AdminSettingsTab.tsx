import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { 
  Settings, Save, Image, Phone, Mail, MapPin, Clock, 
  CreditCard, Globe, Info, CheckCircle2, Loader2,
  Upload, Palette, Tag, Plus, Trash2,
  Facebook, Instagram, Twitter, Youtube, Send, MessageCircle,
  Smartphone, Shirt, Home as HomeIcon, ShoppingBag, Pill, UtensilsCrossed, Sparkles, PawPrint,
  Gift, Car, Camera, Heart, Monitor, Zap, Coffee, Music
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { resolveMediaUrl } from "@/lib/apiBase";

const DEFAULT_FOOTER = {
  description: "Tu plataforma de comercio local. Conectamos comerciantes y clientes para ofrecer la mejor experiencia de compra con la fuerza de la Pachamama.",
  email: "info@pachapay.com",
  phone: "+54 11 1234 5678",
  address: "Tu Ciudad, País",
  hours: "Lun - Dom: 8:00 - 22:00",
  copyright: "PachaPay. Todos los derechos reservados.",
  facebook: "",
  instagram: "",
  twitter: "",
  youtube: "",
  telegram: "",
  whatsapp: ""
};

// ... resto del código hasta el componente

const CATEGORY_ICONS = [
  { name: "Smartphone", icon: Smartphone },
  { name: "Shirt", icon: Shirt },
  { name: "Home", icon: HomeIcon },
  { name: "ShoppingBag", icon: ShoppingBag },
  { name: "Pill", icon: Pill },
  { name: "UtensilsCrossed", icon: UtensilsCrossed },
  { name: "Sparkles", icon: Sparkles },
  { name: "PawPrint", icon: PawPrint },
  { name: "Gift", icon: Gift },
  { name: "Car", icon: Car },
  { name: "Camera", icon: Camera },
  { name: "Heart", icon: Heart },
  { name: "Monitor", icon: Monitor },
  { name: "Zap", icon: Zap },
  { name: "Coffee", icon: Coffee },
  { name: "Music", icon: Music }
];

const DEFAULT_CATEGORIES = [
  { id: "electronics", name: "Electrónica", icon: "Smartphone" },
  { id: "fashion", name: "Moda", icon: "Shirt" },
  { id: "home", name: "Hogar", icon: "Home" },
  { id: "grocery", name: "Supermercado", icon: "ShoppingBag" },
  { id: "pharmacy", name: "Farmacia", icon: "Pill" },
  { id: "food", name: "Comida", icon: "UtensilsCrossed" },
  { id: "beauty", name: "Belleza", icon: "Sparkles" },
  { id: "pets", name: "Mascotas", icon: "PawPrint" },
];

const PAYMENT_METHODS = [
  { id: "visa", name: "Visa", icon: "https://upload.wikimedia.org/wikipedia/commons/5/5e/Visa_Inc._logo.svg" },
  { id: "mastercard", name: "Mastercard", icon: "https://upload.wikimedia.org/wikipedia/commons/2/2a/Mastercard-logo.svg" },
  { id: "mercadopago", name: "Mercado Pago", icon: "https://logodownload.org/wp-content/uploads/2019/06/mercado-pago-logo-0.png" },
  { id: "amex", name: "American Express", icon: "https://upload.wikimedia.org/wikipedia/commons/f/fa/American_Express_logo_%282018%29.svg" },
  { id: "pachapay_visa", name: "PachaPay Visa", icon: "https://cdn-icons-png.flaticon.com/512/349/349221.png", isNew: true },
  { id: "cash", name: "Efectivo", icon: "https://cdn-icons-png.flaticon.com/512/2331/2331717.png" }
];

export function AdminSettingsTab() {
  const { toast } = useToast();
  const headerLogoRef = useRef<HTMLInputElement>(null);
  const footerLogoRef = useRef<HTMLInputElement>(null);
  
  const { data: footerConfig, isLoading: loadingFooter } = useQuery<typeof DEFAULT_FOOTER>({
    queryKey: ["/api/config/footer_config"],
  });
  const { data: headerLogo, isLoading: loadingHeaderLogo } = useQuery<{url: string}>({
    queryKey: ["/api/config/header_logo"],
  });
  const { data: footerLogo, isLoading: loadingFooterLogo } = useQuery<{url: string}>({
    queryKey: ["/api/config/footer_logo"],
  });
  const { data: activePayments, isLoading: loadingPayments } = useQuery<string[]>({
    queryKey: ["/api/config/payment_methods"],
  });
  const { data: themeConfig, isLoading: loadingTheme } = useQuery({ queryKey: ["/api/config/site_theme"] });
  const { data: dbCategories, isLoading: loadingCats } = useQuery({ queryKey: ["/api/config/site_categories"] });

  const saveMutation = useMutation({
    mutationFn: async ({ key, data }: { key: string; data: any }) => {
      const isFile = data instanceof FormData;
      const url = isFile ? `/api/config/upload/${key}` : `/api/config/${key}`;
      return isFile ? fetch(url, { method: "POST", body: data }).then(r => r.json()) : apiRequest("POST", url, data);
    },
    onSuccess: (_, v) => {
      queryClient.invalidateQueries({ queryKey: [`/api/config/${v.key}`] });
      toast({ title: "Guardado", description: "Configuración actualizada." });
    }
  });

  const [footerData, setFooterData] = useState(DEFAULT_FOOTER);
  const [theme, setTheme] = useState({ primary: "#ff4500", navbar: "#ffffff" });
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);
  const [newCat, setNewCat] = useState({ name: "", icon: "Tag" });
  const [selectedPayments, setSelectedPayments] = useState<string[]>([]);

  useEffect(() => {
    if (footerConfig) setFooterData(footerConfig);
    if (themeConfig) setTheme(prev => ({ ...prev, ...themeConfig }));
    if (dbCategories && Array.isArray(dbCategories)) setCategories(dbCategories);
    if (activePayments) setSelectedPayments(activePayments);
  }, [footerConfig, themeConfig, dbCategories, activePayments]);

  const handleFileUpload = (key: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append("file", file);
    saveMutation.mutate({ key, data: formData });
  };

  const handleAddCategory = () => {
    if (!newCat.name) return;
    const id = newCat.name.toLowerCase().replace(/\s+/g, "-");
    const updated = [...categories, { id, ...newCat }];
    setCategories(updated);
    saveMutation.mutate({ key: "site_categories", data: updated });
    setNewCat({ name: "", icon: "Tag" });
  };

  const removeCategory = (id: string) => {
    const updated = categories.filter(c => c.id !== id);
    setCategories(updated);
    saveMutation.mutate({ key: "site_categories", data: updated });
  };

  const togglePayment = (id: string) => {
    const updated = selectedPayments.includes(id) ? selectedPayments.filter(p => p !== id) : [...selectedPayments, id];
    setSelectedPayments(updated);
    saveMutation.mutate({ key: "payment_methods", data: updated });
  };

  const isLoading = loadingFooter || loadingHeaderLogo || loadingFooterLogo || loadingPayments || loadingTheme || loadingCats;

  if (isLoading) return <div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2"><Settings className="h-6 w-6" /> Panel SaaS PachaPay</h2>
          <p className="text-muted-foreground text-sm">Gestioná identidades corporativas y categorías del marketplace.</p>
        </div>
      </div>

      <Tabs defaultValue="identity" className="w-full">
        <TabsList className="flex h-auto w-full justify-start gap-1 bg-slate-100/50 p-1 overflow-x-auto border rounded-xl mb-4">
          <TabsTrigger value="identity" className="data-[state=active]:bg-white data-[state=active]:shadow-sm py-2 px-4 rounded-lg text-sm font-medium transition-all">Identidad Corporativa</TabsTrigger>
          <TabsTrigger value="categories" className="data-[state=active]:bg-white data-[state=active]:shadow-sm py-2 px-4 rounded-lg text-sm font-medium transition-all">Categorías</TabsTrigger>
          <TabsTrigger value="theme" className="data-[state=active]:bg-white data-[state=active]:shadow-sm py-2 px-4 rounded-lg text-sm font-medium transition-all">Colores</TabsTrigger>
          <TabsTrigger value="footer" className="data-[state=active]:bg-white data-[state=active]:shadow-sm py-2 px-4 rounded-lg text-sm font-medium transition-all">Footer</TabsTrigger>
          <TabsTrigger value="payments" className="data-[state=active]:bg-white data-[state=active]:shadow-sm py-2 px-4 rounded-lg text-sm font-medium transition-all">Pagos</TabsTrigger>
        </TabsList>

        <TabsContent value="identity" className="mt-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle className="text-sm">Logo Navbar (Superior)</CardTitle><CardDescription>Logo optimizado para la barra de navegación.</CardDescription></CardHeader>
              <CardContent>
                <div className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:bg-slate-50 group" onClick={() => headerLogoRef.current?.click()}>
                  <img src={resolveMediaUrl(headerLogo?.url) || "https://placehold.co/200x50?text=Logo+Navbar"} className="max-h-16 mx-auto mb-4 object-contain" />
                  <input type="file" ref={headerLogoRef} onChange={handleFileUpload("header_logo")} className="hidden" accept="image/*" />
                  <p className="text-xs text-primary font-semibold">Subir Logo Superior</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-sm">Logo Footer (Inferior)</CardTitle><CardDescription>Logo para el pie de página del sitio.</CardDescription></CardHeader>
              <CardContent>
                <div className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:bg-slate-50 group" onClick={() => footerLogoRef.current?.click()}>
                  <img src={resolveMediaUrl(footerLogo?.url) || "https://placehold.co/200x50?text=Logo+Footer"} className="max-h-16 mx-auto mb-4 object-contain" />
                  <input type="file" ref={footerLogoRef} onChange={handleFileUpload("footer_logo")} className="hidden" accept="image/*" />
                  <p className="text-xs text-primary font-semibold">Subir Logo Inferior</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="categories" className="mt-6">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Tag className="h-5 w-5" /> Gestor de Categorías</CardTitle></CardHeader>
            <CardContent className="space-y-6">
              <div className="flex flex-col sm:flex-row gap-4 p-4 border rounded-xl bg-slate-50/50">
                <div className="flex-1 space-y-2">
                  <Label>Nombre</Label>
                  <Input placeholder="Nueva categoría..." value={newCat.name} onChange={e => setNewCat({...newCat, name: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label>Ícono</Label>
                  <div className="flex gap-1 flex-wrap max-w-[200px]">
                    {CATEGORY_ICONS.map(i => (
                      <Button key={i.name} variant={newCat.icon === i.name ? "default" : "outline"} size="icon" className="h-8 w-8" onClick={() => setNewCat({...newCat, icon: i.name})}>
                        <i.icon className="h-4 w-4" />
                      </Button>
                    ))}
                  </div>
                </div>
                <div className="flex items-end"><Button onClick={handleAddCategory}><Plus className="h-4 w-4 mr-2" /> Añadir</Button></div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {categories.map(cat => {
                  const IconComp = CATEGORY_ICONS.find(i => i.name === cat.icon)?.icon || Tag;
                  return (
                    <div key={cat.id} className="flex items-center justify-between p-3 border rounded-lg hover:shadow-sm transition-shadow">
                      <div className="flex items-center gap-3"><IconComp className="h-4 w-4 text-primary" /><span className="text-sm font-medium">{cat.name}</span></div>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => removeCategory(cat.id)}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="theme" className="mt-6">
          <Card>
            <CardHeader><CardTitle>Personalización Visual</CardTitle></CardHeader>
            <CardContent className="space-y-8">
              <div className="flex justify-center gap-12">
                <div className="text-center space-y-2"><Label>Color Primario</Label><Input type="color" value={theme.primary} onChange={e => setTheme({...theme, primary: e.target.value})} className="h-12 w-24 cursor-pointer" /></div>
                <div className="text-center space-y-2"><Label>Color Navbar</Label><Input type="color" value={theme.navbar} onChange={e => setTheme({...theme, navbar: e.target.value})} className="h-12 w-24 cursor-pointer" /></div>
              </div>
              <div className="flex justify-center"><Button onClick={() => saveMutation.mutate({ key: "site_theme", data: theme })}><Save className="h-4 w-4 mr-2" /> Guardar Colores</Button></div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="footer" className="mt-6">
          <Card>
            <CardHeader><CardTitle>Información Corporativa</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2"><Label>Descripción</Label><Textarea rows={3} value={footerData.description} onChange={e => setFooterData({...footerData, description: e.target.value})} /></div>
              <div className="grid grid-cols-2 gap-4">
                <Input placeholder="Teléfono" value={footerData.phone} onChange={e => setFooterData({...footerData, phone: e.target.value})} />
                <Input placeholder="Email" value={footerData.email} onChange={e => setFooterData({...footerData, email: e.target.value})} />
                <Input placeholder="Dirección" value={footerData.address} onChange={e => setFooterData({...footerData, address: e.target.value})} />
                <Input placeholder="Horarios" value={footerData.hours} onChange={e => setFooterData({...footerData, hours: e.target.value})} />
              </div>
              
              <div className="space-y-4 pt-4 border-t">
                <Label className="text-sm font-bold uppercase text-muted-foreground">Redes Sociales (Links completas)</Label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex items-center gap-2">
                    <Facebook className="h-4 w-4 text-blue-600" />
                    <Input placeholder="URL Facebook" value={footerData.facebook} onChange={e => setFooterData({...footerData, facebook: e.target.value})} />
                  </div>
                  <div className="flex items-center gap-2">
                    <Instagram className="h-4 w-4 text-pink-600" />
                    <Input placeholder="URL Instagram" value={footerData.instagram} onChange={e => setFooterData({...footerData, instagram: e.target.value})} />
                  </div>
                  <div className="flex items-center gap-2">
                    <Twitter className="h-4 w-4 text-sky-500" />
                    <Input placeholder="URL Twitter / X" value={footerData.twitter} onChange={e => setFooterData({...footerData, twitter: e.target.value})} />
                  </div>
                  <div className="flex items-center gap-2">
                    <Youtube className="h-4 w-4 text-red-600" />
                    <Input placeholder="URL YouTube" value={footerData.youtube} onChange={e => setFooterData({...footerData, youtube: e.target.value})} />
                  </div>
                  <div className="flex items-center gap-2">
                    <Send className="h-4 w-4 text-sky-400" />
                    <Input placeholder="URL Telegram" value={footerData.telegram} onChange={e => setFooterData({...footerData, telegram: e.target.value})} />
                  </div>
                  <div className="flex items-center gap-2">
                    <MessageCircle className="h-4 w-4 text-green-500" />
                    <Input placeholder="URL/Número WhatsApp" value={footerData.whatsapp} onChange={e => setFooterData({...footerData, whatsapp: e.target.value})} />
                  </div>
                </div>
              </div>

              <Button onClick={() => saveMutation.mutate({ key: "footer_config", data: footerData })}><Save className="h-4 w-4 mr-2" /> Guardar Datos Corporativos</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments" className="mt-6">
          <Card>
            <CardHeader><CardTitle>Métodos de Pago</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
                {PAYMENT_METHODS.map(p => {
                  const isPachaPay = p.id === 'pachapay_visa';
                  const isSelected = selectedPayments.includes(p.id);
                  const isNew = 'isNew' in p && p.isNew;
                  
                  return (
                    <div 
                      key={p.id} 
                      className={cn(
                        "flex flex-col items-center p-4 border rounded-xl cursor-pointer transition-all relative overflow-hidden group",
                        isSelected ? "border-primary bg-primary/5 ring-1 ring-primary" : "hover:bg-slate-50",
                        isPachaPay && "bg-gradient-to-br from-orange-400 to-orange-600 border-orange-400 shadow-sm"
                      )} 
                      onClick={() => togglePayment(p.id)}
                    >
                      {isNew && (
                        <div className="absolute top-0 right-0 bg-white text-orange-600 text-[8px] font-black px-2 py-0.5 rounded-bl-lg animate-pulse uppercase shadow-sm">
                          Próximamente
                        </div>
                      )}
                      <div className={cn(
                        "h-10 w-14 bg-white rounded-md p-1 flex items-center justify-center mb-2 shadow-sm",
                        isPachaPay && "ring-2 ring-white/30"
                      )}>
                        <img src={p.icon} className="h-full w-full object-contain" />
                      </div>
                      <span className={cn(
                        "text-[10px] font-bold uppercase text-center",
                        isPachaPay ? "text-white" : "text-foreground"
                      )}>
                        {p.name}
                      </span>
                      {isPachaPay && (
                        <div className="absolute -bottom-1 -right-1 opacity-10 group-hover:opacity-20 transition-opacity">
                          <CreditCard className="h-12 w-12 text-white" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
