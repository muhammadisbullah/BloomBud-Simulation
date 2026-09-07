#!/usr/bin/env python3
"""
Simple WebSocket AI server for BloomBud simulation.
Receives LiDAR scan points and device position, returns a smooth avoidance vector.
Algorithm: DBSCAN clustering -> compute cluster centroids -> potential-field repulsion -> EMA smoothing per-client.

Usage:
  pip install -r requirements.txt
  python python_server.py

Client protocol (JSON over WebSocket):
  Client -> Server:
    {"type":"scan","points":[[x,y,z],...],"device":[x,y,z],"dt":0.033}
  Server -> Client:
    {"type":"avoid","vector":[ax,ay,az],"urgency":0.5}

"""
import asyncio
import json
from collections import defaultdict

import numpy as np
import websockets

from lidar_perception import LidarPerception
from risk_planner import RiskPlanner
from sleep_detector import SleepDetector

# per-connection state
states = defaultdict(lambda: {
    "ema": np.array([0.0, 0.0, 0.0], dtype=float),
    "last_device": np.zeros(3, dtype=float),
    "last_points": [],
    "sleep_detector": SleepDetector(),
    "last_time": 0.0,
})

perception = LidarPerception(eps=0.28, min_samples=2)
planner = RiskPlanner()


class BedtimeController:
    """Translate human sleep state into deterministic BloomBud actions."""

    def __init__(self):
        self.sleeping = False
        self.fall_command_sent = False

    def update(self, human_state):
        self.sleeping = human_state == "sleeping"
        if self.sleeping and not self.fall_command_sent:
            self.fall_command_sent = True
            action = "fall_beside_bed"
        elif self.sleeping:
            action = "pause_bloom"
        else:
            self.fall_command_sent = False
            action = "normal"
        return {
            "human_sleeping": self.sleeping,
            "bloom_action": action,
        }


async def handle(ws):
    client_id = id(ws)
    print(f"Client connected: {client_id}")
    bedtime = BedtimeController()
    try:
        async for msg in ws:
            try:
                data = json.loads(msg)
            except Exception:
                continue

            if data.get("type") != "scan":
                continue

            points = data.get("points", [])
            device = np.array(data.get("device", [0.0, 0.0, 0.0]), dtype=float)
            dt = float(data.get("dt", 0.033))
            human_state = str(data.get("human_state", "awake"))
            bedtime_command = bedtime.update(human_state)

            state = states[client_id]
            current_time = asyncio.get_running_loop().time()
            prev_points = state["last_points"]
            prev_device = state["last_device"]

            velocity = 0.0
            if len(prev_points) > 0 and len(points) > 0:
                velocity = perception.estimate_motion(points, prev_points, dt)

            if state["last_time"] > 0:
                lidar_sleep = state["sleep_detector"].update(velocity, current_time)
            else:
                state["sleep_detector"].reset(current_time)
                lidar_sleep = False

            # In simulation this is supplied by the scene; on hardware it can
            # be replaced by a tracked human posture/state estimator.
            sleep_flag = bool(lidar_sleep or bedtime_command["human_sleeping"])

            obstacles = perception.detect_obstacles(points, device.tolist())
            plan, risk, reason = planner.plan_move(obstacles, device.tolist(), sleep_detected=sleep_flag)

            # smooth final vector with EMA
            repulse = np.array(plan, dtype=float)
            if np.linalg.norm(repulse) > 0:
                repulse = repulse / np.linalg.norm(repulse)
            ema = state["ema"]
            ema = ema * 0.7 + repulse * 0.3
            state["ema"] = ema

            state["last_device"] = device.copy()
            state["last_points"] = points[:]
            state["last_time"] = current_time

            out = {
                "type": "avoid",
                "vector": ema.tolist(),
                "urgency": float(risk),
                "sleep": bool(sleep_flag),
                "state": reason,
                **bedtime_command,
            }
            await ws.send(json.dumps(out))

    except websockets.exceptions.ConnectionClosed:
        print(f"Client disconnected: {client_id}")
    finally:
        if client_id in states:
            del states[client_id]


async def main():
    print("Starting AI WebSocket server on ws://localhost:8765")
    async with websockets.serve(handle, "0.0.0.0", 8765, max_size=2**20):
        await asyncio.Future()


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("Server stopped")

async def main():
    print("Starting AI WebSocket server on ws://localhost:8765")
    async with websockets.serve(handle, "0.0.0.0", 8765, max_size=2**20):
        await asyncio.Future()  # run forever

if __name__ == '__main__':
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("Server stopped")
