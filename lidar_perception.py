from collections import defaultdict, deque
from typing import List

import numpy as np


class LidarPerception:
    def __init__(self, eps: float = 0.28, min_samples: int = 2):
        self.eps = eps
        self.min_samples = min_samples

    def cluster_points(self, points: List[List[float]]):
        if len(points) < 2:
            return []
        arr = np.array(points, dtype=float)
        if arr.ndim != 2 or arr.shape[1] != 3:
            return []

        # Spatial hashing avoids the heavier scikit-learn dependency while
        # keeping neighborhood clustering practical on Raspberry Pi hardware.
        cell_size = self.eps
        cells = defaultdict(list)
        for index, point in enumerate(arr):
            cell = tuple(np.floor(point / cell_size).astype(int))
            cells[cell].append(index)

        visited = set()
        clusters = []
        for start in range(len(arr)):
            if start in visited:
                continue
            visited.add(start)
            queue = deque([start])
            cluster_indices = []
            while queue:
                current = queue.popleft()
                cluster_indices.append(current)
                point = arr[current]
                cell = tuple(np.floor(point / cell_size).astype(int))
                for dx in (-1, 0, 1):
                    for dy in (-1, 0, 1):
                        for dz in (-1, 0, 1):
                            for neighbor in cells.get((cell[0] + dx, cell[1] + dy, cell[2] + dz), []):
                                if neighbor not in visited and np.linalg.norm(arr[neighbor] - point) <= self.eps:
                                    visited.add(neighbor)
                                    queue.append(neighbor)

            if len(cluster_indices) < self.min_samples:
                continue
            cluster = arr[cluster_indices]
            centroid = cluster.mean(axis=0)
            size = float(np.max(np.linalg.norm(cluster - centroid, axis=1)))
            clusters.append({
                "centroid": centroid.tolist(),
                "size": size,
                "count": int(len(cluster)),
                "points": cluster.tolist(),
            })
        return clusters

    def detect_obstacles(self, points: List[List[float]], device_pos: List[float]):
        clusters = self.cluster_points(points)
        obstacles = []
        device = np.array(device_pos, dtype=float)
        for cluster in clusters:
            centroid = np.array(cluster["centroid"], dtype=float)
            to_device = device - centroid
            distance = float(np.linalg.norm(to_device))
            if distance < 1e-8:
                continue
            direction = to_device / distance
            score = 1.0 / (1.0 + distance) + min(1.0, cluster["size"] / 2.0)
            obstacles.append({
                "centroid": centroid.tolist(),
                "distance": distance,
                "size": cluster["size"],
                "count": cluster["count"],
                "direction": direction.tolist(),
                "risk_score": float(min(1.0, score)),
            })
        return sorted(obstacles, key=lambda o: o["distance"])

    def estimate_motion(self, current_points, previous_points, dt):
        if not previous_points or dt <= 0:
            return 0.0
        current = np.array(current_points, dtype=float)
        prev = np.array(previous_points, dtype=float)
        if current.size == 0 or prev.size == 0:
            return 0.0
        # project mean movement between current and previous point clouds
        mean_current = current.mean(axis=0)
        mean_prev = prev.mean(axis=0)
        delta = np.linalg.norm(mean_current - mean_prev)
        speed = delta / dt
        return float(speed)
