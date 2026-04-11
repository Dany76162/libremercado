import { Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";

interface PlatformStats {
  users: { total: number };
}

export function AdminUsersTab() {
  const { data: stats } = useQuery<PlatformStats>({ queryKey: ["/api/admin/stats"] });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Gestion de Usuarios
        </CardTitle>
        <CardDescription>Administra todos los usuarios de la plataforma</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground text-center py-8">
          {stats?.users.total || 0} usuarios registrados en la plataforma
        </p>
      </CardContent>
    </Card>
  );
}
