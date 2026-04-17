import { useState } from "react";
import { Users, ShieldCheck, Mail, Phone, Calendar } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@tanstack/react-query";
import type { User } from "@shared/schema";

export function AdminUsersTab() {
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [kycFilter, setKycFilter] = useState("all");

  const { data: users, isLoading } = useQuery<User[]>({ 
    queryKey: ["/api/admin/users"] 
  });

  const filtered = (users ?? []).filter((u) => {
    const matchesSearch = u.username.toLowerCase().includes(search.toLowerCase()) || 
                         u.email.toLowerCase().includes(search.toLowerCase());
    const matchesRole = roleFilter === "all" || u.role === roleFilter;
    const matchesKyc = kycFilter === "all" || u.kycStatus === kycFilter;
    return matchesSearch && matchesRole && matchesKyc;
  });

  const ROLE_LABELS: Record<string, string> = {
    customer: "Cliente",
    merchant: "Comercio",
    rider: "Repartidor",
    admin: "Admin",
    official: "Oficial",
  };

  const ROLE_VARIANTS: Record<string, "default" | "secondary" | "outline"> = {
    admin: "default",
    merchant: "secondary",
    official: "default",
    rider: "outline",
    customer: "outline",
  };

  const KYC_LABELS: Record<string, string> = {
    none: "Sin Iniciar",
    pending: "Pendiente",
    approved: "Verificado",
    rejected: "Rechazado",
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4 flex-wrap">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Gestión de Usuarios
          </CardTitle>
          <CardDescription>
            {isLoading ? "Cargando..." : `${filtered.length} usuarios encontrados`}
          </CardDescription>
        </div>
        <div className="flex items-center gap-2">
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-32 h-8 text-xs">
              <SelectValue placeholder="Rol" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos Roles</SelectItem>
              <SelectItem value="customer">Clientes</SelectItem>
              <SelectItem value="merchant">Comercios</SelectItem>
              <SelectItem value="rider">Repartidores</SelectItem>
              <SelectItem value="admin">Administradores</SelectItem>
            </SelectContent>
          </Select>

          <Select value={kycFilter} onValueChange={setKycFilter}>
            <SelectTrigger className="w-32 h-8 text-xs">
              <SelectValue placeholder="KYC" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todo KYC</SelectItem>
              <SelectItem value="approved">Verificados</SelectItem>
              <SelectItem value="pending">Pendientes</SelectItem>
              <SelectItem value="none">Sin Iniciar</SelectItem>
            </SelectContent>
          </Select>

          <Input
            placeholder="Buscar por nombre o email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-48 h-8"
          />
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {isLoading ? (
          <div className="p-6 space-y-4">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuario</TableHead>
                  <TableHead>Contacto</TableHead>
                  <TableHead>Rol</TableHead>
                  <TableHead>Verificación (KYC)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-bold uppercase">
                          {u.username.substring(0, 2)}
                        </div>
                        <span className="font-medium text-sm flex items-center gap-1">
                          {u.username}
                          {u.kycStatus === "approved" && <ShieldCheck className="h-3.5 w-3.5 text-blue-500" />}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-0.5">
                        <p className="text-xs flex items-center gap-1.5 text-muted-foreground">
                          <Mail className="h-3 w-3" /> {u.email}
                        </p>
                        {u.phone && (
                          <p className="text-xs flex items-center gap-1.5 text-muted-foreground">
                            <Phone className="h-3 w-3" /> {u.phone}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={ROLE_VARIANTS[u.role] || "outline"} className="text-[10px] uppercase">
                        {ROLE_LABELS[u.role] || u.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Badge 
                          variant={u.kycStatus === "approved" ? "default" : u.kycStatus === "pending" ? "secondary" : "outline"}
                          className={`text-[10px] ${u.kycStatus === "approved" ? "bg-blue-100 text-blue-700 hover:bg-blue-100 border-blue-200" : ""}`}
                        >
                          {KYC_LABELS[u.kycStatus] || u.kycStatus}
                        </Badge>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
