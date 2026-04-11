import { Settings } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export function AdminSettingsTab() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Configuracion de la Plataforma
        </CardTitle>
        <CardDescription>Ajusta la configuracion general de PachaPay</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground text-center py-8">Configuracion del sistema disponible proximamente</p>
      </CardContent>
    </Card>
  );
}
