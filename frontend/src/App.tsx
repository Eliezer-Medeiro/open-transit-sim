import { useEffect, useRef, useState } from "react";
import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { RouteCalculationResponse, StopPoint } from "./types/transit";

const API_BASE_URL = "http://127.0.0.1:8000";
const STOP_INFRASTRUCTURE_COST = 5000;

export default function App() {
  const mapContainer = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);

  const [stops, setStops] = useState<StopPoint[]>([]);
  const [budget, setBudget] = useState<number>(1_000_000);
  const [routeStats, setRouteStats] = useState<RouteCalculationResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: "https://tiles.openfreemap.org/styles/liberty",
      center: [-54.6201, -20.4697], // [lon, lat] - Campo Grande / MS
      zoom: 13,
    });

    map.addControl(new maplibregl.NavigationControl(), "top-right");

    map.on("load", () => {
      map.addSource("active-bus-route", {
        type: "geojson",
        data: {
          type: "Feature",
          properties: {},
          geometry: { type: "LineString", coordinates: [] },
        },
      });

      map.addLayer({
        id: "active-bus-route-layer",
        type: "line",
        source: "active-bus-route",
        layout: { "line-join": "round", "line-cap": "round" },
        paint: {
          "line-color": "#10b981",
          "line-width": 5,
          "line-opacity": 0.9,
        },
      });
    });

    map.on("click", (event: { lngLat: { lat: any; lng: any; }; }) => {
      const { lat, lng } = event.lngLat;

      const marker = new maplibregl.Marker({ color: "#ef4444" })
        .setLngLat([lng, lat])
        .addTo(map);

      markersRef.current.push(marker);

      setStops((prev) => [
        ...prev,
        { id: crypto.randomUUID(), lat, lon: lng },
      ]);
      setBudget((prev) => prev - STOP_INFRASTRUCTURE_COST);
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (stops.length < 2) return;

    const calculateRoute = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`${API_BASE_URL}/calculate-route`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            stops: stops.map(({ lat, lon }) => ({ lat, lon })),
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          setError(data.detail || "Não foi possível calcular o trajeto.");
          return;
        }

        const routeData = data as RouteCalculationResponse;
        setRouteStats(routeData);

        const source = mapRef.current?.getSource("active-bus-route") as
          | maplibregl.GeoJSONSource
          | undefined;

        source?.setData({
          type: "Feature",
          properties: {},
          geometry: {
            type: "LineString",
            coordinates: routeData.coordinates,
          },
        });
      } catch {
        setError("Falha de conexão com o motor Python (porta 8000).");
      } finally {
        setLoading(false);
      }
    };

    calculateRoute();
  }, [stops]);

  const handleResetLine = () => {
    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];
    setStops([]);
    setRouteStats(null);
    setError(null);
    setBudget(1_000_000);

    const source = mapRef.current?.getSource("active-bus-route") as
      | maplibregl.GeoJSONSource
      | undefined;

    source?.setData({
      type: "Feature",
      properties: {},
      geometry: { type: "LineString", coordinates: [] },
    });
  };

  return (
    <div style={{ display: "flex", height: "100vh", width: "100vw", fontFamily: "system-ui, sans-serif" }}>
      <aside
        style={{
          width: "340px",
          padding: "24px",
          background: "#0f172a",
          color: "#f8fafc",
          display: "flex",
          flexDirection: "column",
          gap: "16px",
          boxSizing: "border-box",
        }}
      >
        <div>
          <h1 style={{ fontSize: "20px", margin: "0 0 6px 0" }}>Open Transit Sim</h1>
          <p style={{ fontSize: "13px", color: "#94a3b8", margin: 0 }}>
            Clique nas ruas do mapa para instalar pontos de parada e traçar sua primeira linha.
          </p>
        </div>

        <div style={{ background: "#1e293b", padding: "14px", borderRadius: "8px" }}>
          <span style={{ fontSize: "12px", color: "#94a3b8", textTransform: "uppercase" }}>
            Orçamento Municipal
          </span>
          <div style={{ fontSize: "24px", fontWeight: 700, color: budget >= 0 ? "#34d399" : "#f87171" }}>
            R$ {budget.toLocaleString("pt-BR")}
          </div>
        </div>

        <div style={{ background: "#1e293b", padding: "14px", borderRadius: "8px", fontSize: "14px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
            <span>Pontos instalados:</span>
            <strong>{stops.length}</strong>
          </div>

          {loading && <p style={{ color: "#38bdf8", margin: "8px 0 0 0" }}>Calculando rota...</p>}

          {routeStats && !loading && (
            <div style={{ borderTop: "1px solid #334155", paddingTop: "10px", marginTop: "8px", display: "grid", gap: "6px" }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>Extensão total:</span>
                <strong>{routeStats.distance_km} km</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>Tempo de percurso:</span>
                <strong>{routeStats.travel_time_min} min</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>Custo operacional/viagem:</span>
                <strong>R$ {routeStats.trip_cost.toFixed(2)}</strong>
              </div>
            </div>
          )}
        </div>

        {error && (
          <div style={{ background: "#450a0a", border: "1px solid #ef4444", color: "#fca5a5", padding: "10px", borderRadius: "6px", fontSize: "13px" }}>
            {error}
          </div>
        )}

        <button
          onClick={handleResetLine}
          style={{
            marginTop: "auto",
            padding: "10px",
            background: "#334155",
            color: "#f8fafc",
            border: "none",
            borderRadius: "6px",
            cursor: "pointer",
            fontWeight: 600,
          }}
        >
          Limpar Linha e Reiniciar
        </button>
      </aside>

      <main ref={mapContainer} style={{ flex: 1, height: "100%" }} />
    </div>
  );
}