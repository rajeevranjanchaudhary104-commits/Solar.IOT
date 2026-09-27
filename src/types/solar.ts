export interface TelemetryPoint {
  time: string;           // e.g., "08:00", "09:00"
  power: number;          // Watts
  voltage: number;        // Volts
  current: number;        // Amperes
  temperature: number;    // °C
  isRaining?: boolean;    // rain occurred
}

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
  espConnected: boolean;          // Real IoT hardware connection status
  updatedAt: string | null;       // Timestamp
  rssi?: number | null;           // Wi-Fi signal strength in dBm
  dailyEnergyWh?: number | null;  // Accumulated Watt-hours today
  efficiency?: number | null;     // Estimated efficiency %
  
  // Rain Sensor (FC-37) & Highest Watt Telemetry
  isRaining: boolean | null;      // Live rain detection (null = N/A)
  lastRainTime: string | null;    // e.g. "Today, 03:15 AM" or null
  rainIntensityMm: number | null; // e.g. 2.4 mm/hr (null = N/A)
  highestWattToday: number | null;// Peak Watt recorded today (null = N/A)
  highestWattTime: string | null; // e.g. "01:15 PM"
  allTimeRecordWatt: number | null; // Record peak wattage
  soilingIndex: number | null;    // % dust level on glass
  scheduledCleanTime?: string;    // e.g. "03:00 AM" (customizable by owner in Firebase)
  isDemoMode?: boolean;           // User toggled simulation mode
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
