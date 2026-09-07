class SleepDetector:
    def __init__(self, inactivity_seconds: float = 5.0, motion_threshold: float = 0.05, wake_threshold: float = 0.12):
        self.inactivity_seconds = inactivity_seconds
        self.motion_threshold = motion_threshold
        self.wake_threshold = wake_threshold
        self._last_motion_time = None
        self._last_velocity = 0.0
        self._sleeping = False

    def update(self, velocity: float, current_time: float):
        self._last_velocity = velocity
        if self._last_motion_time is None:
            self._last_motion_time = current_time

        if velocity >= self.wake_threshold:
            self._last_motion_time = current_time
            self._sleeping = False
        elif not self._sleeping and velocity >= self.motion_threshold:
            self._last_motion_time = current_time

        if current_time - self._last_motion_time >= self.inactivity_seconds:
            self._sleeping = True
        return self._sleeping

    def reset(self, current_time: float = 0.0):
        self._last_velocity = 0.0
        self._last_motion_time = current_time
        self._sleeping = False
