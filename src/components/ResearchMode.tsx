import React, { useState, useEffect } from 'react';
import { 
  GraduationCap, 
  School, 
  Edit3, 
  Save, 
  X, 
  RotateCcw, 
  Lock, 
  CheckCircle2, 
  BookOpen,
  Database,
  UserCheck,
  Image as ImageIcon,
  Video,
  Plus,
  Trash2,
  ZoomIn,
  Zap,
  Activity,
  Award,
  Mail
} from 'lucide-react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db, sanitizeForFirestore } from '../lib/firebase';

import { OWNER_EMAILS as LIVE_OWNER_EMAILS, PRIMARY_OWNER_EMAIL, checkIsOwner } from '../lib/permissions';

// Designated owner emails constant checked internally only (live updated with co-owners)
export const OWNER_EMAILS = LIVE_OWNER_EMAILS;
export const OWNER_EMAIL = PRIMARY_OWNER_EMAIL; // primary admin

export interface ResearchPhotoItem {
  id: number;
  url: string;
  title: string;
  caption: string;
}

export interface ResearchVideoItem {
  id: number;
  url: string;
  title: string;
  description: string;
}

export interface ResearchData {
  student1Name: string;
  student1Role: string;
  student2Name?: string;
  student2Role?: string;
  teacherName?: string;
  teacherSubject?: string;
  schoolName: string;
  projectTitle: string;
  projectSummary?: string;
  inverterLoadWatts?: number;
  photos: ResearchPhotoItem[];
  videos: ResearchVideoItem[];
  updatedAt?: string;
}

const DEFAULT_RESEARCH_PHOTOS: ResearchPhotoItem[] = [
  {
    id: 1,
    url: 'https://images.unsplash.com/photo-1509391365360-2e959784a276?auto=format&fit=crop&w=1200&q=80',
    title: 'Photovoltaic Array & Transmittance Analysis',
    caption: 'Experimental setup testing irradiance loss caused by fine dust particles before mechanical cleaning.',
  },
  {
    id: 2,
    url: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1200&q=80',
    title: 'IoT Microcontroller & Sensor Interfacing',
    caption: 'ESP32 circuit running INA219 I2C bus power monitor and LM35 precision thermal transducer.',
  },
];

const DEFAULT_RESEARCH_VIDEOS: ResearchVideoItem[] = [
  {
    id: 1,
    url: 'https://www.youtube.com/embed/8R_K8X5h_eE',
    title: 'Automated Wiper Cleaning Experiment',
    description: 'Robotic dual-pass squeegee motion preventing thermal shock and restoring +25% solar efficiency.',
  },
];

const DEFAULT_RESEARCH_DATA: ResearchData = {
  student1Name: 'Lead Student Researcher',
  student1Role: 'Lead Student Researcher & System Engineer (ESP32 Firmware, Circuit Design & IoT)',
  teacherName: 'Er. Sushil Kumar',
  teacherSubject: 'Project Mentor & Faculty Guide (Hardware Architecture & Research Advisor)',
  schoolName: 'Greenwood Senior Secondary School',
  projectTitle: 'Farm.IOT - Autonomous Dual-Pass Cleaning & Farm Telemetry Station',
  projectSummary: 'A cyber-physical solar and farm monitoring with automated cleaning station resolving dust attenuation and thermal degradation while eliminating thermal shock damage on solar panels.',
  inverterLoadWatts: 150,
  photos: DEFAULT_RESEARCH_PHOTOS,
  videos: DEFAULT_RESEARCH_VIDEOS,
};

interface ResearchModeProps {
  currentUser?: {
    email?: string | null;
    displayName?: string | null;
  } | null;
  onRequireSignIn?: () => void;
}

export const ResearchMode: React.FC<ResearchModeProps> = ({ currentUser, onRequireSignIn }) => {
  const [research, setResearch] = useState<ResearchData>(DEFAULT_RESEARCH_DATA);
  const [isEditing, setIsEditing] = useState(false);
  const [editResearch, setEditResearch] = useState<ResearchData>(DEFAULT_RESEARCH_DATA);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [activePhotoModal, setActivePhotoModal] = useState<ResearchPhotoItem | null>(null);
  const [editTab, setEditTab] = useState<'info' | 'photos' | 'videos'>('info');

  // Dynamic co-owners listener from Firestore admin_roles
  const [dynamicCoOwners, setDynamicCoOwners] = useState<string[]>([]);
  useEffect(() => {
    try {
      const unsub = onSnapshot(doc(db, 'solar_iot', 'admin_roles'), (snap) => {
        if (snap.exists()) {
          const d = snap.data();
          if (Array.isArray(d?.coOwners)) {
            setDynamicCoOwners(d.coOwners.map((e: string) => String(e).trim().toLowerCase()));
          }
        }
      });
      return () => unsub();
    } catch {}
  }, []);

  // Authenticate owner or authorized co-owners
  const isOwner = Boolean(
    currentUser?.email && 
    checkIsOwner(currentUser.email, dynamicCoOwners)
  );

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

  const isDirectMp4 = (url: string) => {
    return url.endsWith('.mp4') || url.endsWith('.webm') || url.includes('/video/');
  };

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
          teacherName: data.teacherName || prev.teacherName,
          teacherSubject: data.teacherSubject || prev.teacherSubject,
          schoolName: data.schoolName || prev.schoolName,
          projectTitle: data.projectTitle || prev.projectTitle,
          projectSummary: data.projectSummary || prev.projectSummary,
          inverterLoadWatts: data.inverterLoadWatts ?? prev.inverterLoadWatts,
          photos: Array.isArray(data.photos) && data.photos.length > 0 ? data.photos : prev.photos,
          videos: Array.isArray(data.videos) && data.videos.length > 0 ? data.videos : prev.videos,
          updatedAt: data.updatedAt,
        }));
      }
    });

    return () => {
      unsubResearch();
    };
  }, []);

  const handleOpenEdit = () => {
    if (!isOwner) {
      if (onRequireSignIn) {
        onRequireSignIn();
      }
      return;
    }
    setEditResearch({ 
      ...research,
      photos: research.photos.map(p => ({ ...p })),
      videos: research.videos.map(v => ({ ...v })),
    });
    setIsEditing(true);
    setSaveStatus(null);
    setEditTab('info');
  };

  // Photo slot handlers
  const handleAddPhotoSlot = () => {
    const newId = editResearch.photos.length > 0 
      ? Math.max(...editResearch.photos.map(p => p.id)) + 1 
      : 1;
    const newPhoto: ResearchPhotoItem = {
      id: newId,
      url: 'https://images.unsplash.com/photo-1509391365360-2e959784a276?auto=format&fit=crop&w=1200&q=80',
      title: `Research Photo #${newId}`,
      caption: 'Visual documentation of experimental setup and testing.',
    };
    setEditResearch({
      ...editResearch,
      photos: [...editResearch.photos, newPhoto]
    });
  };

  const handleRemovePhotoSlot = (index: number) => {
    const updated = editResearch.photos.filter((_, i) => i !== index);
    setEditResearch({
      ...editResearch,
      photos: updated
    });
  };

  const handlePhotoUpload = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        if (result) {
          const updated = [...editResearch.photos];
          updated[index].url = result;
          setEditResearch({ ...editResearch, photos: updated });
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Video slot handlers
  const handleAddVideoSlot = () => {
    const newId = editResearch.videos.length > 0 
      ? Math.max(...editResearch.videos.map(v => v.id)) + 1 
      : 1;
    const newVideo: ResearchVideoItem = {
      id: newId,
      url: 'https://www.youtube.com/embed/8R_K8X5h_eE',
      title: `Research Demo Video #${newId}`,
      description: 'Demonstration of automated robotic sweep and telemetry logging.',
    };
    setEditResearch({
      ...editResearch,
      videos: [...editResearch.videos, newVideo]
    });
  };

  const handleRemoveVideoSlot = (index: number) => {
    const updated = editResearch.videos.filter((_, i) => i !== index);
    setEditResearch({
      ...editResearch,
      videos: updated
    });
  };

  const handleSaveToFirebase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isOwner) {
      setSaveStatus('Access Denied: Administrator authentication required.');
      return;
    }

    setIsSaving(true);
    setSaveStatus('Saving research details & slots to Firebase...');
    try {
      const nowIso = new Date().toISOString();
      const researchDoc = doc(db, 'solar_iot', 'research_data');
      await setDoc(researchDoc, sanitizeForFirestore({
        ...editResearch,
        updatedAt: nowIso,
      }), { merge: true });

      setResearch(editResearch);
      setSaveStatus('Research details and media slots successfully saved!');
      setTimeout(() => {
        setIsEditing(false);
        setSaveStatus(null);
      }, 1000);
    } catch (err: any) {
      setSaveStatus(`Failed to save: ${err.message || 'Unknown error'}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8 animate-fadeIn">
      
      {/* Top Banner */}
      <div className="bg-zinc-950 border border-zinc-800 rounded-3xl p-6 sm:p-8 relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex items-center space-x-2 text-xs font-mono text-purple-400 bg-purple-500/10 px-3 py-1 rounded-full border border-purple-500/20">
                <GraduationCap className="w-3.5 h-3.5" />
                <span>Academic & Science Exhibition</span>
              </div>

              {/* Owner security badge (only visible to owner) */}
              {isOwner && (
                <div className="inline-flex items-center space-x-1.5 text-xs font-mono text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Admin Verified</span>
                </div>
              )}
            </div>

            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              {research.projectTitle || 'Farm.IOT Research & Project Information'}
            </h2>
            <p className="text-xs sm:text-sm text-zinc-300 max-w-2xl leading-relaxed">
              Official science project documentation, student researchers, guiding helped teacher, and customizable media evidence slots.
            </p>
          </div>

          {/* Owner-Only Edit Button (only visible to verified owner) */}
          {isOwner && (
            <div className="flex items-center gap-2">
              <button
                onClick={handleOpenEdit}
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-400 hover:to-indigo-400 text-white font-bold text-xs font-mono transition cursor-pointer flex items-center gap-2 shadow-lg shadow-purple-500/20"
              >
                <Edit3 className="w-4 h-4" />
                <span>Edit Research & Media Slots</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* School Name Card (Facility/Campus removed as requested) */}
      <div className="bg-zinc-950 border border-zinc-800 rounded-3xl p-6 sm:p-7 shadow-xl">
        <div className="flex items-center space-x-3 mb-4">
          <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
            <School className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
              School Name
            </h3>
            <p className="text-xs text-zinc-400">
              Educational institution presenting the Farm.IOT science project
            </p>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-black border border-zinc-800/80 space-y-1">
          <div className="text-[11px] text-purple-400 font-bold flex items-center gap-1.5 font-mono">
            <School className="w-3.5 h-3.5" />
            School Name
          </div>
          <div className="text-base sm:text-lg font-bold text-white font-sans pt-1">
            {research.schoolName}
          </div>
        </div>
      </div>

      {/* Team Section: Project Mentor Teacher, Student Researcher & Scope */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        
        {/* Project Mentor & Faculty Teacher */}
        <div className="bg-zinc-950 border border-emerald-500/30 rounded-3xl p-6 shadow-xl space-y-4 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none" />
          <div className="flex items-center space-x-3 border-b border-zinc-800 pb-3">
            <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                <span>Project Mentor</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold">
                  Faculty Guide
                </span>
              </h3>
              <p className="text-xs text-zinc-400">Project Mentor & Faculty Teacher</p>
            </div>
          </div>

          {/* Mentor Teacher Card */}
          <div className="p-5 rounded-2xl bg-black border border-emerald-500/20 space-y-2 relative overflow-hidden">
            <div className="text-[10px] font-mono text-emerald-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5" />
              Mentor Teacher & Guide
            </div>
            <div className="text-lg font-bold text-white font-sans">
              {research.teacherName || 'Er. Sushil Kumar'}
            </div>
            <div className="text-xs text-zinc-300 font-sans">
              {research.teacherSubject || 'Project Mentor & Faculty Guide (Hardware Architecture & Research Advisor)'}
            </div>
            <div className="pt-2 mt-2 border-t border-zinc-900 flex flex-col gap-1 text-[11px] font-mono text-zinc-400">
              <span className="flex items-center gap-1 text-emerald-300 font-bold">
                <Mail className="w-3 h-3 text-emerald-400" />
                sushilnisha23112004@gmail.com
              </span>
              <span className="text-zinc-500">
                School: {research.schoolName}
              </span>
            </div>
          </div>
        </div>

        {/* Student Researcher */}
        <div className="bg-zinc-950 border border-zinc-800 rounded-3xl p-6 shadow-xl space-y-4">
          <div className="flex items-center space-x-3 border-b border-zinc-800 pb-3">
            <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">
                Student Researcher
              </h3>
              <p className="text-xs text-zinc-400">Primary student developer & system engineer</p>
            </div>
          </div>

          {/* Student Researcher Card */}
          <div className="p-5 rounded-2xl bg-black border border-zinc-800/80 space-y-2 relative overflow-hidden">
            <div className="text-[10px] font-mono text-cyan-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
              <UserCheck className="w-3.5 h-3.5" />
              Student Lead
            </div>
            <div className="text-lg font-bold text-white font-sans">
              {research.student1Name}
            </div>
            <div className="text-xs text-zinc-300 font-sans">
              {research.student1Role}
            </div>
            <div className="pt-2 mt-2 border-t border-zinc-900 flex flex-col gap-1 text-[11px] font-mono text-zinc-400">
              <span className="text-cyan-300">
                Developer & Hardware Engineer
              </span>
              <span className="text-zinc-500">
                Institution: {research.schoolName}
              </span>
            </div>
          </div>
        </div>

        {/* Academic Inverter & Load Scope */}
        <div className="bg-zinc-950 border border-zinc-800 rounded-3xl p-6 shadow-xl space-y-4">
          <div className="flex items-center space-x-3 border-b border-zinc-800 pb-3">
            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">
                System Scope & Capacity
              </h3>
              <p className="text-xs text-zinc-400">Academic load and telemetry specifications</p>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-black border border-zinc-800/80 space-y-3 relative overflow-hidden">
            <div className="text-white font-semibold flex items-center justify-between pb-2 border-b border-zinc-900">
              <span className="flex items-center gap-1.5 text-xs font-mono text-zinc-300">
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                Inverter Load Specification
              </span>
              <span className="text-amber-400 font-mono font-bold text-sm">
                {research.inverterLoadWatts ?? 150} W
              </span>
            </div>
            <p className="text-[11px] text-zinc-400 leading-relaxed font-sans">
              Autonomous Wi-Fi telemetry stream and physical dual-pass wiper test bench designed for residential and rooftop photovoltaic arrays.
            </p>
          </div>
        </div>

      </div>

      {/* Dynamic Research Photo Evidence Slots */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 text-sm font-bold text-white">
            <ImageIcon className="w-4 h-4 text-purple-400" />
            <span>Research Visual Evidence ({research.photos.length} Photo Slots)</span>
          </div>
          {isOwner && (
            <button
              onClick={handleOpenEdit}
              className="text-xs font-mono text-purple-400 hover:text-purple-300 flex items-center gap-1 cursor-pointer transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Manage Photo Slots</span>
            </button>
          )}
        </div>

        {research.photos.length === 0 ? (
          <div className="p-6 text-center bg-zinc-950 border border-zinc-800 rounded-2xl text-zinc-500 text-xs font-mono">
            No research photo slots added yet. Click "Edit Research & Media Slots" to add photos.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {research.photos.map((photo) => (
              <div 
                key={photo.id}
                onClick={() => setActivePhotoModal(photo)}
                className="group bg-zinc-950 border border-zinc-800 rounded-2xl overflow-hidden hover:border-purple-500/50 transition cursor-pointer shadow-lg flex flex-col"
              >
                <div className="relative aspect-video w-full bg-black overflow-hidden">
                  <img 
                    src={photo.url} 
                    alt={photo.title} 
                    className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1509391365360-2e959784a276?auto=format&fit=crop&w=1200&q=80';
                    }}
                  />
                  <div className="absolute top-2.5 left-2.5 bg-black/85 backdrop-blur px-2 py-0.5 rounded-md text-[10px] font-mono font-bold text-purple-400 border border-zinc-800">
                    Photo #{photo.id}
                  </div>
                  <div className="absolute bottom-2.5 right-2.5 p-1.5 rounded-md bg-zinc-900/80 text-white opacity-0 group-hover:opacity-100 transition">
                    <ZoomIn className="w-3.5 h-3.5" />
                  </div>
                </div>
                <div className="p-3.5 space-y-1 flex-1 flex flex-col justify-between">
                  <div>
                    <h4 className="font-bold text-white text-xs group-hover:text-purple-400 transition line-clamp-1">
                      {photo.title}
                    </h4>
                    <p className="text-[11px] text-zinc-400 leading-relaxed mt-1 line-clamp-2">
                      {photo.caption}
                    </p>
                  </div>
                  <div className="pt-2 text-[10px] font-mono text-zinc-500 flex items-center justify-between border-t border-zinc-900">
                    <span>Photo #{photo.id}</span>
                    <span className="text-purple-400">Click to view</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Dynamic Research Video Slots */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 text-sm font-bold text-white">
            <Video className="w-4 h-4 text-indigo-400" />
            <span>Research Video Demonstration ({research.videos.length} Video Slots)</span>
          </div>
          {isOwner && (
            <button
              onClick={handleOpenEdit}
              className="text-xs font-mono text-indigo-400 hover:text-indigo-300 flex items-center gap-1 cursor-pointer transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Manage Video Slots</span>
            </button>
          )}
        </div>

        {research.videos.length === 0 ? (
          <div className="p-6 text-center bg-zinc-950 border border-zinc-800 rounded-2xl text-zinc-500 text-xs font-mono">
            No research video slots added yet. Click "Edit Research & Media Slots" to add videos.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {research.videos.map((vid) => (
              <div key={vid.id} className="bg-zinc-950 border border-zinc-800 rounded-3xl p-5 shadow-xl space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-indigo-400" />
                    <span>{vid.title}</span>
                  </h4>
                  <span className="px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-300 font-mono text-[10px] border border-indigo-500/20 font-bold">
                    Video #{vid.id}
                  </span>
                </div>

                {/* Video Player */}
                <div className="relative aspect-video w-full rounded-2xl overflow-hidden bg-black border border-zinc-800">
                  {isDirectMp4(vid.url) ? (
                    <video 
                      src={vid.url} 
                      controls 
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <iframe
                      src={formatVideoEmbedUrl(vid.url)}
                      title={vid.title}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      allowFullScreen
                      className="w-full h-full border-0"
                    />
                  )}
                </div>

                <p className="text-xs text-zinc-400 leading-relaxed">
                  {vid.description}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Photo Modal */}
      {activePhotoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fadeIn">
          <div className="bg-zinc-950 border border-zinc-800 rounded-3xl max-w-3xl w-full overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-purple-400">Photo #{activePhotoModal.id}</span>
              <button 
                onClick={() => setActivePhotoModal(null)}
                className="p-1 rounded-lg text-zinc-400 hover:text-white transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="relative aspect-video w-full bg-black">
              <img 
                src={activePhotoModal.url} 
                alt={activePhotoModal.title}
                className="w-full h-full object-contain" 
              />
            </div>
            <div className="p-5 space-y-1">
              <h4 className="font-bold text-white text-base">{activePhotoModal.title}</h4>
              <p className="text-xs text-zinc-300 leading-relaxed">{activePhotoModal.caption}</p>
            </div>
          </div>
        </div>
      )}

      {/* Owner-Only Edit Modal with Add/Remove Photo & Video Slots */}
      {isEditing && isOwner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
          <div className="bg-zinc-950 border border-zinc-800 rounded-3xl w-full max-w-3xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
            
            {/* Header */}
            <div className="p-5 border-b border-zinc-800 flex items-center justify-between bg-black">
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400">
                  <Database className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">Edit Research Details & Media Slots</h3>
                  <p className="text-xs text-zinc-400 font-mono">
                    Owner Mode • Add or Remove Photo/Video Slots
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsEditing(false)}
                className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-900 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Tabs */}
            <div className="flex border-b border-zinc-800 bg-black/60 px-6 pt-2 text-xs font-mono gap-2">
              <button
                type="button"
                onClick={() => setEditTab('info')}
                className={`py-2 px-3 border-b-2 transition cursor-pointer font-bold ${
                  editTab === 'info' 
                    ? 'border-purple-400 text-purple-400' 
                    : 'border-transparent text-zinc-400 hover:text-white'
                }`}
              >
                1. School & Team Info
              </button>
              <button
                type="button"
                onClick={() => setEditTab('photos')}
                className={`py-2 px-3 border-b-2 transition cursor-pointer font-bold ${
                  editTab === 'photos' 
                    ? 'border-purple-400 text-purple-400' 
                    : 'border-transparent text-zinc-400 hover:text-white'
                }`}
              >
                2. Photo Slots ({editResearch.photos.length})
              </button>
              <button
                type="button"
                onClick={() => setEditTab('videos')}
                className={`py-2 px-3 border-b-2 transition cursor-pointer font-bold ${
                  editTab === 'videos' 
                    ? 'border-purple-400 text-purple-400' 
                    : 'border-transparent text-zinc-400 hover:text-white'
                }`}
              >
                3. Video Slots ({editResearch.videos.length})
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSaveToFirebase} className="p-6 overflow-y-auto space-y-5 flex-1 text-xs">
              
              {/* Tab 1: Info */}
              {editTab === 'info' && (
                <div className="space-y-4">
                  {/* Project Title */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-purple-400">Project / Exhibition Title</label>
                    <input
                      type="text"
                      value={editResearch.projectTitle}
                      onChange={(e) => setEditResearch({ ...editResearch, projectTitle: e.target.value })}
                      className="w-full bg-black border border-zinc-800 rounded-xl p-2.5 text-zinc-200 text-xs focus:outline-none focus:border-purple-400"
                      required
                    />
                  </div>

                  {/* School Name */}
                  <div className="p-4 bg-black rounded-2xl border border-zinc-800 space-y-2">
                    <label className="text-xs font-bold text-purple-300 flex items-center gap-1.5">
                      <School className="w-4 h-4" />
                      School Name
                    </label>
                    <input
                      type="text"
                      value={editResearch.schoolName}
                      onChange={(e) => setEditResearch({ ...editResearch, schoolName: e.target.value })}
                      className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-2.5 text-zinc-200 text-xs focus:outline-none focus:border-purple-400"
                      required
                    />
                  </div>

                  {/* Student Researcher */}
                  <div className="p-4 bg-black rounded-2xl border border-zinc-800 space-y-3">
                    <div className="text-xs font-bold text-cyan-300 flex items-center gap-1.5">
                      <GraduationCap className="w-4 h-4" />
                      Student Researcher
                    </div>
                    <div className="p-3 bg-zinc-900/60 rounded-xl border border-zinc-800 space-y-2">
                      <span className="text-[10px] font-mono text-cyan-400 font-bold">Student Researcher</span>
                      <input
                        type="text"
                        value={editResearch.student1Name}
                        onChange={(e) => setEditResearch({ ...editResearch, student1Name: e.target.value })}
                        placeholder="Student Researcher Name"
                        className="w-full bg-black border border-zinc-700 rounded-lg p-2 text-zinc-200 text-xs focus:outline-none focus:border-cyan-400"
                        required
                      />
                      <input
                        type="text"
                        value={editResearch.student1Role}
                        onChange={(e) => setEditResearch({ ...editResearch, student1Role: e.target.value })}
                        placeholder="Student Role / Research Task"
                        className="w-full bg-black border border-zinc-700 rounded-lg p-2 text-zinc-400 text-xs focus:outline-none focus:border-cyan-400"
                        required
                      />
                    </div>
                  </div>

                  {/* Project Mentor & Faculty Teacher */}
                  <div className="p-4 bg-black rounded-2xl border border-emerald-500/30 space-y-3">
                    <div className="text-xs font-bold text-emerald-400 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Award className="w-4 h-4" />
                        Project Mentor & Faculty Teacher
                      </span>
                      <span className="text-[10px] font-mono text-zinc-400 font-normal">sushilnisha23112004@gmail.com</span>
                    </div>
                    <div className="p-3 bg-zinc-900/60 rounded-xl border border-zinc-800 space-y-2">
                      <span className="text-[10px] font-mono text-emerald-400 font-bold">Mentor Teacher Name</span>
                      <input
                        type="text"
                        value={editResearch.teacherName || ''}
                        onChange={(e) => setEditResearch({ ...editResearch, teacherName: e.target.value })}
                        placeholder="e.g. Er. Sushil Kumar"
                        className="w-full bg-black border border-zinc-700 rounded-lg p-2 text-zinc-200 text-xs focus:outline-none focus:border-emerald-400"
                      />
                      <span className="text-[10px] font-mono text-zinc-400 font-bold block pt-1">Mentorship Role / Subject</span>
                      <input
                        type="text"
                        value={editResearch.teacherSubject || ''}
                        onChange={(e) => setEditResearch({ ...editResearch, teacherSubject: e.target.value })}
                        placeholder="e.g. Project Mentor & Faculty Guide (Hardware Architecture & Research Advisor)"
                        className="w-full bg-black border border-zinc-700 rounded-lg p-2 text-zinc-400 text-xs focus:outline-none focus:border-emerald-400"
                      />
                    </div>
                  </div>

                  {/* Inverter Load Watts */}
                  <div className="p-4 bg-black rounded-2xl border border-zinc-800 space-y-2">
                    <label className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                      <Zap className="w-4 h-4" />
                      Inverter Load Output (Watts)
                    </label>
                    <input
                      type="number"
                      value={editResearch.inverterLoadWatts ?? 150}
                      onChange={(e) => setEditResearch({ ...editResearch, inverterLoadWatts: parseFloat(e.target.value) || 0 })}
                      className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-2 text-zinc-200 text-xs focus:outline-none focus:border-amber-400"
                      min={0}
                      max={10000}
                    />
                  </div>
                </div>
              )}

              {/* Tab 2: Photo Slots Editor */}
              {editTab === 'photos' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-purple-300">
                      Manage Photo Slots ({editResearch.photos.length} total)
                    </span>
                    <button
                      type="button"
                      onClick={handleAddPhotoSlot}
                      className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-mono text-xs flex items-center gap-1 cursor-pointer transition"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Photo Slot</span>
                    </button>
                  </div>

                  {editResearch.photos.map((photo, index) => (
                    <div key={photo.id || index} className="p-4 bg-black rounded-2xl border border-zinc-800 space-y-3 relative">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono font-bold text-purple-400">Photo Slot #{index + 1}</span>
                        <button
                          type="button"
                          onClick={() => handleRemovePhotoSlot(index)}
                          className="text-rose-400 hover:text-rose-300 flex items-center gap-1 text-[11px] font-mono cursor-pointer transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Remove Slot</span>
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="sm:col-span-2 space-y-2">
                          <input
                            type="text"
                            value={photo.title}
                            onChange={(e) => {
                              const updated = [...editResearch.photos];
                              updated[index].title = e.target.value;
                              setEditResearch({ ...editResearch, photos: updated });
                            }}
                            placeholder="Photo Title"
                            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-2 text-zinc-200 text-xs focus:outline-none focus:border-purple-400"
                          />
                          <input
                            type="text"
                            value={photo.url}
                            onChange={(e) => {
                              const updated = [...editResearch.photos];
                              updated[index].url = e.target.value;
                              setEditResearch({ ...editResearch, photos: updated });
                            }}
                            placeholder="Image URL or upload below"
                            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-2 text-zinc-200 text-xs focus:outline-none focus:border-purple-400"
                          />
                          <input
                            type="text"
                            value={photo.caption}
                            onChange={(e) => {
                              const updated = [...editResearch.photos];
                              updated[index].caption = e.target.value;
                              setEditResearch({ ...editResearch, photos: updated });
                            }}
                            placeholder="Caption / Description"
                            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-2 text-zinc-400 text-xs focus:outline-none focus:border-purple-400"
                          />
                          <div className="flex items-center gap-2 pt-1">
                            <label className="px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-mono text-[10px] cursor-pointer transition">
                              <span>Choose Local File</span>
                              <input 
                                type="file" 
                                accept="image/*" 
                                className="hidden" 
                                onChange={(e) => handlePhotoUpload(index, e)} 
                              />
                            </label>
                          </div>
                        </div>
                        <div className="relative aspect-video sm:aspect-square bg-zinc-900 rounded-xl overflow-hidden border border-zinc-800 flex items-center justify-center">
                          {photo.url ? (
                            <img src={photo.url} alt={photo.title} className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-zinc-600 text-[10px]">No image</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Tab 3: Video Slots Editor */}
              {editTab === 'videos' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-indigo-300">
                      Manage Video Slots ({editResearch.videos.length} total)
                    </span>
                    <button
                      type="button"
                      onClick={handleAddVideoSlot}
                      className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-mono text-xs flex items-center gap-1 cursor-pointer transition"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Video Slot</span>
                    </button>
                  </div>

                  {editResearch.videos.map((video, index) => (
                    <div key={video.id || index} className="p-4 bg-black rounded-2xl border border-zinc-800 space-y-3 relative">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono font-bold text-indigo-400">Video Slot #{index + 1}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveVideoSlot(index)}
                          className="text-rose-400 hover:text-rose-300 flex items-center gap-1 text-[11px] font-mono cursor-pointer transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Remove Slot</span>
                        </button>
                      </div>

                      <div className="space-y-2">
                        <input
                          type="text"
                          value={video.title}
                          onChange={(e) => {
                            const updated = [...editResearch.videos];
                            updated[index].title = e.target.value;
                            setEditResearch({ ...editResearch, videos: updated });
                          }}
                          placeholder="Video Title"
                          className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-2 text-zinc-200 text-xs focus:outline-none focus:border-indigo-400"
                        />
                        <input
                          type="text"
                          value={video.url}
                          onChange={(e) => {
                            const updated = [...editResearch.videos];
                            updated[index].url = e.target.value;
                            setEditResearch({ ...editResearch, videos: updated });
                          }}
                          placeholder="YouTube Embed URL or Direct MP4 link"
                          className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-2 text-zinc-200 text-xs focus:outline-none focus:border-indigo-400"
                        />
                        <textarea
                          value={video.description}
                          onChange={(e) => {
                            const updated = [...editResearch.videos];
                            updated[index].description = e.target.value;
                            setEditResearch({ ...editResearch, videos: updated });
                          }}
                          placeholder="Video Description"
                          rows={2}
                          className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-2 text-zinc-300 text-xs focus:outline-none focus:border-indigo-400"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {saveStatus && (
                <div className={`p-3 rounded-xl border text-xs font-mono flex items-center gap-2 ${
                  saveStatus.includes('successfully') ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200' : 'bg-purple-950/40 border-purple-500/40 text-purple-200'
                }`}>
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{saveStatus}</span>
                </div>
              )}

              {/* Modal Actions */}
              <div className="flex items-center justify-between pt-2 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => {
                    setEditResearch(DEFAULT_RESEARCH_DATA);
                  }}
                  className="text-zinc-400 hover:text-white transition flex items-center gap-1.5 cursor-pointer text-xs"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset to Defaults</span>
                </button>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition cursor-pointer text-xs"
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
