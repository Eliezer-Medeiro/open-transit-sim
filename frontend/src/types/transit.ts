export interface StopPoint {
  id: string;
  lat: number;
  lon: number;
}

export interface RouteCalculationResponse {
  coordinates: [number, number][];
  distance_km: number;
  travel_time_min: number;
  trip_cost: number;
}