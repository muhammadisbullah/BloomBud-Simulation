/*
  BloomBud low-cost product firmware
  Target: ESP32-C3 + 3 digital obstacle sensors + PIR + servo + RGB LED

  This is the RM40-RM50 product path. The Python/Three.js simulation remains
  the richer digital twin; this firmware runs the essential behavior locally.

  Suggested parts:
    - ESP32-C3 board
    - 3 digital IR obstacle sensors: left/front/right
    - PIR motion sensor
    - Small 5V servo for petals
    - Common-cathode RGB LED and 220 ohm resistors
*/

#include <Arduino.h>

const int SENSOR_LEFT_PIN = 2;
const int SENSOR_FRONT_PIN = 3;
const int SENSOR_RIGHT_PIN = 4;
const int PIR_PIN = 5;
const int SERVO_PIN = 6;
const int LED_RED_PIN = 7;
const int LED_GREEN_PIN = 8;
const int LED_BLUE_PIN = 10;

const unsigned long SLEEP_CONFIRM_MS = 5000;
const unsigned long LOOP_MS = 40;
const int SERVO_CLOSED = 25;
const int SERVO_OPEN = 105;

enum BudState {
  BUD_OPEN,
  BUD_AVOID_LEFT,
  BUD_AVOID_RIGHT,
  BUD_SLEEPING
};

BudState budState = BUD_OPEN;
unsigned long lastMotionMs = 0;
unsigned long lastLoopMs = 0;
int currentPetalAngle = SERVO_OPEN;

struct AiDecision {
  float obstacleRisk;
  float sleepConfidence;
  BudState action;
};

void setRgb(int red, int green, int blue) {
  analogWrite(LED_RED_PIN, red);
  analogWrite(LED_GREEN_PIN, green);
  analogWrite(LED_BLUE_PIN, blue);
}

void writeServoAngle(int angle) {
  // 50 Hz servo pulse: approximately 500-2500 microseconds.
  const int pulseUs = map(angle, 0, 180, 500, 2500);
  const int duty = (pulseUs * 65535L) / 20000L;
  ledcWrite(SERVO_PIN, duty);
  currentPetalAngle = angle;
}

void setPetals(int targetAngle) {
  if (currentPetalAngle == targetAngle) return;
  const int step = currentPetalAngle < targetAngle ? 2 : -2;
  while (currentPetalAngle != targetAngle) {
    int nextAngle = currentPetalAngle + step;
    if ((step > 0 && nextAngle > targetAngle) || (step < 0 && nextAngle < targetAngle)) {
      nextAngle = targetAngle;
    }
    writeServoAngle(nextAngle);
    delay(12);
  }
}

void setup() {
  Serial.begin(115200);
  pinMode(SENSOR_LEFT_PIN, INPUT_PULLUP);
  pinMode(SENSOR_FRONT_PIN, INPUT_PULLUP);
  pinMode(SENSOR_RIGHT_PIN, INPUT_PULLUP);
  pinMode(PIR_PIN, INPUT);
  pinMode(LED_RED_PIN, OUTPUT);
  pinMode(LED_GREEN_PIN, OUTPUT);
  pinMode(LED_BLUE_PIN, OUTPUT);

  // ESP32 LEDC servo PWM without a heavy motor library.
  ledcAttach(SERVO_PIN, 50, 16);
  writeServoAngle(SERVO_OPEN);
  setRgb(0, 120, 80);
  lastMotionMs = millis();
}

float inferObstacleRisk(bool leftBlocked, bool frontBlocked, bool rightBlocked) {
  // Lightweight fuzzy sensor fusion: front has the highest danger weight.
  float risk = 0.2f * (leftBlocked ? 1.0f : 0.0f)
             + 0.6f * (frontBlocked ? 1.0f : 0.0f)
             + 0.2f * (rightBlocked ? 1.0f : 0.0f);
  if (leftBlocked && rightBlocked) risk = min(1.0f, risk + 0.25f);
  return risk;
}

float inferSleepConfidence(bool humanMoving, unsigned long now) {
  if (humanMoving) return 0.0f;
  const float stillSeconds = (now - lastMotionMs) / 1000.0f;
  return constrain(stillSeconds / 5.0f, 0.0f, 1.0f);
}

AiDecision runEdgeAi(bool leftBlocked, bool frontBlocked, bool rightBlocked, bool humanMoving) {
  const unsigned long now = millis();
  AiDecision decision;
  decision.obstacleRisk = inferObstacleRisk(leftBlocked, frontBlocked, rightBlocked);

  if (humanMoving) {
    lastMotionMs = now;
    if (budState == BUD_SLEEPING) {
      budState = BUD_OPEN;
      setPetals(SERVO_OPEN);
      setRgb(0, 120, 80);
    }
    decision.sleepConfidence = 0.0f;
  } else {
    decision.sleepConfidence = inferSleepConfidence(false, now);
  }

  if (budState != BUD_SLEEPING && decision.sleepConfidence >= 1.0f) {
    budState = BUD_SLEEPING;
    setPetals(SERVO_CLOSED);
    setRgb(40, 0, 80);
  }

  if (budState == BUD_SLEEPING) {
    decision.action = BUD_SLEEPING;
    return decision;
  }

  if (decision.obstacleRisk >= 0.6f && !leftBlocked) {
    budState = BUD_AVOID_LEFT;
    setRgb(180, 80, 0);
  } else if (decision.obstacleRisk >= 0.6f && !rightBlocked) {
    budState = BUD_AVOID_RIGHT;
    setRgb(180, 80, 0);
  } else if (decision.obstacleRisk < 0.6f) {
    budState = BUD_OPEN;
    setRgb(0, 120, 80);
  }
  decision.action = budState;
  return decision;
}

void loop() {
  const unsigned long now = millis();
  if (now - lastLoopMs < LOOP_MS) return;
  lastLoopMs = now;

  const bool leftBlocked = digitalRead(SENSOR_LEFT_PIN) == LOW;
  const bool frontBlocked = digitalRead(SENSOR_FRONT_PIN) == LOW;
  const bool rightBlocked = digitalRead(SENSOR_RIGHT_PIN) == LOW;
  const bool humanMoving = digitalRead(PIR_PIN) == HIGH;

  AiDecision decision = runEdgeAi(leftBlocked, frontBlocked, rightBlocked, humanMoving);

  // Optional serial telemetry for investor demos and hardware calibration.
  static unsigned long lastTelemetryMs = 0;
  if (now - lastTelemetryMs >= 1000) {
    lastTelemetryMs = now;
    Serial.printf("AI risk=%.2f sleep=%.2f state=%d\n",
                  decision.obstacleRisk, decision.sleepConfidence, decision.action);
  }
}
