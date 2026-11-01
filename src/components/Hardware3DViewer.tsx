import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import {
  Layers,
  RotateCw,
  Sun,
  Moon,
  Sparkles,
  Maximize2,
  Minimize2,
  ChevronDown,
  ChevronUp,
  Cpu,
  Zap,
  Wind,
  Shield,
  Droplets,
  Battery,
  Sliders,
  Compass,
  CheckCircle2,
  X,
  Palette,
  CreditCard,
  Users
} from 'lucide-react';
import { SolarData, StationProfile } from '../types/solar';

interface Hardware3DViewerProps {
  solarData?: SolarData;
  stationProfile?: StationProfile | null;
  onNavigateToEsp32?: () => void;
  onNavigateToLive?: () => void;
  onNavigateToSecurity?: () => void;
  onNavigateToWindmill?: () => void;
  onNavigateToWorkers?: () => void;
}

export interface HardwarePartInfo {
  id: string;
  name: string;
  subsystem: 'solar' | 'iot' | 'windmill' | 'peltier' | 'security' | 'power' | 'irrigation';
  subsystemLabel: string;
  pins: string;
  voltage: string;
  specs: string;
  role: string;
  status: string;
  targetPosition: THREE.Vector3;
  cameraPosition: THREE.Vector3;
}

export const HARDWARE_PARTS_INFO: Record<string, HardwarePartInfo> = {
  esp32_board: {
    id: 'esp32_board',
    name: 'ESP32-WROOM-32 Microcontroller',
    subsystem: 'iot',
    subsystemLabel: 'Core IoT Control Hub',
    pins: 'GPIO 21 (SDA), GPIO 22 (SCL), GPIO 26 (Pump Relay), GPIO 27 (Wiper Relay), GPIO 32 (Soil ADC), GPIO 34 (LM35 ADC)',
    voltage: '3.3V DC (Powered via 5V VIN Micro-USB or Step-Down Buck)',
    specs: 'Dual-core Xtensa 32-bit LX6 240MHz, 520 KB SRAM, 2.4 GHz Wi-Fi 802.11 b/g/n & BLE 4.2',
    role: 'Central processing brain: samples INA219 via I2C, LM35 analog temperature, controls pump/wiper relays, and streams live telemetry to Firebase Firestore every 3 seconds.',
    status: 'Operational & Firestore Connected',
    targetPosition: new THREE.Vector3(1.2, 0.4, 0.8),
    cameraPosition: new THREE.Vector3(1.2, 1.4, 1.8)
  },
  ina219_sensor: {
    id: 'ina219_sensor',
    name: 'INA219 High-Side DC Current & Power Sensor',
    subsystem: 'iot',
    subsystemLabel: 'Telemetry & Metering',
    pins: 'SDA -> ESP32 GPIO 21, SCL -> ESP32 GPIO 22, VCC (3.3V), GND, VIN+ & VIN- across shunt',
    voltage: '0V to 26V DC bus measurement, ±3.2A bidirectional span',
    specs: '0.1Ω (R100) 1% precision metal foil shunt resistor, 12-bit ADC, programmable averaging',
    role: 'Measures real-time panel voltage (V), current (mA), and computes wattage delivered to battery and load.',
    status: 'I2C Address 0x40 OK',
    targetPosition: new THREE.Vector3(0.9, 0.38, 0.8),
    cameraPosition: new THREE.Vector3(0.9, 1.1, 1.6)
  },
  dual_relay: {
    id: 'dual_relay',
    name: 'Dual-Channel Optocoupled 10A Relay Module',
    subsystem: 'solar',
    subsystemLabel: 'Actuator Power Switching',
    pins: 'IN1 -> ESP32 GPIO 26 (Water Pump), IN2 -> ESP32 GPIO 27 (Wiper Motor), VCC (5V), GND',
    voltage: '10A 250V AC / 10A 30V DC switching capacity with optoisolator protection',
    specs: 'Songle SRD-05VDC-SL-C electromechanical coils with flyback protection diodes & channel LEDs',
    role: 'Isolates and switches high-current 12V DC power to the water spray pump and squeegee gearmotor safely.',
    status: 'Active-LOW Logic Armed',
    targetPosition: new THREE.Vector3(1.5, 0.38, 0.8),
    cameraPosition: new THREE.Vector3(1.5, 1.1, 1.6)
  },
  solar_panel: {
    id: 'solar_panel',
    name: 'Monocrystalline Solar PV Panel & Dual-Axis Frame',
    subsystem: 'solar',
    subsystemLabel: 'Solar Energy Harvesting',
    pins: 'Positive (+) & Negative (-) connected to INA219 VIN+ and Solar Charge Controller',
    voltage: '18.5V Vmp, 22.4V Voc, 50W - 100W test bench rated output',
    specs: 'High-efficiency A-grade silicon cells, tempered glass with anti-reflective AR coating, anodized aluminum frame',
    role: 'Converts sunlight into electrical energy; motorized gimbal tilts panel for azimuth and zenith solar tracking.',
    status: 'Generating & Photovoltaic Active',
    targetPosition: new THREE.Vector3(-1.0, 1.2, 0.0),
    cameraPosition: new THREE.Vector3(-1.0, 2.5, 2.8)
  },
  wiper_mechanism: {
    id: 'wiper_mechanism',
    name: 'Automated Squeegee Wiper & Water Spray Nozzles',
    subsystem: 'solar',
    subsystemLabel: 'Self-Cleaning Mechanism',
    pins: 'Motor driven via Relay 2 (GPIO 27); Pump driven via Relay 1 (GPIO 26)',
    voltage: '12V DC High-Torque Worm Gearmotor & 12V Diaphragm Spray Pump (4.5 L/min)',
    specs: 'Linear dual-rail carriage with silicone squeegee blade and 3x atomizing brass mist nozzles',
    role: 'Eliminates dust, bird soiling, and sand deposits to restore up to +15% photovoltaic efficiency automatically.',
    status: 'Standby / Cycle Ready',
    targetPosition: new THREE.Vector3(-1.0, 1.45, 0.2),
    cameraPosition: new THREE.Vector3(-1.0, 2.2, 1.8)
  },
  windmill_generator: {
    id: 'windmill_generator',
    name: 'Wind Turbine Generator & Optical RPM Encoder',
    subsystem: 'windmill',
    subsystemLabel: 'Renewable Wind Harvesting',
    pins: 'Output connected to Rectifier / Buck Regulator; RPM sensor to ESP32 interrupt pin',
    voltage: '0 - 18V AC/DC Variable generator output based on wind speed (0 - 600 RPM)',
    specs: '3-Blade aerofoil nylon carbon-composite rotor, rare-earth neodymium permanent magnet DC alternator',
    role: 'Harvests wind kinetic energy and tracks rotational speed (RPM) for supplementary renewable power.',
    status: 'Rotor Assembly Ready',
    targetPosition: new THREE.Vector3(-2.2, 1.6, -1.2),
    cameraPosition: new THREE.Vector3(-2.2, 2.8, 1.2)
  },
  peltier_teg: {
    id: 'peltier_teg',
    name: 'Seebeck Peltier TEG & Heated Sand Bed',
    subsystem: 'peltier',
    subsystemLabel: 'Thermoelectric Energy Harvesting',
    pins: 'Red (+) / Black (-) Seebeck voltage lines to ADC instrumentation amplifier; Thermocouple to GPIO',
    voltage: '1.2V - 4.5V DC generated via temperature differential (Seebeck coefficient ~0.05 V/°C)',
    specs: 'SP1848-27145 TEG module sandwiched between thermal sand reservoir (hot side) and multi-fin heatsink (cold side)',
    role: 'Demonstrates direct thermal-to-electric power generation from sand heat retention using the Seebeck effect.',
    status: 'Thermal Gradient Ready',
    targetPosition: new THREE.Vector3(-0.6, 0.45, -1.2),
    cameraPosition: new THREE.Vector3(-0.6, 1.4, 0.4)
  },
  esp32_cam: {
    id: 'esp32_cam',
    name: 'ESP32-CAM AI Security Surveillance Node',
    subsystem: 'security',
    subsystemLabel: 'AI Vision & Intruders Security',
    pins: 'OV2640 DVP Camera interface, GPIO 4 (Flash LED), GPIO 13 (PIR Sensor), GPIO 12 (Piezo Alarm Buzzer)',
    voltage: '5V DC stabilized rail via AMS1117-3.3 regulator',
    specs: '2 Megapixel UXGA (1600x1200) sensor, mini Fresnel PIR motion detector, 85dB active warning buzzer',
    role: 'Performs live image capture, transmits snapshots to Google Colab / Firebase for Human vs Animal classification.',
    status: 'Surveillance Node Active',
    targetPosition: new THREE.Vector3(2.0, 1.4, -0.6),
    cameraPosition: new THREE.Vector3(2.0, 2.1, 1.0)
  },
  soil_probe: {
    id: 'soil_probe',
    name: 'Capacitive Soil Moisture Probe v1.2',
    subsystem: 'irrigation',
    subsystemLabel: 'Smart Farm Soil Telemetry',
    pins: 'AOUT -> ESP32 GPIO 32 (ADC1_CH4), VCC (3.3V), GND',
    voltage: '3.3V Analog Voltage (3.0V = Dry Air, 1.2V = Fully Saturated Soil)',
    specs: 'Corrosion-resistant gold plated immersion traces, onboard TL555I timer oscillator',
    role: 'Monitors rhizosphere soil water content to trigger automated smart irrigation drip solenoid valves.',
    status: 'Calibrated (0-100% moisture)',
    targetPosition: new THREE.Vector3(0.5, 0.25, 1.5),
    cameraPosition: new THREE.Vector3(0.5, 1.0, 2.5)
  },
  battery_controller: {
    id: 'battery_controller',
    name: '12V Storage Battery & Solar Charge Controller',
    subsystem: 'power',
    subsystemLabel: 'Energy Storage & Charge Management',
    pins: 'Solar PV Input (±), 12V Battery Terminals (±), 12V Inverter / DC Load Output (±)',
    voltage: '12V Nominal (13.8V Float, 14.4V Absorption), 20A PWM charge management',
    specs: 'Deep-cycle sealed rechargeable battery with backlit LCD status screen, dual 5V 2A USB ports',
    role: 'Regulates solar power, prevents overcharging/deep discharge, and buffers energy for 24/7 autonomous operation.',
    status: 'Float Charging (13.6V)',
    targetPosition: new THREE.Vector3(1.2, 0.45, -0.6),
    cameraPosition: new THREE.Vector3(1.2, 1.6, 1.2)
  },
  rfid_reader: {
    id: 'rfid_reader',
    name: 'RC522 RFID 13.56 MHz Touch Attendance Scanner',
    subsystem: 'security',
    subsystemLabel: 'Worker Identity & Access Control',
    pins: 'SDA (SS) -> GPIO 5, SCK -> GPIO 18, MOSI -> GPIO 23, MISO -> GPIO 19, RST -> GPIO 22, 3.3V, GND',
    voltage: '3.3V DC SPI High-Frequency Proximity Interface',
    specs: 'MFRC522 contactless read/write IC, 13.56 MHz electromagnetic induction antenna coil, 0-50mm proximity range',
    role: 'Scans worker badge UID, streams check-in to Google Docs, and verifies facial recognition to suppress security buzzer.',
    status: 'RFID Coil Armed & Polling',
    targetPosition: new THREE.Vector3(1.8, 0.75, -0.5),
    cameraPosition: new THREE.Vector3(1.8, 1.3, 0.4)
  }
};

export type ThemeMode = 'studio' | 'daylight' | 'emerald' | 'aurora' | 'sunset' | 'cyberpunk';

export default function Hardware3DViewer({
  solarData,
  stationProfile,
  onNavigateToEsp32,
  onNavigateToLive,
  onNavigateToSecurity,
  onNavigateToWindmill,
  onNavigateToWorkers
}: Hardware3DViewerProps) {
  const mountRef = useRef<HTMLDivElement>(null);

  // UI state
  const [isControlsCollapsed, setIsControlsCollapsed] = useState(false);
  const [activePreset, setActivePreset] = useState<'all' | 'solar' | 'iot' | 'windmill' | 'security' | 'power'>('all');
  const [explodedRatio, setExplodedRatio] = useState(0); // 0 to 1
  const [renderMode, setRenderMode] = useState<'pbr' | 'wireframe' | 'thermal'>('pbr');
  const [themeMode, setThemeMode] = useState<ThemeMode>('studio');
  const [isAutoRotating, setIsAutoRotating] = useState(true);
  const [isWiperAnimating, setIsWiperAnimating] = useState(false);
  const [isWindmillSpinning, setIsWindmillSpinning] = useState(true);
  const [windmillSpeed, setWindmillSpeed] = useState(1.0); // 0.5x, 1x, 2x
  const [selectedPartId, setSelectedPartId] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Refs for three.js objects
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const animationFrameId = useRef<number | null>(null);

  // Subsystems groups for exploded view
  const explodedGroupsRef = useRef<{
    solarGroup?: THREE.Group;
    wiperGroup?: THREE.Group;
    iotGroup?: THREE.Group;
    windmillGroup?: THREE.Group;
    peltierGroup?: THREE.Group;
    securityGroup?: THREE.Group;
    powerGroup?: THREE.Group;
    soilGroup?: THREE.Group;
  }>({});

  // Dynamic animated components
  const animatedRefs = useRef<{
    wiperMesh?: THREE.Group;
    wiperDirection?: number;
    wiperProgress?: number;
    sprayParticles?: THREE.Points;
    windmillRotor?: THREE.Group;
    esp32LedTx?: THREE.Mesh;
    cameraLed?: THREE.Mesh;
    cameraHead?: THREE.Group;
    cameraYaw?: number;
    cameraYawDir?: number;
    neonRingMat?: THREE.MeshStandardMaterial;
    stageMat?: THREE.MeshStandardMaterial;
    batteryBars?: THREE.Mesh[];
  }>({
    wiperDirection: 1,
    wiperProgress: 0,
    cameraYaw: 0,
    cameraYawDir: 1
  });

  // Reusable materials map for mode toggling (PBR vs Wireframe vs Thermal)
  const allMeshMaterialsRef = useRef<Map<THREE.Mesh, THREE.Material>>(new Map());

  // Camera damping target
  const cameraTargetRef = useRef<{
    pos: THREE.Vector3;
    look: THREE.Vector3;
    active: boolean;
  }>({
    pos: new THREE.Vector3(0, 3.2, 5.0),
    look: new THREE.Vector3(0, 0.8, 0),
    active: false
  });

  // Lighting refs
  const keyLightRef = useRef<THREE.DirectionalLight | null>(null);
  const fillLightRef = useRef<THREE.DirectionalLight | null>(null);
  const rimLightRef = useRef<THREE.DirectionalLight | null>(null);
  const accentLightRef = useRef<THREE.DirectionalLight | null>(null);
  const hemiLightRef = useRef<THREE.HemisphereLight | null>(null);

  // Procedural Textures Helper (Vibrant, high-contrast, zero 404 dependencies)
  const proceduralTextures = useMemo(() => {
    // 1. Solar Cells Texture (Rich, radiant monocrystalline silicon with silver busbars)
    const solarCanvas = document.createElement('canvas');
    solarCanvas.width = 1024;
    solarCanvas.height = 1024;
    const sctx = solarCanvas.getContext('2d')!;

    // Anti-reflective royal sapphire blue gradient
    const sGrad = sctx.createLinearGradient(0, 0, 1024, 1024);
    sGrad.addColorStop(0, '#1e3a8a');
    sGrad.addColorStop(0.3, '#1d4ed8');
    sGrad.addColorStop(0.7, '#1e40af');
    sGrad.addColorStop(1, '#0f172a');
    sctx.fillStyle = sGrad;
    sctx.fillRect(0, 0, 1024, 1024);

    // Draw individual wafer cells (4x4 grid with wafer corner chamfers)
    const cellSize = 246;
    const gap = 8;

    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        const x = 10 + c * (cellSize + gap);
        const y = 10 + r * (cellSize + gap);

        // Wafer cell body with rich crystalline gradient
        const wGrad = sctx.createLinearGradient(x, y, x + cellSize, y + cellSize);
        wGrad.addColorStop(0, '#1d4ed8');
        wGrad.addColorStop(0.5, '#2563eb');
        wGrad.addColorStop(1, '#1e3a8a');
        sctx.fillStyle = wGrad;
        sctx.fillRect(x, y, cellSize, cellSize);

        // Wafer chamfered corners (monocrystalline signature)
        sctx.fillStyle = '#0f172a';
        const ch = 18;
        // Top-left
        sctx.beginPath(); sctx.moveTo(x, y); sctx.lineTo(x + ch, y); sctx.lineTo(x, y + ch); sctx.fill();
        // Top-right
        sctx.beginPath(); sctx.moveTo(x + cellSize, y); sctx.lineTo(x + cellSize - ch, y); sctx.lineTo(x + cellSize, y + ch); sctx.fill();
        // Bottom-left
        sctx.beginPath(); sctx.moveTo(x, y + cellSize); sctx.lineTo(x + ch, y + cellSize); sctx.lineTo(x, y + cellSize - ch); sctx.fill();
        // Bottom-right
        sctx.beginPath(); sctx.moveTo(x + cellSize, y + cellSize); sctx.lineTo(x + cellSize - ch, y + cellSize); sctx.lineTo(x + cellSize, y + cellSize - ch); sctx.fill();

        // Cell fine finger lines (microgrid)
        sctx.strokeStyle = 'rgba(191, 219, 254, 0.45)';
        sctx.lineWidth = 1;
        for (let f = 8; f < cellSize; f += 6) {
          sctx.beginPath();
          sctx.moveTo(x + 2, y + f);
          sctx.lineTo(x + cellSize - 2, y + f);
          sctx.stroke();
        }

        // Main Silver Busbars (3 lines per cell with metallic shine)
        sctx.strokeStyle = '#f8fafc';
        sctx.lineWidth = 3.5;
        for (const bx of [48, 123, 198]) {
          sctx.beginPath();
          sctx.moveTo(x + bx, y + 2);
          sctx.lineTo(x + bx, y + cellSize - 2);
          sctx.stroke();
        }

        // Wafer outer border
        sctx.strokeStyle = '#60a5fa';
        sctx.lineWidth = 1.2;
        sctx.strokeRect(x, y, cellSize, cellSize);
      }
    }

    const solarTex = new THREE.CanvasTexture(solarCanvas);
    solarTex.colorSpace = THREE.SRGBColorSpace;

    // 2. PCB Circuit Board Texture (Vibrant emerald green with gold traces & pads)
    const pcbCanvas = document.createElement('canvas');
    pcbCanvas.width = 512;
    pcbCanvas.height = 512;
    const pctx = pcbCanvas.getContext('2d')!;

    // Rich glossy emerald green solder mask
    const pGrad = pctx.createLinearGradient(0, 0, 512, 512);
    pGrad.addColorStop(0, '#047857');
    pGrad.addColorStop(0.5, '#065f46');
    pGrad.addColorStop(1, '#064e3b');
    pctx.fillStyle = pGrad;
    pctx.fillRect(0, 0, 512, 512);

    // Polished gold bus routes
    pctx.strokeStyle = '#fbbf24';
    pctx.lineWidth = 2.5;
    for (let i = 24; i < 500; i += 32) {
      pctx.beginPath();
      pctx.moveTo(24, i);
      pctx.lineTo(160, i);
      pctx.lineTo(210, i + 18);
      pctx.lineTo(488, i + 18);
      pctx.stroke();
    }

    // Gold test vias & IC contact pads
    pctx.fillStyle = '#f59e0b';
    for (let i = 32; i < 490; i += 40) {
      for (let j = 32; j < 490; j += 40) {
        pctx.beginPath();
        pctx.arc(i, j, 3.5, 0, Math.PI * 2);
        pctx.fill();
        pctx.strokeStyle = '#fef3c7';
        pctx.lineWidth = 0.8;
        pctx.stroke();
      }
    }

    // Crisp silkscreen lettering
    pctx.fillStyle = '#ffffff';
    pctx.font = 'bold 16px monospace';
    pctx.fillText('FARM.IOT ESP32 AGRI-MICROGRID', 30, 475);
    pctx.fillStyle = '#6ee7b7';
    pctx.font = '12px monospace';
    pctx.fillText('I2C(21/22) • RELAYS(26/27) • SOIL(32) • TEMP(34)', 30, 495);

    const pcbTex = new THREE.CanvasTexture(pcbCanvas);
    pcbTex.colorSpace = THREE.SRGBColorSpace;

    // 3. Digital LCD Screen Texture (High-contrast cyan & emerald display)
    const lcdCanvas = document.createElement('canvas');
    lcdCanvas.width = 512;
    lcdCanvas.height = 256;
    const lctx = lcdCanvas.getContext('2d')!;

    lctx.fillStyle = '#020617';
    lctx.fillRect(0, 0, 512, 256);

    // Subtle LCD pixel matrix grid
    lctx.strokeStyle = '#082f49';
    lctx.lineWidth = 1;
    for (let y = 0; y < 256; y += 8) {
      lctx.beginPath();
      lctx.moveTo(0, y);
      lctx.lineTo(512, y);
      lctx.stroke();
    }

    // Glowing cyan telemetry metrics
    lctx.fillStyle = '#38bdf8';
    lctx.font = 'bold 36px monospace';
    lctx.fillText('13.8V  4.85A  66.9W', 25, 75);

    lctx.font = 'bold 24px monospace';
    lctx.fillStyle = '#34d399';
    lctx.fillText('SOLAR HARVEST: 98.4%', 25, 135);

    lctx.font = '20px monospace';
    lctx.fillStyle = '#fde047';
    lctx.fillText('WIND: ACTIVE • WIPER: AUTO', 25, 195);

    const lcdTex = new THREE.CanvasTexture(lcdCanvas);
    lcdTex.colorSpace = THREE.SRGBColorSpace;

    return { solarTex, pcbTex, lcdTex };
  }, []);

  // Initialize Three.js Scene
  useEffect(() => {
    if (!mountRef.current) return;

    const width = mountRef.current.clientWidth || window.innerWidth;
    const height = mountRef.current.clientHeight || 650;

    // 1. Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#0b1120'); // Crisp, clean deep aerospace slate
    sceneRef.current = scene;

    // 2. Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, 3.2, 5.0);
    cameraRef.current = camera;

    // 3. Renderer
    const isHeadless = navigator.webdriver || /HeadlessChrome/i.test(navigator.userAgent);
    const renderer = new THREE.WebGLRenderer({
      antialias: !isHeadless,
      powerPreference: 'high-performance'
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(isHeadless ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.25;
    renderer.shadowMap.enabled = !isHeadless;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    mountRef.current.innerHTML = '';
    mountRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // 4. Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 1.5;
    controls.maxDistance = 15;
    controls.maxPolarAngle = Math.PI / 2 - 0.02;
    controls.target.set(0, 0.8, 0);
    controls.autoRotate = isAutoRotating;
    controls.autoRotateSpeed = 0.8;
    controlsRef.current = controls;

    // Procedural Studio Environment Reflection
    try {
      const pmremGenerator = new THREE.PMREMGenerator(renderer);
      scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
      pmremGenerator.dispose();
    } catch {}

    // 5. Lighting Rig (Vibrant 4-Point High-Fidelity Studio Setup)
    const hemiLight = new THREE.HemisphereLight(0xe0f2fe, 0x1e293b, 1.2);
    hemiLight.position.set(0, 20, 0);
    scene.add(hemiLight);
    hemiLightRef.current = hemiLight;

    // Key Light (Warm golden sunshine)
    const keyLight = new THREE.DirectionalLight(0xfff7ed, 2.4);
    keyLight.position.set(6, 9, 5);
    keyLight.castShadow = !isHeadless;
    keyLight.shadow.mapSize.width = 2048;
    keyLight.shadow.mapSize.height = 2048;
    keyLight.shadow.camera.near = 0.5;
    keyLight.shadow.camera.far = 25;
    keyLight.shadow.camera.left = -4;
    keyLight.shadow.camera.right = 4;
    keyLight.shadow.camera.top = 4;
    keyLight.shadow.camera.bottom = -4;
    keyLight.shadow.bias = -0.0003;
    keyLight.shadow.normalBias = 0.015;
    scene.add(keyLight);
    keyLightRef.current = keyLight;

    // Fill Light (Soft cool azure)
    const fillLight = new THREE.DirectionalLight(0x93c5fd, 1.1);
    fillLight.position.set(-6, 5, 4);
    scene.add(fillLight);
    fillLightRef.current = fillLight;

    // Rim Light (Vibrant cyan/teal)
    const rimLight = new THREE.DirectionalLight(0x38bdf8, 1.5);
    rimLight.position.set(-5, 4, -6);
    scene.add(rimLight);
    rimLightRef.current = rimLight;

    // Ambient Warm Accent (Soft golden amber under-glow)
    const accentLight = new THREE.DirectionalLight(0xfbbf24, 0.8);
    accentLight.position.set(4, 2, -4);
    scene.add(accentLight);
    accentLightRef.current = accentLight;

    // -------------------------------------------------------------
    // Ground Laboratory Showcase Pedestal & Contact Shadows
    // -------------------------------------------------------------
    const benchGroup = new THREE.Group();

    // Sleek Circular Pedestal Upper Deck (Beveled Cylindrical Stage)
    const stageGeo = new THREE.CylinderGeometry(3.3, 3.4, 0.12, 64);
    const stageMat = new THREE.MeshStandardMaterial({
      color: 0x111827,
      roughness: 0.25,
      metalness: 0.35
    });
    const stageMesh = new THREE.Mesh(stageGeo, stageMat);
    stageMesh.position.y = -0.06;
    stageMesh.receiveShadow = true;
    benchGroup.add(stageMesh);
    animatedRefs.current.stageMat = stageMat;

    // Glowing Neon Accent Ring around perimeter
    const ringGeo = new THREE.TorusGeometry(3.32, 0.02, 16, 64);
    const ringMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x38bdf8,
      emissiveIntensity: 1.2,
      roughness: 0.2
    });
    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    ringMesh.rotation.x = Math.PI / 2;
    ringMesh.position.y = 0.002;
    benchGroup.add(ringMesh);
    animatedRefs.current.neonRingMat = ringMat;

    // Fine concentric alignment rings & polar grid
    const polarGrid = new THREE.PolarGridHelper(3.1, 16, 8, 64, 0x38bdf8, 0x1e293b);
    polarGrid.position.y = 0.004;
    benchGroup.add(polarGrid);

    // Soft Radial Contact Shadow beneath entire rig
    const shadowCanvas = document.createElement('canvas');
    shadowCanvas.width = 512;
    shadowCanvas.height = 512;
    const shCtx = shadowCanvas.getContext('2d')!;
    const shGrad = shCtx.createRadialGradient(256, 256, 20, 256, 256, 240);
    shGrad.addColorStop(0, 'rgba(0, 0, 0, 0.65)');
    shGrad.addColorStop(0.5, 'rgba(0, 0, 0, 0.3)');
    shGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    shCtx.fillStyle = shGrad;
    shCtx.fillRect(0, 0, 512, 512);

    const shadowTex = new THREE.CanvasTexture(shadowCanvas);
    const shadowPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(6.4, 6.4),
      new THREE.MeshBasicMaterial({
        map: shadowTex,
        transparent: true,
        opacity: 0.7,
        depthWrite: false
      })
    );
    shadowPlane.rotation.x = -Math.PI / 2;
    shadowPlane.position.y = 0.005;
    benchGroup.add(shadowPlane);

    scene.add(benchGroup);

    // -------------------------------------------------------------
    // SUBSYSTEM 1: Solar Panel & Automated Wiper Mechanism
    // -------------------------------------------------------------
    const solarGroup = new THREE.Group();
    solarGroup.position.set(-1.0, 0.0, 0.0);
    solarGroup.userData = { id: 'solar_panel' };

    // Aluminum extrusion mast & dual-axis gimbal
    const mastGeo = new THREE.CylinderGeometry(0.06, 0.07, 0.9, 16);
    const alumMat = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      roughness: 0.22,
      metalness: 0.9
    });
    const mast = new THREE.Mesh(mastGeo, alumMat);
    mast.position.y = 0.45;
    mast.castShadow = true;
    solarGroup.add(mast);

    // Gimbal cross-hinge & pitch servo motor with gold-anodized finish
    const hingeGeo = new THREE.BoxGeometry(0.2, 0.16, 0.22);
    const hingeMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.4, metalness: 0.8 });
    const hinge = new THREE.Mesh(hingeGeo, hingeMat);
    hinge.position.y = 0.9;
    solarGroup.add(hinge);

    // Tilted panel bracket (24 degree tilt to sunlight)
    const panelAssembly = new THREE.Group();
    panelAssembly.position.set(0, 0.95, 0);
    panelAssembly.rotation.x = -0.42;

    // Panel Aluminum Outer Frame (Polished with champagne gold corner bevels)
    const frameGeo = new THREE.BoxGeometry(1.6, 0.05, 1.2);
    const frameMesh = new THREE.Mesh(frameGeo, alumMat);
    frameMesh.castShadow = true;
    panelAssembly.add(frameMesh);

    // Brass corner protectors on frame
    const cornerMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.25, metalness: 0.85 });
    for (const cx of [-0.78, 0.78]) {
      for (const cz of [-0.58, 0.58]) {
        const corner = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.054, 0.08), cornerMat);
        corner.position.set(cx, 0, cz);
        panelAssembly.add(corner);
      }
    }

    // Silicon Photovoltaic Glass Face (High-specular Physical Material)
    const pvFaceGeo = new THREE.PlaneGeometry(1.52, 1.12);
    const pvMat = new THREE.MeshPhysicalMaterial({
      map: proceduralTextures.solarTex,
      roughness: 0.08,
      metalness: 0.2,
      clearcoat: 1.0,
      clearcoatRoughness: 0.04,
      reflectivity: 0.95
    });
    const pvFace = new THREE.Mesh(pvFaceGeo, pvMat);
    pvFace.rotation.x = -Math.PI / 2;
    pvFace.position.y = 0.026;
    pvFace.userData = { id: 'solar_panel' };
    panelAssembly.add(pvFace);

    // Rear junction box & bypass diodes
    const jboxGeo = new THREE.BoxGeometry(0.18, 0.05, 0.12);
    const jboxMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.6 });
    const jbox = new THREE.Mesh(jboxGeo, jboxMat);
    jbox.position.set(0, -0.04, -0.35);
    panelAssembly.add(jbox);

    // Wiper Mechanism Sub-Assembly
    const wiperGroup = new THREE.Group();
    wiperGroup.userData = { id: 'wiper_mechanism' };

    // Linear guide rails (dual polished chrome)
    const railGeo = new THREE.CylinderGeometry(0.012, 0.012, 1.54, 12);
    const railMat = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.1, metalness: 0.98 });
    const topRail = new THREE.Mesh(railGeo, railMat);
    topRail.rotation.z = Math.PI / 2;
    topRail.position.set(0, 0.04, -0.54);
    panelAssembly.add(topRail);

    // Spray cleaning header pipe with 3 brass nozzles
    const sprayPipeGeo = new THREE.CylinderGeometry(0.008, 0.008, 1.4, 8);
    const sprayPipe = new THREE.Mesh(sprayPipeGeo, alumMat);
    sprayPipe.rotation.z = Math.PI / 2;
    sprayPipe.position.set(0, 0.06, -0.56);
    panelAssembly.add(sprayPipe);

    // Atomizing brass mist nozzles
    const nozzleMat = new THREE.MeshStandardMaterial({ color: 0xfbbf24, roughness: 0.2, metalness: 0.9 });
    for (const nx of [-0.45, 0, 0.45]) {
      const nozzle = new THREE.Mesh(new THREE.ConeGeometry(0.015, 0.03, 8), nozzleMat);
      nozzle.rotation.x = Math.PI / 3;
      nozzle.position.set(nx, 0.055, -0.54);
      panelAssembly.add(nozzle);
    }

    // Moving Squeegee Wiper Arm (Vibrant Safety Orange carriage)
    const wiperMesh = new THREE.Group();
    wiperMesh.position.set(0, 0.035, 0);

    const bladeGeo = new THREE.BoxGeometry(0.02, 0.025, 1.05);
    const bladeMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.9, metalness: 0.1 });
    const blade = new THREE.Mesh(bladeGeo, bladeMat);
    wiperMesh.add(blade);

    // Wiper carriage mount (Vibrant Safety Orange)
    const carriageGeo = new THREE.BoxGeometry(0.06, 0.035, 0.08);
    const carriageMat = new THREE.MeshStandardMaterial({ color: 0xf97316, roughness: 0.35, metalness: 0.4 });
    const topCarriage = new THREE.Mesh(carriageGeo, carriageMat);
    topCarriage.position.z = -0.54;
    wiperMesh.add(topCarriage);

    panelAssembly.add(wiperMesh);
    animatedRefs.current.wiperMesh = wiperMesh;

    // Sparkling water mist particles for active spray cleaning
    const particleCount = 200;
    const particleGeo = new THREE.BufferGeometry();
    const particlePositions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount * 3; i += 3) {
      particlePositions[i] = (Math.random() - 0.5) * 1.3;
      particlePositions[i + 1] = 0.05 + Math.random() * 0.1;
      particlePositions[i + 2] = -0.5 + Math.random() * 0.8;
    }
    particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
    const particleMat = new THREE.PointsMaterial({
      color: 0x38bdf8,
      size: 0.03,
      transparent: true,
      opacity: 0.0,
      depthWrite: false
    });
    const sprayParticles = new THREE.Points(particleGeo, particleMat);
    panelAssembly.add(sprayParticles);
    animatedRefs.current.sprayParticles = sprayParticles;

    solarGroup.add(panelAssembly);
    scene.add(solarGroup);
    explodedGroupsRef.current.solarGroup = solarGroup;
    explodedGroupsRef.current.wiperGroup = wiperGroup;

    // -------------------------------------------------------------
    // SUBSYSTEM 2: ESP32 & IoT Telemetry Control Hub Enclosure
    // -------------------------------------------------------------
    const iotGroup = new THREE.Group();
    iotGroup.position.set(1.2, 0.0, 0.8);
    iotGroup.userData = { id: 'esp32_board' };

    // Transparent IP65 Polycarbonate Enclosure box
    const boxBaseGeo = new THREE.BoxGeometry(1.1, 0.35, 0.8);
    const boxBaseMat = new THREE.MeshPhysicalMaterial({
      color: 0x0284c7,
      roughness: 0.25,
      metalness: 0.1,
      transmission: 0.78,
      thickness: 0.05,
      transparent: true,
      opacity: 0.82
    });
    const boxBase = new THREE.Mesh(boxBaseGeo, boxBaseMat);
    boxBase.position.y = 0.18;
    boxBase.castShadow = true;
    iotGroup.add(boxBase);

    // Clear acrylic lid
    const lidGeo = new THREE.BoxGeometry(1.12, 0.02, 0.82);
    const lidMat = new THREE.MeshPhysicalMaterial({
      color: 0xf8fafc,
      roughness: 0.08,
      transmission: 0.92,
      thickness: 0.02,
      transparent: true,
      opacity: 0.55
    });
    const lid = new THREE.Mesh(lidGeo, lidMat);
    lid.position.y = 0.36;
    iotGroup.add(lid);

    // Main FR4 Electronics Board inside box (Glossy Emerald Green)
    const pcbGeo = new THREE.BoxGeometry(0.95, 0.02, 0.65);
    const pcbMat = new THREE.MeshStandardMaterial({
      map: proceduralTextures.pcbTex,
      roughness: 0.3,
      metalness: 0.35
    });
    const pcb = new THREE.Mesh(pcbGeo, pcbMat);
    pcb.position.y = 0.12;
    pcb.userData = { id: 'esp32_board' };
    iotGroup.add(pcb);

    // ESP32-WROOM-32 Module
    const esp32Mesh = new THREE.Group();
    esp32Mesh.position.set(0.12, 0.14, 0.0);
    esp32Mesh.userData = { id: 'esp32_board' };

    // Silver mirror RF Shield Can
    const espCanGeo = new THREE.BoxGeometry(0.25, 0.03, 0.35);
    const espCanMat = new THREE.MeshStandardMaterial({
      color: 0xf1f5f9,
      roughness: 0.15,
      metalness: 0.95
    });
    const espCan = new THREE.Mesh(espCanGeo, espCanMat);
    esp32Mesh.add(espCan);

    // PCB Antenna trace (Black)
    const antGeo = new THREE.BoxGeometry(0.24, 0.01, 0.08);
    const antMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.9 });
    const ant = new THREE.Mesh(antGeo, antMat);
    ant.position.set(0, 0.015, -0.21);
    esp32Mesh.add(ant);

    // Micro-USB port
    const usbGeo = new THREE.BoxGeometry(0.08, 0.035, 0.06);
    const usbMat = new THREE.MeshStandardMaterial({ color: 0xd1d5db, roughness: 0.2, metalness: 0.9 });
    const usb = new THREE.Mesh(usbGeo, usbMat);
    usb.position.set(0, 0.015, 0.2);
    esp32Mesh.add(usb);

    // Dynamic Pulsing Green Status Heartbeat LED
    const ledGeo = new THREE.BoxGeometry(0.02, 0.015, 0.02);
    const ledMat = new THREE.MeshBasicMaterial({ color: 0x22c55e });
    const espLed = new THREE.Mesh(ledGeo, ledMat);
    espLed.position.set(0.08, 0.02, -0.12);
    esp32Mesh.add(espLed);
    animatedRefs.current.esp32LedTx = espLed;

    // Glowing Blue WiFi LED
    const wifiLedMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
    const wifiLed = new THREE.Mesh(ledGeo, wifiLedMat);
    wifiLed.position.set(-0.08, 0.02, -0.12);
    esp32Mesh.add(wifiLed);

    iotGroup.add(esp32Mesh);

    // INA219 Telemetry Breakout Board (Vibrant Purple PCB)
    const inaGroup = new THREE.Group();
    inaGroup.position.set(-0.3, 0.14, 0.0);
    inaGroup.userData = { id: 'ina219_sensor' };

    const inaPcb = new THREE.Mesh(
      new THREE.BoxGeometry(0.22, 0.02, 0.2),
      new THREE.MeshStandardMaterial({ color: 0x7c3aed, roughness: 0.35 })
    );
    inaGroup.add(inaPcb);

    // Precision Shunt Resistor (R100)
    const shunt = new THREE.Mesh(
      new THREE.BoxGeometry(0.05, 0.02, 0.08),
      new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.2, metalness: 0.85 })
    );
    shunt.position.set(0, 0.015, 0);
    inaGroup.add(shunt);

    // High-current green terminal block
    const terminal = new THREE.Mesh(
      new THREE.BoxGeometry(0.18, 0.07, 0.06),
      new THREE.MeshStandardMaterial({ color: 0x16a34a, roughness: 0.5 })
    );
    terminal.position.set(0, 0.04, -0.08);
    inaGroup.add(terminal);

    iotGroup.add(inaGroup);

    // Dual-Channel 10A Optocoupled Relay Module (Vibrant Blue Songle Relays)
    const relayGroup = new THREE.Group();
    relayGroup.position.set(0.0, 0.14, -0.22);
    relayGroup.userData = { id: 'dual_relay' };

    const relayPcb = new THREE.Mesh(
      new THREE.BoxGeometry(0.38, 0.02, 0.22),
      new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.5 })
    );
    relayGroup.add(relayPcb);

    // Dual Blue Songle Relays
    for (const rx of [-0.09, 0.09]) {
      const cube = new THREE.Mesh(
        new THREE.BoxGeometry(0.14, 0.09, 0.14),
        new THREE.MeshStandardMaterial({ color: 0x2563eb, roughness: 0.3, metalness: 0.1 })
      );
      cube.position.set(rx, 0.05, 0.02);
      relayGroup.add(cube);
    }
    iotGroup.add(relayGroup);

    scene.add(iotGroup);
    explodedGroupsRef.current.iotGroup = iotGroup;

    // -------------------------------------------------------------
    // SUBSYSTEM 3: Windmill Generator Rig
    // -------------------------------------------------------------
    const windmillGroup = new THREE.Group();
    windmillGroup.position.set(-2.2, 0.0, -1.2);
    windmillGroup.userData = { id: 'windmill_generator' };

    // Aerodynamic Steel tower mast with tubular cross section
    const towerGeo = new THREE.CylinderGeometry(0.05, 0.09, 1.8, 16);
    const tower = new THREE.Mesh(towerGeo, alumMat);
    tower.position.y = 0.9;
    tower.castShadow = true;
    windmillGroup.add(tower);

    // Tripod support struts at base
    for (let i = 0; i < 3; i++) {
      const angle = (i * Math.PI * 2) / 3;
      const strutGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.6, 8);
      const strut = new THREE.Mesh(strutGeo, alumMat);
      strut.position.set(Math.cos(angle) * 0.18, 0.25, Math.sin(angle) * 0.18);
      strut.rotation.x = Math.sin(angle) * 0.5;
      strut.rotation.z = -Math.cos(angle) * 0.5;
      windmillGroup.add(strut);
    }

    // Nacelle housing generator (Glossy pearl white with red racing stripe)
    const nacelleGeo = new THREE.CylinderGeometry(0.09, 0.09, 0.34, 16);
    const nacelleMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.2, metalness: 0.3 });
    const nacelle = new THREE.Mesh(nacelleGeo, nacelleMat);
    nacelle.rotation.x = Math.PI / 2;
    nacelle.position.set(0, 1.82, 0);
    nacelle.castShadow = true;
    windmillGroup.add(nacelle);

    // Wind vane tail rudder (Vibrant Crimson with aero stripe)
    const rudderGeo = new THREE.BoxGeometry(0.01, 0.24, 0.3);
    const rudder = new THREE.Mesh(rudderGeo, new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.4 }));
    rudder.position.set(0, 1.85, -0.28);
    windmillGroup.add(rudder);

    // Rotating Rotor Hub & 3 Aerodynamic Blades with Red Safety Wingtips
    const rotorHub = new THREE.Group();
    rotorHub.position.set(0, 1.82, 0.18);

    // Polished chrome nose cone spinner
    const spinnerGeo = new THREE.ConeGeometry(0.08, 0.16, 16);
    const spinner = new THREE.Mesh(spinnerGeo, railMat);
    spinner.rotation.x = Math.PI / 2;
    rotorHub.add(spinner);

    // 3 Aerofoil Blades with vibrant red wingtips
    for (let b = 0; b < 3; b++) {
      const bladeAngle = (b * Math.PI * 2) / 3;
      const bladeMesh = new THREE.Group();
      bladeMesh.rotation.z = bladeAngle;

      // Main white blade body
      const wingGeo = new THREE.BoxGeometry(0.07, 0.5, 0.015);
      const wingMat = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: 0.2,
        metalness: 0.15
      });
      const wing = new THREE.Mesh(wingGeo, wingMat);
      wing.position.y = 0.28;
      wing.rotation.y = 0.22;
      wing.castShadow = true;
      bladeMesh.add(wing);

      // Red aerodynamic safety wingtip
      const tipGeo = new THREE.BoxGeometry(0.07, 0.18, 0.015);
      const tipMat = new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.3 });
      const tip = new THREE.Mesh(tipGeo, tipMat);
      tip.position.y = 0.61;
      tip.rotation.y = 0.22;
      tip.castShadow = true;
      bladeMesh.add(tip);

      rotorHub.add(bladeMesh);
    }

    windmillGroup.add(rotorHub);
    animatedRefs.current.windmillRotor = rotorHub;

    scene.add(windmillGroup);
    explodedGroupsRef.current.windmillGroup = windmillGroup;

    // -------------------------------------------------------------
    // SUBSYSTEM 4: Peltier Seebeck TEG & Sand Bed
    // -------------------------------------------------------------
    const peltierGroup = new THREE.Group();
    peltierGroup.position.set(-0.6, 0.0, -1.2);
    peltierGroup.userData = { id: 'peltier_teg' };

    // Insulated cylindrical thermal sand bath container
    const sandContainerGeo = new THREE.CylinderGeometry(0.35, 0.32, 0.3, 24);
    const containerMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.5, metalness: 0.7 });
    const sandContainer = new THREE.Mesh(sandContainerGeo, containerMat);
    sandContainer.position.y = 0.15;
    sandContainer.castShadow = true;
    peltierGroup.add(sandContainer);

    // Warm golden sand layer (heated thermal mass)
    const sandSurfaceGeo = new THREE.CircleGeometry(0.34, 24);
    const sandMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.95 });
    const sandSurface = new THREE.Mesh(sandSurfaceGeo, sandMat);
    sandSurface.rotation.x = -Math.PI / 2;
    sandSurface.position.y = 0.29;
    peltierGroup.add(sandSurface);

    // Glowing thermal element coil beneath sand (Warm amber Seebeck gradient)
    const thermalRingGeo = new THREE.TorusGeometry(0.24, 0.012, 12, 32);
    const thermalRingMat = new THREE.MeshStandardMaterial({
      color: 0xf97316,
      emissive: 0xea580c,
      emissiveIntensity: 0.9,
      roughness: 0.3
    });
    const thermalRing = new THREE.Mesh(thermalRingGeo, thermalRingMat);
    thermalRing.rotation.x = Math.PI / 2;
    thermalRing.position.y = 0.294;
    peltierGroup.add(thermalRing);

    // Peltier TEG Element (White Alumina Ceramic Plate)
    const tegGeo = new THREE.BoxGeometry(0.22, 0.02, 0.22);
    const tegMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.2 });
    const tegMesh = new THREE.Mesh(tegGeo, tegMat);
    tegMesh.position.y = 0.31;
    tegMesh.userData = { id: 'peltier_teg' };
    peltierGroup.add(tegMesh);

    // Metallic Copper Heat Pipes
    for (const hx of [-0.07, 0, 0.07]) {
      const pipe = new THREE.Mesh(
        new THREE.CylinderGeometry(0.008, 0.008, 0.28, 8),
        new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.2, metalness: 0.9 })
      );
      pipe.rotation.z = Math.PI / 2;
      pipe.position.set(0, 0.325, hx);
      peltierGroup.add(pipe);
    }

    // Aluminum Multi-Fin Heat Sink (Teal/Turquoise Anodized Cold junction)
    const heatsinkGroup = new THREE.Group();
    heatsinkGroup.position.set(0, 0.34, 0);

    const baseSink = new THREE.Mesh(
      new THREE.BoxGeometry(0.3, 0.02, 0.3),
      new THREE.MeshStandardMaterial({ color: 0x0f766e, roughness: 0.3, metalness: 0.85 })
    );
    heatsinkGroup.add(baseSink);

    // 10 Anodized Cooling Fins
    for (let f = -0.13; f <= 0.13; f += 0.03) {
      const fin = new THREE.Mesh(
        new THREE.BoxGeometry(0.008, 0.14, 0.3),
        new THREE.MeshStandardMaterial({ color: 0x0d9488, roughness: 0.25, metalness: 0.85 })
      );
      fin.position.set(f, 0.08, 0);
      fin.castShadow = true;
      heatsinkGroup.add(fin);
    }

    peltierGroup.add(heatsinkGroup);
    scene.add(peltierGroup);
    explodedGroupsRef.current.peltierGroup = peltierGroup;

    // -------------------------------------------------------------
    // SUBSYSTEM 5: ESP32-CAM AI Security Surveillance Node
    // -------------------------------------------------------------
    const securityGroup = new THREE.Group();
    securityGroup.position.set(2.0, 0.0, -0.6);
    securityGroup.userData = { id: 'esp32_cam' };

    // Tripod pole mount
    const camPoleGeo = new THREE.CylinderGeometry(0.04, 0.05, 1.3, 16);
    const camPole = new THREE.Mesh(camPoleGeo, alumMat);
    camPole.position.y = 0.65;
    camPole.castShadow = true;
    securityGroup.add(camPole);

    // Pan-tilt swivel camera head
    const camHead = new THREE.Group();
    camHead.position.set(0, 1.32, 0);

    // Weatherproof camera enclosure (Arctic White)
    const camBoxGeo = new THREE.BoxGeometry(0.24, 0.18, 0.3);
    const camBoxMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.25 });
    const camBox = new THREE.Mesh(camBoxGeo, camBoxMat);
    camBox.castShadow = true;
    camHead.add(camBox);

    // Front black faceplate
    const faceplate = new THREE.Mesh(
      new THREE.BoxGeometry(0.22, 0.16, 0.01),
      new THREE.MeshStandardMaterial({ color: 0x09090b, roughness: 0.7 })
    );
    faceplate.position.z = 0.152;
    camHead.add(faceplate);

    // OV2640 Lens bezel & optics (Iridescent violet/sapphire coated lens)
    const lensBezel = new THREE.Mesh(
      new THREE.CylinderGeometry(0.04, 0.04, 0.04, 16),
      new THREE.MeshStandardMaterial({ color: 0x27272a, roughness: 0.2, metalness: 0.8 })
    );
    lensBezel.rotation.x = Math.PI / 2;
    lensBezel.position.set(0, 0.02, 0.17);
    camHead.add(lensBezel);

    const lensGlass = new THREE.Mesh(
      new THREE.SphereGeometry(0.035, 16, 16),
      new THREE.MeshPhysicalMaterial({
        color: 0x6366f1,
        roughness: 0.05,
        transmission: 0.85,
        reflectivity: 0.95
      })
    );
    lensGlass.position.set(0, 0.02, 0.18);
    camHead.add(lensGlass);

    // PIR Motion Sensor Dome (Faceted white Fresnel dome)
    const pirDome = new THREE.Mesh(
      new THREE.SphereGeometry(0.025, 12, 12),
      new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5, opacity: 0.85, transparent: true })
    );
    pirDome.position.set(-0.06, -0.04, 0.16);
    camHead.add(pirDome);

    // High-Intensity Flash / Status LED
    const flashLed = new THREE.Mesh(
      new THREE.BoxGeometry(0.025, 0.025, 0.01),
      new THREE.MeshStandardMaterial({ color: 0x34d399, emissive: 0x10b981, emissiveIntensity: 0.8 })
    );
    flashLed.position.set(0.06, -0.04, 0.16);
    camHead.add(flashLed);
    animatedRefs.current.cameraLed = flashLed;

    // Piezo Warning Buzzer cylinder on top (Brass Acoustic Diaphragm)
    const buzzer = new THREE.Mesh(
      new THREE.CylinderGeometry(0.045, 0.045, 0.05, 16),
      new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.3, metalness: 0.8 })
    );
    buzzer.position.set(0, 0.11, -0.05);
    camHead.add(buzzer);

    securityGroup.add(camHead);
    animatedRefs.current.cameraHead = camHead;

    // RC522 RFID 13.56 MHz Touch Attendance Scanner Module
    const rfidGroup = new THREE.Group();
    rfidGroup.position.set(-0.24, 0.75, 0.08);
    rfidGroup.rotation.y = 0.35;
    rfidGroup.userData = { id: 'rfid_reader' };

    // Mounting bracket arm to pole
    const rfidArmGeo = new THREE.CylinderGeometry(0.015, 0.015, 0.22, 8);
    const rfidArm = new THREE.Mesh(rfidArmGeo, alumMat);
    rfidArm.rotation.z = Math.PI / 2;
    rfidArm.position.set(0.11, 0, 0);
    rfidGroup.add(rfidArm);

    // Deep Cobalt Blue RC522 PCB
    const rfidPcbGeo = new THREE.BoxGeometry(0.2, 0.3, 0.015);
    const rfidPcbMat = new THREE.MeshStandardMaterial({
      color: 0x1d4ed8,
      roughness: 0.3,
      metalness: 0.2
    });
    const rfidPcb = new THREE.Mesh(rfidPcbGeo, rfidPcbMat);
    rfidPcb.userData = { id: 'rfid_reader' };
    rfidPcb.castShadow = true;
    rfidGroup.add(rfidPcb);

    // Golden Antenna Induction Coil loop on PCB
    const coilGeo = new THREE.BoxGeometry(0.16, 0.22, 0.018);
    const coilMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      roughness: 0.25,
      metalness: 0.85
    });
    const coil = new THREE.Mesh(coilGeo, coilMat);
    coil.position.z = 0.002;
    coil.userData = { id: 'rfid_reader' };
    rfidGroup.add(coil);

    // MFRC522 IC Black QFN Package
    const mfrcIc = new THREE.Mesh(
      new THREE.BoxGeometry(0.05, 0.05, 0.022),
      new THREE.MeshStandardMaterial({ color: 0x09090b, roughness: 0.6 })
    );
    mfrcIc.position.set(0, -0.06, 0.005);
    rfidGroup.add(mfrcIc);

    // Glowing Emerald RFID Polling Status LED
    const rfidLed = new THREE.Mesh(
      new THREE.BoxGeometry(0.015, 0.015, 0.02),
      new THREE.MeshStandardMaterial({ color: 0x10b981, emissive: 0x10b981, emissiveIntensity: 0.9 })
    );
    rfidLed.position.set(0.07, 0.12, 0.01);
    rfidGroup.add(rfidLed);

    // Floating Worker RFID Blue Access Card Tag hovering at scanner
    const badgeGeo = new THREE.BoxGeometry(0.15, 0.24, 0.008);
    const badgeMat = new THREE.MeshStandardMaterial({
      color: 0x0284c7,
      roughness: 0.2,
      metalness: 0.1
    });
    const badge = new THREE.Mesh(badgeGeo, badgeMat);
    badge.position.set(0, 0, 0.06);
    badge.rotation.z = 0.05;
    badge.userData = { id: 'rfid_reader' };
    rfidGroup.add(badge);

    securityGroup.add(rfidGroup);

    scene.add(securityGroup);
    explodedGroupsRef.current.securityGroup = securityGroup;

    // -------------------------------------------------------------
    // SUBSYSTEM 6: Agrivoltaic Crop Plant & Soil Moisture Sensor
    // -------------------------------------------------------------
    const soilGroup = new THREE.Group();
    soilGroup.position.set(0.5, 0.0, 1.5);
    soilGroup.userData = { id: 'soil_probe' };

    // Soil container beaker
    const beakerGeo = new THREE.CylinderGeometry(0.18, 0.15, 0.28, 20);
    const beakerMat = new THREE.MeshPhysicalMaterial({
      color: 0x94a3b8,
      roughness: 0.1,
      transmission: 0.85,
      thickness: 0.03,
      transparent: true,
      opacity: 0.7
    });
    const beaker = new THREE.Mesh(beakerGeo, beakerMat);
    beaker.position.y = 0.14;
    soilGroup.add(beaker);

    // Dark organic potting soil inside
    const soilBlock = new THREE.Mesh(
      new THREE.CylinderGeometry(0.17, 0.14, 0.24, 20),
      new THREE.MeshStandardMaterial({ color: 0x271e16, roughness: 0.98 })
    );
    soilBlock.position.y = 0.13;
    soilGroup.add(soilBlock);

    // Sculpted Green Plant Seedling (Living crop under agricultural solar)
    const plantMesh = new THREE.Group();
    plantMesh.position.set(-0.04, 0.25, -0.02);

    // Plant Stem
    const stemGeo = new THREE.CylinderGeometry(0.006, 0.008, 0.18, 8);
    const stemMat = new THREE.MeshStandardMaterial({ color: 0x16a34a, roughness: 0.4 });
    const stem = new THREE.Mesh(stemGeo, stemMat);
    stem.position.y = 0.09;
    stem.rotation.z = -0.1;
    plantMesh.add(stem);

    // Vibrant Green Crop Leaves
    const leafGeo = new THREE.SphereGeometry(0.045, 12, 8);
    leafGeo.scale(1.0, 0.2, 2.0);
    const leafMat = new THREE.MeshStandardMaterial({
      color: 0x22c55e,
      roughness: 0.35,
      metalness: 0.05
    });

    const leaf1 = new THREE.Mesh(leafGeo, leafMat);
    leaf1.position.set(0.04, 0.15, 0.02);
    leaf1.rotation.set(0.3, 0.4, -0.6);
    plantMesh.add(leaf1);

    const leaf2 = new THREE.Mesh(leafGeo, leafMat);
    leaf2.position.set(-0.04, 0.14, -0.02);
    leaf2.rotation.set(-0.2, -0.5, 0.6);
    plantMesh.add(leaf2);

    soilGroup.add(plantMesh);

    // Capacitive Soil Moisture Sensor v1.2 PCB Blade
    const probeMesh = new THREE.Group();
    probeMesh.position.set(0.05, 0.18, 0.02);

    const probePcb = new THREE.Mesh(
      new THREE.BoxGeometry(0.05, 0.25, 0.008),
      new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.4 })
    );
    probeMesh.add(probePcb);

    // Gold sensor fork tips
    const fork = new THREE.Mesh(
      new THREE.BoxGeometry(0.04, 0.08, 0.009),
      new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.25, metalness: 0.9 })
    );
    fork.position.y = -0.08;
    probeMesh.add(fork);

    soilGroup.add(probeMesh);
    scene.add(soilGroup);
    explodedGroupsRef.current.soilGroup = soilGroup;

    // -------------------------------------------------------------
    // SUBSYSTEM 7: 12V Battery & Solar Charge Controller
    // -------------------------------------------------------------
    const powerGroup = new THREE.Group();
    powerGroup.position.set(1.2, 0.0, -0.6);
    powerGroup.userData = { id: 'battery_controller' };

    // 12V Deep Cycle Lead-Acid / LiFePO4 Battery Case
    const battGeo = new THREE.BoxGeometry(0.7, 0.45, 0.45);
    const battMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.35, metalness: 0.25 });
    const batt = new THREE.Mesh(battGeo, battMat);
    batt.position.y = 0.23;
    batt.castShadow = true;
    batt.userData = { id: 'battery_controller' };
    powerGroup.add(batt);

    // Brass Positive (+) Red & Negative (-) Black Terminals
    const redTerm = new THREE.Mesh(
      new THREE.CylinderGeometry(0.025, 0.03, 0.04, 12),
      new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.3, metalness: 0.8 })
    );
    redTerm.position.set(0.24, 0.47, 0);
    powerGroup.add(redTerm);

    const blackTerm = new THREE.Mesh(
      new THREE.CylinderGeometry(0.025, 0.03, 0.04, 12),
      new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.3, metalness: 0.8 })
    );
    blackTerm.position.set(-0.24, 0.47, 0);
    powerGroup.add(blackTerm);

    // Glowing LED Battery Level Bar Graph (5 Segments)
    const batteryBars: THREE.Mesh[] = [];
    const barColors = [0xef4444, 0xf59e0b, 0xeab308, 0x22c55e, 0x10b981];
    for (let bi = 0; bi < 5; bi++) {
      const barMesh = new THREE.Mesh(
        new THREE.BoxGeometry(0.06, 0.015, 0.01),
        new THREE.MeshStandardMaterial({
          color: barColors[bi],
          emissive: barColors[bi],
          emissiveIntensity: 0.8
        })
      );
      barMesh.position.set(-0.15 + bi * 0.075, 0.28, 0.23);
      powerGroup.add(barMesh);
      batteryBars.push(barMesh);
    }
    animatedRefs.current.batteryBars = batteryBars;

    // Solar Charge Controller mounted on top of battery bench
    const ctrlGroup = new THREE.Group();
    ctrlGroup.position.set(0, 0.52, 0);

    const ctrlCase = new THREE.Mesh(
      new THREE.BoxGeometry(0.5, 0.12, 0.35),
      new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.35, metalness: 0.3 })
    );
    ctrlGroup.add(ctrlCase);

    // Digital Backlit LCD Screen
    const lcdScreen = new THREE.Mesh(
      new THREE.PlaneGeometry(0.32, 0.16),
      new THREE.MeshStandardMaterial({
        map: proceduralTextures.lcdTex,
        roughness: 0.08,
        emissive: 0x0284c7,
        emissiveIntensity: 0.7
      })
    );
    lcdScreen.rotation.x = -Math.PI / 2;
    lcdScreen.position.set(0, 0.062, -0.04);
    ctrlGroup.add(lcdScreen);

    // Dual 5V USB output ports
    for (const ux of [-0.08, 0.08]) {
      const usbPort = new THREE.Mesh(
        new THREE.BoxGeometry(0.05, 0.03, 0.015),
        new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.15, metalness: 0.9 })
      );
      usbPort.position.set(ux, 0.02, 0.176);
      ctrlGroup.add(usbPort);
    }

    powerGroup.add(ctrlGroup);
    scene.add(powerGroup);
    explodedGroupsRef.current.powerGroup = powerGroup;

    // Cache all mesh original materials for wireframe/thermal mode swaps
    allMeshMaterialsRef.current.clear();
    scene.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        allMeshMaterialsRef.current.set(obj, obj.material);
      }
    });

    // -------------------------------------------------------------
    // Animation Loop
    // -------------------------------------------------------------
    let lastTime = performance.now();

    const animate = (now: number) => {
      animationFrameId.current = requestAnimationFrame(animate);
      const dt = Math.min((now - lastTime) / 1000, 0.1);
      lastTime = now;

      // 1. Windmill rotation
      if (animatedRefs.current.windmillRotor && isWindmillSpinning) {
        animatedRefs.current.windmillRotor.rotation.z += dt * 4.2 * windmillSpeed;
      }

      // 2. Wiper cleaning movement & spray particles
      if (animatedRefs.current.wiperMesh) {
        if (isWiperAnimating) {
          animatedRefs.current.wiperProgress = (animatedRefs.current.wiperProgress || 0) + dt * (animatedRefs.current.wiperDirection || 1) * 0.9;
          if (animatedRefs.current.wiperProgress > 1) {
            animatedRefs.current.wiperProgress = 1;
            animatedRefs.current.wiperDirection = -1;
          } else if (animatedRefs.current.wiperProgress < -1) {
            animatedRefs.current.wiperProgress = -1;
            animatedRefs.current.wiperDirection = 1;
          }
          animatedRefs.current.wiperMesh.position.x = animatedRefs.current.wiperProgress * 0.58;

          if (animatedRefs.current.sprayParticles) {
            (animatedRefs.current.sprayParticles.material as THREE.PointsMaterial).opacity = 0.85;
          }
        } else {
          animatedRefs.current.wiperMesh.position.x = THREE.MathUtils.damp(
            animatedRefs.current.wiperMesh.position.x,
            -0.62,
            4,
            dt
          );
          if (animatedRefs.current.sprayParticles) {
            (animatedRefs.current.sprayParticles.material as THREE.PointsMaterial).opacity = THREE.MathUtils.damp(
              (animatedRefs.current.sprayParticles.material as THREE.PointsMaterial).opacity,
              0.0,
              6,
              dt
            );
          }
        }
      }

      // 3. ESP32 Telemetry Status LED Blink (2.5 Hz Heartbeat)
      if (animatedRefs.current.esp32LedTx) {
        const blink = Math.sin(now * 0.006) > 0.3;
        (animatedRefs.current.esp32LedTx.material as THREE.MeshBasicMaterial).color.setHex(
          blink ? 0x22c55e : 0x064e3b
        );
      }

      // 4. ESP32-CAM Surveillance sweep pan
      if (animatedRefs.current.cameraHead) {
        animatedRefs.current.cameraYaw = (animatedRefs.current.cameraYaw || 0) + dt * (animatedRefs.current.cameraYawDir || 1) * 0.25;
        if (animatedRefs.current.cameraYaw > 0.6) {
          animatedRefs.current.cameraYaw = 0.6;
          animatedRefs.current.cameraYawDir = -1;
        } else if (animatedRefs.current.cameraYaw < -0.6) {
          animatedRefs.current.cameraYaw = -0.6;
          animatedRefs.current.cameraYawDir = 1;
        }
        animatedRefs.current.cameraHead.rotation.y = animatedRefs.current.cameraYaw;
      }

      // 5. Smooth Camera Damping to target preset / inspected part
      if (cameraTargetRef.current.active) {
        camera.position.x = THREE.MathUtils.damp(camera.position.x, cameraTargetRef.current.pos.x, 3.5, dt);
        camera.position.y = THREE.MathUtils.damp(camera.position.y, cameraTargetRef.current.pos.y, 3.5, dt);
        camera.position.z = THREE.MathUtils.damp(camera.position.z, cameraTargetRef.current.pos.z, 3.5, dt);
        controls.target.x = THREE.MathUtils.damp(controls.target.x, cameraTargetRef.current.look.x, 3.5, dt);
        controls.target.y = THREE.MathUtils.damp(controls.target.y, cameraTargetRef.current.look.y, 3.5, dt);
        controls.target.z = THREE.MathUtils.damp(controls.target.z, cameraTargetRef.current.look.z, 3.5, dt);
        if (camera.position.distanceTo(cameraTargetRef.current.pos) < 0.05) {
          cameraTargetRef.current.active = false;
        }
      }

      // Auto-rotation handling
      if (controlsRef.current) {
        controlsRef.current.autoRotate = isAutoRotating;
        controlsRef.current.autoRotateSpeed = 0.8;
      }

      controls.update();
      renderer.render(scene, camera);
    };

    animationFrameId.current = requestAnimationFrame(animate);

    // Resize handler
    const handleResize = () => {
      if (!mountRef.current || !renderer || !camera) return;
      const nw = mountRef.current.clientWidth;
      const nh = mountRef.current.clientHeight;
      camera.aspect = nw / nh;
      camera.updateProjectionMatrix();
      renderer.setSize(nw, nh);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
      controls.dispose();
      renderer.dispose();
    };
  }, [proceduralTextures, isWindmillSpinning, windmillSpeed, isWiperAnimating, isAutoRotating]);

  // Handle Raycasting Part Selection on Click
  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!mountRef.current || !cameraRef.current || !sceneRef.current) return;
    const rect = mountRef.current.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(x, y), cameraRef.current);

    const intersects = raycaster.intersectObjects(sceneRef.current.children, true);
    if (intersects.length > 0) {
      let current: THREE.Object3D | null = intersects[0].object;
      let matchedPartId: string | null = null;
      while (current && !matchedPartId) {
        if (current.userData && current.userData.id) {
          matchedPartId = current.userData.id;
        }
        current = current.parent;
      }
      if (matchedPartId && HARDWARE_PARTS_INFO[matchedPartId]) {
        setSelectedPartId(matchedPartId);
        setIsAutoRotating(false); // Pause auto-rotation when inspecting a part
        const part = HARDWARE_PARTS_INFO[matchedPartId];
        cameraTargetRef.current = {
          pos: part.cameraPosition.clone(),
          look: part.targetPosition.clone(),
          active: true
        };
      }
    }
  };

  // Exploded View Separation Handler
  useEffect(() => {
    const groups = explodedGroupsRef.current;
    const ratio = explodedRatio; // 0 to 1

    if (groups.solarGroup) {
      groups.solarGroup.position.set(-1.0 - ratio * 1.2, ratio * 0.5, -ratio * 0.4);
    }
    if (groups.iotGroup) {
      groups.iotGroup.position.set(1.2 + ratio * 1.1, ratio * 0.4, 0.8 + ratio * 0.8);
    }
    if (groups.windmillGroup) {
      groups.windmillGroup.position.set(-2.2 - ratio * 1.4, ratio * 0.6, -1.2 - ratio * 1.0);
    }
    if (groups.peltierGroup) {
      groups.peltierGroup.position.set(-0.6 - ratio * 0.5, ratio * 0.4, -1.2 - ratio * 1.1);
    }
    if (groups.securityGroup) {
      groups.securityGroup.position.set(2.0 + ratio * 1.3, ratio * 0.5, -0.6 - ratio * 0.8);
    }
    if (groups.powerGroup) {
      groups.powerGroup.position.set(1.2 + ratio * 0.8, ratio * 0.3, -0.6 - ratio * 1.2);
    }
    if (groups.soilGroup) {
      groups.soilGroup.position.set(0.5, ratio * 0.3, 1.5 + ratio * 1.1);
    }
  }, [explodedRatio]);

  // Render Mode Toggle (PBR vs Wireframe vs Thermal)
  useEffect(() => {
    if (!sceneRef.current) return;
    allMeshMaterialsRef.current.forEach((origMat, mesh) => {
      if (renderMode === 'wireframe') {
        mesh.material = new THREE.MeshBasicMaterial({
          color: 0x38bdf8,
          wireframe: true
        });
      } else if (renderMode === 'thermal') {
        let tempColor = 0x3b82f6; // Cold blue
        if (mesh.userData?.id === 'solar_panel') tempColor = 0xf97316; // Warm amber
        if (mesh.userData?.id === 'peltier_teg') tempColor = 0xef4444; // Hot red
        if (mesh.userData?.id === 'esp32_board') tempColor = 0xeab308; // Yellow
        mesh.material = new THREE.MeshStandardMaterial({
          color: tempColor,
          roughness: 0.5,
          emissive: tempColor,
          emissiveIntensity: 0.3
        });
      } else {
        mesh.material = origMat;
      }
    });
  }, [renderMode]);

  // Dynamic Theme Mode Transition (Studio Glow vs Daylight Farm vs Golden Sunset vs Cyberpunk Neon)
  useEffect(() => {
    if (!sceneRef.current) return;
    const scene = sceneRef.current;
    const ringMat = animatedRefs.current.neonRingMat;
    const stageMat = animatedRefs.current.stageMat;

    switch (themeMode) {
      case 'studio':
        scene.background = new THREE.Color('#0b1120');
        if (keyLightRef.current) {
          keyLightRef.current.color.setHex(0xfff7ed);
          keyLightRef.current.intensity = 2.4;
        }
        if (fillLightRef.current) {
          fillLightRef.current.color.setHex(0x93c5fd);
          fillLightRef.current.intensity = 1.1;
        }
        if (rimLightRef.current) {
          rimLightRef.current.color.setHex(0x38bdf8);
          rimLightRef.current.intensity = 1.5;
        }
        if (hemiLightRef.current) {
          hemiLightRef.current.color.setHex(0xe0f2fe);
          hemiLightRef.current.groundColor.setHex(0x1e293b);
          hemiLightRef.current.intensity = 1.2;
        }
        if (ringMat) {
          ringMat.color.setHex(0x38bdf8);
          ringMat.emissive.setHex(0x38bdf8);
        }
        if (stageMat) {
          stageMat.color.setHex(0x111827);
        }
        break;

      case 'daylight':
        scene.background = new THREE.Color('#e0f2fe'); // Crisp sky blue
        if (keyLightRef.current) {
          keyLightRef.current.color.setHex(0xfffaed);
          keyLightRef.current.intensity = 2.8; // Bright golden sunlight
        }
        if (fillLightRef.current) {
          fillLightRef.current.color.setHex(0xbbf7d0); // Warm meadow bounce
          fillLightRef.current.intensity = 1.2;
        }
        if (rimLightRef.current) {
          rimLightRef.current.color.setHex(0x38bdf8);
          rimLightRef.current.intensity = 1.0;
        }
        if (hemiLightRef.current) {
          hemiLightRef.current.color.setHex(0xdbeafe);
          hemiLightRef.current.groundColor.setHex(0xecfdf5);
          hemiLightRef.current.intensity = 1.4;
        }
        if (ringMat) {
          ringMat.color.setHex(0x10b981);
          ringMat.emissive.setHex(0x10b981);
        }
        if (stageMat) {
          stageMat.color.setHex(0xf8fafc); // Clean white ceramic stage
        }
        break;

      case 'sunset':
        scene.background = new THREE.Color('#1e1b4b'); // Deep dusk twilight
        if (keyLightRef.current) {
          keyLightRef.current.color.setHex(0xf59e0b); // Rich warm sunset amber
          keyLightRef.current.intensity = 2.6;
        }
        if (fillLightRef.current) {
          fillLightRef.current.color.setHex(0xf43f5e);
          fillLightRef.current.intensity = 1.0;
        }
        if (rimLightRef.current) {
          rimLightRef.current.color.setHex(0xfbbf24);
          rimLightRef.current.intensity = 1.6;
        }
        if (hemiLightRef.current) {
          hemiLightRef.current.color.setHex(0xfef08a);
          hemiLightRef.current.groundColor.setHex(0x451a03);
          hemiLightRef.current.intensity = 1.1;
        }
        if (ringMat) {
          ringMat.color.setHex(0xf97316);
          ringMat.emissive.setHex(0xf97316);
        }
        if (stageMat) {
          stageMat.color.setHex(0x18181b);
        }
        break;

      case 'cyberpunk':
        scene.background = new THREE.Color('#030712'); // Pure deep obsidian
        if (keyLightRef.current) {
          keyLightRef.current.color.setHex(0x06b6d4); // Neon electric cyan
          keyLightRef.current.intensity = 2.0;
        }
        if (fillLightRef.current) {
          fillLightRef.current.color.setHex(0x8b5cf6); // Electric purple
          fillLightRef.current.intensity = 1.2;
        }
        if (rimLightRef.current) {
          rimLightRef.current.color.setHex(0xec4899); // Neon magenta rim
          rimLightRef.current.intensity = 2.2;
        }
        if (hemiLightRef.current) {
          hemiLightRef.current.color.setHex(0x38bdf8);
          hemiLightRef.current.groundColor.setHex(0x4c1d95);
          hemiLightRef.current.intensity = 1.0;
        }
        if (ringMat) {
          ringMat.color.setHex(0xa855f7);
          ringMat.emissive.setHex(0xa855f7);
        }
        if (stageMat) {
          stageMat.color.setHex(0x0a0a0f);
        }
        break;

      case 'emerald':
        scene.background = new THREE.Color('#022c22'); // Deep forest emerald
        if (keyLightRef.current) {
          keyLightRef.current.color.setHex(0xfef08a); // Warm golden sunbeam
          keyLightRef.current.intensity = 2.6;
        }
        if (fillLightRef.current) {
          fillLightRef.current.color.setHex(0x6ee7b7); // Lush mint glow
          fillLightRef.current.intensity = 1.3;
        }
        if (rimLightRef.current) {
          rimLightRef.current.color.setHex(0x34d399); // Radiant emerald rim
          rimLightRef.current.intensity = 1.8;
        }
        if (hemiLightRef.current) {
          hemiLightRef.current.color.setHex(0xa7f3d0);
          hemiLightRef.current.groundColor.setHex(0x064e3b);
          hemiLightRef.current.intensity = 1.3;
        }
        if (ringMat) {
          ringMat.color.setHex(0x10b981);
          ringMat.emissive.setHex(0x10b981);
        }
        if (stageMat) {
          stageMat.color.setHex(0x064e3b);
        }
        break;

      case 'aurora':
        scene.background = new THREE.Color('#03071e'); // Deep cosmic midnight
        if (keyLightRef.current) {
          keyLightRef.current.color.setHex(0x38bdf8); // Sky blue star
          keyLightRef.current.intensity = 2.2;
        }
        if (fillLightRef.current) {
          fillLightRef.current.color.setHex(0xc084fc); // Radiant violet
          fillLightRef.current.intensity = 1.4;
        }
        if (rimLightRef.current) {
          rimLightRef.current.color.setHex(0x2dd4bf); // Aurora turquoise
          rimLightRef.current.intensity = 2.0;
        }
        if (hemiLightRef.current) {
          hemiLightRef.current.color.setHex(0x818cf8);
          hemiLightRef.current.groundColor.setHex(0x0f172a);
          hemiLightRef.current.intensity = 1.2;
        }
        if (ringMat) {
          ringMat.color.setHex(0x2dd4bf);
          ringMat.emissive.setHex(0x2dd4bf);
        }
        if (stageMat) {
          stageMat.color.setHex(0x0f172a);
        }
        break;
    }
  }, [themeMode]);

  // Camera Preset Transitions
  const handleSelectPreset = (preset: 'all' | 'solar' | 'iot' | 'windmill' | 'security' | 'power') => {
    setActivePreset(preset);
    setSelectedPartId(null);
    let targetLook = new THREE.Vector3(0, 0.8, 0);
    let targetPos = new THREE.Vector3(0, 3.2, 5.0);

    switch (preset) {
      case 'all':
        targetPos = new THREE.Vector3(0, 3.4, 5.2);
        targetLook = new THREE.Vector3(0, 0.8, 0);
        break;
      case 'solar':
        targetPos = new THREE.Vector3(-1.0, 2.5, 2.8);
        targetLook = new THREE.Vector3(-1.0, 1.2, 0.0);
        break;
      case 'iot':
        targetPos = new THREE.Vector3(1.2, 1.6, 2.1);
        targetLook = new THREE.Vector3(1.2, 0.35, 0.8);
        break;
      case 'windmill':
        targetPos = new THREE.Vector3(-2.2, 2.6, 1.0);
        targetLook = new THREE.Vector3(-2.2, 1.6, -1.2);
        break;
      case 'security':
        targetPos = new THREE.Vector3(2.0, 2.2, 1.2);
        targetLook = new THREE.Vector3(2.0, 1.35, -0.6);
        break;
      case 'power':
        targetPos = new THREE.Vector3(1.2, 1.8, 1.2);
        targetLook = new THREE.Vector3(1.2, 0.45, -0.6);
        break;
    }

    cameraTargetRef.current = {
      pos: targetPos,
      look: targetLook,
      active: true
    };
  };

  const selectedPart = selectedPartId ? HARDWARE_PARTS_INFO[selectedPartId] : null;

  return (
    <div className={`relative w-full overflow-hidden bg-zinc-950 font-sans select-none ${
      isFullscreen ? 'fixed inset-0 z-50 h-screen' : 'rounded-2xl border border-zinc-800 shadow-2xl min-h-[720px]'
    }`}>
      {/* 3D WebGL Canvas Viewport */}
      <div
        ref={mountRef}
        onPointerDown={handlePointerDown}
        className="w-full h-full min-h-[620px] cursor-grab active:cursor-grabbing outline-none"
      />

      {/* Top HUD Header: Minimal Title, Subsystem Spec Badges & Controls */}
      <div className="absolute top-4 left-4 right-4 flex items-center justify-between pointer-events-none z-10 gap-3 flex-wrap">
        {/* Left: Project Branding & Station Identity */}
        <div className="flex items-center gap-3 pointer-events-auto bg-zinc-900/90 border border-zinc-800/80 px-4 py-2.5 rounded-2xl shadow-xl backdrop-blur-md">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/20 text-black">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-white tracking-wide">
                {stationProfile?.stationName || 'Farm.IOT Hardware Rig'}
              </span>
              <span className="px-2 py-0.5 text-[10px] font-mono font-semibold rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                PHYSICAL 3D TWIN
              </span>
            </div>
            <div className="text-[11px] text-zinc-400 font-mono flex items-center gap-2">
              <span>ESP32 Core</span>
              <span>•</span>
              <span>Sapphire PV</span>
              <span>•</span>
              <span>Aero Turbine</span>
              <span>•</span>
              <span>AI Vision</span>
            </div>
          </div>
        </div>

        {/* Right: Quick Action Buttons (Atmosphere Theme, Auto-Rotate, Fullscreen, Reset) */}
        <div className="flex items-center gap-2 pointer-events-auto flex-wrap">
          {/* Atmosphere Theme Selector */}
          <div className="flex items-center gap-1 p-1 rounded-2xl bg-zinc-900/90 border border-zinc-800 shadow-lg backdrop-blur-md">
            {[
              { id: 'studio', label: 'Studio', icon: Sparkles, color: 'text-cyan-400' },
              { id: 'daylight', label: 'Sun', icon: Sun, color: 'text-amber-400' },
              { id: 'emerald', label: 'Emerald', icon: Sparkles, color: 'text-emerald-400' },
              { id: 'aurora', label: 'Aurora', icon: Palette, color: 'text-teal-400' },
              { id: 'sunset', label: 'Dusk', icon: Moon, color: 'text-orange-400' },
              { id: 'cyberpunk', label: 'Neon', icon: Palette, color: 'text-purple-400' }
            ].map((th) => {
              const Icon = th.icon;
              const isActive = themeMode === th.id;
              return (
                <button
                  key={th.id}
                  onClick={() => setThemeMode(th.id as ThemeMode)}
                  className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-medium transition cursor-pointer ${
                    isActive
                      ? 'bg-zinc-800 text-white shadow-sm ring-1 ring-zinc-700'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                  title={`Switch to ${th.label} Lighting Environment`}
                >
                  <Icon className={`w-3.5 h-3.5 ${th.color}`} />
                  <span className="hidden sm:inline text-[11px]">{th.label}</span>
                </button>
              );
            })}
          </div>

          {/* 360 Auto-Rotate Showcase Toggle */}
          <button
            onClick={() => setIsAutoRotating(!isAutoRotating)}
            className={`p-2.5 rounded-xl border transition shadow-lg backdrop-blur-md flex items-center gap-1.5 text-xs font-medium cursor-pointer ${
              isAutoRotating
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 ring-1 ring-amber-500/30'
                : 'bg-zinc-900/90 border-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-white'
            }`}
            title={isAutoRotating ? 'Pause 360° Auto-Orbit' : 'Start 360° Showcase Auto-Orbit'}
          >
            <RotateCw className={`w-4 h-4 ${isAutoRotating ? 'animate-spin' : ''}`} />
            <span className="hidden md:inline text-[11px]">360° Orbit</span>
          </button>

          {/* Reset Camera View */}
          <button
            onClick={() => handleSelectPreset('all')}
            className="p-2.5 rounded-xl bg-zinc-900/90 border border-zinc-800 hover:border-zinc-700 text-zinc-300 hover:text-white transition shadow-lg backdrop-blur-md cursor-pointer"
            title="Reset Camera to Full Station Overview"
          >
            <Compass className="w-4 h-4 text-zinc-300" />
          </button>

          {/* Fullscreen Toggle */}
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-2.5 rounded-xl bg-zinc-900/90 border border-zinc-800 hover:border-zinc-700 text-zinc-300 hover:text-white transition shadow-lg backdrop-blur-md cursor-pointer"
            title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen Studio View'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Selected Component Inspection Card (Glides in when user clicks any 3D part) */}
      {selectedPart && (
        <div className="absolute top-20 right-4 w-96 max-w-[calc(100vw-2rem)] bg-zinc-900/95 border border-zinc-700/80 rounded-2xl shadow-2xl p-5 z-20 backdrop-blur-lg animate-in fade-in slide-in-from-right-4 duration-200">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div>
              <span className="px-2 py-0.5 text-[10px] font-mono font-bold uppercase tracking-wider rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20">
                {selectedPart.subsystemLabel}
              </span>
              <h3 className="text-base font-bold text-white mt-1.5 leading-snug">
                {selectedPart.name}
              </h3>
            </div>
            <button
              onClick={() => setSelectedPartId(null)}
              className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-3 text-xs">
            {/* Role & Functional Description */}
            <div className="bg-zinc-950/60 p-3 rounded-xl border border-zinc-800/80">
              <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wide block mb-1">
                Engineering Role
              </span>
              <p className="text-zinc-300 leading-relaxed font-sans">
                {selectedPart.role}
              </p>
            </div>

            {/* Microcontroller Pinout */}
            <div className="bg-zinc-950/60 p-3 rounded-xl border border-zinc-800/80">
              <span className="text-[10px] font-semibold text-emerald-400 uppercase tracking-wide flex items-center gap-1.5 mb-1 font-mono">
                <Cpu className="w-3.5 h-3.5" /> GPIO Pinout &amp; Bus
              </span>
              <p className="text-zinc-200 font-mono text-[11px] leading-relaxed">
                {selectedPart.pins}
              </p>
            </div>

            {/* Operating Voltage & Specs */}
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div className="bg-zinc-950/60 p-2.5 rounded-xl border border-zinc-800/80">
                <span className="text-[10px] text-zinc-400 block mb-0.5">Voltage Level</span>
                <span className="font-semibold text-amber-300 font-mono">{selectedPart.voltage}</span>
              </div>
              <div className="bg-zinc-950/60 p-2.5 rounded-xl border border-zinc-800/80">
                <span className="text-[10px] text-zinc-400 block mb-0.5">Live Status</span>
                <span className="font-semibold text-emerald-400 flex items-center gap-1 font-mono">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  {selectedPart.status}
                </span>
              </div>
            </div>

            {/* Quick Navigation to Section */}
            <div className="pt-1 flex items-center gap-2">
              {selectedPart.subsystem === 'iot' && onNavigateToEsp32 && (
                <button
                  onClick={onNavigateToEsp32}
                  className="w-full py-2 px-3 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-semibold transition cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Cpu className="w-3.5 h-3.5" /> Open Firmware &amp; Pinout Hub
                </button>
              )}
              {selectedPart.id === 'rfid_reader' && onNavigateToWorkers ? (
                <button
                  onClick={onNavigateToWorkers}
                  className="w-full py-2 px-3 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/40 text-xs font-semibold transition cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Users className="w-3.5 h-3.5" /> Open Workers &amp; Attendance Hub
                </button>
              ) : selectedPart.subsystem === 'security' && onNavigateToSecurity ? (
                <button
                  onClick={onNavigateToSecurity}
                  className="w-full py-2 px-3 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-semibold transition cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Shield className="w-3.5 h-3.5" /> Open ESP32-CAM Security Hub
                </button>
              ) : null}
              {selectedPart.subsystem === 'windmill' && onNavigateToWindmill && (
                <button
                  onClick={onNavigateToWindmill}
                  className="w-full py-2 px-3 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs font-semibold transition cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Wind className="w-3.5 h-3.5" /> Open Windmill &amp; Peltier Hub
                </button>
              )}
              {selectedPart.subsystem === 'solar' && onNavigateToLive && (
                <button
                  onClick={onNavigateToLive}
                  className="w-full py-2 px-3 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 text-xs font-semibold transition cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Zap className="w-3.5 h-3.5" /> View Live Telemetry Stream
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Unified Bottom Control Dock */}
      <div className={`absolute bottom-4 left-1/2 -translate-x-1/2 w-[94%] max-w-[960px] z-20 transition-all duration-300 ${
        isControlsCollapsed ? 'translate-y-[calc(100%-42px)] opacity-90' : 'translate-y-0 opacity-100'
      }`}>
        <div className="bg-zinc-900/95 border border-zinc-800/90 rounded-2xl shadow-2xl p-3.5 backdrop-blur-xl">
          {/* Collapse / Expand Toggle Button */}
          <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-zinc-800/70">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-amber-400" /> 3D Hardware Rig Inspector
              </span>
              <span className="text-[10px] text-zinc-500 hidden sm:inline font-mono">
                Click any part in 3D to zoom &amp; view pinouts
              </span>
            </div>
            <button
              onClick={() => setIsControlsCollapsed(!isControlsCollapsed)}
              className="text-xs font-mono text-zinc-400 hover:text-white flex items-center gap-1 px-2.5 py-1 rounded-lg bg-zinc-800/60 hover:bg-zinc-800 transition cursor-pointer"
            >
              {isControlsCollapsed ? (
                <>
                  <ChevronUp className="w-3.5 h-3.5 text-amber-400" />
                  <span>Expand Controls</span>
                </>
              ) : (
                <>
                  <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Hide Dock</span>
                </>
              )}
            </button>
          </div>

          {/* Controls Body */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
            {/* 1. Exploded View Slider */}
            <div className="md:col-span-4 bg-zinc-950/50 p-2.5 rounded-xl border border-zinc-800/60">
              <div className="flex items-center justify-between text-[11px] mb-1.5">
                <span className="text-zinc-400 font-medium flex items-center gap-1">
                  <Layers className="w-3 h-3 text-cyan-400" /> Exploded View
                </span>
                <span className="font-mono text-cyan-400 font-semibold">
                  {Math.round(explodedRatio * 100)}%
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={explodedRatio}
                onChange={(e) => setExplodedRatio(parseFloat(e.target.value))}
                className="w-full accent-cyan-400 bg-zinc-800 h-1.5 rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-[9px] text-zinc-500 font-mono mt-1">
                <span>Assembled</span>
                <span>Exploded</span>
              </div>
            </div>

            {/* 2. Subsystem Camera Presets */}
            <div className="md:col-span-5 flex items-center gap-1.5 flex-wrap">
              {[
                { id: 'all', label: 'All Rig', icon: Compass },
                { id: 'solar', label: 'Solar/Wiper', icon: Zap },
                { id: 'iot', label: 'ESP32 Box', icon: Cpu },
                { id: 'windmill', label: 'Turbine', icon: Wind },
                { id: 'security', label: 'ESP-CAM', icon: Shield },
                { id: 'power', label: '12V Battery', icon: Battery }
              ].map((item) => {
                const Icon = item.icon;
                const isActive = activePreset === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleSelectPreset(item.id as any)}
                    className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-medium transition cursor-pointer ${
                      isActive
                        ? 'bg-amber-500 text-black font-semibold shadow-md shadow-amber-500/20'
                        : 'bg-zinc-800/70 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-700/50'
                    }`}
                  >
                    <Icon className="w-3 h-3" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>

            {/* 3. Real-Time Hardware Animation & Shader Finishes */}
            <div className="md:col-span-3 flex items-center justify-end gap-1.5">
              {/* Wiper Sweep Test Toggle */}
              <button
                onClick={() => setIsWiperAnimating(!isWiperAnimating)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium transition cursor-pointer ${
                  isWiperAnimating
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                    : 'bg-zinc-800/70 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-700/50'
                }`}
                title="Simulate automated squeegee sweep & spray nozzle activation"
              >
                <Droplets className="w-3.5 h-3.5 text-cyan-400" />
                <span>Wiper Test</span>
              </button>

              {/* Windmill Spin Speed Switcher */}
              <button
                onClick={() => {
                  if (windmillSpeed === 1.0) setWindmillSpeed(2.0);
                  else if (windmillSpeed === 2.0) setWindmillSpeed(0.5);
                  else setWindmillSpeed(1.0);
                }}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-mono bg-zinc-800/70 hover:bg-zinc-800 text-amber-300 border border-zinc-700/50 transition cursor-pointer"
                title="Change wind turbine generator RPM simulation"
              >
                <Wind className="w-3.5 h-3.5 text-amber-400" />
                <span>{windmillSpeed}x RPM</span>
              </button>

              {/* Render Finish (PBR vs Wireframe vs Thermal) */}
              <button
                onClick={() => {
                  if (renderMode === 'pbr') setRenderMode('wireframe');
                  else if (renderMode === 'wireframe') setRenderMode('thermal');
                  else setRenderMode('pbr');
                }}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium uppercase font-mono transition cursor-pointer ${
                  renderMode === 'pbr'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    : renderMode === 'thermal'
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                      : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                }`}
                title="Cycle material shaders: Photorealistic PBR -> Wireframe -> Thermal FLIR Heatmap"
              >
                <span>{renderMode}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
