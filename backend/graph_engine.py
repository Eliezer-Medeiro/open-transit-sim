import osmnx as ox
import networkx as nx

# Mantém cache local em disco para acelerar reinicializações
ox.settings.use_cache = True
ox.settings.log_console = False


class RoadNetworkEngine:
    def __init__(self, center_point: tuple[float, float], radius_meters: int = 3000):
        self.center_point = center_point
        self.radius_meters = radius_meters
        self.graph = self._load_graph()

    def _load_graph(self) -> nx.MultiDiGraph:
        G = ox.graph_from_point(
            self.center_point,
            dist=self.radius_meters,
            network_type="drive",
        )
        G = ox.routing.add_edge_speeds(G)
        G = ox.routing.add_edge_travel_times(G)
        return G

    def stats(self) -> dict:
        return {
            "nodes": len(self.graph.nodes),
            "edges": len(self.graph.edges),
            "center": self.center_point,
            "radius_meters": self.radius_meters,
        }

    def compute_bus_route(self, stops: list[tuple[float, float]]) -> dict:
        """
        Recebe uma lista de coordenadas (lat, lon) e retorna o trajeto completo
        pelas ruas reais, distância em km, tempo em minutos e custo por viagem.
        """
        full_coords: list[list[float]] = []
        total_distance_m = 0.0
        total_time_s = 0.0

        for i in range(len(stops) - 1):
            orig_lat, orig_lon = stops[i]
            dest_lat, dest_lon = stops[i + 1]

            # OSMnx usa X = longitude, Y = latitude
            orig_node = ox.distance.nearest_nodes(self.graph, orig_lon, orig_lat)
            dest_node = ox.distance.nearest_nodes(self.graph, dest_lon, dest_lat)

            route_nodes = nx.shortest_path(
                self.graph, orig_node, dest_node, weight="travel_time"
            )

            route_gdf = ox.routing.route_to_gdf(self.graph, route_nodes)
            total_distance_m += float(route_gdf["length"].sum())
            total_time_s += float(route_gdf["travel_time"].sum())

            for idx, node_id in enumerate(route_nodes):
                # Evita duplicar o nó de conexão entre trechos consecutivos
                if i > 0 and idx == 0:
                    continue
                node_data = self.graph.nodes[node_id]
                full_coords.append([node_data["x"], node_data["y"]])

        distance_km = round(total_distance_m / 1000, 2)
        travel_time_min = round(total_time_s / 60, 1)
        trip_cost = round(distance_km * 4.50, 2)

        return {
            "coordinates": full_coords,
            "distance_km": distance_km,
            "travel_time_min": travel_time_min,
            "trip_cost": trip_cost,
        }