import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Store, Truck, MapPin } from "lucide-react";

const storeIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-orange.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const riderIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const deliveryIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

interface OrderTrackingMapProps {
  storeLat?: number;
  storeLng?: number;
  deliveryLat?: number;
  deliveryLng?: number;
  riderLat?: number;
  riderLng?: number;
  storeName?: string;
  deliveryAddress?: string;
  status?: string;
}

function MapBounds({ positions }: { positions: [number, number][] }) {
  const map = useMap();

  useEffect(() => {
    if (positions.length > 0) {
      const bounds = L.latLngBounds(positions);
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [map, positions]);

  return null;
}

export function OrderTrackingMap({
  storeLat,
  storeLng,
  deliveryLat,
  deliveryLng,
  riderLat,
  riderLng,
  storeName = "Tienda",
  deliveryAddress = "Dirección de entrega",
  status,
}: OrderTrackingMapProps) {
  const defaultCenter: [number, number] = [-34.6037, -58.3816];

  const positions: [number, number][] = [];
  if (storeLat && storeLng) positions.push([storeLat, storeLng]);
  if (deliveryLat && deliveryLng) positions.push([deliveryLat, deliveryLng]);
  if (riderLat && riderLng) positions.push([riderLat, riderLng]);

  const center = positions.length > 0 ? positions[0] : defaultCenter;

  const routePositions: [number, number][] = [];
  if (storeLat && storeLng) routePositions.push([storeLat, storeLng]);
  if (riderLat && riderLng) routePositions.push([riderLat, riderLng]);
  if (deliveryLat && deliveryLng) routePositions.push([deliveryLat, deliveryLng]);

  return (
    <div className="relative w-full h-[400px] rounded-lg overflow-hidden border" data-testid="map-order-tracking">
      <MapContainer
        center={center}
        zoom={14}
        style={{ height: "100%", width: "100%" }}
        scrollWheelZoom={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {positions.length > 0 && <MapBounds positions={positions} />}

        {storeLat && storeLng && (
          <Marker position={[storeLat, storeLng]} icon={storeIcon}>
            <Popup>
              <div className="flex items-center gap-2">
                <Store className="h-4 w-4" />
                <span className="font-medium">{storeName}</span>
              </div>
            </Popup>
          </Marker>
        )}

        {riderLat && riderLng && status === "in_transit" && (
          <Marker position={[riderLat, riderLng]} icon={riderIcon}>
            <Popup>
              <div className="flex items-center gap-2">
                <Truck className="h-4 w-4" />
                <span className="font-medium">Repartidor en camino</span>
              </div>
            </Popup>
          </Marker>
        )}

        {deliveryLat && deliveryLng && (
          <Marker position={[deliveryLat, deliveryLng]} icon={deliveryIcon}>
            <Popup>
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                <span className="font-medium">{deliveryAddress}</span>
              </div>
            </Popup>
          </Marker>
        )}

        {routePositions.length > 1 && (
          <Polyline
            positions={routePositions}
            color="#FF4500"
            weight={3}
            opacity={0.7}
            dashArray="10, 10"
          />
        )}
      </MapContainer>

      <div className="absolute bottom-4 left-4 bg-background/90 backdrop-blur-sm rounded-lg p-3 shadow-lg z-[1000]">
        <div className="flex flex-col gap-2 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-orange-500" />
            <span>Tienda</span>
          </div>
          {status === "in_transit" && (
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-blue-500" />
              <span>Repartidor</span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500" />
            <span>Entrega</span>
          </div>
        </div>
      </div>
    </div>
  );
}
