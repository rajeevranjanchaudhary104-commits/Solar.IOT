import React, { useState, useEffect, useRef } from 'react';
import { 
  ShoppingBag, 
  Sun, 
  Zap, 
  Battery, 
  Layers, 
  ShieldCheck, 
  CheckCircle2, 
  Plus, 
  Minus, 
  Trash2, 
  Download, 
  Share2, 
  Sliders, 
  Sparkles, 
  Star, 
  ArrowRight, 
  RotateCcw, 
  Save, 
  Tag, 
  FileText, 
  ExternalLink,
  Search,
  Filter,
  Check,
  Package,
  Wrench,
  Cpu,
  Settings,
  Edit3,
  MessageCircle,
  Phone,
  Mail,
  QrCode,
  Percent,
  X,
  AlertTriangle,
  Megaphone,
  Truck,
  Upload,
  Camera,
  Image as ImageIcon
} from 'lucide-react';
import { StoreProduct, StoreSettingsData } from '../types/solar';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { OWNER_EMAILS } from './ResearchMode';
import confetti from 'canvas-confetti';

interface SolarStoreProps {
  user?: any;
  onRequireSignIn?: () => void;
  onNavigateToCalculator?: () => void;
}

export const DEFAULT_STORE_SETTINGS: StoreSettingsData = {
  storeName: 'Farm.IOT Certified Hardware & Procurement Center',
  storeTagline: 'Buy Solar Panels, Inverters, Batteries & Smart IoT Kits',
  storeDescription: 'Procure certified Tier-1 Mono PERC & TOPCon solar modules, high-efficiency hybrid MPPT inverters, long-life LiFePO4 batteries, and genuine Farm.IOT automated motorized squeegee wiper hardware.',
  shippingNotice: 'Estimated dispatch within 24-48 hours. Delivery in 3-5 business days across India.',
  announcementEnabled: true,
  announcementText: '⚡ Special Engineering Offer: Genuine Farm.IOT Wiper Kits & LiFePO4 Battery Storage Banks in stock with 25-Year Manufacturer Warranties!',
  announcementBadge: 'Exclusive Offer',
};

const DEFAULT_STORE_PRODUCTS: StoreProduct[] = [
  // 1. SOLAR PANELS
  {
    id: 'panel_waaree_540',
    name: 'Waaree 540W Bifacial Mono PERC Half-Cut Module',
    brand: 'Waaree Energies',
    category: 'panels',
    priceInr: 18500,
    rating: 4.9,
    reviewsCount: 148,
    capacityLabel: '540 Watts',
    specs: {
      'Efficiency': '21.4%',
      'Cell Type': 'Monocrystalline PERC (144 Half-Cells)',
      'Bifacial Gain': 'Up to +25% rear generation',
      'Operating Voltage (Vmp)': '41.8V',
      'Current (Imp)': '12.92A',
      'Dimensions': '2278 × 1134 × 35 mm',
      'Weight': '28.5 kg'
    },
    warranty: '25-Year Linear Power Warranty (12-Yr Product)',
    efficiency: '21.4%',
    inStock: true,
    featured: true,
    badge: 'Best Seller',
    image: 'https://images.unsplash.com/photo-1508873696983-2df5293cb32f?auto=format&fit=crop&w=800&q=80',
    description: 'Tier-1 dual-glass bifacial solar panel delivering maximum harvest from front and reflected ground albedo sunlight. IP68 junction box.'
  },
  {
    id: 'panel_tata_400',
    name: 'Tata Power Solar 400W Monocrystalline PV Panel',
    brand: 'Tata Power Solar',
    category: 'panels',
    priceInr: 14800,
    rating: 4.8,
    reviewsCount: 112,
    capacityLabel: '400 Watts',
    specs: {
      'Efficiency': '20.2%',
      'Cell Type': 'Grade-A Mono PERC',
      'Operating Voltage (Vmp)': '40.2V',
      'Current (Imp)': '9.95A',
      'Frame': 'Anodized Aluminum Alloy',
      'Wind Load': '2400 Pa / Snow 5400 Pa'
    },
    warranty: '25-Year Performance Warranty',
    efficiency: '20.2%',
    inStock: true,
    image: 'https://images.unsplash.com/photo-1509391365360-2e959784a276?auto=format&fit=crop&w=800&q=80',
    description: 'High reliability rooftop solar panel engineered for severe Indian climatic conditions, low-light morning absorption, and anti-PID resistance.'
  },
  {
    id: 'panel_adani_585',
    name: 'Adani Solar 585W N-Type TOPCon Dual-Glass Panel',
    brand: 'Adani Solar',
    category: 'panels',
    priceInr: 21200,
    rating: 5.0,
    reviewsCount: 64,
    capacityLabel: '585 Watts',
    specs: {
      'Efficiency': '22.6%',
      'Cell Type': 'N-Type TOPCon 16BB',
      'Temperature Coeff': '-0.30% / °C (Lower heat loss)',
      'Operating Voltage (Vmp)': '43.2V',
      'Current (Imp)': '13.55A'
    },
    warranty: '30-Year Linear Output Warranty',
    efficiency: '22.6%',
    inStock: true,
    featured: true,
    badge: 'Next-Gen TOPCon',
    image: 'https://images.unsplash.com/photo-1558449028-b53a39d100fc?auto=format&fit=crop&w=800&q=80',
    description: 'Next-generation N-Type TOPCon technology delivering lower temperature derating and superior power density for high-temperature regions.'
  },
  {
    id: 'panel_loom_100',
    name: 'Loom Solar 100W / 12V Mono Perc Panel (Compact / Test Rig)',
    brand: 'Loom Solar',
    category: 'panels',
    priceInr: 4200,
    rating: 4.7,
    reviewsCount: 220,
    capacityLabel: '100 Watts (12V)',
    specs: {
      'Efficiency': '19.5%',
      'Operating Voltage (Vmp)': '18.5V',
      'Current (Imp)': '5.41A',
      'Weight': '7.5 kg'
    },
    warranty: '25-Year Warranty',
    efficiency: '19.5%',
    inStock: true,
    image: 'https://images.unsplash.com/photo-1548337138-e87d889cc369?auto=format&fit=crop&w=800&q=80',
    description: 'Compact monocrystalline module perfect for student IoT prototypes, battery float stations, and autonomous wiper test benches.'
  },

  // 2. INVERTERS & PCU
  {
    id: 'inv_luminous_2kva',
    name: 'Luminous Solar NXG Pro 2000 Hybrid MPPT PCU (24V)',
    brand: 'Luminous Power',
    category: 'inverters',
    priceInr: 28500,
    rating: 4.9,
    reviewsCount: 95,
    capacityLabel: '2000 VA / 1600 Watts',
    specs: {
      'Continuous Capacity': '1600W Pure Sine Wave',
      'MPPT Voltage Range': '36V – 85V DC',
      'Max PV Input': '2000 Watts',
      'Battery Voltage': '24V (2x 12V in series)',
      'Efficiency': '94.2% MPPT tracking'
    },
    warranty: '3-Year Comprehensive On-Site Warranty',
    inStock: true,
    featured: true,
    badge: 'Top Rated Inverter',
    image: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=800&q=80',
    description: 'Intelligent solar PCU featuring high-frequency MPPT logic, ISOT technology for 30% faster battery replenishment, and grid export bypass.'
  },
  {
    id: 'inv_growatt_5kw',
    name: 'Growatt SPF 5000 ES Off-Grid / Hybrid 5kW Solar Inverter',
    brand: 'Growatt',
    category: 'inverters',
    priceInr: 68000,
    rating: 4.9,
    reviewsCount: 82,
    capacityLabel: '5000 Watts Continuous',
    specs: {
      'Surge Power': '10,000 VA (Peak motor start)',
      'PV Array Open Circuit': '450V DC High Voltage MPPT',
      'Parallel Capability': 'Up to 6 units (30kW total)',
      'Battery Bank': '48V Lead-Acid or LiFePO4'
    },
    warranty: '5-Year Manufacturer Warranty',
    inStock: true,
    badge: 'Heavy Duty 5kW',
    image: 'https://images.unsplash.com/photo-1563770660941-20978e870e26?auto=format&fit=crop&w=800&q=80',
    description: 'Premium transformerless hybrid inverter supporting battery-free operation during sunshine hours, generator integration, and RS485 telemetry.'
  },
  {
    id: 'inv_microtek_1kva',
    name: 'Microtek Solar MAX 1100 VA / 12V Smart Hybrid Inverter',
    brand: 'Microtek',
    category: 'inverters',
    priceInr: 9200,
    rating: 4.6,
    reviewsCount: 140,
    capacityLabel: '1100 VA / 880 Watts',
    specs: {
      'Waveform': 'Pure Sine Wave',
      'Battery System': 'Single 12V battery',
      'PV Compatibility': 'Up to 900W PV modules'
    },
    warranty: '2-Year Replacement Warranty',
    inStock: true,
    image: 'https://images.unsplash.com/photo-1558449028-b53a39d100fc?auto=format&fit=crop&w=800&q=80',
    description: 'Affordable single-battery solar inverter with automatic mains bypass switch, intelligent overload buzzer, and thermal heat sink protection.'
  },

  // 3. BATTERIES & ENERGY STORAGE
  {
    id: 'bat_lifepo4_48v',
    name: 'Farm.IOT 48V 100Ah (4.8 kWh) Lithium Iron Phosphate (LiFePO4) Battery',
    brand: 'Farm.IOT Lithium',
    category: 'batteries',
    priceInr: 89000,
    rating: 5.0,
    reviewsCount: 78,
    capacityLabel: '48V 100Ah (4,800 Wh)',
    specs: {
      'Cycle Life': '6,000+ Cycles @ 80% DoD (~15 years)',
      'Chemistry': 'Tier-1 Grade-A LiFePO4 Prismatic Cells',
      'BMS Protection': '100A Smart BMS with Overcharge, Overcurrent & Temp Sensor',
      'Form Factor': '19-Inch 3U Server Rack Mount or Wall Mount'
    },
    warranty: '10-Year Extended Warranty',
    inStock: true,
    featured: true,
    badge: '15-Year Life',
    image: 'https://images.unsplash.com/photo-1617788138017-80ad40651399?auto=format&fit=crop&w=800&q=80',
    description: 'Ultimate energy storage solution for zero maintenance. Eliminates acid fumes, distilled water refilling, and offers 3x the life of tubular batteries.'
  },
  {
    id: 'bat_lifepo4_12v',
    name: '12V 100Ah Smart LiFePO4 Battery with Bluetooth BMS',
    brand: 'Ampere Time / Power Queen',
    category: 'batteries',
    priceInr: 26500,
    rating: 4.8,
    reviewsCount: 110,
    capacityLabel: '12V 100Ah (1,280 Wh)',
    specs: {
      'Cycle Life': '4,000+ Cycles',
      'Weight': '11.5 kg (1/3rd of lead-acid)',
      'Max Discharge': '100A Continuous'
    },
    warranty: '5-Year Warranty',
    inStock: true,
    badge: 'Lightweight',
    image: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=800&q=80',
    description: 'Drop-in replacement for 12V 150Ah tubular batteries. Delivers full rated power without peukert capacity loss or voltage sagging.'
  },
  {
    id: 'bat_tubular_150',
    name: 'Luminous Solar 150Ah / 12V Tall Tubular C10 Battery (LPTT12150L)',
    brand: 'Luminous Power',
    category: 'batteries',
    priceInr: 16200,
    rating: 4.7,
    reviewsCount: 310,
    capacityLabel: '150 Ah / 1.8 kWh',
    specs: {
      'Capacity': '150 Ah @ C10 rating',
      'Electrolyte Volume': 'High acid volume per ampere-hour',
      'Spine Technology': 'High pressure HADI die casting (100 bar)'
    },
    warranty: '60 Months (36 Months Free Replacement + 24 Pro-rata)',
    inStock: true,
    image: 'https://images.unsplash.com/photo-1563770660941-20978e870e26?auto=format&fit=crop&w=800&q=80',
    description: 'India’s most reliable C10 solar rated tubular battery built with heavy-duty spines for high resilience against daily deep power shedding.'
  },

  // 4. AUTO-CLEANING ROBOTIC SQUEEGEE & IOT KITS
  {
    id: 'kit_wiper_motor',
    name: 'Farm.IOT Motorized Squeegee Wiper Assembly Kit',
    brand: 'Farm.IOT Official Kit',
    category: 'iot_cleaning',
    priceInr: 3850,
    rating: 5.0,
    reviewsCount: 104,
    capacityLabel: 'Universal 1-3 Panel Fit',
    specs: {
      'Motor': '12V DC High-Torque Planetary Gearmotor (60 RPM)',
      'Wiper Blade': 'Dual-edged UV-stabilized silicone squeegee (450mm width)',
      'Drive Mechanism': 'Stainless steel lead-screw and synchronous timing belt',
      'Sensors': 'Optical docking limit switch + water misting nozzle bar'
    },
    warranty: '2-Year Direct Replacement Warranty',
    inStock: true,
    featured: true,
    badge: 'Farm.IOT Certified',
    image: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=800&q=80',
    description: 'The complete motorized wiper kit designed for this project! Recovers 15% to 25% optical transmission lost to dust and bird droppings.'
  },
  {
    id: 'kit_esp32_board',
    name: 'ESP32 Solar IoT Controller Board (Pre-Soldered)',
    brand: 'Farm.IOT Official Kit',
    category: 'iot_cleaning',
    priceInr: 2400,
    rating: 4.9,
    reviewsCount: 89,
    capacityLabel: 'Plug & Play Node',
    specs: {
      'MCU': 'ESP32 Dual-Core 240MHz with 2.4GHz Wi-Fi + BLE',
      'Telemetry': 'Pre-soldered INA219 I2C current shunt + LM35 temp port',
      'Relays': 'Dual 10A optoisolated channels for wiper motor & water pump',
      'Firmware': 'Pre-flashed with Farm.IOT Firestore cloud firmware sketch'
    },
    warranty: '1-Year Warranty',
    inStock: true,
    badge: 'Pre-Flashed',
    image: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=800&q=80',
    description: 'Ready-to-deploy hardware controller. Connect your solar panel wires and Wi-Fi credentials to start streaming live telemetry immediately.'
  },

  // 5. ACCESSORIES & PROTECTION
  {
    id: 'acc_spd_mcb_box',
    name: '1000V DC Surge Protector (SPD) + 32A DC MCB Protection Enclosure',
    brand: 'Schneider / Suntree',
    category: 'accessories',
    priceInr: 2800,
    rating: 4.9,
    reviewsCount: 140,
    capacityLabel: '1000V DC Dual Pole',
    specs: {
      'SPD Rating': 'Class II 20kA ~ 40kA 1000V DC',
      'MCB Rating': '32A 500V/1000V DC Non-Polarized',
      'Enclosure': 'IP65 Weatherproof Transparent Window Box'
    },
    warranty: '3-Year Warranty',
    inStock: true,
    badge: 'Safety Essential',
    image: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=800&q=80',
    description: 'Vital lightning and overvoltage safety enclosure. Safeguards your inverter and sensitive ESP32 sensor telemetry from electrical grid surges.'
  },
  {
    id: 'acc_solar_cable_30m',
    name: '4mm² TUV Certified Copper Solar DC Cable (30m Roll)',
    brand: 'Polycab / Havells',
    category: 'accessories',
    priceInr: 2200,
    rating: 4.8,
    reviewsCount: 119,
    capacityLabel: '30 Meters 4mm²',
    specs: {
      'Conductor': 'Class 5 Tinned Copper (>99.9% purity)',
      'Insulation': 'Cross-linked Polyolefin (XLPO) UV & Ozone resistant',
      'Temperature': '-40°C to +120°C operating rating'
    },
    warranty: '25-Year Life Expectancy',
    inStock: true,
    image: 'https://images.unsplash.com/photo-1558449028-b53a39d100fc?auto=format&fit=crop&w=800&q=80',
    description: 'Weatherproof red and black solar DC cables delivering minimum I²R transmission power loss between roof arrays and ground inverters.'
  }
];

export const SolarStore: React.FC<SolarStoreProps> = ({
  user,
  onRequireSignIn,
  onNavigateToCalculator
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  // Store Settings (Synced with Firestore)
  const [storeSettings, setStoreSettings] = useState<StoreSettingsData>(DEFAULT_STORE_SETTINGS);

  // Products Catalog (Synced with Firestore if customized by owner, with local cache fallback)
  const [products, setProducts] = useState<StoreProduct[]>(() => {
    try {
      const saved = localStorage.getItem('solar_iot_custom_products');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return DEFAULT_STORE_PRODUCTS;
  });

  // Cart Items: { [productId]: quantity }
  const [cart, setCart] = useState<{ [productId: string]: number }>(() => {
    try {
      const saved = localStorage.getItem('solar_iot_store_cart');
      if (saved) return JSON.parse(saved);
    } catch {}
    return {
      'panel_waaree_540': 4,
      'inv_luminous_2kva': 1,
      'bat_lifepo4_48v': 1,
      'kit_wiper_motor': 1
    };
  });

  const [showQuoteDrawer, setShowQuoteDrawer] = useState<boolean>(false);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  // Owner verification: only the owner sees "Store Settings" and edit options
  const isOwner = Boolean(
    user?.email && 
    OWNER_EMAILS.includes(user.email.trim().toLowerCase())
  );

  // Store Settings Modal State (Owner Only)
  const [showStoreSettingsModal, setShowStoreSettingsModal] = useState<boolean>(false);
  const [settingsTab, setSettingsTab] = useState<'branding' | 'products'>('branding');
  const [editSettingsForm, setEditSettingsForm] = useState<StoreSettingsData>(DEFAULT_STORE_SETTINGS);
  const [isSavingSettings, setIsSavingSettings] = useState<boolean>(false);
  const [settingsStatus, setSettingsStatus] = useState<string | null>(null);

  // Edit / Add Product Modal State (Owner Only)
  const [showProductModal, setShowProductModal] = useState<boolean>(false);
  const [editingProduct, setEditingProduct] = useState<StoreProduct | null>(null);
  const [productForm, setProductForm] = useState<StoreProduct>({
    id: '',
    name: '',
    brand: '',
    category: 'panels',
    priceInr: 10000,
    rating: 5.0,
    reviewsCount: 1,
    capacityLabel: '',
    specs: {},
    warranty: '25-Year Warranty',
    inStock: true,
    featured: false,
    image: '',
    badge: '',
    description: '',
    amazonUrl: '',
    flipkartUrl: ''
  });
  const [specKey, setSpecKey] = useState<string>('');
  const [specVal, setSpecVal] = useState<string>('');
  const [isSavingProduct, setIsSavingProduct] = useState<boolean>(false);
  const [productStatus, setProductStatus] = useState<string | null>(null);

  // Local Product Photo Upload State
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingImage, setIsUploadingImage] = useState<boolean>(false);
  const [imageUploadError, setImageUploadError] = useState<string | null>(null);
  const [imageInputMode, setImageInputMode] = useState<'upload' | 'url'>('upload');
  const [isDraggingOver, setIsDraggingOver] = useState<boolean>(false);

  // Process and compress local photo via canvas to optimize for Firestore (<80KB)
  const processLocalImageFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setImageUploadError('Please select a valid image file (JPEG, PNG, WebP).');
      return;
    }
    if (file.size > 25 * 1024 * 1024) {
      setImageUploadError('File is too large (maximum 25MB).');
      return;
    }

    setIsUploadingImage(true);
    setImageUploadError(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      const rawDataUrl = e.target?.result as string;
      if (!rawDataUrl) {
        setIsUploadingImage(false);
        setImageUploadError('Could not read image file.');
        return;
      }

      const img = new Image();
      img.onload = () => {
        try {
          const MAX_DIMENSION = 800;
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
            setProductForm((prev) => ({ ...prev, image: rawDataUrl }));
            setIsUploadingImage(false);
            return;
          }

          ctx.drawImage(img, 0, 0, width, height);
          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.82);
          setProductForm((prev) => ({ ...prev, image: compressedDataUrl }));
        } catch (err) {
          setProductForm((prev) => ({ ...prev, image: rawDataUrl }));
        } finally {
          setIsUploadingImage(false);
        }
      };
      img.onerror = () => {
        setIsUploadingImage(false);
        setImageUploadError('Failed to load image preview.');
      };
      img.src = rawDataUrl;
    };
    reader.onerror = () => {
      setIsUploadingImage(false);
      setImageUploadError('Error reading file from disk.');
    };
    reader.readAsDataURL(file);
  };

  // In-App Product Removal Modal State (Fixes browser-blocked window.confirm inside iframes)
  const [productToDelete, setProductToDelete] = useState<StoreProduct | null>(null);
  const [isDeletingProduct, setIsDeletingProduct] = useState<boolean>(false);

  // In-App Reset Factory Catalog Modal State
  const [showResetCatalogConfirm, setShowResetCatalogConfirm] = useState<boolean>(false);
  const [isResettingCatalog, setIsResettingCatalog] = useState<boolean>(false);

  // Buy Hardware Retailer Selection Modal State (Redirect to Amazon or Flipkart)
  const [selectedBuyProduct, setSelectedBuyProduct] = useState<StoreProduct | null>(null);

  // Helper to generate verified Amazon India search or product URL
  const getAmazonUrl = (item: StoreProduct) => {
    if (item.amazonUrl && item.amazonUrl.trim().startsWith('http')) return item.amazonUrl.trim();
    return `https://www.amazon.in/s?k=${encodeURIComponent(`${item.brand} ${item.name}`)}`;
  };

  // Helper to generate verified Flipkart search or product URL
  const getFlipkartUrl = (item: StoreProduct) => {
    if (item.flipkartUrl && item.flipkartUrl.trim().startsWith('http')) return item.flipkartUrl.trim();
    return `https://www.flipkart.com/search?q=${encodeURIComponent(`${item.brand} ${item.name}`)}`;
  };

  // Sync Store Settings from Firestore
  useEffect(() => {
    const docRef = doc(db, 'solar_iot', 'store_settings');
    const unsub = onSnapshot(docRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data() as Partial<StoreSettingsData>;
        setStoreSettings((prev) => ({
          ...prev,
          ...data
        }));
      }
    }, (err) => {
      console.warn('Store settings sync note:', err);
    });

    return () => unsub();
  }, []);

  // Sync Custom Products from Firestore (if customized by owner)
  useEffect(() => {
    const prodDocRef = doc(db, 'solar_iot', 'store_products');
    const unsubProd = onSnapshot(prodDocRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        if (Array.isArray(data?.items)) {
          setProducts(data.items as StoreProduct[]);
          try {
            localStorage.setItem('solar_iot_custom_products', JSON.stringify(data.items));
          } catch {}
        }
      }
    }, (err) => {
      console.warn('Store products sync note:', err);
    });

    return () => unsubProd();
  }, []);

  // Save cart to localStorage
  useEffect(() => {
    localStorage.setItem('solar_iot_store_cart', JSON.stringify(cart));
  }, [cart]);

  const handleUpdateQuantity = (productId: string, delta: number) => {
    setCart((prev) => {
      const current = prev[productId] || 0;
      const next = Math.max(0, current + delta);
      if (next === 0) {
        const copy = { ...prev };
        delete copy[productId];
        return copy;
      }
      return { ...prev, [productId]: next };
    });
  };

  const handleClearCart = () => {
    setCart({});
  };

  // Quick Preset Packages
  const handleApplyPresetPackage = (type: 'iot_kit' | 'home_3kw' | 'hybrid_5kw') => {
    if (type === 'iot_kit') {
      setCart({
        'panel_loom_100': 1,
        'bat_lifepo4_12v': 1,
        'kit_wiper_motor': 1,
        'kit_esp32_board': 1
      });
    } else if (type === 'home_3kw') {
      setCart({
        'panel_waaree_540': 6,
        'inv_luminous_2kva': 1,
        'bat_lifepo4_48v': 1,
        'kit_wiper_motor': 1,
        'acc_spd_mcb_box': 1,
        'acc_solar_cable_30m': 1
      });
    } else if (type === 'hybrid_5kw') {
      setCart({
        'panel_adani_585': 9,
        'inv_growatt_5kw': 1,
        'bat_lifepo4_48v': 2,
        'kit_wiper_motor': 2,
        'acc_spd_mcb_box': 2,
        'acc_solar_cable_30m': 2
      });
    }
    setShowQuoteDrawer(true);
    try {
      confetti({ particleCount: 35, spread: 60, origin: { y: 0.7 } });
    } catch {}
  };

  // Filter products
  const filteredProducts = products.filter((prod) => {
    const matchesCategory = selectedCategory === 'all' || prod.category === selectedCategory;
    const matchesSearch = !searchQuery || 
      prod.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      prod.brand.toLowerCase().includes(searchQuery.toLowerCase()) ||
      prod.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // Calculate System Metrics from Cart
  let totalSolarWatts = 0;
  let totalInverterCapacityWatts = 0;
  let totalBatteryKwh = 0;
  let totalPriceInr = 0;
  let totalItemCount = 0;

  Object.entries(cart).forEach(([id, qty]) => {
    const prod = products.find((p) => p.id === id);
    if (!prod || qty <= 0) return;

    totalItemCount += qty;
    totalPriceInr += prod.priceInr * qty;

    if (prod.category === 'panels') {
      if (prod.id.includes('540')) totalSolarWatts += 540 * qty;
      else if (prod.id.includes('400')) totalSolarWatts += 400 * qty;
      else if (prod.id.includes('585')) totalSolarWatts += 585 * qty;
      else if (prod.id.includes('100')) totalSolarWatts += 100 * qty;
      else totalSolarWatts += 400 * qty;
    } else if (prod.category === 'inverters') {
      if (prod.id.includes('2kva')) totalInverterCapacityWatts += 1600 * qty;
      else if (prod.id.includes('5kw')) totalInverterCapacityWatts += 5000 * qty;
      else if (prod.id.includes('1kva')) totalInverterCapacityWatts += 800 * qty;
      else totalInverterCapacityWatts += 1500 * qty;
    } else if (prod.category === 'batteries') {
      if (prod.id.includes('48v')) totalBatteryKwh += 4.8 * qty;
      else if (prod.id.includes('12v')) totalBatteryKwh += 1.28 * qty;
      else if (prod.id.includes('tubular')) totalBatteryKwh += 1.8 * qty;
      else totalBatteryKwh += 2.4 * qty;
    }
  });

  // Open Store Settings Modal (Owner Only)
  const handleOpenStoreSettings = () => {
    if (!isOwner) return;
    setEditSettingsForm({ ...storeSettings });
    setSettingsStatus(null);
    setShowStoreSettingsModal(true);
  };

  // Save Store Settings to Firestore
  const handleSaveStoreSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isOwner) return;

    setIsSavingSettings(true);
    setSettingsStatus(null);
    try {
      const docRef = doc(db, 'solar_iot', 'store_settings');
      const updatedData: StoreSettingsData = {
        ...editSettingsForm,
        updatedAt: new Date().toISOString()
      };
      await setDoc(docRef, updatedData, { merge: true });
      setStoreSettings(updatedData);
      setSettingsStatus('Store settings successfully updated in Cloud Firestore!');
      try {
        confetti({ particleCount: 40, spread: 70, origin: { y: 0.6 } });
      } catch {}
      setTimeout(() => {
        setShowStoreSettingsModal(false);
        setSettingsStatus(null);
      }, 1200);
    } catch (err: any) {
      setSettingsStatus(`Error saving settings: ${err.message || 'Unknown error'}`);
    } finally {
      setIsSavingSettings(false);
    }
  };

  // Open Product Edit Modal (Owner Only)
  const handleOpenEditProduct = (prod: StoreProduct) => {
    if (!isOwner) return;
    setEditingProduct(prod);
    setProductForm({ ...prod });
    setProductStatus(null);
    setImageUploadError(null);
    setIsUploadingImage(false);
    setImageInputMode('upload');
    setShowProductModal(true);
  };

  // Open Product Add Modal (Owner Only)
  const handleOpenAddProduct = () => {
    if (!isOwner) return;
    setEditingProduct(null);
    setProductForm({
      id: `prod_${Date.now()}`,
      name: '',
      brand: '',
      category: 'panels',
      priceInr: 15000,
      rating: 5.0,
      reviewsCount: 1,
      capacityLabel: '',
      specs: {},
      warranty: '25-Year Warranty',
      inStock: true,
      featured: false,
      image: '',
      badge: 'New Arrival',
      description: '',
      amazonUrl: '',
      flipkartUrl: ''
    });
    setProductStatus(null);
    setImageUploadError(null);
    setIsUploadingImage(false);
    setImageInputMode('upload');
    setShowProductModal(true);
  };

  // Save Product (Add or Edit) to Firestore
  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isOwner) return;

    if (!productForm.name.trim() || !productForm.brand.trim()) {
      setProductStatus('Please provide product name and brand.');
      return;
    }

    setIsSavingProduct(true);
    setProductStatus(null);
    try {
      let updatedProducts: StoreProduct[];
      if (editingProduct) {
        updatedProducts = products.map((p) => (p.id === editingProduct.id ? productForm : p));
      } else {
        updatedProducts = [productForm, ...products];
      }

      setProducts(updatedProducts);
      try {
        localStorage.setItem('solar_iot_custom_products', JSON.stringify(updatedProducts));
      } catch {}

      const docRef = doc(db, 'solar_iot', 'store_products');
      await setDoc(docRef, {
        items: updatedProducts,
        updatedAt: new Date().toISOString()
      }, { merge: true });

      setProductStatus('Product catalog successfully saved to Firebase!');
      try {
        confetti({ particleCount: 35, spread: 60, origin: { y: 0.7 } });
      } catch {}
      setTimeout(() => {
        setShowProductModal(false);
        setEditingProduct(null);
        setProductStatus(null);
      }, 1000);
    } catch (err: any) {
      setProductStatus(`Error saving product: ${err.message || 'Unknown error'}`);
    } finally {
      setIsSavingProduct(false);
    }
  };

  // Open In-App Confirmation Modal to remove product (safe in sandboxed iframes)
  const handleInitiateDeleteProduct = (prod: StoreProduct) => {
    if (!isOwner) return;
    setProductToDelete(prod);
  };

  // Confirm Product Deletion
  const handleConfirmDeleteProduct = async () => {
    if (!isOwner || !productToDelete) return;

    setIsDeletingProduct(true);
    const targetId = productToDelete.id;
    const targetName = productToDelete.name;

    try {
      const updatedProducts = products.filter((p) => p.id !== targetId);

      // 1. Immediately update React state so the product disappears without latency
      setProducts(updatedProducts);

      // 2. Persist locally to localStorage
      try {
        localStorage.setItem('solar_iot_custom_products', JSON.stringify(updatedProducts));
      } catch {}

      // 3. Remove from cart if present
      handleUpdateQuantity(targetId, -999);

      // 4. If product edit modal was open for this product, close it
      if (editingProduct?.id === targetId) {
        setShowProductModal(false);
        setEditingProduct(null);
      }

      // 5. Persist to Cloud Firestore
      const docRef = doc(db, 'solar_iot', 'store_products');
      await setDoc(docRef, {
        items: updatedProducts,
        updatedAt: new Date().toISOString()
      }, { merge: true });

      setSettingsStatus(`"${targetName}" has been removed from the store catalog.`);
      setTimeout(() => setSettingsStatus(null), 3500);

      // Close delete modal
      setProductToDelete(null);
    } catch (err: any) {
      console.warn('Firestore store products sync note:', err);
      // Item is still removed locally and in localStorage
      setSettingsStatus(`Removed "${targetName}" from current catalog (cloud note: ${err.message || 'offline'})`);
      setTimeout(() => setSettingsStatus(null), 3500);
      setProductToDelete(null);
    } finally {
      setIsDeletingProduct(false);
    }
  };

  // Initiate Reset to Default Catalog
  const handleInitiateResetCatalog = () => {
    if (!isOwner) return;
    setShowResetCatalogConfirm(true);
  };

  // Confirm Reset to Factory Catalog
  const handleConfirmResetCatalog = async () => {
    if (!isOwner) return;
    setIsResettingCatalog(true);

    try {
      setProducts(DEFAULT_STORE_PRODUCTS);
      try {
        localStorage.setItem('solar_iot_custom_products', JSON.stringify(DEFAULT_STORE_PRODUCTS));
      } catch {}

      const docRef = doc(db, 'solar_iot', 'store_products');
      await setDoc(docRef, {
        items: DEFAULT_STORE_PRODUCTS,
        updatedAt: new Date().toISOString()
      }, { merge: true });

      setSettingsStatus('Store product catalog restored to default factory list!');
      setTimeout(() => setSettingsStatus(null), 3500);
      setShowResetCatalogConfirm(false);
    } catch (err: any) {
      console.warn('Reset catalog note:', err);
      setSettingsStatus(`Catalog reset locally (${err.message || 'offline'})`);
      setTimeout(() => setSettingsStatus(null), 3500);
      setShowResetCatalogConfirm(false);
    } finally {
      setIsResettingCatalog(false);
    }
  };

  // Save Quotation to Firebase Firestore
  const handleSaveQuoteToFirebase = async () => {
    if (!user) {
      if (onRequireSignIn) onRequireSignIn();
      return;
    }

    setSaveStatus('Saving quotation to your Google Account...');
    try {
      const quoteDocRef = doc(db, 'user_presets', `${user.uid}_quote`);
      await setDoc(quoteDocRef, {
        userId: user.uid,
        userEmail: user.email || '',
        cart,
        summary: {
          totalSolarWatts,
          totalInverterCapacityWatts,
          totalBatteryKwh,
          totalPriceInr,
          itemCount: totalItemCount
        },
        savedAt: new Date().toISOString()
      }, { merge: true });

      setSaveStatus('Quotation saved successfully to Cloud Firestore!');
      try {
        confetti({ particleCount: 50, spread: 70, origin: { y: 0.6 } });
      } catch {}
      setTimeout(() => setSaveStatus(null), 3000);
    } catch (err: any) {
      setSaveStatus(`Failed to save: ${err.message || 'Unknown error'}`);
    }
  };

  // Print / Download Quotation Bill of Materials (BOM)
  const handleDownloadQuotation = () => {
    let bomText = `========================================================\n`;
    bomText += `${storeSettings.storeName.toUpperCase()}\n`;
    bomText += `SYSTEM PROCUREMENT SPECIFICATION & BILL OF MATERIALS\n`;
    bomText += `Date: ${new Date().toLocaleDateString()} | Customer: ${user?.displayName || user?.email || 'Valued Customer'}\n`;
    bomText += `========================================================\n\n`;
    bomText += `SYSTEM METRICS:\n`;
    bomText += `• Total Solar PV Capacity: ${(totalSolarWatts / 1000).toFixed(2)} kW (${totalSolarWatts} Watts Peak)\n`;
    bomText += `• Inverter Continuous Power: ${(totalInverterCapacityWatts / 1000).toFixed(2)} kW (${totalInverterCapacityWatts} Watts)\n`;
    bomText += `• Battery Storage Energy: ${totalBatteryKwh.toFixed(1)} kWh\n`;
    bomText += `• Estimated Daily Generation: ~${((totalSolarWatts / 1000) * 4.6).toFixed(1)} kWh / Day\n\n`;
    bomText += `ITEMIZED BILL OF MATERIALS (BOM):\n`;
    bomText += `--------------------------------------------------------\n`;

    Object.entries(cart).forEach(([id, qty]) => {
      const p = products.find(prod => prod.id === id);
      if (!p || qty <= 0) return;
      bomText += `[${qty}x] ${p.name}\n`;
      bomText += `     Brand: ${p.brand} | Spec: ${p.capacityLabel}\n`;
      bomText += `     Unit Price: ₹${p.priceInr.toLocaleString('en-IN')} | Line Total: ₹${(p.priceInr * qty).toLocaleString('en-IN')}\n\n`;
    });

    bomText += `--------------------------------------------------------\n`;
    bomText += `TOTAL SYSTEM ESTIMATE: ₹${totalPriceInr.toLocaleString('en-IN')}\n`;
    if (storeSettings.shippingNotice) {
      bomText += `Shipping: ${storeSettings.shippingNotice}\n`;
    }
    bomText += `Generated via Farm.IOT Engineering Platform\n`;

    const blob = new Blob([bomText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Farm_IOT_Quotation_${new Date().toISOString().slice(0, 10)}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      
      {/* 0. ANNOUNCEMENT BANNER (Configurable by Owner) */}
      {storeSettings.announcementEnabled && (
        <div className="bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-cyan-500/15 border border-amber-500/30 rounded-2xl p-3 sm:p-4 text-xs font-mono shadow-md flex items-center justify-between gap-3 backdrop-blur-md">
          <div className="flex items-center space-x-2.5">
            <span className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30 shrink-0">
              <Megaphone className="w-4 h-4 text-amber-400" />
            </span>
            <div className="flex items-center gap-2 flex-wrap text-zinc-200">
              <span className="px-2 py-0.5 rounded bg-amber-400 text-slate-950 font-bold text-[10px] uppercase">
                {storeSettings.announcementBadge}
              </span>
              <span className="font-sans text-xs sm:text-sm text-zinc-200">{storeSettings.announcementText}</span>
            </div>
          </div>
          {isOwner && (
            <button
              onClick={handleOpenStoreSettings}
              className="text-amber-400 hover:text-amber-300 font-mono text-[11px] underline shrink-0 cursor-pointer"
            >
              Edit Banner
            </button>
          )}
        </div>
      )}

      {/* 1. STORE HEADER BANNER */}
      <div className="bg-zinc-950 border border-zinc-800 rounded-3xl p-6 sm:p-8 relative overflow-hidden shadow-2xl">
        <div className="absolute -top-12 -right-12 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-12 -left-12 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2 max-w-3xl">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-mono font-bold uppercase tracking-wider">
                <ShoppingBag className="w-3.5 h-3.5" />
                <span>{storeSettings.storeName}</span>
              </div>

              {/* Owner security badge */}
              {isOwner && (
                <div className="inline-flex items-center space-x-1.5 text-xs font-mono text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Store Admin Verified</span>
                </div>
              )}
            </div>

            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight">
              {storeSettings.storeTagline}
            </h1>

            <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed font-sans">
              {storeSettings.storeDescription}
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-2 text-xs font-mono text-zinc-400">
              <span className="flex items-center gap-1.5 text-emerald-400">
                <ShieldCheck className="w-4 h-4" /> 25-Year Warranties
              </span>
              <span className="flex items-center gap-1.5 text-cyan-400">
                <CheckCircle2 className="w-4 h-4" /> 100% Genuine Hardware
              </span>
              <span className="flex items-center gap-1.5 text-amber-400">
                <Truck className="w-4 h-4" /> {storeSettings.shippingNotice}
              </span>
            </div>

            {/* OWNER-ONLY STORE SETTINGS & ADD PRODUCT BUTTONS */}
            {isOwner && (
              <div className="pt-3 flex items-center gap-2 flex-wrap">
                <button
                  onClick={handleOpenStoreSettings}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-bold text-xs font-mono transition cursor-pointer flex items-center gap-1.5 shadow-lg shadow-amber-500/20"
                >
                  <Settings className="w-4 h-4" />
                  <span>Store Settings</span>
                </button>

                <button
                  onClick={handleOpenAddProduct}
                  className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-cyan-300 border border-zinc-700 font-bold text-xs font-mono transition cursor-pointer flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add New Product</span>
                </button>

                <button
                  onClick={handleInitiateResetCatalog}
                  className="px-3 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 border border-zinc-800 text-xs font-mono transition cursor-pointer flex items-center gap-1"
                  title="Restore default factory product catalog"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset Catalog</span>
                </button>
              </div>
            )}
          </div>

          {/* Quick System Summary Card / Cart Opener */}
          <div className="bg-black/90 border border-zinc-800 rounded-2xl p-4 sm:p-5 w-full lg:w-80 shrink-0 shadow-xl space-y-3 font-mono">
            <div className="flex items-center justify-between border-b border-zinc-900 pb-2">
              <span className="text-xs text-zinc-400 font-bold uppercase tracking-wider">Configured Package</span>
              <span className="text-xs text-amber-400 font-bold bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                {totalItemCount} Items
              </span>
            </div>

            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-zinc-500">Solar PV:</span>
                <span className="text-amber-300 font-bold">{(totalSolarWatts / 1000).toFixed(2)} kW</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Inverter:</span>
                <span className="text-cyan-300 font-bold">{(totalInverterCapacityWatts / 1000).toFixed(2)} kW</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Battery Storage:</span>
                <span className="text-purple-300 font-bold">{totalBatteryKwh.toFixed(1)} kWh</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-zinc-900 text-sm">
                <span className="text-zinc-400 font-bold">Total Estimate:</span>
                <span className="text-emerald-400 font-black">
                  ₹{totalPriceInr.toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            <button
              onClick={() => setShowQuoteDrawer(true)}
              className="w-full py-2.5 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg transition cursor-pointer"
            >
              <FileText className="w-4 h-4" />
              <span>Review Quotation & BOM</span>
            </button>
          </div>
        </div>

        {/* Quick Package Sizing Preset Bar */}
        <div className="mt-6 pt-5 border-t border-zinc-800/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs font-mono">
          <div className="flex items-center gap-1.5 text-zinc-400">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span className="font-bold text-zinc-300">1-Click Recommended System Packages:</span>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => handleApplyPresetPackage('iot_kit')}
              className="px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-cyan-300 border border-zinc-800 transition cursor-pointer text-[11px]"
            >
              🎓 Student & IoT Kit (100W)
            </button>
            <button
              onClick={() => handleApplyPresetPackage('home_3kw')}
              className="px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-amber-300 border border-zinc-800 transition cursor-pointer text-[11px]"
            >
              🏡 3kW Home Backup Package
            </button>
            <button
              onClick={() => handleApplyPresetPackage('hybrid_5kw')}
              className="px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-purple-300 border border-zinc-800 transition cursor-pointer text-[11px]"
            >
              ⚡ 5kW Pro Hybrid Villa (Lithium)
            </button>
            {onNavigateToCalculator && (
              <button
                onClick={onNavigateToCalculator}
                className="px-3 py-1.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 transition cursor-pointer text-[11px] flex items-center gap-1"
              >
                <span>Calculate My Sizing</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 2. FILTER & SEARCH CONTROLS */}
      <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 font-mono text-xs">
        
        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-1 md:pb-0">
          {[
            { id: 'all', label: 'All Hardware', icon: Package },
            { id: 'panels', label: 'Solar Panels', icon: Sun },
            { id: 'inverters', label: 'Inverters (PCU)', icon: Zap },
            { id: 'batteries', label: 'LiFePO4 & Tubular', icon: Battery },
            { id: 'iot_cleaning', label: 'Wipers & IoT Kits', icon: Wrench },
            { id: 'accessories', label: 'Protection & Cable', icon: Layers }
          ].map((cat) => {
            const Icon = cat.icon;
            const active = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-2 rounded-xl transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                  active 
                    ? 'bg-amber-400 text-slate-950 font-bold shadow' 
                    : 'bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-800 border border-zinc-800'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>

        {/* Search & Currency Toggle */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search Waaree, Luminous, LiFePO4..."
              className="w-full bg-zinc-900 border border-zinc-700 rounded-xl pl-9 pr-3 py-2 text-white text-xs placeholder-zinc-500 focus:outline-none focus:border-amber-400"
            />
          </div>
        </div>

      </div>

      {/* 3. PRODUCT CATALOG GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredProducts.map((product) => {
          const qty = cart[product.id] || 0;
          return (
            <div 
              key={product.id}
              className="bg-zinc-950 border border-zinc-800 rounded-3xl overflow-hidden hover:border-amber-500/50 transition-all duration-300 shadow-xl flex flex-col justify-between group relative"
            >
              {/* Product Image & Badges */}
              <div 
                className="relative aspect-video w-full bg-zinc-900 overflow-hidden cursor-pointer"
                onClick={() => setSelectedBuyProduct(product)}
              >
                <img 
                  src={product.image} 
                  alt={product.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition duration-500 opacity-90"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1509391365360-2e959784a276?auto=format&fit=crop&w=800&q=80';
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-80" />

                {/* Top Badges */}
                <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
                  {product.badge && (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-400 text-slate-950 shadow">
                      {product.badge}
                    </span>
                  )}
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-black/80 backdrop-blur border border-zinc-800 text-zinc-300">
                    {product.brand}
                  </span>
                </div>

                {/* OWNER-ONLY PRODUCT EDIT / DELETE BUTTONS (NO ONE ELSE SEES THIS) */}
                {isOwner && (
                  <div className="absolute top-3 right-3 flex items-center gap-1.5 z-20">
                    <button
                      onClick={() => handleOpenEditProduct(product)}
                      className="p-1.5 rounded-lg bg-black/80 hover:bg-zinc-800 text-cyan-400 border border-zinc-700 transition cursor-pointer shadow-md"
                      title="Edit Product Details & Price (Owner Only)"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleInitiateDeleteProduct(product)}
                      className="p-1.5 rounded-lg bg-black/80 hover:bg-rose-950 text-rose-400 border border-zinc-700 transition cursor-pointer shadow-md"
                      title="Remove Product (Owner Only)"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-xs font-mono">
                  <span className="text-amber-300 font-bold bg-black/70 px-2 py-0.5 rounded backdrop-blur border border-zinc-800">
                    {product.capacityLabel}
                  </span>
                  <div className="flex items-center gap-1 text-amber-400 bg-black/70 px-2 py-0.5 rounded backdrop-blur border border-zinc-800">
                    <Star className="w-3 h-3 fill-current" />
                    <span>{product.rating}</span>
                    <span className="text-[10px] text-zinc-500">({product.reviewsCount})</span>
                  </div>
                </div>
              </div>

              {/* Product Body */}
              <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                <div 
                  className="space-y-2 cursor-pointer"
                  onClick={() => setSelectedBuyProduct(product)}
                >
                  <h3 className="text-base font-bold text-white group-hover:text-amber-400 transition leading-snug">
                    {product.name}
                  </h3>
                  
                  <p className="text-xs text-zinc-400 leading-relaxed font-sans line-clamp-2">
                    {product.description}
                  </p>

                  {/* Key Technical Specifications Table */}
                  <div className="bg-black/60 border border-zinc-900 rounded-xl p-3 space-y-1 text-[11px] font-mono text-zinc-300">
                    {Object.entries(product.specs || {}).slice(0, 3).map(([key, val]) => (
                      <div key={key} className="flex justify-between">
                        <span className="text-zinc-500">{key}:</span>
                        <span className="text-zinc-200 font-medium truncate ml-2">{val}</span>
                      </div>
                    ))}
                    <div className="flex justify-between pt-1 border-t border-zinc-900/60 text-emerald-400">
                      <span className="text-zinc-500">Warranty:</span>
                      <span className="font-semibold truncate ml-2">{product.warranty}</span>
                    </div>
                  </div>
                </div>

                {/* Pricing & Buy Controls with Flipkart / Amazon Redirection */}
                <div className="pt-2 border-t border-zinc-800 space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <div className="text-[10px] text-zinc-500 font-mono">Unit Price:</div>
                      <div className="text-lg font-black text-amber-400 font-mono">
                        ₹{product.priceInr.toLocaleString('en-IN')}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {qty > 0 ? (
                        <div className="flex items-center gap-1.5 bg-zinc-900 border border-amber-500/40 rounded-xl p-1 font-mono text-xs">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleUpdateQuantity(product.id, -1);
                            }}
                            className="w-6 h-6 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white flex items-center justify-center cursor-pointer transition"
                            title="Decrease quantity"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="w-5 text-center font-bold text-amber-300 text-xs">{qty}</span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleUpdateQuantity(product.id, 1);
                            }}
                            className="w-6 h-6 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 flex items-center justify-center cursor-pointer transition font-bold"
                            title="Increase quantity"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleUpdateQuantity(product.id, 1);
                          }}
                          className="px-2.5 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-amber-300 border border-amber-500/30 font-bold text-[11px] font-mono rounded-xl transition cursor-pointer flex items-center gap-1 shadow"
                          title="Add to Engineering Quote / BOM"
                        >
                          <Plus className="w-3 h-3" />
                          <span>Quote</span>
                        </button>
                      )}

                      {/* Buy Hardware Button */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedBuyProduct(product);
                        }}
                        className="px-3 py-1.5 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-black text-xs font-mono rounded-xl transition cursor-pointer flex items-center gap-1.5 shadow-lg shadow-amber-500/20"
                        title="Choose retailer to buy on Amazon or Flipkart"
                      >
                        <ShoppingBag className="w-3.5 h-3.5" />
                        <span>Buy Hardware</span>
                      </button>
                    </div>
                  </div>

                  {/* 1-Click Direct Redirect Badges */}
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <a
                      href={getAmazonUrl(product)}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="px-2.5 py-1.5 rounded-xl bg-[#FF9900]/15 hover:bg-[#FF9900]/25 text-[#FFB84D] hover:text-[#FFA31A] border border-[#FF9900]/30 font-mono text-[11px] font-bold flex items-center justify-center gap-1.5 transition shadow-sm"
                      title={`Buy ${product.name} directly on Amazon.in`}
                    >
                      <span>Amazon</span>
                      <ExternalLink className="w-3 h-3 text-[#FF9900]" />
                    </a>
                    <a
                      href={getFlipkartUrl(product)}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="px-2.5 py-1.5 rounded-xl bg-[#2874F0]/15 hover:bg-[#2874F0]/25 text-[#6AA2FF] hover:text-[#4B8EFF] border border-[#2874F0]/30 font-mono text-[11px] font-bold flex items-center justify-center gap-1.5 transition shadow-sm"
                      title={`Buy ${product.name} directly on Flipkart`}
                    >
                      <span>Flipkart</span>
                      <ExternalLink className="w-3 h-3 text-[#2874F0]" />
                    </a>
                  </div>
                </div>

              </div>
            </div>
          );
        })}
      </div>

      {/* 4. QUOTATION & SYSTEM BUILDER DRAWER */}
      {showQuoteDrawer && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-zinc-950 border-l border-zinc-800 w-full max-w-xl h-full flex flex-col justify-between shadow-2xl overflow-hidden animate-in slide-in-from-right duration-200">
            
            {/* Header */}
            <div className="p-5 border-b border-zinc-800 flex items-center justify-between bg-black">
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
                  <ShoppingBag className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">Your Solar System Quotation</h3>
                  <p className="text-xs text-zinc-400 font-mono">
                    Bill of Materials & Automated Sizing Specification
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowQuoteDrawer(false)}
                className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-900 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content List */}
            <div className="p-6 overflow-y-auto flex-1 space-y-5">
              
              {/* Sizing Performance Metric Box */}
              <div className="grid grid-cols-3 gap-2 bg-black border border-zinc-800 rounded-2xl p-4 font-mono text-center">
                <div>
                  <div className="text-[10px] text-zinc-500 uppercase">Array Capacity</div>
                  <div className="text-sm sm:text-base font-black text-amber-400">
                    {(totalSolarWatts / 1000).toFixed(2)} kW
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-zinc-500 uppercase">Inverter Output</div>
                  <div className="text-sm sm:text-base font-black text-cyan-400">
                    {(totalInverterCapacityWatts / 1000).toFixed(2)} kW
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-zinc-500 uppercase">Battery Storage</div>
                  <div className="text-sm sm:text-base font-black text-purple-400">
                    {totalBatteryKwh.toFixed(1)} kWh
                  </div>
                </div>
              </div>

              {/* Items List */}
              <div className="space-y-3">
                <div className="text-xs font-mono font-bold text-zinc-400 uppercase tracking-wider flex items-center justify-between">
                  <span>Selected Hardware Items ({totalItemCount})</span>
                </div>

                {totalItemCount === 0 ? (
                  <div className="p-8 text-center text-zinc-500 font-mono text-xs border border-dashed border-zinc-800 rounded-2xl">
                    No hardware configured yet. Browse the catalog and tap "Add to Quote".
                  </div>
                ) : (
                  Object.entries(cart).map(([id, qty]) => {
                    const prod = products.find((p) => p.id === id);
                    if (!prod || qty <= 0) return null;
                    return (
                      <div 
                        key={id}
                        className="bg-black/70 border border-zinc-800/80 rounded-xl p-3 flex items-center justify-between gap-3 text-xs font-mono"
                      >
                        <div className="truncate flex-1">
                          <h4 className="font-bold text-white text-xs truncate">{prod.name}</h4>
                          <div className="text-[10px] text-zinc-500">{prod.brand} • {prod.capacityLabel}</div>
                          <div className="flex items-center gap-2 mt-1">
                            <a
                              href={getAmazonUrl(prod)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[10px] font-mono text-[#FFB84D] hover:underline flex items-center gap-0.5"
                            >
                              <span>Amazon</span>
                              <ExternalLink className="w-2.5 h-2.5" />
                            </a>
                            <span className="text-zinc-600">•</span>
                            <a
                              href={getFlipkartUrl(prod)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[10px] font-mono text-[#6AA2FF] hover:underline flex items-center gap-0.5"
                            >
                              <span>Flipkart</span>
                              <ExternalLink className="w-2.5 h-2.5" />
                            </a>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          <div className="flex items-center gap-1.5 bg-zinc-900 px-2 py-1 rounded-lg">
                            <button
                              onClick={() => handleUpdateQuantity(id, -1)}
                              className="text-zinc-400 hover:text-white"
                            >
                              -
                            </button>
                            <span className="w-5 text-center font-bold text-white">{qty}</span>
                            <button
                              onClick={() => handleUpdateQuantity(id, 1)}
                              className="text-amber-400 hover:text-amber-300"
                            >
                              +
                            </button>
                          </div>

                          <div className="text-right w-24">
                            <div className="font-bold text-emerald-400">
                              ₹{(prod.priceInr * qty).toLocaleString('en-IN')}
                            </div>
                            <div className="text-[9px] text-zinc-500">
                              @₹{prod.priceInr.toLocaleString('en-IN')}
                            </div>
                          </div>

                          <button
                            onClick={() => handleUpdateQuantity(id, -qty)}
                            className="text-zinc-600 hover:text-rose-400 p-1 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Order Summary */}
              <div className="p-4 bg-zinc-900/60 border border-zinc-800 rounded-2xl space-y-2 text-xs font-mono">
                <div className="flex justify-between text-zinc-400">
                  <span>Subtotal ({totalItemCount} Items):</span>
                  <span>₹{totalPriceInr.toLocaleString('en-IN')}</span>
                </div>
                <div className="pt-2 border-t border-zinc-800 flex items-center justify-between text-sm">
                  <span className="font-bold text-white">Estimated Total:</span>
                  <div className="text-right">
                    <div className="text-xl font-black text-amber-400">
                      ₹{totalPriceInr.toLocaleString('en-IN')}
                    </div>
                  </div>
                </div>
              </div>

              {/* Shipping / Dispatch Notice */}
              {storeSettings.shippingNotice && (
                <div className="p-3 bg-black border border-zinc-800 rounded-xl flex items-center gap-2 text-[11px] font-mono text-zinc-300">
                  <Truck className="w-4 h-4 text-cyan-400 shrink-0" />
                  <span>{storeSettings.shippingNotice}</span>
                </div>
              )}

              {saveStatus && (
                <div className={`p-3 rounded-xl border text-xs font-mono flex items-center gap-2 ${
                  saveStatus.includes('success') ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200' : 'bg-amber-950/40 border-amber-500/40 text-amber-200'
                }`}>
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{saveStatus}</span>
                </div>
              )}

            </div>

            {/* Footer Actions: Download BOM, Save to Account */}
            <div className="p-4 sm:p-5 border-t border-zinc-800 bg-black font-mono text-xs space-y-3">
              <div className="flex items-center justify-between">
                <button
                  onClick={handleClearCart}
                  className="text-zinc-500 hover:text-rose-400 cursor-pointer text-[11px]"
                >
                  Clear All
                </button>
                <div className="text-zinc-400 text-[11px]">
                  {totalItemCount} Items Configured
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={handleDownloadQuotation}
                  className="py-3 px-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-700 font-bold transition cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Download className="w-4 h-4" />
                  <span>Download BOM</span>
                </button>

                <button
                  onClick={handleSaveQuoteToFirebase}
                  className="py-3 px-3 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-bold transition cursor-pointer flex items-center justify-center gap-1.5 shadow"
                >
                  <Save className="w-4 h-4" />
                  <span>Save to Account</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* 5. STORE SETTINGS MODAL (OWNER ONLY) */}
      {showStoreSettingsModal && isOwner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
          <div className="bg-zinc-950 border border-zinc-800 rounded-3xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
            
            {/* Modal Header */}
            <div className="p-5 border-b border-zinc-800 flex items-center justify-between bg-black">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  <Settings className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">Store Settings (Owner Only)</h3>
                  <p className="text-xs text-zinc-400 font-mono">
                    Configure store branding, announcement banner, and product catalog
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowStoreSettingsModal(false)}
                className="p-1.5 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-900 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Settings Tab Navigation */}
            <div className="px-5 pt-3 border-b border-zinc-800 bg-black/50 flex space-x-2 text-xs font-mono">
              {[
                { id: 'branding', label: 'Store Branding & Banners' },
                { id: 'products', label: 'Manage Products' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setSettingsTab(tab.id as any)}
                  className={`pb-2.5 px-3 border-b-2 font-bold transition cursor-pointer ${
                    settingsTab === tab.id
                      ? 'border-amber-400 text-amber-300'
                      : 'border-transparent text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Form */}
            <form onSubmit={handleSaveStoreSettings} className="p-6 overflow-y-auto space-y-4 flex-1 text-xs">
              
              {/* TAB 1: BRANDING & BANNERS */}
              {settingsTab === 'branding' && (
                <div className="space-y-4 animate-fadeIn">
                  <div>
                    <label className="text-[10px] text-zinc-400 block mb-1">Store Name / Header</label>
                    <input
                      type="text"
                      value={editSettingsForm.storeName}
                      onChange={(e) => setEditSettingsForm({ ...editSettingsForm, storeName: e.target.value })}
                      className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-2.5 text-zinc-200 focus:outline-none focus:border-amber-400"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-[10px] text-zinc-400 block mb-1">Store Tagline</label>
                    <input
                      type="text"
                      value={editSettingsForm.storeTagline}
                      onChange={(e) => setEditSettingsForm({ ...editSettingsForm, storeTagline: e.target.value })}
                      className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-2.5 text-zinc-200 focus:outline-none focus:border-amber-400"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-[10px] text-zinc-400 block mb-1">Store Description</label>
                    <textarea
                      value={editSettingsForm.storeDescription}
                      onChange={(e) => setEditSettingsForm({ ...editSettingsForm, storeDescription: e.target.value })}
                      rows={3}
                      className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-2.5 text-zinc-200 focus:outline-none focus:border-amber-400 font-sans leading-relaxed"
                      required
                    />
                  </div>

                  {/* Announcement Banner Settings */}
                  <div className="p-3.5 bg-black border border-zinc-800 rounded-xl space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-amber-400 flex items-center gap-1.5">
                        <Megaphone className="w-4 h-4" />
                        <span>Top Announcement Banner</span>
                      </span>
                      <label className="flex items-center gap-2 cursor-pointer font-mono text-[11px]">
                        <input
                          type="checkbox"
                          checked={editSettingsForm.announcementEnabled}
                          onChange={(e) => setEditSettingsForm({ ...editSettingsForm, announcementEnabled: e.target.checked })}
                          className="accent-amber-400 w-4 h-4 rounded"
                        />
                        <span className="text-zinc-300">Show Banner</span>
                      </label>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <div>
                        <label className="text-[10px] text-zinc-500 block mb-1">Badge Text</label>
                        <input
                          type="text"
                          value={editSettingsForm.announcementBadge}
                          onChange={(e) => setEditSettingsForm({ ...editSettingsForm, announcementBadge: e.target.value })}
                          className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-2 text-zinc-200"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="text-[10px] text-zinc-500 block mb-1">Announcement Message</label>
                        <input
                          type="text"
                          value={editSettingsForm.announcementText}
                          onChange={(e) => setEditSettingsForm({ ...editSettingsForm, announcementText: e.target.value })}
                          className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-2 text-zinc-200"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] text-zinc-400 block mb-1">Shipping & Dispatch Notice</label>
                    <input
                      type="text"
                      value={editSettingsForm.shippingNotice}
                      onChange={(e) => setEditSettingsForm({ ...editSettingsForm, shippingNotice: e.target.value })}
                      className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-2.5 text-zinc-200 focus:outline-none focus:border-amber-400"
                    />
                  </div>
                </div>
              )}

              {/* TAB 2: MANAGE PRODUCTS */}
              {settingsTab === 'products' && (
                <div className="space-y-4 animate-fadeIn">
                  <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
                    <span className="font-bold text-white">Current Catalog ({products.length} Products)</span>
                    <button
                      type="button"
                      onClick={handleOpenAddProduct}
                      className="px-3 py-1.5 rounded-lg bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Product</span>
                    </button>
                  </div>

                  <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                    {products.length === 0 ? (
                      <div className="p-6 text-center text-zinc-500 font-mono text-xs border border-dashed border-zinc-800 rounded-xl">
                        No products currently in store catalog.
                      </div>
                    ) : (
                      products.map((p) => (
                        <div key={p.id} className="p-2.5 bg-black border border-zinc-800 rounded-xl flex items-center justify-between gap-3 hover:border-zinc-700 transition">
                          {p.image && (
                            <img 
                              src={p.image} 
                              alt={p.name} 
                              className="w-10 h-10 rounded-lg object-cover bg-zinc-900 border border-zinc-800 shrink-0"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1509391365360-2e959784a276?auto=format&fit=crop&w=400&q=80';
                              }}
                            />
                          )}
                          <div className="truncate flex-1">
                            <div className="font-bold text-white text-xs truncate">{p.name}</div>
                            <div className="text-[10px] text-zinc-500 font-mono">
                              {p.brand} • <span className="capitalize">{p.category}</span> • ₹{p.priceInr.toLocaleString('en-IN')}
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleOpenEditProduct(p)}
                              className="px-2 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-cyan-400 border border-zinc-700 cursor-pointer flex items-center gap-1 text-[11px] font-mono transition"
                              title="Edit Product"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                              <span className="hidden sm:inline">Edit</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleInitiateDeleteProduct(p)}
                              className="px-2.5 py-1.5 rounded-lg bg-rose-950/70 hover:bg-rose-900 text-rose-300 border border-rose-500/40 cursor-pointer flex items-center gap-1 text-[11px] font-mono transition shadow-sm"
                              title="Remove Product from Catalog"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Remove</span>
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="pt-2 border-t border-zinc-800 flex justify-end">
                    <button
                      type="button"
                      onClick={handleInitiateResetCatalog}
                      className="text-zinc-500 hover:text-zinc-300 text-[11px] font-mono flex items-center gap-1 cursor-pointer"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Restore Factory Catalog</span>
                    </button>
                  </div>
                </div>
              )}

              {settingsStatus && (
                <div className={`p-3 rounded-xl border text-xs font-mono flex items-center gap-2 ${
                  settingsStatus.includes('success') ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200' : 'bg-rose-950/40 border-rose-500/40 text-rose-200'
                }`}>
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{settingsStatus}</span>
                </div>
              )}

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setShowStoreSettingsModal(false)}
                  className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-mono transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingSettings}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-300 hover:to-orange-400 text-slate-950 font-bold font-mono text-xs transition cursor-pointer flex items-center gap-1.5 shadow-lg disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  <span>{isSavingSettings ? 'Saving Settings...' : 'Save Store Settings'}</span>
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* 6. ADD / EDIT PRODUCT MODAL (OWNER ONLY) */}
      {showProductModal && isOwner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
          <div className="bg-zinc-950 border border-zinc-800 rounded-3xl w-full max-w-xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
            
            {/* Header */}
            <div className="p-5 border-b border-zinc-800 flex items-center justify-between bg-black">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                  <Package className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">
                    {editingProduct ? 'Edit Product Details' : 'Add New Hardware Product'}
                  </h3>
                  <p className="text-xs text-zinc-400 font-mono">
                    Owner Catalog Management
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowProductModal(false)}
                className="p-1.5 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-900 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSaveProduct} className="p-6 overflow-y-auto space-y-4 flex-1 text-xs">
              
              <div>
                <label className="text-[10px] text-zinc-400 block mb-1">Product Title *</label>
                <input
                  type="text"
                  value={productForm.name}
                  onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                  placeholder="e.g. Waaree 540W Bifacial Mono PERC Module"
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-2.5 text-zinc-200 focus:outline-none focus:border-cyan-400"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-zinc-400 block mb-1">Brand Name *</label>
                  <input
                    type="text"
                    value={productForm.brand}
                    onChange={(e) => setProductForm({ ...productForm, brand: e.target.value })}
                    placeholder="e.g. Waaree / Luminous / Tata"
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-2 text-zinc-200"
                    required
                  />
                </div>
                <div>
                  <label className="text-[10px] text-zinc-400 block mb-1">Category</label>
                  <select
                    value={productForm.category}
                    onChange={(e) => setProductForm({ ...productForm, category: e.target.value as any })}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-2 text-zinc-200"
                  >
                    <option value="panels">Solar Panels</option>
                    <option value="inverters">Inverters (PCU)</option>
                    <option value="batteries">Batteries & Storage</option>
                    <option value="iot_cleaning">Wipers & IoT Kits</option>
                    <option value="accessories">Protection & Cable</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-zinc-400 block mb-1">Price (₹ INR) *</label>
                  <input
                    type="number"
                    value={productForm.priceInr}
                    onChange={(e) => {
                      const inr = parseInt(e.target.value) || 0;
                      setProductForm({
                        ...productForm,
                        priceInr: inr
                      });
                    }}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-2 text-zinc-200 font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="text-[10px] text-zinc-400 block mb-1">Capacity Label</label>
                  <input
                    type="text"
                    value={productForm.capacityLabel}
                    onChange={(e) => setProductForm({ ...productForm, capacityLabel: e.target.value })}
                    placeholder="e.g. 540 Watts"
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-2 text-zinc-200"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-zinc-400 block mb-1">Badge (Optional)</label>
                  <input
                    type="text"
                    value={productForm.badge || ''}
                    onChange={(e) => setProductForm({ ...productForm, badge: e.target.value })}
                    placeholder="e.g. Best Seller / Certified"
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-2 text-zinc-200"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-zinc-400 block mb-1">Warranty</label>
                  <input
                    type="text"
                    value={productForm.warranty}
                    onChange={(e) => setProductForm({ ...productForm, warranty: e.target.value })}
                    placeholder="e.g. 25-Year Warranty"
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-2 text-zinc-200"
                  />
                </div>
              </div>

              {/* Product Photo: Upload Local Photo or Paste URL */}
              <div className="space-y-2 p-3.5 bg-black border border-zinc-800 rounded-2xl">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <label className="text-[10px] text-zinc-300 font-bold uppercase tracking-wider flex items-center gap-1.5">
                    <ImageIcon className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Product Photo</span>
                  </label>
                  
                  {/* Mode switcher: Upload File vs Web URL */}
                  <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded-lg p-0.5 text-[10px] font-mono">
                    <button
                      type="button"
                      onClick={() => setImageInputMode('upload')}
                      className={`px-2 py-0.5 rounded transition cursor-pointer flex items-center gap-1 ${
                        imageInputMode === 'upload'
                          ? 'bg-cyan-500 text-slate-950 font-bold shadow'
                          : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      <Upload className="w-3 h-3" />
                      <span>Upload Local Photo</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setImageInputMode('url')}
                      className={`px-2 py-0.5 rounded transition cursor-pointer flex items-center gap-1 ${
                        imageInputMode === 'url'
                          ? 'bg-cyan-500 text-slate-950 font-bold shadow'
                          : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      <ExternalLink className="w-3 h-3" />
                      <span>Web URL</span>
                    </button>
                  </div>
                </div>

                {/* Hidden File Input for Local Image Upload */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/jpg"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      processLocalImageFile(file);
                    }
                    e.target.value = '';
                  }}
                />

                {imageInputMode === 'upload' ? (
                  <div className="space-y-2.5">
                    {/* Active Image Preview Card if image exists */}
                    {productForm.image ? (
                      <div className="relative rounded-xl border border-zinc-700 bg-zinc-900/80 p-3 flex items-center gap-3 overflow-hidden group">
                        <img
                          src={productForm.image}
                          alt="Product preview"
                          className="w-16 h-16 sm:w-20 sm:h-20 object-cover rounded-lg bg-black border border-zinc-800 shrink-0 shadow"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1509391365360-2e959784a276?auto=format&fit=crop&w=400&q=80';
                          }}
                        />

                        <div className="flex-1 min-w-0 font-mono text-[11px] space-y-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                              <CheckCircle2 className="w-2.5 h-2.5" />
                              {productForm.image.startsWith('data:') ? 'Local Stored Photo' : 'Image Linked'}
                            </span>
                            {productForm.image.startsWith('data:') && (
                              <span className="text-[9px] text-zinc-500">Auto-compressed for Cloud Sync</span>
                            )}
                          </div>
                          <p className="text-zinc-400 text-[10px] truncate">
                            {productForm.image.startsWith('data:')
                              ? 'Saved locally to store hardware catalog'
                              : productForm.image}
                          </p>

                          <div className="flex items-center gap-2 pt-1">
                            <button
                              type="button"
                              onClick={() => fileInputRef.current?.click()}
                              disabled={isUploadingImage}
                              className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-600 text-[10px] font-mono flex items-center gap-1 cursor-pointer transition"
                            >
                              <Upload className="w-3 h-3 text-cyan-400" />
                              <span>Replace Photo</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setProductForm({ ...productForm, image: '' })}
                              className="px-2 py-1 rounded-lg bg-rose-950/60 hover:bg-rose-900 text-rose-300 border border-rose-500/30 text-[10px] font-mono flex items-center gap-1 cursor-pointer transition"
                            >
                              <Trash2 className="w-3 h-3" />
                              <span>Remove</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      /* Drag & Drop Upload Zone */
                      <div
                        onDragOver={(e) => {
                          e.preventDefault();
                          setIsDraggingOver(true);
                        }}
                        onDragLeave={() => setIsDraggingOver(false)}
                        onDrop={(e) => {
                          e.preventDefault();
                          setIsDraggingOver(false);
                          const file = e.dataTransfer.files?.[0];
                          if (file) {
                            processLocalImageFile(file);
                          }
                        }}
                        onClick={() => fileInputRef.current?.click()}
                        className={`p-6 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center text-center cursor-pointer transition duration-200 ${
                          isDraggingOver
                            ? 'border-cyan-400 bg-cyan-500/10'
                            : 'border-zinc-700 hover:border-cyan-500/60 bg-zinc-900/40 hover:bg-zinc-900'
                        }`}
                      >
                        <div className="p-3 rounded-full bg-cyan-500/10 text-cyan-400 mb-2 border border-cyan-500/20">
                          {isUploadingImage ? (
                            <div className="w-5 h-5 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <Camera className="w-5 h-5" />
                          )}
                        </div>
                        <div className="font-bold text-zinc-200 text-xs mb-0.5">
                          {isUploadingImage ? 'Optimizing photo...' : 'Click to add photo from computer or phone'}
                        </div>
                        <div className="text-[10px] text-zinc-400 font-mono">
                          Drag & drop image file here, or browse from local device
                        </div>
                        <div className="text-[9px] text-zinc-500 font-mono mt-1">
                          PNG, JPG, WebP supported • Automatically compressed for instant syncing
                        </div>
                      </div>
                    )}

                    {/* Quick Presets Picker */}
                    <div className="pt-1">
                      <div className="text-[10px] text-zinc-400 font-mono mb-1.5 flex items-center justify-between">
                        <span>Or select a certified hardware photo preset:</span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 font-mono text-[10px]">
                        {[
                          { label: '☀️ Solar Panel', url: 'https://images.unsplash.com/photo-1508873696983-2df5293cb32f?auto=format&fit=crop&w=800&q=80' },
                          { label: '⚡ MPPT Inverter', url: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=800&q=80' },
                          { label: '🔋 LiFePO4 Bank', url: 'https://images.unsplash.com/photo-1617788138017-80ad40651399?auto=format&fit=crop&w=800&q=80' },
                          { label: '🤖 Wiper Assembly', url: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=800&q=80' }
                        ].map((preset) => (
                          <button
                            key={preset.label}
                            type="button"
                            onClick={() => setProductForm({ ...productForm, image: preset.url })}
                            className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-cyan-300 border border-zinc-800 text-left truncate transition cursor-pointer"
                          >
                            {preset.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Web URL Input Mode */
                  <div className="space-y-2">
                    <input
                      type="url"
                      value={productForm.image}
                      onChange={(e) => setProductForm({ ...productForm, image: e.target.value })}
                      placeholder="https://images.unsplash.com/photo-..."
                      className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-2.5 text-zinc-200 text-xs font-mono focus:outline-none focus:border-cyan-400"
                    />
                    {productForm.image && (
                      <div className="flex items-center gap-3 p-2 bg-zinc-900/60 border border-zinc-800 rounded-xl">
                        <img
                          src={productForm.image}
                          alt="URL preview"
                          className="w-12 h-12 rounded-lg object-cover bg-black border border-zinc-700"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1509391365360-2e959784a276?auto=format&fit=crop&w=400&q=80';
                          }}
                        />
                        <span className="text-[10px] text-zinc-400 font-mono truncate flex-1">
                          Previewing online image URL
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {imageUploadError && (
                  <div className="p-2 rounded-lg bg-rose-950/40 border border-rose-500/30 text-rose-300 text-[11px] font-mono flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-rose-400" />
                    <span>{imageUploadError}</span>
                  </div>
                )}
              </div>

              <div>
                <label className="text-[10px] text-zinc-400 block mb-1">Description</label>
                <textarea
                  value={productForm.description}
                  onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                  rows={3}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-2.5 text-zinc-200 font-sans leading-relaxed"
                />
              </div>

              {/* Retailer URLs (Amazon & Flipkart) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 bg-black border border-zinc-800 rounded-2xl">
                <div>
                  <label className="text-[10px] text-[#FFB84D] font-bold block mb-1">Direct Amazon.in URL (Optional)</label>
                  <input
                    type="url"
                    placeholder="https://www.amazon.in/dp/..."
                    value={productForm.amazonUrl || ''}
                    onChange={(e) => setProductForm({ ...productForm, amazonUrl: e.target.value })}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-2.5 text-zinc-200 focus:outline-none focus:border-amber-400 font-mono text-[11px]"
                  />
                  <span className="text-[9px] text-zinc-500 mt-1 block">Leave empty to auto-search Amazon for {productForm.brand || 'Brand'} {productForm.name || 'Product'}.</span>
                </div>
                <div>
                  <label className="text-[10px] text-[#6AA2FF] font-bold block mb-1">Direct Flipkart URL (Optional)</label>
                  <input
                    type="url"
                    placeholder="https://www.flipkart.com/..."
                    value={productForm.flipkartUrl || ''}
                    onChange={(e) => setProductForm({ ...productForm, flipkartUrl: e.target.value })}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-2.5 text-zinc-200 focus:outline-none focus:border-cyan-400 font-mono text-[11px]"
                  />
                  <span className="text-[9px] text-zinc-500 mt-1 block">Leave empty to auto-search Flipkart for {productForm.brand || 'Brand'} {productForm.name || 'Product'}.</span>
                </div>
              </div>

              <div className="flex items-center gap-4 pt-1">
                <label className="flex items-center gap-2 cursor-pointer font-mono text-[11px]">
                  <input
                    type="checkbox"
                    checked={productForm.inStock}
                    onChange={(e) => setProductForm({ ...productForm, inStock: e.target.checked })}
                    className="accent-cyan-400 w-4 h-4 rounded"
                  />
                  <span className="text-zinc-200 font-bold">In Stock</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer font-mono text-[11px]">
                  <input
                    type="checkbox"
                    checked={Boolean(productForm.featured)}
                    onChange={(e) => setProductForm({ ...productForm, featured: e.target.checked })}
                    className="accent-amber-400 w-4 h-4 rounded"
                  />
                  <span className="text-zinc-200 font-bold">Featured Product</span>
                </label>
              </div>

              {productStatus && (
                <div className={`p-3 rounded-xl border text-xs font-mono flex items-center gap-2 ${
                  productStatus.includes('success') ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200' : 'bg-rose-950/40 border-rose-500/40 text-rose-200'
                }`}>
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{productStatus}</span>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-between gap-2 pt-3 border-t border-zinc-800">
                {editingProduct ? (
                  <button
                    type="button"
                    onClick={() => handleInitiateDeleteProduct(editingProduct)}
                    className="px-3 py-2 rounded-xl bg-rose-950/60 hover:bg-rose-900 text-rose-300 border border-rose-500/30 text-xs font-mono transition cursor-pointer flex items-center gap-1.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Product</span>
                  </button>
                ) : <div />}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowProductModal(false)}
                    className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-mono cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingProduct}
                    className="px-5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold font-mono text-xs transition cursor-pointer flex items-center gap-1.5 shadow disabled:opacity-50"
                  >
                    <Save className="w-4 h-4" />
                    <span>{isSavingProduct ? 'Saving...' : 'Save Product'}</span>
                  </button>
                </div>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* 7. IN-APP PRODUCT REMOVAL CONFIRMATION MODAL (Safe for Sandboxed iFrames) */}
      {productToDelete && isOwner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
          <div className="bg-zinc-950 border border-zinc-800 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden p-6 space-y-5 animate-in zoom-in-95 duration-200">
            
            <div className="flex items-start space-x-3.5">
              <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 shrink-0">
                <Trash2 className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="font-bold text-white text-base">Remove Product from Catalog?</h3>
                <p className="text-xs text-zinc-400 leading-relaxed font-sans">
                  Are you sure you want to remove this hardware item from the store? Customers will no longer be able to purchase or configure it.
                </p>
              </div>
            </div>

            {/* Product preview card */}
            <div className="p-3 bg-black border border-zinc-800 rounded-2xl flex items-center space-x-3">
              {productToDelete.image && (
                <img 
                  src={productToDelete.image} 
                  alt={productToDelete.name}
                  className="w-12 h-12 rounded-xl object-cover bg-zinc-900 border border-zinc-800 shrink-0" 
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1509391365360-2e959784a276?auto=format&fit=crop&w=400&q=80';
                  }}
                />
              )}
              <div className="truncate flex-1 font-mono text-xs">
                <div className="font-bold text-white truncate">{productToDelete.name}</div>
                <div className="text-[10px] text-zinc-400">
                  {productToDelete.brand} • <span className="capitalize">{productToDelete.category}</span>
                </div>
                <div className="text-amber-400 font-bold text-[11px] mt-0.5">
                  ₹{productToDelete.priceInr.toLocaleString('en-IN')}
                </div>
              </div>
            </div>

            {/* Modal Buttons */}
            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-zinc-800">
              <button
                type="button"
                disabled={isDeletingProduct}
                onClick={() => setProductToDelete(null)}
                className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-mono transition cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeletingProduct}
                onClick={handleConfirmDeleteProduct}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold font-mono text-xs transition cursor-pointer flex items-center gap-1.5 shadow-lg shadow-rose-900/40 disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isDeletingProduct ? 'Removing Product...' : 'Yes, Remove Product'}</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* 8. RESET FACTORY CATALOG CONFIRMATION MODAL */}
      {showResetCatalogConfirm && isOwner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
          <div className="bg-zinc-950 border border-zinc-800 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden p-6 space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex items-start space-x-3.5">
              <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 shrink-0">
                <RotateCcw className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="font-bold text-white text-base">Restore Factory Catalog?</h3>
                <p className="text-xs text-zinc-400 leading-relaxed font-sans">
                  This will reset all hardware products in your store back to the default certified list (Waaree, Adani, Luminous, Growatt, LiFePO4, IoT cleaning kits, and DC accessories).
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-zinc-800">
              <button
                type="button"
                disabled={isResettingCatalog}
                onClick={() => setShowResetCatalogConfirm(false)}
                className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-mono transition cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isResettingCatalog}
                onClick={handleConfirmResetCatalog}
                className="px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold font-mono text-xs transition cursor-pointer flex items-center gap-1.5 shadow disabled:opacity-50"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>{isResettingCatalog ? 'Restoring...' : 'Restore Factory Catalog'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 9. BUY HARDWARE RETAILER SELECTION MODAL (Flipkart & Amazon Redirection) */}
      {selectedBuyProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
          <div className="bg-zinc-950 border border-zinc-800 rounded-3xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            
            {/* Header */}
            <div className="p-5 border-b border-zinc-800 flex items-center justify-between bg-black">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
                  <ShoppingBag className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-[10px] font-mono font-bold text-amber-400 uppercase tracking-wider">
                    Hardware Procurement Option
                  </div>
                  <h3 className="font-bold text-white text-base">
                    Buy {selectedBuyProduct.name}
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedBuyProduct(null)}
                className="p-1.5 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-900 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs custom-scrollbar">
              
              {/* Product Spotlight Card */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-black/60 border border-zinc-900 rounded-2xl p-4">
                <div className="relative aspect-video sm:aspect-square rounded-xl overflow-hidden bg-zinc-900 border border-zinc-800">
                  <img
                    src={selectedBuyProduct.image}
                    alt={selectedBuyProduct.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1509391365360-2e959784a276?auto=format&fit=crop&w=400&q=80';
                    }}
                  />
                  <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-black/80 font-mono text-[9px] font-bold text-amber-300">
                    {selectedBuyProduct.brand}
                  </div>
                </div>

                <div className="sm:col-span-2 space-y-2 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
                        In Stock & Verified
                      </span>
                      {selectedBuyProduct.badge && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-amber-400/10 text-amber-300 border border-amber-400/20 font-bold">
                          {selectedBuyProduct.badge}
                        </span>
                      )}
                    </div>
                    <h4 className="text-sm font-bold text-white mt-1.5 leading-snug">
                      {selectedBuyProduct.name}
                    </h4>
                    <p className="text-[11px] text-zinc-400 mt-1 line-clamp-2 leading-relaxed">
                      {selectedBuyProduct.description}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-zinc-900 flex items-center justify-between">
                    <div>
                      <div className="text-[10px] font-mono text-zinc-500">Benchmark Price:</div>
                      <div className="text-lg font-black text-amber-400 font-mono">
                        ₹{selectedBuyProduct.priceInr.toLocaleString('en-IN')}
                      </div>
                    </div>
                    <div className="text-right text-[10px] font-mono text-zinc-400">
                      <div>Warranty: <span className="text-zinc-200">{selectedBuyProduct.warranty}</span></div>
                      <div>Rating: <span className="text-amber-300">★ {selectedBuyProduct.rating} ({selectedBuyProduct.reviewsCount})</span></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Redirection Options Heading */}
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <span>Choose Your Preferred Online Store</span>
                </h4>
                <p className="text-xs text-zinc-400 leading-relaxed font-sans">
                  Click below to be redirected directly to Flipkart or Amazon with verified listings, vendor ratings, doorstep delivery, and standard warranties.
                </p>
              </div>

              {/* Retailer Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* 1. AMAZON INDIA */}
                <div className="bg-gradient-to-b from-zinc-900/90 to-black border border-[#FF9900]/40 hover:border-[#FF9900] rounded-2xl p-5 flex flex-col justify-between space-y-4 shadow-xl transition group">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="px-3 py-1 rounded-lg bg-[#FF9900] text-black font-black font-mono text-xs flex items-center gap-1.5 shadow">
                        <span>amazon.in</span>
                      </div>
                      <span className="text-[10px] font-mono text-[#FFB84D] bg-[#FF9900]/10 px-2 py-0.5 rounded border border-[#FF9900]/20">
                        Prime Eligible
                      </span>
                    </div>
                    <h5 className="font-bold text-white text-sm group-hover:text-[#FFB84D] transition">
                      Buy on Amazon India
                    </h5>
                    <p className="text-[11px] text-zinc-400 leading-relaxed">
                      Search and purchase {selectedBuyProduct.brand} {selectedBuyProduct.name} with Amazon A-to-z buyer guarantee, fast shipping, and verified solar vendor inventory.
                    </p>
                  </div>

                  <a
                    href={getAmazonUrl(selectedBuyProduct)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-3 px-4 rounded-xl bg-[#FF9900] hover:bg-[#FFA31A] text-slate-950 font-black font-mono text-xs transition flex items-center justify-center gap-2 shadow-lg shadow-[#FF9900]/20 cursor-pointer"
                  >
                    <span>Proceed to Amazon</span>
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>

                {/* 2. FLIPKART */}
                <div className="bg-gradient-to-b from-zinc-900/90 to-black border border-[#2874F0]/40 hover:border-[#2874F0] rounded-2xl p-5 flex flex-col justify-between space-y-4 shadow-xl transition group">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="px-3 py-1 rounded-lg bg-[#2874F0] text-white font-black font-mono text-xs flex items-center gap-1.5 shadow">
                        <span>Flipkart</span>
                      </div>
                      <span className="text-[10px] font-mono text-[#6AA2FF] bg-[#2874F0]/10 px-2 py-0.5 rounded border border-[#2874F0]/20">
                        Plus Assured
                      </span>
                    </div>
                    <h5 className="font-bold text-white text-sm group-hover:text-[#6AA2FF] transition">
                      Buy on Flipkart
                    </h5>
                    <p className="text-[11px] text-zinc-400 leading-relaxed">
                      Search and order {selectedBuyProduct.brand} {selectedBuyProduct.name} on Flipkart with SuperCoins, cash on delivery options, and brand warranties.
                    </p>
                  </div>

                  <a
                    href={getFlipkartUrl(selectedBuyProduct)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-3 px-4 rounded-xl bg-[#2874F0] hover:bg-[#1A62DC] text-white font-black font-mono text-xs transition flex items-center justify-center gap-2 shadow-lg shadow-[#2874F0]/25 cursor-pointer"
                  >
                    <span>Proceed to Flipkart</span>
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>

              </div>

              {/* Additional Options: Add to Quote */}
              <div className="pt-2 border-t border-zinc-900 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-mono">
                <div className="text-zinc-500 text-[11px]">
                  Need an official engineering quotation with complete Bill of Materials (BOM)?
                </div>
                <button
                  type="button"
                  onClick={() => {
                    handleUpdateQuantity(selectedBuyProduct.id, 1);
                    setSelectedBuyProduct(null);
                    setShowQuoteDrawer(true);
                  }}
                  className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-amber-300 border border-amber-500/30 transition flex items-center gap-1.5 cursor-pointer font-bold"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add to Engineering Quote</span>
                </button>
              </div>

            </div>

            {/* Footer */}
            <div className="p-4 border-t border-zinc-800 bg-black flex items-center justify-end">
              <button
                type="button"
                onClick={() => setSelectedBuyProduct(null)}
                className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-mono transition cursor-pointer"
              >
                Close
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
