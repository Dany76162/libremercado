import { ArrowRight, Bus, Clock, MapPin, Wifi, ExternalLink, ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useTravelOffers } from "@/hooks/use-marketplace";
import type { TravelOffer } from "@shared/schema";

function TravelOfferCard({ offer }: { offer: TravelOffer }) {
  const price = parseFloat(offer.price);
  const originalPrice = offer.originalPrice ? parseFloat(offer.originalPrice) : null;
  
  return (
    <Card className="hover-elevate overflow-hidden" data-testid={`card-travel-${offer.id}`}>
      <CardContent className="p-0">
        <div className="bg-gradient-to-r from-blue-500 to-cyan-400 p-3 text-white">
          <div className="flex items-center gap-2 mb-1">
            <Bus className="h-5 w-5" />
            <span className="font-bold text-sm">{offer.companyName}</span>
          </div>
          <div className="flex items-center gap-1 text-xs opacity-90">
            <MapPin className="h-3 w-3" />
            <span>{offer.origin}</span>
            <ArrowRight className="h-3 w-3" />
            <span className="font-medium">{offer.destination}</span>
          </div>
        </div>
        <div className="p-4">
          <div className="flex items-center justify-between mb-2">
            <div>
              <span className="text-2xl font-bold text-foreground">
                ${price.toLocaleString("es-AR")}
              </span>
              {originalPrice && (
                <span className="text-sm text-muted-foreground line-through ml-2">
                  ${originalPrice.toLocaleString("es-AR")}
                </span>
              )}
            </div>
            {offer.discount && (
              <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
                {offer.discount}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
            {offer.travelTime && (
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {offer.travelTime}
              </span>
            )}
            {offer.departureDate && (
              <span>{offer.departureDate}</span>
            )}
          </div>
          {offer.amenities && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground mb-3">
              <Wifi className="h-3 w-3" />
              <span>{offer.amenities}</span>
            </div>
          )}
          <a href={offer.externalLink} target="_blank" rel="noopener noreferrer">
            <Button className="w-full" size="sm" data-testid={`button-travel-book-${offer.id}`}>
              Ver en {offer.companyName}
              <ExternalLink className="h-3 w-3 ml-1" />
            </Button>
          </a>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Travel() {
  const { data: travelOffers, isLoading } = useTravelOffers();

  return (
    <div className="min-h-screen bg-muted/30">
      <section className="px-4 py-6 max-w-7xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <Link href="/">
            <Button variant="ghost" size="icon" data-testid="button-back-home">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-r from-blue-500 to-cyan-400 flex items-center justify-center">
              <Bus className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold" data-testid="text-page-title">
                Viajes en Micro
              </h1>
              <p className="text-sm text-muted-foreground">Ofertas de empresas de micros de larga distancia</p>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="h-64 rounded-lg" />
            ))}
          </div>
        ) : travelOffers && travelOffers.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {travelOffers.map((offer) => (
              <TravelOfferCard key={offer.id} offer={offer} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <Bus className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No hay ofertas de viajes disponibles en este momento</p>
          </div>
        )}
      </section>
    </div>
  );
}
