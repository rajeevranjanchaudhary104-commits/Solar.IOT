/*
 * =========================================================================================
 * Farm.IOT - NodeMCU (ESP8266 ESP-12E / ESP-12F / NodeMCU v2 & v3) Production Firmware
 * Photovoltaic Microgrid Station + Aero Windmill Turbine + Motorized Cleaning Wiper
 * =========================================================================================
 */

#include <ESP8266WiFi.h>
#include <ESP8266WebServer.h>
#include <ESP8266HTTPClient.h>
#include <WiFiClientSecure.h>
#include <Wire.h>
#include <Adafruit_INA219.h>
#include <time.h>

// 1. Wi-Fi Credentials (MUST BE 2.4 GHz Network - ESP8266 does not support 5 GHz)
const char* WIFI_SSID = "YOUR_WIFI_SSID";
const char* WIFI_PASS = "YOUR_WIFI_PASSWORD";

// 2. Google Cloud Firestore Credentials
const char* PROJECT_ID  = "red-access-fpthm";
const char* DATABASE_ID = "ai-studio-5865fcd2-ed18-48d2-9d05-2e8be65be1d1";
const char* API_KEY     = "AIzaSyC0ssSrveip0eJTCvBKOoKDStecyQDVKJs";
const char* DEVICE_ID   = "node_01";

// 3. NodeMCU Hardware Pin Definitions
#define PIN_I2C_SDA       4   // NodeMCU Pin D2 (GPIO 4)
#define PIN_I2C_SCL       5   // NodeMCU Pin D1 (GPIO 5)
#define PIN_HALL_RPM      14  // NodeMCU Pin D5 (GPIO 14 / Hardware Interrupt)
#define PIN_WIPER_RELAY   12  // NodeMCU Pin D6 (GPIO 12 / Active-LOW)
#define PIN_RAIN_DO       13  // NodeMCU Pin D7 (GPIO 13 / Digital Input)
#define PIN_PUMP_RELAY    15  // NodeMCU Pin D8 (GPIO 15 / Active-LOW)
#define PIN_LM35_ANALOG   A0  // NodeMCU Pin A0 (ADC0)

// Sensor and WebServer Objects
Adafruit_INA219 ina219(0x40);
ESP8266WebServer server(80);
bool ina219Connected = false;

// Hall Effect Tachometer Interrupt
volatile unsigned long hallPulseCounter = 0;
volatile unsigned long lastHallPulseMs = 0;
unsigned long lastRpmCalcMs = 0;
float windmillRpm = 0.0;
float windmillPower = 0.0;

// Interrupt Service Routine (IRAM_ATTR required for modern ESP8266 cores)
void IRAM_ATTR onHallPulseISR() {
  unsigned long now = millis();
  if (now - lastHallPulseMs > 5) { // 5ms debouncing
    hallPulseCounter++;
    lastHallPulseMs = now;
  }
}

// Telemetry State
float solarVoltage = 0.0;
float solarAmps = 0.0;
float solarPower = 0.0;
float panelTempC = 25.0;
bool isRaining = false;
float highestWattToday = 0.0;
bool isWiperActive = false;
unsigned long wiperStartTime = 0;
const unsigned long WIPER_SWEEP_DURATION_MS = 5000;

// Timing Intervals
unsigned long lastSensorReadMs = 0;
const unsigned long SENSOR_READ_INTERVAL = 500;    // Read sensors every 500ms (protects Wi-Fi ADC)
unsigned long lastFirebasePushMs = 0;
const unsigned long FIREBASE_PUSH_INTERVAL = 3000; // Stream every 3 seconds
unsigned long lastCommandPollMs = 0;
const unsigned long COMMAND_POLL_INTERVAL = 4000;  // Poll commands every 4 seconds

// Read Physical Sensors
void readSensors() {
  // 1. INA219 Solar PV
  if (ina219Connected) {
    solarVoltage = ina219.getBusVoltage_V();
    solarAmps = ina219.getCurrent_mA() / 1000.0;
    if (solarAmps < 0.0) solarAmps = 0.0;
    solarPower = solarVoltage * solarAmps;
    if (solarPower > highestWattToday) {
      highestWattToday = solarPower;
    }
  }

  // 2. LM35 Temperature on A0 (10mV/°C)
  int rawA0 = analogRead(PIN_LM35_ANALOG);
  float vOut = (rawA0 / 1023.0) * 3.3;
  panelTempC = vOut * 100.0;
  if (panelTempC < -10.0 || panelTempC > 100.0) panelTempC = 28.0;

  // 3. FC-37 Rain Detector DO on D7 (Active-LOW when wet)
  isRaining = (digitalRead(PIN_RAIN_DO) == LOW);

  // 4. Windmill RPM
  unsigned long now = millis();
  if (now - lastRpmCalcMs >= 1000) {
    noInterrupts();
    unsigned long pulses = hallPulseCounter;
    hallPulseCounter = 0;
    interrupts();

    float dtSec = (now - lastRpmCalcMs) / 1000.0;
    lastRpmCalcMs = now;
    windmillRpm = (pulses / dtSec) * 60.0;
    windmillPower = (windmillRpm > 20.0) ? (0.00045 * windmillRpm * windmillRpm) : 0.0;
  }
}

// Start Wiper
void startWiper() {
  isWiperActive = true;
  wiperStartTime = millis();
  digitalWrite(PIN_WIPER_RELAY, LOW); // Active-LOW: relay ON
  Serial.println("[WIPER] Wiper squeegee activated!");
}

// Stop Wiper
void stopWiper() {
  isWiperActive = false;
  digitalWrite(PIN_WIPER_RELAY, HIGH); // Active-LOW: relay OFF
  Serial.println("[WIPER] Wiper sweep completed.");
}

// Push Telemetry to Google Cloud Firestore via HTTPS PATCH
void pushToFirestore() {
  if (WiFi.status() != WL_CONNECTED) return;

  WiFiClientSecure client;
  client.setInsecure(); // Skip certificate validation for ESP8266 RAM constraints
  client.setTimeout(8000);

  HTTPClient https;
  String baseUrl = "https://firestore.googleapis.com/v1/projects/" + String(PROJECT_ID) +
                   "/databases/" + String(DATABASE_ID) +
                   "/documents/solar_iot/" + String(DEVICE_ID) + "?key=" + String(API_KEY);

  // Use updateMask so PATCH does not overwrite triggerWiper set by the web dashboard
  String updateMask = "&updateMask.fieldPaths=espConnected"
                      "&updateMask.fieldPaths=deviceType"
                      "&updateMask.fieldPaths=voltage"
                      "&updateMask.fieldPaths=current"
                      "&updateMask.fieldPaths=power"
                      "&updateMask.fieldPaths=temperature"
                      "&updateMask.fieldPaths=highestWattToday"
                      "&updateMask.fieldPaths=isRaining"
                      "&updateMask.fieldPaths=wiperActive"
                      "&updateMask.fieldPaths=cleaningStatus"
                      "&updateMask.fieldPaths=windmillRpm"
                      "&updateMask.fieldPaths=windmillPower"
                      "&updateMask.fieldPaths=updatedAt";

  if (https.begin(client, baseUrl + updateMask)) {
    https.addHeader("Content-Type", "application/json");

    time_t now = time(nullptr);
    char timeBuf[32];
    if (now > 1600000000) {
      struct tm* timeinfo = gmtime(&now);
      strftime(timeBuf, sizeof(timeBuf), "%Y-%m-%dT%H:%M:%SZ", timeinfo);
    } else {
      snprintf(timeBuf, sizeof(timeBuf), "%lu", millis());
    }

    String docJson = "{\"fields\":{";
    docJson += "\"espConnected\":{\"booleanValue\":true},";
    docJson += "\"deviceType\":{\"stringValue\":\"NodeMCU-ESP8266\"},";
    docJson += "\"voltage\":{\"doubleValue\":" + String(solarVoltage, 2) + "},";
    docJson += "\"current\":{\"doubleValue\":" + String(solarAmps, 3) + "},";
    docJson += "\"power\":{\"doubleValue\":" + String(solarPower, 2) + "},";
    docJson += "\"temperature\":{\"doubleValue\":" + String(panelTempC, 1) + "},";
    docJson += "\"highestWattToday\":{\"doubleValue\":" + String(highestWattToday, 2) + "},";
    docJson += "\"isRaining\":{\"booleanValue\":" + String(isRaining ? "true" : "false") + "},";
    docJson += "\"wiperActive\":{\"booleanValue\":" + String(isWiperActive ? "true" : "false") + "},";
    docJson += "\"cleaningStatus\":{\"stringValue\":\"" + String(isWiperActive ? "cleaning" : "idle") + "\"},";
    docJson += "\"windmillRpm\":{\"doubleValue\":" + String(windmillRpm, 1) + "},";
    docJson += "\"windmillPower\":{\"doubleValue\":" + String(windmillPower, 2) + "},";
    docJson += "\"updatedAt\":{\"stringValue\":\"" + String(timeBuf) + "\"}";
    docJson += "}}";

    int httpCode = https.PATCH(docJson);
    if (httpCode == 200) {
      Serial.printf("[NodeMCU -> Firestore] Success HTTP 200 | PV: %.2fV, %.2fA, %.2fW | RPM: %.1f\n", 
                    solarVoltage, solarAmps, solarPower, windmillRpm);
    } else {
      Serial.printf("[NodeMCU -> Firestore] Error HTTP %d | %s\n", httpCode, https.errorToString(httpCode).c_str());
    }
    https.end();
  }
}

// Poll Wiper Cleaning Command from Firestore
void checkCloudCommands() {
  if (WiFi.status() != WL_CONNECTED || isWiperActive) return;

  WiFiClientSecure client;
  client.setInsecure();
  client.setTimeout(6000);

  HTTPClient https;
  String baseUrl = "https://firestore.googleapis.com/v1/projects/" + String(PROJECT_ID) +
                   "/databases/" + String(DATABASE_ID) +
                   "/documents/solar_iot/" + String(DEVICE_ID) + "?key=" + String(API_KEY);

  String getUrl = baseUrl + "&mask.fieldPaths=triggerWiper";

  bool shouldTrigger = false;

  if (https.begin(client, getUrl)) {
    int httpCode = https.GET();
    if (httpCode == 200) {
      String payload = https.getString();
      payload.replace(" ", "");
      payload.replace("\n", "");
      payload.replace("\r", "");

      if (payload.indexOf("\"triggerWiper\":{\"booleanValue\":true}") >= 0) {
        shouldTrigger = true;
      }
    }
    https.end(); // Close GET connection before starting PATCH
  }

  if (shouldTrigger) {
    Serial.println("[CLOUD COMMAND] Remote Cleaning Wiper Trigger Received!");
    startWiper();

    // Acknowledge by clearing triggerWiper in Firestore
    HTTPClient clearHttp;
    String patchUrl = baseUrl + "&updateMask.fieldPaths=triggerWiper";
    if (clearHttp.begin(client, patchUrl)) {
      clearHttp.addHeader("Content-Type", "application/json");
      clearHttp.PATCH("{\"fields\":{\"triggerWiper\":{\"booleanValue\":false}}}");
      clearHttp.end();
    }
  }
}

void setup() {
  Serial.begin(115200);
  delay(200);
  Serial.println("\n\n=======================================================");
  Serial.println("  Farm.IOT - NodeMCU (ESP8266) Starting  ");
  Serial.println("  PV Station + Aero Windmill + Motorized Squeegee");
  Serial.println("=======================================================");

  // Setup Relays (Active-LOW, start in HIGH/OFF state)
  pinMode(PIN_WIPER_RELAY, OUTPUT);
  digitalWrite(PIN_WIPER_RELAY, HIGH);
  pinMode(PIN_PUMP_RELAY, OUTPUT);
  digitalWrite(PIN_PUMP_RELAY, HIGH);

  // Setup Digital Inputs
  pinMode(PIN_RAIN_DO, INPUT);
  pinMode(PIN_HALL_RPM, INPUT_PULLUP);
  attachInterrupt(digitalPinToInterrupt(PIN_HALL_RPM), onHallPulseISR, FALLING);

  // Initialize I2C on NodeMCU D2 (SDA / GPIO 4) and D1 (SCL / GPIO 5)
  Wire.begin(PIN_I2C_SDA, PIN_I2C_SCL);
  if (ina219.begin()) {
    ina219Connected = true;
    Serial.println("[I2C] INA219 Solar Sensor detected at address 0x40 OK");
  } else {
    Serial.println("[I2C] WARNING: INA219 not detected! Check D2 (SDA) and D1 (SCL) wiring.");
  }

  // Connect to 2.4GHz Wi-Fi
  WiFi.mode(WIFI_STA);
  WiFi.setAutoReconnect(true);
  WiFi.persistent(true);
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  Serial.printf("[WIFI] Connecting to 2.4GHz network '%s'...", WIFI_SSID);

  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 25) {
    delay(500);
    Serial.print(".");
    attempts++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n[WIFI] Connected Successfully!");
    Serial.printf("[WIFI] NodeMCU IP Address: %s\n", WiFi.localIP().toString().c_str());
    Serial.printf("[WIFI] Signal Strength (RSSI): %d dBm\n", WiFi.RSSI());

    // Sync NTP Time for valid UTC timestamps
    configTime(0, 0, "pool.ntp.org", "time.google.com");
  } else {
    Serial.println("\n[WIFI] Could not connect to router. Starting Fallback AP Hotspot...");
    WiFi.mode(WIFI_AP_STA);
    WiFi.softAP("NodeMCU-Solar-AP", "SolarIOT123");
    Serial.printf("[AP] Hotspot active! Connect to 'NodeMCU-Solar-AP' (IP: %s)\n", WiFi.softAPIP().toString().c_str());
  }

  // Local Diagnostic Web Endpoints
  server.on("/api/telemetry", HTTP_GET, []() {
    String json = "{\"voltage\":" + String(solarVoltage, 2) +
                  ",\"current\":" + String(solarAmps, 3) +
                  ",\"power\":" + String(solarPower, 2) +
                  ",\"temp\":" + String(panelTempC, 1) +
                  ",\"rpm\":" + String(windmillRpm, 1) +
                  ",\"wiper\":" + String(isWiperActive ? "true" : "false") + "}";
    server.send(200, "application/json", json);
  });

  server.on("/api/clean", HTTP_GET, []() {
    startWiper();
    server.send(200, "application/json", "{\"status\":\"wiper_started\"}");
  });

  server.begin();
  Serial.println("[SYSTEM] NodeMCU Initialization Complete. Streaming telemetry...\n");
}

void loop() {
  server.handleClient();

  // Stop Wiper after sweep duration
  if (isWiperActive && (millis() - wiperStartTime >= WIPER_SWEEP_DURATION_MS)) {
    stopWiper();
  }

  // Periodically read physical sensors (every 500ms)
  if (millis() - lastSensorReadMs >= SENSOR_READ_INTERVAL) {
    lastSensorReadMs = millis();
    readSensors();
  }

  // Push telemetry packet to Google Cloud Firestore
  if (millis() - lastFirebasePushMs >= FIREBASE_PUSH_INTERVAL) {
    lastFirebasePushMs = millis();
    pushToFirestore();
  }

  // Poll remote cleaning wiper commands from Firestore
  if (millis() - lastCommandPollMs >= COMMAND_POLL_INTERVAL) {
    lastCommandPollMs = millis();
    checkCloudCommands();
  }

  yield(); // Prevent ESP8266 Soft WDT watchdog reset
}
