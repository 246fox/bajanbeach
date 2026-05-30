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

/** Logical bottom-end (LTR: bottom-right). Fallback if enum missing in a given API/types combo. */
function getLocateMapControlPosition(): google.maps.ControlPosition {
  const CP = google.maps.ControlPosition as unknown as Record<string, google.maps.ControlPosition>;
  const logical = CP.INLINE_END_BLOCK_END;
  if (logical !== undefined) {
    return logical;
  }
  return CP.BOTTOM_RIGHT;
}

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
  const locateControlContainerRef = useRef<HTMLDivElement | null>(null);
  const locateControlPositionRef = useRef<google.maps.ControlPosition | null>(null);
  const requestUserLocationRef = useRef<() => void>(() => {});

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
    const el = locateControlContainerRef.current;
    if (!el) {
      return;
    }
    el.style.display = userLocation ? "none" : "";
  }, [userLocation, mapInitialized]);

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

          const position = getLocateMapControlPosition();
          locateControlPositionRef.current = position;

          const outer = document.createElement("div");
          outer.style.boxSizing = "border-box";
          outer.style.margin = "10px";

          const btn = document.createElement("button");
          btn.type = "button";
          btn.setAttribute("aria-label", "Use my location");
          btn.title = "Use my location";
          btn.style.boxSizing = "border-box";
          btn.style.width = "40px";
          btn.style.height = "40px";
          btn.style.display = "flex";
          btn.style.alignItems = "center";
          btn.style.justifyContent = "center";
          btn.style.cursor = "pointer";
          btn.style.background = "#ffffff";
          btn.style.border = "none";
          btn.style.borderRadius = "2px";
          btn.style.boxShadow = "0 1px 4px rgba(0,0,0,0.3)";
          btn.style.color = "#0f766e";
          btn.style.padding = "0";
          btn.addEventListener("mouseenter", () => {
            btn.style.background = "#f0fdfa";
          });
          btn.addEventListener("mouseleave", () => {
            btn.style.background = "#ffffff";
          });
          btn.addEventListener("click", () => {
            requestUserLocationRef.current();
          });

          const svgNs = "http://www.w3.org/2000/svg";
          const svg = document.createElementNS(svgNs, "svg");
          svg.setAttribute("viewBox", "0 0 24 24");
          svg.setAttribute("width", "22");
          svg.setAttribute("height", "22");
          svg.setAttribute("aria-hidden", "true");
          const ring = document.createElementNS(svgNs, "circle");
          ring.setAttribute("cx", "12");
          ring.setAttribute("cy", "12");
          ring.setAttribute("r", "6");
          ring.setAttribute("fill", "none");
          ring.setAttribute("stroke", "currentColor");
          ring.setAttribute("stroke-width", "1.5");
          const centerDot = document.createElementNS(svgNs, "circle");
          centerDot.setAttribute("cx", "12");
          centerDot.setAttribute("cy", "12");
          centerDot.setAttribute("r", "2");
          centerDot.setAttribute("fill", "currentColor");
          const ticks = document.createElementNS(svgNs, "path");
          ticks.setAttribute(
            "d",
            "M12 2v4M12 18v4M2 12h4M18 12h4"
          );
          ticks.setAttribute("fill", "none");
          ticks.setAttribute("stroke", "currentColor");
          ticks.setAttribute("stroke-width", "1.5");
          ticks.setAttribute("stroke-linecap", "round");
          svg.appendChild(ring);
          svg.appendChild(centerDot);
          svg.appendChild(ticks);
          btn.appendChild(svg);
          outer.appendChild(btn);

          locateControlContainerRef.current = outer;
          mapRef.current.controls[position].push(outer);
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

  requestUserLocationRef.current = requestUserLocation;

  useEffect(() => {
    return () => {
      const map = mapRef.current;
      const el = locateControlContainerRef.current;
      const position = locateControlPositionRef.current;
      if (map && el && position !== null) {
        const slot = map.controls[position] as google.maps.MVCArray<HTMLElement>;
        const index = slot.getArray().indexOf(el);
        if (index !== -1) {
          slot.removeAt(index);
        }
      }
      locateControlContainerRef.current = null;
      locateControlPositionRef.current = null;

      infoWindowRef.current?.close();
      cleanupInfoWindowDom();
      infoWindowRef.current = null;
      mapRef.current = null;
    };
  }, []);

  return <div ref={containerRef} className="h-[70vh] w-full overflow-hidden rounded-2xl" />;
}
