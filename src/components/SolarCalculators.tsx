import React from 'react';
import { 
  Calculator, 
  Sun, 
  BatteryCharging, 
  HelpCircle, 
  CheckCircle2, 
  Info, 
  Zap, 
  IndianRupee,
  Layers,
  ShieldCheck,
  TrendingUp
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface SolarCalculatorsProps {
  onSavePreset?: (data: { monthlyBill: number; unitPrice: number; nightLoad: number; hours: number }) => void;
}

export const SolarCalculators: React.FC<SolarCalculatorsProps> = () => {
  // Calculator 1: Solar System Size
  const [monthlyBill, setMonthlyBill] = React.useState<number>(3600);
  const [unitPrice, setUnitPrice] = React.useState<number>(7.5);

  // Calculator 2: Battery Capacity
  const [nightLoadWatts, setNightLoadWatts] = React.useState<number>(450);
  const [backupHours, setBackupHours] = React.useState<number>(6);

  // Formulas specified in prompt:
  // Formula: (Bill / Unit Price) / 120 = Recommended kW Size
  const unitsConsumed = unitPrice > 0 ? monthlyBill / unitPrice : 0;
  const recommendedKw = unitPrice > 0 ? (monthlyBill / unitPrice) / 120 : 0;
  const panelsRequired330W = Math.ceil((recommendedKw * 1000) / 330);
  const annualSavings = monthlyBill * 12 * 0.9; // ~90% offset

  // Battery Formula: (Watts * Hours) / 12 = Base Ah
  // Lead-Acid required (Base Ah * 2) [due to 50% DoD]
  // Lithium required (Base Ah * 1.2) [due to 80-90% DoD]
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

  return (
    <div className="space-y-6">
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl backdrop-blur-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-800 gap-3">
          <div className="flex items-center space-x-3">
            <div className="p-2 sm:p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 shrink-0">
              <Calculator className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-2 flex-wrap">
                <span>Solar & Battery Planning</span>
                <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Formula Engine
                </span>
              </h2>
              <p className="text-[11px] sm:text-xs text-slate-400">
                Photovoltaic sizing & energy storage engineering formulas
              </p>
            </div>
          </div>
          <button
            onClick={triggerCelebrate}
            className="text-xs font-medium px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
          >
            <TrendingUp className="w-3.5 h-3.5 text-amber-400" />
            Estimate ROI
          </button>
        </div>

        {/* 2 Calculators Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mt-4 sm:mt-6">

          {/* Calculator 1: Solar System Size */}
          <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-4 sm:p-5 flex flex-col justify-between hover:border-amber-500/30 transition-all duration-300">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
                    <Sun className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white text-sm">Solar System Size Calculator</h3>
                    <p className="text-[11px] text-slate-400 font-mono">
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
                  <div className="flex justify-between text-slate-300 mb-1.5">
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
                      className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
                    />
                    <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-1">
                      <span>₹500</span>
                      <span>₹15,000</span>
                      <span>₹35,000</span>
                    </div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-slate-300 mb-1.5">
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
                      className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
                    />
                    <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-1">
                      <span>₹3.00</span>
                      <span>₹8.00</span>
                      <span>₹18.00</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick info chip */}
              <div className="mt-4 p-2.5 bg-slate-900/90 rounded-lg border border-slate-800/80 flex items-center justify-between text-xs font-mono text-slate-400">
                <span>Monthly Generation Target:</span>
                <span className="text-white font-semibold">{unitsConsumed.toFixed(0)} kWh (Units)</span>
              </div>
            </div>

            {/* Recommendation Result Display */}
            <div className="mt-6 pt-4 border-t border-slate-800/80">
              <div className="bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/30 rounded-xl p-4">
                <div className="text-[11px] font-mono uppercase text-amber-300 tracking-wider">
                  Recommended System Capacity
                </div>
                <div className="flex items-baseline space-x-2 mt-1">
                  <span className="text-3xl font-extrabold font-mono text-white tracking-tight">
                    {recommendedKw.toFixed(2)}
                  </span>
                  <span className="text-amber-400 font-bold text-lg">kW</span>
                  <span className="text-xs text-slate-400 ml-2">
                    (~{(recommendedKw * 1000).toFixed(0)} Watts Peak)
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-amber-500/20 text-xs">
                  <div>
                    <div className="text-[10px] text-slate-400">330W Panels Needed</div>
                    <div className="font-mono font-bold text-white mt-0.5">{panelsRequired330W} Modules</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-400">Est. Annual Savings</div>
                    <div className="font-mono font-bold text-emerald-400 mt-0.5">
                      ₹{annualSavings.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Calculator 2: Battery Capacity */}
          <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-5 flex flex-col justify-between hover:border-sky-500/30 transition-all duration-300">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <div className="p-2 rounded-lg bg-sky-500/10 text-sky-400">
                    <BatteryCharging className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white text-sm">Battery Capacity Calculator</h3>
                    <p className="text-[11px] text-slate-400 font-mono">
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
                  <div className="flex justify-between text-slate-300 mb-1.5">
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
                      className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-sky-500"
                    />
                    <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-1">
                      <span>50W</span>
                      <span>1200W</span>
                      <span>3000W</span>
                    </div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-slate-300 mb-1.5">
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
                      className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-sky-500"
                    />
                    <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-1">
                      <span>1h</span>
                      <span>8h</span>
                      <span>24h</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick info chip */}
              <div className="mt-4 p-2.5 bg-slate-900/90 rounded-lg border border-slate-800/80 flex items-center justify-between text-xs font-mono text-slate-400">
                <span>Total Energy Consumed:</span>
                <span className="text-white font-semibold">{totalKwhBackup.toFixed(2)} kWh ({baseAh.toFixed(1)} Base Ah @ 12V)</span>
              </div>
            </div>

            {/* Results: Lead Acid vs Lithium Required */}
            <div className="mt-6 pt-4 border-t border-slate-800/80">
              <div className="grid grid-cols-2 gap-3">
                {/* Lead-Acid (Base * 2) */}
                <div className="bg-slate-900/90 border border-amber-500/20 rounded-xl p-3.5">
                  <div className="flex items-center justify-between text-[10px] text-amber-400 font-mono uppercase tracking-wider mb-1">
                    <span>Lead-Acid</span>
                    <span className="text-slate-500">50% DoD</span>
                  </div>
                  <div className="flex items-baseline space-x-1.5">
                    <span className="text-2xl font-black font-mono text-white">
                      {leadAcidAh.toFixed(0)}
                    </span>
                    <span className="text-amber-400 font-bold text-sm">Ah</span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">
                    Req: {leadAcidAh.toFixed(0)} Ah (e.g., {Math.ceil(leadAcidAh / 150)}x 150Ah Tubular batteries)
                  </p>
                </div>

                {/* Lithium (Base * 1.2) */}
                <div className="bg-slate-900/90 border border-emerald-500/20 rounded-xl p-3.5">
                  <div className="flex items-center justify-between text-[10px] text-emerald-400 font-mono uppercase tracking-wider mb-1">
                    <span>Lithium (LiFePO4)</span>
                    <span className="text-slate-500">85% DoD</span>
                  </div>
                  <div className="flex items-baseline space-x-1.5">
                    <span className="text-2xl font-black font-mono text-white">
                      {lithiumAh.toFixed(0)}
                    </span>
                    <span className="text-emerald-400 font-bold text-sm">Ah</span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">
                    Req: {lithiumAh.toFixed(0)} Ah (Compact, 3500+ cycles)
                  </p>
                </div>
              </div>
            </div>

          </div>

        </div>
      </div>
    </div>
  );
};
