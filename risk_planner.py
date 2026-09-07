import math
import numpy as np


class RiskPlanner:
    def __init__(self):
        self.max_risk = 1.0

    def plan_move(self, obstacles, device_pos, sleep_detected=False):
        move = np.array([0.0, 0.0, 0.0], dtype=float)
        risk = 0.0

        if not obstacles:
            # if sleeping, keep in place
            if sleep_detected:
                return [0.0, 0.0, 0.0], 0.0, "idle_sleep"
            return [0.0, 0.0, 0.0], 0.0, "clear"

        for obs in obstacles:
            centroid = np.array(obs.get("centroid", [0.0, 0.0, 0.0]), dtype=float)
            distance = float(obs.get("distance", 999.0))
            direction = np.array(obs.get("direction", [0.0, 0.0, 0.0]), dtype=float)
            size = float(obs.get("size", 0.0))
            weight = 1.0 / (distance + 0.3)
            risk += weight * (0.7 + min(0.8, size / 3.0))
            move += direction * (weight * 0.8)

        move = move / (np.linalg.norm(move) + 1e-8)
        risk = min(self.max_risk, risk)

        if sleep_detected:
            return [0.0, 0.0, 0.0], risk, "sleep_hold"

        if risk > 0.7:
            return move.tolist(), risk, "avoid_obstacle"
        return [0.2, 0.0, 0.0], risk, "safe_nudge"
