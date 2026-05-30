"use client";

import { Loader } from "@googlemaps/js-api-loader";
import type { BeachCardData } from "@/types/beach";
import { BeachPinContent } from "@/components/BeachPinContent";
import { scorePinFill } from "@/lib/beach-format";
import { useEffect, useRef, useState } from "react";
import { createRoot, type Root } from "react-dom/client";

const mapsLoader = new Loader({
  apiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY ?? "",
  version: "weekly"
});

const SESSION_LOCATION_KEY = "bajanbeach:userLocation";

function readCachedUserLocation(): { lat: number; lng: number } | null {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    const raw = sessionStorage.getItem(SESSION_LOCATION_KEY);
    if (!raw) {
      return null;
    }
    const o = JSON.parse(raw) as { lat?: unknown; lng?: unknown };
    if (
      typeof o.lat === "number" &&
      typeof o.lng === "number" &&
      Number.isFinite(o.lat) &&
      Number.isFinite(o.lng)
    ) {
      return { lat: o.lat, lng: o.lng };
    }
    return null;
  } catch {
    return null;
  }
}

function writeCachedUserLocation(lat: number, lng: number): void {
  sessionStorage.setItem(SESSION_LOCATION_KEY, JSON.stringify({ lat, lng }));
}

type Props = {
  beachCards: BeachCardData[];
  selectedBeach: BeachCardData | null;
  onBeachSelect: (beach: BeachCardData | null) => void;
};

export default function BeachMap({ beachCards, selectedBeach, onBeachSelect }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.marker.AdvancedMarkerElement[]>([]);
  const beachMarkerDisposersRef = useRef<Array<() => void>>([]);
  const prevFilteredCountRef = useRef<number | null>(null);
  const prevSingleSlugRef = useRef<string | null>(null);
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);
  const infoWindowRootRef = useRef<Root | null>(null);
  const onBeachSelectRef = useRef(onBeachSelect);
  const [mapInitialized, setMapInitialized] = useState(false);
  const mapFirstReadyRef = useRef(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const userMarkerRef = useRef<google.maps.marker.AdvancedMarkerElement | null>(null);

  useEffect(() => {
    onBeachSelectRef.current = onBeachSelect;
  }, [onBeachSelect]);

  useEffect(() => {
    setUserLocation(readCachedUserLocation());
  }, []);

  const cleanupInfoWindowDom = () => {
    if (infoWindowRootRef.current) {
      infoWindowRootRef.current.unmount();
      infoWindowRootRef.current = null;
    }
  };

  useEffect(() => {
    if (selectedBeach === null) {
      infoWindowRef.current?.close();
      cleanupInfoWindowDom();
    }
  }, [selectedBeach]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await mapsLoader.importLibrary("maps");
        await mapsLoader.importLibrary("marker");
        if (cancelled || !containerRef.current) {
          return;
        }
        if (!mapRef.current) {
          const rawMapId = process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID;
          const mapId = rawMapId?.trim();
          if (!mapId) {
            console.warn(
              "NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID is not set — advanced markers will not render. Set it in .env.local and restart the dev server."
            );
          }
          mapRef.current = new google.maps.Map(containerRef.current, {
            center: { lat: 13.1939, lng: -59.5432 },
            zoom: 11,
            ...(mapId ? { mapId } : {})
          });
        }
        const map = mapRef.current;

        if (!infoWindowRef.current) {
          const iw = new google.maps.InfoWindow();
          iw.addListener("closeclick", () => {
            cleanupInfoWindowDom();
            onBeachSelectRef.current(null);
          });
          infoWindowRef.current = iw;
        }

        beachMarkerDisposersRef.current.forEach((dispose) => dispose());
        beachMarkerDisposersRef.current = [];
        markersRef.current = [];
        const markers: google.maps.marker.AdvancedMarkerElement[] = [];
        const disposers: Array<() => void> = [];

        for (const beach of beachCards) {
          if (cancelled) {
            break;
          }
          const score = beach.conditions.swimScore;
          const pinOptions: google.maps.marker.PinElementOptions = {
            background: scorePinFill(score),
            borderColor: "#FFFFFF",
            glyphColor: "#FFFFFF",
            ...(score !== null ? { glyphText: String(score) } : {})
          };
          const pinElement = new google.maps.marker.PinElement(pinOptions);
          const marker = new google.maps.marker.AdvancedMarkerElement({
            map,
            position: { lat: beach.latitude, lng: beach.longitude },
            content: pinElement,
            gmpClickable: true
          });
          const onPinClick = (_ev: google.maps.marker.AdvancedMarkerClickEvent) => {
            const desktop = window.matchMedia("(min-width: 640px)").matches;
            onBeachSelectRef.current(beach);
            const iw = infoWindowRef.current;
            if (!iw) {
              return;
            }
            if (desktop) {
              cleanupInfoWindowDom();
              const div = document.createElement("div");
              const root = createRoot(div);
              infoWindowRootRef.current = root;
              root.render(<BeachPinContent beach={beach} layout="compact" />);
              iw.setContent(div);
              iw.open({ map, anchor: marker });
            } else {
              iw.close();
              cleanupInfoWindowDom();
            }
          };
          marker.addEventListener("gmp-click", onPinClick);
          disposers.push(() => {
            marker.removeEventListener("gmp-click", onPinClick);
            marker.map = null;
          });
          markers.push(marker);
        }
        markersRef.current = markers;
        beachMarkerDisposersRef.current = disposers;

        const len = beachCards.length;
        const prevCount = prevFilteredCountRef.current;
        if (len === 1) {
          const b = beachCards[0];
          const arrivedAtOne = prevCount !== 1;
          const slugChanged = prevSingleSlugRef.current !== b.slug;
          if (arrivedAtOne || slugChanged) {
            map.panTo({ lat: b.latitude, lng: b.longitude });
            map.setZoom(14);
          }
          prevSingleSlugRef.current = b.slug;
        } else {
          prevSingleSlugRef.current = null;
        }
        prevFilteredCountRef.current = len;

        if (!mapFirstReadyRef.current) {
          mapFirstReadyRef.current = true;
          setMapInitialized(true);
        }
      } catch (err) {
        console.warn(
          "Maps JavaScript API failed to load. Check the NEXT_PUBLIC_GOOGLE_MAPS_KEY restrictions in Google Cloud Console.",
          err
        );
      }
    })();
    return () => {
      cancelled = true;
      beachMarkerDisposersRef.current.forEach((dispose) => dispose());
      beachMarkerDisposersRef.current = [];
      markersRef.current = [];
    };
  }, [beachCards]);

  useEffect(() => {
    if (!mapInitialized || !mapRef.current) {
      return;
    }
    const map = mapRef.current;
    if (userMarkerRef.current) {
      userMarkerRef.current.map = null;
      userMarkerRef.current = null;
    }
    if (userLocation) {
      const wrap = document.createElement("div");
      wrap.style.position = "relative";
      wrap.style.width = "0";
      wrap.style.height = "0";
      const dot = document.createElement("div");
      dot.style.position = "absolute";
      dot.style.left = "50%";
      dot.style.top = "50%";
      dot.style.transform = "translate(-50%, -50%)";
      dot.style.width = "16px";
      dot.style.height = "16px";
      dot.style.borderRadius = "50%";
      dot.style.backgroundColor = "#4285F4";
      dot.style.border = "3px solid #FFFFFF";
      dot.style.boxShadow = "0 1px 3px rgba(0,0,0,0.35)";
      wrap.appendChild(dot);
      userMarkerRef.current = new google.maps.marker.AdvancedMarkerElement({
        map,
        position: userLocation,
        content: wrap,
        zIndex: 999
      });
    }
    return () => {
      if (userMarkerRef.current) {
        userMarkerRef.current.map = null;
        userMarkerRef.current = null;
      }
    };
  }, [userLocation, mapInitialized]);

  useEffect(() => {
    return () => {
      infoWindowRef.current?.close();
      cleanupInfoWindowDom();
      infoWindowRef.current = null;
      mapRef.current = null;
    };
  }, []);

  const requestUserLocation = () => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      console.warn("Geolocation is not available in this browser.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        writeCachedUserLocation(lat, lng);
        setUserLocation({ lat, lng });
      },
      (err) => {
        console.warn("Geolocation request failed", err);
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 0 }
    );
  };

  return (
    <div className="relative">
      {!userLocation ? (
        <button
          type="button"
          onClick={requestUserLocation}
          className="absolute bottom-8 left-3 z-10 rounded-full bg-white px-3 py-1.5 text-sm font-medium text-ocean-700 shadow-md ring-1 ring-slate-200 transition hover:bg-ocean-50"
        >
          Use my location
        </button>
      ) : null}
      <div ref={containerRef} className="h-[70vh] w-full overflow-hidden rounded-2xl" />
    </div>
  );
}
