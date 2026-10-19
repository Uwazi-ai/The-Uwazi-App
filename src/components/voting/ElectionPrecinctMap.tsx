import { useEffect, useRef } from "react";
import L from "leaflet";
import type { FeatureCollection } from "geojson";
import "leaflet/dist/leaflet.css";
import shapes from "@/data/kceb-precinct-map.json";
import "./election-map.css";

export default function ElectionPrecinctMap({ selected, onSelect }: { selected: string | null; onSelect: (key: string) => void }) {
  const container = useRef<HTMLDivElement>(null);
  const layers = useRef<L.GeoJSON | null>(null);
  const map = useRef<L.Map | null>(null);
  const select = useRef(onSelect);
  select.current = onSelect;

  useEffect(() => {
    if (!container.current) return;
    const host = container.current;
    const instance = L.map(host, { scrollWheelZoom: false, zoomControl: true });
    map.current = instance;
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>', maxZoom: 19,
    }).addTo(instance);
    const colors = getComputedStyle(host);
    const normal = colors.getPropertyValue("--election-map-boundary").trim();
    const active = colors.getPropertyValue("--election-map-selected").trim();
    const geo = L.geoJSON(shapes as FeatureCollection, {
      style: { color: normal, weight: 1, fillOpacity: 0.12 },
      onEachFeature: (feature, layer) => {
        const key = String(feature.properties?.precinct_key ?? "");
        layer.bindTooltip(`Precinct ${key}`);
        layer.on("click", () => select.current(key));
      },
    }).addTo(instance);
    layers.current = geo;
    instance.fitBounds(geo.getBounds(), { padding: [12, 12] });
    const observer = new ResizeObserver(() => instance.invalidateSize());
    observer.observe(host);
    host.dataset.normal = normal;
    host.dataset.active = active;
    return () => { observer.disconnect(); instance.remove(); map.current = null; layers.current = null; };
  }, []);

  useEffect(() => {
    const host = container.current;
    const geo = layers.current;
    if (!host || !geo || !map.current) return;
    const bounds = L.latLngBounds([]);
    geo.eachLayer(layer => {
      if (!(layer instanceof L.Polygon)) return;
      const chosen = layer.feature?.properties?.precinct_key === selected;
      layer.setStyle({ color: chosen ? host.dataset.active : host.dataset.normal, weight: chosen ? 3 : 1, fillOpacity: chosen ? 0.4 : 0.12 });
      if (chosen) bounds.extend(layer.getBounds());
    });
    if (bounds.isValid()) map.current.fitBounds(bounds, { padding: [40, 40], maxZoom: 15, animate: false });
  }, [selected]);

  return <div ref={container} className="election-precinct-map" role="region" aria-label="Kansas City Election Board precinct map" />;
}