import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { apiUrl } from "@/lib/apiBase";
import type { Review } from "@shared/schema";

interface ReviewDialogProps {
  orderId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ReviewDialog({ orderId, open, onOpenChange }: ReviewDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [comment, setComment] = useState("");

  const { data: reviewState } = useQuery<{ canReview: boolean; review: Review | null }>({
    queryKey: ["/api/orders", orderId, "review"],
    queryFn: async () => {
      const res = await fetch(apiUrl(`/api/orders/${orderId}/review`), { credentials: "include" });
      return res.json();
    },
    enabled: open && !!orderId,
  });

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/orders/${orderId}/review`, { rating, comment });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Reseña enviada, muchas gracias" });
      queryClient.invalidateQueries({ queryKey: ["/api/orders", orderId, "review"] });
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({ title: "Error al enviar reseña", description: error.message, variant: "destructive" });
    },
  });

  const alreadyReviewed = reviewState?.review;
  const existingRating = reviewState?.review?.rating ?? 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="dialog-review">
        <DialogHeader>
          <DialogTitle>{alreadyReviewed ? "Tu reseña" : "Calificar pedido"}</DialogTitle>
        </DialogHeader>

        {alreadyReviewed ? (
          <div className="space-y-3">
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star
                  key={s}
                  className={`h-7 w-7 ${s <= existingRating ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"}`}
                />
              ))}
            </div>
            {reviewState?.review?.comment && (
              <p className="text-muted-foreground text-sm">{reviewState.review.comment}</p>
            )}
            <p className="text-xs text-muted-foreground">Ya enviaste tu reseña para este pedido.</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium mb-2">Puntaje</p>
              <div className="flex gap-1" data-testid="star-rating">
                {[1, 2, 3, 4, 5].map((s) => (
                  <button
                    key={s}
                    type="button"
                    className="p-0.5 transition-transform hover:scale-110"
                    onMouseEnter={() => setHovered(s)}
                    onMouseLeave={() => setHovered(0)}
                    onClick={() => setRating(s)}
                    data-testid={`star-${s}`}
                  >
                    <Star
                      className={`h-8 w-8 ${
                        s <= (hovered || rating)
                          ? "fill-yellow-400 text-yellow-400"
                          : "text-muted-foreground"
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-sm font-medium mb-2">Comentario (opcional)</p>
              <Textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Contanos tu experiencia..."
                maxLength={500}
                rows={3}
                className="resize-none"
                data-testid="textarea-review-comment"
              />
              <p className="text-xs text-muted-foreground text-right mt-1">{comment.length}/500</p>
            </div>
          </div>
        )}

        {!alreadyReviewed && (
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button
              onClick={() => mutation.mutate()}
              disabled={rating === 0 || mutation.isPending}
              data-testid="button-submit-review"
            >
              {mutation.isPending ? "Enviando..." : "Enviar reseña"}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
