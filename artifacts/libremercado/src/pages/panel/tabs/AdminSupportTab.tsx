import { Headphones, Clock, Activity, CheckCircle, Users, Package, Store, DollarSign } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export function AdminSupportTab() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: "Tickets Abiertos", value: "0", color: "text-orange-600", bg: "bg-orange-100 dark:bg-orange-900/20", icon: <Clock className="h-5 w-5 text-orange-600" /> },
          { label: "En Proceso", value: "0", color: "text-blue-600", bg: "bg-blue-100 dark:bg-blue-900/20", icon: <Activity className="h-5 w-5 text-blue-600" /> },
          { label: "Resueltos Hoy", value: "0", color: "text-green-600", bg: "bg-green-100 dark:bg-green-900/20", icon: <CheckCircle className="h-5 w-5 text-green-600" /> },
          { label: "Tiempo Promedio", value: "-", color: "", bg: "bg-muted", icon: <Headphones className="h-5 w-5 text-muted-foreground" /> },
        ].map(({ label, value, color, bg, icon }) => (
          <Card key={label}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className={`text-2xl font-bold ${color}`}>{value}</p>
                </div>
                <div className={`w-10 h-10 rounded-full ${bg} flex items-center justify-center`}>{icon}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Headphones className="h-5 w-5" />
            Centro de Soporte
          </CardTitle>
          <CardDescription>Gestiona las consultas y reclamos de usuarios, comerciantes y repartidores</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <Headphones className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No hay tickets pendientes</h3>
            <p className="text-muted-foreground mb-4">Cuando los usuarios envien consultas apareceran aqui</p>
            <p className="text-sm text-muted-foreground">Los usuarios pueden contactar soporte a: soporte@pachapay.com</p>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>Categorias de Soporte</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {["Problemas con pedidos", "Problemas de pago", "Consultas de comerciantes", "Consultas de repartidores", "Otros"].map((cat) => (
                <div key={cat} className="flex items-center justify-between p-3 border rounded-md">
                  <span>{cat}</span>
                  <Badge variant="outline">0</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Acciones Rapidas</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              <Button variant="outline" className="w-full" data-testid="button-search-user"><Users className="h-4 w-4 mr-2" />Buscar usuario por email</Button>
              <Button variant="outline" className="w-full" data-testid="button-search-order"><Package className="h-4 w-4 mr-2" />Buscar pedido por ID</Button>
              <Button variant="outline" className="w-full" data-testid="button-store-claims"><Store className="h-4 w-4 mr-2" />Ver reclamos de tienda</Button>
              <Button variant="outline" className="w-full" data-testid="button-process-refund"><DollarSign className="h-4 w-4 mr-2" />Procesar reembolso</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
