import React, { useState, useEffect } from 'react';
import { 
  BookOpen, 
  Sparkles, 
  ShieldCheck, 
  Edit3, 
  Save, 
  Image as ImageIcon, 
  Video, 
  RotateCcw, 
  X, 
  FileText, 
  CheckCircle2, 
  Database,
  ZoomIn,
  Lock,
  Plus,
  Trash2,
  Zap,
  AlertTriangle
} from 'lucide-react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db, sanitizeForFirestore } from '../lib/firebase';
import { OWNER_EMAILS } from './ResearchMode';

export interface PhotoItem {
  id: number | string;
  url: string;
  title: string;
  caption: string;
}

export interface VideoItem {
  id: number | string;
  url: string;
  title: string;
  description: string;
}

export interface AboutContentData {
  summary: string;
  photos: PhotoItem[];
  videos: VideoItem[];
  inverterLoadWatts?: number;
  updatedAt?: string;
}

// Client-side image compression to avoid exceeding Firestore 1MB document limit
const compressImage = (file: File, maxDim = 1200, quality = 0.75): Promise<string> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        let width = img.width;
        let height = img.height;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(event.target?.result as string);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        const compressed = canvas.toDataURL('image/jpeg', quality);
        resolve(compressed);
      };
      img.onerror = () => {
        resolve(event.target?.result as string);
      };
    };
    reader.onerror = () => {
      resolve('');
    };
  });
};

const DEFAULT_PHOTOS: PhotoItem[] = [
  {
    id: 1,
    url: 'https://images.unsplash.com/photo-1509391365360-2e959784a276?auto=format&fit=crop&w=1200&q=80',
    title: 'High-Efficiency Monocrystalline Photovoltaic Array',
    caption: 'High-transmittance tempered glass surface with anti-reflective optical coating installed on the test bench.',
  },
  {
    id: 2,
    url: 'https://images.unsplash.com/photo-1508873696983-2df570464756?auto=format&fit=crop&w=1200&q=80',
    title: 'Motorized Dual-Pass Silicone Wiper Assembly',
    caption: 'Electromechanical squeegee arm actuated by high-torque gearmotor for safe nocturnal dry dust clearance.',
  },
  {
    id: 3,
    url: 'https://images.unsplash.com/photo-1542332213-9b5a5a3fad35?auto=format&fit=crop&w=1200&q=80',
    title: 'Rooftop Solar Array Environmental Deployment',
    caption: 'Ambient outdoor deployment subject to natural urban dust, soot accumulation, and temperature cycles.',
  },
  {
    id: 4,
    url: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1200&q=80',
    title: 'INA219 High-Side Power & Current Sensing Circuit',
    caption: 'Bidirectional I2C current shunt monitor measuring voltage, current, and instantaneous solar generation wattage.',
  },
  {
    id: 5,
    url: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=1200&q=80',
    title: 'Analog LM35 Thermal Transducer & Heat Sink',
    caption: 'Precision centigrade temperature sensor tracking cell surface thermal derating at 10 millivolts per degree Celsius.',
  },
  {
    id: 6,
    url: 'https://images.unsplash.com/photo-1515694346937-94d85e41e6f0?auto=format&fit=crop&w=1200&q=80',
    title: 'Gold-Plated FC-37 Rain Precipitation Detector',
    caption: 'Conductive rain board detecting natural precipitation to trigger ambient washing and lock out dry sweep.',
  },
  {
    id: 7,
    url: 'https://images.unsplash.com/photo-1555680202-c86f0e12f086?auto=format&fit=crop&w=1200&q=80',
    title: 'Microcontroller Circuit Breadboard & Relay Stage',
    caption: 'Optoisolated active-LOW 10A relay modules switching motorized wiper mechanical actuators.',
  },
  {
    id: 8,
    url: 'https://images.unsplash.com/photo-1617788138017-80ad40651399?auto=format&fit=crop&w=1200&q=80',
    title: 'Deep Cycle 12V LiFePO4 Energy Storage Bank',
    caption: '12V lithium iron phosphate energy storage system buffered by an MPPT charge controller.',
  },
  {
    id: 9,
    url: 'https://images.unsplash.com/photo-1497435334941-8c899ee9e8e9?auto=format&fit=crop&w=1200&q=80',
    title: 'Solar Glass Dust Attenuation Comparative Test',
    caption: 'Side-by-side irradiance transmittance comparison showing up to 25% efficiency recovery following squeegee sweep.',
  },
  {
    id: 10,
    url: 'https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?auto=format&fit=crop&w=1200&q=80',
    title: 'Field Station Integration & Clean Energy Lab',
    caption: 'Complete autonomous cyber-physical solar monitoring station undergoing long-term telemetry logging.',
  },
];

const DEFAULT_VIDEOS: VideoItem[] = [
  {
    id: 1,
    url: 'https://www.youtube.com/embed/8R_K8X5h_eE',
    title: 'Automated Solar Panel Wiper Cleaning Demonstration',
    description: 'Overview of robotic surface cleaning kinematics, nocturnal sweep cycles, and dust clearance.',
  },
  {
    id: 2,
    url: 'https://www.youtube.com/embed/1v_43h50u4A',
    title: 'INA219 & LM35 Real-Time IoT Telemetry Stream',
    description: 'Real-time sensor telemetry streaming bus voltage, shunt current, and thermal derating to Cloud Firestore.',
  },
  {
    id: 3,
    url: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
    title: 'Rain Precipitation Washing & Thermal Shock Prevention',
    description: 'Gold-plated FC-37 sensor detecting rainfall and locking out midday water spray to protect hot solar glass.',
  },
  {
    id: 4,
    url: 'https://www.youtube.com/embed/EngW7tLk6R8',
    title: 'Complete Farm.IOT Cyber-Physical Station Tour',
    description: 'Comprehensive walkthrough of microcontroller firmware, relays, battery storage, and cloud telemetry.',
  },
];

const DEFAULT_SUMMARY = `The Farm.IOT system represents an advanced, intelligent cyber-physical platform engineered to resolve operational efficiency losses in agro-photovoltaic energy generation: environmental dust soiling and thermal panel degradation. In arid, agricultural, and suburban deployment environments, fine particulate matter, soot, pollen, and airborne sand form an adhesive opaque layer over protective solar glass, resulting in solar irradiance transmittance losses ranging between 15% to 35% in as few as three weeks without maintenance.

To combat this without damaging sensitive anti-reflective optical coatings, Farm.IOT integrates a motorized dual-pass silicone squeegee wiper arm driven by an active-low relay module alongside high-precision sensory feedback. Voltage, current, and instantaneous wattage are measured across the bus via an INA219 digital sensor communicating over I2C, while thermal stress is tracked using an analog LM35 surface temperature sensor calibrated at 10 millivolts per degree Celsius. Crucially, spraying water onto solar panels during sunshine causes dangerous thermal shock fractures on hot tempered glass; this system completely eliminates this risk by performing safe, dry motorized sweeps during scheduled nocturnal hours (03:00 AM) or leveraging natural rainwater detected via an FC-37 precipitation sensor.

The system natively supports both Standalone Off-Grid configurations (with 12V LiFePO4 battery bank and continuous AC/DC inverter load tracking) and On-Grid net-metered grid-tied systems. All telemetry and actuator states stream seamlessly to Google Cloud Firestore via standalone ESP-01 (ESP8266) or ESP32 microcontrollers over HTTPS REST or real-time WebSockets. Remote operators can trigger cleaning routines on demand, customize automated nocturnal schedules, track cumulative kilowatt-hour yields, and manage dynamic visual evidence photo slots and demonstration videos with full cloud synchronization.`;

interface AboutSectionProps {
  currentUser?: {
    email?: string | null;
    displayName?: string | null;
  } | null;
  onRequireSignIn?: () => void;
}

export const AboutSection: React.FC<AboutSectionProps> = ({ currentUser, onRequireSignIn }) => {
  const [summary, setSummary] = useState<string>(DEFAULT_SUMMARY);
  const [photos, setPhotos] = useState<PhotoItem[]>(() => {
    try {
      const cached = localStorage.getItem('solar_iot_about_photos');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return DEFAULT_PHOTOS;
  });
  const [videos, setVideos] = useState<VideoItem[]>(() => {
    try {
      const cached = localStorage.getItem('solar_iot_about_videos');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return DEFAULT_VIDEOS;
  });
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editSummary, setEditSummary] = useState<string>(DEFAULT_SUMMARY);
  const [editPhotos, setEditPhotos] = useState<PhotoItem[]>(DEFAULT_PHOTOS);
  const [editVideos, setEditVideos] = useState<VideoItem[]>(DEFAULT_VIDEOS);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [activePhotoModal, setActivePhotoModal] = useState<PhotoItem | null>(null);
  const [editActiveTab, setEditActiveTab] = useState<'summary' | 'photos' | 'videos'>('summary');
  const [directDeleteSuccess, setDirectDeleteSuccess] = useState<string | null>(null);

  // In-app deletion dialog states (avoids iframe-blocked window.confirm)
  const [deleteTarget, setDeleteTarget] = useState<{
    type: 'photo' | 'video';
    id: number | string;
    title: string;
  } | null>(null);
  const [showAdminRequiredModal, setShowAdminRequiredModal] = useState<boolean>(false);

  // Verify owner
  const isOwner = Boolean(
    currentUser?.email && 
    OWNER_EMAILS.includes(currentUser.email.trim().toLowerCase())
  );

  const requestDelete = (type: 'photo' | 'video', id: number | string, title: string) => {
    if (!isOwner) {
      setShowAdminRequiredModal(true);
      return;
    }
    setDeleteTarget({ type, id, title });
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    const { type, id } = deleteTarget;
    setDeleteTarget(null);
    if (type === 'photo') {
      await handleDirectDeletePhoto(id);
      if (activePhotoModal && String(activePhotoModal.id) === String(id)) {
        setActivePhotoModal(null);
      }
    } else {
      await handleDirectDeleteVideo(id);
    }
  };

  const countWords = (text: string) => {
    return text.trim().split(/\s+/).filter(Boolean).length;
  };

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

  // Sync with Cloud Firestore
  useEffect(() => {
    const docRef = doc(db, 'solar_iot', 'about_content');
    const unsubscribe = onSnapshot(docRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        if (data.summary) setSummary(data.summary);
        if (Array.isArray(data.photos)) {
          setPhotos(data.photos);
          try {
            localStorage.setItem('solar_iot_about_photos', JSON.stringify(data.photos));
          } catch {}
        } else if (data.photo1Url && data.photo2Url) {
          const merged = [...DEFAULT_PHOTOS];
          merged[0] = { ...merged[0], url: data.photo1Url, title: data.photo1Title || merged[0].title, caption: data.photo1Caption || merged[0].caption };
          merged[1] = { ...merged[1], url: data.photo2Url, title: data.photo2Title || merged[1].title, caption: data.photo2Caption || merged[1].caption };
          setPhotos(merged);
        }
        if (Array.isArray(data.videos)) {
          setVideos(data.videos);
          try {
            localStorage.setItem('solar_iot_about_videos', JSON.stringify(data.videos));
          } catch {}
        } else if (data.videoUrl) {
          const mergedV = [...DEFAULT_VIDEOS];
          mergedV[0] = { ...mergedV[0], url: data.videoUrl, title: data.videoTitle || mergedV[0].title, description: data.videoDescription || mergedV[0].description };
          setVideos(mergedV);
        }
      }
    });

    return () => unsubscribe();
  }, []);

  const handleOpenEdit = (tab: 'summary' | 'photos' | 'videos' = 'summary') => {
    if (!isOwner) {
      if (onRequireSignIn) {
        onRequireSignIn();
      }
      return;
    }
    setEditSummary(summary);
    setEditPhotos(photos.map(p => ({ ...p })));
    setEditVideos(videos.map(v => ({ ...v })));
    setEditActiveTab(tab);
    setIsEditing(true);
    setSaveStatus(null);
  };

  // Direct instant delete for photo by id
  const handleDirectDeletePhoto = async (photoId: number | string) => {
    if (!isOwner) {
      if (onRequireSignIn) onRequireSignIn();
      return;
    }
    const updated = photos.filter(p => String(p.id) !== String(photoId));
    setPhotos(updated);
    try {
      localStorage.setItem('solar_iot_about_photos', JSON.stringify(updated));
    } catch {}

    if (activePhotoModal && String(activePhotoModal.id) === String(photoId)) {
      setActivePhotoModal(null);
    }

    try {
      const docRef = doc(db, 'solar_iot', 'about_content');
      await setDoc(docRef, {
        photos: updated,
        photo1Url: updated[0]?.url || '',
        photo1Title: updated[0]?.title || '',
        photo1Caption: updated[0]?.caption || '',
        photo2Url: updated[1]?.url || '',
        photo2Title: updated[1]?.title || '',
        photo2Caption: updated[1]?.caption || '',
        updatedAt: new Date().toISOString(),
      }, { merge: true });
      setDirectDeleteSuccess('Photo removed successfully!');
      setTimeout(() => setDirectDeleteSuccess(null), 3000);
    } catch (err: any) {
      console.error('Direct delete sync error:', err);
      setDirectDeleteSuccess('Photo removed locally (cloud sync pending)');
      setTimeout(() => setDirectDeleteSuccess(null), 3500);
    }
  };

  // Direct instant delete for video by id
  const handleDirectDeleteVideo = async (videoId: number | string) => {
    if (!isOwner) {
      if (onRequireSignIn) onRequireSignIn();
      return;
    }
    const updated = videos.filter(v => String(v.id) !== String(videoId));
    setVideos(updated);
    try {
      localStorage.setItem('solar_iot_about_videos', JSON.stringify(updated));
    } catch {}

    try {
      const docRef = doc(db, 'solar_iot', 'about_content');
      await setDoc(docRef, {
        videos: updated,
        videoUrl: updated[0]?.url || '',
        videoTitle: updated[0]?.title || '',
        videoDescription: updated[0]?.description || '',
        updatedAt: new Date().toISOString(),
      }, { merge: true });
      setDirectDeleteSuccess('Video removed successfully!');
      setTimeout(() => setDirectDeleteSuccess(null), 3000);
    } catch (err: any) {
      console.error('Direct video delete sync error:', err);
      setDirectDeleteSuccess('Video removed locally (cloud sync pending)');
      setTimeout(() => setDirectDeleteSuccess(null), 3500);
    }
  };

  // Dynamic Photo Slot handlers
  const handleAddPhotoSlot = () => {
    const newId = Date.now();
    const newPhoto: PhotoItem = {
      id: newId,
      url: '',
      title: `Photo Slot #${editPhotos.length + 1}`,
      caption: 'Solar panel installation & hardware test bench visual evidence.',
    };
    setEditPhotos([...editPhotos, newPhoto]);
  };

  const handleRemovePhotoSlot = (index: number) => {
    const updated = editPhotos.filter((_, i) => i !== index);
    setEditPhotos(updated);
  };

  const handleClearPhotoUrl = (index: number) => {
    const updated = [...editPhotos];
    updated[index].url = '';
    setEditPhotos(updated);
  };

  const handlePhotoFileUpload = async (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const compressed = await compressImage(file);
        if (compressed) {
          const updated = [...editPhotos];
          updated[index].url = compressed;
          setEditPhotos(updated);
        }
      } catch (err) {
        console.error('Error compressing image:', err);
      }
    }
  };

  // Dynamic Video Slot handlers
  const handleAddVideoSlot = () => {
    const newId = Date.now();
    const newVideo: VideoItem = {
      id: newId,
      url: 'https://www.youtube.com/embed/8R_K8X5h_eE',
      title: `Demonstration Video #${editVideos.length + 1}`,
      description: 'Operational video recording of automated wiper and telemetry system.',
    };
    setEditVideos([...editVideos, newVideo]);
  };

  const handleRemoveVideoSlot = (index: number) => {
    const updated = editVideos.filter((_, i) => i !== index);
    setEditVideos(updated);
  };

  const handleClearVideoUrl = (index: number) => {
    const updated = [...editVideos];
    updated[index].url = '';
    setEditVideos(updated);
  };

  const handleSaveToFirebase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isOwner) {
      setSaveStatus('Access Denied: Administrator authentication required.');
      return;
    }

    setIsSaving(true);
    setSaveStatus('Saving all media & summary to Firebase...');
    try {
      const nowIso = new Date().toISOString();
      const docRef = doc(db, 'solar_iot', 'about_content');
      await setDoc(docRef, sanitizeForFirestore({
        summary: editSummary,
        photos: editPhotos,
        videos: editVideos,
        photo1Url: editPhotos[0]?.url || '',
        photo1Title: editPhotos[0]?.title || '',
        photo1Caption: editPhotos[0]?.caption || '',
        photo2Url: editPhotos[1]?.url || '',
        photo2Title: editPhotos[1]?.title || '',
        photo2Caption: editPhotos[1]?.caption || '',
        videoUrl: editVideos[0]?.url || '',
        videoTitle: editVideos[0]?.title || '',
        videoDescription: editVideos[0]?.description || '',
        updatedAt: nowIso,
      }), { merge: true });

      setSummary(editSummary);
      setPhotos(editPhotos);
      setVideos(editVideos);
      try {
        localStorage.setItem('solar_iot_about_photos', JSON.stringify(editPhotos));
        localStorage.setItem('solar_iot_about_videos', JSON.stringify(editVideos));
      } catch {}
      setSaveStatus('Summary, photos, and videos successfully saved to Firebase!');
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
    <div className="space-y-8 animate-fadeIn">
      
      {/* Top Banner */}
      <div className="bg-zinc-950 border border-zinc-800 rounded-3xl p-6 sm:p-8 relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex items-center space-x-2 text-xs font-mono text-cyan-400 bg-cyan-500/10 px-3 py-1 rounded-full border border-cyan-500/20">
                <BookOpen className="w-3.5 h-3.5" />
                <span>Solar Physics, Hardware Gallery & Research Synthesis</span>
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
              Farm.IOT Project Synthesis & Multimedia Documentation
            </h2>
            <p className="text-xs sm:text-sm text-zinc-300 max-w-2xl leading-relaxed">
              Complete scientific overview, {photos.length} hardware demonstration photos, {videos.length} operational videos, and thermal shock engineering data stored in Cloud Firestore.
            </p>
          </div>

          {/* Action button (only visible to owner) */}
          {isOwner && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleOpenEdit('summary')}
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-black font-bold text-xs font-mono transition cursor-pointer flex items-center gap-2 shadow-lg shadow-cyan-500/20"
              >
                <Edit3 className="w-4 h-4" />
                <span>Edit Summary & Media Slots</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* SECTION 1: Comprehensive Summary */}
      <div className="bg-zinc-950 border border-zinc-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-zinc-800 gap-2">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                <span>Comprehensive Project Summary & Scientific Synthesis</span>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                  {countWords(summary)} Words
                </span>
              </h3>
              <p className="text-xs text-zinc-400">
                Synthesis of physical hardware, sensors, thermal shock mitigation, inverter load, and clean energy findings
              </p>
            </div>
          </div>

          {isOwner && (
            <button
              onClick={() => handleOpenEdit('summary')}
              className="text-xs font-mono text-cyan-400 hover:text-cyan-300 flex items-center gap-1 cursor-pointer transition"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Edit Summary</span>
            </button>
          )}
        </div>

        {/* Formatted Summary Text */}
        <div className="p-5 sm:p-6 rounded-2xl bg-black border border-zinc-800 text-xs sm:text-sm text-zinc-200 leading-relaxed font-sans space-y-4">
          {summary.split('\n\n').map((paragraph, index) => (
            <p key={index} className="leading-relaxed text-zinc-300">
              {paragraph}
            </p>
          ))}
        </div>

        <div className="flex flex-wrap items-center justify-between text-[11px] font-mono text-zinc-400 pt-2 border-t border-zinc-900">
          <span>Target Document: <code className="text-cyan-400">solar_iot/about_content</code></span>
          <span>Dual-pass silicone squeegee • INA219 I2C • LM35 analog • Inverter Load Tracking</span>
        </div>
      </div>

      {/* SECTION 2: Dynamic Photo Showcase Gallery */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 text-sm font-bold text-white">
            <ImageIcon className="w-4 h-4 text-cyan-400" />
            <span>Hardware & Installation Photo Gallery ({photos.length} Photos)</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[11px] font-mono text-zinc-400 hidden sm:inline">Click photo to zoom</span>
            {isOwner && (
              <button
                onClick={() => handleOpenEdit('photos')}
                className="text-xs font-mono text-cyan-400 hover:text-cyan-300 flex items-center gap-1 cursor-pointer transition px-2.5 py-1 rounded-lg bg-cyan-500/10 border border-cyan-500/20"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add / Manage Photo Slots</span>
              </button>
            )}
          </div>
        </div>

        {directDeleteSuccess && (
          <div className="p-3 rounded-2xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-200 text-xs font-mono flex items-center gap-2 shadow-xl animate-fadeIn">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="font-bold">{directDeleteSuccess}</span>
          </div>
        )}

        {photos.length === 0 ? (
          <div className="p-8 text-center bg-zinc-950 border border-zinc-800 rounded-3xl text-zinc-500 text-xs font-mono space-y-3">
            <p>No photo slots currently in the gallery.</p>
            {isOwner && (
              <button
                type="button"
                onClick={() => handleOpenEdit('photos')}
                className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-black font-bold text-xs font-mono transition cursor-pointer"
              >
                + Add Photo Slots
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            {photos.map((photo, pIdx) => (
              <div 
                key={`gallery-photo-${photo.id}-${pIdx}`}
                onClick={() => setActivePhotoModal(photo)}
                className="group relative bg-zinc-950 border border-zinc-800 rounded-2xl overflow-hidden hover:border-cyan-500/50 transition cursor-pointer shadow-lg hover:shadow-cyan-500/10 flex flex-col"
              >
                {/* Quick Delete Button directly on photo card */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    requestDelete('photo', photo.id, photo.title || `Photo #${photo.id}`);
                  }}
                  title={isOwner ? "Remove this photo from gallery and Firebase" : "Owner authentication required to remove"}
                  className="absolute top-2.5 right-2.5 z-20 p-1.5 rounded-lg bg-red-600/90 hover:bg-red-500 text-white shadow-lg transition opacity-90 hover:opacity-100 hover:scale-110 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>

                <div className="relative aspect-video w-full bg-black overflow-hidden">
                  <img 
                    src={photo.url || 'https://images.unsplash.com/photo-1509391365360-2e959784a276?auto=format&fit=crop&w=1200&q=80'} 
                    alt={photo.title} 
                    className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1509391365360-2e959784a276?auto=format&fit=crop&w=1200&q=80';
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-80" />
                  <div className="absolute top-2.5 left-2.5 bg-black/85 backdrop-blur px-2 py-0.5 rounded-md text-[10px] font-mono font-bold text-cyan-400 border border-zinc-800">
                    Photo #{photo.id}
                  </div>
                  <div className="absolute bottom-2.5 right-2.5 p-1.5 rounded-md bg-zinc-900/80 text-white opacity-0 group-hover:opacity-100 transition">
                    <ZoomIn className="w-3.5 h-3.5" />
                  </div>
                </div>
                <div className="p-3.5 space-y-1 flex-1 flex flex-col justify-between">
                  <div>
                    <h4 className="font-bold text-white text-xs group-hover:text-cyan-400 transition line-clamp-1">
                      {photo.title || 'Untitled Photo'}
                    </h4>
                    <p className="text-[11px] text-zinc-400 leading-relaxed mt-1 line-clamp-2">
                      {photo.caption || 'No caption provided.'}
                    </p>
                  </div>
                  <div className="pt-2 text-[10px] font-mono text-zinc-500 flex items-center justify-between border-t border-zinc-900">
                    <span>Photo #{photo.id}</span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          requestDelete('photo', photo.id, photo.title || `Photo #${photo.id}`);
                        }}
                        className="text-rose-400 hover:text-rose-300 font-bold hover:underline cursor-pointer flex items-center gap-0.5"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Remove</span>
                      </button>
                      <span className="text-cyan-400">View</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* SECTION 3: Dynamic Demonstration Videos */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 text-sm font-bold text-white">
            <Video className="w-4 h-4 text-purple-400" />
            <span>Hardware Demonstration Video Gallery ({videos.length} Videos)</span>
          </div>
          {isOwner && (
            <button
              onClick={() => handleOpenEdit('videos')}
              className="text-xs font-mono text-purple-400 hover:text-purple-300 flex items-center gap-1 cursor-pointer transition px-2.5 py-1 rounded-lg bg-purple-500/10 border border-purple-500/20"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add / Manage Video Slots</span>
            </button>
          )}
        </div>

        {videos.length === 0 ? (
          <div className="p-8 text-center bg-zinc-950 border border-zinc-800 rounded-3xl text-zinc-500 text-xs font-mono">
            No video slots added. Click "Edit Summary & Media Slots" to add videos.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {videos.map((vid) => (
              <div key={vid.id} className="bg-zinc-950 border border-zinc-800 rounded-3xl p-5 shadow-xl space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-purple-400" />
                    <span>{vid.title}</span>
                  </h4>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-300 font-mono text-[10px] border border-purple-500/20 font-bold">
                      Video #{vid.id}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        requestDelete('video', vid.id, vid.title || `Video #${vid.id}`);
                      }}
                      title={isOwner ? "Remove this video from gallery and Firebase" : "Owner authentication required to remove"}
                      className="px-2 py-0.5 rounded-md bg-red-600/80 hover:bg-red-500 text-white font-mono text-[10px] flex items-center gap-1 transition cursor-pointer shadow"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Remove Video</span>
                    </button>
                  </div>
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

                <div className="pt-2 text-[10px] font-mono text-zinc-400 flex items-center justify-between border-t border-zinc-900">
                  <span className="truncate max-w-[200px] select-all">Src: {vid.url}</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        requestDelete('video', vid.id, vid.title || `Video #${vid.id}`);
                      }}
                      className="text-rose-400 hover:text-rose-300 font-bold hover:underline cursor-pointer flex items-center gap-0.5"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Remove</span>
                    </button>
                    <span className="text-purple-400">Firebase Synced</span>
                  </div>
                </div>
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
              <div className="flex items-center gap-3">
                <span className="text-xs font-mono font-bold text-cyan-400">Photo #{activePhotoModal.id}</span>
                <button
                  type="button"
                  onClick={() => {
                    requestDelete('photo', activePhotoModal.id, activePhotoModal.title || `Photo #${activePhotoModal.id}`);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-red-600/80 hover:bg-red-500 text-white font-mono text-xs flex items-center gap-1 transition cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Photo</span>
                </button>
              </div>
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
            <div className="p-5 flex items-start justify-between gap-4">
              <div className="space-y-1">
                <h4 className="font-bold text-white text-base">{activePhotoModal.title}</h4>
                <p className="text-xs text-zinc-300 leading-relaxed">{activePhotoModal.caption}</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  requestDelete('photo', activePhotoModal.id, activePhotoModal.title || `Photo #${activePhotoModal.id}`);
                }}
                className="shrink-0 px-3 py-1.5 rounded-xl bg-red-600/20 hover:bg-red-600 text-red-300 hover:text-white border border-red-500/30 font-mono text-xs flex items-center gap-1.5 transition cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Remove Photo</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Owner-Only Edit Modal with Add/Remove Slots */}
      {isEditing && isOwner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
          <div className="bg-zinc-950 border border-zinc-800 rounded-3xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
            
            {/* Modal Header */}
            <div className="p-5 border-b border-zinc-800 flex items-center justify-between bg-black">
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400">
                  <Database className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">Edit Project Summary, Photo & Video Slots</h3>
                  <p className="text-xs text-zinc-400 font-mono">
                    Owner Mode | Target Document: <strong className="text-cyan-400">solar_iot/about_content</strong>
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

            {/* Modal Sub-tabs */}
            <div className="flex border-b border-zinc-800 bg-black/60 px-6 pt-2 text-xs font-mono gap-2">
              <button
                type="button"
                onClick={() => setEditActiveTab('summary')}
                className={`py-2 px-3 border-b-2 transition cursor-pointer font-bold ${
                  editActiveTab === 'summary' 
                    ? 'border-cyan-400 text-cyan-400' 
                    : 'border-transparent text-zinc-400 hover:text-white'
                }`}
              >
                1. Project Summary
              </button>
              <button
                type="button"
                onClick={() => setEditActiveTab('photos')}
                className={`py-2 px-3 border-b-2 transition cursor-pointer font-bold ${
                  editActiveTab === 'photos' 
                    ? 'border-cyan-400 text-cyan-400' 
                    : 'border-transparent text-zinc-400 hover:text-white'
                }`}
              >
                2. Photos ({editPhotos.length} Slots)
              </button>
              <button
                type="button"
                onClick={() => setEditActiveTab('videos')}
                className={`py-2 px-3 border-b-2 transition cursor-pointer font-bold ${
                  editActiveTab === 'videos' 
                    ? 'border-cyan-400 text-cyan-400' 
                    : 'border-transparent text-zinc-400 hover:text-white'
                }`}
              >
                3. Videos ({editVideos.length} Slots)
              </button>
            </div>

            {/* Modal Body Form */}
            <form onSubmit={handleSaveToFirebase} className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
              
              {/* Tab 1: Summary Editor */}
              {editActiveTab === 'summary' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-cyan-400 flex items-center gap-1.5">
                      <FileText className="w-4 h-4" />
                      Comprehensive Project Summary
                    </label>
                    <span className="text-[11px] font-mono text-emerald-400 font-bold">
                      Current Word Count: {countWords(editSummary)} words
                    </span>
                  </div>
                  <textarea
                    value={editSummary}
                    onChange={(e) => setEditSummary(e.target.value)}
                    rows={12}
                    className="w-full bg-black border border-zinc-800 rounded-xl p-3.5 text-zinc-200 text-xs font-sans leading-relaxed focus:outline-none focus:border-cyan-500 transition"
                    placeholder="Write complete summary covering physical wiper, INA219/LM35/FC-37 sensors, inverter load, and photo/video evidence..."
                    required
                  />
                </div>
              )}

              {/* Tab 2: Photos Editor with Add / Remove Slots */}
              {editActiveTab === 'photos' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-cyan-300">
                      Manage Photo Slots ({editPhotos.length} total)
                    </span>
                    <button
                      type="button"
                      onClick={handleAddPhotoSlot}
                      className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-black font-mono font-bold text-xs flex items-center gap-1 cursor-pointer transition shadow-lg shadow-cyan-600/20"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Photo Slot</span>
                    </button>
                  </div>

                  {editPhotos.map((photo, index) => (
                    <div key={`edit-photo-slot-${photo.id || index}-${index}`} className="p-4 bg-black rounded-2xl border border-zinc-800 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono font-bold text-cyan-400">Photo Slot #{index + 1}</span>
                        <div className="flex items-center gap-2">
                          {photo.url && (
                            <button
                              type="button"
                              onClick={() => handleClearPhotoUrl(index)}
                              className="text-amber-400 hover:text-amber-300 flex items-center gap-1 text-[11px] font-mono cursor-pointer transition px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20"
                              title="Clear photo image from this slot"
                            >
                              <X className="w-3.5 h-3.5" />
                              <span>Clear Image</span>
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleRemovePhotoSlot(index)}
                            className="text-rose-400 hover:text-rose-300 flex items-center gap-1 text-[11px] font-mono cursor-pointer transition px-2 py-0.5 rounded bg-rose-500/10 border border-rose-500/20"
                            title="Remove this photo slot entirely"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Remove Slot</span>
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="sm:col-span-2 space-y-2">
                          <input
                            type="text"
                            value={photo.title}
                            onChange={(e) => {
                              const updated = [...editPhotos];
                              updated[index].title = e.target.value;
                              setEditPhotos(updated);
                            }}
                            placeholder="Photo Title"
                            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-2 text-zinc-200 text-xs focus:outline-none focus:border-cyan-400"
                          />
                          <input
                            type="text"
                            value={photo.url}
                            onChange={(e) => {
                              const updated = [...editPhotos];
                              updated[index].url = e.target.value;
                              setEditPhotos(updated);
                            }}
                            placeholder="Image URL or upload below (leave blank to clear)"
                            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-2 text-zinc-200 text-xs focus:outline-none focus:border-cyan-400"
                          />
                          <input
                            type="text"
                            value={photo.caption}
                            onChange={(e) => {
                              const updated = [...editPhotos];
                              updated[index].caption = e.target.value;
                              setEditPhotos(updated);
                            }}
                            placeholder="Caption / Description"
                            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-2 text-zinc-400 text-xs focus:outline-none focus:border-cyan-400"
                          />
                          <div className="flex flex-wrap items-center gap-2 pt-1">
                            <label className="px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-mono text-[10px] cursor-pointer transition flex items-center gap-1">
                              <Plus className="w-3 h-3" />
                              <span>Choose Local File</span>
                              <input 
                                type="file" 
                                accept="image/*" 
                                className="hidden" 
                                onChange={(e) => handlePhotoFileUpload(index, e)} 
                              />
                            </label>
                            {photo.url && (
                              <button
                                type="button"
                                onClick={() => handleClearPhotoUrl(index)}
                                className="px-2.5 py-1 rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/20 font-mono text-[10px] cursor-pointer transition flex items-center gap-1"
                              >
                                <Trash2 className="w-3 h-3" />
                                <span>Remove Image</span>
                              </button>
                            )}
                          </div>
                        </div>
                        <div className="relative aspect-video sm:aspect-square bg-zinc-900 rounded-xl overflow-hidden border border-zinc-800 flex items-center justify-center group">
                          {photo.url ? (
                            <>
                              <img src={photo.url} alt={photo.title} className="w-full h-full object-cover" />
                              <button
                                type="button"
                                onClick={() => handleClearPhotoUrl(index)}
                                title="Remove photo image"
                                className="absolute top-2 right-2 p-1.5 rounded-lg bg-red-600/90 hover:bg-red-500 text-white shadow-lg transition opacity-0 group-hover:opacity-100 cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          ) : (
                            <span className="text-zinc-600 text-[10px]">No image (blank)</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Tab 3: Videos Editor with Add / Remove Slots */}
              {editActiveTab === 'videos' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-purple-300">
                      Manage Video Slots ({editVideos.length} total)
                    </span>
                    <button
                      type="button"
                      onClick={handleAddVideoSlot}
                      className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-mono text-xs flex items-center gap-1 cursor-pointer transition shadow-lg shadow-purple-600/20"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Video Slot</span>
                    </button>
                  </div>

                  {editVideos.map((video, index) => (
                    <div key={`edit-video-slot-${video.id || index}-${index}`} className="p-4 bg-black rounded-2xl border border-zinc-800 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono font-bold text-purple-400">Video Slot #{index + 1}</span>
                        <div className="flex items-center gap-2">
                          {video.url && (
                            <button
                              type="button"
                              onClick={() => handleClearVideoUrl(index)}
                              className="text-amber-400 hover:text-amber-300 flex items-center gap-1 text-[11px] font-mono cursor-pointer transition px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20"
                              title="Clear video URL from this slot"
                            >
                              <X className="w-3.5 h-3.5" />
                              <span>Clear Video</span>
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleRemoveVideoSlot(index)}
                            className="text-rose-400 hover:text-rose-300 flex items-center gap-1 text-[11px] font-mono cursor-pointer transition px-2 py-0.5 rounded bg-rose-500/10 border border-rose-500/20"
                            title="Remove this video slot entirely"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Remove Slot</span>
                          </button>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <input
                          type="text"
                          value={video.title}
                          onChange={(e) => {
                            const updated = [...editVideos];
                            updated[index].title = e.target.value;
                            setEditVideos(updated);
                          }}
                          placeholder="Video Title"
                          className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-2 text-zinc-200 text-xs focus:outline-none focus:border-purple-400"
                        />
                        <input
                          type="text"
                          value={video.url}
                          onChange={(e) => {
                            const updated = [...editVideos];
                            updated[index].url = e.target.value;
                            setEditVideos(updated);
                          }}
                          placeholder="YouTube Embed URL (https://www.youtube.com/embed/...) or Direct MP4 link"
                          className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-2 text-zinc-200 text-xs focus:outline-none focus:border-purple-400"
                        />
                        <textarea
                          value={video.description}
                          onChange={(e) => {
                            const updated = [...editVideos];
                            updated[index].description = e.target.value;
                            setEditVideos(updated);
                          }}
                          placeholder="Video Description"
                          rows={2}
                          className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-2 text-zinc-300 text-xs focus:outline-none focus:border-purple-400"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {saveStatus && (
                <div className={`p-3 rounded-xl border text-xs font-mono flex items-center gap-2 ${
                  saveStatus.includes('successfully') ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200' : 'bg-cyan-950/40 border-cyan-500/40 text-cyan-200'
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
                    setEditSummary(DEFAULT_SUMMARY);
                    setEditPhotos(DEFAULT_PHOTOS);
                    setEditVideos(DEFAULT_VIDEOS);
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
                    className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-black font-bold transition cursor-pointer flex items-center gap-2 shadow-lg disabled:opacity-50 text-xs"
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

      {/* In-App Deletion Confirmation Modal (Guaranteed to work inside iframe without browser blocking) */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-zinc-950 border border-zinc-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">
                  Remove {deleteTarget.type === 'photo' ? 'Photo' : 'Video'}?
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Confirm permanent removal from gallery and Firebase.
                </p>
              </div>
            </div>

            <div className="p-3 bg-black/60 rounded-xl border border-zinc-800 text-xs font-mono text-zinc-300">
              <span className="text-zinc-500">Target:</span> <strong className="text-white">{deleteTarget.title}</strong>
            </div>

            <p className="text-xs text-zinc-400 leading-relaxed">
              This action will immediately delete this item from the hardware gallery and synchronize the change to Google Cloud Firestore.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-medium transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-lg shadow-red-600/30 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Yes, Remove {deleteTarget.type === 'photo' ? 'Photo' : 'Video'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Admin Required Sign-In Modal */}
      {showAdminRequiredModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-zinc-950 border border-amber-500/30 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
                <Lock className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">
                  Owner Authentication Required
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Sign in with verified administrator credentials.
                </p>
              </div>
            </div>

            <p className="text-xs text-zinc-300 leading-relaxed">
              To protect scientific and hardware documentation, deleting photos or videos requires signing in with an authorized administrator account.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowAdminRequiredModal(false)}
                className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-medium transition cursor-pointer"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowAdminRequiredModal(false);
                  if (onRequireSignIn) onRequireSignIn();
                }}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-slate-950 font-bold text-xs transition flex items-center gap-1.5 shadow-lg cursor-pointer"
              >
                <span>Sign In with Owner Account</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
