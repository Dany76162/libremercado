import { useState } from "react";
import { useLocation, Link } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Lock, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Logo } from "@/components/brand/Logo";
import { apiRequest } from "@/lib/queryClient";

const schema = z.object({
  newPassword: z.string().min(6, "Mínimo 6 caracteres"),
  confirmPassword: z.string(),
}).refine((d) => d.newPassword === d.confirmPassword, {
  message: "Las contraseñas no coinciden",
  path: ["confirmPassword"],
});
type FormData = z.infer<typeof schema>;

export default function ResetPassword() {
  const [location] = useLocation();
  const token = new URLSearchParams(location.split("?")[1] ?? "").get("token") ?? "";
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { newPassword: "", confirmPassword: "" },
  });

  const onSubmit = async (data: FormData) => {
    if (!token) {
      setErrorMsg("Token inválido. Volvé a solicitar el enlace de recuperación.");
      setStatus("error");
      return;
    }
    try {
      setStatus("loading");
      await apiRequest("POST", "/api/auth/reset-password", { token, newPassword: data.newPassword });
      setStatus("success");
    } catch (err: any) {
      setErrorMsg(err.message ?? "Token inválido o expirado");
      setStatus("error");
    }
  };

  return (
    <div className="min-h-[calc(100vh-200px)] flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-4">
          <div className="flex justify-center">
            <Logo />
          </div>
          <CardTitle className="text-2xl">Nueva contraseña</CardTitle>
          <CardDescription>Ingresá tu nueva contraseña para recuperar el acceso</CardDescription>
        </CardHeader>
        <CardContent>
          {status === "success" ? (
            <div className="text-center space-y-4">
              <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
              <p className="font-medium">Contraseña actualizada correctamente</p>
              <p className="text-sm text-muted-foreground">Ya podés iniciar sesión con tu nueva contraseña.</p>
              <Link href="/auth">
                <Button className="w-full" data-testid="button-go-login">
                  Ir al inicio de sesión
                </Button>
              </Link>
            </div>
          ) : status === "error" ? (
            <div className="text-center space-y-4">
              <AlertCircle className="h-16 w-16 text-destructive mx-auto" />
              <p className="font-medium">Ocurrió un error</p>
              <p className="text-sm text-muted-foreground">{errorMsg}</p>
              <Link href="/forgot-password">
                <Button variant="outline" className="w-full" data-testid="button-try-again">
                  Solicitar nuevo enlace
                </Button>
              </Link>
            </div>
          ) : (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="newPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nueva contraseña</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input
                            {...field}
                            type="password"
                            placeholder="Mínimo 6 caracteres"
                            className="pl-10"
                            data-testid="input-new-password"
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirmar contraseña</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input
                            {...field}
                            type="password"
                            placeholder="Repetí la contraseña"
                            className="pl-10"
                            data-testid="input-confirm-password"
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button
                  type="submit"
                  className="w-full"
                  disabled={status === "loading"}
                  data-testid="button-reset-password"
                >
                  {status === "loading" ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Actualizando...
                    </>
                  ) : (
                    "Actualizar contraseña"
                  )}
                </Button>
              </form>
            </Form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
