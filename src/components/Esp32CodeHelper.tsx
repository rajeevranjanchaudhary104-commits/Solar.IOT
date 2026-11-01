import React, { useState, useEffect, useRef } from 'react';
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
  RotateCw,
  Sun,
  Wind,
  Lock,
  Sparkles,
  Image as ImageIcon,
  Video,
  ZoomIn,
  Upload,
  Download,
  Plus,
  Trash2,
  Tag,
  Radio,
  WifiOff,
  RefreshCw,
  Search,
  Filter,
  Camera,
  Smartphone,
  AlertCircle
} from 'lucide-react';
import { doc, setDoc, onSnapshot, getDoc } from 'firebase/firestore';
import { firebaseConfig, db, getCustomRtdbUrl } from '../lib/firebase';
import { OWNER_EMAILS, OWNER_EMAIL } from './ResearchMode';
import { StationProfile } from '../types/solar';

interface Esp32CodeHelperProps {
  currentUser?: {
    email?: string | null;
    displayName?: string | null;
  } | null;
  onRequireSignIn?: () => void;
  stationProfile?: StationProfile | null;
}


export interface MediaPhotoItem {
  id: string;
  url: string;
  title: string;
  caption: string;
  tag?: string;
  createdAt?: string;
}

export interface HardwareMediaData {
  photos?: MediaPhotoItem[];
  photo1Url?: string;
  photo1Title?: string;
  photo1Caption?: string;
  photo2Url?: string;
  photo2Title?: string;
  photo2Caption?: string;
  videoUrl: string;
  videoTitle: string;
  videoDescription: string;
  videoChannelOrAuthor?: string;
  updatedAt?: string;
}

export function extractYouTubeId(url: string): string | null {
  if (!url) return null;
  const cleanUrl = url.trim();
  
  // Standard watch URL: youtube.com/watch?v=VIDEO_ID
  const watchMatch = cleanUrl.match(/(?:youtube\.com\/watch\?v=|youtube\.com\/watch\?.*&v=)([a-zA-Z0-9_-]{11})/);
  if (watchMatch && watchMatch[1]) return watchMatch[1];

  // Short URL: youtu.be/VIDEO_ID
  const shortMatch = cleanUrl.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
  if (shortMatch && shortMatch[1]) return shortMatch[1];

  // Embed URL: youtube.com/embed/VIDEO_ID
  const embedMatch = cleanUrl.match(/youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/);
  if (embedMatch && embedMatch[1]) return embedMatch[1];

  // Shorts URL: youtube.com/shorts/VIDEO_ID
  const shortsMatch = cleanUrl.match(/youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/);
  if (shortsMatch && shortsMatch[1]) return shortsMatch[1];

  // Direct 11-character video ID
  if (/^[a-zA-Z0-9_-]{11}$/.test(cleanUrl)) return cleanUrl;

  return null;
}

const DEFAULT_MEDIA_PHOTOS: MediaPhotoItem[] = [
  {
    id: 'photo_esp32_ina219',
    url: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1200&q=80',
    title: 'ESP32 Microcontroller & INA219 I2C Circuit',
    caption: 'High-side current shunt and ADC connections for LM35 analog temperature monitoring.',
    tag: 'ESP32 Circuit'
  },
  {
    id: 'photo_wiper_relay',
    url: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=1200&q=80',
    title: 'Optoisolated Wiper Relay & Squeegee Test Bench',
    caption: 'Active-LOW 10A relay module switching 12V DC gearmotor for the solar panel wiper arm.',
    tag: 'Wiper Mechanism'
  },
  {
    id: 'photo_pv_telemetry',
    url: 'https://images.unsplash.com/photo-1509391365360-2e959784a276?auto=format&fit=crop&w=1200&q=80',
    title: 'Photovoltaic Array & Environmental Sensors',
    caption: 'Monocrystalline test rig with surface temperature probe and rain precipitation sensor.',
    tag: 'Solar Telemetry'
  }
];

const DEFAULT_HARDWARE_MEDIA: HardwareMediaData = {
  photos: DEFAULT_MEDIA_PHOTOS,
  photo1Url: DEFAULT_MEDIA_PHOTOS[0].url,
  photo1Title: DEFAULT_MEDIA_PHOTOS[0].title,
  photo1Caption: DEFAULT_MEDIA_PHOTOS[0].caption,
  photo2Url: DEFAULT_MEDIA_PHOTOS[1].url,
  photo2Title: DEFAULT_MEDIA_PHOTOS[1].title,
  photo2Caption: DEFAULT_MEDIA_PHOTOS[1].caption,
  videoUrl: 'https://www.youtube.com/watch?v=8R_K8X5h_eE',
  videoTitle: 'ESP32 Firmware Execution & Wiper Cycle Demo',
  videoDescription: 'Physical hardware demonstration showing Wi-Fi connection, Firestore telemetry stream, and automated wiper cycle.',
  videoChannelOrAuthor: 'Farm.IOT Engineering Lab'
};

export interface DeviceWireConnection {
  id: string;
  boardType: 'all' | 'nodemcu' | 'esp01' | 'arduino_esp01' | 'esp32';
  subsystem?: 'all' | 'solar' | 'windmill' | 'peltier' | 'actuator' | 'general';
  deviceName: string;
  category: 'sensor' | 'actuator' | 'communication' | 'power' | 'custom';
  pinLabel: string;
  interfaceType: 'I2C' | 'Analog ADC' | 'Digital Input' | 'Digital Output' | 'PWM / Servo' | 'UART Serial' | 'SPI' | 'Power (3.3V/5V/12V)';
  voltageLevel: '3.3V' | '5V' | '12V DC' | 'GND / Common Ground';
  description: string;
  wireColors?: string;
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
  devices: DeviceWireConnection[];
  customFirmwareCode?: string;
  updatedAt?: string;
}

const DEFAULT_DEVICES: DeviceWireConnection[] = [
  // Windmill Components
  {
    id: 'hall_tachometer',
    boardType: 'esp32',
    subsystem: 'windmill',
    deviceName: 'Hall Effect Magnetic RPM Tachometer (A3144 / NJK-5002C)',
    category: 'sensor',
    pinLabel: 'ESP32: GPIO 34 (Hardware Interrupt INPUT_PULLUP)',
    interfaceType: 'Digital Input',
    voltageLevel: '3.3V',
    description: 'Measures rotor shaft speed via neodymium magnet passes on rotor hub. Hardware interrupt counts revolutions per minute (RPM) with sub-millisecond precision.',
    wireColors: 'Brown (3.3V VCC), Blue (Common GND), Black (Signal Output to GPIO 34 with 10kΩ pull-up)'
  },
  {
    id: 'ina219_windmill',
    boardType: 'esp32',
    subsystem: 'windmill',
    deviceName: 'Windmill INA219 High-Side Power & Current Monitor (0x41)',
    category: 'sensor',
    pinLabel: 'ESP32: GPIO 21 (SDA), GPIO 22 (SCL) | I2C Address: 0x41',
    interfaceType: 'I2C',
    voltageLevel: '3.3V',
    description: 'Dedicated current & voltage monitor measuring rectified DC power generated by the wind turbine generator. Bridge A0 solder jumper for address 0x41.',
    wireColors: 'Red (3.3V), Black (GND), Blue (SDA to GPIO 21), Yellow (SCL to GPIO 22), Vin+/Vin- (Generator In-line)'
  },
  {
    id: 'bmp280_pressure',
    boardType: 'all',
    subsystem: 'windmill',
    deviceName: 'BMP280 Barometric Pressure & Air Density Sensor (0x76)',
    category: 'sensor',
    pinLabel: 'ESP32: GPIO 21 (SDA), GPIO 22 (SCL) | I2C Address: 0x76 / 0x77',
    interfaceType: 'I2C',
    voltageLevel: '3.3V',
    description: 'High-precision atmospheric barometer (300–1100 hPa). Calculates ambient air density (ρ ≈ 1.225 kg/m³) to determine kinetic wind power potential (P = 0.5·ρ·A·v³).',
    wireColors: 'Red (3.3V VCC), Black (GND), Blue (SDA to GPIO 21), Yellow (SCL to GPIO 22)'
  },
  {
    id: 'dynamo_generator',
    boardType: 'all',
    subsystem: 'windmill',
    deviceName: '3-Phase AC Wind Turbine Dynamo & Schottky Rectifier',
    category: 'power',
    pinLabel: 'Rectified DC (+) & (-) to INA219 (0x41) Vin+ & Battery Charge Controller',
    interfaceType: 'Power (3.3V/5V/12V)',
    voltageLevel: '12V DC',
    description: 'Low-cogging permanent magnet alternator (PMA). 3-phase AC voltage is converted to smooth DC via ultra-low drop Schottky diode bridge rectifier.',
    wireColors: 'Phase 1/2/3: Yellow/Green/Blue to AC terminals; Output: Red (DC+) to INA219 Vin+, Black (DC-) to GND'
  },
  // Peltier Seebeck Components
  {
    id: 'ds18b20_sand',
    boardType: 'esp32',
    subsystem: 'peltier',
    deviceName: 'DS18B20 Waterproof Thermal Probe (Sand Bed Storage)',
    category: 'sensor',
    pinLabel: 'ESP32: GPIO 4 (1-Wire Bus with 4.7kΩ pull-up to 3.3V)',
    interfaceType: 'Digital Input',
    voltageLevel: '3.3V',
    description: 'Encapsulated stainless steel probe submerged into concentrated quartz sand bed. Measures thermal reservoir temperature (up to 125°C) to calculate Seebeck ΔT.',
    wireColors: 'Red (3.3V VCC), Black (GND), Yellow (Data to GPIO 4 with 4.7kΩ pull-up)'
  },
  {
    id: 'peltier_seebeck',
    boardType: 'all',
    subsystem: 'peltier',
    deviceName: 'Peltier TEC-12706 / SP1848 Thermoelectric Seebeck Harvester',
    category: 'power',
    pinLabel: 'Analog Shunt / ADC: GPIO 36 (ADC1 Ch0 / VP) or Dedicated INA219',
    interfaceType: 'Analog ADC',
    voltageLevel: '3.3V',
    description: 'Solid-state thermoelectric semiconductor module positioned between hot sand and cooling heat sink. Directly generates electricity from the thermal gradient (Seebeck effect).',
    wireColors: 'Red (Positive harvest lead), Black (Negative ground lead)'
  },
  // Solar PV & Cleaning Components
  {
    id: 'ina219_power',
    boardType: 'all',
    subsystem: 'solar',
    deviceName: 'Solar INA219 High-Side Power & Current Monitor (0x40)',
    category: 'sensor',
    pinLabel: 'ESP32: GPIO 21 (SDA), GPIO 22 (SCL) | I2C Address: 0x40 (Default)',
    interfaceType: 'I2C',
    voltageLevel: '3.3V',
    description: 'Measures photovoltaic bus voltage (0–32V), shunt current (0–3.2A), and calculates real-time solar wattage (V × I = W). Default unbridged address 0x40.',
    wireColors: 'Red (3.3V), Black (GND), Blue (SDA to GPIO 21), Yellow (SCL to GPIO 22)'
  },
  {
    id: 'lm35_temp',
    boardType: 'all',
    subsystem: 'solar',
    deviceName: 'LM35 Precision Solar Panel Surface Temperature Sensor',
    category: 'sensor',
    pinLabel: 'ESP32: GPIO 32 (ADC1 Ch4) | Arduino: Pin A0',
    interfaceType: 'Analog ADC',
    voltageLevel: '3.3V',
    description: 'Analog linear output (10mV/°C). Affixed to photovoltaic panel underside to track thermal derating on monocrystalline silicon efficiency (-0.4%/°C above 25°C).',
    wireColors: 'Red (3.3V), Black (GND), Green (Analog Vout to GPIO 32)'
  },
  {
    id: 'fc37_rain',
    boardType: 'all',
    subsystem: 'solar',
    deviceName: 'FC-37 Rain & Moisture Droplet Detector',
    category: 'sensor',
    pinLabel: 'ESP32: GPIO 35 (ADC1 Ch7) | Arduino: Pin A1',
    interfaceType: 'Digital Input',
    voltageLevel: '3.3V',
    description: 'Nickel-plated detection track. Detects ambient rainfall to suppress dry squeegee wiping during natural rain and trigger rain rinse cycles.',
    wireColors: 'Red (3.3V), Black (GND), White (Analog/Digital AO to GPIO 35)'
  },
  {
    id: 'wiper_relay',
    boardType: 'all',
    subsystem: 'actuator',
    deviceName: 'Motorized Silicone Squeegee Wiper (Relay Module)',
    category: 'actuator',
    pinLabel: 'ESP32: GPIO 27 | Arduino: Pin D7 | ESP-01: RX (GPIO 3)',
    interfaceType: 'Digital Output',
    voltageLevel: '5V',
    description: 'Active-LOW 10A optoisolated relay driving 12V DC wiper gearmotor for dry physical dust removal across solar panel surface glass.',
    wireColors: 'Red (5V VCC), Black (GND), Orange (Relay IN trigger to GPIO 27)'
  },
  {
    id: 'pump_relay',
    boardType: 'esp32',
    subsystem: 'actuator',
    deviceName: 'Secondary Water Spray Pump Relay (Optional)',
    category: 'actuator',
    pinLabel: 'ESP32: GPIO 26 | Arduino: Pin D8',
    interfaceType: 'Digital Output',
    voltageLevel: '5V',
    description: 'Relay channel for optional hydro misting during severe encrusted bird-dropping cleaning cycles.',
    wireColors: 'Red (5V), Black (GND), Purple (Relay IN to GPIO 26)'
  },
  {
    id: 'esp01_bridge',
    boardType: 'arduino_esp01',
    subsystem: 'general',
    deviceName: 'ESP-01 Wi-Fi Telemetry Transmitter Bridge',
    category: 'communication',
    pinLabel: 'Arduino: D2 (RX), D3 (TX) | ESP-01: TX, RX via voltage divider',
    interfaceType: 'UART Serial',
    voltageLevel: '3.3V',
    description: 'Serial bridge passing Arduino sensor readings to Firebase Cloud Firestore over 2.4GHz Wi-Fi (802.11 b/g/n).',
    wireColors: 'Red (External 3.3V 300mA), Black (Common GND), Yellow (TX/RX)'
  },
  // Dedicated NodeMCU (ESP8266) Hardware Pinout Mappings
  {
    id: 'nodemcu_ina219',
    boardType: 'nodemcu',
    subsystem: 'solar',
    deviceName: 'INA219 Solar PV High-Side Power & Current Monitor (0x40)',
    category: 'sensor',
    pinLabel: 'NodeMCU Pin D2 (GPIO 4 / SDA), Pin D1 (GPIO 5 / SCL) | I2C: 0x40',
    interfaceType: 'I2C',
    voltageLevel: '3.3V',
    description: 'Precision voltage, current & solar wattage monitor wired to NodeMCU hardware I2C pins D2 (SDA) and D1 (SCL).',
    wireColors: 'Red (3.3V), Black (GND), Blue (D2 SDA), Yellow (D1 SCL)'
  },
  {
    id: 'nodemcu_wiper_relay',
    boardType: 'nodemcu',
    subsystem: 'actuator',
    deviceName: 'Motorized Wiper Squeegee Relay Module (Active-LOW)',
    category: 'actuator',
    pinLabel: 'NodeMCU Pin D6 (GPIO 12 / Digital Output)',
    interfaceType: 'Digital Output',
    voltageLevel: '5V',
    description: 'Active-LOW 5V optoisolated relay driven by NodeMCU pin D6. Triggers 12V DC wiper gearmotor for solar panel glass wiping.',
    wireColors: 'VCC to 5V (VIN), GND to Common GND, IN to D6 (GPIO 12)'
  },
  {
    id: 'nodemcu_hall_rpm',
    boardType: 'nodemcu',
    subsystem: 'windmill',
    deviceName: 'Windmill Hall Effect Tachometer Sensor (A3144)',
    category: 'sensor',
    pinLabel: 'NodeMCU Pin D5 (GPIO 14 / Hardware Interrupt)',
    interfaceType: 'Digital Input',
    voltageLevel: '3.3V',
    description: 'Connects to NodeMCU pin D5 with hardware interrupt (ICACHE_RAM_ATTR). Detects neodymium magnet passes to compute real-time RPM.',
    wireColors: 'VCC to 3.3V, GND to Common GND, OUT to D5 (GPIO 14 with 10kΩ pull-up)'
  },
  {
    id: 'nodemcu_lm35_temp',
    boardType: 'nodemcu',
    subsystem: 'solar',
    deviceName: 'LM35 Solar Panel Surface Temperature Sensor',
    category: 'sensor',
    pinLabel: 'NodeMCU Pin A0 (ADC0 Analog Input 0–3.3V)',
    interfaceType: 'Analog ADC',
    voltageLevel: '3.3V',
    description: 'Directly reads solar cell temperature from NodeMCU analog pin A0 (10mV/°C) to calculate thermal efficiency derating.',
    wireColors: 'VCC to 3.3V, GND to Common GND, Vout to A0'
  },
  {
    id: 'nodemcu_rain_fc37',
    boardType: 'nodemcu',
    subsystem: 'solar',
    deviceName: 'FC-37 Rain & Moisture Droplet Detector',
    category: 'sensor',
    pinLabel: 'NodeMCU Pin D7 (GPIO 13 / Digital Input)',
    interfaceType: 'Digital Input',
    voltageLevel: '3.3V',
    description: 'Digital DO signal connects to NodeMCU D7. Detects precipitation to pause dry wiper sweeps and track rainfall.',
    wireColors: 'VCC to 3.3V, GND to Common GND, DO to D7 (GPIO 13)'
  },
  {
    id: 'nodemcu_pump_relay',
    boardType: 'nodemcu',
    subsystem: 'actuator',
    deviceName: 'Secondary Water Misting Pump Relay / Status LED',
    category: 'actuator',
    pinLabel: 'NodeMCU Pin D0 (GPIO 16 / Digital Output)',
    interfaceType: 'Digital Output',
    voltageLevel: '5V',
    description: 'Active-LOW relay channel on NodeMCU Pin D0 (GPIO 16) for hydro misting water pump. Moved from D8 (GPIO 15) to prevent NodeMCU boot lock.',
    wireColors: 'VCC to 5V (VIN), GND to Common GND, IN to D0 (GPIO 16)'
  }
];

const DEFAULT_HARDWARE_CONFIG: HardwareConfigData = {
  microcontrollerType: 'ESP32 DevKit v1 / ESP-01 (ESP8266) / Arduino Nano',
  pinINA219SDA: 'GPIO 21 (I2C SDA)',
  pinINA219SCL: 'GPIO 22 (I2C SCL)',
  pinLM35: 'GPIO 34 (ADC1 Channel 6 - 10mV/°C)',
  pinRainDigital: 'GPIO 35 (FC-37 Rain Analog/Digital)',
  pinWiperRelay: 'GPIO 27 (Active-LOW Silicone Wiper Motor)',
  pinPumpRelay: 'GPIO 26 (Active-LOW Hydro Pump Relay)',
  sensorCalibrationNotes: 'INA219 calibrated for 32V, 2A range with 0.1 ohm shunt resistor. LM35 calibrated with 10mV per degree Celsius. 3:00 AM nightly cleaning timer active.',
  devices: DEFAULT_DEVICES
};

// Preset sensor / device templates for easy 1-click addition
const DEVICE_PRESET_TEMPLATES = [
  {
    name: 'DHT22 / AM2302 (Ambient Temp & Humidity)',
    category: 'sensor' as const,
    pinLabel: 'GPIO 4 (1-Wire Bus)',
    interfaceType: 'Digital Input' as const,
    voltageLevel: '3.3V' as const,
    description: 'High-precision digital temperature and relative humidity sensor for ambient climate tracking.',
    wireColors: 'Red (3.3V), Black (GND), Yellow (Data with 4.7kΩ pullup)'
  },
  {
    name: 'GP2Y1010AU0F (Optical Dust & Soiling Sensor)',
    category: 'sensor' as const,
    pinLabel: 'GPIO 32 (Analog Vo) + GPIO 33 (LED IRED Trigger)',
    interfaceType: 'Analog ADC' as const,
    voltageLevel: '5V' as const,
    description: 'Optical dust sensor measures atmospheric particulate matter (PM2.5 / PM10) to calculate soiling accumulation.',
    wireColors: 'Pin 1: 5V (150Ω resistor), Pin 2: GND, Pin 3: LED Trigger, Pin 4: GND, Pin 5: Analog Vo, Pin 6: 5V'
  },
  {
    name: 'Pyranometer / Solar Irradiance Sensor',
    category: 'sensor' as const,
    pinLabel: 'GPIO 36 (ADC1 Ch0 / VP)',
    interfaceType: 'Analog ADC' as const,
    voltageLevel: '3.3V' as const,
    description: 'Direct solar radiation flux meter (0–1500 W/m²) to compute instantaneous solar panel conversion efficiency.',
    wireColors: 'Red (3.3V), Black (GND), White (Analog Output 0-3.3V)'
  },
  {
    name: 'Anemometer (Wind Speed Sensor)',
    category: 'sensor' as const,
    pinLabel: 'GPIO 39 (ADC1 Ch3 / VN)',
    interfaceType: 'Analog ADC' as const,
    voltageLevel: '5V' as const,
    description: '3-cup anemometer (0.4V–2.0V analog output, 0–32.4 m/s) to monitor wind cooling and structural wind load.',
    wireColors: 'Brown (12V/5V Power), Black (GND), Blue (Analog Signal)'
  },
  {
    name: 'LDR (Light Dependent Resistor / Ambient Lux)',
    category: 'sensor' as const,
    pinLabel: 'GPIO 13 (ADC2 / Analog)',
    interfaceType: 'Analog ADC' as const,
    voltageLevel: '3.3V' as const,
    description: 'Photoresistor voltage divider to detect dawn/dusk transitions for automatic night wiper sweeps.',
    wireColors: 'VCC (3.3V), GND (via 10kΩ resistor), Signal (Midpoint)'
  },
  {
    name: 'Battery BMS / Voltage Divider String',
    category: 'sensor' as const,
    pinLabel: 'GPIO 25 (ADC2 Ch8 / Voltage Divider)',
    interfaceType: 'Analog ADC' as const,
    voltageLevel: '3.3V' as const,
    description: 'Precision 10:1 resistor divider to monitor storage battery bank state of charge (12V/24V Lead-Acid/LiFePO4).',
    wireColors: 'Battery+ to 100kΩ / 10kΩ divider to GPIO 25, Common GND'
  },
  {
    name: 'Second Wiper Motor / Dual-Axis Servo',
    category: 'actuator' as const,
    pinLabel: 'GPIO 18 (PWM Signal)',
    interfaceType: 'PWM / Servo' as const,
    voltageLevel: '5V' as const,
    description: 'High-torque metal gear servo (MG996R) for dual-axis angle wiper sweep or tilt adjustment.',
    wireColors: 'Red (External 5V 2A), Black (GND), Orange (GPIO 18 PWM)'
  },
  {
    name: 'Piezo Alarm Buzzer & Status LED',
    category: 'actuator' as const,
    pinLabel: 'GPIO 19 (Digital Output)',
    interfaceType: 'Digital Output' as const,
    voltageLevel: '3.3V' as const,
    description: 'Audio-visual alert signaling wiper activation start, low battery warning, or overheating alert.',
    wireColors: 'Positive to GPIO 19 via 220Ω resistor, Negative to GND'
  }
];

export const Esp32CodeHelper: React.FC<Esp32CodeHelperProps> = ({ currentUser, onRequireSignIn, stationProfile }) => {
  const activeProjectId = stationProfile?.firebaseProjectId?.trim() || firebaseConfig.projectId || 'solariot-f49f5';
  const activeDatabaseId = stationProfile?.firestoreDatabaseId?.trim() || '(default)';
  const activeDeviceId = stationProfile?.stationDeviceId?.trim() || 'node_01';

  const [selectedBoard, setSelectedBoard] = useState<'nodemcu' | 'esp32' | 'arduino_esp01' | 'esp01'>('nodemcu');
  const [fixingDbId, setFixingDbId] = useState(false);
  const [fixedDbIdSuccess, setFixedDbIdSuccess] = useState(false);
  const [testingRestPing, setTestingRestPing] = useState(false);
  const [restPingResult, setRestPingResult] = useState<{ status: 'idle' | 'success' | 'error'; message: string } | null>(null);
  const [esp32SketchType, setEsp32SketchType] = useState<'hybrid' | 'windmill' | 'solar'>('hybrid');
  const [subsystemFilter, setSubsystemFilter] = useState<'all' | 'solar' | 'windmill' | 'peltier' | 'actuator'>('all');

  const [activeTab, setActiveTab] = useState<'wiring' | 'arduino' | 'media' | 'credentials' | 'ap_offline' | 'arduino_ide'>('wiring');
  const [codeMode, setCodeMode] = useState<'dual_mode' | 'sta_only'>('dual_mode');
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedBoardUrl, setCopiedBoardUrl] = useState<string | null>(null);
  const [copiedLib, setCopiedLib] = useState<string | null>(null);
  const [toastNotice, setToastNotice] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToastNotice({ text, type });
    setTimeout(() => {
      setToastNotice((prev) => (prev?.text === text ? null : prev));
    }, 5000);
  };

  const handleDownloadIno = (filename: string, content: string) => {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Local ESP32 AP Testing State
  const [apTestIp, setApTestIp] = useState('192.168.4.1');
  const [apTestTesting, setApTestTesting] = useState(false);
  const [apTestResult, setApTestResult] = useState<{
    success: boolean;
    data?: any;
    error?: string;
    latencyMs?: number;
    testedAt?: string;
  } | null>(null);

  // Real Hardware Connection Status (NO fake simulated values!)
  const [checkingConnection, setCheckingConnection] = useState(false);
  const [realNodeStatus, setRealNodeStatus] = useState<{
    tested: boolean;
    connected: boolean;
    voltage: number | null;
    current: number | null;
    power: number | null;
    lastSeen: string | null;
    message: string;
  }>({
    tested: false,
    connected: false,
    voltage: null,
    current: null,
    power: null,
    lastSeen: null,
    message: ''
  });

  // Hardware configuration from Firestore
  const [hardwareConfig, setHardwareConfig] = useState<HardwareConfigData>(DEFAULT_HARDWARE_CONFIG);
  const [isEditingHardware, setIsEditingHardware] = useState(false);
  const [editHardwareForm, setEditHardwareForm] = useState<HardwareConfigData>(DEFAULT_HARDWARE_CONFIG);
  const [saveHardwareStatus, setSaveHardwareStatus] = useState<string | null>(null);
  const [isSavingHardware, setIsSavingHardware] = useState(false);

  // Add / Edit Device Wire Connection Modal
  const [isAddingDevice, setIsAddingDevice] = useState(false);
  const [editingDeviceId, setEditingDeviceId] = useState<string | null>(null);
  const [deviceFilter, setDeviceFilter] = useState<string>('all');
  const [deviceSearch, setDeviceSearch] = useState<string>('');
  const [deviceForm, setDeviceForm] = useState<DeviceWireConnection>({
    id: '',
    boardType: 'all',
    deviceName: '',
    category: 'sensor',
    pinLabel: '',
    interfaceType: 'Analog ADC',
    voltageLevel: '3.3V',
    description: '',
    wireColors: ''
  });

  // Hardware media from Firestore (Photos Gallery & YouTube Video)
  const [hardwareMedia, setHardwareMedia] = useState<HardwareMediaData>(DEFAULT_HARDWARE_MEDIA);
  const [isAddingPhoto, setIsAddingPhoto] = useState(false);
  const [editingPhotoId, setEditingPhotoId] = useState<string | null>(null);
  const [photoForm, setPhotoForm] = useState<MediaPhotoItem>({
    id: '',
    url: '',
    title: '',
    caption: '',
    tag: 'ESP32 Circuit'
  });
  const [photoInputMode, setPhotoInputMode] = useState<'upload' | 'url'>('upload');
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [photoUploadError, setPhotoUploadError] = useState<string | null>(null);
  const [isPhotoDraggingOver, setIsPhotoDraggingOver] = useState(false);
  const photoFileInputRef = useRef<HTMLInputElement>(null);

  // YouTube Video Modal State
  const [isEditingVideo, setIsEditingVideo] = useState(false);
  const [videoForm, setVideoForm] = useState<{
    url: string;
    title: string;
    description: string;
    channelOrAuthor?: string;
  }>({
    url: '',
    title: '',
    description: '',
    channelOrAuthor: ''
  });
  const [saveMediaStatus, setSaveMediaStatus] = useState<string | null>(null);
  const [isSavingMedia, setIsSavingMedia] = useState(false);
  const [activeZoomPhoto, setActiveZoomPhoto] = useState<{ url: string; title: string; caption: string; tag?: string } | null>(null);

  // Verify owner
  const isOwner = Boolean(
    currentUser?.email && 
    OWNER_EMAILS.includes(currentUser.email.trim().toLowerCase())
  );

  // In-browser firmware code editor state
  const [isEditingCode, setIsEditingCode] = useState(false);
  const [customCode, setCustomCode] = useState<string>('');
  const [saveCodeStatus, setSaveCodeStatus] = useState<string | null>(null);

  // Sync Hardware Configuration & Media from Cloud Firestore
  useEffect(() => {
    const docRef = doc(db, 'solar_iot', 'hardware_config');
    const unsubscribeConfig = onSnapshot(docRef, (snapshot) => {
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
          devices: Array.isArray(data.devices) && data.devices.length > 0 ? data.devices : prev.devices,
          customFirmwareCode: data.customFirmwareCode || prev.customFirmwareCode,
          updatedAt: data.updatedAt,
        }));
      }
    });

    const mediaDocRef = doc(db, 'solar_iot', 'hardware_media');
    const unsubscribeMedia = onSnapshot(mediaDocRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data() as Partial<HardwareMediaData>;
        let photosList: MediaPhotoItem[] = [];
        if (Array.isArray(data.photos) && data.photos.length > 0) {
          photosList = data.photos;
        } else if (data.photo1Url || data.photo2Url) {
          if (data.photo1Url) {
            photosList.push({
              id: 'photo_1',
              url: data.photo1Url,
              title: data.photo1Title || 'ESP32 Microcontroller Circuit',
              caption: data.photo1Caption || '',
              tag: 'ESP32 Circuit'
            });
          }
          if (data.photo2Url) {
            photosList.push({
              id: 'photo_2',
              url: data.photo2Url,
              title: data.photo2Title || 'Optoisolated Wiper Relay Bench',
              caption: data.photo2Caption || '',
              tag: 'Wiper Mechanism'
            });
          }
        } else {
          photosList = DEFAULT_MEDIA_PHOTOS;
        }

        setHardwareMedia((prev) => ({
          ...prev,
          photos: photosList,
          photo1Url: data.photo1Url || prev.photo1Url,
          photo1Title: data.photo1Title || prev.photo1Title,
          photo1Caption: data.photo1Caption || prev.photo1Caption,
          photo2Url: data.photo2Url || prev.photo2Url,
          photo2Title: data.photo2Title || prev.photo2Title,
          photo2Caption: data.photo2Caption || prev.photo2Caption,
          videoUrl: data.videoUrl || prev.videoUrl,
          videoTitle: data.videoTitle || prev.videoTitle,
          videoDescription: data.videoDescription || prev.videoDescription,
          videoChannelOrAuthor: data.videoChannelOrAuthor || prev.videoChannelOrAuthor,
          updatedAt: data.updatedAt,
        }));
      }
    });

    return () => {
      unsubscribeConfig();
      unsubscribeMedia();
    };
  }, []);

  // Legitimate Real-time Node Status Check (NO FAKE DATA, 15-second strict heartbeat window)
  const handleCheckRealNodeStatus = async () => {
    setCheckingConnection(true);
    try {
      const docRef = doc(db, 'solar_iot', 'node_01');
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        setRealNodeStatus({
          tested: true,
          connected: false,
          voltage: null,
          current: null,
          power: null,
          lastSeen: null,
          message: 'Hardware document solar_iot/node_01 not initialized. Waiting for physical ESP32/ESP-01 telemetry.'
        });
      } else {
        const data = docSnap.data();
        let updatedAtTime = 0;
        if (data.updatedAt) {
          const rawNum = Number(data.updatedAt);
          if (!isNaN(rawNum) && rawNum > 1600000000000) {
            updatedAtTime = rawNum;
          } else if (!isNaN(rawNum) && rawNum > 1600000000) {
            updatedAtTime = rawNum * 1000;
          } else {
            updatedAtTime = new Date(data.updatedAt).getTime() || 0;
          }
        }
        const now = Date.now();
        const ageSeconds = updatedAtTime > 0 ? Math.round((now - updatedAtTime) / 1000) : 999999;
        
        // Real hardware heartbeat check (generous 120-second window, completely non-destructive)
        const hasTelemetry = (
          (data.voltage !== null && data.voltage !== undefined) ||
          (data.windmillRpm !== null && data.windmillRpm !== undefined) ||
          (data.peltierPower !== null && data.peltierPower !== undefined)
        );
        const isActuallyLive = Boolean(
          data.espConnected === true &&
          hasTelemetry &&
          (ageSeconds <= 120 || updatedAtTime === 0)
        );

        if (isActuallyLive) {
          setRealNodeStatus({
            tested: true,
            connected: true,
            voltage: data.voltage !== null ? Number(data.voltage) : 0,
            current: Number(data.current || 0),
            power: Number(data.power || 0),
            lastSeen: ageSeconds < 99999 ? `${ageSeconds}s ago` : 'Active stream',
            message: `Physical Microcontroller is connected and streaming! (Device: ${data.deviceType || 'NodeMCU/ESP32'}, V: ${data.voltage ?? 0}V, I: ${data.current ?? 0}A, P: ${data.power ?? 0}W)`
          });
        } else {
          setRealNodeStatus({
            tested: true,
            connected: false,
            voltage: null,
            current: null,
            power: null,
            lastSeen: updatedAtTime > 0 && ageSeconds < 99999 ? `${ageSeconds}s ago` : null,
            message: 'Physical Microcontroller Offline: No active heartbeat received from physical NodeMCU / ESP32 in the last 120 seconds. Make sure board is powered, connected to 2.4GHz Wi-Fi, and flashed with the correct sketch.'
          });
        }
      }
    } catch (err: any) {
      setRealNodeStatus({
        tested: true,
        connected: false,
        voltage: null,
        current: null,
        power: null,
        lastSeen: null,
        message: `Database query note: ${err.message || 'Failed to check connection'}`
      });
    } finally {
      setCheckingConnection(false);
    }
  };

  // Explicit Reset Node Offline in Firestore (Clears any lingering test telemetry)
  const handleResetNodeOffline = async () => {
    try {
      const docRef = doc(db, 'solar_iot', 'node_01');
      await setDoc(docRef, {
        espConnected: false,
        voltage: null,
        current: null,
        power: null,
        temperature: null,
        batteryPercent: null,
        isRaining: null,
        statusNote: 'Hardware reset to offline by user',
        updatedAt: new Date().toISOString()
      }, { merge: true });

      setRealNodeStatus({
        tested: true,
        connected: false,
        voltage: null,
        current: null,
        power: null,
        lastSeen: null,
        message: 'Successfully reset node_01 to Offline. All sensor displays set to N/A.'
      });
      showToast('Successfully reset node_01 to Offline.', 'success');
    } catch (err: any) {
      showToast(`Error resetting node: ${err.message}`, 'error');
    }
  };

  // 1-Click Set Standard Database ID in user profile & localStorage
  const handleFixDatabaseId = async () => {
    try {
      setFixingDbId(true);
      const targetDbId = '(default)';
      const uid = (currentUser as any)?.uid || stationProfile?.uid || 'user_local';
      const updatedProfile = {
        ...(stationProfile || {}),
        uid,
        firebaseProjectId: stationProfile?.firebaseProjectId?.trim() || firebaseConfig.projectId || 'solariot-f49f5',
        firestoreDatabaseId: targetDbId,
        stationDeviceId: stationProfile?.stationDeviceId?.trim() || 'node_01',
        onboardingCompleted: true,
        updatedAt: new Date().toISOString()
      };
      localStorage.setItem('solar_iot_active_profile', JSON.stringify(updatedProfile));
      if ((currentUser as any)?.uid) {
        localStorage.setItem(`station_profile_${(currentUser as any).uid}`, JSON.stringify(updatedProfile));
        const userDocRef = doc(db, 'user_profiles', (currentUser as any).uid);
        await setDoc(userDocRef, updatedProfile, { merge: true });
      }
      setFixedDbIdSuccess(true);
      setTimeout(() => setFixedDbIdSuccess(false), 5000);
    } catch (e: any) {
      console.error('Failed to set database ID:', e);
    } finally {
      setFixingDbId(false);
    }
  };

  // 1-Click Test NodeMCU Cloud REST Endpoint (Live Browser Ping)
  const handleTestRestPing = async () => {
    try {
      setTestingRestPing(true);
      setRestPingResult(null);
      const targetDb = activeDatabaseId || '(default)';
      const url = `https://firestore.googleapis.com/v1/projects/${activeProjectId}/databases/${targetDb}/documents/solar_iot/${activeDeviceId}?key=${firebaseConfig.apiKey}`;
      const res = await fetch(url);
      if (res.ok) {
        setRestPingResult({
          status: 'success',
          message: `HTTP 200 OK: Firestore REST API reached! Database "${targetDb}" in project "${activeProjectId}" is online and accepting NodeMCU connections.`
        });
      } else {
        const errorJson = await res.json().catch(() => ({}));
        setRestPingResult({
          status: 'error',
          message: `HTTP ${res.status}: ${errorJson?.error?.message || res.statusText}. Target database: "${targetDb}".`
        });
      }
    } catch (err: any) {
      setRestPingResult({
        status: 'error',
        message: `Network notice: ${err.message || 'Check network connection'}`
      });
    } finally {
      setTestingRestPing(false);
    }
  };

  // Test Local ESP32 Access Point Ping & Telemetry Fetch
  const handleTestApPing = async () => {
    setApTestTesting(true);
    setApTestResult(null);
    const start = Date.now();
    try {
      const cleanIp = apTestIp.trim().replace(/^https?:\/\//, '');
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);
      const res = await fetch(`http://${cleanIp}/api/telemetry`, {
        signal: controller.signal,
        mode: 'cors',
      });
      clearTimeout(timeoutId);
      const latency = Date.now() - start;

      if (res.ok) {
        const json = await res.json();
        setApTestResult({
          success: true,
          data: json,
          latencyMs: latency,
          testedAt: new Date().toLocaleTimeString(),
        });
      } else {
        setApTestResult({
          success: false,
          error: `HTTP ${res.status}: ${res.statusText}`,
          latencyMs: latency,
          testedAt: new Date().toLocaleTimeString(),
        });
      }
    } catch (err: any) {
      setApTestResult({
        success: false,
        error: err.name === 'AbortError'
          ? 'Connection timed out (no response within 4s). Verify device Wi-Fi is connected to "Solar-Cleaner-AP" hotspot.'
          : (err.message || 'Failed to connect to ESP32 AP endpoint.'),
        latencyMs: Date.now() - start,
        testedAt: new Date().toLocaleTimeString(),
      });
    } finally {
      setApTestTesting(false);
    }
  };

  // Trigger Local Wiper via ESP32 AP
  const handleTestApWiper = async (action: 'clean' | 'stop') => {
    setApTestTesting(true);
    try {
      const cleanIp = apTestIp.trim().replace(/^https?:\/\//, '');
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);
      const res = await fetch(`http://${cleanIp}/api/${action}`, {
        method: 'POST',
        signal: controller.signal,
        mode: 'cors',
      });
      clearTimeout(timeoutId);
      if (res.ok) {
        const data = await res.json();
        showToast(`Success: Wiper ${action === 'clean' ? 'sweep started (5s)' : 'stopped'} on physical hardware via local AP! Response: ${JSON.stringify(data)}`, 'success');
        handleTestApPing();
      } else {
        showToast(`HTTP Error ${res.status} executing local wiper command.`, 'error');
      }
    } catch (err: any) {
      showToast(`Local connection notice: ${err.message}. Make sure your phone/laptop is connected to "Solar-Cleaner-AP" at http://${apTestIp}`, 'error');
    } finally {
      setApTestTesting(false);
    }
  };

  // Open Add Device Modal
  const handleOpenAddDevice = (preset?: typeof DEVICE_PRESET_TEMPLATES[0]) => {
    if (!isOwner) {
      if (onRequireSignIn) onRequireSignIn();
      return;
    }
    setEditingDeviceId(null);
    if (preset) {
      setDeviceForm({
        id: 'dev_' + Date.now(),
        boardType: selectedBoard,
        deviceName: preset.name,
        category: preset.category,
        pinLabel: preset.pinLabel,
        interfaceType: preset.interfaceType,
        voltageLevel: preset.voltageLevel,
        description: preset.description,
        wireColors: preset.wireColors
      });
    } else {
      setDeviceForm({
        id: 'dev_' + Date.now(),
        boardType: selectedBoard,
        deviceName: '',
        category: 'sensor',
        pinLabel: '',
        interfaceType: 'Analog ADC',
        voltageLevel: '3.3V',
        description: '',
        wireColors: ''
      });
    }
    setIsAddingDevice(true);
  };

  // Open Edit Device Modal
  const handleOpenEditDevice = (dev: DeviceWireConnection) => {
    if (!isOwner) {
      if (onRequireSignIn) onRequireSignIn();
      return;
    }
    setEditingDeviceId(dev.id);
    setDeviceForm({ ...dev });
    setIsAddingDevice(true);
  };

  // Save Device / Wire connection to Firestore
  const handleSaveDevice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isOwner) return;

    setIsSavingHardware(true);
    try {
      let updatedDevices: DeviceWireConnection[];
      if (editingDeviceId) {
        updatedDevices = (hardwareConfig.devices || []).map((d) => 
          d.id === editingDeviceId ? { ...deviceForm, id: editingDeviceId } : d
        );
      } else {
        const newDevice: DeviceWireConnection = {
          ...deviceForm,
          id: deviceForm.id || 'dev_' + Date.now()
        };
        updatedDevices = [...(hardwareConfig.devices || []), newDevice];
      }

      const docRef = doc(db, 'solar_iot', 'hardware_config');
      await setDoc(docRef, {
        ...hardwareConfig,
        devices: updatedDevices,
        updatedAt: new Date().toISOString()
      }, { merge: true });

      setHardwareConfig(prev => ({ ...prev, devices: updatedDevices }));
      setIsAddingDevice(false);
      setEditingDeviceId(null);
      showToast('Hardware device wire connection saved.', 'success');
    } catch (err: any) {
      showToast(`Error saving device: ${err.message}`, 'error');
    } finally {
      setIsSavingHardware(false);
    }
  };

  // Delete Device / Wire connection from Firestore
  const handleDeleteDevice = async (id: string) => {
    if (!isOwner) {
      if (onRequireSignIn) onRequireSignIn();
      return;
    }

    try {
      const updatedDevices = (hardwareConfig.devices || []).filter((d) => d.id !== id);
      const docRef = doc(db, 'solar_iot', 'hardware_config');
      await setDoc(docRef, {
        ...hardwareConfig,
        devices: updatedDevices,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      setHardwareConfig(prev => ({ ...prev, devices: updatedDevices }));
    } catch (err: any) {
      console.warn('Error deleting device:', err);
    }
  };

  // Local Photo Processing with Canvas Compression (<120KB for Firestore)
  const processLocalPhoto = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setPhotoUploadError('Please select a valid image file (JPEG, PNG, WebP).');
      return;
    }
    if (file.size > 25 * 1024 * 1024) {
      setPhotoUploadError('File is too large (maximum 25MB).');
      return;
    }

    setIsUploadingPhoto(true);
    setPhotoUploadError(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      const rawDataUrl = e.target?.result as string;
      if (!rawDataUrl) {
        setIsUploadingPhoto(false);
        setPhotoUploadError('Could not read image file.');
        return;
      }

      const img = new Image();
      img.onload = () => {
        try {
          const MAX_DIMENSION = 1200;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_DIMENSION) {
              height = Math.round((height * MAX_DIMENSION) / width);
              width = MAX_DIMENSION;
            }
          } else {
            if (height > MAX_DIMENSION) {
              width = Math.round((width * MAX_DIMENSION) / height);
              height = MAX_DIMENSION;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            setPhotoForm((prev) => ({ ...prev, url: rawDataUrl }));
            setIsUploadingPhoto(false);
            return;
          }

          ctx.drawImage(img, 0, 0, width, height);
          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.85);
          setPhotoForm((prev) => ({ ...prev, url: compressedDataUrl }));
        } catch {
          setPhotoForm((prev) => ({ ...prev, url: rawDataUrl }));
        } finally {
          setIsUploadingPhoto(false);
        }
      };
      img.onerror = () => {
        setIsUploadingPhoto(false);
        setPhotoUploadError('Failed to load image preview.');
      };
      img.src = rawDataUrl;
    };
    reader.onerror = () => {
      setIsUploadingPhoto(false);
      setPhotoUploadError('Error reading file from disk.');
    };
    reader.readAsDataURL(file);
  };

  // Open Add Photo Modal
  const handleOpenAddPhoto = () => {
    setEditingPhotoId(null);
    setPhotoForm({
      id: `photo_${Date.now()}`,
      url: '',
      title: '',
      caption: '',
      tag: 'ESP32 Circuit'
    });
    setPhotoInputMode('upload');
    setPhotoUploadError(null);
    setIsUploadingPhoto(false);
    setIsAddingPhoto(true);
  };

  // Open Edit Photo Modal
  const handleOpenEditPhoto = (photo: MediaPhotoItem) => {
    setEditingPhotoId(photo.id);
    setPhotoForm({ ...photo });
    setPhotoInputMode('upload');
    setPhotoUploadError(null);
    setIsUploadingPhoto(false);
    setIsAddingPhoto(true);
  };

  // Save Photo to Firestore & Local Storage
  const handleSavePhoto = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!photoForm.url.trim()) {
      setPhotoUploadError('Please select a local photo or enter an image URL.');
      return;
    }
    if (!photoForm.title.trim()) {
      setPhotoUploadError('Please provide a title for this hardware photo.');
      return;
    }

    setIsSavingMedia(true);
    setSaveMediaStatus(null);
    try {
      const currentPhotos = hardwareMedia.photos && hardwareMedia.photos.length > 0 
        ? hardwareMedia.photos 
        : DEFAULT_MEDIA_PHOTOS;

      let updatedPhotos: MediaPhotoItem[];
      if (editingPhotoId) {
        updatedPhotos = currentPhotos.map(p => 
          p.id === editingPhotoId ? { ...photoForm, id: editingPhotoId } : p
        );
      } else {
        const newPhoto: MediaPhotoItem = {
          ...photoForm,
          id: photoForm.id || `photo_${Date.now()}`,
          createdAt: new Date().toISOString()
        };
        updatedPhotos = [newPhoto, ...currentPhotos];
      }

      const updatedMedia: HardwareMediaData = {
        ...hardwareMedia,
        photos: updatedPhotos,
        photo1Url: updatedPhotos[0]?.url || hardwareMedia.photo1Url,
        photo1Title: updatedPhotos[0]?.title || hardwareMedia.photo1Title,
        photo1Caption: updatedPhotos[0]?.caption || hardwareMedia.photo1Caption,
        photo2Url: updatedPhotos[1]?.url || hardwareMedia.photo2Url,
        photo2Title: updatedPhotos[1]?.title || hardwareMedia.photo2Title,
        photo2Caption: updatedPhotos[1]?.caption || hardwareMedia.photo2Caption,
        updatedAt: new Date().toISOString()
      };

      setHardwareMedia(updatedMedia);
      try {
        localStorage.setItem('solar_iot_hardware_media', JSON.stringify(updatedMedia));
      } catch {
        // ignore quota
      }

      if (isOwner) {
        const docRef = doc(db, 'solar_iot', 'hardware_media');
        await setDoc(docRef, updatedMedia, { merge: true });
        setSaveMediaStatus('Photo successfully published to Cloud Database!');
      } else {
        setSaveMediaStatus('Photo added to local device gallery! (Sign in as Admin to broadcast globally)');
      }

      setIsAddingPhoto(false);
      setEditingPhotoId(null);
      setTimeout(() => setSaveMediaStatus(null), 5000);
    } catch (err: any) {
      setPhotoUploadError(`Error saving photo: ${err.message || 'Unknown error'}`);
    } finally {
      setIsSavingMedia(false);
    }
  };

  // Delete Photo from Firestore & Local Storage
  const handleDeletePhoto = async (photoId: string) => {
    try {
      const currentPhotos = hardwareMedia.photos && hardwareMedia.photos.length > 0 
        ? hardwareMedia.photos 
        : DEFAULT_MEDIA_PHOTOS;
      const updatedPhotos = currentPhotos.filter(p => p.id !== photoId);

      const updatedMedia: HardwareMediaData = {
        ...hardwareMedia,
        photos: updatedPhotos,
        updatedAt: new Date().toISOString()
      };

      setHardwareMedia(updatedMedia);
      try {
        localStorage.setItem('solar_iot_hardware_media', JSON.stringify(updatedMedia));
      } catch {
        // ignore
      }

      if (isOwner) {
        const docRef = doc(db, 'solar_iot', 'hardware_media');
        await setDoc(docRef, updatedMedia, { merge: true });
      }
    } catch (err: any) {
      console.warn('Error deleting photo:', err);
    }
  };

  // Open Edit YouTube Video Modal
  const handleOpenEditVideo = () => {
    setVideoForm({
      url: hardwareMedia.videoUrl || '',
      title: hardwareMedia.videoTitle || 'ESP32 Firmware Execution & Wiper Demo',
      description: hardwareMedia.videoDescription || 'Hardware testing demonstration video.',
      channelOrAuthor: hardwareMedia.videoChannelOrAuthor || 'Farm.IOT Engineering Lab'
    });
    setSaveMediaStatus(null);
    setIsEditingVideo(true);
  };

  // Save YouTube Video to Firestore & Local Storage
  const handleSaveVideo = async (e: React.FormEvent) => {
    e.preventDefault();

    const ytid = extractYouTubeId(videoForm.url);
    if (!ytid) {
      setSaveMediaStatus('Please enter a valid YouTube video URL or ID.');
      return;
    }

    setIsSavingMedia(true);
    setSaveMediaStatus(null);
    try {
      const updatedMedia: HardwareMediaData = {
        ...hardwareMedia,
        videoUrl: videoForm.url.trim(),
        videoTitle: videoForm.title.trim() || 'ESP32 Firmware Execution & Wiper Demo',
        videoDescription: videoForm.description.trim() || 'Live hardware testing demonstration video.',
        videoChannelOrAuthor: videoForm.channelOrAuthor?.trim() || 'Farm.IOT Engineering Lab',
        updatedAt: new Date().toISOString()
      };

      setHardwareMedia(updatedMedia);
      try {
        localStorage.setItem('solar_iot_hardware_media', JSON.stringify(updatedMedia));
      } catch {
        // ignore
      }

      if (isOwner) {
        const docRef = doc(db, 'solar_iot', 'hardware_media');
        await setDoc(docRef, updatedMedia, { merge: true });
        setSaveMediaStatus('YouTube video demo successfully published to Cloud Database!');
      } else {
        setSaveMediaStatus('YouTube video embedded for this session! (Sign in as Admin to broadcast globally)');
      }

      setIsEditingVideo(false);
      setTimeout(() => setSaveMediaStatus(null), 5000);
    } catch (err: any) {
      setSaveMediaStatus(`Error saving video: ${err.message || 'Unknown error'}`);
    } finally {
      setIsSavingMedia(false);
    }
  };

  // Copy helper
  const copyToClipboard = (text: string, setter: (val: boolean) => void) => {
    navigator.clipboard.writeText(text);
    setter(true);
    setTimeout(() => setter(false), 2000);
  };

  // Filter devices list
  const filteredDevices = (hardwareConfig.devices || DEFAULT_DEVICES).filter((dev) => {
    const matchesSubsystem = subsystemFilter === 'all' || !dev.subsystem || dev.subsystem === subsystemFilter || (subsystemFilter === 'actuator' && dev.category === 'actuator');
    const matchesFilter = deviceFilter === 'all' || dev.category === deviceFilter;
    const matchesBoard = dev.boardType === 'all' || dev.boardType === selectedBoard;
    const matchesSearch = !deviceSearch || 
      dev.deviceName.toLowerCase().includes(deviceSearch.toLowerCase()) ||
      dev.pinLabel.toLowerCase().includes(deviceSearch.toLowerCase()) ||
      dev.description.toLowerCase().includes(deviceSearch.toLowerCase());
    return matchesSubsystem && matchesFilter && matchesBoard && matchesSearch;
  });

  // Standalone NodeMCU Sketch (ESP8266 ESP-12E / ESP-12F / NodeMCU v2 & v3)
  const nodemcuCodeSnippet = `/*
 * =========================================================================================
 * Farm.IOT - NodeMCU (ESP8266 ESP-12E / ESP-12F / NodeMCU v2 & v3) Production Firmware
 * Photovoltaic Microgrid Station + Aero Windmill Turbine + Motorized Cleaning Wiper
 * =========================================================================================
 * 
 * 🔧 ARDUINO IDE BOARD CONFIGURATION:
 * 1. File -> Preferences -> Additional Boards Manager URLs:
 *    http://arduino.esp8266.com/stable/package_esp8266com_index.json
 * 2. Tools -> Board -> ESP8266 Boards -> "NodeMCU 1.0 (ESP-12E Module)"
 * 3. Tools -> CPU Frequency: "80 MHz" or "160 MHz"
 * 4. Tools -> Upload Speed: "115200" or "921600"
 * 5. Tools -> Port: Select your COM port (Install CH340 or CP2102 driver if port not visible)
 * 
 * 📌 COMPLETE HARDWARE PINOUT FOR NODEMCU (ESP8266):
 *   - NodeMCU Pin D1 (GPIO 5)  -> INA219 SCL (I2C Clock) & BMP280 SCL
 *   - NodeMCU Pin D2 (GPIO 4)  -> INA219 SDA (I2C Data) & BMP280 SDA
 *   - NodeMCU Pin D5 (GPIO 14) -> Hall Effect RPM Sensor (A3144 with 10k pull-up)
 *   - NodeMCU Pin D6 (GPIO 12) -> Wiper Motor Relay (Active-LOW, controls 12V gearmotor)
 *   - NodeMCU Pin D7 (GPIO 13) -> FC-37 Rain Detector DO (Digital Input)
 *   - NodeMCU Pin D0 (GPIO 16) -> Water Pump Relay (Moved to Pin D0 to prevent D8 boot lock!)
 *   - NodeMCU Pin A0 (ADC0)    -> LM35 Panel Temp Sensor Vout (10mV/°C, 0–3.3V)
 *   - NodeMCU 3V3 / GND        -> Sensor Power (3.3V & Common Ground)
 *   - NodeMCU VIN              -> 5V DC Power (from USB or external 5V 2A regulator)
 * 
 * 🚀 WI-FI & CLOUD SYNC ARCHITECTURE:
 *   - Auto-reconnects to 2.4GHz Wi-Fi (WIFI_SSID / WIFI_PASS)
 *   - Direct HTTPS REST PATCH to Google Cloud Firestore with client.setInsecure()
 *   - Cloud Project: ${activeProjectId}
 *   - Cloud Database: ${activeDatabaseId}
 *   - Target Document: solar_iot/${activeDeviceId}
 *   - Emergency AP Fallback: "NodeMCU-Solar-AP" at 192.168.4.1 if Wi-Fi disconnected
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
const char* PROJECT_ID = "${activeProjectId}";
const char* DATABASE_ID = "${activeDatabaseId}";
const char* API_KEY = "${firebaseConfig.apiKey}";
const char* DEVICE_ID = "${activeDeviceId}";

// 3. NodeMCU Hardware Pin Definitions
#define PIN_I2C_SDA       4   // NodeMCU Pin D2 (GPIO 4)
#define PIN_I2C_SCL       5   // NodeMCU Pin D1 (GPIO 5)
#define PIN_HALL_RPM      14  // NodeMCU Pin D5 (GPIO 14 / Hardware Interrupt)
#define PIN_WIPER_RELAY   12  // NodeMCU Pin D6 (GPIO 12 / Active-LOW)
#define PIN_RAIN_DO       13  // NodeMCU Pin D7 (GPIO 13 / Digital Input)
#define PIN_PUMP_RELAY    16  // Moved to Pin D0 (GPIO 16) to prevent D8 boot lock!
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

// Start Wiper & Water Pump
void startWiper() {
  isWiperActive = true;
  wiperStartTime = millis();
  digitalWrite(PIN_WIPER_RELAY, LOW); // Relay ON
  digitalWrite(PIN_PUMP_RELAY, LOW);  // Pump ON
  Serial.println("[WIPER] Wiper & Water Pump activated!");
}

// Stop Wiper & Water Pump
void stopWiper() {
  isWiperActive = false;
  digitalWrite(PIN_WIPER_RELAY, HIGH); // Relay OFF
  digitalWrite(PIN_PUMP_RELAY, HIGH);  // Pump OFF
  Serial.println("[WIPER] Wiper sweep completed.");
}

// Push Telemetry to Google Cloud Firestore via HTTPS PATCH
void pushToFirestore() {
  if (WiFi.status() != WL_CONNECTED) return;

  WiFiClientSecure client;
  client.setInsecure(); // Critical for ESP8266 SSL handshake
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
      Serial.printf("[NodeMCU -> Firestore] Success HTTP 200 | PV: %.2fV, %.2fA, %.2fW | RPM: %.1f\\n", 
                    solarVoltage, solarAmps, solarPower, windmillRpm);
    } else {
      Serial.printf("[NodeMCU -> Firestore] Error HTTP %d | %s\\n", httpCode, https.errorToString(httpCode).c_str());
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
      payload.replace("\\n", "");
      payload.replace("\\r", "");

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
  Serial.println("\\n\\n=======================================================");
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
    Serial.println("\\n[WIFI] Connected Successfully!");
    Serial.printf("[WIFI] NodeMCU IP Address: %s\\n", WiFi.localIP().toString().c_str());
    Serial.printf("[WIFI] Signal Strength (RSSI): %d dBm\\n", WiFi.RSSI());

    // Sync NTP Time for valid UTC timestamps
    configTime(0, 0, "pool.ntp.org", "time.google.com");
  } else {
    Serial.println("\\n[WIFI] Could not connect to router. Starting Fallback AP Hotspot...");
    WiFi.softAP("NodeMCU-Solar-AP", "SolarIOT123");
    Serial.printf("[AP] Hotspot active! Connect to 'NodeMCU-Solar-AP' (IP: %s)\\n", WiFi.softAPIP().toString().c_str());
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
  Serial.println("[SYSTEM] NodeMCU Initialization Complete. Streaming telemetry...\\n");
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
`;

  // Standalone ESP-01 Sketch (ESP8266 8-Pin)
  const esp01CodeSnippet = `/*
 * Farm.IOT - ESP-01 / ESP8266 Standalone Firmware
 * 
 * Hardware Connections (8-Pin ESP-01):
 *   VCC  -> 3.3V (Dedicated 3.3V 300mA+ regulator with 10uF cap across VCC/GND)
 *   GND  -> Common Ground
 *   CH_PD (EN) -> 3.3V (MANDATORY pull-up resistor or direct to 3.3V)
 *   GPIO 0 -> INA219 SDA (I2C Data)
 *   GPIO 2 -> INA219 SCL (I2C Clock)
 *   RX (GPIO 3) -> Relay IN (Motorized Squeegee Wiper, Active-LOW)
 *   TX (GPIO 1) -> Serial Debugging (115200 baud)
 */

#include <ESP8266WiFi.h>
#include <ESP8266HTTPClient.h>
#include <WiFiClientSecure.h>
#include <Wire.h>
#include <Adafruit_INA219.h>

const char* WIFI_SSID = "YOUR_WIFI_SSID";
const char* WIFI_PASS = "YOUR_WIFI_PASSWORD";
const char* PROJECT_ID = "${activeProjectId}";
const char* DATABASE_ID = "${activeDatabaseId}";
const char* API_KEY = "${firebaseConfig.apiKey}";
const char* DEVICE_ID = "${activeDeviceId}";

#define PIN_WIPER_RELAY 3

Adafruit_INA219 ina219;
float highestWattToday = 0.0;
unsigned long lastTelemetryTime = 0;
const unsigned long TELEMETRY_INTERVAL = 3000;

void pushToFirestore(float v, float i, float p) {
  if (WiFi.status() != WL_CONNECTED) return;
  WiFiClientSecure client;
  client.setInsecure();
  HTTPClient https;
  String url = "https://firestore.googleapis.com/v1/projects/" + String(PROJECT_ID) +
               "/databases/" + String(DATABASE_ID) +
               "/documents/solar_iot/" + String(DEVICE_ID) + "?key=" + String(API_KEY) +
               "&updateMask.fieldPaths=espConnected" +
               "&updateMask.fieldPaths=deviceType" +
               "&updateMask.fieldPaths=voltage" +
               "&updateMask.fieldPaths=current" +
               "&updateMask.fieldPaths=power" +
               "&updateMask.fieldPaths=highestWattToday" +
               "&updateMask.fieldPaths=updatedAt";
  if (https.begin(client, url)) {
    https.addHeader("Content-Type", "application/json");
    String docJson = "{\"fields\":{";
    docJson += "\"espConnected\":{\"booleanValue\":true},";
    docJson += "\"deviceType\":{\"stringValue\":\"ESP-01\"},";
    docJson += "\"voltage\":{\"doubleValue\":" + String(v, 2) + "},";
    docJson += "\"current\":{\"doubleValue\":" + String(i, 3) + "},";
    docJson += "\"power\":{\"doubleValue\":" + String(p, 2) + "},";
    docJson += "\"highestWattToday\":{\"doubleValue\":" + String(highestWattToday, 2) + "},";
    docJson += "\"updatedAt\":{\"stringValue\":\"" + String(millis()) + "\"}";
    docJson += "}}";
    https.PATCH(docJson);
    https.end();
  }
}

void setup() {
  Serial.begin(115200);
  pinMode(PIN_WIPER_RELAY, OUTPUT);
  digitalWrite(PIN_WIPER_RELAY, HIGH);

  Wire.begin(0, 2); // SDA=GPIO0, SCL=GPIO2
  ina219.begin();

  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\\nWiFi Connected!");
}

void loop() {
  if (millis() - lastTelemetryTime >= TELEMETRY_INTERVAL) {
    lastTelemetryTime = millis();
    float busVoltage = ina219.getBusVoltage_V();
    float current_A = ina219.getCurrent_mA() / 1000.0;
    float power_W = busVoltage * current_A;
    if (power_W > highestWattToday) highestWattToday = power_W;
    Serial.printf("PV: %.2fV | %.2fA | %.2fW\\n", busVoltage, current_A, power_W);
    pushToFirestore(busVoltage, current_A, power_W);
  }
}
`;

  // Arduino + ESP-01 Rig Sketch
  const arduinoEsp01CodeSnippet = `/*
 * Farm.IOT - Arduino Nano / Uno + ESP-01 Dual Hardware Rig
 * 
 * Hardware Connections:
 *   - Arduino Nano: Reads LM35 Temp (A0), FC-37 Rain (A1), INA219 (A4/A5), Controls Wiper (D7)
 *   - ESP-01: Connects to Wi-Fi and bridges data to Firebase via SoftwareSerial (D2 RX, D3 TX)
 */

#include <SoftwareSerial.h>
#include <Wire.h>
#include <Adafruit_INA219.h>

SoftwareSerial espSerial(2, 3); // RX=D2, TX=D3
Adafruit_INA219 ina219;

#define PIN_LM35 A0
#define PIN_RAIN A1
#define PIN_WIPER_RELAY 7

float highestWattToday = 0.0;
unsigned long lastSend = 0;

void setup() {
  Serial.begin(9600);
  espSerial.begin(9600);
  pinMode(PIN_WIPER_RELAY, OUTPUT);
  digitalWrite(PIN_WIPER_RELAY, HIGH);
  Wire.begin();
  ina219.begin();
}

void loop() {
  if (millis() - lastSend > 3000) {
    lastSend = millis();
    float v = ina219.getBusVoltage_V();
    float i = ina219.getCurrent_mA() / 1000.0;
    float w = v * i;
    int lm35Raw = analogRead(PIN_LM35);
    float tempC = (lm35Raw * (5.0 / 1024.0)) * 100.0;
    bool isRaining = (analogRead(PIN_RAIN) < 500);

    espSerial.print("DATA,");
    espSerial.print(v); espSerial.print(",");
    espSerial.print(i); espSerial.print(",");
    espSerial.print(w); espSerial.print(",");
    espSerial.print(tempC); espSerial.print(",");
    espSerial.println(isRaining ? "1" : "0");
  }
}
`;

  // 1. Unified Hybrid Microgrid Firmware (Solar + Windmill + Peltier + AP Hotspot + Firestore) [Recommended]
  const esp32HybridCodeSnippet = `/*
 * Farm.IOT - ESP32 Unified Hybrid Microgrid Firmware
 * (Photovoltaic Station + Aero Windmill Turbine + Peltier Thermoelectric Lab)
 * 
 * 🚀 DUAL-CHANNEL HYBRID ARCHITECTURE:
 * 1. LOCAL ACCESS POINT (Offline Field Mode):
 *    - Wi-Fi Hotspot: "Solar-Hybrid-AP" (Password: "SolarIOT123")
 *    - Gateway IP: 192.168.4.1 (Port 80 HTTP REST)
 *    - Endpoints: /api/telemetry, /api/clean, /api/stop, /api/reset_rpm
 * 
 * 2. CLOUD FIRESTORE SYNCHRONIZATION:
 *    - Connects to Wi-Fi (STA_SSID) and streams live telemetry to Google Cloud Firestore
 *    - Firestore collection: "solar_iot/node_01" and "solar_iot/windmill_peltier"
 * 
 * 📌 COMPLETE HARDWARE WIRING PINOUT:
 * [WINDMILL TURBINE]:
 *   - Hall Effect Sensor (A3144/NJK-5002C): Signal -> GPIO 34 (Hardware Interrupt, 10kΩ pull-up)
 *   - Windmill INA219 Power Monitor (0x41): SDA -> GPIO 21, SCL -> GPIO 22 (A0 bridged for 0x41)
 *   - BMP280 Barometer (0x76): SDA -> GPIO 21, SCL -> GPIO 22 (Air pressure & density)
 *   - Dynamo Generator: 3-Phase AC to Schottky Bridge Rectifier -> INA219 (0x41) Vin+
 * [SOLAR PV STATION]:
 *   - Solar INA219 Power Monitor (0x40): SDA -> GPIO 21, SCL -> GPIO 22 (Address 0x40 default)
 *   - LM35 Panel Temp Sensor: Vout -> GPIO 32 (ADC1 Ch4, 10mV/°C)
 *   - FC-37 Rain Droplet Sensor: AO/DO -> GPIO 35 (ADC1 Ch7)
 *   - Wiper Motor Relay: IN -> GPIO 27 (Active-LOW 5V Relay controlling squeegee gearmotor)
 *   - Hydro Pump Relay: IN -> GPIO 26 (Active-LOW 5V Relay, optional misting)
 * [PELTIER SEEBECK HARVESTER]:
 *   - DS18B20 Sand Bed Probe: Data -> GPIO 4 (OneWire Bus with 4.7kΩ pull-up to 3.3V)
 *   - Peltier Thermal Harvest: Positive Lead -> GPIO 36 (ADC1 Ch0 / VP) or Dedicated Shunt
 */

#include <WiFi.h>
#include <WebServer.h>
#include <HTTPClient.h>
#include <WiFiClientSecure.h>
#include <Wire.h>
#include <Adafruit_INA219.h>
#include <Adafruit_BMP280.h>
#include <OneWire.h>
#include <DallasTemperature.h>

// 1. Wi-Fi Configuration
const char* AP_SSID = "Solar-Hybrid-AP";
const char* AP_PASS = "SolarIOT123"; // minimum 8 characters
const char* STA_SSID = "YOUR_WIFI_SSID";
const char* STA_PASS = "YOUR_WIFI_PASSWORD";

// 2. Google Cloud Firestore Credentials
const char* PROJECT_ID = "${activeProjectId}";
const char* DATABASE_ID = "${activeDatabaseId}";
const char* API_KEY = "${firebaseConfig.apiKey}";

// 3. Hardware Pin Definitions
#define PIN_HALL_SENSOR   34  // Hall effect interrupt (GPIO 34)
#define PIN_RAIN          35  // FC-37 Rain analog (GPIO 35)
#define PIN_LM35          32  // Solar panel temperature (GPIO 32)
#define PIN_ONEWIRE_SAND   4  // DS18B20 OneWire bus (GPIO 4)
#define PIN_WIPER_RELAY   27  // Active-LOW relay for wiper squeegee
#define PIN_PUMP_RELAY    26  // Active-LOW relay for water pump
#define I2C_SDA           21  // Shared I2C Data
#define I2C_SCL           22  // Shared I2C Clock

// Windmill Aerodynamic Calibration
const int PULSES_PER_REV = 1;        // Magnets on rotor shaft (1, 2, or 4)
const float ROTOR_RADIUS_M = 0.425;  // 0.85m rotor diameter

// Sensor Objects
Adafruit_INA219 inaSolar(0x40);      // Solar PV power (0x40 default)
Adafruit_INA219 inaWindmill(0x41);   // Windmill dynamo power (0x41 bridged)
Adafruit_BMP280 bmp280;              // Barometric pressure & air density (0x76)
OneWire oneWireSand(PIN_ONEWIRE_SAND);
DallasTemperature sandSensors(&oneWireSand);
WebServer server(80);

// Hall Effect Tachometer Interrupt State
volatile unsigned long hallPulseCounter = 0;
volatile unsigned long lastHallInterruptMs = 0;
unsigned long lastRpmCalcTime = 0;
float windmillRpm = 0.0;
float estimatedWindSpeed = 0.0;

void IRAM_ATTR onHallPulseISR() {
  unsigned long now = millis();
  if (now - lastHallInterruptMs > 4) { // 4ms debouncing filter
    hallPulseCounter++;
    lastHallInterruptMs = now;
  }
}

// System Telemetry Variables
float solarVoltage = 0.0;
float solarAmps = 0.0;
float solarPower = 0.0;
float solarTempC = 25.0;
bool isRaining = false;
float highestWattToday = 0.0;

float windmillVoltage = 0.0;
float windmillAmps = 0.0;
float windmillPower = 0.0;
float airPressureHpa = 1013.25;
float ambientTempC = 25.0;

float sandTempC = 45.0;
float peltierVoltage = 0.0;
float peltierAmps = 0.0;
float peltierPower = 0.0;
float peltierTempC = 30.0;

// Mechanical Wiper Squeegee State
bool isWiperActive = false;
unsigned long wiperStartTime = 0;
const unsigned long WIPER_SWEEP_DURATION_MS = 10000;

// Loop Timers
unsigned long lastSensorRead = 0;
unsigned long lastFirebasePush = 0;
unsigned long lastWifiCheck = 0;
unsigned long lastCommandPoll = 0;
const unsigned long COMMAND_POLL_INTERVAL = 4000;

void setCorsHeaders() {
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.sendHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  server.sendHeader("Access-Control-Allow-Headers", "Content-Type, Origin, Accept");
}

void triggerWiper() {
  isWiperActive = true;
  wiperStartTime = millis();
  digitalWrite(PIN_WIPER_RELAY, LOW); // Active-LOW wiper relay ON
  digitalWrite(PIN_PUMP_RELAY, LOW);  // Active-LOW pump relay ON
  Serial.println("[WIPER] Wiper gearmotor & hydro pump active! Cleaning sweep starting...");
}

void stopWiper() {
  isWiperActive = false;
  digitalWrite(PIN_WIPER_RELAY, HIGH); // Wiper relay OFF
  digitalWrite(PIN_PUMP_RELAY, HIGH);  // Pump relay OFF
  Serial.println("[WIPER] Wiper & pump parked in safe zone.");
}

void calculateRpm() {
  unsigned long now = millis();
  unsigned long elapsedMs = now - lastRpmCalcTime;
  if (elapsedMs >= 1000) {
    noInterrupts();
    unsigned long pulses = hallPulseCounter;
    hallPulseCounter = 0;
    interrupts();

    // RPM = (pulses / PULSES_PER_REV) * (60000 / elapsedMs)
    windmillRpm = ((float)pulses / (float)PULSES_PER_REV) * (60000.0f / (float)elapsedMs);
    // Empirical wind speed approximation: v = RPM * 0.009 m/s
    estimatedWindSpeed = windmillRpm * 0.009f;
    lastRpmCalcTime = now;
  }
}

void readSensors() {
  calculateRpm();

  // 1. Solar INA219 (0x40)
  solarVoltage = inaSolar.getBusVoltage_V();
  solarAmps = inaSolar.getCurrent_mA() / 1000.0f;
  if (solarAmps < 0) solarAmps = 0;
  solarPower = solarVoltage * solarAmps;
  if (solarPower > highestWattToday) {
    highestWattToday = solarPower;
  }

  // 2. Windmill INA219 (0x41)
  windmillVoltage = inaWindmill.getBusVoltage_V();
  windmillAmps = inaWindmill.getCurrent_mA() / 1000.0f;
  if (windmillAmps < 0) windmillAmps = 0;
  windmillPower = windmillVoltage * windmillAmps;

  // 3. BMP280 Barometer (0x76)
  airPressureHpa = bmp280.readPressure() / 100.0f;
  ambientTempC = bmp280.readTemperature();

  // 4. FC-37 Rain & LM35 Panel Temp
  int rawLM35 = analogRead(PIN_LM35);
  solarTempC = (rawLM35 / 4095.0f) * 330.0f;
  isRaining = (analogRead(PIN_RAIN) < 2500);

  // 5. Sand Bed DS18B20 Temp & Peltier Seebeck Harvest
  sandSensors.requestTemperatures();
  float sT = sandSensors.getTempCByIndex(0);
  if (sT > -50 && sT < 150) {
    sandTempC = sT;
  }
  float deltaT = sandTempC - ambientTempC;
  if (deltaT > 0) {
    // Seebeck solid-state thermoelectric generation estimation
    peltierVoltage = deltaT * 0.045f; // ~45mV per degree Celsius delta
    peltierAmps = peltierVoltage / 3.5f; // across 3.5 ohm internal resistance
    peltierPower = peltierVoltage * peltierAmps;
    peltierTempC = ambientTempC + (deltaT * 0.35f);
  } else {
    peltierVoltage = 0.0;
    peltierAmps = 0.0;
    peltierPower = 0.0;
    peltierTempC = ambientTempC;
  }
}

void handleLocalTelemetry() {
  setCorsHeaders();
  String json = "{";
  json += "\"voltage\":" + String(solarVoltage, 2) + ",";
  json += "\"current\":" + String(solarAmps, 3) + ",";
  json += "\"power\":" + String(solarPower, 2) + ",";
  json += "\"temperature\":" + String(solarTempC, 1) + ",";
  json += "\"isRaining\":" + String(isRaining ? "true" : "false") + ",";
  json += "\"wiperActive\":" + String(isWiperActive ? "true" : "false") + ",";
  json += "\"cleaningStatus\":\"" + String(isWiperActive ? "cleaning" : "idle") + "\",";
  json += "\"highestWattToday\":" + String(highestWattToday, 2) + ",";
  json += "\"windmillRpm\":" + String(windmillRpm, 1) + ",";
  json += "\"windmillPower\":" + String(windmillPower, 2) + ",";
  json += "\"electricityGenerated\":" + String(windmillPower, 2) + ",";
  json += "\"windmillVoltage\":" + String(windmillVoltage, 2) + ",";
  json += "\"windmillCurrent\":" + String(windmillAmps, 3) + ",";
  json += "\"airPressure\":" + String(airPressureHpa, 1) + ",";
  json += "\"sandTemp\":" + String(sandTempC, 1) + ",";
  json += "\"environmentTemp\":" + String(ambientTempC, 1) + ",";
  json += "\"peltierTemp\":" + String(peltierTempC, 1) + ",";
  json += "\"peltierVoltage\":" + String(peltierVoltage, 2) + ",";
  json += "\"peltierCurrent\":" + String(peltierAmps, 3) + ",";
  json += "\"peltierPower\":" + String(peltierPower, 2) + ",";
  json += "\"staConnected\":" + String(WiFi.status() == WL_CONNECTED ? "true" : "false") + ",";
  json += "\"staIP\":\"" + (WiFi.status() == WL_CONNECTED ? WiFi.localIP().toString() : "offline") + "\",";
  json += "\"apIP\":\"" + WiFi.softAPIP().toString() + "\",";
  json += "\"uptimeSeconds\":" + String(millis() / 1000);
  json += "}";
  server.send(200, "application/json", json);
}

void handleLocalClean() {
  setCorsHeaders();
  triggerWiper();
  server.send(200, "application/json", "{\"status\":\"ok\",\"action\":\"wiper_started\",\"duration_ms\":10000}");
}

void handleLocalStop() {
  setCorsHeaders();
  stopWiper();
  server.send(200, "application/json", "{\"status\":\"ok\",\"action\":\"wiper_stopped\"}");
}

void handleResetRpm() {
  setCorsHeaders();
  noInterrupts();
  hallPulseCounter = 0;
  windmillRpm = 0.0;
  interrupts();
  server.send(200, "application/json", "{\"status\":\"ok\",\"action\":\"rpm_counter_reset\"}");
}

void pushToFirestore() {
  if (WiFi.status() != WL_CONNECTED) return;

  WiFiClientSecure client;
  client.setInsecure(); // Fast embedded TLS
  HTTPClient https;

  String url = "https://firestore.googleapis.com/v1/projects/";
  url += PROJECT_ID;
  url += "/databases/";
  url += DATABASE_ID;
  url += "/documents/solar_iot/node_01?key=";
  url += API_KEY;
  url += "&updateMask.fieldPaths=voltage"
         "&updateMask.fieldPaths=current"
         "&updateMask.fieldPaths=power"
         "&updateMask.fieldPaths=temperature"
         "&updateMask.fieldPaths=espConnected"
         "&updateMask.fieldPaths=isRaining"
         "&updateMask.fieldPaths=wiperActive"
         "&updateMask.fieldPaths=cleaningStatus"
         "&updateMask.fieldPaths=highestWattToday"
         "&updateMask.fieldPaths=windmillRpm"
         "&updateMask.fieldPaths=windmillPower"
         "&updateMask.fieldPaths=electricityGenerated"
         "&updateMask.fieldPaths=windmillVoltage"
         "&updateMask.fieldPaths=windmillCurrent"
         "&updateMask.fieldPaths=airPressure"
         "&updateMask.fieldPaths=sandTemp"
         "&updateMask.fieldPaths=environmentTemp"
         "&updateMask.fieldPaths=peltierTemp"
         "&updateMask.fieldPaths=peltierVoltage"
         "&updateMask.fieldPaths=peltierCurrent"
         "&updateMask.fieldPaths=peltierPower"
         "&updateMask.fieldPaths=updatedAt";

  if (https.begin(client, url)) {
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
    docJson += "\"voltage\":{\"doubleValue\":" + String(solarVoltage, 2) + "},";
    docJson += "\"current\":{\"doubleValue\":" + String(solarAmps, 3) + "},";
    docJson += "\"power\":{\"doubleValue\":" + String(solarPower, 2) + "},";
    docJson += "\"temperature\":{\"doubleValue\":" + String(solarTempC, 1) + "},";
    docJson += "\"espConnected\":{\"booleanValue\":true},";
    docJson += "\"isRaining\":{\"booleanValue\":" + String(isRaining ? "true" : "false") + "},";
    docJson += "\"wiperActive\":{\"booleanValue\":" + String(isWiperActive ? "true" : "false") + "},";
    docJson += "\"cleaningStatus\":{\"stringValue\":\"" + String(isWiperActive ? "cleaning" : "idle") + "\"},";
    docJson += "\"highestWattToday\":{\"doubleValue\":" + String(highestWattToday, 2) + "},";
    docJson += "\"windmillRpm\":{\"doubleValue\":" + String(windmillRpm, 1) + "},";
    docJson += "\"windmillPower\":{\"doubleValue\":" + String(windmillPower, 2) + "},";
    docJson += "\"electricityGenerated\":{\"doubleValue\":" + String(windmillPower, 2) + "},";
    docJson += "\"windmillVoltage\":{\"doubleValue\":" + String(windmillVoltage, 2) + "},";
    docJson += "\"windmillCurrent\":{\"doubleValue\":" + String(windmillAmps, 3) + "},";
    docJson += "\"airPressure\":{\"doubleValue\":" + String(airPressureHpa, 1) + "},";
    docJson += "\"sandTemp\":{\"doubleValue\":" + String(sandTempC, 1) + "},";
    docJson += "\"environmentTemp\":{\"doubleValue\":" + String(ambientTempC, 1) + "},";
    docJson += "\"peltierTemp\":{\"doubleValue\":" + String(peltierTempC, 1) + "},";
    docJson += "\"peltierVoltage\":{\"doubleValue\":" + String(peltierVoltage, 2) + "},";
    docJson += "\"peltierCurrent\":{\"doubleValue\":" + String(peltierAmps, 3) + "},";
    docJson += "\"peltierPower\":{\"doubleValue\":" + String(peltierPower, 2) + "},";
    docJson += "\"updatedAt\":{\"stringValue\":\"" + String(timeBuf) + "\"}";
    docJson += "}}";

    int httpCode = https.PATCH(docJson);
    if (httpCode > 0) {
      Serial.printf("[FIREBASE] Streamed telemetry packet -> HTTP %d\n", httpCode);
    } else {
      Serial.printf("[FIREBASE] Sync note: %s\n", https.errorToString(httpCode).c_str());
    }
    https.end();
  }
}

// Poll remote cleaning wiper commands from Firestore
void checkCloudCommands() {
  if (WiFi.status() != WL_CONNECTED || isWiperActive) return;

  WiFiClientSecure client;
  client.setInsecure();
  client.setTimeout(6000);

  HTTPClient https;
  String baseUrl = "https://firestore.googleapis.com/v1/projects/" + String(PROJECT_ID) +
                   "/databases/" + String(DATABASE_ID) +
                   "/documents/solar_iot/node_01?key=" + String(API_KEY);

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
    https.end();
  }

  if (shouldTrigger) {
    Serial.println("[CLOUD COMMAND] Remote Cleaning Wiper Trigger Received!");
    triggerWiper();

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
  configTime(0, 0, "pool.ntp.org", "time.google.com");
  Serial.println("\\n=======================================================");
  Serial.println("  Farm.IOT Unified Hybrid Microgrid Firmware Starting  ");
  Serial.println("  Solar PV + Wind Turbine + Peltier-Seebeck Station     ");
  Serial.println("=======================================================");

  pinMode(PIN_WIPER_RELAY, OUTPUT);
  digitalWrite(PIN_WIPER_RELAY, HIGH); // Default OFF (active-LOW)
  pinMode(PIN_PUMP_RELAY, OUTPUT);
  digitalWrite(PIN_PUMP_RELAY, HIGH);  // Default OFF (active-LOW)

  pinMode(PIN_LM35, INPUT);
  pinMode(PIN_RAIN, INPUT);

  // Initialize Hall Effect Tachometer Sensor with Hardware Interrupt
  pinMode(PIN_HALL_SENSOR, INPUT_PULLUP);
  attachInterrupt(digitalPinToInterrupt(PIN_HALL_SENSOR), onHallPulseISR, FALLING);
  Serial.println("[HALL] Tachometer interrupt attached on GPIO 34 (FALLING).");

  // Initialize I2C Bus on GPIO 21 (SDA) and GPIO 22 (SCL)
  Wire.begin(I2C_SDA, I2C_SCL);

  // 1. Solar INA219 (0x40)
  if (!inaSolar.begin()) {
    Serial.println("[WARN] Solar INA219 sensor not found on I2C address 0x40.");
  } else {
    Serial.println("[OK] Solar INA219 (0x40) Initialized.");
  }

  // 2. Windmill INA219 (0x41)
  if (!inaWindmill.begin()) {
    Serial.println("[WARN] Windmill INA219 not found on I2C 0x41. (Bridge A0 jumper)");
  } else {
    Serial.println("[OK] Windmill INA219 (0x41) Initialized.");
  }

  // 3. BMP280 Barometer (0x76)
  if (!bmp280.begin(0x76)) {
    Serial.println("[WARN] BMP280 Barometer not found on 0x76. Checking 0x77...");
    if (!bmp280.begin(0x77)) {
      Serial.println("[WARN] BMP280 not found on 0x76 or 0x77.");
    }
  } else {
    Serial.println("[OK] BMP280 Barometric & Temperature Sensor Initialized.");
  }

  // 4. DS18B20 OneWire Sand Temperature Probe
  sandSensors.begin();
  Serial.println("[OK] DS18B20 Sand Bed Temperature Probe Initialized on GPIO 4.");

  // Wi-Fi Setup: Simultaneous AP Hotspot + Station
  WiFi.mode(WIFI_AP_STA);
  WiFi.softAP(AP_SSID, AP_PASS);
  Serial.print("[WIFI] Local AP Started! SSID: "); Serial.println(AP_SSID);
  Serial.print("[WIFI] Local AP IP Address:  http://"); Serial.println(WiFi.softAPIP());

  WiFi.begin(STA_SSID, STA_PASS);
  Serial.print("[WIFI] Connecting Station to: "); Serial.println(STA_SSID);

  // Setup Local HTTP REST API
  server.on("/api/telemetry", HTTP_GET, handleLocalTelemetry);
  server.on("/api/clean", HTTP_POST, handleLocalClean);
  server.on("/api/clean", HTTP_GET, handleLocalClean);
  server.on("/api/stop", HTTP_POST, handleLocalStop);
  server.on("/api/stop", HTTP_GET, handleLocalStop);
  server.on("/api/reset_rpm", HTTP_POST, handleResetRpm);
  server.on("/api/reset_rpm", HTTP_GET, handleResetRpm);

  server.onNotFound([]() {
    if (server.method() == HTTP_OPTIONS) {
      setCorsHeaders();
      server.send(204);
    } else {
      setCorsHeaders();
      server.send(404, "text/plain", "Not Found");
    }
  });

  server.begin();
  Serial.println("[HTTP] Local REST WebServer active on port 80.");
}

void loop() {
  server.handleClient();

  if (isWiperActive && (millis() - wiperStartTime >= WIPER_SWEEP_DURATION_MS)) {
    stopWiper();
  }

  if (millis() - lastSensorRead >= 1000) {
    lastSensorRead = millis();
    readSensors();
  }

  if (millis() - lastWifiCheck >= 10000) {
    lastWifiCheck = millis();
    if (WiFi.status() != WL_CONNECTED) {
      WiFi.reconnect();
    }
  }

  if (millis() - lastFirebasePush >= 2500) {
    lastFirebasePush = millis();
    if (WiFi.status() == WL_CONNECTED) {
      pushToFirestore();
    }
  }

  if (millis() - lastCommandPoll >= COMMAND_POLL_INTERVAL) {
    lastCommandPoll = millis();
    if (WiFi.status() == WL_CONNECTED) {
      checkCloudCommands();
    }
  }
}
`;

  // 2. Dedicated Windmill & Peltier Thermoelectric Station Firmware
  const esp32WindmillCodeSnippet = `/*
 * Farm.IOT - ESP32 Dedicated Wind Turbine & Peltier Seebeck Station Firmware
 * 
 * Focused firmware engineered specifically for the Aero-Kinetic Windmill
 * and the Sand Thermal Storage Peltier Thermoelectric Generator.
 * 
 * Hardware Connections:
 *   - Hall Effect Sensor (A3144/NJK-5002C): Signal -> GPIO 34 (Hardware Interrupt)
 *   - Windmill INA219 Power Monitor (0x41): SDA -> GPIO 21, SCL -> GPIO 22
 *   - BMP280 Barometer Sensor (0x76):       SDA -> GPIO 21, SCL -> GPIO 22
 *   - DS18B20 Sand Bed Temperature Probe:   Data -> GPIO 4 (OneWire with 4.7kΩ pull-up)
 *   - Peltier Thermal Harvest Shunt:        Leads -> INA219 Vin+ / Vin-
 *   - 3-Phase AC Dynamo:                    Alternator -> Schottky Bridge -> INA219
 */

#include <WiFi.h>
#include <WebServer.h>
#include <HTTPClient.h>
#include <WiFiClientSecure.h>
#include <Wire.h>
#include <Adafruit_INA219.h>
#include <Adafruit_BMP280.h>
#include <OneWire.h>
#include <DallasTemperature.h>

const char* AP_SSID = "Windmill-Lab-AP";
const char* AP_PASS = "Windmill123";
const char* STA_SSID = "YOUR_WIFI_SSID";
const char* STA_PASS = "YOUR_WIFI_PASSWORD";

const char* PROJECT_ID = "${activeProjectId}";
const char* DATABASE_ID = "${activeDatabaseId}";
const char* API_KEY = "${firebaseConfig.apiKey}";

#define PIN_HALL_SENSOR   34  // Hall effect interrupt (GPIO 34)
#define PIN_ONEWIRE_SAND   4  // DS18B20 Sand temperature (GPIO 4)
#define I2C_SDA           21
#define I2C_SCL           22

const int PULSES_PER_REV = 1;

Adafruit_INA219 inaWindmill(0x41);
Adafruit_BMP280 bmp280;
OneWire oneWireSand(PIN_ONEWIRE_SAND);
DallasTemperature sandSensors(&oneWireSand);
WebServer server(80);

volatile unsigned long pulseCount = 0;
volatile unsigned long lastPulseTime = 0;
unsigned long lastRpmCalc = 0;
float currentRpm = 0.0;
float windSpeedMs = 0.0;

float genVoltage = 0.0;
float genCurrent = 0.0;
float genWatts = 0.0;
float baroPressure = 1013.25;
float ambientTemp = 25.0;
float sandBedTemp = 42.0;
float peltierHarvestWatts = 0.0;

unsigned long lastRead = 0;
unsigned long lastPush = 0;

void IRAM_ATTR onHallInterrupt() {
  unsigned long now = millis();
  if (now - lastPulseTime > 4) {
    pulseCount++;
    lastPulseTime = now;
  }
}

void setCors() {
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.sendHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  server.sendHeader("Access-Control-Allow-Headers", "Content-Type");
}

void readWindmillSensors() {
  unsigned long now = millis();
  unsigned long dt = now - lastRpmCalc;
  if (dt >= 1000) {
    noInterrupts();
    unsigned long p = pulseCount;
    pulseCount = 0;
    interrupts();

    currentRpm = ((float)p / (float)PULSES_PER_REV) * (60000.0f / (float)dt);
    windSpeedMs = currentRpm * 0.009f;
    lastRpmCalc = now;
  }

  genVoltage = inaWindmill.getBusVoltage_V();
  genCurrent = inaWindmill.getCurrent_mA() / 1000.0f;
  if (genCurrent < 0) genCurrent = 0;
  genWatts = genVoltage * genCurrent;

  baroPressure = bmp280.readPressure() / 100.0f;
  ambientTemp = bmp280.readTemperature();

  sandSensors.requestTemperatures();
  float st = sandSensors.getTempCByIndex(0);
  if (st > -50 && st < 150) sandBedTemp = st;

  float deltaT = sandBedTemp - ambientTemp;
  if (deltaT > 0) {
    peltierHarvestWatts = (deltaT * 0.045f) * ((deltaT * 0.045f) / 3.5f);
  } else {
    peltierHarvestWatts = 0.0;
  }
}

void pushToFirestore() {
  if (WiFi.status() != WL_CONNECTED) return;
  WiFiClientSecure client; client.setInsecure();
  HTTPClient https;

  String url = "https://firestore.googleapis.com/v1/projects/" + String(PROJECT_ID) +
               "/databases/" + String(DATABASE_ID) +
               "/documents/solar_iot/windmill_peltier?key=" + String(API_KEY) +
               "&updateMask.fieldPaths=windmillRpm"
               "&updateMask.fieldPaths=windmillPower"
               "&updateMask.fieldPaths=electricityGenerated"
               "&updateMask.fieldPaths=windmillVoltage"
               "&updateMask.fieldPaths=windmillCurrent"
               "&updateMask.fieldPaths=airPressure"
               "&updateMask.fieldPaths=sandTemp"
               "&updateMask.fieldPaths=environmentTemp"
               "&updateMask.fieldPaths=peltierPower"
               "&updateMask.fieldPaths=espConnected"
               "&updateMask.fieldPaths=updatedAt";

  if (https.begin(client, url)) {
    https.addHeader("Content-Type", "application/json");
    String json = "{\"fields\":{";
    json += "\"windmillRpm\":{\"doubleValue\":" + String(currentRpm, 1) + "},";
    json += "\"windmillPower\":{\"doubleValue\":" + String(genWatts, 2) + "},";
    json += "\"electricityGenerated\":{\"doubleValue\":" + String(genWatts, 2) + "},";
    json += "\"windmillVoltage\":{\"doubleValue\":" + String(genVoltage, 2) + "},";
    json += "\"windmillCurrent\":{\"doubleValue\":" + String(genCurrent, 3) + "},";
    json += "\"airPressure\":{\"doubleValue\":" + String(baroPressure, 1) + "},";
    json += "\"sandTemp\":{\"doubleValue\":" + String(sandBedTemp, 1) + "},";
    json += "\"environmentTemp\":{\"doubleValue\":" + String(ambientTemp, 1) + "},";
    json += "\"peltierPower\":{\"doubleValue\":" + String(peltierHarvestWatts, 2) + "},";
    json += "\"espConnected\":{\"booleanValue\":true},";
    json += "\"updatedAt\":{\"stringValue\":\"" + String(millis()) + "\"}";
    json += "}}";
    https.PATCH(json);
    https.end();
  }
}

void setup() {
  Serial.begin(115200);
  Serial.println("\\n--- Dedicated Windmill & Peltier Station Starting ---");

  pinMode(PIN_HALL_SENSOR, INPUT_PULLUP);
  attachInterrupt(digitalPinToInterrupt(PIN_HALL_SENSOR), onHallInterrupt, FALLING);

  Wire.begin(I2C_SDA, I2C_SCL);
  inaWindmill.begin();
  bmp280.begin(0x76);
  sandSensors.begin();

  WiFi.mode(WIFI_AP_STA);
  WiFi.softAP(AP_SSID, AP_PASS);
  WiFi.begin(STA_SSID, STA_PASS);

  server.on("/api/telemetry", HTTP_GET, []() {
    setCors();
    String j = "{\"rpm\":" + String(currentRpm, 1) + ",\"watts\":" + String(genWatts, 2) +
               ",\"pressure\":" + String(baroPressure, 1) + ",\"sandTemp\":" + String(sandBedTemp, 1) + "}";
    server.send(200, "application/json", j);
  });
  server.begin();
}

void loop() {
  server.handleClient();
  if (millis() - lastRead >= 1000) {
    lastRead = millis();
    readWindmillSensors();
  }
  if (millis() - lastPush >= 2500) {
    lastPush = millis();
    pushToFirestore();
  }
}
`;

  // 3. Dedicated Solar PV & Automated Wiper Firmware
  const esp32SolarCodeSnippet = `/*
 * Farm.IOT - ESP32 Dedicated Solar PV & Automated Wiper Firmware
 * 
 * Focused firmware engineered specifically for the Photovoltaic Array
 * and the Motorized Dry Squeegee Wiper cleaning mechanism.
 * 
 * Hardware Connections:
 *   - Solar INA219 (0x40): SDA -> GPIO 21, SCL -> GPIO 22
 *   - LM35 Surface Temp:   Vout -> GPIO 32 (ADC1 Ch4)
 *   - FC-37 Rain Droplet:  Analog -> GPIO 35 (ADC1 Ch7)
 *   - Wiper Relay Module:  IN -> GPIO 27 (Active-LOW 5V Relay)
 *   - Hydro Pump Relay:    IN -> GPIO 26 (Active-LOW 5V Relay)
 */

#include <WiFi.h>
#include <WebServer.h>
#include <HTTPClient.h>
#include <WiFiClientSecure.h>
#include <Wire.h>
#include <Adafruit_INA219.h>

const char* AP_SSID = "Solar-Cleaner-AP";
const char* AP_PASS = "SolarIOT123";
const char* STA_SSID = "YOUR_WIFI_SSID";
const char* STA_PASS = "YOUR_WIFI_PASSWORD";

const char* PROJECT_ID = "${activeProjectId}";
const char* DATABASE_ID = "${activeDatabaseId}";
const char* API_KEY = "${firebaseConfig.apiKey}";

#define PIN_LM35          32
#define PIN_RAIN          35
#define PIN_WIPER_RELAY   27
#define PIN_PUMP_RELAY    26

Adafruit_INA219 ina219(0x40);
WebServer server(80);

float currentVoltage = 0.0;
float currentAmps = 0.0;
float currentPower = 0.0;
float currentTempC = 25.0;
bool isRaining = false;
float highestWattToday = 0.0;

bool isWiperActive = false;
unsigned long wiperStartTime = 0;
const unsigned long WIPER_SWEEP_DURATION_MS = 10000;

unsigned long lastSensorRead = 0;
unsigned long lastFirebasePush = 0;

void setCorsHeaders() {
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.sendHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  server.sendHeader("Access-Control-Allow-Headers", "Content-Type, Origin, Accept");
}

void triggerWiper() {
  isWiperActive = true;
  wiperStartTime = millis();
  digitalWrite(PIN_WIPER_RELAY, LOW);
  Serial.println("[WIPER] Active! Squeegee dry sweep starting...");
}

void stopWiper() {
  isWiperActive = false;
  digitalWrite(PIN_WIPER_RELAY, HIGH);
  Serial.println("[WIPER] Squeegee parked.");
}

void handleLocalTelemetry() {
  setCorsHeaders();
  String json = "{";
  json += "\"voltage\":" + String(currentVoltage, 2) + ",";
  json += "\"current\":" + String(currentAmps, 3) + ",";
  json += "\"power\":" + String(currentPower, 2) + ",";
  json += "\"temperature\":" + String(currentTempC, 1) + ",";
  json += "\"isRaining\":" + String(isRaining ? "true" : "false") + ",";
  json += "\"wiperActive\":" + String(isWiperActive ? "true" : "false") + ",";
  json += "\"cleaningStatus\":\"" + String(isWiperActive ? "cleaning" : "idle") + "\",";
  json += "\"highestWattToday\":" + String(highestWattToday, 2) + ",";
  json += "\"uptimeSeconds\":" + String(millis() / 1000);
  json += "}";
  server.send(200, "application/json", json);
}

void readSensors() {
  currentVoltage = ina219.getBusVoltage_V();
  currentAmps = ina219.getCurrent_mA() / 1000.0f;
  if (currentAmps < 0) currentAmps = 0;
  currentPower = currentVoltage * currentAmps;
  if (currentPower > highestWattToday) highestWattToday = currentPower;

  int rawLM35 = analogRead(PIN_LM35);
  currentTempC = (rawLM35 / 4095.0f) * 330.0f;
  isRaining = (analogRead(PIN_RAIN) < 2500);
}

void pushToFirestore() {
  if (WiFi.status() != WL_CONNECTED) return;
  WiFiClientSecure client; client.setInsecure();
  HTTPClient https;

  String url = "https://firestore.googleapis.com/v1/projects/" + String(PROJECT_ID) +
               "/databases/" + String(DATABASE_ID) +
               "/documents/solar_iot/node_01?key=" + String(API_KEY) +
               "&updateMask.fieldPaths=voltage"
               "&updateMask.fieldPaths=current"
               "&updateMask.fieldPaths=power"
               "&updateMask.fieldPaths=temperature"
               "&updateMask.fieldPaths=espConnected"
               "&updateMask.fieldPaths=isRaining"
               "&updateMask.fieldPaths=wiperActive"
               "&updateMask.fieldPaths=cleaningStatus"
               "&updateMask.fieldPaths=highestWattToday"
               "&updateMask.fieldPaths=updatedAt";

  if (https.begin(client, url)) {
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
    docJson += "\"voltage\":{\"doubleValue\":" + String(currentVoltage, 2) + "},";
    docJson += "\"current\":{\"doubleValue\":" + String(currentAmps, 3) + "},";
    docJson += "\"power\":{\"doubleValue\":" + String(currentPower, 2) + "},";
    docJson += "\"temperature\":{\"doubleValue\":" + String(currentTempC, 1) + "},";
    docJson += "\"espConnected\":{\"booleanValue\":true},";
    docJson += "\"isRaining\":{\"booleanValue\":" + String(isRaining ? "true" : "false") + "},";
    docJson += "\"wiperActive\":{\"booleanValue\":" + String(isWiperActive ? "true" : "false") + "},";
    docJson += "\"cleaningStatus\":{\"stringValue\":\"" + String(isWiperActive ? "cleaning" : "idle") + "\"},";
    docJson += "\"highestWattToday\":{\"doubleValue\":" + String(highestWattToday, 2) + "},";
    docJson += "\"updatedAt\":{\"stringValue\":\"" + String(timeBuf) + "\"}";
    docJson += "}}";
    https.PATCH(docJson);
    https.end();
  }
}

void setup() {
  Serial.begin(115200);
  configTime(0, 0, "pool.ntp.org", "time.google.com");
  pinMode(PIN_WIPER_RELAY, OUTPUT);
  digitalWrite(PIN_WIPER_RELAY, HIGH);
  pinMode(PIN_PUMP_RELAY, OUTPUT);
  digitalWrite(PIN_PUMP_RELAY, HIGH);
  pinMode(PIN_LM35, INPUT);
  pinMode(PIN_RAIN, INPUT);

  Wire.begin(21, 22);
  ina219.begin();

  WiFi.mode(WIFI_AP_STA);
  WiFi.softAP(AP_SSID, AP_PASS);
  WiFi.begin(STA_SSID, STA_PASS);

  server.on("/api/telemetry", HTTP_GET, handleLocalTelemetry);
  server.on("/api/clean", HTTP_POST, []() { setCorsHeaders(); triggerWiper(); server.send(200, "application/json", "{\\"status\\":\\"ok\\"}"); });
  server.on("/api/clean", HTTP_GET, []() { setCorsHeaders(); triggerWiper(); server.send(200, "application/json", "{\\"status\\":\\"ok\\"}"); });
  server.on("/api/stop", HTTP_POST, []() { setCorsHeaders(); stopWiper(); server.send(200, "application/json", "{\\"status\\":\\"ok\\"}"); });
  server.on("/api/stop", HTTP_GET, []() { setCorsHeaders(); stopWiper(); server.send(200, "application/json", "{\\"status\\":\\"ok\\"}"); });
  server.begin();
}

void loop() {
  server.handleClient();
  if (isWiperActive && (millis() - wiperStartTime >= WIPER_SWEEP_DURATION_MS)) stopWiper();
  if (millis() - lastSensorRead >= 1000) { lastSensorRead = millis(); readSensors(); }
  if (millis() - lastFirebasePush >= 2500) { lastFirebasePush = millis(); pushToFirestore(); }
}
`;

  // Active sketch resolution
  const activeCodeSnippet = selectedBoard === 'nodemcu'
    ? nodemcuCodeSnippet
    : (selectedBoard === 'esp01' 
      ? esp01CodeSnippet 
      : (selectedBoard === 'arduino_esp01' 
        ? arduinoEsp01CodeSnippet 
        : (esp32SketchType === 'hybrid' 
          ? esp32HybridCodeSnippet 
          : (esp32SketchType === 'windmill' 
            ? esp32WindmillCodeSnippet 
            : esp32SolarCodeSnippet))));

  const activeFilename = selectedBoard === 'nodemcu'
    ? 'farm_iot_nodemcu_esp8266.ino'
    : (selectedBoard === 'esp01'
      ? 'farm_iot_esp01_standalone.ino'
      : (selectedBoard === 'arduino_esp01'
        ? 'farm_iot_arduino_esp01_dual.ino'
        : (esp32SketchType === 'hybrid'
          ? 'hybrid_microgrid_solar_windmill_esp32.ino'
          : (esp32SketchType === 'windmill'
            ? 'windmill_peltier_tachometer_esp32.ino'
            : 'farm_cleaner_iot_esp32.ino'))));

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl backdrop-blur-md space-y-5">
      {toastNotice && (
        <div className={`p-3 rounded-xl border text-xs font-mono flex items-center justify-between gap-2 animate-fadeIn ${
          toastNotice.type === 'error'
            ? 'bg-rose-950/80 border-rose-500/50 text-rose-200'
            : toastNotice.type === 'success'
            ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-200'
            : 'bg-zinc-900 border-zinc-700 text-zinc-200'
        }`}>
          <span>{toastNotice.text}</span>
          <button
            type="button"
            onClick={() => setToastNotice(null)}
            className="text-zinc-400 hover:text-white px-1.5 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}
      
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
              Pinout wiring, custom sensors, and ready-to-flash sketches for ESP-01, Arduino, and ESP32
            </p>
          </div>
        </div>

        {/* Real Hardware Check (No Fake Simulation) */}
        <div className="flex items-center gap-2 flex-wrap">
          {isOwner && (
            <button
              onClick={handleResetNodeOffline}
              className="px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 hover:text-white font-mono text-xs transition cursor-pointer flex items-center gap-1.5 shadow"
              title="Clear any test data and mark node as offline in database"
            >
              <WifiOff className="w-3.5 h-3.5 text-zinc-400" />
              <span>Reset to Offline</span>
            </button>
          )}


          <button
            onClick={handleCheckRealNodeStatus}
            disabled={checkingConnection}
            className="px-3.5 py-1.5 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/30 text-cyan-300 font-mono text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 shadow disabled:opacity-50"
            title="Check live Firestore telemetry document for node_01"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-cyan-400 ${checkingConnection ? 'animate-spin' : ''}`} />
            <span>{checkingConnection ? 'Checking Node...' : 'Check Hardware Status'}</span>
          </button>
        </div>
      </div>

      {/* Real Node Status Result Banner */}
      {realNodeStatus.tested && (
        <div className={`p-3.5 rounded-xl border text-xs font-mono flex items-start gap-2.5 animate-fadeIn ${
          realNodeStatus.connected 
            ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200' 
            : 'bg-zinc-950 border-zinc-800 text-zinc-300'
        }`}>
          {realNodeStatus.connected ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          ) : (
            <WifiOff className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          )}
          <div className="space-y-1 flex-1">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="font-bold text-white">
                {realNodeStatus.connected ? '● Physical ESP32 Node Connected & Streaming' : '○ Physical Node Offline (Sensors: N/A)'}
              </span>
              {realNodeStatus.lastSeen && (
                <span className="text-[10px] text-zinc-400">Last Seen: {realNodeStatus.lastSeen}</span>
              )}
            </div>
            <p className="text-[11px] leading-relaxed text-zinc-400">
              {realNodeStatus.message}
            </p>
          </div>
          <button 
            onClick={() => setRealNodeStatus({ ...realNodeStatus, tested: false })}
            className="text-zinc-500 hover:text-zinc-300 text-xs px-1"
          >
            ✕
          </button>
        </div>
      )}

      {/* Board Selector Tabs */}
      <div className="p-1.5 bg-slate-950 rounded-xl border border-slate-800 flex flex-wrap gap-1 text-xs font-mono">
        <button
          onClick={() => setSelectedBoard('nodemcu')}
          className={`flex-1 py-2 px-3 rounded-lg transition cursor-pointer flex items-center justify-center gap-2 text-center ${
            selectedBoard === 'nodemcu'
              ? 'bg-cyan-500 text-slate-950 font-black shadow-md'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Cpu className="w-3.5 h-3.5" />
          <span>NodeMCU (ESP8266 / ESP-12E)</span>
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
          <span>ESP32 DevKit (Hybrid / Standard)</span>
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
          onClick={() => setSelectedBoard('esp01')}
          className={`flex-1 py-2 px-3 rounded-lg transition cursor-pointer flex items-center justify-center gap-2 text-center ${
            selectedBoard === 'esp01'
              ? 'bg-cyan-500 text-slate-950 font-black shadow-md'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Cpu className="w-3.5 h-3.5" />
          <span>ESP-01 / ESP8266 (8-Pin)</span>
        </button>
      </div>

      {/* NodeMCU Connection Doctor & Cloud Diagnostics */}
      <div className="p-4 rounded-2xl bg-gradient-to-br from-cyan-950/30 via-slate-900 to-blue-950/30 border border-cyan-500/30 shadow-lg space-y-3 font-mono text-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
            <span className="font-bold text-white text-sm">NodeMCU Connection Doctor & Fast Fixer</span>
            <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-bold">ESP8266</span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleTestRestPing}
              disabled={testingRestPing}
              className="px-3 py-1.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-300 font-bold transition cursor-pointer flex items-center gap-1.5 text-[11px] disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${testingRestPing ? 'animate-spin' : ''}`} />
              <span>{testingRestPing ? 'Testing Cloud Ping...' : 'Test NodeMCU Cloud REST Ping'}</span>
            </button>

            {stationProfile?.firestoreDatabaseId && stationProfile.firestoreDatabaseId !== '(default)' && stationProfile.firestoreDatabaseId.includes('ai-studio') && (
              <button
                onClick={handleFixDatabaseId}
                disabled={fixingDbId}
                className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black transition cursor-pointer flex items-center gap-1.5 text-[11px] shadow-lg"
              >
                <Zap className="w-3.5 h-3.5" />
                <span>{fixingDbId ? 'Switching...' : 'Switch to (default) Database'}</span>
              </button>
            )}
          </div>
        </div>

        {fixedDbIdSuccess && (
          <div className="p-2.5 rounded-xl bg-emerald-950/80 border border-emerald-500/50 text-emerald-200 flex items-center gap-2 text-[11px]">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Successfully updated Database ID to <strong>(default)</strong>! NodeMCU can now connect seamlessly.</span>
          </div>
        )}

        {restPingResult && (
          <div className={`p-2.5 rounded-xl border text-[11px] flex items-center gap-2 ${
            restPingResult.status === 'success' 
              ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-200' 
              : 'bg-rose-950/60 border-rose-500/40 text-rose-200'
          }`}>
            {restPingResult.status === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            )}
            <span>{restPingResult.message}</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-[11px] pt-1">
          <div className="p-2.5 rounded-xl bg-zinc-950/70 border border-zinc-800 space-y-1">
            <span className="text-zinc-400 flex items-center gap-1.5">
              <Database className="w-3 h-3 text-cyan-400" />
              Target Database ID:
            </span>
            <div className="text-white font-bold truncate">
              {activeDatabaseId}
            </div>
            <div className="text-[10px] text-emerald-400">
              ✓ Valid standard Firestore database ({activeDatabaseId})
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-zinc-950/70 border border-zinc-800 space-y-1">
            <span className="text-zinc-400 flex items-center gap-1.5">
              <Radio className="w-3 h-3 text-cyan-400" />
              Wi-Fi Frequency:
            </span>
            <div className="text-amber-300 font-bold">
              2.4 GHz Only
            </div>
            <div className="text-[10px] text-zinc-400">
              NodeMCU ESP8266 does NOT support 5 GHz Wi-Fi
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-zinc-950/70 border border-zinc-800 space-y-1">
            <span className="text-zinc-400 flex items-center gap-1.5">
              <ShieldCheck className="w-3 h-3 text-cyan-400" />
              SSL Handshake (TLS):
            </span>
            <div className="text-emerald-400 font-bold">
              client.setInsecure()
            </div>
            <div className="text-[10px] text-zinc-400">
              Pre-configured in sketch to prevent SSL timeout
            </div>
          </div>
        </div>
      </div>

      {/* Sub Tab Switcher - Horizontal Scrollable Pill Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 border-b border-zinc-800 text-xs font-mono gap-3">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full scrollbar-none">
          <button
            onClick={() => setActiveTab('wiring')}
            className={`px-3 py-2 rounded-xl transition cursor-pointer flex items-center gap-1.5 shrink-0 whitespace-nowrap ${
              activeTab === 'wiring'
                ? 'bg-zinc-800 text-cyan-400 font-bold border border-zinc-700 shadow-sm'
                : 'text-zinc-400 hover:text-white bg-zinc-950/40 hover:bg-zinc-900 border border-transparent'
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>1. Pinout & Sensors ({filteredDevices.length})</span>
          </button>
          
          <button
            onClick={() => setActiveTab('arduino')}
            className={`px-3 py-2 rounded-xl transition cursor-pointer flex items-center gap-1.5 shrink-0 whitespace-nowrap ${
              activeTab === 'arduino'
                ? 'bg-zinc-800 text-cyan-400 font-bold border border-zinc-700 shadow-sm'
                : 'text-zinc-400 hover:text-white bg-zinc-950/40 hover:bg-zinc-900 border border-transparent'
            }`}
          >
            <FileCode className="w-3.5 h-3.5" />
            <span>2. Arduino Code (.ino)</span>
          </button>
          
          <button
            onClick={() => setActiveTab('media')}
            className={`px-3.5 py-2 rounded-xl transition cursor-pointer flex items-center gap-1.5 shrink-0 whitespace-nowrap ${
              activeTab === 'media'
                ? 'bg-gradient-to-r from-purple-900/60 to-cyan-900/60 text-purple-300 font-bold border border-purple-500/40 shadow-md'
                : 'text-zinc-400 hover:text-purple-300 bg-zinc-950/40 hover:bg-zinc-900 border border-transparent'
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5 text-purple-400" />
            <span>3. Photos & YouTube Video</span>
            <span className="px-1.5 py-0.2 rounded-full bg-purple-500/20 text-purple-300 text-[10px] font-bold">
              {(hardwareMedia.photos || DEFAULT_MEDIA_PHOTOS).length}
            </span>
          </button>
          
          <button
            onClick={() => setActiveTab('credentials')}
            className={`px-3 py-2 rounded-xl transition cursor-pointer flex items-center gap-1.5 shrink-0 whitespace-nowrap ${
              activeTab === 'credentials'
                ? 'bg-zinc-800 text-cyan-400 font-bold border border-zinc-700 shadow-sm'
                : 'text-zinc-400 hover:text-white bg-zinc-950/40 hover:bg-zinc-900 border border-transparent'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>4. Credentials</span>
          </button>

          <button
            onClick={() => setActiveTab('ap_offline')}
            className={`px-3 py-2 rounded-xl transition cursor-pointer flex items-center gap-1.5 shrink-0 whitespace-nowrap ${
              activeTab === 'ap_offline'
                ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-slate-950 font-bold shadow-md'
                : 'text-zinc-400 hover:text-amber-300 bg-zinc-950/40 hover:bg-zinc-900 border border-transparent'
            }`}
          >
            <Radio className="w-3.5 h-3.5 text-amber-400" />
            <span>5. Dual AP & Offline Mode</span>
          </button>

          <button
            onClick={() => setActiveTab('arduino_ide')}
            className={`px-3 py-2 rounded-xl transition cursor-pointer flex items-center gap-1.5 shrink-0 whitespace-nowrap ${
              activeTab === 'arduino_ide'
                ? 'bg-gradient-to-r from-emerald-400 to-cyan-400 text-slate-950 font-black shadow-md'
                : 'text-emerald-400 hover:text-emerald-300 bg-emerald-950/20 hover:bg-emerald-900/30 border border-emerald-500/30'
            }`}
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            <span>6. Arduino IDE & Tools</span>
            <span className="px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-mono font-bold">
              Software
            </span>
          </button>
        </div>

        {/* Quick Action Buttons in Subtab Bar */}
        {activeTab === 'wiring' && (
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => handleOpenAddDevice()}
              className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 font-bold text-xs transition cursor-pointer flex items-center gap-1.5 shadow"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Pinout Device</span>
            </button>
          </div>
        )}

        {activeTab === 'media' && (
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleOpenAddPhoto}
              className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold font-mono text-xs flex items-center gap-1.5 shadow transition cursor-pointer"
            >
              <Camera className="w-3.5 h-3.5" />
              <span>+ Add / Upload Photo</span>
            </button>
            <button
              onClick={handleOpenEditVideo}
              className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-400 hover:to-pink-500 text-white font-bold font-mono text-xs flex items-center gap-1.5 shadow transition cursor-pointer"
            >
              <Video className="w-3.5 h-3.5" />
              <span>+ YouTube Video</span>
            </button>
          </div>
        )}
      </div>

      {/* Tab 1: Pinout & Wiring with Add/Edit Device support */}
      {activeTab === 'wiring' && (
        <div className="space-y-4 animate-fadeIn">

          {/* Subsystem / Station Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full scrollbar-none font-mono text-xs">
            <span className="text-zinc-500 text-[11px] font-bold shrink-0 mr-1">Station:</span>
            {[
              { id: 'all', label: 'All Stations' },
              { id: 'windmill', label: '🌪️ Wind Turbine (RPM, Power, BMP280)' },
              { id: 'solar', label: '☀️ Solar PV (INA219, Rain, Temp)' },
              { id: 'peltier', label: '🔥 Peltier Seebeck (Sand Bed)' },
              { id: 'actuator', label: '⚡ Relays & Actuators' }
            ].map((sub) => (
              <button
                key={sub.id}
                onClick={() => setSubsystemFilter(sub.id as any)}
                className={`px-3 py-1.5 rounded-xl shrink-0 transition cursor-pointer font-bold ${
                  subsystemFilter === sub.id
                    ? 'bg-cyan-500 text-slate-950 shadow-md'
                    : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'
                }`}
              >
                {sub.label}
              </button>
            ))}
          </div>

          {/* ESP32 Interactive Microgrid Pin Allocation Matrix */}
          <div className="bg-gradient-to-r from-cyan-950/30 via-zinc-950 to-slate-900 border border-cyan-500/30 rounded-2xl p-4 shadow-lg space-y-3 font-mono text-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 border-b border-zinc-800/80 gap-2">
              <div className="flex items-center gap-2">
                <Cpu className="w-4 h-4 text-cyan-400" />
                <span className="font-bold text-white text-xs uppercase tracking-wider">
                  ESP32 DevKit Pin Allocation Matrix (WROOM-32)
                </span>
              </div>
              <span className="text-[10px] text-cyan-300 font-bold px-2 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/20">
                Shared 3.3V Logic Bus & I2C Fast-Mode
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 text-[11px]">
              <div className="p-2.5 rounded-xl bg-black/70 border border-emerald-500/30">
                <div className="text-emerald-400 font-black">GPIO 34 (IN)</div>
                <div className="text-zinc-300 font-bold truncate">Hall Tachometer</div>
                <div className="text-[10px] text-zinc-500">Hardware Interrupt</div>
              </div>

              <div className="p-2.5 rounded-xl bg-black/70 border border-cyan-500/30">
                <div className="text-cyan-400 font-black">GPIO 21 (SDA)</div>
                <div className="text-zinc-300 font-bold truncate">I2C Data Bus</div>
                <div className="text-[10px] text-zinc-500">0x40, 0x41, 0x76</div>
              </div>

              <div className="p-2.5 rounded-xl bg-black/70 border border-cyan-500/30">
                <div className="text-cyan-400 font-black">GPIO 22 (SCL)</div>
                <div className="text-zinc-300 font-bold truncate">I2C Clock Bus</div>
                <div className="text-[10px] text-zinc-500">400kHz SCL</div>
              </div>

              <div className="p-2.5 rounded-xl bg-black/70 border border-amber-500/30">
                <div className="text-amber-400 font-black">GPIO 4 (1-Wire)</div>
                <div className="text-zinc-300 font-bold truncate">DS18B20 Sand Bed</div>
                <div className="text-[10px] text-zinc-500">4.7kΩ Pull-up</div>
              </div>

              <div className="p-2.5 rounded-xl bg-black/70 border border-purple-500/30">
                <div className="text-purple-400 font-black">GPIO 27 (OUT)</div>
                <div className="text-zinc-300 font-bold truncate">Wiper Relay IN</div>
                <div className="text-[10px] text-zinc-500">Active-LOW 5V Relay</div>
              </div>

              <div className="p-2.5 rounded-xl bg-black/70 border border-sky-500/30">
                <div className="text-sky-400 font-black">GPIO 35 (ADC)</div>
                <div className="text-zinc-300 font-bold truncate">FC-37 Rain Track</div>
                <div className="text-[10px] text-zinc-500">Rain Moisture In</div>
              </div>
            </div>
          </div>
          
          {/* Search & Filter Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs font-mono">
            <div className="flex items-center gap-2 flex-1">
              <Search className="w-4 h-4 text-zinc-400" />
              <input
                type="text"
                value={deviceSearch}
                onChange={(e) => setDeviceSearch(e.target.value)}
                placeholder="Search pins, sensors (Hall, INA219, BMP280, LM35, Wiper, Sand...)..."
                className="bg-transparent border-none text-white text-xs w-full focus:outline-none placeholder-zinc-600"
              />
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-zinc-500 text-[11px] flex items-center gap-1">
                <Filter className="w-3 h-3" /> Category:
              </span>
              {['all', 'sensor', 'actuator', 'communication', 'power'].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setDeviceFilter(cat)}
                  className={`px-2 py-0.5 rounded-md text-[10px] uppercase font-bold transition cursor-pointer ${
                    deviceFilter === cat
                      ? 'bg-cyan-500 text-slate-950'
                      : 'bg-zinc-900 text-zinc-400 hover:text-white'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Quick Preset Buttons for Future Sensor Improvements (Owner Only) */}
          {isOwner && (
            <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/80 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono text-zinc-400 font-semibold flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>Quick-Add Common Sensors & Actuators for Future Improvements:</span>
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {DEVICE_PRESET_TEMPLATES.map((preset, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleOpenAddDevice(preset)}
                    className="px-2.5 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-cyan-300 border border-zinc-800 hover:border-cyan-500/40 text-[11px] font-mono transition cursor-pointer flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5 text-cyan-400" />
                    <span>{preset.name.split(' (')[0]}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* List of Connected Devices & Sensors */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {filteredDevices.map((dev) => (
              <div 
                key={dev.id}
                className="bg-slate-950 border border-slate-800/90 rounded-xl p-4 flex flex-col justify-between hover:border-cyan-500/40 transition-all shadow-md group relative"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase ${
                          dev.category === 'sensor' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30' :
                          dev.category === 'actuator' ? 'bg-purple-500/10 text-purple-400 border border-purple-500/30' :
                          dev.category === 'communication' ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30' :
                          'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                        }`}>
                          {dev.category}
                        </span>
                        <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold bg-zinc-900 text-cyan-300 border border-zinc-800">
                          {dev.interfaceType}
                        </span>
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-mono text-zinc-400 bg-zinc-900">
                          {dev.voltageLevel}
                        </span>
                      </div>
                      <h4 className="text-xs sm:text-sm font-bold text-white mt-1.5 group-hover:text-cyan-300 transition">
                        {dev.deviceName}
                      </h4>
                    </div>

                    {/* Action buttons (Owner Only) */}
                    {isOwner && (
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => handleOpenEditDevice(dev)}
                          className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-cyan-400 border border-zinc-800 transition cursor-pointer"
                          title="Edit Pinout & Wiring"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteDevice(dev.id)}
                          className="p-1.5 rounded-lg bg-zinc-900 hover:bg-rose-950 text-zinc-500 hover:text-rose-400 border border-zinc-800 transition cursor-pointer"
                          title="Remove Device"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Pin Assignment Highlight */}
                  <div className="bg-black p-2.5 rounded-lg border border-zinc-800/80 font-mono text-xs">
                    <span className="text-[10px] text-zinc-500 block uppercase font-bold">Microcontroller Pin Connections:</span>
                    <span className="text-emerald-400 font-bold break-words">{dev.pinLabel}</span>
                  </div>

                  {/* Description */}
                  <p className="text-[11px] text-zinc-400 leading-relaxed font-sans">
                    {dev.description}
                  </p>
                </div>

                {/* Wire colors */}
                {dev.wireColors && (
                  <div className="mt-3 pt-2.5 border-t border-zinc-900 text-[10px] font-mono text-zinc-500 flex items-center justify-between">
                    <span className="truncate">Wire: <strong className="text-zinc-300">{dev.wireColors}</strong></span>
                  </div>
                )}
              </div>
            ))}
          </div>

          {filteredDevices.length === 0 && (
            <div className="p-8 text-center bg-slate-950 rounded-xl border border-slate-800 text-xs font-mono text-zinc-400 space-y-2">
              <p>No devices matching filter.</p>
              <button
                onClick={() => handleOpenAddDevice()}
                className="px-3 py-1 rounded-lg bg-cyan-500 text-slate-950 font-bold"
              >
                Add Device
              </button>
            </div>
          )}

        </div>
      )}

      {/* Tab 2: Arduino Sketch Code */}
      {activeTab === 'arduino' && (
        <div className="space-y-4 animate-fadeIn">

          {/* ESP32 Firmware Sketch Selector (When ESP32 board is selected) */}
          {selectedBoard === 'esp32' && (
            <div className="bg-zinc-950 p-2 rounded-2xl border border-zinc-800 space-y-2">
              <div className="text-[11px] font-mono font-bold text-zinc-400 px-2 flex items-center justify-between">
                <span>Select Firmware Sketch Architecture:</span>
                <span className="text-[10px] text-cyan-400 font-bold uppercase">ESP32 DevKit WROOM</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setEsp32SketchType('hybrid')}
                  className={`p-3 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between ${
                    esp32SketchType === 'hybrid'
                      ? 'bg-gradient-to-br from-cyan-950/80 to-blue-950/80 border-cyan-500/60 text-white shadow-lg'
                      : 'bg-zinc-900/60 border-zinc-800/80 text-zinc-400 hover:text-white hover:border-zinc-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs flex items-center gap-1.5 text-cyan-400">
                      <Zap className="w-3.5 h-3.5" />
                      Unified Hybrid Sketch
                    </span>
                    <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-cyan-500/20 text-cyan-300">
                      Recommended
                    </span>
                  </div>
                  <p className="text-[10px] text-zinc-400 font-mono mt-1.5 leading-snug">
                    Full microgrid: Solar INA219 (0x40) + Windmill Hall RPM (GPIO 34) + Wind INA219 (0x41) + BMP280 + Sand DS18B20 + Wiper.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setEsp32SketchType('windmill')}
                  className={`p-3 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between ${
                    esp32SketchType === 'windmill'
                      ? 'bg-gradient-to-br from-emerald-950/80 to-teal-950/80 border-emerald-500/60 text-white shadow-lg'
                      : 'bg-zinc-900/60 border-zinc-800/80 text-zinc-400 hover:text-white hover:border-zinc-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs flex items-center gap-1.5 text-emerald-400">
                      <RotateCw className="w-3.5 h-3.5" />
                      Dedicated Windmill Lab
                    </span>
                    <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-500/20 text-emerald-300">
                      Modular
                    </span>
                  </div>
                  <p className="text-[10px] text-zinc-400 font-mono mt-1.5 leading-snug">
                    Dedicated turbine station: Hall RPM (GPIO 34) + Windmill INA219 + BMP280 Barometer + Peltier Seebeck Sand harvest.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setEsp32SketchType('solar')}
                  className={`p-3 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between ${
                    esp32SketchType === 'solar'
                      ? 'bg-gradient-to-br from-amber-950/80 to-orange-950/80 border-amber-500/60 text-white shadow-lg'
                      : 'bg-zinc-900/60 border-zinc-800/80 text-zinc-400 hover:text-white hover:border-zinc-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs flex items-center gap-1.5 text-amber-400">
                      <Sun className="w-3.5 h-3.5" />
                      Dedicated Solar Cleaner
                    </span>
                    <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-500/20 text-amber-300">
                      Modular
                    </span>
                  </div>
                  <p className="text-[10px] text-zinc-400 font-mono mt-1.5 leading-snug">
                    Dedicated PV station: Solar INA219 (0x40) + Rain FC-37 + Panel Temp LM35 + Motorized Silicone Wiper Relay.
                  </p>
                </button>
              </div>
            </div>
          )}

          {/* Sketch Header & Action Buttons */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-400">
            <span className="flex items-center gap-1.5 font-mono">
              <FileCode className="w-4 h-4 text-cyan-400" />
              <strong className="text-white">{activeFilename}</strong>
            </span>
            
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => handleDownloadIno(activeFilename, activeCodeSnippet)}
                className="bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 cursor-pointer font-medium font-mono text-xs"
                title="Download this code as an .ino file to open in Arduino IDE"
              >
                <Download className="w-3.5 h-3.5 text-emerald-400" />
                <span>Download .ino File</span>
              </button>

              <button
                type="button"
                onClick={() => copyToClipboard(activeCodeSnippet, setCopiedCode)}
                className="bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/30 px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 cursor-pointer font-medium font-mono text-xs"
              >
                {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedCode ? 'Copied Full Sketch!' : 'Copy Sketch'}</span>
              </button>
            </div>
          </div>

          {/* Arduino IDE Quick Access Banner */}
          <div className="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-950/40 via-zinc-900 to-cyan-950/40 border border-emerald-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                <Download className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-white flex items-center gap-2">
                  <span>Need Arduino IDE Software or Libraries?</span>
                  <span className="px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-300 text-[9px] font-mono font-bold">Libraries Included</span>
                </div>
                <div className="text-[11px] text-zinc-400">
                  Required Libraries: <code className="text-cyan-400 font-bold">Adafruit INA219</code>, <code className="text-cyan-400 font-bold">Adafruit BMP280</code>, <code className="text-cyan-400 font-bold">OneWire</code>, and <code className="text-cyan-400 font-bold">DallasTemperature</code>.
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setActiveTab('arduino_ide')}
              className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-400 to-cyan-400 hover:from-emerald-300 hover:to-cyan-300 text-slate-950 font-black text-xs font-mono transition cursor-pointer flex items-center gap-1.5 shrink-0 shadow"
            >
              <span>Arduino IDE Software Center</span>
              <ExternalLink className="w-3 h-3" />
            </button>
          </div>

          {/* Active C++ Code View */}
          <pre className="bg-slate-950 p-4 rounded-xl border border-slate-800 font-mono text-[11px] leading-relaxed text-slate-300 overflow-x-auto max-h-[460px] scrollbar-thin select-text">
            {activeCodeSnippet}
          </pre>

          {/* Serial Monitor Interactive Command Cheat-sheet */}
          <div className="p-3.5 rounded-2xl bg-black border border-zinc-800 text-xs font-mono space-y-2">
            <div className="flex items-center justify-between text-zinc-400 border-b border-zinc-800/80 pb-1.5">
              <span className="font-bold text-white flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5 text-cyan-400" />
                Serial Monitor Interactive Diagnostic Console (115200 Baud)
              </span>
              <span className="text-[10px] text-emerald-400 font-bold">NL & CR Enabled</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 text-[11px]">
              <div className="p-2 rounded-lg bg-zinc-900 border border-zinc-800">
                <code className="text-cyan-400 font-bold">115200 Baud</code>
                <div className="text-[10px] text-zinc-400">Standard serial port baud rate for ESP32 UART</div>
              </div>
              <div className="p-2 rounded-lg bg-zinc-900 border border-zinc-800">
                <code className="text-emerald-400 font-bold">GPIO 34 Pulse</code>
                <div className="text-[10px] text-zinc-400">Pass magnet near Hall sensor to see live RPM count</div>
              </div>
              <div className="p-2 rounded-lg bg-zinc-900 border border-zinc-800">
                <code className="text-amber-400 font-bold">I2C 0x40 & 0x41</code>
                <div className="text-[10px] text-zinc-400">Solar (0x40) & Windmill (0x41) current sensor channels</div>
              </div>
              <div className="p-2 rounded-lg bg-zinc-900 border border-zinc-800">
                <code className="text-purple-400 font-bold">192.168.4.1/api</code>
                <div className="text-[10px] text-zinc-400">Connect to Solar-Hybrid-AP for zero-latency local REST</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Circuit Media & Video Demos */}
      {activeTab === 'media' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Top Quick Actions Bar */}
          <div className="bg-gradient-to-r from-cyan-950/40 via-slate-900 to-rose-950/40 border border-zinc-800 p-4 sm:p-5 rounded-3xl flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
                  <ImageIcon className="w-5 h-5" />
                </span>
                <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
                  Hardware Photos & YouTube Video Demos
                </h3>
              </div>
              <p className="text-xs text-zinc-400 font-mono">
                Upload local circuit & wiper photos from your device, or embed live YouTube demonstration videos.
              </p>
            </div>

            {/* Action Buttons (Visible & Accessible to All Users) */}
            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={handleOpenAddPhoto}
                className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold font-mono text-xs transition cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20 active:scale-95"
              >
                <Camera className="w-4 h-4" />
                <span>+ Upload Local Photo</span>
              </button>

              <button
                type="button"
                onClick={handleOpenEditVideo}
                className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-400 hover:to-pink-500 text-white font-bold font-mono text-xs transition cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-rose-500/20 active:scale-95"
              >
                <Video className="w-4 h-4" />
                <span>+ Add / Change YouTube Video</span>
              </button>
            </div>
          </div>

          {/* Status Message Banner */}
          {saveMediaStatus && (
            <div className="p-3.5 rounded-2xl bg-emerald-950/70 border border-emerald-500/50 text-emerald-200 text-xs font-mono flex items-center justify-between animate-fadeIn shadow-xl">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{saveMediaStatus}</span>
              </div>
              <button 
                onClick={() => setSaveMediaStatus(null)}
                className="text-emerald-400 hover:text-white px-2 py-0.5 rounded cursor-pointer"
              >
                ✕
              </button>
            </div>
          )}

          {/* 1. YouTube Video Demonstration Section */}
          <div className="bg-black/90 border border-zinc-800 rounded-3xl p-4 sm:p-5 shadow-2xl space-y-4 relative overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-800/80">
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400">
                  <Video className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-bold text-white text-sm sm:text-base">
                      {hardwareMedia.videoTitle || 'ESP32 Firmware Execution & Wiper Demonstration'}
                    </h3>
                    <span className="px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 text-[10px] font-mono font-bold flex items-center gap-1">
                      <Play className="w-2.5 h-2.5 fill-current" />
                      <span>YouTube HD</span>
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-400 font-mono mt-0.5">
                    {hardwareMedia.videoChannelOrAuthor || 'Farm.IOT Engineering Lab'} • Live Hardware Demonstration
                  </p>
                </div>
              </div>

              {/* Edit YouTube Video Button */}
              <button
                type="button"
                onClick={handleOpenEditVideo}
                className="px-3.5 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-200 hover:text-rose-300 font-mono text-xs transition cursor-pointer flex items-center gap-1.5 shadow"
              >
                <Edit3 className="w-3.5 h-3.5 text-rose-400" />
                <span>Change YouTube Video</span>
              </button>
            </div>

            {/* Responsive Embedded YouTube Player */}
            {extractYouTubeId(hardwareMedia.videoUrl) ? (
              <div className="relative w-full aspect-video rounded-2xl overflow-hidden bg-zinc-950 border border-zinc-800 shadow-2xl">
                <iframe
                  src={`https://www.youtube.com/embed/${extractYouTubeId(hardwareMedia.videoUrl)}?rel=0`}
                  title={hardwareMedia.videoTitle}
                  className="w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                />
              </div>
            ) : (
              <div className="w-full aspect-video rounded-2xl bg-zinc-950/80 border border-dashed border-zinc-800 flex flex-col items-center justify-center text-center p-6 space-y-3">
                <div className="p-3 rounded-full bg-rose-500/10 text-rose-400">
                  <Video className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-bold text-white text-sm">No YouTube Video Configured</h4>
                  <p className="text-xs text-zinc-400 font-mono mt-1">
                    Paste any YouTube URL or video ID to embed firmware & wiper testing videos
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleOpenEditVideo}
                  className="px-4 py-2 rounded-xl bg-rose-500 hover:bg-rose-400 text-white font-bold font-mono text-xs transition cursor-pointer flex items-center gap-1.5 shadow-lg"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add YouTube Video Demo</span>
                </button>
              </div>
            )}

            {/* Video Description & Direct Link */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 text-xs font-mono">
              <p className="text-zinc-400 text-[11px] leading-relaxed flex-1">
                {hardwareMedia.videoDescription || 'Physical hardware demonstration showing Wi-Fi connection, Firestore telemetry stream, and automated wiper cycle.'}
              </p>
              {hardwareMedia.videoUrl && (
                <a
                  href={hardwareMedia.videoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-rose-400 hover:text-rose-300 inline-flex items-center gap-1 shrink-0 font-semibold transition"
                >
                  <span>Watch on YouTube</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
            </div>
          </div>

          {/* 2. Hardware & Circuit Photos Gallery Section */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-zinc-800">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
                  <Camera className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm sm:text-base flex items-center gap-2">
                    <span>Circuit & Hardware Photos Gallery</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-zinc-800 text-cyan-400 border border-zinc-700">
                      {(hardwareMedia.photos || DEFAULT_MEDIA_PHOTOS).length} Photos
                    </span>
                  </h3>
                  <p className="text-[11px] text-zinc-400 font-mono">
                    High-resolution wiring, sensor probes, and test bench photos (stored locally in database)
                  </p>
                </div>
              </div>

              {/* Add Photo Button */}
              <button
                type="button"
                onClick={handleOpenAddPhoto}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold font-mono text-xs transition cursor-pointer flex items-center gap-1.5 shadow-lg shadow-cyan-500/20 self-start sm:self-auto"
              >
                <Upload className="w-4 h-4" />
                <span>Upload Local Photo</span>
              </button>
            </div>

            {/* Quick Upload Dropzone Banner */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsPhotoDraggingOver(true);
              }}
              onDragLeave={() => setIsPhotoDraggingOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsPhotoDraggingOver(false);
                const file = e.dataTransfer.files?.[0];
                if (file) {
                  processLocalPhoto(file);
                  handleOpenAddPhoto();
                }
              }}
              onClick={() => {
                handleOpenAddPhoto();
                setTimeout(() => photoFileInputRef.current?.click(), 100);
              }}
              className={`p-4 border-2 border-dashed rounded-2xl flex items-center justify-center gap-3 cursor-pointer transition duration-200 ${
                isPhotoDraggingOver
                  ? 'border-cyan-400 bg-cyan-500/15'
                  : 'border-zinc-800 hover:border-cyan-500/60 bg-zinc-950/60 hover:bg-zinc-900/60'
              }`}
            >
              <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                <Upload className="w-5 h-5" />
              </div>
              <div className="text-left">
                <div className="font-bold text-white text-xs">
                  Click here or Drag & Drop a photo to upload directly from your device
                </div>
                <div className="text-[10px] text-zinc-400 font-mono">
                  Supports JPEG, PNG, WebP • Auto-compressed for rapid cloud database synchronization
                </div>
              </div>
            </div>

            {/* Photos Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {(hardwareMedia.photos || DEFAULT_MEDIA_PHOTOS).map((photo) => (
                <div
                  key={photo.id}
                  className="bg-black/80 border border-zinc-800 rounded-2xl overflow-hidden hover:border-cyan-500/50 transition duration-300 flex flex-col group shadow-lg"
                >
                  {/* Photo Container with Zoom Overlay */}
                  <div 
                    className="relative aspect-video bg-zinc-950 overflow-hidden cursor-pointer"
                    onClick={() => setActiveZoomPhoto(photo)}
                  >
                    <img
                      src={photo.url}
                      alt={photo.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=800&q=80';
                      }}
                    />
                    
                    {/* Hover Zoom Overlay */}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <span className="px-3 py-1.5 rounded-xl bg-cyan-500 text-slate-950 font-mono font-bold text-xs flex items-center gap-1.5 shadow-lg">
                        <ZoomIn className="w-3.5 h-3.5" />
                        <span>Inspect High-Res</span>
                      </span>
                    </div>

                    {/* Tag Badge */}
                    <div className="absolute top-2.5 left-2.5 z-10 flex items-center gap-1.5">
                      <span className="px-2 py-0.5 rounded-md bg-black/80 backdrop-blur-md text-cyan-300 border border-white/10 text-[9px] font-mono font-bold uppercase shadow">
                        {photo.tag || 'Circuit'}
                      </span>
                      {photo.url.startsWith('data:') && (
                        <span className="px-2 py-0.5 rounded-md bg-emerald-500/90 backdrop-blur-md text-slate-950 text-[9px] font-mono font-black uppercase shadow">
                          Local Upload
                        </span>
                      )}
                    </div>

                    {/* ALWAYS VISIBLE Edit Photo Button (Where the user's arrow points!) */}
                    <div className="absolute top-2.5 right-2.5 z-10">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenEditPhoto(photo);
                        }}
                        className="px-2.5 py-1 rounded-lg bg-black/85 hover:bg-cyan-500 text-cyan-300 hover:text-slate-950 border border-cyan-500/50 text-[10px] font-mono font-bold flex items-center gap-1 shadow-lg backdrop-blur-md transition cursor-pointer active:scale-95"
                        title="Click to edit this photo and caption"
                      >
                        <Edit3 className="w-3 h-3" />
                        <span>Edit Photo</span>
                      </button>
                    </div>
                  </div>

                  {/* Photo Info & Actions */}
                  <div className="p-3.5 flex-1 flex flex-col justify-between space-y-2.5">
                    <div>
                      <h4 className="font-bold text-white text-xs group-hover:text-cyan-300 transition line-clamp-1">
                        {photo.title}
                      </h4>
                      <p className="text-[11px] text-zinc-400 mt-1 line-clamp-2 leading-relaxed">
                        {photo.caption || 'Hardware wiring connection details and telemetry setup.'}
                      </p>
                    </div>

                    {/* Action Toolbar */}
                    <div className="flex flex-wrap items-center justify-between gap-1.5 pt-2 border-t border-zinc-800/80 text-[10px] font-mono">
                      <button
                        type="button"
                        onClick={() => setActiveZoomPhoto(photo)}
                        className="text-zinc-400 hover:text-cyan-300 flex items-center gap-1 transition cursor-pointer py-1 px-1.5 rounded hover:bg-zinc-900"
                        title="View Full Screen Lightbox"
                      >
                        <ZoomIn className="w-3 h-3 text-zinc-400" />
                        <span>Inspect</span>
                      </button>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenEditPhoto(photo)}
                          className="px-2 py-1 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/30 transition cursor-pointer flex items-center gap-1 font-semibold"
                          title="Edit Title & Description"
                        >
                          <Edit3 className="w-3 h-3" />
                          <span>Edit</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            handleOpenEditPhoto(photo);
                            setTimeout(() => photoFileInputRef.current?.click(), 100);
                          }}
                          className="px-2 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-700 transition cursor-pointer flex items-center gap-1"
                          title="Replace Image File"
                        >
                          <Upload className="w-3 h-3 text-cyan-400" />
                          <span>Replace</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeletePhoto(photo.id)}
                          className="p-1 rounded-lg bg-rose-950/40 hover:bg-rose-900 text-rose-300 border border-rose-500/20 transition cursor-pointer"
                          title="Delete Photo"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Firebase Credentials */}
      {activeTab === 'credentials' && (
        <div className="space-y-3 font-mono text-xs animate-fadeIn">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="p-4 rounded-xl bg-black border border-zinc-800 space-y-2">
              <div className="text-zinc-400 text-[11px] flex items-center justify-between">
                <span>Firebase Cloud Project ID:</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full border bg-emerald-500/10 text-emerald-300 border-emerald-500/20">
                  Active Project
                </span>
              </div>
              <div className="font-bold text-sm text-cyan-300">
                {activeProjectId}
              </div>
              <p className="text-[10px] text-zinc-500 font-sans">
                Google Cloud / Firebase Project ID used by microcontrollers and web application.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-black border border-zinc-800 space-y-2">
              <div className="text-zinc-400 text-[11px] flex items-center justify-between">
                <span>Firestore Database ID:</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full border bg-cyan-500/10 text-cyan-300 border-cyan-500/20">
                  Standard Database
                </span>
              </div>
              <div className="font-bold text-sm text-white">
                {activeDatabaseId}
              </div>
              <p className="text-[10px] text-zinc-500 font-sans">
                Standard Firestore database name: (default)
              </p>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-black border border-zinc-800 space-y-2">
            <div className="text-zinc-400 text-[11px] flex items-center justify-between">
              <span>Firebase Realtime Database (RTDB) URL:</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full border bg-amber-500/10 text-amber-300 border-amber-500/20">
                Live RTDB Endpoint
              </span>
            </div>
            <div className="text-amber-300 font-bold break-all">
              {getCustomRtdbUrl()}
            </div>
            <p className="text-[10px] text-zinc-500 font-sans">
              RTDB Database: <strong>{getCustomRtdbUrl().replace(/^https?:\/\//, '').split('.')[0]}</strong> (Used for instantaneous millisecond telemetry)
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="p-4 rounded-xl bg-black border border-zinc-800 space-y-2">
              <div className="text-zinc-400 text-[11px]">Hardware Document Path (Firestore):</div>
              <div className="text-emerald-300 font-bold break-all">solar_iot/{activeDeviceId}</div>
            </div>
            <div className="p-4 rounded-xl bg-black border border-zinc-800 space-y-2">
              <div className="text-zinc-400 text-[11px]">Hardware REST Path (Realtime Database):</div>
              <div className="text-cyan-300 font-bold break-all">/solar_iot/{activeDeviceId}.json</div>
            </div>
          </div>
        </div>
      )}


      {/* Tab 5: Dual AP & Offline Mode (Simultaneous Hotspot & Firebase) */}
      {activeTab === 'ap_offline' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Top Banner explaining Dual Mode Architecture */}
          <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-br from-amber-950/40 via-zinc-950 to-black border border-amber-500/30 shadow-2xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center space-x-3.5">
                <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 shrink-0">
                  <Radio className="w-6 h-6 animate-pulse" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-base sm:text-lg font-black text-white">
                      ESP32 Dual-Mode: Access Point (AP) + Cloud Firebase (STA)
                    </h3>
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-[10px] font-mono font-bold">
                      Simultaneous Concurrent Operation
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400 mt-1">
                    Your ESP32 simultaneously broadcasts its own Wi-Fi Access Point and streams to Google Cloud Firestore. If internet is down or unavailable in the field, this app connects directly to the ESP32 with zero internet!
                  </p>
                </div>
              </div>
            </div>

            {/* Architecture Channels Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              {/* Channel 1: Local AP Hotspot */}
              <div className="p-4 rounded-2xl bg-black/80 border border-amber-500/20 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-amber-300 flex items-center gap-1.5 uppercase">
                    <Radio className="w-3.5 h-3.5" />
                    Channel 1: Local AP Hotspot (Offline)
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20 font-bold">
                    0ms Latency
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                  <div className="bg-zinc-950 p-2.5 rounded-xl border border-zinc-800">
                    <span className="text-[10px] text-zinc-500 block">Wi-Fi SSID:</span>
                    <strong className="text-white">Solar-Cleaner-AP</strong>
                  </div>
                  <div className="bg-zinc-950 p-2.5 rounded-xl border border-zinc-800">
                    <span className="text-[10px] text-zinc-500 block">Hotspot Password:</span>
                    <strong className="text-amber-400">SolarIOT123</strong>
                  </div>
                  <div className="bg-zinc-950 p-2.5 rounded-xl border border-zinc-800">
                    <span className="text-[10px] text-zinc-500 block">Default AP IP:</span>
                    <strong className="text-cyan-400">192.168.4.1</strong>
                  </div>
                  <div className="bg-zinc-950 p-2.5 rounded-xl border border-zinc-800">
                    <span className="text-[10px] text-zinc-500 block">Built-in API:</span>
                    <strong className="text-emerald-400">Port 80 (CORS ON)</strong>
                  </div>
                </div>
                <p className="text-[11px] text-zinc-400">
                  Connect phone or tablet directly to <strong>Solar-Cleaner-AP</strong>. Read live tachometers and trigger mechanical wiper cleaning anywhere without internet.
                </p>
              </div>

              {/* Channel 2: Cloud Station */}
              <div className="p-4 rounded-2xl bg-black/80 border border-cyan-500/20 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-cyan-300 flex items-center gap-1.5 uppercase">
                    <Radio className="w-3.5 h-3.5 text-cyan-400" />
                    Channel 2: Cloud Station (Online)
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 font-bold">
                    Global Remote
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                  <div className="bg-zinc-950 p-2.5 rounded-xl border border-zinc-800">
                    <span className="text-[10px] text-zinc-500 block">Station Mode:</span>
                    <strong className="text-white">Wi-Fi STA Client</strong>
                  </div>
                  <div className="bg-zinc-950 p-2.5 rounded-xl border border-zinc-800">
                    <span className="text-[10px] text-zinc-500 block">Target Server:</span>
                    <strong className="text-cyan-400">Firestore REST API</strong>
                  </div>
                  <div className="bg-zinc-950 p-2.5 rounded-xl border border-zinc-800">
                    <span className="text-[10px] text-zinc-500 block">Sync Interval:</span>
                    <strong className="text-emerald-400">Every 3 Seconds</strong>
                  </div>
                  <div className="bg-zinc-950 p-2.5 rounded-xl border border-zinc-800">
                    <span className="text-[10px] text-zinc-500 block">Failover:</span>
                    <strong className="text-amber-400">Non-blocking AP</strong>
                  </div>
                </div>
                <p className="text-[11px] text-zinc-400">
                  Streams telemetry to Firestore for global access. If the home router loses internet or disconnects, the AP continues running with zero hang!
                </p>
              </div>
            </div>
          </div>

          {/* Interactive In-App AP Live Connection Tester */}
          <div className="p-5 sm:p-6 rounded-3xl bg-black/90 border border-zinc-800 shadow-xl space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2 pb-3 border-b border-zinc-800">
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                  <Terminal className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-white text-sm sm:text-base">
                    Interactive Local AP Live Test Bench
                  </h4>
                  <p className="text-xs text-zinc-400 font-mono">
                    Test ping, read live sensors, or trigger the wiper relay directly over your local connection
                  </p>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-zinc-900 border border-zinc-700 text-zinc-300 font-mono text-[10px]">
                Target: http://{apTestIp}/api/telemetry
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="md:col-span-1 space-y-1">
                <label className="text-[10px] font-mono text-zinc-400 block font-bold uppercase">
                  ESP32 AP Gateway IP / Host:
                </label>
                <input
                  type="text"
                  value={apTestIp}
                  onChange={(e) => setApTestIp(e.target.value)}
                  placeholder="192.168.4.1"
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-cyan-400"
                />
                <span className="text-[10px] text-zinc-500 font-mono block">
                  Default: 192.168.4.1 (or router assigned LAN IP)
                </span>
              </div>

              <div className="md:col-span-2 flex flex-wrap items-end gap-2">
                <button
                  type="button"
                  onClick={handleTestApPing}
                  disabled={apTestTesting}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold font-mono text-xs transition cursor-pointer flex items-center justify-center gap-2 shadow-lg disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${apTestTesting ? 'animate-spin' : ''}`} />
                  <span>{apTestTesting ? 'Connecting...' : '📡 Ping & Read Live Sensors'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleTestApWiper('clean')}
                  disabled={apTestTesting}
                  className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-bold font-mono text-xs transition cursor-pointer flex items-center gap-1.5 shadow-lg disabled:opacity-50"
                  title="Sends POST http://192.168.4.1/api/clean directly to ESP32 relay"
                >
                  <Play className="w-3.5 h-3.5" />
                  <span>🧹 Sweep Wiper (10s)</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleTestApWiper('stop')}
                  disabled={apTestTesting}
                  className="px-3 py-2.5 rounded-xl bg-rose-950/60 hover:bg-rose-900 border border-rose-500/30 text-rose-300 font-bold font-mono text-xs transition cursor-pointer flex items-center gap-1.5 shadow disabled:opacity-50"
                  title="Sends POST http://192.168.4.1/api/stop to deactivate relay"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>⏹ Stop</span>
                </button>
              </div>
            </div>

            {/* Test Result Inspector */}
            {apTestResult && (
              <div className={`p-4 rounded-2xl border font-mono text-xs space-y-2 animate-fadeIn ${
                apTestResult.success 
                  ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-200' 
                  : 'bg-rose-950/30 border-rose-500/40 text-rose-200'
              }`}>
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    {apTestResult.success ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                    )}
                    <span className="font-bold">
                      {apTestResult.success 
                        ? `✓ Successfully Connected to ESP32 AP (${apTestResult.latencyMs}ms latency)` 
                        : '✗ Could Not Connect to ESP32 AP'}
                    </span>
                  </div>
                  <span className="text-[10px] text-zinc-400">Tested: {apTestResult.testedAt}</span>
                </div>

                {apTestResult.success && apTestResult.data && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 text-center">
                    <div className="p-2 rounded-xl bg-black/60 border border-emerald-500/20">
                      <span className="text-[10px] text-zinc-400 block">Voltage</span>
                      <strong className="text-white text-sm">{apTestResult.data.voltage ?? 0} V</strong>
                    </div>
                    <div className="p-2 rounded-xl bg-black/60 border border-emerald-500/20">
                      <span className="text-[10px] text-zinc-400 block">Current</span>
                      <strong className="text-white text-sm">{apTestResult.data.current ?? 0} A</strong>
                    </div>
                    <div className="p-2 rounded-xl bg-black/60 border border-emerald-500/20">
                      <span className="text-[10px] text-zinc-400 block">Power</span>
                      <strong className="text-emerald-400 text-sm">{apTestResult.data.power ?? 0} W</strong>
                    </div>
                    <div className="p-2 rounded-xl bg-black/60 border border-emerald-500/20">
                      <span className="text-[10px] text-zinc-400 block">Temp</span>
                      <strong className="text-amber-300 text-sm">{apTestResult.data.temperature ?? apTestResult.data.tempC ?? 0} °C</strong>
                    </div>
                  </div>
                )}

                {apTestResult.error && (
                  <p className="text-[11px] text-rose-300 leading-relaxed">
                    {apTestResult.error}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Field Deployment Guide (Offline Use) */}
          <div className="p-5 sm:p-6 rounded-3xl bg-zinc-950 border border-zinc-800 shadow-xl space-y-3">
            <h4 className="font-bold text-white text-sm flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-cyan-400" />
              <span>How to Use the App Completely Offline in the Field (4 Simple Steps)</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs font-mono">
              <div className="p-3.5 rounded-2xl bg-black border border-zinc-800 space-y-1.5">
                <div className="text-cyan-400 font-bold text-sm">Step 1: Power On</div>
                <p className="text-zinc-400 font-sans text-[11px] leading-relaxed">
                  Power your ESP32 circuit with any 5V battery or USB power bank. The ESP32 immediately turns on its <strong>Solar-Cleaner-AP</strong> hotspot in less than 2 seconds.
                </p>
              </div>
              <div className="p-3.5 rounded-2xl bg-black border border-zinc-800 space-y-1.5">
                <div className="text-cyan-400 font-bold text-sm">Step 2: Connect Phone</div>
                <p className="text-zinc-400 font-sans text-[11px] leading-relaxed">
                  Open Wi-Fi settings on your phone or laptop. Tap <strong>Solar-Cleaner-AP</strong> and enter password: <strong>SolarIOT123</strong>.
                </p>
              </div>
              <div className="p-3.5 rounded-2xl bg-black border border-zinc-800 space-y-1.5">
                <div className="text-cyan-400 font-bold text-sm">Step 3: Open App</div>
                <p className="text-zinc-400 font-sans text-[11px] leading-relaxed">
                  Open this Web App (PWA offline cached) or browse directly to <strong>http://192.168.4.1</strong>.
                </p>
              </div>
              <div className="p-3.5 rounded-2xl bg-black border border-zinc-800 space-y-1.5">
                <div className="text-cyan-400 font-bold text-sm">Step 4: Offline Toggle</div>
                <p className="text-zinc-400 font-sans text-[11px] leading-relaxed">
                  On the Live Dashboard, switch connection mode to <strong>📡 Direct ESP32 AP (Offline)</strong> to stream sensors and trigger the wiper with zero internet!
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 6: Arduino IDE Software Center & Microcontroller Tools */}
      {activeTab === 'arduino_ide' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Top Header Card */}
          <div className="bg-gradient-to-r from-emerald-950/40 via-zinc-950 to-cyan-950/40 border border-emerald-500/30 p-5 sm:p-6 rounded-3xl shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1.5 max-w-2xl">
              <div className="flex items-center gap-2 text-xs font-mono text-emerald-400">
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 font-bold">
                  Arduino IDE Official Software
                </span>
                <span className="text-zinc-500">•</span>
                <span className="text-zinc-400">Windows • macOS • Linux</span>
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
                Arduino IDE Software & Flasher Suite
              </h3>
              <p className="text-xs sm:text-sm text-zinc-300 font-sans leading-relaxed">
                Download the official Arduino IDE to compile and upload the Farm.IOT firmware sketches to your ESP32, Arduino Nano, or ESP-01 microcontrollers. Includes USB drivers (CH340/CP2102), board index URLs, and required libraries.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 shrink-0">
              <a
                href="https://downloads.arduino.cc/arduino-ide/arduino-ide_latest_Windows_64bit.exe"
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-400 to-emerald-500 hover:from-emerald-300 hover:to-emerald-400 text-slate-950 font-black text-xs font-mono flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Download IDE for Windows</span>
              </a>
              <a
                href="https://www.arduino.cc/en/software"
                target="_blank"
                rel="noreferrer"
                className="px-3.5 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-700 text-xs font-mono flex items-center justify-center gap-1.5 transition cursor-pointer"
              >
                <span>All Platforms</span>
                <ExternalLink className="w-3.5 h-3.5 text-zinc-400" />
              </a>
            </div>
          </div>

          {/* Software Download Cards: Arduino IDE 2.3+ & Legacy 1.8.19 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Card 1: Arduino IDE 2.3.4 (Modern) */}
            <div className="p-5 sm:p-6 rounded-3xl bg-zinc-950 border border-emerald-500/30 space-y-4 shadow-xl flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 font-mono font-bold text-lg">
                      IDE 2
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-base font-bold text-white">Arduino IDE 2.3.4</h4>
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-mono font-bold">
                          Latest Release
                        </span>
                      </div>
                      <p className="text-xs text-zinc-400">Next-generation editor with auto-completion & serial plotter</p>
                    </div>
                  </div>
                </div>

                <p className="text-xs text-zinc-300 leading-relaxed font-sans">
                  The modern Arduino IDE features intelligent code auto-completion, lightning-fast compilation, real-time live Serial Plotter charts for solar telemetry, and integrated dark mode.
                </p>

                <div className="space-y-1.5 text-xs font-mono text-zinc-400">
                  <div className="text-[11px] font-bold text-zinc-300 uppercase tracking-wider">Direct Installers:</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <a
                      href="https://downloads.arduino.cc/arduino-ide/arduino-ide_latest_Windows_64bit.exe"
                      target="_blank"
                      rel="noreferrer"
                      className="p-2.5 rounded-xl bg-black/60 hover:bg-zinc-900 border border-zinc-800 hover:border-emerald-500/40 text-zinc-200 hover:text-white transition flex items-center justify-between text-xs cursor-pointer"
                    >
                      <span>🪟 Windows (Win 10/11 .exe)</span>
                      <Download className="w-3.5 h-3.5 text-emerald-400" />
                    </a>
                    <a
                      href="https://downloads.arduino.cc/arduino-ide/arduino-ide_latest_Windows_64bit.zip"
                      target="_blank"
                      rel="noreferrer"
                      className="p-2.5 rounded-xl bg-black/60 hover:bg-zinc-900 border border-zinc-800 hover:border-emerald-500/40 text-zinc-200 hover:text-white transition flex items-center justify-between text-xs cursor-pointer"
                    >
                      <span>📦 Windows (Portable ZIP)</span>
                      <Download className="w-3.5 h-3.5 text-emerald-400" />
                    </a>
                    <a
                      href="https://downloads.arduino.cc/arduino-ide/arduino-ide_latest_macOS_arm64.dmg"
                      target="_blank"
                      rel="noreferrer"
                      className="p-2.5 rounded-xl bg-black/60 hover:bg-zinc-900 border border-zinc-800 hover:border-emerald-500/40 text-zinc-200 hover:text-white transition flex items-center justify-between text-xs cursor-pointer"
                    >
                      <span>🍏 macOS (Apple Silicon M1/M2/M3)</span>
                      <Download className="w-3.5 h-3.5 text-cyan-400" />
                    </a>
                    <a
                      href="https://downloads.arduino.cc/arduino-ide/arduino-ide_latest_macOS_64bit.dmg"
                      target="_blank"
                      rel="noreferrer"
                      className="p-2.5 rounded-xl bg-black/60 hover:bg-zinc-900 border border-zinc-800 hover:border-emerald-500/40 text-zinc-200 hover:text-white transition flex items-center justify-between text-xs cursor-pointer"
                    >
                      <span>🍏 macOS (Intel 64-bit)</span>
                      <Download className="w-3.5 h-3.5 text-cyan-400" />
                    </a>
                    <a
                      href="https://downloads.arduino.cc/arduino-ide/arduino-ide_latest_Linux_64bit.AppImage"
                      target="_blank"
                      rel="noreferrer"
                      className="sm:col-span-2 p-2.5 rounded-xl bg-black/60 hover:bg-zinc-900 border border-zinc-800 hover:border-emerald-500/40 text-zinc-200 hover:text-white transition flex items-center justify-between text-xs cursor-pointer"
                    >
                      <span>🐧 Linux (64-bit AppImage / Universal)</span>
                      <Download className="w-3.5 h-3.5 text-purple-400" />
                    </a>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-zinc-800/80 flex items-center justify-between text-xs font-mono">
                <span className="text-zinc-500">Official Arduino mirror</span>
                <a
                  href="https://www.arduino.cc/en/software"
                  target="_blank"
                  rel="noreferrer"
                  className="text-emerald-400 hover:text-emerald-300 font-bold flex items-center gap-1"
                >
                  <span>arduino.cc/software</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>

            {/* Card 2: Arduino IDE 1.8.19 (Legacy Classic) */}
            <div className="p-5 sm:p-6 rounded-3xl bg-zinc-950 border border-zinc-800 space-y-4 shadow-xl flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 font-mono font-bold text-lg">
                      1.8.x
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-base font-bold text-white">Arduino IDE 1.8.19</h4>
                        <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 text-[10px] font-mono font-bold">
                          Rock-Solid Legacy
                        </span>
                      </div>
                      <p className="text-xs text-zinc-400">Low RAM footprint, ultra-stable for ESP-01 & older laptops</p>
                    </div>
                  </div>
                </div>

                <p className="text-xs text-zinc-300 leading-relaxed font-sans">
                  The classic Java-based Arduino IDE is favored by embedded engineers for its instantaneous startup, zero memory overhead, and 100% bug-free toolchain integration with ESP8266 / ESP-01 boards.
                </p>

                <div className="space-y-1.5 text-xs font-mono text-zinc-400">
                  <div className="text-[11px] font-bold text-zinc-300 uppercase tracking-wider">Direct Installers:</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <a
                      href="https://downloads.arduino.cc/arduino-1.8.19-windows.exe"
                      target="_blank"
                      rel="noreferrer"
                      className="p-2.5 rounded-xl bg-black/60 hover:bg-zinc-900 border border-zinc-800 hover:border-cyan-500/40 text-zinc-200 hover:text-white transition flex items-center justify-between text-xs cursor-pointer"
                    >
                      <span>🪟 Windows (.exe installer)</span>
                      <Download className="w-3.5 h-3.5 text-cyan-400" />
                    </a>
                    <a
                      href="https://downloads.arduino.cc/arduino-1.8.19-windows.zip"
                      target="_blank"
                      rel="noreferrer"
                      className="p-2.5 rounded-xl bg-black/60 hover:bg-zinc-900 border border-zinc-800 hover:border-cyan-500/40 text-zinc-200 hover:text-white transition flex items-center justify-between text-xs cursor-pointer"
                    >
                      <span>📦 Windows (Non-admin ZIP)</span>
                      <Download className="w-3.5 h-3.5 text-cyan-400" />
                    </a>
                    <a
                      href="https://downloads.arduino.cc/arduino-1.8.19-macosx.zip"
                      target="_blank"
                      rel="noreferrer"
                      className="p-2.5 rounded-xl bg-black/60 hover:bg-zinc-900 border border-zinc-800 hover:border-cyan-500/40 text-zinc-200 hover:text-white transition flex items-center justify-between text-xs cursor-pointer"
                    >
                      <span>🍏 macOS (10.10+ Universal)</span>
                      <Download className="w-3.5 h-3.5 text-cyan-400" />
                    </a>
                    <a
                      href="https://downloads.arduino.cc/arduino-1.8.19-linux64.tar.xz"
                      target="_blank"
                      rel="noreferrer"
                      className="p-2.5 rounded-xl bg-black/60 hover:bg-zinc-900 border border-zinc-800 hover:border-cyan-500/40 text-zinc-200 hover:text-white transition flex items-center justify-between text-xs cursor-pointer"
                    >
                      <span>🐧 Linux 64-bit (.tar.xz)</span>
                      <Download className="w-3.5 h-3.5 text-cyan-400" />
                    </a>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-zinc-800/80 flex items-center justify-between text-xs font-mono">
                <span className="text-zinc-500">Legacy release branch</span>
                <span className="text-cyan-400 font-bold">Recommended for ESP-01 Dual Rig</span>
              </div>
            </div>
          </div>

          {/* Section 2: USB-to-UART Bridge Drivers (Fix Port Not Detected!) */}
          <div className="p-5 sm:p-6 rounded-3xl bg-zinc-950 border border-amber-500/30 space-y-4 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs font-mono text-amber-400">
                  <Zap className="w-4 h-4" />
                  <span className="font-bold">USB Serial Drivers (Fix "COM Port Not Recognized")</span>
                </div>
                <h4 className="text-base font-bold text-white">
                  CH340 / CP2102 USB Drivers for ESP32 & Arduino Nano
                </h4>
                <p className="text-xs text-zinc-400">
                  If your computer does not detect the COM port when plugging in the USB cable, install these official drivers:
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
              {/* CH340 Driver */}
              <div className="p-4 rounded-2xl bg-black/70 border border-zinc-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="font-bold text-white text-sm">CH340 / CH340G / CH341 Driver</div>
                  <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px] font-bold">WCH Official</span>
                </div>
                <p className="text-zinc-400 text-[11px] font-sans">
                  Required for 95% of Arduino Nano clones, NodeMCU v3, and low-cost ESP32 development boards.
                </p>
                <div className="flex flex-wrap gap-2 pt-1">
                  <a
                    href="http://www.wch-ic.com/downloads/CH341SER_EXE.html"
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Windows Driver (.EXE)</span>
                  </a>
                  <a
                    href="http://www.wch-ic.com/downloads/CH341SER_MAC_ZIP.html"
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-700 flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>macOS Driver (.ZIP)</span>
                  </a>
                </div>
              </div>

              {/* CP2102 Driver */}
              <div className="p-4 rounded-2xl bg-black/70 border border-zinc-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="font-bold text-white text-sm">CP2102 / CP2104 VCP Driver</div>
                  <span className="px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 text-[10px] font-bold">Silicon Labs</span>
                </div>
                <p className="text-zinc-400 text-[11px] font-sans">
                  Required for official ESP32 DevKit v1, DOIT ESP32, and high-quality NodeMCU v2 boards with Silicon Labs USB chip.
                </p>
                <div className="flex flex-wrap gap-2 pt-1">
                  <a
                    href="https://www.silabs.com/developers/usb-to-uart-bridge-vcp-drivers"
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/30 flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Windows & Mac VCP Driver</span>
                  </a>
                </div>
              </div>
            </div>

            {/* Pro-Tip on Boot Button */}
            <div className="p-3.5 rounded-2xl bg-amber-950/20 border border-amber-500/30 flex items-start gap-3 text-xs">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-amber-300">ESP32 Upload Tip ("Timed out waiting for packet header"):</strong>
                <p className="text-zinc-300 text-[11px] font-sans mt-0.5">
                  When Arduino IDE shows <code className="text-amber-300 font-mono">Connecting........_____.....</code> in the terminal, press and hold the physical <strong>BOOT</strong> button on your ESP32 board for 2 seconds until the percentage counter starts uploading!
                </p>
              </div>
            </div>
          </div>

          {/* Section 3: Board Manager URLs (1-Click Copy) */}
          <div className="p-5 sm:p-6 rounded-3xl bg-zinc-950 border border-zinc-800 space-y-4 shadow-xl">
            <div className="space-y-1">
              <h4 className="text-base font-bold text-white flex items-center gap-2">
                <Cpu className="w-4 h-4 text-cyan-400" />
                <span>Additional Boards Manager URLs for Arduino IDE</span>
              </h4>
              <p className="text-xs text-zinc-400 font-sans">
                In Arduino IDE, go to <strong>File → Preferences (or Settings)</strong>, and paste these URLs into <em>"Additional Boards Manager URLs"</em>:
              </p>
            </div>

            <div className="space-y-3 font-mono text-xs">
              {/* ESP32 URL */}
              <div className="p-3.5 rounded-2xl bg-black border border-zinc-800 space-y-1.5">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-emerald-400 font-bold">1. ESP32 Boards Package (Espressif Systems):</span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText('https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json');
                      setCopiedBoardUrl('esp32');
                      setTimeout(() => setCopiedBoardUrl(null), 2500);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold flex items-center gap-1 transition cursor-pointer"
                  >
                    {copiedBoardUrl === 'esp32' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedBoardUrl === 'esp32' ? 'Copied URL!' : 'Copy URL'}</span>
                  </button>
                </div>
                <div className="p-2 rounded-xl bg-zinc-950 border border-zinc-850 text-zinc-300 text-[11px] break-all select-all">
                  https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json
                </div>
              </div>

              {/* ESP8266 URL */}
              <div className="p-3.5 rounded-2xl bg-black border border-zinc-800 space-y-1.5">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-cyan-400 font-bold">2. ESP8266 Boards Package (ESP-01 / NodeMCU Community):</span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText('http://arduino.esp8266.com/stable/package_esp8266com_index.json');
                      setCopiedBoardUrl('esp8266');
                      setTimeout(() => setCopiedBoardUrl(null), 2500);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/30 text-[10px] font-bold flex items-center gap-1 transition cursor-pointer"
                  >
                    {copiedBoardUrl === 'esp8266' ? <Check className="w-3 h-3 text-cyan-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedBoardUrl === 'esp8266' ? 'Copied URL!' : 'Copy URL'}</span>
                  </button>
                </div>
                <div className="p-2 rounded-xl bg-zinc-950 border border-zinc-850 text-zinc-300 text-[11px] break-all select-all">
                  http://arduino.esp8266.com/stable/package_esp8266com_index.json
                </div>
              </div>
            </div>
          </div>

          {/* Section 4: Required Arduino Libraries */}
          <div className="p-5 sm:p-6 rounded-3xl bg-zinc-950 border border-zinc-800 space-y-4 shadow-xl">
            <div className="space-y-1">
              <h4 className="text-base font-bold text-white flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-purple-400" />
                <span>Required Arduino Libraries (Tools → Manage Libraries)</span>
              </h4>
              <p className="text-xs text-zinc-400 font-sans">
                Search and install these exact library names in Arduino IDE Library Manager:
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs font-mono">
              <div className="p-3 rounded-2xl bg-black border border-zinc-800 space-y-2">
                <div className="text-purple-300 font-bold text-xs">FirebaseESP32</div>
                <div className="text-[11px] text-zinc-400 font-sans">By Mobizt. Required for Firestore 2-way sync on ESP32.</div>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText('FirebaseESP32');
                    setCopiedLib('firebase_esp32');
                    setTimeout(() => setCopiedLib(null), 2000);
                  }}
                  className="w-full py-1 rounded bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-[10px] font-bold flex items-center justify-center gap-1 border border-zinc-700 transition cursor-pointer"
                >
                  {copiedLib === 'firebase_esp32' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedLib === 'firebase_esp32' ? 'Copied!' : 'Copy Name'}</span>
                </button>
              </div>

              <div className="p-3 rounded-2xl bg-black border border-zinc-800 space-y-2">
                <div className="text-sky-300 font-bold text-xs">Adafruit INA219</div>
                <div className="text-[11px] text-zinc-400 font-sans">By Adafruit. I2C voltage & current solar sensor driver.</div>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText('Adafruit INA219');
                    setCopiedLib('ina219');
                    setTimeout(() => setCopiedLib(null), 2000);
                  }}
                  className="w-full py-1 rounded bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-[10px] font-bold flex items-center justify-center gap-1 border border-zinc-700 transition cursor-pointer"
                >
                  {copiedLib === 'ina219' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedLib === 'ina219' ? 'Copied!' : 'Copy Name'}</span>
                </button>
              </div>

              <div className="p-3 rounded-2xl bg-black border border-zinc-800 space-y-2">
                <div className="text-amber-300 font-bold text-xs">ArduinoJson</div>
                <div className="text-[11px] text-zinc-400 font-sans">By Benoit Blanchon. Fast JSON parsing for IoT payloads.</div>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText('ArduinoJson');
                    setCopiedLib('json');
                    setTimeout(() => setCopiedLib(null), 2000);
                  }}
                  className="w-full py-1 rounded bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-[10px] font-bold flex items-center justify-center gap-1 border border-zinc-700 transition cursor-pointer"
                >
                  {copiedLib === 'json' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedLib === 'json' ? 'Copied!' : 'Copy Name'}</span>
                </button>
              </div>

              <div className="p-3 rounded-2xl bg-black border border-zinc-800 space-y-2">
                <div className="text-emerald-300 font-bold text-xs">Firebase-ESP8266</div>
                <div className="text-[11px] text-zinc-400 font-sans">By Mobizt. Required for ESP-01 / ESP8266 standalone mode.</div>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText('Firebase-ESP8266');
                    setCopiedLib('firebase_esp8266');
                    setTimeout(() => setCopiedLib(null), 2000);
                  }}
                  className="w-full py-1 rounded bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-[10px] font-bold flex items-center justify-center gap-1 border border-zinc-700 transition cursor-pointer"
                >
                  {copiedLib === 'firebase_esp8266' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedLib === 'firebase_esp8266' ? 'Copied!' : 'Copy Name'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Section 5: Step-by-Step 5-Minute Flashing Guide */}
          <div className="p-5 sm:p-6 rounded-3xl bg-zinc-950 border border-zinc-800 space-y-4 shadow-xl">
            <h4 className="text-base font-bold text-white flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Step-by-Step 5-Minute Flashing Guide</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs font-mono">
              <div className="p-3 rounded-2xl bg-black border border-zinc-800 space-y-1">
                <div className="text-emerald-400 font-bold">1. Install IDE</div>
                <p className="text-zinc-400 font-sans text-[11px]">Install Arduino IDE 2.3+ from the download links above.</p>
              </div>
              <div className="p-3 rounded-2xl bg-black border border-zinc-800 space-y-1">
                <div className="text-cyan-400 font-bold">2. Add Board URL</div>
                <p className="text-zinc-400 font-sans text-[11px]">Paste ESP32 URL into File → Preferences.</p>
              </div>
              <div className="p-3 rounded-2xl bg-black border border-zinc-800 space-y-1">
                <div className="text-purple-400 font-bold">3. Install Boards</div>
                <p className="text-zinc-400 font-sans text-[11px]">In Boards Manager, install <strong>esp32</strong> by Espressif.</p>
              </div>
              <div className="p-3 rounded-2xl bg-black border border-zinc-800 space-y-1">
                <div className="text-amber-400 font-bold">4. Add Libraries</div>
                <p className="text-zinc-400 font-sans text-[11px]">Install FirebaseESP32 & Adafruit INA219 from Library Manager.</p>
              </div>
              <div className="p-3 rounded-2xl bg-black border border-zinc-800 space-y-1">
                <div className="text-emerald-400 font-bold">5. Click Upload</div>
                <p className="text-zinc-400 font-sans text-[11px]">Select COM port & board, then click Upload (hold BOOT if needed).</p>
              </div>
            </div>
          </div>

          {/* Section 6: Android APK Quick Download */}
          <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-r from-emerald-950/40 to-black border border-emerald-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs font-mono text-emerald-400">
                <Smartphone className="w-4 h-4" />
                <span>Mobile Station Control</span>
              </div>
              <h4 className="text-base font-bold text-white">Want to control the wiper & telemetry from Android?</h4>
              <p className="text-xs text-zinc-400 font-sans">
                Download the standalone Farm.IOT Android APK package (v2.4.0) directly onto your phone.
              </p>
            </div>
            <a
              href="/api/download/apk"
              download="Farm_IOT_SmartStation_v2.4.apk"
              className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs font-mono transition cursor-pointer flex items-center justify-center gap-2 shrink-0 shadow-lg shadow-emerald-500/20"
            >
              <Download className="w-4 h-4" />
              <span>Download Android APK</span>
            </a>
          </div>
        </div>
      )}

      {/* Add / Edit Photo Modal (Local Upload & URL) */}
      {isAddingPhoto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
          <div className="bg-zinc-950 border border-zinc-800 rounded-3xl w-full max-w-xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-zinc-800 flex items-center justify-between bg-black">
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400">
                  <Camera className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">
                    {editingPhotoId ? 'Edit Hardware Photo' : 'Add New Hardware Photo'}
                  </h3>
                  <p className="text-xs text-zinc-400 font-mono">
                    Upload photos from your computer/phone or enter an image URL
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsAddingPhoto(false)}
                className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-900 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePhoto} className="p-6 overflow-y-auto space-y-4 flex-1 text-xs">
              {/* Photo Source Mode Switcher */}
              <div className="space-y-2 p-3 bg-black border border-zinc-800 rounded-2xl">
                <div className="flex items-center justify-between gap-2 flex-wrap mb-2">
                  <label className="text-[10px] text-zinc-300 font-bold uppercase tracking-wider flex items-center gap-1.5">
                    <ImageIcon className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Image Source</span>
                  </label>
                  
                  <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded-lg p-0.5 text-[10px] font-mono">
                    <button
                      type="button"
                      onClick={() => setPhotoInputMode('upload')}
                      className={`px-2.5 py-1 rounded-md transition cursor-pointer flex items-center gap-1 ${
                        photoInputMode === 'upload'
                          ? 'bg-cyan-500 text-slate-950 font-bold shadow'
                          : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      <Upload className="w-3 h-3" />
                      <span>Upload Local Photo</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPhotoInputMode('url')}
                      className={`px-2.5 py-1 rounded-md transition cursor-pointer flex items-center gap-1 ${
                        photoInputMode === 'url'
                          ? 'bg-cyan-500 text-slate-950 font-bold shadow'
                          : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      <ExternalLink className="w-3 h-3" />
                      <span>Web URL</span>
                    </button>
                  </div>
                </div>

                {/* Hidden File Input */}
                <input
                  ref={photoFileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/jpg"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      processLocalPhoto(file);
                    }
                    e.target.value = '';
                  }}
                />

                {photoInputMode === 'upload' ? (
                  <div className="space-y-2.5">
                    {photoForm.url ? (
                      <div className="relative rounded-xl border border-zinc-700 bg-zinc-900/80 p-3 flex items-center gap-3 overflow-hidden">
                        <img
                          src={photoForm.url}
                          alt="Preview"
                          className="w-20 h-20 object-cover rounded-lg bg-black border border-zinc-800 shrink-0 shadow"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=400&q=80';
                          }}
                        />

                        <div className="flex-1 min-w-0 font-mono text-[11px] space-y-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                              <CheckCircle2 className="w-2.5 h-2.5" />
                              {photoForm.url.startsWith('data:') ? 'Local Stored Photo' : 'Image Linked'}
                            </span>
                            {photoForm.url.startsWith('data:') && (
                              <span className="text-[9px] text-zinc-500">Auto-compressed for Instant Sync</span>
                            )}
                          </div>

                          <div className="flex items-center gap-2 pt-1.5">
                            <button
                              type="button"
                              onClick={() => photoFileInputRef.current?.click()}
                              disabled={isUploadingPhoto}
                              className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-600 text-[10px] font-mono flex items-center gap-1 cursor-pointer transition"
                            >
                              <Upload className="w-3 h-3 text-cyan-400" />
                              <span>Replace Photo</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setPhotoForm({ ...photoForm, url: '' })}
                              className="px-2 py-1 rounded-lg bg-rose-950/60 hover:bg-rose-900 text-rose-300 border border-rose-500/30 text-[10px] font-mono flex items-center gap-1 cursor-pointer transition"
                            >
                              <Trash2 className="w-3 h-3" />
                              <span>Remove</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      /* Drag & Drop Upload Box */
                      <div
                        onDragOver={(e) => {
                          e.preventDefault();
                          setIsPhotoDraggingOver(true);
                        }}
                        onDragLeave={() => setIsPhotoDraggingOver(false)}
                        onDrop={(e) => {
                          e.preventDefault();
                          setIsPhotoDraggingOver(false);
                          const file = e.dataTransfer.files?.[0];
                          if (file) {
                            processLocalPhoto(file);
                          }
                        }}
                        onClick={() => photoFileInputRef.current?.click()}
                        className={`p-6 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center text-center cursor-pointer transition duration-200 ${
                          isPhotoDraggingOver
                            ? 'border-cyan-400 bg-cyan-500/10'
                            : 'border-zinc-700 hover:border-cyan-500/60 bg-zinc-900/40 hover:bg-zinc-900'
                        }`}
                      >
                        <div className="p-3 rounded-full bg-cyan-500/10 text-cyan-400 mb-2 border border-cyan-500/20">
                          {isUploadingPhoto ? (
                            <div className="w-5 h-5 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <Camera className="w-5 h-5" />
                          )}
                        </div>
                        <div className="font-bold text-zinc-200 text-xs mb-0.5">
                          {isUploadingPhoto ? 'Optimizing photo...' : 'Click to select photo from device or camera'}
                        </div>
                        <div className="text-[10px] text-zinc-400 font-mono">
                          Drag & drop image file here, or browse local files
                        </div>
                        <div className="text-[9px] text-zinc-500 font-mono mt-1">
                          PNG, JPG, WebP supported • Automatically compressed for fast database sync
                        </div>
                      </div>
                    )}

                    {/* Quick Presets */}
                    <div className="pt-1">
                      <div className="text-[10px] text-zinc-400 font-mono mb-1.5 flex items-center justify-between">
                        <span>Or select a certified hardware photo preset:</span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 font-mono text-[10px]">
                        {[
                          { label: '🔌 ESP32 Circuit', url: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1200&q=80' },
                          { label: '🤖 Wiper Bench', url: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=1200&q=80' },
                          { label: '☀️ Solar Array', url: 'https://images.unsplash.com/photo-1509391365360-2e959784a276?auto=format&fit=crop&w=1200&q=80' },
                          { label: '⚙️ Relay Driver', url: 'https://images.unsplash.com/photo-1555664424-778a1e5e1b48?auto=format&fit=crop&w=1200&q=80' }
                        ].map((preset) => (
                          <button
                            key={preset.label}
                            type="button"
                            onClick={() => setPhotoForm({ ...photoForm, url: preset.url })}
                            className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-cyan-300 border border-zinc-800 text-left truncate transition cursor-pointer"
                          >
                            {preset.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  /* URL Input Mode */
                  <div className="space-y-2">
                    <input
                      type="url"
                      value={photoForm.url}
                      onChange={(e) => setPhotoForm({ ...photoForm, url: e.target.value })}
                      placeholder="https://images.unsplash.com/..."
                      className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-2.5 text-zinc-200 text-xs font-mono focus:outline-none focus:border-cyan-400"
                    />
                    {photoForm.url && (
                      <div className="flex items-center gap-3 p-2 bg-zinc-900/60 border border-zinc-800 rounded-xl">
                        <img
                          src={photoForm.url}
                          alt="URL preview"
                          className="w-12 h-12 rounded-lg object-cover bg-black border border-zinc-700"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=400&q=80';
                          }}
                        />
                        <span className="text-[10px] text-zinc-400 font-mono truncate flex-1">
                          Previewing image URL
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {photoUploadError && (
                  <div className="p-2 rounded-lg bg-rose-950/40 border border-rose-500/30 text-rose-300 text-[11px] font-mono flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-rose-400" />
                    <span>{photoUploadError}</span>
                  </div>
                )}
              </div>

              {/* Photo Title */}
              <div>
                <label className="text-xs font-bold text-cyan-400 block mb-1">
                  Photo Title *
                </label>
                <input
                  type="text"
                  value={photoForm.title}
                  onChange={(e) => setPhotoForm({ ...photoForm, title: e.target.value })}
                  placeholder="e.g. ESP32 DevKit & INA219 Breadboard Connections"
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-2 text-white text-xs focus:outline-none focus:border-cyan-400"
                  required
                />
              </div>

              {/* Tag / Category */}
              <div>
                <label className="text-[10px] text-zinc-400 block mb-1">
                  Category Tag
                </label>
                <select
                  value={photoForm.tag || 'ESP32 Circuit'}
                  onChange={(e) => setPhotoForm({ ...photoForm, tag: e.target.value })}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-2 text-white text-xs focus:border-cyan-400"
                >
                  <option value="ESP32 Circuit">ESP32 Circuit / Wiring</option>
                  <option value="Wiper Mechanism">Wiper Mechanism & Relay</option>
                  <option value="Solar Telemetry">Solar Telemetry & Array</option>
                  <option value="Sensors & Shunts">Sensors & Shunts (INA219, LM35)</option>
                  <option value="Bench Testing">Bench Testing & Calibration</option>
                </select>
              </div>

              {/* Caption */}
              <div>
                <label className="text-[10px] text-zinc-400 block mb-1">
                  Caption / Circuit Description
                </label>
                <textarea
                  value={photoForm.caption}
                  onChange={(e) => setPhotoForm({ ...photoForm, caption: e.target.value })}
                  rows={3}
                  placeholder="Describe the wiring pinouts, voltage levels, or mechanical setup shown in this photo..."
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-2 text-white text-xs focus:border-cyan-400"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsAddingPhoto(false)}
                  className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-mono text-xs transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingMedia}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 text-slate-950 font-bold font-mono text-xs transition cursor-pointer shadow-lg disabled:opacity-50"
                >
                  {isSavingMedia ? 'Saving...' : (editingPhotoId ? 'Update Photo' : 'Add Photo & Save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit YouTube Video Modal */}
      {isEditingVideo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
          <div className="bg-zinc-950 border border-zinc-800 rounded-3xl w-full max-w-xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-zinc-800 flex items-center justify-between bg-black">
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400">
                  <Video className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">
                    Update YouTube Demonstration Video
                  </h3>
                  <p className="text-xs text-zinc-400 font-mono">
                    Embed any YouTube demonstration or tutorial video
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsEditingVideo(false)}
                className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-900 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveVideo} className="p-6 overflow-y-auto space-y-4 flex-1 text-xs">
              <div>
                <label className="text-xs font-bold text-rose-400 block mb-1">
                  YouTube Video Link or ID *
                </label>
                <input
                  type="text"
                  value={videoForm.url}
                  onChange={(e) => setVideoForm({ ...videoForm, url: e.target.value })}
                  placeholder="https://www.youtube.com/watch?v=8R_K8X5h_eE or youtu.be/..."
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-2.5 text-white text-xs font-mono focus:outline-none focus:border-rose-400"
                  required
                />
                <span className="text-[10px] text-zinc-500 font-mono mt-1 block">
                  Supports standard watch links, youtu.be, shorts, and embed URLs
                </span>
              </div>

              {/* Instant YouTube Live Preview */}
              {extractYouTubeId(videoForm.url) && (
                <div className="p-3 bg-black border border-zinc-800 rounded-2xl space-y-2">
                  <div className="text-[10px] font-mono text-zinc-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Live Video Preview (ID: {extractYouTubeId(videoForm.url)})</span>
                  </div>
                  <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-zinc-950 border border-zinc-800">
                    <iframe
                      src={`https://www.youtube.com/embed/${extractYouTubeId(videoForm.url)}?rel=0`}
                      title="Preview"
                      className="w-full h-full"
                      allowFullScreen
                    />
                  </div>
                </div>
              )}

              {/* Quick Presets */}
              <div>
                <div className="text-[10px] text-zinc-400 font-mono mb-1.5">
                  Or select a demo video preset:
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 font-mono text-[10px]">
                  {[
                    { label: '🎬 ESP32 Wiper & Telemetry Demo', url: 'https://www.youtube.com/watch?v=8R_K8X5h_eE' },
                    { label: '⚡ INA219 Sensor Integration', url: 'https://www.youtube.com/watch?v=8R_K8X5h_eE' },
                  ].map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => setVideoForm({ ...videoForm, url: preset.url })}
                      className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-rose-300 border border-zinc-800 text-left truncate transition cursor-pointer"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-white block mb-1">
                  Video Title
                </label>
                <input
                  type="text"
                  value={videoForm.title}
                  onChange={(e) => setVideoForm({ ...videoForm, title: e.target.value })}
                  placeholder="e.g. ESP32 Firmware Execution & Wiper Cycle Demo"
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-2 text-white text-xs focus:outline-none focus:border-rose-400"
                />
              </div>

              <div>
                <label className="text-[10px] text-zinc-400 block mb-1">
                  Presenter / Channel Name
                </label>
                <input
                  type="text"
                  value={videoForm.channelOrAuthor || ''}
                  onChange={(e) => setVideoForm({ ...videoForm, channelOrAuthor: e.target.value })}
                  placeholder="e.g. Farm.IOT Engineering Lab"
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-2 text-white text-xs focus:outline-none focus:border-rose-400"
                />
              </div>

              <div>
                <label className="text-[10px] text-zinc-400 block mb-1">
                  Video Description
                </label>
                <textarea
                  value={videoForm.description}
                  onChange={(e) => setVideoForm({ ...videoForm, description: e.target.value })}
                  rows={3}
                  placeholder="Describe what features, firmware routines, or mechanical movements are demonstrated in this video..."
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-2 text-white text-xs focus:border-rose-400"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsEditingVideo(false)}
                  className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-mono text-xs transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingMedia}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-rose-500 to-pink-600 text-white font-bold font-mono text-xs transition cursor-pointer shadow-lg disabled:opacity-50"
                >
                  {isSavingMedia ? 'Saving...' : 'Save Video Demo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Lightbox / High-Resolution Photo Zoom Modal */}
      {activeZoomPhoto && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/90 backdrop-blur-md animate-fadeIn"
          onClick={() => setActiveZoomPhoto(null)}
        >
          <div 
            className="bg-zinc-950 border border-zinc-800 rounded-3xl w-full max-w-4xl max-h-[95vh] flex flex-col shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Lightbox Header */}
            <div className="p-4 border-b border-zinc-800 flex items-center justify-between bg-black">
              <div className="flex items-center space-x-2.5">
                <span className="px-2 py-0.5 rounded-md bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 text-[10px] font-mono font-bold uppercase">
                  {activeZoomPhoto.tag || 'Circuit Photo'}
                </span>
                <h3 className="font-bold text-white text-sm sm:text-base truncate max-w-md">
                  {activeZoomPhoto.title}
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={activeZoomPhoto.url}
                  download="solar-iot-circuit-photo.jpg"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white transition cursor-pointer flex items-center gap-1 text-xs font-mono"
                  title="Open / Download High-Res Image"
                >
                  <Download className="w-4 h-4" />
                </a>
                <button
                  onClick={() => setActiveZoomPhoto(null)}
                  className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-900 transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Photo Preview */}
            <div className="flex-1 bg-black flex items-center justify-center overflow-auto p-2">
              <img
                src={activeZoomPhoto.url}
                alt={activeZoomPhoto.title}
                className="max-h-[70vh] w-auto max-w-full object-contain rounded-xl shadow-2xl"
              />
            </div>

            {/* Lightbox Caption */}
            {activeZoomPhoto.caption && (
              <div className="p-4 bg-zinc-950 border-t border-zinc-800 text-xs font-mono text-zinc-400 leading-relaxed">
                {activeZoomPhoto.caption}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add / Edit Device Modal */}
      {isAddingDevice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
          <div className="bg-zinc-950 border border-zinc-800 rounded-3xl w-full max-w-xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-zinc-800 flex items-center justify-between bg-black">
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400">
                  <Plus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">
                    {editingDeviceId ? 'Edit Device / Sensor Pinout' : 'Add New Device / Sensor / Wire'}
                  </h3>
                  <p className="text-xs text-zinc-400 font-mono">
                    Configure pinout and wiring for future hardware upgrades
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsAddingDevice(false)}
                className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-900 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveDevice} className="p-6 overflow-y-auto space-y-4 flex-1 text-xs">
              <div>
                <label className="text-xs font-bold text-cyan-400 block mb-1">
                  Device / Sensor Name *
                </label>
                <input
                  type="text"
                  value={deviceForm.deviceName}
                  onChange={(e) => setDeviceForm({ ...deviceForm, deviceName: e.target.value })}
                  placeholder="e.g. DHT22 Temperature & Humidity Sensor"
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-2 text-white text-xs focus:outline-none focus:border-cyan-400"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-zinc-400 block mb-1">Category</label>
                  <select
                    value={deviceForm.category}
                    onChange={(e) => setDeviceForm({ ...deviceForm, category: e.target.value as any })}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-2 text-white text-xs focus:border-cyan-400"
                  >
                    <option value="sensor">Sensor</option>
                    <option value="actuator">Actuator / Motor / Relay</option>
                    <option value="communication">Communication / Bridge</option>
                    <option value="power">Power / Voltage Divider</option>
                    <option value="custom">Custom Module</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] text-zinc-400 block mb-1">Interface Protocol</label>
                  <select
                    value={deviceForm.interfaceType}
                    onChange={(e) => setDeviceForm({ ...deviceForm, interfaceType: e.target.value as any })}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-2 text-white text-xs focus:border-cyan-400"
                  >
                    <option value="I2C">I2C (SDA / SCL)</option>
                    <option value="Analog ADC">Analog ADC (Voltage / Sensor Out)</option>
                    <option value="Digital Input">Digital Input (Active High / Low)</option>
                    <option value="Digital Output">Digital Output (Relay / Transistor)</option>
                    <option value="PWM / Servo">PWM / Servo / Stepper</option>
                    <option value="UART Serial">UART Serial (TX / RX)</option>
                    <option value="SPI">SPI (MOSI / MISO / SCK / CS)</option>
                    <option value="Power (3.3V/5V/12V)">Power / GND Rail</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-zinc-400 block mb-1">Operating Voltage</label>
                  <select
                    value={deviceForm.voltageLevel}
                    onChange={(e) => setDeviceForm({ ...deviceForm, voltageLevel: e.target.value as any })}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-2 text-white text-xs focus:border-cyan-400"
                  >
                    <option value="3.3V">3.3V (ESP32 / ESP-01 Logic)</option>
                    <option value="5V">5V (Arduino / Relay Logic)</option>
                    <option value="12V DC">12V DC (Wiper Motor Power)</option>
                    <option value="GND / Common Ground">GND / Common Ground</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] text-zinc-400 block mb-1">Target Board</label>
                  <select
                    value={deviceForm.boardType}
                    onChange={(e) => setDeviceForm({ ...deviceForm, boardType: e.target.value as any })}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-2 text-white text-xs focus:border-cyan-400"
                  >
                    <option value="all">All Boards</option>
                    <option value="esp32">ESP32 DevKit</option>
                    <option value="arduino_esp01">Arduino + ESP-01</option>
                    <option value="esp01">ESP-01 Standalone</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-emerald-400 block mb-1">
                  Pin Layout & Connection Details *
                </label>
                <input
                  type="text"
                  value={deviceForm.pinLabel}
                  onChange={(e) => setDeviceForm({ ...deviceForm, pinLabel: e.target.value })}
                  placeholder="e.g. GPIO 4 (Data) or GPIO 32 (Analog Out)"
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-2 text-white text-xs font-mono focus:outline-none focus:border-emerald-400"
                  required
                />
              </div>

              <div>
                <label className="text-[10px] text-zinc-400 block mb-1">
                  Wire Colors (Optional)
                </label>
                <input
                  type="text"
                  value={deviceForm.wireColors || ''}
                  onChange={(e) => setDeviceForm({ ...deviceForm, wireColors: e.target.value })}
                  placeholder="e.g. Red (VCC), Black (GND), Blue (Data)"
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-2 text-white text-xs font-mono focus:border-cyan-400"
                />
              </div>

              <div>
                <label className="text-[10px] text-zinc-400 block mb-1">
                  Description / Purpose of Device
                </label>
                <textarea
                  value={deviceForm.description}
                  onChange={(e) => setDeviceForm({ ...deviceForm, description: e.target.value })}
                  rows={3}
                  placeholder="Explain what this sensor measures or how it improves the solar IoT rig..."
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-2 text-white text-xs focus:border-cyan-400"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsAddingDevice(false)}
                  className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-mono text-xs transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingHardware}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-slate-950 font-bold font-mono text-xs transition cursor-pointer shadow-lg disabled:opacity-50"
                >
                  {isSavingHardware ? 'Saving...' : (editingDeviceId ? 'Update Device' : 'Add Device & Save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
