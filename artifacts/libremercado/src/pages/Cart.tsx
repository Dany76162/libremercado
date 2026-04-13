import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Trash2, Plus, Minus, ShoppingBag, ArrowRight, ShoppingCart, CreditCard, Loader2, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCart } from "@/hooks/use-cart";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, CardElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { useQuery } from "@tanstack/react-query";
import { resolveMediaUrl } from "@/lib/apiBase";

function CheckoutForm({ 
  items,
  estimatedTotal,
  onSuccess, 
  onCancel 
}: { 
  items: Array<{ productId: string; quantity: number }>;
  estimatedTotal: number;
  onSuccess: (orderId: string) => void; 
  onCancel: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [serverTotal, setServerTotal] = useState<number | null>(null);

  const formatPrice = (value: number) => {
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!stripe || !elements) {
      return;
    }

    if (!address.trim()) {
      toast({
        title: "Error",
        description: "Por favor ingresa una dirección de envío",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);

    try {
      // Create order server-side (amount calculated on server)
      const orderResponse = await apiRequest("POST", "/api/checkout/create-order", {
        items: items.map(item => ({ productId: item.productId, quantity: item.quantity })),
        address,
        notes,
      });
      const { orderId, clientSecret, total } = await orderResponse.json();
      
      setServerTotal(total);

      const cardElement = elements.getElement(CardElement);
      if (!cardElement) {
        throw new Error("Card element not found");
      }

      const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: cardElement,
        },
      });

      if (error) {
        throw new Error(error.message);
      }

      if (paymentIntent?.status === "succeeded") {
        // Confirm payment on server
        await apiRequest("POST", "/api/checkout/confirm-payment", { orderId });
        
        toast({
          title: "Pago exitoso",
          description: "Tu pedido ha sido confirmado",
        });
        onSuccess(orderId);
      }
    } catch (error: any) {
      toast({
        title: "Error en el pago",
        description: error.message || "Hubo un problema procesando tu pago",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="address">Dirección de envío</Label>
          <Input
            id="address"
            placeholder="Ej: Av. Libertador 1234, Buenos Aires"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            required
            data-testid="input-checkout-address"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="notes">Notas (opcional)</Label>
          <Input
            id="notes"
            placeholder="Ej: Tocar timbre 2B, dejar en portería"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            data-testid="input-checkout-notes"
          />
        </div>
      </div>

      <Separator />

      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <CreditCard className="h-5 w-5 text-muted-foreground" />
          <Label>Datos de la tarjeta</Label>
        </div>
        
        <div className="p-4 border rounded-md bg-background">
          <CardElement
            options={{
              style: {
                base: {
                  fontSize: "16px",
                  color: "#424770",
                  "::placeholder": {
                    color: "#aab7c4",
                  },
                },
                invalid: {
                  color: "#9e2146",
                },
              },
            }}
          />
        </div>

        <p className="text-xs text-muted-foreground flex items-center gap-1">
          <Lock className="h-3 w-3" />
          Pago seguro procesado por Stripe
        </p>
      </div>

      <Separator />

      <div className="flex justify-between items-center font-bold text-lg">
        <span>Total a pagar</span>
        <span className="text-primary">{formatPrice(serverTotal ?? estimatedTotal)}</span>
      </div>

      <div className="flex gap-3">
        <Button
          type="button"
          variant="outline"
          className="flex-1"
          onClick={onCancel}
          disabled={isProcessing}
          data-testid="button-cancel-checkout"
        >
          Cancelar
        </Button>
        <Button
          type="submit"
          className="flex-1"
          disabled={!stripe || isProcessing}
          data-testid="button-pay"
        >
          {isProcessing ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Procesando...
            </>
          ) : (
            <>
              <CreditCard className="h-4 w-4 mr-2" />
              Pagar ahora
            </>
          )}
        </Button>
      </div>
    </form>
  );
}

export default function Cart() {
  const { items, removeItem, updateQuantity, clearCart, getTotal } = useCart();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [showCheckout, setShowCheckout] = useState(false);

  const { data: stripeConfig } = useQuery<{ publishableKey: string }>({
    queryKey: ["/api/stripe/config"],
  });

  const stripePromise = stripeConfig?.publishableKey 
    ? loadStripe(stripeConfig.publishableKey) 
    : null;

  const formatPrice = (value: number) => {
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const subtotal = getTotal();
  const shipping = items.length > 0 ? 500 : 0;
  const total = subtotal + shipping;

  const handleCheckoutSuccess = (orderId: string) => {
    clearCart();
    toast({
      title: "Pedido confirmado",
      description: "Gracias por tu compra. Pronto recibirás tu pedido.",
    });
    setLocation(`/order/${orderId}/tracking`);
  };

  if (items.length === 0) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center mx-auto mb-6">
            <ShoppingCart className="h-12 w-12 text-muted-foreground" />
          </div>
          <h1 className="text-2xl font-bold mb-2" data-testid="text-empty-cart">
            Tu carrito está vacío
          </h1>
          <p className="text-muted-foreground mb-6">
            Explora nuestros productos y agrega lo que necesites
          </p>
          <Link href="/explore">
            <Button data-testid="button-explore">
              <ShoppingBag className="h-4 w-4 mr-2" />
              Explorar productos
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  if (showCheckout && stripePromise) {
    return (
      <div className="min-h-screen max-w-xl mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold mb-6" data-testid="text-checkout-title">
          Finalizar compra
        </h1>
        
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Pago con tarjeta
            </CardTitle>
            <CardDescription>
              Ingresa los datos de tu tarjeta para completar la compra
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Elements stripe={stripePromise}>
              <CheckoutForm
                items={items.map(item => ({ productId: item.product.id, quantity: item.quantity }))}
                estimatedTotal={total}
                onSuccess={handleCheckoutSuccess}
                onCancel={() => setShowCheckout(false)}
              />
            </Elements>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen max-w-7xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold mb-6" data-testid="text-cart-title">
        Mi Carrito ({items.length} {items.length === 1 ? "producto" : "productos"})
      </h1>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          {items.map((item) => {
            const price = parseFloat(item.product.price);
            const itemTotal = price * item.quantity;

            return (
              <Card key={item.product.id} data-testid={`card-cart-item-${item.product.id}`}>
                <CardContent className="p-4">
                  <div className="flex gap-4">
                    <div className="w-24 h-24 rounded-md overflow-hidden bg-muted shrink-0">
                      {item.product.image ? (
                        <img
                          src={resolveMediaUrl(item.product.image) ?? item.product.image}
                          alt={item.product.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <ShoppingBag className="h-8 w-8 text-muted-foreground" />
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <h3
                        className="font-semibold line-clamp-2 mb-1"
                        data-testid={`text-cart-item-name-${item.product.id}`}
                      >
                        {item.product.name}
                      </h3>
                      <p className="text-sm text-muted-foreground mb-3">
                        {formatPrice(price)} c/u
                      </p>

                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() =>
                              updateQuantity(item.product.id, item.quantity - 1)
                            }
                            data-testid={`button-decrease-${item.product.id}`}
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <Input
                            type="number"
                            value={item.quantity}
                            onChange={(e) =>
                              updateQuantity(
                                item.product.id,
                                parseInt(e.target.value) || 1
                              )
                            }
                            className="w-16 h-8 text-center"
                            min={1}
                            data-testid={`input-quantity-${item.product.id}`}
                          />
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() =>
                              updateQuantity(item.product.id, item.quantity + 1)
                            }
                            data-testid={`button-increase-${item.product.id}`}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>

                        <div className="flex items-center gap-4">
                          <p
                            className="font-bold"
                            data-testid={`text-cart-item-total-${item.product.id}`}
                          >
                            {formatPrice(itemTotal)}
                          </p>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => removeItem(item.product.id)}
                            data-testid={`button-remove-${item.product.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}

          <div className="flex justify-end">
            <Button
              variant="ghost"
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={clearCart}
              data-testid="button-clear-cart"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Vaciar carrito
            </Button>
          </div>
        </div>

        <div className="lg:col-span-1">
          <Card className="sticky top-24">
            <CardHeader>
              <CardTitle>Resumen del pedido</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span data-testid="text-subtotal">{formatPrice(subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Envío</span>
                <span data-testid="text-shipping">
                  {shipping === 0 ? "Gratis" : formatPrice(shipping)}
                </span>
              </div>
              <Separator />
              <div className="flex justify-between font-bold text-lg">
                <span>Total</span>
                <span data-testid="text-total">{formatPrice(total)}</span>
              </div>
            </CardContent>
            <CardFooter className="flex-col gap-3">
              <Button
                className="w-full"
                size="lg"
                onClick={() => setShowCheckout(true)}
                disabled={!stripeConfig?.publishableKey}
                data-testid="button-checkout"
              >
                {stripeConfig?.publishableKey ? (
                  <>
                    Finalizar compra
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </>
                ) : (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Cargando...
                  </>
                )}
              </Button>
              <Link href="/explore" className="w-full">
                <Button variant="outline" className="w-full" data-testid="button-continue-shopping">
                  Seguir comprando
                </Button>
              </Link>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}
