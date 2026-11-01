import React, { useState, useEffect } from 'react';
import { 
  Calculator, 
  Sun, 
  BatteryCharging, 
  Zap, 
  TrendingUp,
  ExternalLink,
  ShoppingBag,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
  Edit3,
  Save,
  RotateCcw,
  X,
  Plus,
  Trash2,
  Globe
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { OWNER_EMAILS } from './ResearchMode';

export interface SolarBuyLink {
  id: number;
  name: string;
  brand: string;
  url: string;
  description: string;
  badge: string;
  defaultMonthlyBill?: number;
  defaultUnitPrice?: number;
  defaultNightLoad?: number;
  defaultBackupHours?: number;
}

const DEFAULT_BUY_LINKS: SolarBuyLink[] = [
  {
    id: 1,
    name: 'Luminous Solar Official Store',
    brand: 'Luminous India',
    url: 'https://www.luminousindia.com/solar-products.html',
    description: 'High-efficiency monocrystalline solar panels, solar hybrid inverters (Solar NXG / Solarverter Pro), and tubular solar batteries.',
    badge: 'Official Luminous Store',
    defaultMonthlyBill: 4500,
    defaultUnitPrice: 8.0,
    defaultNightLoad: 600,
    defaultBackupHours: 8,
  },
  {
    id: 2,
    name: 'Tata Power Solar Systems',
    brand: 'Tata Power Solar',
    url: 'https://www.tatapowersolar.com/',
    description: 'Tier-1 rooftop solar panel modules, on-grid string inverters, and utility net-metering turnkey packages.',
    badge: 'Tier-1 Certified',
    defaultMonthlyBill: 6000,
    defaultUnitPrice: 7.5,
    defaultNightLoad: 800,
    defaultBackupHours: 6,
  },
  {
    id: 3,
    name: 'Loom Solar High-Efficiency Monoperc',
    brand: 'Loom Solar',
    url: 'https://www.loomsolar.com/',
    description: 'Shark bi-facial and super high-efficiency monocrystalline solar panels designed for low-light and shaded rooftops.',
    badge: 'Shark Bi-facial',
    defaultMonthlyBill: 3000,
    defaultUnitPrice: 7.0,
    defaultNightLoad: 400,
    defaultBackupHours: 6,
  },
  {
    id: 4,
    name: 'Waaree Energies Solar Solutions',
    brand: 'Waaree Solar',
    url: 'https://waaree.com/products/solar-panel',
    description: 'ALMM approved top-grade photovoltaic modules with 25-year performance warranty and micro-inverter compatibility.',
    badge: 'ALMM Approved',
    defaultMonthlyBill: 7500,
    defaultUnitPrice: 8.5,
    defaultNightLoad: 1000,
    defaultBackupHours: 8,
  },
  {
    id: 5,
    name: 'IoT Hardware Test Station Components',
    brand: 'Maker Electronics',
    url: 'https://www.amazon.in/s?k=INA219+ESP32+LM35+solar+cleaner',
    description: 'INA219 I2C current shunt, LM35 analog temperature sensor, FC-37 rain detector, 12V silicone squeegee gearmotor, and optoisolated relays.',
    badge: 'Hardware Build Kit',
    defaultMonthlyBill: 1200,
    defaultUnitPrice: 6.5,
    defaultNightLoad: 150,
    defaultBackupHours: 4,
  }
];

interface SolarCalculatorsProps {
  currentUser?: {
    email?: string | null;
    displayName?: string | null;
  } | null;
  onRequireSignIn?: () => void;
  onSavePreset?: (data: { monthlyBill: number; unitPrice: number; nightLoad: number; hours: number }) => void;
  onNavigateToStore?: () => void;
}

export const SolarCalculators: React.FC<SolarCalculatorsProps> = ({ 
  currentUser, 
  onRequireSignIn,
  onNavigateToStore 
}) => {
  // Calculator 1: Solar System Size
  const [monthlyBill, setMonthlyBill] = useState<number>(3600);
  const [unitPrice, setUnitPrice] = useState<number>(7.5);

  // Calculator 2: Battery Capacity
  const [nightLoadWatts, setNightLoadWatts] = useState<number>(450);
  const [backupHours, setBackupHours] = useState<number>(6);

  // Buy Links state from Firestore
  const [buyLinks, setBuyLinks] = useState<SolarBuyLink[]>(DEFAULT_BUY_LINKS);
  const [isEditingLinks, setIsEditingLinks] = useState<boolean>(false);
  const [editLinksForm, setEditLinksForm] = useState<SolarBuyLink[]>(DEFAULT_BUY_LINKS);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Verify owner
  const isOwner = Boolean(
    currentUser?.email && 
    OWNER_EMAILS.includes(currentUser.email.trim().toLowerCase())
  );

  // Sync Buy Links from Cloud Firestore
  useEffect(() => {
    const docRef = doc(db, 'solar_iot', 'buy_links');
    const unsubscribe = onSnapshot(docRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (Array.isArray(data.links) && data.links.length > 0) {
          setBuyLinks(data.links);
        }
      }
    });

    return () => unsubscribe();
  }, []);

  // Sizing Formula: (Bill / Unit Price) / 120 = Recommended kW Size
  const unitsConsumed = unitPrice > 0 ? monthlyBill / unitPrice : 0;
  const recommendedKw = unitPrice > 0 ? (monthlyBill / unitPrice) / 120 : 0;
  const panelsRequired330W = Math.ceil((recommendedKw * 1000) / 330);
  const annualSavings = monthlyBill * 12 * 0.9; // ~90% offset

  // Battery Formula: (Watts * Hours) / 12 = Base Ah
  const baseAh = (nightLoadWatts * backupHours) / 12;
  const leadAcidAh = baseAh * 2;
  const lithiumAh = baseAh * 1.2;
  const totalKwhBackup = (nightLoadWatts * backupHours) / 1000;

  const triggerCelebrate = () => {
    confetti({
      particleCount: 40,
      spread: 60,
      origin: { y: 0.8 },
      colors: ['#f59e0b', '#10b981', '#38bdf8']
    });
  };

  const handleApplyPreset = (link: SolarBuyLink) => {
    if (link.defaultMonthlyBill) setMonthlyBill(link.defaultMonthlyBill);
    if (link.defaultUnitPrice) setUnitPrice(link.defaultUnitPrice);
    if (link.defaultNightLoad) setNightLoadWatts(link.defaultNightLoad);
    if (link.defaultBackupHours) setBackupHours(link.defaultBackupHours);

    // Smooth scroll to top of calculator
    window.scrollTo({ top: 0, behavior: 'smooth' });
    triggerCelebrate();
  };

  const handleOpenEditLinks = () => {
    if (!isOwner) {
      if (onRequireSignIn) onRequireSignIn();
      return;
    }
    setEditLinksForm(buyLinks.map(l => ({ ...l })));
    setIsEditingLinks(true);
    setSaveStatus(null);
  };

  const handleAddLink = () => {
    const newId = editLinksForm.length > 0 ? Math.max(...editLinksForm.map(l => l.id)) + 1 : 1;
    const newLink: SolarBuyLink = {
      id: newId,
      name: 'Custom Solar Panel Store',
      brand: 'Solar Vendor',
      url: 'https://www.luminousindia.com/solar-products.html',
      description: 'Buy certified solar panels and inverters online with manufacturer warranty.',
      badge: 'Verified Retailer',
      defaultMonthlyBill: 4000,
      defaultUnitPrice: 7.5,
      defaultNightLoad: 500,
      defaultBackupHours: 6,
    };
    setEditLinksForm([...editLinksForm, newLink]);
  };

  const handleRemoveLink = (index: number) => {
    setEditLinksForm(editLinksForm.filter((_, i) => i !== index));
  };

  const handleSaveLinksToFirebase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isOwner) return;

    setIsSaving(true);
    setSaveStatus('Saving solar buy links to Firebase...');
    try {
      const docRef = doc(db, 'solar_iot', 'buy_links');
      await setDoc(docRef, {
        links: editLinksForm,
        updatedAt: new Date().toISOString(),
      }, { merge: true });

      setBuyLinks(editLinksForm);
      setSaveStatus('Solar buy links saved successfully!');
      setTimeout(() => {
        setIsEditingLinks(false);
        setSaveStatus(null);
      }, 1000);
    } catch (err: any) {
      setSaveStatus(`Failed to save: ${err.message || 'Unknown error'}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      
      {/* Sizing & Planning Section */}
      <div className="bg-zinc-950 border border-zinc-800 rounded-3xl p-5 sm:p-7 shadow-2xl backdrop-blur-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-zinc-800 gap-3">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 sm:p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 shrink-0">
              <Calculator className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-2 flex-wrap">
                <span>Solar PV & Battery Sizing Engine</span>
                <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Formula Engine
                </span>
              </h2>
              <p className="text-[11px] sm:text-xs text-zinc-400">
                Accurate photovoltaic array sizing, inverter load matching & energy storage calculation
              </p>
            </div>
          </div>
          
          <button
            onClick={triggerCelebrate}
            className="text-xs font-mono font-bold px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black shadow-lg shadow-amber-500/20 transition flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
          >
            <TrendingUp className="w-3.5 h-3.5 text-black" />
            <span>Estimate ROI</span>
          </button>
        </div>

        {/* 2 Calculators Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mt-4 sm:mt-6">

          {/* Calculator 1: Solar System Size */}
          <div className="bg-black border border-zinc-800/80 rounded-2xl p-4 sm:p-5 flex flex-col justify-between hover:border-amber-500/30 transition-all duration-300">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
                    <Sun className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white text-sm">Solar System Size Calculator</h3>
                    <p className="text-[11px] text-zinc-400 font-mono">
                      Formula: (Bill / Unit Price) / 120
                    </p>
                  </div>
                </div>
                <span className="text-[10px] font-mono text-amber-400/90 bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/20">
                  PV Rooftop
                </span>
              </div>

              {/* Inputs */}
              <div className="space-y-4 text-xs">
                <div>
                  <div className="flex justify-between text-zinc-300 mb-1.5">
                    <label className="font-medium flex items-center gap-1">
                      Average Monthly Electricity Bill (₹)
                    </label>
                    <span className="font-mono font-bold text-amber-400">
                      ₹{monthlyBill.toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div className="relative">
                    <input
                      type="range"
                      min={500}
                      max={35000}
                      step={250}
                      value={monthlyBill}
                      onChange={(e) => setMonthlyBill(Number(e.target.value))}
                      className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
                    />
                    <div className="flex justify-between text-[10px] text-zinc-500 font-mono mt-1">
                      <span>₹500</span>
                      <span>₹15,000</span>
                      <span>₹35,000</span>
                    </div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-zinc-300 mb-1.5">
                    <label className="font-medium flex items-center gap-1">
                      Price per Electricity Unit (₹ / kWh)
                    </label>
                    <span className="font-mono font-bold text-amber-400">
                      ₹{unitPrice.toFixed(2)}
                    </span>
                  </div>
                  <div className="relative">
                    <input
                      type="range"
                      min={3}
                      max={18}
                      step={0.25}
                      value={unitPrice}
                      onChange={(e) => setUnitPrice(Number(e.target.value))}
                      className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
                    />
                    <div className="flex justify-between text-[10px] text-zinc-500 font-mono mt-1">
                      <span>₹3.00</span>
                      <span>₹8.00</span>
                      <span>₹18.00</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick info chip */}
              <div className="mt-4 p-2.5 bg-zinc-950 rounded-xl border border-zinc-800/80 flex items-center justify-between text-xs font-mono text-zinc-400">
                <span>Monthly Generation Target:</span>
                <span className="text-white font-semibold">{unitsConsumed.toFixed(0)} kWh (Units)</span>
              </div>
            </div>

            {/* Recommendation Result Display */}
            <div className="mt-6 pt-4 border-t border-zinc-800/80">
              <div className="bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/30 rounded-xl p-4">
                <div className="text-[11px] font-mono uppercase text-amber-300 tracking-wider">
                  Recommended System Capacity
                </div>
                <div className="flex items-baseline space-x-2 mt-1">
                  <span className="text-3xl font-extrabold font-mono text-white tracking-tight">
                    {recommendedKw.toFixed(2)}
                  </span>
                  <span className="text-amber-400 font-bold text-lg">kW</span>
                  <span className="text-xs text-zinc-400 ml-2">
                    (~{(recommendedKw * 1000).toFixed(0)} Watts Peak)
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-amber-500/20 text-xs">
                  <div>
                    <div className="text-[10px] text-zinc-400">330W Panels Needed</div>
                    <div className="font-mono font-bold text-white mt-0.5">{panelsRequired330W} Modules</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-zinc-400">Est. Annual Savings</div>
                    <div className="font-mono font-bold text-emerald-400 mt-0.5">
                      ₹{annualSavings.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Calculator 2: Battery Capacity */}
          <div className="bg-black border border-zinc-800/80 rounded-2xl p-4 sm:p-5 flex flex-col justify-between hover:border-sky-500/30 transition-all duration-300">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <div className="p-2 rounded-xl bg-sky-500/10 text-sky-400">
                    <BatteryCharging className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white text-sm">Battery Capacity Calculator</h3>
                    <p className="text-[11px] text-zinc-400 font-mono">
                      Formula: (Watts * Hours) / 12 = Base Ah (12V Bank)
                    </p>
                  </div>
                </div>
                <span className="text-[10px] font-mono text-sky-400/90 bg-sky-400/10 px-2 py-0.5 rounded border border-sky-400/20">
                  Storage Bank
                </span>
              </div>

              {/* Inputs */}
              <div className="space-y-4 text-xs">
                <div>
                  <div className="flex justify-between text-zinc-300 mb-1.5">
                    <label className="font-medium flex items-center gap-1">
                      Nighttime / Inverter Load (Watts)
                    </label>
                    <span className="font-mono font-bold text-sky-400">
                      {nightLoadWatts} W
                    </span>
                  </div>
                  <div className="relative">
                    <input
                      type="range"
                      min={50}
                      max={3000}
                      step={25}
                      value={nightLoadWatts}
                      onChange={(e) => setNightLoadWatts(Number(e.target.value))}
                      className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-sky-500"
                    />
                    <div className="flex justify-between text-[10px] text-zinc-500 font-mono mt-1">
                      <span>50W</span>
                      <span>1200W</span>
                      <span>3000W</span>
                    </div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-zinc-300 mb-1.5">
                    <label className="font-medium flex items-center gap-1">
                      Desired Backup Duration (Hours)
                    </label>
                    <span className="font-mono font-bold text-sky-400">
                      {backupHours} Hours
                    </span>
                  </div>
                  <div className="relative">
                    <input
                      type="range"
                      min={1}
                      max={24}
                      step={0.5}
                      value={backupHours}
                      onChange={(e) => setBackupHours(Number(e.target.value))}
                      className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-sky-500"
                    />
                    <div className="flex justify-between text-[10px] text-zinc-500 font-mono mt-1">
                      <span>1h</span>
                      <span>8h</span>
                      <span>24h</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick info chip */}
              <div className="mt-4 p-2.5 bg-zinc-950 rounded-xl border border-zinc-800/80 flex items-center justify-between text-xs font-mono text-zinc-400">
                <span>Total Energy Consumed:</span>
                <span className="text-white font-semibold">{totalKwhBackup.toFixed(2)} kWh ({baseAh.toFixed(1)} Base Ah @ 12V)</span>
              </div>
            </div>

            {/* Results: Lead Acid vs Lithium Required */}
            <div className="mt-6 pt-4 border-t border-zinc-800/80">
              <div className="grid grid-cols-2 gap-3">
                {/* Lead-Acid */}
                <div className="bg-zinc-950 border border-amber-500/20 rounded-xl p-3.5">
                  <div className="flex items-center justify-between text-[10px] text-amber-400 font-mono uppercase tracking-wider mb-1">
                    <span>Lead-Acid</span>
                    <span className="text-zinc-500">50% DoD</span>
                  </div>
                  <div className="flex items-baseline space-x-1.5">
                    <span className="text-2xl font-black font-mono text-white">
                      {leadAcidAh.toFixed(0)}
                    </span>
                    <span className="text-amber-400 font-bold text-sm">Ah</span>
                  </div>
                  <p className="text-[10px] text-zinc-400 mt-1">
                    Req: {leadAcidAh.toFixed(0)} Ah ({Math.ceil(leadAcidAh / 150)}x 150Ah Tubular)
                  </p>
                </div>

                {/* Lithium */}
                <div className="bg-zinc-950 border border-emerald-500/20 rounded-xl p-3.5">
                  <div className="flex items-center justify-between text-[10px] text-emerald-400 font-mono uppercase tracking-wider mb-1">
                    <span>Lithium (LiFePO4)</span>
                    <span className="text-zinc-500">85% DoD</span>
                  </div>
                  <div className="flex items-baseline space-x-1.5">
                    <span className="text-2xl font-black font-mono text-white">
                      {lithiumAh.toFixed(0)}
                    </span>
                    <span className="text-emerald-400 font-bold text-sm">Ah</span>
                  </div>
                  <p className="text-[10px] text-zinc-400 mt-1">
                    Req: {lithiumAh.toFixed(0)} Ah (Compact, 3500+ cycles)
                  </p>
                </div>
              </div>
            </div>

          </div>

        </div>
      </div>

      {/* NEW SECTION: Buy Solar Panels & Hardware Store Direct Redirect Links */}
      <div className="bg-zinc-950 border border-zinc-800 rounded-3xl p-5 sm:p-7 shadow-2xl space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-zinc-800 gap-3">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 sm:p-3 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 shrink-0">
              <ShoppingBag className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-2">
                <span>Buy Solar Panels & Inverters</span>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                  Luminous & Tier-1 Brands
                </span>
              </h3>
              <p className="text-[11px] sm:text-xs text-zinc-400">
                Direct official website store links with 1-click automatic sizing calculator presets
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {onNavigateToStore && (
              <button
                type="button"
                onClick={onNavigateToStore}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 text-xs font-mono font-bold transition cursor-pointer flex items-center gap-1.5 shadow"
              >
                <ShoppingBag className="w-3.5 h-3.5" />
                <span>Go to Hardware Store</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}

            {isOwner && (
              <button
                type="button"
                onClick={handleOpenEditLinks}
                className="px-3.5 py-2 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/40 text-xs font-mono font-bold transition cursor-pointer flex items-center gap-1.5"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Edit Store Links</span>
              </button>
            )}
          </div>
        </div>

        {/* Brand Buy Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {buyLinks.map((link) => (
            <div 
              key={link.id} 
              className="p-5 bg-black rounded-2xl border border-zinc-800/80 hover:border-cyan-500/40 transition flex flex-col justify-between space-y-4 shadow-lg group"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                    {link.badge}
                  </span>
                  <span className="text-[11px] font-mono text-zinc-500">
                    {link.brand}
                  </span>
                </div>

                <h4 className="text-sm font-bold text-white group-hover:text-cyan-300 transition">
                  {link.name}
                </h4>

                <p className="text-xs text-zinc-400 leading-relaxed">
                  {link.description}
                </p>
              </div>

              <div className="space-y-2 pt-2 border-t border-zinc-900">
                {/* 1-Click Apply to Sizing */}
                <button
                  type="button"
                  onClick={() => handleApplyPreset(link)}
                  className="w-full py-2 px-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-amber-300 border border-amber-500/30 text-xs font-mono font-bold transition cursor-pointer flex items-center justify-center gap-1.5"
                  title="Load pre-configured electricity bill and load into the sizing calculator above"
                >
                  <Calculator className="w-3.5 h-3.5 text-amber-400" />
                  <span>Size This System in Calculator</span>
                </button>

                {/* External Buy Link */}
                <a
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs font-mono font-bold transition flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20"
                >
                  <span>Open {link.brand} Website</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Owner-Only Edit Buy Links Modal */}
      {isEditingLinks && isOwner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
          <div className="bg-zinc-950 border border-zinc-800 rounded-3xl w-full max-w-3xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
            
            <div className="p-5 border-b border-zinc-800 flex items-center justify-between bg-black">
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400">
                  <ShoppingBag className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">Edit Solar Panel Buy Links & Stores</h3>
                  <p className="text-xs text-zinc-400 font-mono">
                    Owner Mode | Target Document: <strong className="text-cyan-400">solar_iot/buy_links</strong>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsEditingLinks(false)}
                className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-900 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveLinksToFirebase} className="p-6 overflow-y-auto space-y-4 flex-1 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-cyan-300">
                  Manage Store Links ({editLinksForm.length} total)
                </span>
                <button
                  type="button"
                  onClick={handleAddLink}
                  className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-black font-mono font-bold text-xs flex items-center gap-1 cursor-pointer transition shadow"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Store Link</span>
                </button>
              </div>

              {editLinksForm.map((item, index) => (
                <div key={item.id || index} className="p-4 bg-black rounded-2xl border border-zinc-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold text-cyan-400">Store #{index + 1}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveLink(index)}
                      className="text-rose-400 hover:text-rose-300 flex items-center gap-1 text-[11px] font-mono cursor-pointer transition"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Remove</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] text-zinc-400 block mb-1">Store / Website Name</label>
                      <input
                        type="text"
                        value={item.name}
                        onChange={(e) => {
                          const updated = [...editLinksForm];
                          updated[index].name = e.target.value;
                          setEditLinksForm(updated);
                        }}
                        className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-2 text-zinc-200 text-xs focus:outline-none focus:border-cyan-400"
                        required
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-zinc-400 block mb-1">Brand</label>
                      <input
                        type="text"
                        value={item.brand}
                        onChange={(e) => {
                          const updated = [...editLinksForm];
                          updated[index].brand = e.target.value;
                          setEditLinksForm(updated);
                        }}
                        className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-2 text-zinc-200 text-xs focus:outline-none focus:border-cyan-400"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] text-zinc-400 block mb-1">Website URL (Buy Link)</label>
                    <input
                      type="url"
                      value={item.url}
                      onChange={(e) => {
                        const updated = [...editLinksForm];
                        updated[index].url = e.target.value;
                        setEditLinksForm(updated);
                      }}
                      className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-2 text-zinc-200 text-xs focus:outline-none focus:border-cyan-400"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-[10px] text-zinc-400 block mb-1">Description</label>
                    <textarea
                      value={item.description}
                      onChange={(e) => {
                        const updated = [...editLinksForm];
                        updated[index].description = e.target.value;
                        setEditLinksForm(updated);
                      }}
                      rows={2}
                      className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-2 text-zinc-300 text-xs focus:outline-none focus:border-cyan-400"
                    />
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 border-t border-zinc-900">
                    <div>
                      <label className="text-[10px] text-zinc-500 block">Default Bill (₹)</label>
                      <input
                        type="number"
                        value={item.defaultMonthlyBill || 3600}
                        onChange={(e) => {
                          const updated = [...editLinksForm];
                          updated[index].defaultMonthlyBill = Number(e.target.value);
                          setEditLinksForm(updated);
                        }}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded p-1.5 text-zinc-200 text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-zinc-500 block">Unit Price (₹)</label>
                      <input
                        type="number"
                        value={item.defaultUnitPrice || 7.5}
                        onChange={(e) => {
                          const updated = [...editLinksForm];
                          updated[index].defaultUnitPrice = Number(e.target.value);
                          setEditLinksForm(updated);
                        }}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded p-1.5 text-zinc-200 text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-zinc-500 block">Night Load (W)</label>
                      <input
                        type="number"
                        value={item.defaultNightLoad || 450}
                        onChange={(e) => {
                          const updated = [...editLinksForm];
                          updated[index].defaultNightLoad = Number(e.target.value);
                          setEditLinksForm(updated);
                        }}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded p-1.5 text-zinc-200 text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-zinc-500 block">Backup (Hours)</label>
                      <input
                        type="number"
                        value={item.defaultBackupHours || 6}
                        onChange={(e) => {
                          const updated = [...editLinksForm];
                          updated[index].defaultBackupHours = Number(e.target.value);
                          setEditLinksForm(updated);
                        }}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded p-1.5 text-zinc-200 text-xs"
                      />
                    </div>
                  </div>
                </div>
              ))}

              {saveStatus && (
                <div className={`p-3 rounded-xl border text-xs font-mono flex items-center gap-2 ${
                  saveStatus.includes('successfully') ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200' : 'bg-cyan-950/40 border-cyan-500/40 text-cyan-200'
                }`}>
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{saveStatus}</span>
                </div>
              )}

              <div className="flex items-center justify-between pt-2 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setEditLinksForm(DEFAULT_BUY_LINKS)}
                  className="text-zinc-400 hover:text-white transition flex items-center gap-1.5 cursor-pointer text-xs"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset to Defaults</span>
                </button>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsEditingLinks(false)}
                    className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition cursor-pointer text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="px-5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold transition cursor-pointer flex items-center gap-2 shadow-lg disabled:opacity-50 text-xs"
                  >
                    <Save className="w-4 h-4" />
                    <span>{isSaving ? 'Saving...' : 'Save to Firebase'}</span>
                  </button>
                </div>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
};
