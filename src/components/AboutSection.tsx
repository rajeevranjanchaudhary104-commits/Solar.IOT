import React, { useState, useEffect } from 'react';
import { 
  BookOpen, 
  Sparkles, 
  ShieldCheck, 
  Droplets, 
  Edit3, 
  Save, 
  Image as ImageIcon, 
  Video, 
  Play, 
  Check, 
  Copy, 
  ExternalLink, 
  RotateCcw, 
  X, 
  FileText, 
  CheckCircle2, 
  Database,
  Layers,
  ZoomIn,
  Lock,
  ShieldAlert,
  LogIn
} from 'lucide-react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db, firebaseConfig } from '../lib/firebase';

// Designated Administrator / System Owner
export const OWNER_EMAIL = 'rajeevranjanchaudhary104@gmail.com';

export interface AboutContentData {
  summary: string;
  photo1Url: string;
  photo1Title: string;
  photo1Caption: string;
  photo2Url: string;
  photo2Title: string;
  photo2Caption: string;
  videoUrl: string;
  videoTitle: string;
  videoDescription: string;
  updatedAt?: string;
}

interface AboutSectionProps {
  currentUser?: {
    email?: string | null;
    displayName?: string | null;
  } | null;
  onRequireSignIn?: () => void;
}

const DEFAULT_ABOUT_CONTENT: AboutContentData = {
  summary: `The Solar.IOT system represents an advanced, intelligent cyber-physical platform engineered to resolve the two most severe operational efficiency losses in photovoltaic energy generation: environmental dust soiling and thermal panel degradation. In arid, industrial, and suburban deployment environments, fine particulate matter, soot, pollen, and airborne sand form an adhesive opaque layer over protective solar glass, resulting in solar irradiance transmittance losses ranging between 15% to 35% in as few as three weeks without maintenance.

To combat this without damaging sensitive anti-reflective optical coatings, Solar.IOT integrates a motorized dual-pass silicone squeegee wiper arm driven by an active-low relay module alongside high-precision sensory feedback. Voltage, current, and instantaneous wattage are measured across the bus via an INA219 digital sensor communicating over I2C, while thermal stress is tracked using an analog LM35 surface temperature sensor calibrated at 10 millivolts per degree Celsius. Furthermore, an FC-37 precipitation sensor detects natural rainfall, instantly inhibiting unnecessary water pump activation to conserve precious water while triggering a post-rain squeegee sweep to clear drying water droplet mineral scale.

All telemetry and actuator states stream seamlessly to Google Cloud Firestore via standalone ESP-01 (ESP8266) or ESP32 microcontrollers over HTTPS REST or real-time WebSockets. Remote operators can trigger cleaning routines on demand, automate maintenance based on soiling index degradation, analyze 24-hour diurnal generation curves, and track cumulative kilowatt-hour yields with full cloud synchronization. By merging automated robotics, edge microcontroller telemetry, and cloud analytics, Solar.IOT preserves peak photovoltaic performance and extends solar asset longevity worldwide.`,
  photo1Url: 'https://images.unsplash.com/photo-1509391365360-2e959784a276?auto=format&fit=crop&w=1200&q=80',
  photo1Title: 'Dual-Axis Photovoltaic Hardware Array',
  photo1Caption: 'High-efficiency monocrystalline solar panels equipped with anti-reflective glass and sensor brackets.',
  photo2Url: 'https://images.unsplash.com/photo-1508873696983-2df570464756?auto=format&fit=crop&w=1200&q=80',
  photo2Title: 'Motorized Squeegee Wiper & Water Mist Rig',
  photo2Caption: 'Automated silicone wiper mechanism with 12V relay actuation and sensor cluster.',
  videoUrl: 'https://www.youtube.com/embed/8R_K8X5h_eE',
  videoTitle: 'Automated Solar Panel Cleaning & IoT Monitoring Demonstration',
  videoDescription: 'Overview of robotic surface cleaning mechanisms, soiling mitigation, and real-time generation recovery.',
};

export const AboutSection: React.FC<AboutSectionProps> = ({ currentUser, onRequireSignIn }) => {
  const [content, setContent] = useState<AboutContentData>(DEFAULT_ABOUT_CONTENT);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editForm, setEditForm] = useState<AboutContentData>(DEFAULT_ABOUT_CONTENT);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [copiedPath, setCopiedPath] = useState<boolean>(false);
  const [activePhotoModal, setActivePhotoModal] = useState<{ url: string; title: string; caption: string } | null>(null);

  // Check if current logged-in user is the owner/admin
  const isOwner = Boolean(
    currentUser?.email && 
    currentUser.email.trim().toLowerCase() === OWNER_EMAIL.trim().toLowerCase()
  );

  // Helper to count words
  const countWords = (text: string) => {
    return text.trim().split(/\s+/).filter(Boolean).length;
  };

  // Convert YouTube links (watch or share) into embed URLs
  const formatVideoEmbedUrl = (url: string) => {
    if (!url) return '';
    try {
      if (url.includes('youtube.com/watch?v=')) {
        const videoId = url.split('v=')[1]?.split('&')[0];
        return `https://www.youtube.com/embed/${videoId}`;
      }
      if (url.includes('youtu.be/')) {
        const videoId = url.split('youtu.be/')[1]?.split('?')[0];
        return `https://www.youtube.com/embed/${videoId}`;
      }
      return url;
    } catch {
      return url;
    }
  };

  // Real-time synchronization with Cloud Firestore
  useEffect(() => {
    const docRef = doc(db, 'solar_iot', 'about_content');
    const unsubscribe = onSnapshot(docRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data() as Partial<AboutContentData>;
        setContent((prev) => ({
          ...prev,
          summary: data.summary || prev.summary,
          photo1Url: data.photo1Url || prev.photo1Url,
          photo1Title: data.photo1Title || prev.photo1Title,
          photo1Caption: data.photo1Caption || prev.photo1Caption,
          photo2Url: data.photo2Url || prev.photo2Url,
          photo2Title: data.photo2Title || prev.photo2Title,
          photo2Caption: data.photo2Caption || prev.photo2Caption,
          videoUrl: data.videoUrl || prev.videoUrl,
          videoTitle: data.videoTitle || prev.videoTitle,
          videoDescription: data.videoDescription || prev.videoDescription,
          updatedAt: data.updatedAt,
        }));
      }
    }, (error) => {
      console.warn('AboutSection Firestore notice:', error);
    });

    return () => unsubscribe();
  }, []);

  const handleOpenEdit = () => {
    if (!isOwner) {
      if (!currentUser && onRequireSignIn) {
        onRequireSignIn();
        return;
      }
      alert('Access restricted. Only the verified project administrator has permission to modify this content.');
      return;
    }
    setEditForm({ ...content });
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
    setSaveStatus('Saving to Firebase...');
    try {
      const docRef = doc(db, 'solar_iot', 'about_content');
      const updatedPayload: AboutContentData = {
        ...editForm,
        videoUrl: formatVideoEmbedUrl(editForm.videoUrl),
        updatedAt: new Date().toISOString(),
      };
      await setDoc(docRef, updatedPayload, { merge: true });
      setContent(updatedPayload);
      setSaveStatus('Saved successfully to Firebase!');
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

  const handleResetToDefaults = () => {
    setEditForm(DEFAULT_ABOUT_CONTENT);
  };

  const copyDocPath = () => {
    navigator.clipboard.writeText('solar_iot/about_content');
    setCopiedPath(true);
    setTimeout(() => setCopiedPath(false), 2000);
  };

  const isDirectMp4 = content.videoUrl && content.videoUrl.endsWith('.mp4');

  return (
    <div className="space-y-8">
      {/* Top Banner with Edit in Firebase Trigger & Owner Verification */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 backdrop-blur-md relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex items-center space-x-2 text-xs font-mono text-cyan-400 bg-cyan-500/10 px-3 py-1 rounded-full border border-cyan-500/20">
                <BookOpen className="w-3.5 h-3.5" />
                <span>Engineering Documentation & Media Center</span>
              </div>

              {/* Owner security badge */}
              {isOwner ? (
                <div className="inline-flex items-center space-x-1.5 text-xs font-mono text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Admin Verified</span>
                </div>
              ) : (
                <div className="inline-flex items-center space-x-1.5 text-xs font-mono text-slate-400 bg-slate-950 px-3 py-1 rounded-full border border-slate-800">
                  <Lock className="w-3.5 h-3.5 text-amber-400" />
                  <span>Admin Protected</span>
                </div>
              )}
            </div>

            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              About the Solar.IOT Project
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
              Photovoltaic generation analytics, motorized silicone squeegee cleaning, and precipitation-aware water conservation.
            </p>
          </div>

          {/* Owner-Only Edit Controls */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
            {isOwner ? (
              <button
                onClick={handleOpenEdit}
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 font-bold text-xs font-mono transition cursor-pointer flex items-center gap-2 shadow-lg shadow-cyan-500/20"
              >
                <Edit3 className="w-4 h-4" />
                <span>Edit in Firebase</span>
              </button>
            ) : currentUser ? (
              <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-[11px] font-mono text-slate-400">
                <Lock className="w-3.5 h-3.5 text-amber-400" />
                <span>Read-Only Mode</span>
              </div>
            ) : (
              <button
                onClick={onRequireSignIn}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-mono text-xs transition cursor-pointer flex items-center gap-1.5 border border-slate-700"
              >
                <LogIn className="w-3.5 h-3.5 text-cyan-400" />
                <span>Admin Login</span>
              </button>
            )}

            <button
              onClick={copyDocPath}
              title="Copy Firestore document path"
              className="px-3 py-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 font-mono text-xs transition cursor-pointer flex items-center gap-1.5 border border-slate-700"
            >
              {copiedPath ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
              <span>{copiedPath ? 'Copied Path!' : 'Doc: solar_iot/about_content'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* SECTION 1: 300-Word Engineering Summary */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 backdrop-blur-md shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4 flex-wrap gap-2">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                <span>System Architecture & Engineering Summary</span>
              </h3>
              <p className="text-xs text-slate-400">
                Core operating principles, physical phenomena, and hardware-cloud integration
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs font-mono">
            <span className="px-2.5 py-1 rounded-full bg-slate-950 border border-slate-800 text-slate-300">
              Word Count: <strong className="text-cyan-400">{countWords(content.summary)}</strong> words
            </span>
            <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Synced with Cloud Firestore
            </span>
          </div>
        </div>

        {/* Formatted Paragraphs */}
        <div className="prose prose-invert max-w-none text-slate-300 text-xs sm:text-sm leading-relaxed space-y-3 pt-2">
          {content.summary.split('\n\n').map((paragraph, idx) => (
            <p key={idx} className="leading-relaxed bg-slate-950/40 p-4 rounded-2xl border border-slate-800/60">
              {paragraph}
            </p>
          ))}
        </div>
      </div>

      {/* SECTION 2: 2 Photo Slots */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 text-sm font-bold text-white">
            <ImageIcon className="w-4 h-4 text-cyan-400" />
            <span>Hardware & Installation Photo Gallery (2 Slots)</span>
          </div>
          <span className="text-[11px] font-mono text-slate-400">Click photo to zoom</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Photo Slot 1 */}
          <div 
            onClick={() => setActivePhotoModal({ url: content.photo1Url, title: content.photo1Title, caption: content.photo1Caption })}
            className="group bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden hover:border-cyan-500/50 transition cursor-pointer shadow-lg hover:shadow-cyan-500/10 flex flex-col"
          >
            <div className="relative aspect-video w-full bg-slate-950 overflow-hidden">
              <img 
                src={content.photo1Url} 
                alt={content.photo1Title} 
                className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1509391365360-2e959784a276?auto=format&fit=crop&w=1200&q=80';
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent opacity-80" />
              <div className="absolute top-3 left-3 bg-slate-950/80 backdrop-blur px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold text-cyan-400 border border-slate-800">
                Photo Slot #1
              </div>
              <div className="absolute bottom-3 right-3 p-2 rounded-lg bg-slate-900/80 text-white opacity-0 group-hover:opacity-100 transition">
                <ZoomIn className="w-4 h-4" />
              </div>
            </div>
            <div className="p-4 space-y-1.5 flex-1 flex flex-col justify-between">
              <div>
                <h4 className="font-bold text-white text-sm group-hover:text-cyan-400 transition">
                  {content.photo1Title}
                </h4>
                <p className="text-xs text-slate-400 leading-relaxed mt-1">
                  {content.photo1Caption}
                </p>
              </div>
              <div className="pt-2 text-[10px] font-mono text-slate-500 flex items-center justify-between border-t border-slate-800/80">
                <span>Field: photo1Url</span>
                <span className="text-cyan-400">Click to expand</span>
              </div>
            </div>
          </div>

          {/* Photo Slot 2 */}
          <div 
            onClick={() => setActivePhotoModal({ url: content.photo2Url, title: content.photo2Title, caption: content.photo2Caption })}
            className="group bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden hover:border-cyan-500/50 transition cursor-pointer shadow-lg hover:shadow-cyan-500/10 flex flex-col"
          >
            <div className="relative aspect-video w-full bg-slate-950 overflow-hidden">
              <img 
                src={content.photo2Url} 
                alt={content.photo2Title} 
                className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1508873696983-2df570464756?auto=format&fit=crop&w=1200&q=80';
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent opacity-80" />
              <div className="absolute top-3 left-3 bg-slate-950/80 backdrop-blur px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold text-emerald-400 border border-slate-800">
                Photo Slot #2
              </div>
              <div className="absolute bottom-3 right-3 p-2 rounded-lg bg-slate-900/80 text-white opacity-0 group-hover:opacity-100 transition">
                <ZoomIn className="w-4 h-4" />
              </div>
            </div>
            <div className="p-4 space-y-1.5 flex-1 flex flex-col justify-between">
              <div>
                <h4 className="font-bold text-white text-sm group-hover:text-cyan-400 transition">
                  {content.photo2Title}
                </h4>
                <p className="text-xs text-slate-400 leading-relaxed mt-1">
                  {content.photo2Caption}
                </p>
              </div>
              <div className="pt-2 text-[10px] font-mono text-slate-500 flex items-center justify-between border-t border-slate-800/80">
                <span>Field: photo2Url</span>
                <span className="text-emerald-400">Click to expand</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 3: 1 Video Section */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 backdrop-blur-md shadow-xl space-y-5">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4 flex-wrap gap-2">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
              <Video className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white tracking-tight">
                {content.videoTitle}
              </h3>
              <p className="text-xs text-slate-400">
                {content.videoDescription}
              </p>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300 text-xs font-mono">
            1 Video Section
          </span>
        </div>

        {/* Video Player Embed / Direct MP4 */}
        <div className="relative aspect-video w-full rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 shadow-2xl">
          {isDirectMp4 ? (
            <video 
              src={content.videoUrl} 
              controls 
              className="w-full h-full object-contain"
            />
          ) : (
            <iframe
              src={formatVideoEmbedUrl(content.videoUrl)}
              title={content.videoTitle}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              className="w-full h-full border-0"
            />
          )}
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs font-mono text-slate-400 gap-2 pt-2">
          <div className="flex items-center gap-2">
            <span className="text-slate-500">Video Source:</span>
            <span className="text-purple-400 truncate max-w-xs sm:max-w-md select-all">
              {content.videoUrl}
            </span>
          </div>
          {isOwner && (
            <button
              onClick={handleOpenEdit}
              className="text-cyan-400 hover:text-cyan-300 transition cursor-pointer self-start sm:self-auto flex items-center gap-1 font-medium"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Change Video Link in Firebase</span>
            </button>
          )}
        </div>
      </div>

      {/* Interactive Modal: Edit in Firebase (Owner Only) */}
      {isEditing && isOwner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400">
                  <Database className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">Edit About Section in Firebase</h3>
                  <p className="text-xs text-slate-400 font-mono">
                    Administrator Mode | Document: <strong className="text-cyan-400">solar_iot/about_content</strong>
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

            {/* Modal Body Form */}
            <form onSubmit={handleSaveToFirebase} className="p-6 overflow-y-auto space-y-6 flex-1 text-xs font-mono">
              
              {/* Summary Section */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-cyan-400 flex items-center gap-1.5">
                    <FileText className="w-4 h-4" />
                    300-Word Engineering Summary
                  </label>
                  <span className={`text-[11px] font-mono ${countWords(editForm.summary) >= 250 && countWords(editForm.summary) <= 350 ? 'text-emerald-400' : 'text-amber-400'}`}>
                    Current Words: {countWords(editForm.summary)}
                  </span>
                </div>
                <textarea
                  value={editForm.summary}
                  onChange={(e) => setEditForm({ ...editForm, summary: e.target.value })}
                  rows={8}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-slate-200 text-xs font-sans leading-relaxed focus:outline-none focus:border-cyan-500 transition"
                  placeholder="Enter ~300 word summary describing the project..."
                  required
                />
              </div>

              {/* Photo Slot 1 */}
              <div className="p-4 bg-slate-950/70 border border-slate-800 rounded-2xl space-y-3">
                <div className="text-cyan-400 font-bold flex items-center gap-1.5 text-xs">
                  <ImageIcon className="w-4 h-4" />
                  Photo Slot #1 Configuration
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1">Image URL</label>
                    <input
                      type="url"
                      value={editForm.photo1Url}
                      onChange={(e) => setEditForm({ ...editForm, photo1Url: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-slate-200 text-xs focus:outline-none focus:border-cyan-500"
                      placeholder="https://images.unsplash.com/..."
                      required
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1">Photo Title</label>
                    <input
                      type="text"
                      value={editForm.photo1Title}
                      onChange={(e) => setEditForm({ ...editForm, photo1Title: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-slate-200 text-xs focus:outline-none focus:border-cyan-500"
                      placeholder="Title of Photo 1"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">Caption / Description</label>
                  <input
                    type="text"
                    value={editForm.photo1Caption}
                    onChange={(e) => setEditForm({ ...editForm, photo1Caption: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-slate-200 text-xs focus:outline-none focus:border-cyan-500"
                    placeholder="Short caption for photo 1..."
                  />
                </div>
              </div>

              {/* Photo Slot 2 */}
              <div className="p-4 bg-slate-950/70 border border-slate-800 rounded-2xl space-y-3">
                <div className="text-emerald-400 font-bold flex items-center gap-1.5 text-xs">
                  <ImageIcon className="w-4 h-4" />
                  Photo Slot #2 Configuration
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1">Image URL</label>
                    <input
                      type="url"
                      value={editForm.photo2Url}
                      onChange={(e) => setEditForm({ ...editForm, photo2Url: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-slate-200 text-xs focus:outline-none focus:border-cyan-500"
                      placeholder="https://images.unsplash.com/..."
                      required
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1">Photo Title</label>
                    <input
                      type="text"
                      value={editForm.photo2Title}
                      onChange={(e) => setEditForm({ ...editForm, photo2Title: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-slate-200 text-xs focus:outline-none focus:border-cyan-500"
                      placeholder="Title of Photo 2"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">Caption / Description</label>
                  <input
                    type="text"
                    value={editForm.photo2Caption}
                    onChange={(e) => setEditForm({ ...editForm, photo2Caption: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-slate-200 text-xs focus:outline-none focus:border-cyan-500"
                    placeholder="Short caption for photo 2..."
                  />
                </div>
              </div>

              {/* Video Section */}
              <div className="p-4 bg-slate-950/70 border border-slate-800 rounded-2xl space-y-3">
                <div className="text-purple-400 font-bold flex items-center gap-1.5 text-xs">
                  <Video className="w-4 h-4" />
                  Video Section Configuration
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">
                    YouTube URL or Embed Link (or MP4 video URL)
                  </label>
                  <input
                    type="text"
                    value={editForm.videoUrl}
                    onChange={(e) => setEditForm({ ...editForm, videoUrl: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-slate-200 text-xs focus:outline-none focus:border-cyan-500"
                    placeholder="https://www.youtube.com/watch?v=... or https://youtube.com/embed/..."
                    required
                  />
                  <span className="text-[10px] text-slate-500 block mt-1">
                    Tip: Regular youtube.com/watch?v=... links are automatically converted to embed format!
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1">Video Title</label>
                    <input
                      type="text"
                      value={editForm.videoTitle}
                      onChange={(e) => setEditForm({ ...editForm, videoTitle: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-slate-200 text-xs focus:outline-none focus:border-cyan-500"
                      placeholder="Title of video"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1">Video Description</label>
                    <input
                      type="text"
                      value={editForm.videoDescription}
                      onChange={(e) => setEditForm({ ...editForm, videoDescription: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-slate-200 text-xs focus:outline-none focus:border-cyan-500"
                      placeholder="Brief video description..."
                    />
                  </div>
                </div>
              </div>

              {saveStatus && (
                <div className={`p-3 rounded-xl border text-xs font-mono flex items-center gap-2 ${
                  saveStatus.includes('successfully') 
                    ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200' 
                    : saveStatus.includes('Denied') || saveStatus.includes('Failed')
                      ? 'bg-red-950/40 border-red-500/40 text-red-200'
                      : 'bg-cyan-950/40 border-cyan-500/40 text-cyan-200'
                }`}>
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{saveStatus}</span>
                </div>
              )}

              {/* Modal Actions */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={handleResetToDefaults}
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
                    className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold transition cursor-pointer flex items-center gap-2 shadow-lg disabled:opacity-50 text-xs"
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

      {/* Photo Zoom Modal */}
      {activePhotoModal && (
        <div 
          onClick={() => setActivePhotoModal(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md cursor-pointer animate-fadeIn"
        >
          <div 
            onClick={(e) => e.stopPropagation()} 
            className="bg-slate-900 border border-slate-800 rounded-3xl max-w-4xl w-full overflow-hidden shadow-2xl cursor-default"
          >
            <div className="relative aspect-video w-full bg-black">
              <img 
                src={activePhotoModal.url} 
                alt={activePhotoModal.title} 
                className="w-full h-full object-contain"
              />
              <button 
                onClick={() => setActivePhotoModal(null)}
                className="absolute top-4 right-4 p-2 rounded-full bg-slate-950/80 text-white hover:bg-slate-800 transition cursor-pointer border border-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-1">
              <h3 className="text-lg font-bold text-white">{activePhotoModal.title}</h3>
              <p className="text-xs text-slate-400 leading-relaxed">{activePhotoModal.caption}</p>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
