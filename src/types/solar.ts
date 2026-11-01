export interface TelemetryPoint {
  time: string;           // e.g., "08:00", "09:00"
  power: number;          // Watts
  voltage: number;        // Volts
  current: number;        // Amperes
  temperature: number;    // °C
  isRaining?: boolean;    // rain occurred
}

export type TelemetryHistoryPoint = TelemetryPoint;

export interface SolarData {
  voltage: number | null;         // Volts from INA219 (null = N/A when ESP32 offline)
  current: number | null;         // Amperes from INA219 (null = N/A)
  power: number | null;           // Calculated: voltage * current (null = N/A)
  temperature: number | null;     // Celsius from LM35 sensor (null = N/A)
  batteryPercent: number | null;  // % state of charge (null = N/A)
  lastCleanedTime: string | null; // ISO string or human string
  cleaningStatus: 'idle' | 'cleaning' | 'completed' | 'alert' | 'offline';
  pumpActive: boolean;            // mechanical water pump
  wiperActive: boolean;           // wiper servo/motor
  triggerWiper?: boolean;         // remote wiper trigger flag
  espConnected: boolean;          // Real IoT hardware connection status
  updatedAt: string | null;       // Timestamp
  rssi?: number | null;           // Wi-Fi signal strength in dBm
  dailyEnergyWh?: number | null;  // Accumulated Watt-hours today
  efficiency?: number | null;     // Estimated efficiency %
  
  // Telemetry & Engineering Metrics
  isRaining: boolean | null;      // Live rain detection (null = N/A)
  lastRainTime: string | null;    // e.g. "Today, 03:15 AM" or null
  rainIntensityMm: number | null; // e.g. 2.4 mm/hr (null = N/A)
  highestWattToday: number | null;// Peak Watt recorded today (null = N/A)
  highestWattTime: string | null; // e.g. "01:15 PM"
  highestVoltageToday?: number | null; // Peak Voltage recorded today (null = N/A)
  highestVoltageTime?: string | null;  // e.g. "12:45 PM"
  inverterLoadWatts?: number | null;   // Real-time connected AC/DC Inverter Load (Watts)
  gridExportWatts?: number | null;     // Real-time on-grid export watts (Solar Watt - Load Watt)
  allTimeRecordWatt: number | null; // Record peak wattage
  soilingIndex: number | null;    // % dust level on glass
  scheduledCleanTime?: string;    // e.g. "03:00 AM" (customizable by owner in Firebase)
  connectionMode?: 'firebase' | 'local_ap'; // Cloud Firebase vs Direct Local ESP32 AP
  localApIp?: string;             // e.g. "192.168.4.1"
  localApLatencyMs?: number | null; // e.g. 18 ms

  // Farm IoT Soil Moisture & Irrigation Telemetry
  soilMoisture?: number | null;         // Soil Moisture percentage 0-100% (null = N/A when offline)
  soilMoistureRaw?: number | null;      // Raw ADC reading (e.g. 0-4095 on GPIO 32)
  soilStatus?: 'dry' | 'optimal' | 'wet' | null; // Moisture state: dry (<30%), optimal (30-70%), wet (>70%)
  soilTemperature?: number | null;      // Sub-surface soil probe temperature (°C)
  irrigationPumpActive?: boolean;       // Irrigation water pump / solenoid valve state (GPIO 26)

  // Windmill & Peltier Module Current, RPM, and Temperatures
  peltierCurrent?: number | null;       // Peltier Module Current (Amps)
  peltierVoltage?: number | null;       // Peltier Module Voltage (Volts)
  peltierPower?: number | null;         // Peltier Generated/Drawn Power (Watts)
  sandTemp?: number | null;             // Sand Temperature (°C)
  peltierTemp?: number | null;          // Peltier Junction Temperature (°C)
  environmentTemp?: number | null;      // Environmental Ambient Temperature (°C)
  windmillRpm?: number | null;          // Windmill Rotor RPM
  windmillPower?: number | null;        // Windmill Electricity Generated (Watts)
  windmillVoltage?: number | null;      // Windmill Generator Voltage (Volts)
  windmillCurrent?: number | null;      // Windmill Current Output (Amps)
  airPressure?: number | null;          // Atmospheric Air Pressure (hPa)
}

export interface WindmillPeltierData {
  peltierCurrent: number | null;        // Peltier Module Current (Amps)
  peltierVoltage: number | null;        // Peltier Module Voltage (Volts)
  peltierPower: number | null;          // Peltier Generated Power (Watts)
  sandTemp: number | null;              // Sand Temperature (°C)
  peltierTemp: number | null;           // Peltier Junction Temperature (°C)
  environmentTemp: number | null;       // Environmental Ambient Temperature (°C)
  windmillRpm: number | null;           // Windmill Rotor RPM
  windmillPower: number | null;         // Electricity Generated (Watts)
  windmillVoltage: number | null;       // Windmill Output Voltage (Volts)
  windmillCurrent: number | null;       // Windmill Output Current (Amps)
  airPressure: number | null;           // Atmospheric Air Pressure (hPa)
  updatedAt?: string | null;
  status?: 'generating' | 'idle' | 'offline';
  espConnected?: boolean;
}

export interface CleaningLog {
  id: string;
  timestamp: string;
  triggerType: 'manual' | 'scheduled' | 'auto_dust' | 'esp32_hardware_button';
  durationSeconds: number;
  waterUsedMl: number;
  temperatureBefore: number;
  temperatureAfter: number;
  efficiencyGain: number; // e.g., +14.2%
}

export interface SolarCalculatorState {
  monthlyBill: number;      // ₹
  unitPrice: number;        // ₹ per kWh (unit)
  nightLoadWatts: number;   // Watts
  backupHours: number;      // Hours
}

export interface OverloadThresholds {
  maxInverterLoadWatts: number;  // Default 800W
  maxCurrentAmps: number;        // Default 5.0A
  maxVoltageVolts: number;       // Default 25.0V
  maxTemperatureC: number;       // Default 50.0°C
  shortCircuitCurrentAmps?: number; // Default 6.0A
  shortCircuitVoltageDrop?: number; // Default 2.0V
  shortCircuitProtectionEnabled?: boolean; // Default true
  autoTripRelayEnabled?: boolean; // Default true
  audioAlarmEnabled: boolean;    // Audio buzzer toggle
  pushAlertEnabled: boolean;     // Browser notification toggle
  soundProfile?: 'hindi_voice' | 'emergency_siren' | 'pulsed_beeper' | 'custom_audio' | 'short_circuit_alarm';
  customAudioUrl?: string | null; // Base64 Data URL or audio file link
  customAudioName?: string | null;
}

export interface OverloadEvent {
  id: string;
  timestamp: string;
  type: 'short_circuit' | 'inverter_load' | 'current' | 'voltage' | 'thermal' | 'simulated';
  title: string;
  value: number;
  threshold: number;
  unit: string;
  severity: 'warning' | 'critical';
  recommendation: string;
  isShortCircuit?: boolean;
}

export interface StoreProduct {
  id: string;
  name: string;
  brand: string;
  category: 'panels' | 'inverters' | 'batteries' | 'iot_cleaning' | 'accessories';
  priceInr: number;
  rating: number;
  reviewsCount: number;
  capacityLabel: string;
  specs: { [key: string]: string };
  warranty: string;
  efficiency?: string;
  inStock: boolean;
  featured?: boolean;
  image: string;
  badge?: string;
  description: string;
  amazonUrl?: string;
  flipkartUrl?: string;
}

export interface StoreSettingsData {
  storeName: string;
  storeTagline: string;
  storeDescription: string;
  shippingNotice: string;
  announcementEnabled: boolean;
  announcementText: string;
  announcementBadge: string;
  updatedAt?: string;
}

export type UpdateType = 'photo' | 'youtube' | 'pdf' | 'word' | 'ppt';

export interface ProjectUpdate {
  id: string;
  type: UpdateType;
  title: string;
  description: string;
  date: string;
  tag: string;
  author: string;
  imageUrl?: string;
  youtubeUrl?: string;
  youtubeVideoId?: string;
  duration?: string;
  fileSize?: string;
  filePagesOrSlides?: string;
  downloadFileName?: string;
  documentContent?: string;
  isOwnerPost?: boolean;
}

export interface StationProfile {
  uid: string;
  email: string;
  displayName: string;
  stationName: string;
  gridType: 'off_grid' | 'on_grid' | 'hybrid';
  hasWindmill: boolean;
  hasSandBed: boolean;
  firebaseProjectId: string;
  firestoreDatabaseId?: string;
  stationDeviceId?: string;
  firebaseApiKey?: string;
  tutorialVideoUrl?: string;
  onboardingCompleted: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface SecuritySystemData {
  last_detection: string | null;   // 'Human' | 'Animal' | 'None'
  buzzer: boolean;                 // Active buzzer state (true = alarming, false = off)
  camera_active: boolean;          // Camera power state (true = ON, false = OFF)
  system_state?: 'SLEEPING' | 'AWAKE_TRACKING'; // PIR deep sleep vs active tracking state
  servo_angle?: number;            // 15° to 165° SG90 tracking angle
  sleep_command?: boolean;         // true = power-down to deep sleep
  boxed_frame?: string | null;     // Real-time Base64 JPEG frame with YOLOv8 bounding boxes
  raw_frame?: string | null;       // Real-time Base64 JPEG frame from ESP32 camera
  latest_saved_drive_file?: string | null; // Filename of latest intruder photo saved to Google Drive
  google_drive_folder_url?: string | null; // Configured Google Drive intruder archive folder link
  alert_image_url?: string | null; // Legacy image URL fallback
  last_photo_url?: string | null;  // Legacy image URL fallback
  updated_at?: string;
}

export interface SecurityEventLog {
  id: string;
  timestamp: string;
  type: 'human' | 'animal' | 'camera_toggle' | 'buzzer_trigger' | 'rfid_scan';
  detection: string;
  photoUrl?: string | null;
  buzzerTriggered?: boolean;
}

export interface WorkerProfile {
  id: string;
  name: string;
  role: string;
  department: string;
  rfidUid: string;
  photoUrl: string;
  faceRecognitionVerified: boolean;
  muteBuzzerOnEntry: boolean;
  status: 'active' | 'on_shift' | 'off_duty' | 'suspended';
  phone?: string;
  email?: string;
  registeredDate: string;
  lastCheckIn?: string;
}

export interface AttendanceRecord {
  id: string;
  workerId: string;
  workerName: string;
  role: string;
  rfidUid: string;
  timestamp: string;
  date: string;
  time: string;
  faceMatched: boolean;
  buzzerSuppressed: boolean;
  gateId: string;
  photoSnapshotUrl?: string;
  syncedToGoogleDocs: boolean;
  googleDocId?: string;
  googleDocUrl?: string;
}



