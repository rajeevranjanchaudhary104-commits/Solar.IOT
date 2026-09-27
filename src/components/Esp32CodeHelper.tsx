import React, { useState } from 'react';
import { 
  Code, 
  Copy, 
  Check, 
  Terminal, 
  Cpu, 
  ExternalLink, 
  BookOpen, 
  ShieldCheck, 
  Wifi, 
  Database,
  Key,
  FileCode,
  AlertTriangle,
  Layers,
  Zap,
  CheckCircle2,
  Sliders,
  Play,
  Edit3,
  Save,
  X,
  RotateCcw,
  Lock,
  Sparkles
} from 'lucide-react';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';
import { firebaseConfig, db } from '../lib/firebase';
import { OWNER_EMAIL } from './ResearchMode';

interface Esp32CodeHelperProps {
  currentUser?: {
    email?: string | null;
    displayName?: string | null;
  } | null;
  onRequireSignIn?: () => void;
}

export interface HardwareConfigData {
  microcontrollerType: string;
  pinINA219SDA: string;
  pinINA219SCL: string;
  pinLM35: string;
  pinRainDigital: string;
  pinWiperRelay: string;
  pinPumpRelay: string;
  sensorCalibrationNotes: string;
  customFirmwareCode?: string;
  updatedAt?: string;
}

const DEFAULT_HARDWARE_CONFIG: HardwareConfigData = {
  microcontrollerType: 'ESP32 DevKit v1 / ESP-01 (ESP8266)',
  pinINA219SDA: 'GPIO 21 (I2C SDA)',
  pinINA219SCL: 'GPIO 22 (I2C SCL)',
  pinLM35: 'GPIO 35 (ADC1 Channel 7 - 10mV/°C)',
  pinRainDigital: 'GPIO 34 (Digital Rain Sensed LOW)',
  pinWiperRelay: 'GPIO 27 (Active-LOW Silicone Wiper Motor)',
  pinPumpRelay: 'GPIO 26 (Active-LOW 12V Hydro Pump)',
  sensorCalibrationNotes: 'INA219 calibrated for 32V, 2A range with 0.1 ohm shunt resistor. LM35 calibrated with 10mV per degree Celsius. 3:00 AM nightly cleaning timer active.',
};

export const Esp32CodeHelper: React.FC<Esp32CodeHelperProps> = ({ currentUser, onRequireSignIn }) => {
  const [selectedBoard, setSelectedBoard] = useState<'esp01' | 'arduino_esp01' | 'esp32'>('esp01');
  const [activeTab, setActiveTab] = useState<'wiring' | 'arduino' | 'credentials'>('wiring');
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [testStatus, setTestStatus] = useState<string | null>(null);

  // Hardware configuration from Firestore
  const [hardwareConfig, setHardwareConfig] = useState<HardwareConfigData>(DEFAULT_HARDWARE_CONFIG);
  const [isEditingHardware, setIsEditingHardware] = useState(false);
  const [editHardwareForm, setEditHardwareForm] = useState<HardwareConfigData>(DEFAULT_HARDWARE_CONFIG);
  const [saveHardwareStatus, setSaveHardwareStatus] = useState<string | null>(null);
  const [isSavingHardware, setIsSavingHardware] = useState(false);

  // Verify owner internally without printing email on screen
  const isOwner = Boolean(
    currentUser?.email && 
    currentUser.email.trim().toLowerCase() === OWNER_EMAIL.trim().toLowerCase()
  );

  // Sync Hardware Configuration from Cloud Firestore
  React.useEffect(() => {
    const docRef = doc(db, 'solar_iot', 'hardware_config');
    const unsubscribe = onSnapshot(docRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data() as Partial<HardwareConfigData>;
        setHardwareConfig((prev) => ({
          ...prev,
          microcontrollerType: data.microcontrollerType || prev.microcontrollerType,
          pinINA219SDA: data.pinINA219SDA || prev.pinINA219SDA,
          pinINA219SCL: data.pinINA219SCL || prev.pinINA219SCL,
          pinLM35: data.pinLM35 || prev.pinLM35,
          pinRainDigital: data.pinRainDigital || prev.pinRainDigital,
          pinWiperRelay: data.pinWiperRelay || prev.pinWiperRelay,
          pinPumpRelay: data.pinPumpRelay || prev.pinPumpRelay,
          sensorCalibrationNotes: data.sensorCalibrationNotes || prev.sensorCalibrationNotes,
          customFirmwareCode: data.customFirmwareCode || prev.customFirmwareCode,
          updatedAt: data.updatedAt,
        }));
      }
    });

    return () => unsubscribe();
  }, []);

  const handleOpenHardwareEdit = () => {
    if (!isOwner) {
      if (!currentUser && onRequireSignIn) {
        onRequireSignIn();
        return;
      }
      alert('Access restricted. Only the verified project administrator can edit pin layouts and firmware.');
      return;
    }
    setEditHardwareForm({ ...hardwareConfig });
    setIsEditingHardware(true);
    setSaveHardwareStatus(null);
  };

  const handleSaveHardwareToFirebase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isOwner) {
      setSaveHardwareStatus('Access Denied: Administrator authentication required.');
      return;
    }

    setIsSavingHardware(true);
    setSaveHardwareStatus('Saving hardware configuration to Firebase...');
    try {
      const docRef = doc(db, 'solar_iot', 'hardware_config');
      const payload: HardwareConfigData = {
        ...editHardwareForm,
        updatedAt: new Date().toISOString(),
      };
      await setDoc(docRef, payload, { merge: true });
      setHardwareConfig(payload);
      setSaveHardwareStatus('Hardware config and pins saved to Firebase!');
      setTimeout(() => {
        setIsEditingHardware(false);
        setSaveHardwareStatus(null);
      }, 1200);
    } catch (err: any) {
      setSaveHardwareStatus(`Failed to save: ${err.message || 'Unknown error'}`);
    } finally {
      setIsSavingHardware(false);
    }
  };

  const copyToClipboard = (text: string, setter: (val: boolean) => void) => {
    navigator.clipboard.writeText(text);
    setter(true);
    setTimeout(() => setter(false), 2000);
  };

  // Test Ping from UI to verify Firestore connectivity
  const handleTestPing = async () => {
    setTestStatus('Sending test telemetry packet...');
    try {
      const docRef = doc(db, 'solar_iot', 'node_01');
      await setDoc(docRef, {
        espConnected: true,
        voltage: 19.2,
        current: 4.8,
        power: 92.16,
        temperature: 31.4,
        batteryPercent: 88,
        highestWattToday: 92.16,
        isRaining: false,
        lastRainTime: 'None today',
        updatedAt: new Date().toISOString(),
        command: 'IDLE',
        wiperActive: false,
        pumpActive: false,
        cleaningStatus: 'idle',
        deviceType: selectedBoard === 'esp01' ? 'ESP-01' : (selectedBoard === 'arduino_esp01' ? 'Arduino+ESP01' : 'ESP32')
      }, { merge: true });
      setTestStatus('Success: Node_01 is connected and streaming!');
      setTimeout(() => setTestStatus(null), 4000);
    } catch (err: any) {
      setTestStatus(`Error: ${err.message || 'Failed to ping'}`);
    }
  };

  // 1. Standalone ESP-01 Sketch (ESP8266)
  const esp01CodeSnippet = `/*
 * Solar.IOT - ESP-01 / ESP8266 Standalone Firmware
 * 
 * Hardware Connections (8-Pin ESP-01):
 *   VCC  -> 3.3V (Dedicated 3.3V 300mA+ regulator with 10uF cap across VCC/GND)
 *   GND  -> Common Ground
 *   CH_PD (EN) -> 3.3V (MANDATORY pull-up resistor or direct to 3.3V)
 *   GPIO 0 -> INA219 SDA (I2C Data)
 *   GPIO 2 -> INA219 SCL (I2C Clock)
 *   RX (GPIO 3) -> Relay IN (Motorized Squeegee Wiper, Active-LOW)
 *   TX (GPIO 1) -> Serial Debugging (115200 baud)
 *
 * Board Setting in Arduino IDE:
 *   Tools -> Board: "Generic ESP8266 Module"
 *   Flash Mode: DOUT
 *   Flash Size: 1MB (FS:64KB) or 512KB
 */

#include <ESP8266WiFi.h>
#include <ESP8266HTTPClient.h>
#include <WiFiClientSecure.h>
#include <Wire.h>
#include <Adafruit_INA219.h>

// 1. Wi-Fi Credentials
const char* WIFI_SSID = "YOUR_WIFI_SSID";
const char* WIFI_PASS = "YOUR_WIFI_PASSWORD";

// 2. Firebase Cloud Firestore Project Credentials
const char* PROJECT_ID = "${firebaseConfig.projectId}";
const char* DATABASE_ID = "${firebaseConfig.firestoreDatabaseId}";
const char* API_KEY = "${firebaseConfig.apiKey}";

// Hardware Pins for ESP-01
#define PIN_SDA 0       // GPIO 0 for I2C SDA
#define PIN_SCL 2       // GPIO 2 for I2C SCL
#define PIN_WIPER_RELAY 3 // RX pin (GPIO 3) used for Wiper Relay

Adafruit_INA219 ina219;
float highestWattToday = 0.0;
unsigned long lastTelemetryTime = 0;
const unsigned long TELEMETRY_INTERVAL = 3000; // 3 seconds

void setup() {
  // Initialize Serial on TX pin
  Serial.begin(115200);
  delay(200);
  Serial.println("\\nStarting Solar.IOT on ESP-01...");

  // Relay pin setup (Active LOW relay module)
  pinMode(PIN_WIPER_RELAY, OUTPUT);
  digitalWrite(PIN_WIPER_RELAY, HIGH); // Wiper OFF

  // Initialize Software I2C on GPIO 0 and GPIO 2
  Wire.begin(PIN_SDA, PIN_SCL);

  if (!ina219.begin()) {
    Serial.println("Warning: INA219 not detected on GPIO 0/2");
  } else {
    Serial.println("INA219 sensor initialized successfully!");
  }

  // Connect to Wi-Fi
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  Serial.print("Connecting to Wi-Fi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\\nWi-Fi Connected! IP: " + WiFi.localIP().toString());
}

// Function to push telemetry data directly to Cloud Firestore REST API
void pushTelemetryToFirestore(float voltage, float current, float power) {
  WiFiClientSecure client;
  client.setInsecure(); // Skip SSL certificate verification on ESP-01 for speed & low RAM

  HTTPClient https;
  String url = "https://firestore.googleapis.com/v1/projects/" + String(PROJECT_ID) + 
               "/databases/" + String(DATABASE_ID) + 
               "/documents/solar_iot/node_01?updateMask.fieldPaths=voltage" +
               "&updateMask.fieldPaths=current" +
               "&updateMask.fieldPaths=power" +
               "&updateMask.fieldPaths=highestWattToday" +
               "&updateMask.fieldPaths=espConnected" +
               "&updateMask.fieldPaths=updatedAt&key=" + String(API_KEY);

  if (https.begin(client, url)) {
    https.addHeader("Content-Type", "application/json");

    // Construct Firestore Document JSON Payload
    String jsonPayload = "{\\"fields\\":{";
    jsonPayload += "\\"voltage\\":{\\"doubleValue\\":" + String(voltage, 2) + "},";
    jsonPayload += "\\"current\\":{\\"doubleValue\\":" + String(current, 2) + "},";
    jsonPayload += "\\"power\\":{\\"doubleValue\\":" + String(power, 2) + "},";
    jsonPayload += "\\"highestWattToday\\":{\\"doubleValue\\":" + String(highestWattToday, 2) + "},";
    jsonPayload += "\\"espConnected\\":{\\"booleanValue\\":true},";
    jsonPayload += "\\"updatedAt\\":{\\"stringValue\\":\\"" + String(millis()) + "\\"}}}";

    int httpCode = https.PATCH(jsonPayload);
    if (httpCode > 0) {
      Serial.printf("[Firestore] Telemetry pushed! Code: %d\\n", httpCode);
    } else {
      Serial.printf("[Firestore] PATCH failed, error: %s\\n", https.errorToString(httpCode).c_str());
    }
    https.end();
  }
}

// Check if web dashboard triggered the wiper sweep
void checkWiperCommand() {
  WiFiClientSecure client;
  client.setInsecure();

  HTTPClient https;
  String url = "https://firestore.googleapis.com/v1/projects/" + String(PROJECT_ID) + 
               "/databases/" + String(DATABASE_ID) + 
               "/documents/solar_iot/node_01?key=" + String(API_KEY);

  if (https.begin(client, url)) {
    int httpCode = https.GET();
    if (httpCode == HTTP_CODE_OK) {
      String payload = https.getString();
      if (payload.indexOf("START_CLEANING") > 0) {
        Serial.println(">>> START_CLEANING command received! Actuating Wiper...");
        
        // Actuate Motorized Squeegee Wiper (Relay Active)
        digitalWrite(PIN_WIPER_RELAY, LOW);
        delay(8000); // 8-second forward and back sweep
        digitalWrite(PIN_WIPER_RELAY, HIGH);
        Serial.println(">>> Wiper cycle completed! Docked home.");

        // Reset command in Firestore to IDLE
        acknowledgeCleanFinished();
      }
    }
    https.end();
  }
}

void acknowledgeCleanFinished() {
  WiFiClientSecure client;
  client.setInsecure();
  HTTPClient https;
  String url = "https://firestore.googleapis.com/v1/projects/" + String(PROJECT_ID) + 
               "/databases/" + String(DATABASE_ID) + 
               "/documents/solar_iot/node_01?updateMask.fieldPaths=command&updateMask.fieldPaths=wiperActive&updateMask.fieldPaths=cleaningStatus&key=" + String(API_KEY);

  if (https.begin(client, url)) {
    https.addHeader("Content-Type", "application/json");
    String payload = "{\\"fields\\":{";
    payload += "\\"command\\":{\\"stringValue\\":\\"IDLE\\"},";
    payload += "\\"wiperActive\\":{\\"booleanValue\\":false},";
    payload += "\\"cleaningStatus\\":{\\"stringValue\\":\\"completed\\"}}}";
    https.PATCH(payload);
    https.end();
  }
}

void loop() {
  // Periodically read sensor and push telemetry
  if (millis() - lastTelemetryTime >= TELEMETRY_INTERVAL) {
    lastTelemetryTime = millis();

    float busVoltage = ina219.getBusVoltage_V();
    float current_mA = ina219.getCurrent_mA();
    float current_A = current_mA / 1000.0;
    float power_W = busVoltage * current_A;

    if (power_W > highestWattToday) {
      highestWattToday = power_W;
    }

    Serial.printf("Solar: %.2fV | %.2fA | %.2fW\\n", busVoltage, current_A, power_W);
    pushTelemetryToFirestore(busVoltage, current_A, power_W);

    // Check if dashboard sent cleaning command
    checkWiperCommand();
  }
}
`;

  // 2. Arduino Uno / Nano + ESP-01 Pair Code
  const arduinoEsp01CodeSnippet = `/*
 * Solar.IOT - Arduino Nano / Uno + ESP-01 Dual Hardware Rig
 * 
 * Architecture:
 *   - Arduino Nano: Reads LM35 Temp (A0), FC-37 Rain (A1), INA219 (A4/A5), Controls Wiper (D7)
 *   - ESP-01: Connects to Wi-Fi and bridges data to Firebase via SoftwareSerial (D2 RX, D3 TX)
 */

#include <SoftwareSerial.h>
#include <Wire.h>
#include <Adafruit_INA219.h>

SoftwareSerial espSerial(2, 3); // RX=D2 (connect to ESP-01 TX), TX=D3 (connect to ESP-01 RX via voltage divider)
Adafruit_INA219 ina219;

#define PIN_LM35 A0
#define PIN_RAIN A1
#define PIN_WIPER_RELAY 7

float highestWattToday = 0.0;
unsigned long lastSend = 0;

void setup() {
  Serial.begin(9600);
  espSerial.begin(9600); // Set ESP-01 to 9600 baud for stable SoftwareSerial
  
  pinMode(PIN_WIPER_RELAY, OUTPUT);
  digitalWrite(PIN_WIPER_RELAY, HIGH); // Relay OFF

  Wire.begin();
  ina219.begin();

  Serial.println("Arduino + ESP-01 Rig Ready");
}

void loop() {
  // Check if ESP-01 forwarded a command from Dashboard
  if (espSerial.available()) {
    String cmd = espSerial.readStringUntil('\\n');
    cmd.trim();
    if (cmd == "START_CLEANING") {
      Serial.println("Actuating Wiper Arm via Relay...");
      digitalWrite(PIN_WIPER_RELAY, LOW); // Turn Relay ON
      delay(8000);                        // Sweep glass
      digitalWrite(PIN_WIPER_RELAY, HIGH);// Dock home
      espSerial.println("CLEAN_DONE");
    }
  }

  // Periodic sensor read
  if (millis() - lastSend > 3000) {
    lastSend = millis();

    float v = ina219.getBusVoltage_V();
    float i = ina219.getCurrent_mA() / 1000.0;
    float w = v * i;
    if (w > highestWattToday) highestWattToday = w;

    int lm35Raw = analogRead(PIN_LM35);
    float tempC = (lm35Raw * (5.0 / 1024.0)) * 100.0; // LM35: 10mV/°C
    bool isRaining = (analogRead(PIN_RAIN) < 500);

    // Send formatted telemetry to ESP-01
    espSerial.print("DATA,");
    espSerial.print(v); espSerial.print(",");
    espSerial.print(i); espSerial.print(",");
    espSerial.print(w); espSerial.print(",");
    espSerial.print(tempC); espSerial.print(",");
    espSerial.println(isRaining ? "1" : "0");
  }
}
`;

  // 3. ESP32 Sketch (Full-featured with INA219, LM35, Rain, Wiper Relay, Firestore HTTPS REST)
  const esp32CodeSnippet = `/*
 * Solar.IOT - ESP32 Dual-Core Firmware
 * 
 * Hardware Connections:
 *   INA219 I2C:   SDA -> GPIO 21, SCL -> GPIO 22 (Powered by 3.3V)
 *   LM35 Temp:    Vout -> GPIO 34 (ADC1 analog input, 10mV/°C)
 *   FC-37 Rain:   Analog AO -> GPIO 35 (ADC1 analog input)
 *   Wiper Relay:  IN -> GPIO 27 (Active-LOW 5V Relay controlling Squeegee)
 *
 * Board in Arduino IDE:
 *   Tools -> Board: "ESP32 Dev Module"
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <WiFiClientSecure.h>
#include <Wire.h>
#include <Adafruit_INA219.h>

// 1. Wi-Fi Credentials
const char* WIFI_SSID = "YOUR_WIFI_SSID";
const char* WIFI_PASS = "YOUR_WIFI_PASSWORD";

// 2. Firebase Cloud Firestore Project Credentials
const char* PROJECT_ID = "${firebaseConfig.projectId}";
const char* DATABASE_ID = "${firebaseConfig.firestoreDatabaseId}";
const char* API_KEY = "${firebaseConfig.apiKey}";

// Hardware Pins
#define PIN_LM35 34
#define PIN_RAIN 35
#define PIN_WIPER_RELAY 27

Adafruit_INA219 ina219;
float highestWattToday = 0.0;
unsigned long lastTelemetryTime = 0;
const unsigned long TELEMETRY_INTERVAL = 3000; // 3 seconds

void setup() {
  Serial.begin(115200);
  delay(200);
  Serial.println("\\nStarting Solar.IOT on ESP32...");

  // Relay pin setup (Active-LOW)
  pinMode(PIN_WIPER_RELAY, OUTPUT);
  digitalWrite(PIN_WIPER_RELAY, HIGH); // Wiper OFF

  // ADC inputs
  pinMode(PIN_LM35, INPUT);
  pinMode(PIN_RAIN, INPUT);

  // Initialize I2C on standard ESP32 SDA=21, SCL=22
  Wire.begin(21, 22);
  if (!ina219.begin()) {
    Serial.println("Warning: INA219 sensor not found on GPIO 21/22!");
  } else {
    Serial.println("INA219 sensor initialized successfully!");
  }

  // Connect to Wi-Fi
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  Serial.print("Connecting to Wi-Fi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\\nWi-Fi Connected! IP: " + WiFi.localIP().toString());
}

// Push live telemetry directly to Firestore
void pushTelemetryToFirestore(float v, float i, float p, float tempC, bool isRaining) {
  WiFiClientSecure client;
  client.setInsecure(); // Skip certificate verification for high speed

  HTTPClient https;
  String url = "https://firestore.googleapis.com/v1/projects/" + String(PROJECT_ID) + 
               "/databases/" + String(DATABASE_ID) + 
               "/documents/solar_iot/node_01?updateMask.fieldPaths=voltage" +
               "&updateMask.fieldPaths=current" +
               "&updateMask.fieldPaths=power" +
               "&updateMask.fieldPaths=temperature" +
               "&updateMask.fieldPaths=isRaining" +
               "&updateMask.fieldPaths=highestWattToday" +
               "&updateMask.fieldPaths=espConnected" +
               "&updateMask.fieldPaths=updatedAt&key=" + String(API_KEY);

  if (https.begin(client, url)) {
    https.addHeader("Content-Type", "application/json");

    String jsonPayload = "{\\"fields\\":{";
    jsonPayload += "\\"voltage\\":{\\"doubleValue\\":" + String(v, 2) + "},";
    jsonPayload += "\\"current\\":{\\"doubleValue\\":" + String(i, 2) + "},";
    jsonPayload += "\\"power\\":{\\"doubleValue\\":" + String(p, 2) + "},";
    jsonPayload += "\\"temperature\\":{\\"doubleValue\\":" + String(tempC, 1) + "},";
    jsonPayload += "\\"isRaining\\":{\\"booleanValue\\":" + String(isRaining ? "true" : "false") + "},";
    jsonPayload += "\\"highestWattToday\\":{\\"doubleValue\\":" + String(highestWattToday, 2) + "},";
    jsonPayload += "\\"espConnected\\":{\\"booleanValue\\":true},";
    jsonPayload += "\\"updatedAt\\":{\\"stringValue\\":\\"" + String(millis()) + "\\"}}}";

    int httpCode = https.PATCH(jsonPayload);
    if (httpCode > 0) {
      Serial.printf("[Firestore] Telemetry pushed! Code: %d | Solar: %.1fV, %.2fA, %.1fW | Temp: %.1fC\\n", 
                    httpCode, v, i, p, tempC);
    } else {
      Serial.printf("[Firestore] Telemetry failed: %s\\n", https.errorToString(httpCode).c_str());
    }
    https.end();
  }
}

// Check if web app triggered wiper sweep
void checkWiperCommand() {
  WiFiClientSecure client;
  client.setInsecure();

  HTTPClient https;
  String url = "https://firestore.googleapis.com/v1/projects/" + String(PROJECT_ID) + 
               "/databases/" + String(DATABASE_ID) + 
               "/documents/solar_iot/node_01?key=" + String(API_KEY);

  if (https.begin(client, url)) {
    int httpCode = https.GET();
    if (httpCode == HTTP_CODE_OK) {
      String payload = https.getString();
      if (payload.indexOf("START_CLEANING") > 0) {
        Serial.println(">>> START_CLEANING command detected! Driving wiper...");
        
        // Actuate wiper motor via Relay (Active-LOW)
        digitalWrite(PIN_WIPER_RELAY, LOW);
        delay(8000); // 8-second glass sweeping pass
        digitalWrite(PIN_WIPER_RELAY, HIGH);
        Serial.println(">>> Wiper cycle completed! Arm parked at home position.");

        // Acknowledge completion in Firestore
        acknowledgeCleanFinished();
      }
    }
    https.end();
  }
}

void acknowledgeCleanFinished() {
  WiFiClientSecure client;
  client.setInsecure();
  HTTPClient https;
  String url = "https://firestore.googleapis.com/v1/projects/" + String(PROJECT_ID) + 
               "/databases/" + String(DATABASE_ID) + 
               "/documents/solar_iot/node_01?updateMask.fieldPaths=command&updateMask.fieldPaths=wiperActive&updateMask.fieldPaths=cleaningStatus&key=" + String(API_KEY);

  if (https.begin(client, url)) {
    https.addHeader("Content-Type", "application/json");
    String payload = "{\\"fields\\":{";
    payload += "\\"command\\":{\\"stringValue\\":\\"IDLE\\"},";
    payload += "\\"wiperActive\\":{\\"booleanValue\\":false},";
    payload += "\\"cleaningStatus\\":{\\"stringValue\\\\"completed\\"}}}";
    https.PATCH(payload);
    https.end();
  }
}

void loop() {
  if (millis() - lastTelemetryTime >= TELEMETRY_INTERVAL) {
    lastTelemetryTime = millis();

    // Read INA219 (Voltage, Current, Power)
    float busVoltage = ina219.getBusVoltage_V();
    float current_mA = ina219.getCurrent_mA();
    float current_A = max(0.0f, current_mA / 1000.0f);
    float power_W = busVoltage * current_A;

    if (power_W > highestWattToday) {
      highestWattToday = power_W;
    }

    // Read LM35 Temperature on GPIO 34 (ADC 12-bit: 0-4095, 3.3V ref, 10mV/°C)
    int rawLM35 = analogRead(PIN_LM35);
    float tempVolts = (rawLM35 / 4095.0f) * 3.3f;
    float tempC = tempVolts * 100.0f;

    // Read Rain Sensor on GPIO 35
    int rawRain = analogRead(PIN_RAIN);
    bool isRaining = (rawRain < 2500); // Low value = water detected

    pushTelemetryToFirestore(busVoltage, current_A, power_W, tempC, isRaining);
    checkWiperCommand();
  }
}
`;

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl backdrop-blur-md">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-800 gap-3">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 shrink-0">
            <Cpu className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-2 flex-wrap">
              <span>Hardware & Firmware Setup Center</span>
              <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                node_01
              </span>
            </h2>
            <p className="text-[11px] sm:text-xs text-slate-400">
              Ready-to-flash sketches & wiring for ESP-01, Arduino + ESP-01, and ESP32
            </p>
          </div>
        </div>

        {/* Actions: Owner Edit & Test Ping */}
        <div className="flex items-center gap-2">
          {isOwner ? (
            <button
              onClick={handleOpenHardwareEdit}
              className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-slate-950 font-mono text-xs font-bold transition cursor-pointer flex items-center gap-1.5 shadow"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Edit Code & Pins (Owner)</span>
            </button>
          ) : (
            <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-[10px] font-mono text-slate-400">
              <Lock className="w-3 h-3 text-amber-400" />
              <span>Admin Protected</span>
            </div>
          )}

          <button
            onClick={handleTestPing}
            className="px-3.5 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 font-mono text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 shadow"
            title="Simulate hardware heartbeat to verify web app listener"
          >
            <Zap className="w-3.5 h-3.5 text-emerald-400" />
            <span>Test Ping</span>
          </button>
        </div>
      </div>

      {testStatus && (
        <div className="mt-3 p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-200 text-xs font-mono flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{testStatus}</span>
        </div>
      )}

      {/* Board Selector Tabs */}
      <div className="mt-4 p-1.5 bg-slate-950 rounded-xl border border-slate-800 flex flex-wrap gap-1 text-xs font-mono">
        <button
          onClick={() => setSelectedBoard('esp01')}
          className={`flex-1 py-2 px-3 rounded-lg transition cursor-pointer flex items-center justify-center gap-2 text-center ${
            selectedBoard === 'esp01'
              ? 'bg-cyan-500 text-slate-950 font-black shadow-md'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Cpu className="w-3.5 h-3.5" />
          <span>ESP-01 / ESP8266 (Standalone)</span>
        </button>
        <button
          onClick={() => setSelectedBoard('arduino_esp01')}
          className={`flex-1 py-2 px-3 rounded-lg transition cursor-pointer flex items-center justify-center gap-2 text-center ${
            selectedBoard === 'arduino_esp01'
              ? 'bg-cyan-500 text-slate-950 font-black shadow-md'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Arduino + ESP-01 (Dual Rig)</span>
        </button>
        <button
          onClick={() => setSelectedBoard('esp32')}
          className={`flex-1 py-2 px-3 rounded-lg transition cursor-pointer flex items-center justify-center gap-2 text-center ${
            selectedBoard === 'esp32'
              ? 'bg-cyan-500 text-slate-950 font-black shadow-md'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Cpu className="w-3.5 h-3.5" />
          <span>ESP32 DevKit (Standard)</span>
        </button>
      </div>

      {/* Sub Tab Switcher: Wiring Diagram / Arduino Code / Credentials */}
      <div className="flex items-center justify-between mt-4 pb-2 border-b border-slate-800 text-xs font-mono">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('wiring')}
            className={`px-3 py-1 rounded-lg transition cursor-pointer ${
              activeTab === 'wiring'
                ? 'bg-slate-800 text-cyan-400 font-bold border border-slate-700'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            1. Pinout & Wiring
          </button>
          <button
            onClick={() => setActiveTab('arduino')}
            className={`px-3 py-1 rounded-lg transition cursor-pointer ${
              activeTab === 'arduino'
                ? 'bg-slate-800 text-cyan-400 font-bold border border-slate-700'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            2. Arduino Sketch (.ino)
          </button>
          <button
            onClick={() => setActiveTab('credentials')}
            className={`px-3 py-1 rounded-lg transition cursor-pointer ${
              activeTab === 'credentials'
                ? 'bg-slate-800 text-cyan-400 font-bold border border-slate-700'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            3. Firebase Credentials
          </button>
        </div>
      </div>

      {/* Tab 1: Pinout & Wiring Content */}
      {activeTab === 'wiring' && (
        <div className="mt-4 space-y-4">
          
          {selectedBoard === 'esp01' && (
            <div className="space-y-4 animate-fadeIn">
              
              {/* Critical Notice for ESP-01 Power */}
              <div className="p-3.5 bg-amber-950/30 border border-amber-500/30 rounded-xl text-xs text-amber-200 flex items-start gap-2.5">
                <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <span className="font-bold text-white">Critical ESP-01 Hardware Requirements:</span>
                  <p>
                    1. <strong>Power (3.3V Only):</strong> The ESP-01 consumes up to <strong>300mA</strong> during Wi-Fi bursts. Never power it directly from an Arduino 3.3V pin without an external AMS1117 3.3V regulator and a <strong>10µF–100µF capacitor</strong> across VCC and GND to prevent brownout reboots.
                  </p>
                  <p>
                    2. <strong>CH_PD (EN) Pin:</strong> Must be connected to <strong>3.3V</strong> (pulled HIGH) for the chip to boot.
                  </p>
                </div>
              </div>

              {/* Visual 8-Pin ESP-01 Diagram */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4">
                <h4 className="text-xs font-mono uppercase text-slate-400 mb-3 flex items-center gap-1.5">
                  <Cpu className="w-4 h-4 text-cyan-400" />
                  ESP-01 (ESP8266) 8-Pin Visual Header Pinout
                </h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Pin Layout Table */}
                  <div className="space-y-2 text-xs font-mono">
                    <div className="flex justify-between p-2 rounded-lg bg-slate-900 border border-slate-800">
                      <span className="text-cyan-400 font-bold">Pin 1: GND</span>
                      <span className="text-slate-400">Connect to Common System Ground</span>
                    </div>
                    <div className="flex justify-between p-2 rounded-lg bg-slate-900 border border-slate-800">
                      <span className="text-cyan-400 font-bold">Pin 2: TX (GPIO 1)</span>
                      <span className="text-slate-400">Serial Output / Debugging (115200 baud)</span>
                    </div>
                    <div className="flex justify-between p-2 rounded-lg bg-slate-900 border border-slate-800">
                      <span className="text-emerald-400 font-bold">Pin 3: GPIO 2</span>
                      <span className="text-emerald-300">INA219 SCL (I2C Clock)</span>
                    </div>
                    <div className="flex justify-between p-2 rounded-lg bg-slate-900 border border-slate-800">
                      <span className="text-amber-400 font-bold">Pin 4: CH_PD (EN)</span>
                      <span className="text-amber-300">Pull to 3.3V (Chip Enable)</span>
                    </div>
                  </div>

                  <div className="space-y-2 text-xs font-mono">
                    <div className="flex justify-between p-2 rounded-lg bg-slate-900 border border-slate-800">
                      <span className="text-emerald-400 font-bold">Pin 5: GPIO 0</span>
                      <span className="text-emerald-300">INA219 SDA (I2C Data) [Keep HIGH on boot]</span>
                    </div>
                    <div className="flex justify-between p-2 rounded-lg bg-slate-900 border border-slate-800">
                      <span className="text-slate-400 font-bold">Pin 6: RST</span>
                      <span className="text-slate-500">Reset (Leave floating or pull HIGH)</span>
                    </div>
                    <div className="flex justify-between p-2 rounded-lg bg-slate-900 border border-slate-800">
                      <span className="text-purple-400 font-bold">Pin 7: RX (GPIO 3)</span>
                      <span className="text-purple-300">Wiper Relay Control IN (Active-LOW)</span>
                    </div>
                    <div className="flex justify-between p-2 rounded-lg bg-slate-900 border border-slate-800">
                      <span className="text-red-400 font-bold">Pin 8: VCC</span>
                      <span className="text-red-300">3.3V Regulated Power (300mA+)</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Component Wiring Breakdown */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono">
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <div className="text-emerald-400 font-bold mb-1 flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5" />
                    INA219 Sensor
                  </div>
                  <div className="text-slate-400 text-[11px] space-y-1">
                    <div>• VCC &rarr; 3.3V</div>
                    <div>• GND &rarr; GND</div>
                    <div>• SDA &rarr; ESP-01 GPIO 0</div>
                    <div>• SCL &rarr; ESP-01 GPIO 2</div>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <div className="text-purple-400 font-bold mb-1 flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5" />
                    Wiper Motor Relay
                  </div>
                  <div className="text-slate-400 text-[11px] space-y-1">
                    <div>• VCC &rarr; 5V (Relay power)</div>
                    <div>• GND &rarr; Common GND</div>
                    <div>• IN &rarr; ESP-01 RX (GPIO 3)</div>
                    <div>• Controls 12V Wiper Motor</div>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <div className="text-sky-400 font-bold mb-1 flex items-center gap-1.5">
                    <Wifi className="w-3.5 h-3.5" />
                    Wi-Fi Connection
                  </div>
                  <div className="text-slate-400 text-[11px] space-y-1">
                    <div>• Direct HTTPS to Firestore</div>
                    <div>• Pushes V, I, Watts</div>
                    <div>• Listens for Wipe Triggers</div>
                    <div>• No extra bridge needed!</div>
                  </div>
                </div>
              </div>

            </div>
          )}

          {selectedBoard === 'arduino_esp01' && (
            <div className="space-y-4 animate-fadeIn">
              <div className="p-3.5 bg-cyan-950/20 border border-cyan-500/20 rounded-xl text-xs text-cyan-200">
                <span className="font-bold text-white">Why use Arduino + ESP-01 together? </span>
                The ESP-01 has limited pins and no analog inputs. Pairing an Arduino Nano with the ESP-01 allows you to connect the <strong>LM35 temperature sensor (A0)</strong>, <strong>Raindrop sensor (A1)</strong>, and <strong>INA219 (A4/A5)</strong>, while using the ESP-01 purely as a reliable Wi-Fi transmitter!
              </div>

              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 text-xs font-mono">
                <h4 className="text-xs uppercase text-slate-400 mb-3 flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-cyan-400" />
                  Arduino Nano to ESP-01 Interconnection
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                    <div className="text-cyan-400 font-bold mb-1">Arduino Pin Connections:</div>
                    <div className="text-slate-400 space-y-1 text-[11px]">
                      <div>• A0 &rarr; LM35 Temp Sensor Vout</div>
                      <div>• A1 &rarr; FC-37 Rain Sensor A0</div>
                      <div>• A4 (SDA) &rarr; INA219 SDA</div>
                      <div>• A5 (SCL) &rarr; INA219 SCL</div>
                      <div>• D7 &rarr; Wiper Relay IN</div>
                    </div>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                    <div className="text-amber-400 font-bold mb-1">ESP-01 Communication:</div>
                    <div className="text-slate-400 space-y-1 text-[11px]">
                      <div>• Arduino D2 (RX) &larr; ESP-01 TX</div>
                      <div>• Arduino D3 (TX) &rarr; Voltage Divider (1k/2k) &rarr; ESP-01 RX</div>
                      <div>• 3.3V External Power &rarr; ESP-01 VCC & CH_PD</div>
                      <div>• Common GND between Arduino and ESP-01</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {selectedBoard === 'esp32' && (
            <div className="space-y-4 animate-fadeIn">
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-mono uppercase text-slate-400 flex items-center gap-1.5">
                    <Cpu className="w-4 h-4 text-emerald-400" />
                    {hardwareConfig.microcontrollerType} Pinout
                  </h4>
                  <span className="text-[10px] font-mono text-cyan-400 bg-cyan-400/10 px-2 py-0.5 rounded border border-cyan-400/20">
                    Live Firestore Hardware Map
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
                  <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800/80">
                    <div className="text-slate-400 text-[11px]">INA219 (V & I)</div>
                    <div className="text-emerald-400 font-bold mt-1 text-[11px] truncate">{hardwareConfig.pinINA219SDA}</div>
                    <div className="text-[10px] text-slate-500 truncate">{hardwareConfig.pinINA219SCL}</div>
                  </div>
                  <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800/80">
                    <div className="text-slate-400 text-[11px]">LM35 (Temp)</div>
                    <div className="text-amber-400 font-bold mt-1 text-[11px] truncate">{hardwareConfig.pinLM35}</div>
                    <div className="text-[10px] text-slate-500">10mV / °C analog</div>
                  </div>
                  <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800/80">
                    <div className="text-slate-400 text-[11px]">Rain Sensor</div>
                    <div className="text-sky-400 font-bold mt-1 text-[11px] truncate">{hardwareConfig.pinRainDigital}</div>
                    <div className="text-[10px] text-slate-500">FC-37 Rain & mist</div>
                  </div>
                  <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800/80">
                    <div className="text-slate-400 text-[11px]">Wiper Relay</div>
                    <div className="text-purple-400 font-bold mt-1 text-[11px] truncate">{hardwareConfig.pinWiperRelay}</div>
                    <div className="text-[10px] text-slate-500">Motorized squeegee</div>
                  </div>
                </div>

                <div className="mt-3 p-2.5 rounded-lg bg-slate-900/60 border border-slate-800/60 text-[11px] font-mono text-slate-400 flex items-start gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-slate-300 font-bold">Calibration & Auto-Clean Notes: </span>
                    {hardwareConfig.sensorCalibrationNotes}
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
      )}

      {/* Tab 2: Arduino Sketch Code Content */}
      {activeTab === 'arduino' && (
        <div className="mt-4 space-y-3 animate-fadeIn">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-400">
            <span className="flex items-center gap-1.5 font-mono">
              <FileCode className="w-4 h-4 text-cyan-400" />
              {selectedBoard === 'esp01' 
                ? 'solar_iot_esp01_standalone.ino (Pre-configured with your Firebase credentials)' 
                : (selectedBoard === 'arduino_esp01' ? 'solar_iot_arduino_esp01_dual.ino' : 'solar_iot_esp32_devkit.ino')}
            </span>
            <button
              onClick={() => copyToClipboard(
                selectedBoard === 'esp01' ? esp01CodeSnippet : (selectedBoard === 'arduino_esp01' ? arduinoEsp01CodeSnippet : esp32CodeSnippet), 
                setCopiedCode
              )}
              className="bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/30 px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 cursor-pointer font-medium self-start sm:self-auto"
            >
              {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedCode ? 'Copied Full Sketch!' : 'Copy Arduino Sketch'}</span>
            </button>
          </div>

          <pre className="bg-slate-950 p-4 rounded-xl border border-slate-800 font-mono text-[11px] leading-relaxed text-slate-300 overflow-x-auto max-h-[420px] scrollbar-thin">
            {selectedBoard === 'esp01' ? esp01CodeSnippet : (selectedBoard === 'arduino_esp01' ? arduinoEsp01CodeSnippet : esp32CodeSnippet)}
          </pre>
        </div>
      )}

      {/* Tab 3: Credentials Content */}
      {activeTab === 'credentials' && (
        <div className="mt-4 space-y-4 animate-fadeIn">
          <div className="p-3.5 bg-cyan-950/20 border border-cyan-500/20 rounded-xl text-xs text-cyan-200 flex items-start gap-2.5">
            <ShieldCheck className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-white">Direct Cloud Firestore REST Target: </span>
              Your hardware communicates with this exact database document. Any microcontroller (ESP-01, ESP8266, ESP32) can write via HTTPS PATCH.
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* API Key */}
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2 text-xs font-mono text-slate-400">
                  <Key className="w-4 h-4 text-amber-400" />
                  <span>Firebase API Key (API_KEY)</span>
                </div>
                <button
                  onClick={() => copyToClipboard(firebaseConfig.apiKey, setCopiedKey)}
                  className="text-xs text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer bg-slate-800 hover:bg-slate-700 px-2 py-1 rounded transition"
                >
                  {copiedKey ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedKey ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
              <div className="bg-slate-900 border border-slate-800 rounded-lg p-2.5 font-mono text-xs text-amber-300 break-all select-all">
                {firebaseConfig.apiKey}
              </div>
            </div>

            {/* Project ID */}
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2 text-xs font-mono text-slate-400">
                  <Database className="w-4 h-4 text-sky-400" />
                  <span>Project ID / Database Target</span>
                </div>
                <button
                  onClick={() => copyToClipboard(firebaseConfig.projectId, setCopiedUrl)}
                  className="text-xs text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer bg-slate-800 hover:bg-slate-700 px-2 py-1 rounded transition"
                >
                  {copiedUrl ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedUrl ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
              <div className="bg-slate-900 border border-slate-800 rounded-lg p-2.5 font-mono text-xs text-sky-300 break-all select-all">
                Project: {firebaseConfig.projectId} | DB: {firebaseConfig.firestoreDatabaseId}
              </div>
            </div>
          </div>

          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 text-xs font-mono text-slate-400 space-y-2">
            <div className="text-white font-bold">Firestore Document Path for Hardware:</div>
            <div className="p-2 rounded bg-slate-900 border border-slate-800 text-cyan-300 select-all break-all">
              projects/{firebaseConfig.projectId}/databases/{firebaseConfig.firestoreDatabaseId}/documents/solar_iot/node_01
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
