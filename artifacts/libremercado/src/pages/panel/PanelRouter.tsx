import { Redirect } from "wouter";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { RoleGate } from "@/components/guards/RoleGate";
import MerchantPanel from "./MerchantPanel";
import RiderPanel from "./RiderPanel";
import AdminPanel from "./AdminPanel";

export default function PanelRouter() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) {
    return <Redirect to="/account" />;
  }

  switch (user.role) {
    case "merchant":
      return (
        <RoleGate allowedRoles={["merchant", "admin"]}>
          <MerchantPanel />
        </RoleGate>
      );
    case "rider":
      return (
        <RoleGate allowedRoles={["rider", "admin"]}>
          <RiderPanel />
        </RoleGate>
      );
    case "admin":
      return (
        <RoleGate allowedRoles={["admin"]}>
          <AdminPanel />
        </RoleGate>
      );
    default:
      return <Redirect to="/" />;
  }
}
