import "leaflet/dist/leaflet.css";

import { AlertTriangle, MapPin } from "lucide-react";
import { CircleMarker, MapContainer, Popup, TileLayer } from "react-leaflet";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import type { GeoPoint, LiveDataResult } from "@/lib/safecast-types";

export function LiveMap({
  result,
  loading,
}: {
  result?: LiveDataResult<GeoPoint>;
  loading?: boolean;
}) {
  if (loading) {
    return <Skeleton className="h-72 w-full" />;
  }

  if (!result || result.status === "unavailable") {
    return (
      <Alert variant="warning" className="min-h-72">
        <AlertTriangle className="mb-3 size-5" />
        <AlertTitle>Live map unavailable</AlertTitle>
        <AlertDescription>
          {result?.status === "unavailable"
            ? result.reason
            : "Search a location to load live OpenStreetMap data."}
        </AlertDescription>
      </Alert>
    );
  }

  const position: [number, number] = [result.data.latitude, result.data.longitude];

  return (
    <div className="h-72 overflow-hidden rounded-lg border">
      <MapContainer center={position} zoom={10} scrollWheelZoom={false} className="h-full w-full">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <CircleMarker center={position} radius={10} pathOptions={{ color: "#0284c7", fillOpacity: 0.55 }}>
          <Popup>
            <div className="max-w-60 text-sm">
              <div className="mb-1 flex items-center gap-1 font-medium">
                <MapPin className="size-3" />
                Live location
              </div>
              {result.data.name}
            </div>
          </Popup>
        </CircleMarker>
      </MapContainer>
    </div>
  );
}
