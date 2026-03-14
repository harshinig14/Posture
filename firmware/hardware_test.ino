#include <Wire.h>
#include <Adafruit_MPU6050.h>
#include <Adafruit_Sensor.h>

Adafruit_MPU6050 mpu;
const int VIBRATION_MOTOR_PIN = 13;

void setup() {
  Serial.begin(115200);
  pinMode(VIBRATION_MOTOR_PIN, OUTPUT);

  Serial.println("Starting Hardware Test...");

  // Initialize MPU6050
  if (!mpu.begin()) {
    Serial.println("Failed to find MPU6050 chip! Check SDA/SCL wiring.");
    while (1) { delay(10); }
  }
  Serial.println("MPU6050 Found!");

  Serial.println("Testing Motor: Vibrate for 1 second...");
  digitalWrite(VIBRATION_MOTOR_PIN, HIGH);
  delay(1000);
  digitalWrite(VIBRATION_MOTOR_PIN, LOW);
  Serial.println("Motor Test Done.");
}

void loop() {
  sensors_event_t a, g, temp;
  mpu.getEvent(&a, &g, &temp);

  // Print Acceleration data
  Serial.print("Accel X: "); Serial.print(a.acceleration.x);
  Serial.print(", Y: "); Serial.print(a.acceleration.y);
  Serial.print(", Z: "); Serial.println(a.acceleration.z);

  // Short vibe if you tilt it too far (for testing)
  if (abs(a.acceleration.x) > 5.0) {
    digitalWrite(VIBRATION_MOTOR_PIN, HIGH);
  } else {
    digitalWrite(VIBRATION_MOTOR_PIN, LOW);
  }

  delay(500);
}
