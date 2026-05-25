"use client";

import { Loader } from "@googlemaps/js-api-loader";
import type { BeachCardData } from "@/types/beach";
import { useEffect, useRef } from "react";

const mapsLoader = new Loader({
  apiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY ?? "",
  version: "weekly"
});

export default function BeachMap({ beachCards }: { beachCards: BeachCardData[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await mapsLoader.load();
        if (cancelled || !containerRef.current) {
          return;
        }
        if (!mapRef.current) {
          mapRef.current = new google.maps.Map(containerRef.current, {
            center: { lat: 13.1939, lng: -59.5432 },
            zoom: 11
          });
        }
        const map = mapRef.current;
        markersRef.current.forEach((m) => m.setMap(null));
        markersRef.current = [];
        const markers: google.maps.Marker[] = [];
        for (const beach of beachCards) {
          if (cancelled) {
            break;
          }
          markers.push(
            new google.maps.Marker({
              map,
              position: { lat: beach.latitude, lng: beach.longitude }
            })
          );
        }
        markersRef.current = markers;
      } catch (err) {
        console.warn(
          "Maps JavaScript API failed to load. Check the NEXT_PUBLIC_GOOGLE_MAPS_KEY restrictions in Google Cloud Console.",
          err
        );
      }
    })();
    return () => {
      cancelled = true;
      markersRef.current.forEach((m) => m.setMap(null));
      markersRef.current = [];
    };
  }, [beachCards]);

  useEffect(() => {
    return () => {
      mapRef.current = null;
    };
  }, []);

  return (
    <div ref={containerRef} className="h-[70vh] w-full overflow-hidden rounded-2xl" />
  );
}
