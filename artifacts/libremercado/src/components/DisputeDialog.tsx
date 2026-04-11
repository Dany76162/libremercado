import { useState } from "react";
import { AlertTriangle, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { DisputeType } from "@shared/schema";

const DISPUTE_TYPES: { value: DisputeType; label: string }[] = [
  { value: "return", label: "Quiero devolver el producto" },
  { value: "not_received", label: "No recibí el pedido" },
  { value: "damaged", label: "El producto llegó dañado" },
  { value: "wrong_item", label: "Recibí un producto incorrecto" },
  { value: "other", label: "Otro motivo" },
];

interface DisputeDialogProps {
  orderId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DisputeDialog({ orderId, open, onOpenChange }: DisputeDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [type, setType] = useState<DisputeType | "">("");
  const [description, setDescription] = useState("");

  const mutation = useMutation({
    mutationFn: () =>
      apiRequest(`/api/orders/${orderId}/dispute`, {
        method: "POST",
        body: JSON.stringify({ type, description }),
      }),
    onSuccess: () => {
      toast({ title: "Disputa enviada", description: "Revisaremos tu caso pronto y te contactaremos." });
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/disputes"] });
      onOpenChange(false);
      setType("");
      setDescription("");
    },
    onError: (err: Error) => {
      toast({
        title: "Error",
        description: err.message || "No se pudo enviar la disputa",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = () => {
    if (!type || !description.trim()) return;
    mutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md" data-testid="dialog-dispute">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-destructive" />
            Abrir disputa
          </DialogTitle>
          <DialogDescription>
            Podés abrir una disputa si tuviste un problema con tu pedido. Te responderemos a la brevedad.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="dispute-type">Motivo de la disputa</Label>
            <Select
              value={type}
              onValueChange={(v) => setType(v as DisputeType)}
            >
              <SelectTrigger id="dispute-type" data-testid="select-dispute-type">
                <SelectValue placeholder="Seleccioná un motivo..." />
              </SelectTrigger>
              <SelectContent>
                {DISPUTE_TYPES.map((dt) => (
                  <SelectItem key={dt.value} value={dt.value} data-testid={`option-dispute-${dt.value}`}>
                    {dt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="dispute-description">Descripción del problema</Label>
            <Textarea
              id="dispute-description"
              placeholder="Describí con detalle qué pasó..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              maxLength={1000}
              data-testid="textarea-dispute-description"
            />
            <p className="text-xs text-muted-foreground text-right">{description.length}/1000</p>
          </div>

          <div className="flex items-start gap-2 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-3">
            <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
            <p className="text-xs text-amber-700 dark:text-amber-300">
              Las disputas son revisadas por nuestro equipo en un plazo de 48 a 72 horas hábiles.
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            data-testid="button-dispute-cancel"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!type || !description.trim() || mutation.isPending}
            variant="destructive"
            data-testid="button-dispute-submit"
          >
            {mutation.isPending ? "Enviando..." : "Enviar disputa"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
