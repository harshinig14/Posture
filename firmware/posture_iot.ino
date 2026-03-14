#include <Wire.h>
#include <Adafruit_MPU6050.h>
#include <Adafruit_Sensor.h>
#include <WiFi.h>
#include <WebSocketsClient.h>

// ========== CONFIGURATION ==========
// Change these to your WiFi credentials
const char* ssid = "Ganesh";
const char* password = "GjH@12345";

// Change this to your computer's IP address (run `ipconfig` in cmd to find it)
const char* ws_host = "192.168.0.103";
const int ws_port = 8000;
const char* ws_path = "/ws/esp32";

// VIBRATION MOTOR PIN
const int VIBRATION_MOTOR_PIN = 13;

// BUZZER PIN (for disabled user caretaker alert)
const int BUZZER_PIN = 12;

// ========== SENSOR ORIENTATION ==========
// Set to true if the sensor chip faces OUTWARD from neck
const bool CHIP_FACES_OUTWARD = true;

// ========== FILTERING ==========
// Complementary filter coefficient (0.96 = smooth, 0.90 = faster response)
const float COMPLEMENTARY_ALPHA = 0.96;

// ========== SENSOR HEALTH ==========
// Minimum change in values to consider sensor "alive"
const float SENSOR_ALIVE_THRESHOLD = 0.01;
// Maximum consecutive "frozen" readings before declaring sensor dead
const int MAX_FROZEN_READINGS = 50;
// ====================================

Adafruit_MPU6050 mpu;
WebSocketsClient webSocket;

// Angle state (filtered)
float pitch = 0;
float roll = 0;
float yaw = 0;

// Previous raw values for change detection
float lastRawAccelX = 0;
float lastRawAccelY = 0;
float lastRawAccelZ = 0;
int frozenReadingCount = 0;
bool sensorHealthy = true;

// Timing
unsigned long lastTime = 0;
unsigned long lastSend = 0;
unsigned long lastSensorCheck = 0;

void webSocketEvent(WStype_t type, uint8_t* payload, size_t length) {
  switch (type) {
    case WStype_DISCONNECTED:
      Serial.println("WebSocket Disconnected!");
      break;
    case WStype_CONNECTED:
      Serial.println("WebSocket Connected to Backend!");
      break;
    case WStype_TEXT:
      Serial.printf("Received: %s\n", payload);
      if (strcmp((char*)payload, "VIBRATE_ON") == 0) {
        digitalWrite(VIBRATION_MOTOR_PIN, HIGH);
        Serial.println("VIBRATION ON");
      } else if (strcmp((char*)payload, "VIBRATE_OFF") == 0) {
        digitalWrite(VIBRATION_MOTOR_PIN, LOW);
        Serial.println("VIBRATION OFF");
      } else if (strcmp((char*)payload, "BUZZER_ON") == 0) {
        tone(BUZZER_PIN, 2000);  // 2kHz tone on passive buzzer
        Serial.println("BUZZER ON - Caretaker Alert!");
      } else if (strcmp((char*)payload, "BUZZER_OFF") == 0) {
        noTone(BUZZER_PIN);
        Serial.println("BUZZER OFF");
      }
      break;
  }
}

bool checkSensorConnected() {
  // Try to communicate with sensor
  Wire.beginTransmission(0x68); // MPU6050 default address
  byte error = Wire.endTransmission();
  return (error == 0);
}

void setup() {
  Serial.begin(115200);
  pinMode(VIBRATION_MOTOR_PIN, OUTPUT);
  pinMode(BUZZER_PIN, OUTPUT);
  noTone(BUZZER_PIN);  // Ensure buzzer is off at startup

  // Initialize I2C
  Wire.begin();

  // Initialize MPU6050
  Serial.println("Initializing MPU6050...");
  if (!mpu.begin()) {
    Serial.println("Failed to find MPU6050 chip! Check wiring.");
    sensorHealthy = false;
  } else {
    Serial.println("MPU6050 Found!");
    sensorHealthy = true;

    // Configure sensor ranges for posture detection
    mpu.setAccelerometerRange(MPU6050_RANGE_2_G);
    mpu.setGyroRange(MPU6050_RANGE_250_DEG);
    mpu.setFilterBandwidth(MPU6050_BAND_21_HZ);
  }

  // Connect to WiFi
  Serial.print("Connecting to WiFi: ");
  Serial.println(ssid);
  WiFi.begin(ssid, password);

  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    delay(500);
    Serial.print(".");
    attempts++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\nWiFi Connected!");
    Serial.print("IP Address: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("\nWiFi Connection Failed! Running in offline mode.");
  }

  // Setup WebSocket connection
  webSocket.begin(ws_host, ws_port, ws_path);
  webSocket.onEvent(webSocketEvent);
  webSocket.setReconnectInterval(5000);

  lastTime = millis();
}

void loop() {
  webSocket.loop();

  unsigned long currentTime = millis();

  // Periodically check sensor connection (every 2 seconds)
  if (currentTime - lastSensorCheck > 2000) {
    sensorHealthy = checkSensorConnected();
    lastSensorCheck = currentTime;
    
    if (!sensorHealthy) {
      Serial.println("WARNING: MPU6050 not responding! Check connection.");
      // Reset angles when sensor disconnects
      pitch = 0;
      roll = 0;
      yaw = 0;
    }
  }

  // Only process data if sensor is healthy
  if (!sensorHealthy) {
    // Send disconnected status to backend
    if (currentTime - lastSend > 500) {
      if (webSocket.isConnected()) {
        String json = "{\"pitch\":0,\"roll\":0,\"yaw\":0,\"sensor_error\":true}";
        webSocket.sendTXT(json);
      }
      lastSend = currentTime;
    }
    delay(100);
    return;
  }

  // Get sensor events
  sensors_event_t a, g, temp;
  mpu.getEvent(&a, &g, &temp);

  // Check if sensor values are frozen (disconnected but I2C still works)
  float accelChange = abs(a.acceleration.x - lastRawAccelX) + 
                      abs(a.acceleration.y - lastRawAccelY) + 
                      abs(a.acceleration.z - lastRawAccelZ);
  
  if (accelChange < SENSOR_ALIVE_THRESHOLD) {
    frozenReadingCount++;
    if (frozenReadingCount > MAX_FROZEN_READINGS) {
      Serial.println("WARNING: Sensor values frozen! Possible disconnect.");
      sensorHealthy = false;
      return;
    }
  } else {
    frozenReadingCount = 0;
  }

  lastRawAccelX = a.acceleration.x;
  lastRawAccelY = a.acceleration.y;
  lastRawAccelZ = a.acceleration.z;

  // Calculate delta time
  float dt = (currentTime - lastTime) / 1000.0;
  lastTime = currentTime;
  if (dt <= 0 || dt > 0.5) dt = 0.01;

  // ========== ACCELEROMETER ANGLES ==========
  float accelPitch = atan2(-a.acceleration.x, sqrt(a.acceleration.y * a.acceleration.y + a.acceleration.z * a.acceleration.z)) * 180.0 / PI;
  float accelRoll = atan2(a.acceleration.y, a.acceleration.z) * 180.0 / PI;

  // ========== GYROSCOPE INTEGRATION ==========
  float gyroPitchRate = g.gyro.y * 180.0 / PI;
  float gyroRollRate = g.gyro.x * 180.0 / PI;
  float gyroYawRate = g.gyro.z * 180.0 / PI;

  // Adjust for sensor orientation
  if (!CHIP_FACES_OUTWARD) {
    gyroPitchRate = -gyroPitchRate;
    gyroYawRate = -gyroYawRate;
    accelPitch = -accelPitch;
  }

  // Integrate gyro
  float gyroPitch = pitch + gyroPitchRate * dt;
  float gyroRoll = roll + gyroRollRate * dt;
  float gyroYaw = yaw + gyroYawRate * dt;

  // ========== COMPLEMENTARY FILTER ==========
  pitch = COMPLEMENTARY_ALPHA * gyroPitch + (1.0 - COMPLEMENTARY_ALPHA) * accelPitch;
  roll = COMPLEMENTARY_ALPHA * gyroRoll + (1.0 - COMPLEMENTARY_ALPHA) * accelRoll;
  yaw = gyroYaw;

  // Keep yaw in -180 to 180 range
  if (yaw > 180) yaw -= 360;
  if (yaw < -180) yaw += 360;

  // Print values for debugging
  Serial.print("Pitch: ");
  Serial.print(pitch, 1);
  Serial.print("°, Roll: ");
  Serial.print(roll, 1);
  Serial.print("°, Yaw: ");
  Serial.print(yaw, 1);
  Serial.print("° [Health: ");
  Serial.print(sensorHealthy ? "OK" : "ERROR");
  Serial.println("]");

  // Send data to Backend every 200ms
  if (currentTime - lastSend > 200) {
    if (webSocket.isConnected()) {
      String json = "{\"pitch\":" + String(pitch, 1) + ",\"roll\":" + String(roll, 1) + ",\"yaw\":" + String(yaw, 1) + ",\"sensor_error\":false}";
      webSocket.sendTXT(json);
    }
    lastSend = currentTime;
  }

  delay(10);
}
