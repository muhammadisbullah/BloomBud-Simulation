"""Low-cost serial LiDAR input adapter.

The adapter expects one scan point per line in either format:
  x,y,z
  {"point": [x, y, z]}
  {"points": [[x, y, z], ...]}

Sensor-specific packet decoding belongs in the small `parse_line` method.
"""
import json
from typing import List, Optional

import numpy as np
import serial


class SerialLidarReader:
    def __init__(self, port: str, baudrate: int = 115200, timeout: float = 0.1):
        self.serial = serial.Serial(port=port, baudrate=baudrate, timeout=timeout)

    @staticmethod
    def parse_line(raw_line: bytes) -> List[List[float]]:
        text = raw_line.decode("utf-8", errors="ignore").strip()
        if not text:
            return []

        try:
            payload = json.loads(text)
            if isinstance(payload, dict) and "points" in payload:
                values = payload["points"]
            elif isinstance(payload, dict) and "point" in payload:
                values = [payload["point"]]
            else:
                values = [payload]
            return SerialLidarReader._valid_points(values)
        except (json.JSONDecodeError, TypeError, ValueError):
            values = [text.split(",")]
            return SerialLidarReader._valid_points(values)

    @staticmethod
    def _valid_points(values) -> List[List[float]]:
        points = []
        for value in values:
            if not isinstance(value, (list, tuple)) or len(value) < 3:
                continue
            try:
                point = [float(value[0]), float(value[1]), float(value[2])]
            except (TypeError, ValueError):
                continue
            if np.all(np.isfinite(point)):
                points.append(point)
        return points

    def read_scan(self, max_points: int = 720) -> List[List[float]]:
        points = []
        while self.serial.in_waiting and len(points) < max_points:
            points.extend(self.parse_line(self.serial.readline()))
        return points[:max_points]

    def close(self):
        if self.serial.is_open:
            self.serial.close()


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Preview normalized serial LiDAR points")
    parser.add_argument("port", help="Serial port, for example COM3 or /dev/ttyUSB0")
    parser.add_argument("--baudrate", type=int, default=115200)
    args = parser.parse_args()

    reader = SerialLidarReader(args.port, args.baudrate)
    try:
        while True:
            scan = reader.read_scan()
            if scan:
                print(f"received {len(scan)} points")
    except KeyboardInterrupt:
        reader.close()
