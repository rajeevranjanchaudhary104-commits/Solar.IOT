import React, { useState, useEffect } from 'react';
import { 
  GraduationCap, 
  Users, 
  Award, 
  School, 
  MapPin, 
  Edit3, 
  Save, 
  X, 
  Check, 
  Copy, 
  RotateCcw, 
  Search, 
  Sliders, 
  Sparkles, 
  Lock, 
  CheckCircle2, 
  HelpCircle,
  BookOpen,
  Tag,
  Hash,
  Database
} from 'lucide-react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

// Designated owner email constant checked internally only
export const OWNER_EMAIL = 'rajeevranjanchaudhary104@gmail.com';

export interface ResearchData {
  student1Name: string;
  student1Role: string;
  student2Name: string;
  student2Role: string;
  teacher1Name: string;
  teacher1Subject: string;
  teacher2Name: string;
  teacher2Subject: string;
  schoolName: string;
  schoolAddress: string;
  projectTitle: string;
  updatedAt?: string;
}

export interface CustomSlotItem {
  id: number;
  label: string;
  value: string;
}

const DEFAULT_RESEARCH_DATA: ResearchData = {
  student1Name: 'Student Researcher 1',
  student1Role: 'IoT Microcontroller & Circuit Integration',
  student2Name: 'Student Researcher 2',
  student2Role: 'Photovoltaic Physics & Data Analytics',
  teacher1Name: 'Faculty Research Advisor',
  teacher1Subject: 'Department of Renewable Energy',
  teacher2Name: 'Technical Project Mentor',
  teacher2Subject: 'Embedded Electronics & Robotics Lab',
  schoolName: 'Solar Research & Innovation Academy',
  schoolAddress: 'Engineering Campus, Rooftop PV Testing Facility',
  projectTitle: 'Solar.IOT - Autonomous Dual-Pass Cleaning & Telemetry',
};

const DEFAULT_20_SLOTS: CustomSlotItem[] = [
  { id: 1, label: 'PV Array Nominal Wattage', value: '150 Watts Peak (Wp)' },
  { id: 2, label: 'Solar Cell Technology', value: 'Monocrystalline P-N Junction Silicon' },
  { id: 3, label: 'Glass Coating Type', value: 'Hydrophobic Anti-Reflective (ARC)' },
  { id: 4, label: 'Wiper Blade Material', value: 'Soft UV-Resistant Dual Silicone Squeegee' },
  { id: 5, label: 'Night Auto-Clean Schedule', value: '03:00 AM Daily (Automated Scheduled Sweep)' },
  { id: 6, label: 'Water Conservation Savings', value: '350 mL conserved per rain cycle' },
  { id: 7, label: 'Temperature Derating Factor', value: '-0.40% / °C above 25°C STC' },
  { id: 8, label: 'Soiling Loss Recovery', value: 'Up to +25% recovered energy yield' },
  { id: 9, label: 'Relay Drive Mode', value: 'Active-LOW optoisolated 10A relay' },
  { id: 10, label: 'Rain Sensor Model', value: 'FC-37 Gold-plated raindrop collector' },
  { id: 11, label: 'Current Sensor I2C Address', value: '0x40 (Standard INA219 address)' },
  { id: 12, label: 'Daily Energy Target', value: '600 Watt-hours (Wh) / day' },
  { id: 13, label: 'Inverter Topology', value: 'Pure Sine Wave MPPT Charge Controller' },
  { id: 14, label: 'Battery Storage Bank', value: '12V 100Ah Deep Cycle LiFePO4' },
  { id: 15, label: 'WiFi Heartbeat Period', value: '15 Seconds Keep-Alive Heartbeat' },
  { id: 16, label: 'Science Exhibition ID', value: 'EXHIBIT-SOLAR-2026-IoT' },
  { id: 17, label: 'Project Academic Year', value: 'Academic Year 2025-2026' },
  { id: 18, label: 'Laboratory Station Number', value: 'Clean Energy Bench #01' },
  { id: 19, label: 'Patent / Research Paper Ref', value: 'Research Publication Pending' },
  { id: 20, label: 'Special Instructions / Notes', value: 'Motorized sweep active; safe thermal cleaning locked during peak sunshine.' },
];

interface ResearchModeProps {
  currentUser?: {
    email?: string | null;
    displayName?: string | null;
  } | null;
  onRequireSignIn?: () => void;
}

export const ResearchMode: React.FC<ResearchModeProps> = ({ currentUser, onRequireSignIn }) => {
  const [research, setResearch] = useState<ResearchData>(DEFAULT_RESEARCH_DATA);
  const [slots, setSlots] = useState<CustomSlotItem[]>(DEFAULT_20_SLOTS);
  const [isEditing, setIsEditing] = useState(false);
  const [editResearch, setEditResearch] = useState<ResearchData>(DEFAULT_RESEARCH_DATA);
  const [editSlots, setEditSlots] = useState<CustomSlotItem[]>(DEFAULT_20_SLOTS);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState<number | null>(null);

  // Authenticate owner without exposing owner's email address on screen
  const isOwner = Boolean(
    currentUser?.email && 
    currentUser.email.trim().toLowerCase() === OWNER_EMAIL.trim().toLowerCase()
  );

  // Sync Research Data from Firestore
  useEffect(() => {
    const researchDoc = doc(db, 'solar_iot', 'research_data');
    const unsubResearch = onSnapshot(researchDoc, (snap) => {
      if (snap.exists()) {
        const data = snap.data() as Partial<ResearchData>;
        setResearch((prev) => ({
          ...prev,
          student1Name: data.student1Name || prev.student1Name,
          student1Role: data.student1Role || prev.student1Role,
          student2Name: data.student2Name || prev.student2Name,
          student2Role: data.student2Role || prev.student2Role,
          teacher1Name: data.teacher1Name || prev.teacher1Name,
          teacher1Subject: data.teacher1Subject || prev.teacher1Subject,
          teacher2Name: data.teacher2Name || prev.teacher2Name,
          teacher2Subject: data.teacher2Subject || prev.teacher2Subject,
          schoolName: data.schoolName || prev.schoolName,
          schoolAddress: data.schoolAddress || prev.schoolAddress,
          projectTitle: data.projectTitle || prev.projectTitle,
          updatedAt: data.updatedAt,
        }));
      }
    });

    const slotsDoc = doc(db, 'solar_iot', 'custom_slots');
    const unsubSlots = onSnapshot(slotsDoc, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (Array.isArray(data.slots) && data.slots.length > 0) {
          setSlots(data.slots);
        }
      }
    });

    return () => {
      unsubResearch();
      unsubSlots();
    };
  }, []);

  const handleOpenEdit = () => {
    if (!isOwner) {
      if (!currentUser && onRequireSignIn) {
        onRequireSignIn();
        return;
      }
      alert('Access restricted. Only the verified project administrator can modify these slots.');
      return;
    }
    setEditResearch({ ...research });
    setEditSlots([...slots]);
    setIsEditing(true);
    setSaveStatus(null);
  };

  const handleSaveToFirebase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isOwner) {
      setSaveStatus('Access Denied: Administrator authentication required.');
      return;
    }

    setIsSaving(true);
    setSaveStatus('Saving changes to Firebase...');
    try {
      const nowIso = new Date().toISOString();
      
      // Save research data
      const researchDoc = doc(db, 'solar_iot', 'research_data');
      await setDoc(researchDoc, {
        ...editResearch,
        updatedAt: nowIso,
      }, { merge: true });

      // Save 20 custom slots
      const slotsDoc = doc(db, 'solar_iot', 'custom_slots');
      await setDoc(slotsDoc, {
        slots: editSlots,
        updatedAt: nowIso,
      }, { merge: true });

      setResearch(editResearch);
      setSlots(editSlots);
      setSaveStatus('All 20 slots & research data successfully saved to Firebase!');
      setTimeout(() => {
        setIsEditing(false);
        setSaveStatus(null);
      }, 1200);
    } catch (err: any) {
      setSaveStatus(`Failed to save: ${err.message || 'Unknown error'}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCopySlot = (slot: CustomSlotItem) => {
    navigator.clipboard.writeText(`${slot.label}: ${slot.value}`);
    setCopiedId(slot.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filteredSlots = slots.filter(
    (s) => 
      s.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.value.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-fadeIn">
      
      {/* Top Banner */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 backdrop-blur-md relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex items-center space-x-2 text-xs font-mono text-purple-400 bg-purple-500/10 px-3 py-1 rounded-full border border-purple-500/20">
                <GraduationCap className="w-3.5 h-3.5" />
                <span>Academic & Science Exhibition Mode</span>
              </div>

              {/* Owner security badge: hides email from public */}
              {isOwner ? (
                <div className="inline-flex items-center space-x-1.5 text-xs font-mono text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Admin Verified</span>
                </div>
              ) : (
                <div className="inline-flex items-center space-x-1.5 text-xs font-mono text-slate-400 bg-slate-950 px-3 py-1 rounded-full border border-slate-800">
                  <Lock className="w-3.5 h-3.5 text-amber-400" />
                  <span>Admin Access Protected</span>
                </div>
              )}
            </div>

            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              {research.projectTitle || 'Solar.IOT Research & Project Information'}
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
              Official school documentation, participating student researchers, guiding faculty mentors, and 20 customizable engineering slots.
            </p>
          </div>

          {/* Owner-Only Edit Button */}
          <div className="flex items-center gap-2">
            {isOwner ? (
              <button
                onClick={handleOpenEdit}
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-400 hover:to-indigo-400 text-white font-bold text-xs font-mono transition cursor-pointer flex items-center gap-2 shadow-lg shadow-purple-500/20"
              >
                <Edit3 className="w-4 h-4" />
                <span>Edit Research & 20 Slots</span>
              </button>
            ) : (
              <button
                onClick={onRequireSignIn}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-xs transition cursor-pointer flex items-center gap-1.5 border border-slate-700"
              >
                <Lock className="w-3.5 h-3.5 text-amber-400" />
                <span>Admin Login to Edit</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* SECTION 1: School Name & Address */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-7 backdrop-blur-md shadow-xl">
        <div className="flex items-center space-x-3 mb-4">
          <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
            <School className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
              Educational Institution & Research Facility
            </h3>
            <p className="text-xs text-slate-400">
              Institution hosting and deploying the Solar.IOT cyber-physical station
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
          <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-1">
            <div className="text-[11px] text-purple-400 font-bold flex items-center gap-1.5">
              <School className="w-3.5 h-3.5" />
              School / College Name
            </div>
            <div className="text-sm font-bold text-white font-sans pt-1">
              {research.schoolName}
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-1">
            <div className="text-[11px] text-cyan-400 font-bold flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5" />
              Campus / Facility Address
            </div>
            <div className="text-sm font-bold text-white font-sans pt-1">
              {research.schoolAddress}
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 2: 2 Student Slots & 2 Teacher Slots */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Student Slots (2 Slots) */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 backdrop-blur-md shadow-xl space-y-4">
          <div className="flex items-center space-x-3 border-b border-slate-800 pb-3">
            <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">
                Student Researchers (2 Slots)
              </h3>
              <p className="text-xs text-slate-400">Primary student developers and analysts</p>
            </div>
          </div>

          {/* Student 1 Slot */}
          <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-1 relative overflow-hidden">
            <div className="text-[10px] font-mono text-cyan-400 font-bold uppercase tracking-wider">
              Student Slot #1
            </div>
            <div className="text-sm font-bold text-white font-sans">
              {research.student1Name}
            </div>
            <div className="text-xs text-slate-400 font-sans">
              {research.student1Role}
            </div>
          </div>

          {/* Student 2 Slot */}
          <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-1 relative overflow-hidden">
            <div className="text-[10px] font-mono text-cyan-400 font-bold uppercase tracking-wider">
              Student Slot #2
            </div>
            <div className="text-sm font-bold text-white font-sans">
              {research.student2Name}
            </div>
            <div className="text-xs text-slate-400 font-sans">
              {research.student2Role}
            </div>
          </div>
        </div>

        {/* Teacher Slots (2 Slots) */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 backdrop-blur-md shadow-xl space-y-4">
          <div className="flex items-center space-x-3 border-b border-slate-800 pb-3">
            <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">
                Faculty Guides & Teachers (2 Slots)
              </h3>
              <p className="text-xs text-slate-400">Guiding instructors and academic advisors</p>
            </div>
          </div>

          {/* Teacher 1 Slot */}
          <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-1 relative overflow-hidden">
            <div className="text-[10px] font-mono text-emerald-400 font-bold uppercase tracking-wider">
              Teacher / Advisor Slot #1
            </div>
            <div className="text-sm font-bold text-white font-sans">
              {research.teacher1Name}
            </div>
            <div className="text-xs text-slate-400 font-sans">
              {research.teacher1Subject}
            </div>
          </div>

          {/* Teacher 2 Slot */}
          <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-1 relative overflow-hidden">
            <div className="text-[10px] font-mono text-emerald-400 font-bold uppercase tracking-wider">
              Teacher / Advisor Slot #2
            </div>
            <div className="text-sm font-bold text-white font-sans">
              {research.teacher2Name}
            </div>
            <div className="text-xs text-slate-400 font-sans">
              {research.teacher2Subject}
            </div>
          </div>
        </div>

      </div>

      {/* SECTION 3: 20 Slots for Edit Anything */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 backdrop-blur-md shadow-xl space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                <span>20 Custom Specification & Research Slots</span>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20">
                  Slots 1–20
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Customizable parameters, project notes, calibration values, and exhibition metrics stored in Firebase
              </p>
            </div>
          </div>

          {/* Search filter */}
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search 20 slots..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
            />
          </div>
        </div>

        {/* 20 Slots Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {filteredSlots.map((slot) => (
            <div
              key={slot.id}
              className="group bg-slate-950/70 border border-slate-800/80 rounded-2xl p-3.5 hover:border-amber-500/40 transition flex flex-col justify-between relative shadow-sm hover:shadow-amber-500/5"
            >
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                  <span className="text-amber-400/90 font-bold flex items-center gap-1">
                    <Hash className="w-3 h-3 text-amber-400" />
                    Slot #{slot.id}
                  </span>
                  <button
                    onClick={() => handleCopySlot(slot)}
                    className="p-1 rounded text-slate-500 hover:text-white transition cursor-pointer"
                    title="Copy value"
                  >
                    {copiedId === slot.id ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  </button>
                </div>
                <div className="text-xs font-bold text-slate-200 group-hover:text-amber-300 transition">
                  {slot.label}
                </div>
                <div className="text-xs text-slate-300 font-sans pt-1 leading-relaxed break-words">
                  {slot.value}
                </div>
              </div>

              <div className="mt-2 pt-2 border-t border-slate-900 text-[10px] font-mono text-slate-500 flex items-center justify-between">
                <span>Firebase Sync</span>
                <span className="text-emerald-400">● Live</span>
              </div>
            </div>
          ))}
        </div>

        {filteredSlots.length === 0 && (
          <div className="text-center py-8 text-xs text-slate-500">
            No slots match "{searchQuery}".
          </div>
        )}
      </div>

      {/* Owner-Only Edit Modal */}
      {isEditing && isOwner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
            
            {/* Header */}
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400">
                  <Database className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">Edit Research Info & 20 Custom Slots</h3>
                  <p className="text-xs text-slate-400 font-mono">
                    Owner Mode • Updates in Real-Time to Cloud Firestore
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsEditing(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSaveToFirebase} className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
              
              {/* Project Title */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-purple-400">Project / Exhibition Title</label>
                <input
                  type="text"
                  value={editResearch.projectTitle}
                  onChange={(e) => setEditResearch({ ...editResearch, projectTitle: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-200 text-xs focus:outline-none focus:border-purple-400"
                  required
                />
              </div>

              {/* School Details */}
              <div className="p-4 bg-slate-950/60 rounded-2xl border border-slate-800 space-y-3">
                <div className="text-xs font-bold text-purple-300 flex items-center gap-1.5">
                  <School className="w-4 h-4" />
                  School / Institute Slots
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1">School / College Name</label>
                    <input
                      type="text"
                      value={editResearch.schoolName}
                      onChange={(e) => setEditResearch({ ...editResearch, schoolName: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-slate-200 text-xs focus:outline-none focus:border-purple-400"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1">Campus / Facility Address</label>
                    <input
                      type="text"
                      value={editResearch.schoolAddress}
                      onChange={(e) => setEditResearch({ ...editResearch, schoolAddress: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-slate-200 text-xs focus:outline-none focus:border-purple-400"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* 2 Student Slots */}
              <div className="p-4 bg-slate-950/60 rounded-2xl border border-slate-800 space-y-3">
                <div className="text-xs font-bold text-cyan-300 flex items-center gap-1.5">
                  <GraduationCap className="w-4 h-4" />
                  Student Slots (2 Slots)
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800 space-y-2">
                    <span className="text-[10px] font-mono text-cyan-400 font-bold">Student #1</span>
                    <input
                      type="text"
                      value={editResearch.student1Name}
                      onChange={(e) => setEditResearch({ ...editResearch, student1Name: e.target.value })}
                      placeholder="Student 1 Name"
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-200 text-xs focus:outline-none focus:border-cyan-400"
                      required
                    />
                    <input
                      type="text"
                      value={editResearch.student1Role}
                      onChange={(e) => setEditResearch({ ...editResearch, student1Role: e.target.value })}
                      placeholder="Student 1 Role / Class"
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-400 text-xs focus:outline-none focus:border-cyan-400"
                      required
                    />
                  </div>

                  <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800 space-y-2">
                    <span className="text-[10px] font-mono text-cyan-400 font-bold">Student #2</span>
                    <input
                      type="text"
                      value={editResearch.student2Name}
                      onChange={(e) => setEditResearch({ ...editResearch, student2Name: e.target.value })}
                      placeholder="Student 2 Name"
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-200 text-xs focus:outline-none focus:border-cyan-400"
                      required
                    />
                    <input
                      type="text"
                      value={editResearch.student2Role}
                      onChange={(e) => setEditResearch({ ...editResearch, student2Role: e.target.value })}
                      placeholder="Student 2 Role / Class"
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-400 text-xs focus:outline-none focus:border-cyan-400"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* 2 Teacher Slots */}
              <div className="p-4 bg-slate-950/60 rounded-2xl border border-slate-800 space-y-3">
                <div className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
                  <Users className="w-4 h-4" />
                  Teachers Help by (2 Slots)
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800 space-y-2">
                    <span className="text-[10px] font-mono text-emerald-400 font-bold">Teacher / Mentor #1</span>
                    <input
                      type="text"
                      value={editResearch.teacher1Name}
                      onChange={(e) => setEditResearch({ ...editResearch, teacher1Name: e.target.value })}
                      placeholder="Teacher 1 Name"
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-200 text-xs focus:outline-none focus:border-emerald-400"
                      required
                    />
                    <input
                      type="text"
                      value={editResearch.teacher1Subject}
                      onChange={(e) => setEditResearch({ ...editResearch, teacher1Subject: e.target.value })}
                      placeholder="Subject / Department"
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-400 text-xs focus:outline-none focus:border-emerald-400"
                      required
                    />
                  </div>

                  <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800 space-y-2">
                    <span className="text-[10px] font-mono text-emerald-400 font-bold">Teacher / Mentor #2</span>
                    <input
                      type="text"
                      value={editResearch.teacher2Name}
                      onChange={(e) => setEditResearch({ ...editResearch, teacher2Name: e.target.value })}
                      placeholder="Teacher 2 Name"
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-200 text-xs focus:outline-none focus:border-emerald-400"
                      required
                    />
                    <input
                      type="text"
                      value={editResearch.teacher2Subject}
                      onChange={(e) => setEditResearch({ ...editResearch, teacher2Subject: e.target.value })}
                      placeholder="Subject / Department"
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-400 text-xs focus:outline-none focus:border-emerald-400"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* 20 Custom Edit Slots */}
              <div className="p-4 bg-slate-950/60 rounded-2xl border border-slate-800 space-y-3">
                <div className="text-xs font-bold text-amber-400 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Sliders className="w-4 h-4" />
                    20 Customizable Slots (Edit Anything)
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">20 Total Slots</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-96 overflow-y-auto pr-1">
                  {editSlots.map((slot, index) => (
                    <div key={slot.id} className="p-3 bg-slate-900/70 border border-slate-800 rounded-xl space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono text-amber-400 font-bold">Slot #{slot.id}</span>
                      </div>
                      <div>
                        <label className="text-[9px] text-slate-500 block mb-0.5">Slot Title / Label</label>
                        <input
                          type="text"
                          value={slot.label}
                          onChange={(e) => {
                            const newSlots = [...editSlots];
                            newSlots[index].label = e.target.value;
                            setEditSlots(newSlots);
                          }}
                          className="w-full bg-slate-950 border border-slate-700 rounded p-1.5 text-xs text-white focus:outline-none focus:border-amber-400"
                          required
                        />
                      </div>
                      <div>
                        <label className="text-[9px] text-slate-500 block mb-0.5">Slot Value / Details</label>
                        <input
                          type="text"
                          value={slot.value}
                          onChange={(e) => {
                            const newSlots = [...editSlots];
                            newSlots[index].value = e.target.value;
                            setEditSlots(newSlots);
                          }}
                          className="w-full bg-slate-950 border border-slate-700 rounded p-1.5 text-xs text-slate-300 focus:outline-none focus:border-amber-400"
                          required
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {saveStatus && (
                <div className={`p-3 rounded-xl border text-xs font-mono flex items-center gap-2 ${
                  saveStatus.includes('successfully') ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200' : 'bg-purple-950/40 border-purple-500/40 text-purple-200'
                }`}>
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{saveStatus}</span>
                </div>
              )}

              {/* Modal Actions */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setEditResearch(DEFAULT_RESEARCH_DATA);
                    setEditSlots(DEFAULT_20_SLOTS);
                  }}
                  className="text-slate-400 hover:text-white transition flex items-center gap-1.5 cursor-pointer text-xs"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset to Defaults</span>
                </button>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="px-5 py-2 rounded-xl bg-purple-500 hover:bg-purple-400 text-white font-bold transition cursor-pointer flex items-center gap-2 shadow-lg disabled:opacity-50 text-xs"
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
