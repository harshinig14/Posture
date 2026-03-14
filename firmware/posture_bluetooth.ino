/*
 * PostureGuard Firmware - BLE EDITION (Combined)
 * 
 * HEAD TILT (Left/Right via Pitch) → Buzzer ON (local, for caretaker)
 * POSTURE (Forward/Back via Roll) → BLE broadcast to frontend app
 * 
 * Board: ESP32 Dev Module
 * Sensor: MPU6050 (Address 0x68)
 * Actuator: Buzzer/Vibration Motor (Pin 13)
 * Connection: BLE (Direct to Web via Web Bluetooth API)
 */

#include <Wire.h>
#include <Adafruit_MPU6050.h>
#include <Adafruit_Sensor.h>
#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <BLE2902.h>

// ========== BLE CONFIGURATION ==========
#define SERVICE_UUID        "4fafc201-1fb5-459e-8fcc-c5c9c331914b"
#define CHARACTERISTIC_UUID "beb5483e-36e1-4688-b7f5-ea07361b26a8"
const char* BLE_DEVICE_NAME = "PostureGuard";

Adafruit_MPU6050 mpu;
const int VIBRATION_MOTOR_PIN = 13;
const int BUZZER_FREQ = 2000;

// ========== HEAD TILT THRESHOLDS (Left/Right) ==========
// Uses PITCH axis — when sensor is vertical on neck
const float HEAD_TILT_THRESHOLD = 15.0;  // Pitch > 15° = Head tilt detected

// ========== POSTURE THRESHOLDS (Forward/Back) ==========
// Uses ROLL axis — baseline is calibrated at startup
const float POSTURE_WARNING_ANGLE = 15.0;  // Roll deviates 15° from baseline = Warning
const float POSTURE_BAD_ANGLE = 25.0;      // Roll deviates 25° from baseline = Bad Posture

// ========== SENSOR HEALTH ==========
const float SENSOR_ALIVE_THRESHOLD = 0.01;
const int MAX_FROZEN_READINGS = 50;

// Calibration
float baselineRoll = 0;
const int CALIBRATION_SAMPLES = 50;

// Posture timing
unsigned long badPostureStart = 0;
bool postureWarningGiven = false;
const int WARNING_DELAY = 3000;  // 3 seconds before warning

// Sensor health
float lastRawAccelX = 0;
float lastRawAccelY = 0;
float lastRawAccelZ = 0;
int frozenReadingCount = 0;
bool sensorHealthy = true;

// BLE globals
BLEServer* pServer = NULL;
BLECharacteristic* pCharacteristic = NULL;
bool deviceConnected = false;
bool oldDeviceConnected = false;

// Timing
unsigned long lastSend = 0;
unsigned long lastSensorCheck = 0;

// Forward declarations
void buzzerOn();
void buzzerOff();

// ========== BLE SERVER CALLBACKS ==========
class MyServerCallbacks: public BLEServerCallbacks {
    void onConnect(BLEServer* pServer) {
      deviceConnected = true;
      Serial.println("📱 BLE Client Connected!");
    };

    void onDisconnect(BLEServer* pServer) {
      deviceConnected = false;
      Serial.println("📱 BLE Client Disconnected");
    }
};

// ========== CHARACTERISTIC CALLBACKS (for receiving commands) ==========
class MyCharacteristicCallbacks: public BLECharacteristicCallbacks {
    void onWrite(BLECharacteristic *pCharacteristic) {
      String value = pCharacteristic->getValue();
      if (value.length() > 0) {
        value.trim();
        Serial.printf("Received: %s\n", value.c_str());
        // Commands from frontend (e.g., force buzzer on/off)
        if (value == "VIBRATE_ON") {
          buzzerOn();
          Serial.println("VIBRATION ON (remote)");
        } else if (value == "VIBRATE_OFF") {
          buzzerOff();
          Serial.println("VIBRATION OFF (remote)");
        } else if (value == "BUZZER_ON") {
          buzzerOn();
          Serial.println("BUZZER ON (remote)");
        } else if (value == "BUZZER_OFF") {
          buzzerOff();
          Serial.println("BUZZER OFF (remote)");
        }
      }
    }
};

void buzzerOn() {
  tone(VIBRATION_MOTOR_PIN, BUZZER_FREQ);
}

void buzzerOff() {
  noTone(VIBRATION_MOTOR_PIN);
}

bool checkSensorConnected() {
  Wire.beginTransmission(0x68);
  byte error = Wire.endTransmission();
  return (error == 0);
}

void calibrateSensor() {
  Serial.println("=== CALIBRATION ===");
  Serial.println("Sit STRAIGHT and keep your head STILL for 3 seconds...");
  delay(2000);

  float rollSum = 0;
  for (int i = 0; i < CALIBRATION_SAMPLES; i++) {
    sensors_event_t a, g, temp;
    mpu.getEvent(&a, &g, &temp);

    float roll = atan2(a.acceleration.y, a.acceleration.z) * 180.0 / PI;
    rollSum += roll;
    delay(50);
  }

  baselineRoll = rollSum / CALIBRATION_SAMPLES;
  Serial.print("Baseline Roll set to: ");
  Serial.print(baselineRoll, 1);
  Serial.println("°");
  Serial.println("Calibration DONE!");
  Serial.println("");
}

void setup() {
  Serial.begin(115200);
  pinMode(VIBRATION_MOTOR_PIN, OUTPUT);

  Serial.println("Starting PostureGuard BLE Combined System...");

  // Initialize I2C
  Wire.begin();

  // Initialize MPU6050
  if (!mpu.begin()) {
    Serial.println("Failed to find MPU6050 chip! Check SDA/SCL wiring.");
    sensorHealthy = false;
    while (1) { delay(10); }
  }
  Serial.println("MPU6050 Found!");
  sensorHealthy = true;

  mpu.setAccelerometerRange(MPU6050_RANGE_2_G);
  mpu.setGyroRange(MPU6050_RANGE_250_DEG);
  mpu.setFilterBandwidth(MPU6050_BAND_21_HZ);

  // Calibrate baseline posture
  calibrateSensor();

  // Test Buzzer
  Serial.println("Testing Buzzer...");
  buzzerOn();
  delay(500);
  buzzerOff();
  Serial.println("Buzzer OK!");

  // ========== BLE SETUP ==========
  Serial.println("Starting BLE...");
  BLEDevice::init(BLE_DEVICE_NAME);
  pServer = BLEDevice::createServer();
  pServer->setCallbacks(new MyServerCallbacks());

  // Create Service
  BLEService *pService = pServer->createService(SERVICE_UUID);

  // Create Characteristic (Read, Write, Notify)
  pCharacteristic = pService->createCharacteristic(
                      CHARACTERISTIC_UUID,
                      BLECharacteristic::PROPERTY_READ   |
                      BLECharacteristic::PROPERTY_WRITE  |
                      BLECharacteristic::PROPERTY_NOTIFY |
                      BLECharacteristic::PROPERTY_INDICATE
                    );

  // Add descriptor for notifications
  pCharacteristic->addDescriptor(new BLE2902());
  
  // Set callback for receiving commands
  pCharacteristic->setCallbacks(new MyCharacteristicCallbacks());

  // Start service
  pService->start();

  // Start advertising
  BLEAdvertising *pAdvertising = BLEDevice::getAdvertising();
  pAdvertising->addServiceUUID(SERVICE_UUID);
  pAdvertising->setScanResponse(false);
  pAdvertising->setMinPreferred(0x0);
  BLEDevice::startAdvertising();
  
  Serial.println("BLE Started! Device name: PostureGuard");
  Serial.println("Waiting for a client connection...");
  Serial.println("");
  Serial.println("=== HEAD TILT (Left/Right): Buzzer ON ===");
  Serial.println("=== POSTURE (Forward/Back): BLE Warning to App ===");
  Serial.println("");
}

void loop() {
  unsigned long currentTime = millis();

  // Handle BLE reconnection
  if (!deviceConnected && oldDeviceConnected) {
    delay(500);
    pServer->startAdvertising();
    Serial.println("Start advertising");
    oldDeviceConnected = deviceConnected;
  }
  if (deviceConnected && !oldDeviceConnected) {
    oldDeviceConnected = deviceConnected;
  }

  // Periodically check sensor connection (every 2 seconds)
  if (currentTime - lastSensorCheck > 2000) {
    sensorHealthy = checkSensorConnected();
    lastSensorCheck = currentTime;
    
    if (!sensorHealthy) {
      Serial.println("WARNING: MPU6050 not responding! Check connection.");
    }
  }

  // If sensor is unhealthy, send error via BLE
  if (!sensorHealthy) {
    if (deviceConnected && currentTime - lastSend > 500) {
      String json = "{\"pitch\":0,\"roll\":0,\"yaw\":0,\"sensor_error\":true}";
      pCharacteristic->setValue(json.c_str());
      pCharacteristic->notify();
      lastSend = currentTime;
    }
    delay(100);
    return;
  }

  // Get sensor events
  sensors_event_t a, g, temp;
  mpu.getEvent(&a, &g, &temp);

  // Check if sensor values are frozen
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

  // ========== Calculate angles ==========
  float pitch = atan2(-a.acceleration.x, sqrt(a.acceleration.y * a.acceleration.y + a.acceleration.z * a.acceleration.z)) * 180.0 / PI;
  float roll = atan2(a.acceleration.y, a.acceleration.z) * 180.0 / PI;

  // How far Roll has deviated from baseline (for posture)
  float rollDeviation = roll - baselineRoll;
  float absDeviation = abs(rollDeviation);

  // Print data
  Serial.print("Pitch: "); Serial.print(pitch, 1);
  Serial.print("°  Roll: "); Serial.print(roll, 1);
  Serial.print("° (dev: "); Serial.print(rollDeviation, 1); Serial.print("°)");

  // ========== HEAD TILT (Left/Right) = BUZZER ==========
  bool headTilted = false;
  if (pitch > HEAD_TILT_THRESHOLD) {
    buzzerOn();
    headTilted = true;
    Serial.print("  [HEAD TILT RIGHT]");
  } else if (pitch < -HEAD_TILT_THRESHOLD) {
    buzzerOn();
    headTilted = true;
    Serial.print("  [HEAD TILT LEFT]");
  } else {
    buzzerOff();
  }

  // ========== POSTURE (Forward/Back) = BLE WARNING ==========
  String postureState = "Good";

  if (absDeviation > POSTURE_BAD_ANGLE) {
    if (badPostureStart == 0) {
      badPostureStart = millis();
    }
    unsigned long duration = (millis() - badPostureStart) / 1000;
    Serial.print("  *** BAD POSTURE! (");
    Serial.print(duration);
    Serial.print("s) ***");
    postureWarningGiven = true;
    postureState = "Bad";

  } else if (absDeviation > POSTURE_WARNING_ANGLE) {
    if (badPostureStart == 0) {
      badPostureStart = millis();
    }
    if (millis() - badPostureStart > WARNING_DELAY) {
      Serial.print("  >> WARNING: Correct your posture!");
      postureWarningGiven = true;
      postureState = "Warning";
    } else {
      Serial.print("  [Posture: Slightly Off]");
      postureState = "Good";  // Still in grace period
    }

  } else {
    if (postureWarningGiven) {
      Serial.print("  [Posture CORRECTED!]");
    } else {
      Serial.print("  [Posture: Good]");
    }
    badPostureStart = 0;
    postureWarningGiven = false;
    postureState = "Good";
  }

  Serial.println("");

  // ========== Send data via BLE every 200ms ==========
  if (deviceConnected && currentTime - lastSend > 200) {
    String json = "{\"pitch\":" + String(pitch, 1) + 
                  ",\"roll\":" + String(roll, 1) + 
                  ",\"yaw\":0" +
                  ",\"state\":\"" + postureState + "\"" +
                  ",\"headTilt\":" + (headTilted ? "true" : "false") +
                  ",\"buzzerActive\":" + (headTilted ? "true" : "false") +
                  ",\"sensor_error\":false}";
    pCharacteristic->setValue(json.c_str());
    pCharacteristic->notify();
    lastSend = currentTime;
  }

  delay(300);
}
