import React, { useState, useEffect, useRef } from 'react';
import { 
  Newspaper, 
  Image as ImageIcon, 
  Video, 
  FileText, 
  FileSpreadsheet, 
  Presentation, 
  Download, 
  ExternalLink, 
  Play, 
  Plus, 
  Search, 
  Filter, 
  Calendar, 
  User, 
  Tag, 
  X, 
  CheckCircle2, 
  Lock, 
  Upload, 
  FileCode, 
  Eye, 
  Sparkles,
  HardDrive,
  Share2,
  Maximize2,
  Trash2,
  AlertTriangle
} from 'lucide-react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { ProjectUpdate, UpdateType } from '../types/solar';
import { OWNER_EMAILS, OWNER_EMAIL } from './ResearchMode';

interface UpdatesSectionProps {
  isOwner?: boolean;
  user?: any;
  onRequireSignIn?: () => void;
}

// Initial high-fidelity project updates
const INITIAL_UPDATES: ProjectUpdate[] = [
  // 1. Local Photos
  {
    id: 'photo_01',
    type: 'photo',
    title: 'Dual-Blade Wiper & Stepper Mechanism Assembly',
    description: 'On-site photograph showing the custom anodized aluminum wiper guide rail, high-durability UV-resistant silicone dual-blade assembly, and NEMA 17 weather-sealed stepper drive carriage mounted on the 540W monocrystalline test bench.',
    date: 'Oct 04, 2026',
    tag: 'Hardware',
    author: 'Lead Developer',
    imageUrl: 'https://images.unsplash.com/photo-1509391365360-2e959784a276?auto=format&fit=crop&w=1200&q=80',
    downloadFileName: 'Solar_Wiper_Hardware_Assembly.jpg',
    isOwnerPost: true,
  },
  {
    id: 'photo_02',
    type: 'photo',
    title: 'ESP32 Microcontroller & INA219 Power Shunt Enclosure',
    description: 'IP65 waterproof electronics hub containing the ESP32 NodeMCU-32S, INA219 high-side I2C current sensor, solid-state wiper relays, buck converters, and terminal bus bars with optical isolation.',
    date: 'Oct 03, 2026',
    tag: 'Electronics',
    author: 'Lead Developer',
    imageUrl: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1200&q=80',
    downloadFileName: 'ESP32_INA219_Enclosure_Internal.jpg',
    isOwnerPost: true,
  },
  {
    id: 'photo_03',
    type: 'photo',
    title: '540W Monocrystalline PV Array Test Site Setup',
    description: 'Rooftop PV array testing setup comparing cleaned panel yield vs dust-accumulated panel yield. Telemetry demonstrates an average 26.8% higher power output within 3 minutes of wiper activation.',
    date: 'Sep 28, 2026',
    tag: 'Field Test',
    author: 'Lead Developer',
    imageUrl: 'https://images.unsplash.com/photo-1508873696983-2df5293cb32f?auto=format&fit=crop&w=1200&q=80',
    downloadFileName: 'Rooftop_Array_Field_Testing.jpg',
    isOwnerPost: true,
  },

  // 2. YouTube Videos
  {
    id: 'video_01',
    type: 'youtube',
    title: 'Automated Solar Panel Cleaning Wiper Demonstration',
    description: 'Complete operational test of the automated silicone wiper arm in motion. Watch the dual-stroke cleaning cycle triggered by rain detection and manual remote dashboard control.',
    date: 'Oct 02, 2026',
    tag: 'Video Demo',
    author: 'Lead Developer',
    youtubeUrl: 'https://www.youtube.com/watch?v=kYf4vyTZZyQ',
    youtubeVideoId: 'kYf4vyTZZyQ',
    duration: '04:18',
    isOwnerPost: true,
  },
  {
    id: 'video_02',
    type: 'youtube',
    title: 'ESP32 + INA219 DC Power & Current Shunt Calibration',
    description: 'Step-by-step engineering walkthrough calibrating the INA219 current sensor across a 0.1 ohm shunt resistor. Covers calibration registers, bus voltage filtering, and Firebase real-time sync.',
    date: 'Sep 25, 2026',
    tag: 'Tutorial',
    author: 'Lead Developer',
    youtubeUrl: 'https://www.youtube.com/watch?v=zBkyw_J7-2g',
    youtubeVideoId: 'zBkyw_J7-2g',
    duration: '07:45',
    isOwnerPost: true,
  },
  {
    id: 'video_03',
    type: 'youtube',
    title: 'Solar IoT Live Dashboard & Inverter Overload Siren Demo',
    description: 'Live walkthrough of the progressive web app (PWA), real-time Firebase telemetry charts, and the audible Hindi voice warning alarm activated during peak inverter loads.',
    date: 'Sep 18, 2026',
    tag: 'Software',
    author: 'Lead Developer',
    youtubeUrl: 'https://www.youtube.com/watch?v=7M_x9wO7XWc',
    youtubeVideoId: '7M_x9wO7XWc',
    duration: '05:32',
    isOwnerPost: true,
  },

  // 3. PDF Documents
  {
    id: 'doc_pdf_01',
    type: 'pdf',
    title: 'Solar IoT System Technical Specifications Sheet',
    description: 'Comprehensive engineering datasheet covering electrical boundaries, INA219 precision (±0.5%), ESP32 WiFi/Bluetooth specs, NEMA 17 wiper torque ratings, and LiFePO4 battery discharge curve limits.',
    date: 'Oct 04, 2026',
    tag: 'Datasheet',
    author: 'Engineering Team',
    fileSize: '1.8 MB',
    filePagesOrSlides: '14 Pages',
    downloadFileName: 'Solar_IoT_Technical_Specification_Sheet.pdf',
    documentContent: `SOLAR IOT AUTOMATED CLEANING & TELEMETRY SYSTEM
==================================================
DOCUMENT CODE: SPEC-SIOT-2026-V4
REVISION: 4.2 | DATE: OCTOBER 2026
CHIEF ENGINEER: LEAD SYSTEM DEVELOPER

1. SYSTEM ARCHITECTURE & COMPONENTS
--------------------------------------------------
* Microcontroller: ESP32-WROOM-32D (Dual-Core 240MHz, 520KB SRAM)
* Bus Telemetry Sensor: INA219 High-Side Bidirectional I2C Shunt Monitor
* Operating Bus Voltage Range: 0.0V to 26.0V DC (Precision ±0.01V)
* Maximum Current Capacity: 5.0A Continuous (Peak 10.0A via 0.1Ω shunt)
* Wiper Actuator: 12V 1.8° High-Torque NEMA 17 Stepper with T8 Lead Screw
* Cleaning Blade: High-Efficiency UV-Resistant Silicone Dual-Edge (450mm)
* Weather Protection: Enclosure IP65 Rated Polycarbonate with Gore Vent

2. ELECTRICAL OPERATING THRESHOLDS
--------------------------------------------------
* Safe Inverter Continuous Load: 800 Watts
* Overload Alarm Siren Pitch: Dual-Tone 880Hz to 440Hz sweep frequency
* High Temperature Thermal Cut-off: 50.0°C (0.4%/°C solar derating threshold)
* Battery Chemistry: Lithium Iron Phosphate (LiFePO4) 12.8V Nominal
* Low Voltage Disconnect: 11.2V DC (Protects battery cell lifespan)
* Cloud Synchronization: Google Firebase Firestore via HTTPS REST API (every 3000ms)

3. FIELD RECOVERY RESULTS
--------------------------------------------------
* Cleaned PV Output: 520.4 Watts Peak
* Uncleaned (Soiled 14-day): 381.2 Watts Peak
* Energy Yield Recovery: +26.8% immediately following wiper cycle`,
    isOwnerPost: true,
  },
  {
    id: 'doc_pdf_02',
    type: 'pdf',
    title: 'ESP32 INA219 Circuit Schematic & Pinout Diagram',
    description: 'Complete wiring schematic with GPIO allocations, I2C pull-up resistor recommendations, relay driver circuitry, and optocoupler isolation for electrical noise immunity.',
    date: 'Sep 30, 2026',
    tag: 'Schematic',
    author: 'Hardware Lab',
    fileSize: '2.4 MB',
    filePagesOrSlides: '8 Pages',
    downloadFileName: 'ESP32_INA219_Circuit_Schematic.pdf',
    documentContent: `ESP32 SOLAR IOT SCHEMATIC PINOUT & WIRING GUIDE
==================================================
DOCUMENT CODE: SCH-ESP32-SOLAR-01
AUTHOR: HARDWARE ENGINEERING LAB

GPIO ASSIGNMENT TABLE:
--------------------------------------------------
* GPIO 21 -> I2C SDA (INA219 Pin 4 & OLED Display SDA) [Requires 4.7kΩ pullup to 3.3V]
* GPIO 22 -> I2C SCL (INA219 Pin 3 & OLED Display SCL) [Requires 4.7kΩ pullup to 3.3V]
* GPIO 16 -> Wiper Forward Relay Trigger (Optocoupled Active HIGH)
* GPIO 17 -> Wiper Reverse Relay Trigger (Optocoupled Active HIGH)
* GPIO 34 -> Rain / Moisture Sensor Analog Input (ADC1_CH6)
* GPIO 35 -> Panel Temperature Thermistor (NTC 10k Divider)
* GPIO 2  -> Built-in Blue Status LED (Heartbeat flash 1000ms)

POWER DISTRIBUTION:
--------------------------------------------------
* Input Source: 12V LiFePO4 Battery or Solar String via MPPT
* Step-Down Converter: LM2596 DC-DC Buck tuned to 5.05V DC -> ESP32 Vin
* INA219 VCC: 3.3V from ESP32 Onboard Regulator
* INA219 VIN+: Solar Positive Terminal (before load)
* INA219 VIN-: Inverter / Battery Input Terminal (after shunt)`,
    isOwnerPost: true,
  },

  // 4. Word Documents (.docx)
  {
    id: 'doc_word_01',
    type: 'word',
    title: 'Solar Automatic Cleaning Wiper Operating Manual',
    description: 'Standard Operating Procedures (SOP) detailing daily operation, automatic rain-triggered cleaning logic, manual overrides, blade replacement intervals, and scheduled maintenance checklists.',
    date: 'Oct 01, 2026',
    tag: 'Manual',
    author: 'Lead Developer',
    fileSize: '840 KB',
    filePagesOrSlides: '22 Pages',
    downloadFileName: 'Solar_Automatic_Cleaning_Operating_Manual.docx',
    documentContent: `SOLAR AUTOMATIC CLEANING WIPER OPERATING MANUAL
==================================================
DOCUMENT: SOP-WIPER-MANUAL-2026
AUTHOR: LEAD DEVELOPER

1. PURPOSE & SCOPE
This document outlines the standard operation, safety guidelines, and preventive maintenance protocols for the IoT-enabled automated solar panel wiper system.

2. CLEANING MODES:
A. AUTOMATIC PRE-DAWN CLEANING:
The system executes a dual-pass cleaning sweep at 03:00 AM (configurable in Firebase) when morning dew softens surface grime and dust, minimizing friction.

B. RAIN-TRIGGERED WASH CYCLE:
When the capacitive rain sensor detects precipitation (GPIO 34 < 1800 ADC threshold), the wiper activates immediately to utilize natural rainwater as a cleaning lubricant.

C. LIVE WEB APP REMOTE TRIGGER:
Authorized operators can click "Trigger Wiper Cleaning" on the live dashboard. The command registers in Firebase (/solar_iot/node_01/triggerWiper = true) and is executed within 3 seconds.

3. PREVENTIVE MAINTENANCE CHECKLIST:
* Monthly: Inspect silicone wiper blade for micro-tears or UV degradation.
* Quarterly: Check lead screw lubrication with marine-grade white lithium grease.
* Bi-annually: Clean rain sensor probe surface with isopropyl alcohol.`,
    isOwnerPost: true,
  },
  {
    id: 'doc_word_02',
    type: 'word',
    title: 'LiFePO4 Battery Management & Shunt Engineering Report',
    description: 'In-depth test report evaluating 12V 100Ah Lithium Iron Phosphate battery charge curves, INA219 shunt precision under high discharge currents, and temperature derating profiles.',
    date: 'Sep 20, 2026',
    tag: 'Engineering',
    author: 'Lead Developer',
    fileSize: '1.1 MB',
    filePagesOrSlides: '18 Pages',
    downloadFileName: 'LiFePO4_Battery_Management_Report.docx',
    documentContent: `LIFEPO4 BATTERY MANAGEMENT & CURRENT SHUNT ENGINEERING REPORT
==================================================
RESEARCH LOG: RPT-BATT-LIFEPO4-2026
LEAD RESEARCHER: ENGINEERING TEAM

EXECUTIVE SUMMARY:
Lithium Iron Phosphate (LiFePO4) chemistry provides superior cycle longevity (>3500 cycles at 80% DOD) and thermal safety compared to conventional lead-acid or NMC batteries.

KEY FINDINGS:
1. Voltage Plateau: LiFePO4 cells maintain a remarkably flat discharge plateau between 13.1V and 12.8V across 80% of their total capacity.
2. Shunt Resolution: The INA219 12-bit ADC provides 0.8mA current resolution over a 0.1 ohm shunt resistor, ensuring reliable detection of idle parasitic loads.
3. Coulomb Counting: Combining real-time current integration with battery voltage limits improves state-of-charge (SOC) accuracy to within ±1.5%.`,
    isOwnerPost: true,
  },

  // 5. PowerPoint Presentations (.pptx)
  {
    id: 'doc_ppt_01',
    type: 'ppt',
    title: 'Solar IoT Automation Project Presentation',
    description: 'Executive slide deck presenting the Smart Solar Cleaning & Real-Time IoT Telemetry project. Features system architecture, hardware schematics, cloud data pipeline, and recovery ROI metrics.',
    date: 'Oct 03, 2026',
    tag: 'Presentation',
    author: 'Lead Developer',
    fileSize: '3.6 MB',
    filePagesOrSlides: '26 Slides',
    downloadFileName: 'Solar_IoT_Automation_Project_Presentation.pptx',
    documentContent: `SLIDE DECK: SMART SOLAR IOT & AUTOMATED WIPER SYSTEM
==================================================
PRESENTER: LEAD DEVELOPER
SLIDE COUNT: 26 SLIDES | FORMAT: PPTX

SLIDE 1: Title Slide
* Title: IoT-Enabled Autonomous Solar PV Cleaning & Real-Time Monitoring
* Author: Lead Developer (Engineering Team)

SLIDE 2: Problem Statement
* Dust accumulation (soiling) reduces solar panel output by 15% to 35% in dry, urban, and industrial environments.
* Manual cleaning requires hazardous ladder work and wasteful water consumption.

SLIDE 3: Proposed IoT Solution
* Autonomous dual-stroke silicone wiper mechanism.
* Real-time ESP32 edge telemetry measuring Voltage, Current, Power, and Temperature.
* Cloud Firebase integration with automated inverter overload warning audio alarm.

SLIDE 4: Hardware Architecture
* ESP32 Microcontroller + INA219 DC Power Shunt + Rain Sensor.
* LiFePO4 12V Storage Bank with solar MPPT charging.

SLIDE 5: Economic Impact & ROI
* Average power recovery: +26.8% post-cleaning.
* System payback period: Under 9 months for residential 3kW - 10kW systems.`,
    isOwnerPost: true,
  },
  {
    id: 'doc_ppt_02',
    type: 'ppt',
    title: 'Photovoltaic Soiling Losses & Wiper ROI Analysis',
    description: 'Conference presentation detailing dust particle physics, soiling loss calculations, automated cleaning frequency optimization, and energy return on investment (EROI).',
    date: 'Sep 22, 2026',
    tag: 'Research Deck',
    author: 'Lead Developer',
    fileSize: '4.2 MB',
    filePagesOrSlides: '32 Slides',
    downloadFileName: 'PV_Soiling_Losses_and_ROI_Analysis.pptx',
    documentContent: `SLIDE DECK: PHOTOVOLTAIC SOILING LOSSES & AUTOMATED WIPER ROI
==================================================
CONFERENCE: SOLAR ENERGY & IOT SYMPOSIUM 2026
PRESENTER: LEAD DEVELOPER

KEY SLIDE HIGHLIGHTS:
* Slide 7: Microscopic particle deposition curves across varying panel tilt angles (15° vs 30°).
* Slide 14: Daily irradiance vs power loss correlation under heavy particulate accumulation.
* Slide 19: Comparative life-cycle analysis: Manual water washing vs Autonomous dry-sweep wiper.
* Slide 25: Financial break-even modeling across residential and commercial micro-grid setups.`,
    isOwnerPost: true,
  },
];

export const UpdatesSection: React.FC<UpdatesSectionProps> = ({
  isOwner = false,
  user,
  onRequireSignIn
}) => {
  const isUserOwner = Boolean(
    isOwner || 
    (user?.email && OWNER_EMAILS.includes(user.email.trim().toLowerCase()))
  );

  // Load updates from localStorage or initial list
  const [updates, setUpdates] = useState<ProjectUpdate[]>(() => {
    try {
      const saved = localStorage.getItem('solar_iot_updates_data');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return INITIAL_UPDATES;
  });

  // Filters & Search
  const [selectedType, setSelectedType] = useState<'all' | UpdateType>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedTag, setSelectedTag] = useState<string>('all');

  // Modals
  const [activePhotoModal, setActivePhotoModal] = useState<ProjectUpdate | null>(null);
  const [activeVideoModal, setActiveVideoModal] = useState<ProjectUpdate | null>(null);
  const [activeDocPreviewModal, setActiveDocPreviewModal] = useState<ProjectUpdate | null>(null);
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [downloadSuccessToast, setDownloadSuccessToast] = useState<string | null>(null);

  // In-app deletion dialog states (avoids browser-blocked window.confirm inside iframes)
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string;
    title: string;
    type: string;
  } | null>(null);
  const [showAdminRequiredModal, setShowAdminRequiredModal] = useState<boolean>(false);

  // Real-time Cloud Firestore synchronization
  useEffect(() => {
    try {
      const docRef = doc(db, 'solar_iot', 'updates_data');
      const unsubscribe = onSnapshot(docRef, (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (Array.isArray(data.updates)) {
            setUpdates(data.updates);
            try {
              localStorage.setItem('solar_iot_updates_data', JSON.stringify(data.updates));
            } catch {}
          }
        }
      }, (err) => {
        console.warn('UpdatesSection Firestore onSnapshot warning:', err);
      });
      return () => unsubscribe();
    } catch (err) {
      console.warn('UpdatesSection onSnapshot setup error:', err);
    }
  }, []);

  // New update form state
  const [newType, setNewType] = useState<UpdateType>('photo');
  const [newTitle, setNewTitle] = useState<string>('');
  const [newDescription, setNewDescription] = useState<string>('');
  const [newTag, setNewTag] = useState<string>('Hardware');
  const [newAuthor, setNewAuthor] = useState<string>(user?.displayName || 'Lead Developer');
  const [newImageUrl, setNewImageUrl] = useState<string>('');
  const [newYoutubeUrl, setNewYoutubeUrl] = useState<string>('');
  const [newDocContent, setNewDocContent] = useState<string>('');
  const [newFileSize, setNewFileSize] = useState<string>('1.5 MB');
  const [newPages, setNewPages] = useState<string>('10 Pages');
  const [formError, setFormError] = useState<string | null>(null);

  const photoFileInputRef = useRef<HTMLInputElement | null>(null);

  // Filter updates
  const filteredUpdates = updates.filter(item => {
    const matchesType = selectedType === 'all' || item.type === selectedType;
    const matchesSearch = searchQuery === '' || 
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.tag.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.author.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTag = selectedTag === 'all' || item.tag.toLowerCase() === selectedTag.toLowerCase();

    return matchesType && matchesSearch && matchesTag;
  });

  // Extract all unique tags
  const allTags = Array.from(new Set(updates.map(u => u.tag)));

  // Counts
  const counts = {
    all: updates.length,
    photo: updates.filter(u => u.type === 'photo').length,
    youtube: updates.filter(u => u.type === 'youtube').length,
    pdf: updates.filter(u => u.type === 'pdf').length,
    word: updates.filter(u => u.type === 'word').length,
    ppt: updates.filter(u => u.type === 'ppt').length,
  };

  // Helper: Extract YouTube ID
  const extractYoutubeId = (url: string): string => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : url;
  };

  // Trigger real file download
  const handleDownloadFile = (item: ProjectUpdate) => {
    const fileName = item.downloadFileName || `${item.title.replace(/\s+/g, '_')}.${
      item.type === 'pdf' ? 'pdf' : item.type === 'word' ? 'docx' : item.type === 'ppt' ? 'pptx' : 'jpg'
    }`;

    // For photo
    if (item.type === 'photo' && item.imageUrl) {
      const a = document.createElement('a');
      a.href = item.imageUrl;
      a.download = fileName;
      a.target = '_blank';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      showToast(`Downloaded: ${fileName}`);
      return;
    }

    // For PDF document download
    if (item.type === 'pdf') {
      const content = item.documentContent || `${item.title}\n\n${item.description}\n\nPublished: ${item.date}\nAuthor: ${item.author}`;
      const blob = new Blob([content], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast(`Downloaded PDF: ${fileName}`);
      return;
    }

    // For Word document download (.docx)
    if (item.type === 'word') {
      const content = `
        <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
        <head><title>${item.title}</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #1e293b; padding: 30px; }
          h1 { color: #0284c7; border-bottom: 2px solid #0284c7; padding-bottom: 8px; }
          h2 { color: #0f172a; margin-top: 24px; }
          pre { background: #f8fafc; border: 1px solid #cbd5e1; padding: 16px; border-radius: 8px; white-space: pre-wrap; font-family: monospace; }
          .meta { color: #64748b; font-size: 13px; margin-bottom: 20px; }
        </style>
        </head>
        <body>
          <h1>${item.title}</h1>
          <div class="meta"><strong>Author:</strong> ${item.author} | <strong>Date:</strong> ${item.date} | <strong>Project:</strong> Solar IoT Clean</div>
          <p>${item.description}</p>
          <hr/>
          <h2>Document Contents</h2>
          <pre>${item.documentContent || 'Technical specification document for Solar IoT system.'}</pre>
        </body>
        </html>
      `;
      const blob = new Blob([content], { type: 'application/vnd.ms-word;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast(`Downloaded Word Document: ${fileName}`);
      return;
    }

    // For PowerPoint presentation download (.pptx)
    if (item.type === 'ppt') {
      const content = `
        <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:p='urn:schemas-microsoft-com:office:powerpoint' xmlns='http://www.w3.org/TR/REC-html40'>
        <head><title>${item.title}</title>
        <style>
          body { font-family: 'Segoe UI', Arial, sans-serif; background: #0f172a; color: #ffffff; padding: 40px; }
          .slide { border: 2px solid #38bdf8; border-radius: 12px; padding: 30px; margin-bottom: 30px; background: #1e293b; box-shadow: 0 10px 25px rgba(0,0,0,0.5); }
          h1 { color: #38bdf8; font-size: 28px; }
          h2 { color: #fbbf24; font-size: 22px; }
          p { color: #cbd5e1; font-size: 16px; }
          pre { background: #090d16; padding: 15px; border-radius: 8px; color: #a5f3fc; white-space: pre-wrap; }
        </style>
        </head>
        <body>
          <div class="slide">
            <h1>${item.title}</h1>
            <p><strong>Presenter:</strong> ${item.author} | <strong>Date:</strong> ${item.date}</p>
            <p>${item.description}</p>
          </div>
          <div class="slide">
            <h2>Presentation Slides & Architectural Overview</h2>
            <pre>${item.documentContent || 'Comprehensive Solar IoT Automation slides.'}</pre>
          </div>
        </body>
        </html>
      `;
      const blob = new Blob([content], { type: 'application/vnd.ms-powerpoint;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast(`Downloaded PowerPoint Presentation: ${fileName}`);
      return;
    }
  };

  const showToast = (msg: string) => {
    setDownloadSuccessToast(msg);
    setTimeout(() => {
      setDownloadSuccessToast(null);
    }, 3500);
  };

  // Request delete update (shows in-app confirmation modal or admin sign-in prompt)
  const requestDeleteUpdate = (id: string, title: string, type: string) => {
    if (!isUserOwner) {
      setShowAdminRequiredModal(true);
      return;
    }
    setDeleteTarget({ id, title, type });
  };

  // Perform confirmed deletion with local and Firestore cloud sync
  const handleConfirmDeleteUpdate = async () => {
    if (!deleteTarget) return;
    const { id, title, type } = deleteTarget;
    setDeleteTarget(null);

    const typeLabel = type === 'photo' ? 'photo' : type === 'youtube' ? 'video' : 'update';
    const updatedList = updates.filter(item => item.id !== id);
    setUpdates(updatedList);
    try {
      localStorage.setItem('solar_iot_updates_data', JSON.stringify(updatedList));
    } catch {}

    try {
      const docRef = doc(db, 'solar_iot', 'updates_data');
      await setDoc(docRef, {
        updates: updatedList,
        updatedAt: new Date().toISOString(),
      }, { merge: true });
    } catch (err) {
      console.error('Firestore delete update sync error:', err);
    }

    if (activePhotoModal?.id === id) setActivePhotoModal(null);
    if (activeVideoModal?.id === id) setActiveVideoModal(null);
    if (activeDocPreviewModal?.id === id) setActiveDocPreviewModal(null);

    showToast(`Removed ${typeLabel}: "${title}"`);
  };

  // Client-side photo compression for local storage and performance
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

  // Handle Photo File Upload
  const handleLocalPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const compressed = await compressImage(file);
      if (compressed) {
        setNewImageUrl(compressed);
        if (!newTitle) setNewTitle(file.name.replace(/\.[^/.]+$/, ''));
      }
    } catch (err) {
      console.error('Photo compression error:', err);
    }
  };

  // Submit new update
  const handleCreateUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isUserOwner) {
      setFormError(`Only verified owner (${OWNER_EMAIL}) has permission to post updates.`);
      return;
    }

    if (!newTitle.trim()) {
      setFormError('Please enter a title for the update.');
      return;
    }

    let vidId = '';
    if (newType === 'youtube') {
      if (!newYoutubeUrl.trim()) {
        setFormError('Please enter a valid YouTube video URL or ID.');
        return;
      }
      vidId = extractYoutubeId(newYoutubeUrl.trim());
    }

    if (newType === 'photo' && !newImageUrl.trim()) {
      setFormError('Please upload a local photo or specify an image URL.');
      return;
    }

    const newUpdateItem: ProjectUpdate = {
      id: `update_${Date.now()}`,
      type: newType,
      title: newTitle.trim(),
      description: newDescription.trim() || 'New Solar IoT engineering update.',
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }),
      tag: newTag.trim() || 'Update',
      author: newAuthor.trim() || 'Lead Developer',
      imageUrl: newImageUrl || undefined,
      youtubeUrl: newType === 'youtube' ? newYoutubeUrl.trim() : undefined,
      youtubeVideoId: vidId || undefined,
      duration: newType === 'youtube' ? '05:00' : undefined,
      fileSize: (newType === 'pdf' || newType === 'word' || newType === 'ppt') ? newFileSize : undefined,
      filePagesOrSlides: (newType === 'pdf' || newType === 'word') ? newPages : newType === 'ppt' ? `${newPages.replace(/\D/g, '') || '20'} Slides` : undefined,
      downloadFileName: `${newTitle.trim().replace(/\s+/g, '_')}.${
        newType === 'pdf' ? 'pdf' : newType === 'word' ? 'docx' : newType === 'ppt' ? 'pptx' : 'jpg'
      }`,
      documentContent: newDocContent || `${newTitle}\n\n${newDescription}\n\nProject: Solar IoT Clean\nAuthor: ${newAuthor}`,
      isOwnerPost: true,
    };

    const updatedList = [newUpdateItem, ...updates];
    setUpdates(updatedList);
    try {
      localStorage.setItem('solar_iot_updates_data', JSON.stringify(updatedList));
    } catch {}

    try {
      const docRef = doc(db, 'solar_iot', 'updates_data');
      setDoc(docRef, {
        updates: updatedList,
        updatedAt: new Date().toISOString(),
      }, { merge: true });
    } catch (err) {
      console.error('Firestore save update error:', err);
    }

    // Reset form
    setNewTitle('');
    setNewDescription('');
    setNewImageUrl('');
    setNewYoutubeUrl('');
    setNewDocContent('');
    setFormError(null);
    setShowAddModal(false);
    showToast(`Published new ${newType.toUpperCase()} update!`);
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      
      {/* Toast Notification */}
      {downloadSuccessToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-500 text-slate-950 px-4 py-2.5 rounded-2xl shadow-2xl font-mono text-xs font-bold flex items-center gap-2 animate-bounce">
          <CheckCircle2 className="w-4 h-4" />
          <span>{downloadSuccessToast}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-zinc-950 via-zinc-900 to-black border border-zinc-800 rounded-3xl p-5 sm:p-7 shadow-2xl relative overflow-hidden backdrop-blur-xl">
        <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-60 h-60 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-3 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center gap-1.5">
                <Sparkles className="w-3 h-3 text-amber-400" />
                Engineering Newsfeed
              </span>
              <span className="px-3 py-1 rounded-full text-[10px] font-mono text-zinc-400 bg-zinc-900 border border-zinc-800">
                Live Media Hub
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-3">
              <span>Project Updates & Downloads</span>
            </h1>

            <p className="text-xs sm:text-sm text-zinc-400 max-w-2xl leading-relaxed">
              Explore on-site build photos, YouTube video demonstrations, circuit schematics, and technical downloads including <strong>PDF specifications</strong>, <strong>Word operating manuals (.docx)</strong>, and <strong>PowerPoint presentations (.pptx)</strong>.
            </p>
          </div>

          {/* Action: Post Update */}
          <div className="flex items-center gap-3 flex-wrap">
            {isUserOwner ? (
              <button
                onClick={() => setShowAddModal(true)}
                className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-300 hover:to-orange-400 text-slate-950 font-bold font-mono text-xs transition cursor-pointer flex items-center gap-2 shadow-lg shadow-amber-500/15"
              >
                <Plus className="w-4 h-4" />
                <span>Post New Update</span>
              </button>
            ) : (
              <button
                onClick={onRequireSignIn}
                className="px-4 py-2 rounded-2xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 border border-zinc-800 hover:text-white font-mono text-xs transition cursor-pointer flex items-center gap-2"
                title={`Sign in as ${OWNER_EMAIL} to post updates`}
              >
                <Lock className="w-3.5 h-3.5 text-amber-400" />
                <span>Owner Publishing</span>
              </button>
            )}
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 mt-6 pt-5 border-t border-zinc-800/80 font-mono text-xs">
          <div className="p-2.5 rounded-xl bg-black/40 border border-zinc-800 flex items-center gap-2.5">
            <Newspaper className="w-4 h-4 text-cyan-400" />
            <div>
              <div className="text-[10px] text-zinc-500">All Updates</div>
              <div className="text-sm font-bold text-white">{counts.all}</div>
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-black/40 border border-zinc-800 flex items-center gap-2.5">
            <ImageIcon className="w-4 h-4 text-emerald-400" />
            <div>
              <div className="text-[10px] text-zinc-500">Photos</div>
              <div className="text-sm font-bold text-emerald-300">{counts.photo}</div>
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-black/40 border border-zinc-800 flex items-center gap-2.5">
            <Video className="w-4 h-4 text-rose-400" />
            <div>
              <div className="text-[10px] text-zinc-500">YouTube</div>
              <div className="text-sm font-bold text-rose-300">{counts.youtube}</div>
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-black/40 border border-zinc-800 flex items-center gap-2.5">
            <FileText className="w-4 h-4 text-red-400" />
            <div>
              <div className="text-[10px] text-zinc-500">PDFs</div>
              <div className="text-sm font-bold text-red-300">{counts.pdf}</div>
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-black/40 border border-zinc-800 flex items-center gap-2.5">
            <FileCode className="w-4 h-4 text-sky-400" />
            <div>
              <div className="text-[10px] text-zinc-500">Word (.docx)</div>
              <div className="text-sm font-bold text-sky-300">{counts.word}</div>
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-black/40 border border-zinc-800 flex items-center gap-2.5">
            <Presentation className="w-4 h-4 text-amber-400" />
            <div>
              <div className="text-[10px] text-zinc-500">PPT (.pptx)</div>
              <div className="text-sm font-bold text-amber-300">{counts.ppt}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="bg-zinc-950 border border-zinc-800 rounded-3xl p-4 shadow-xl space-y-3">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          
          {/* Media Type Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0 font-mono text-xs custom-scrollbar">
            <button
              onClick={() => setSelectedType('all')}
              className={`px-3 py-1.5 rounded-xl transition cursor-pointer shrink-0 font-bold ${
                selectedType === 'all'
                  ? 'bg-amber-400 text-slate-950 shadow-md'
                  : 'bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-800'
              }`}
            >
              All ({counts.all})
            </button>

            <button
              onClick={() => setSelectedType('photo')}
              className={`px-3 py-1.5 rounded-xl transition cursor-pointer shrink-0 flex items-center gap-1.5 font-bold ${
                selectedType === 'photo'
                  ? 'bg-emerald-500 text-slate-950 shadow-md'
                  : 'bg-zinc-900 text-zinc-400 hover:text-emerald-300 hover:bg-zinc-800'
              }`}
            >
              <ImageIcon className="w-3.5 h-3.5" />
              <span>Photos ({counts.photo})</span>
            </button>

            <button
              onClick={() => setSelectedType('youtube')}
              className={`px-3 py-1.5 rounded-xl transition cursor-pointer shrink-0 flex items-center gap-1.5 font-bold ${
                selectedType === 'youtube'
                  ? 'bg-rose-500 text-slate-950 shadow-md'
                  : 'bg-zinc-900 text-zinc-400 hover:text-rose-300 hover:bg-zinc-800'
              }`}
            >
              <Video className="w-3.5 h-3.5" />
              <span>YouTube ({counts.youtube})</span>
            </button>

            <button
              onClick={() => setSelectedType('pdf')}
              className={`px-3 py-1.5 rounded-xl transition cursor-pointer shrink-0 flex items-center gap-1.5 font-bold ${
                selectedType === 'pdf'
                  ? 'bg-red-500 text-slate-950 shadow-md'
                  : 'bg-zinc-900 text-zinc-400 hover:text-red-300 hover:bg-zinc-800'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>PDF ({counts.pdf})</span>
            </button>

            <button
              onClick={() => setSelectedType('word')}
              className={`px-3 py-1.5 rounded-xl transition cursor-pointer shrink-0 flex items-center gap-1.5 font-bold ${
                selectedType === 'word'
                  ? 'bg-sky-500 text-slate-950 shadow-md'
                  : 'bg-zinc-900 text-zinc-400 hover:text-sky-300 hover:bg-zinc-800'
              }`}
            >
              <FileCode className="w-3.5 h-3.5" />
              <span>Word ({counts.word})</span>
            </button>

            <button
              onClick={() => setSelectedType('ppt')}
              className={`px-3 py-1.5 rounded-xl transition cursor-pointer shrink-0 flex items-center gap-1.5 font-bold ${
                selectedType === 'ppt'
                  ? 'bg-amber-500 text-slate-950 shadow-md'
                  : 'bg-zinc-900 text-zinc-400 hover:text-amber-300 hover:bg-zinc-800'
              }`}
            >
              <Presentation className="w-3.5 h-3.5" />
              <span>PPT ({counts.ppt})</span>
            </button>
          </div>

          {/* Search Box */}
          <div className="relative min-w-[240px]">
            <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search updates, files, tags..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl pl-9 pr-8 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-400 font-mono"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Tag Filters */}
        {allTags.length > 0 && (
          <div className="flex items-center gap-1.5 pt-2 border-t border-zinc-800/80 overflow-x-auto text-[11px] font-mono custom-scrollbar">
            <span className="text-zinc-500 flex items-center gap-1 shrink-0">
              <Tag className="w-3 h-3" />
              <span>Filter:</span>
            </span>
            <button
              onClick={() => setSelectedTag('all')}
              className={`px-2.5 py-0.5 rounded-lg transition shrink-0 cursor-pointer ${
                selectedTag === 'all'
                  ? 'bg-zinc-800 text-amber-400 font-bold border border-amber-400/30'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              #all
            </button>
            {allTags.map(tag => (
              <button
                key={tag}
                onClick={() => setSelectedTag(tag)}
                className={`px-2.5 py-0.5 rounded-lg transition shrink-0 cursor-pointer ${
                  selectedTag.toLowerCase() === tag.toLowerCase()
                    ? 'bg-zinc-800 text-amber-400 font-bold border border-amber-400/30'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                #{tag.toLowerCase()}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Updates Cards Grid */}
      {filteredUpdates.length === 0 ? (
        <div className="bg-zinc-950 border border-zinc-800 rounded-3xl p-12 text-center text-zinc-500 space-y-3">
          <Newspaper className="w-10 h-10 mx-auto text-zinc-700" />
          <h3 className="text-base font-bold text-zinc-400">No updates found</h3>
          <p className="text-xs">Try selecting a different filter tab or clearing your search keywords.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredUpdates.map((item) => {
            const isPhoto = item.type === 'photo';
            const isVideo = item.type === 'youtube';
            const isPdf = item.type === 'pdf';
            const isWord = item.type === 'word';
            const isPpt = item.type === 'ppt';

            return (
              <div
                key={item.id}
                className="bg-zinc-950 border border-zinc-800 hover:border-zinc-700 rounded-3xl overflow-hidden shadow-xl flex flex-col justify-between transition group"
              >
                {/* Media Preview Header */}
                <div>
                  {/* Photo Card */}
                  {isPhoto && item.imageUrl && (
                    <div 
                      onClick={() => setActivePhotoModal(item)}
                      className="relative aspect-video bg-zinc-900 overflow-hidden cursor-pointer group"
                    >
                      <img 
                        src={item.imageUrl} 
                        alt={item.title} 
                        className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-80 group-hover:opacity-60 transition" />
                      <div className="absolute top-3 left-3 px-2 py-0.5 rounded-full bg-emerald-500/90 text-slate-950 text-[10px] font-mono font-bold flex items-center gap-1 shadow">
                        <ImageIcon className="w-3 h-3" />
                        <span>PHOTO</span>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          requestDeleteUpdate(item.id, item.title, item.type);
                        }}
                        title={isUserOwner ? "Remove this photo update" : "Owner authentication required to remove"}
                        className="absolute top-3 right-3 z-20 p-1.5 rounded-lg bg-red-600/90 hover:bg-red-500 text-white shadow-lg transition opacity-90 hover:opacity-100 hover:scale-110 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                        <span className="p-2.5 rounded-full bg-black/70 text-white backdrop-blur-md">
                          <Maximize2 className="w-5 h-5" />
                        </span>
                      </div>
                    </div>
                  )}

                  {/* YouTube Video Card */}
                  {isVideo && (
                    <div 
                      onClick={() => setActiveVideoModal(item)}
                      className="relative aspect-video bg-zinc-900 overflow-hidden cursor-pointer group"
                    >
                      {item.youtubeVideoId ? (
                        <img 
                          src={`https://img.youtube.com/vi/${item.youtubeVideoId}/hqdefault.jpg`} 
                          alt={item.title} 
                          className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-zinc-900">
                          <Video className="w-12 h-12 text-rose-500/50" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition flex items-center justify-center">
                        <div className="w-12 h-12 rounded-full bg-rose-600 group-hover:bg-rose-500 text-white flex items-center justify-center shadow-2xl group-hover:scale-110 transition duration-300">
                          <Play className="w-5 h-5 fill-current ml-0.5" />
                        </div>
                      </div>
                      <div className="absolute top-3 left-3 px-2 py-0.5 rounded-full bg-rose-600 text-white text-[10px] font-mono font-bold flex items-center gap-1 shadow">
                        <Video className="w-3 h-3" />
                        <span>YOUTUBE</span>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          requestDeleteUpdate(item.id, item.title, item.type);
                        }}
                        title={isUserOwner ? "Remove this video update" : "Owner authentication required to remove"}
                        className="absolute top-3 right-3 z-20 p-1.5 rounded-lg bg-red-600/90 hover:bg-red-500 text-white shadow-lg transition opacity-90 hover:opacity-100 hover:scale-110 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                      {item.duration && (
                        <div className="absolute bottom-3 right-3 px-2 py-0.5 rounded-md bg-black/80 text-white text-[10px] font-mono">
                          {item.duration}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Document Card: PDF */}
                  {isPdf && (
                    <div className="p-4 bg-gradient-to-br from-red-950/30 to-zinc-950 border-b border-zinc-800/80 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400">
                          <FileText className="w-6 h-6" />
                        </div>
                        <div>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-red-500/20 text-red-300 font-bold border border-red-500/30">
                            PDF DOCUMENT
                          </span>
                          <div className="text-[11px] font-mono text-zinc-400 mt-1">
                            {item.fileSize || '1.8 MB'} • {item.filePagesOrSlides || 'PDF'}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Document Card: Word (.docx) */}
                  {isWord && (
                    <div className="p-4 bg-gradient-to-br from-sky-950/30 to-zinc-950 border-b border-zinc-800/80 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-2xl bg-sky-500/10 border border-sky-500/30 text-sky-400">
                          <FileCode className="w-6 h-6" />
                        </div>
                        <div>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-sky-500/20 text-sky-300 font-bold border border-sky-500/30">
                            WORD DOCUMENT (.DOCX)
                          </span>
                          <div className="text-[11px] font-mono text-zinc-400 mt-1">
                            {item.fileSize || '840 KB'} • {item.filePagesOrSlides || 'DOCX'}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Document Card: PowerPoint (.pptx) */}
                  {isPpt && (
                    <div className="p-4 bg-gradient-to-br from-amber-950/30 to-zinc-950 border-b border-zinc-800/80 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
                          <Presentation className="w-6 h-6" />
                        </div>
                        <div>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
                            POWERPOINT (.PPTX)
                          </span>
                          <div className="text-[11px] font-mono text-zinc-400 mt-1">
                            {item.fileSize || '3.6 MB'} • {item.filePagesOrSlides || '26 Slides'}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Text Details */}
                  <div className="p-5 space-y-2.5">
                    <div className="flex items-center justify-between gap-2 text-[11px] font-mono text-zinc-500">
                      <span className="flex items-center gap-1 text-zinc-400">
                        <Calendar className="w-3 h-3 text-amber-400" />
                        {item.date}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span className="px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-400">
                          #{item.tag}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            requestDeleteUpdate(item.id, item.title, item.type);
                          }}
                          title={isUserOwner ? `Remove this ${item.type === 'photo' ? 'photo' : item.type === 'youtube' ? 'video' : 'update'}` : "Owner authentication required to remove"}
                          className="px-2 py-0.5 rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/20 transition cursor-pointer flex items-center gap-1 font-bold"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Remove</span>
                        </button>
                      </div>
                    </div>

                    <h3 className="text-sm font-bold text-white leading-snug line-clamp-2 group-hover:text-amber-300 transition">
                      {item.title}
                    </h3>

                    <p className="text-xs text-zinc-400 leading-relaxed line-clamp-3">
                      {item.description}
                    </p>

                    <div className="pt-2 flex items-center justify-between text-[11px] font-mono text-zinc-500">
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3 text-cyan-400" />
                        <span>{item.author}</span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Card Action Footer */}
                <div className="p-4 bg-zinc-950/80 border-t border-zinc-800/80 flex items-center justify-between gap-2 text-xs font-mono">
                  {/* Photo Actions */}
                  {isPhoto && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setActivePhotoModal(item)}
                        className="px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white transition cursor-pointer flex items-center gap-1.5"
                      >
                        <Eye className="w-3.5 h-3.5 text-emerald-400" />
                        <span>View Photo</span>
                      </button>
                      <button
                        onClick={() => handleDownloadFile(item)}
                        className="px-3 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 transition cursor-pointer flex items-center gap-1.5"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download</span>
                      </button>
                    </div>
                  )}

                  {/* YouTube Actions */}
                  {isVideo && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setActiveVideoModal(item)}
                        className="px-3 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 transition cursor-pointer flex items-center gap-1.5"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span>Watch Video</span>
                      </button>
                      {item.youtubeUrl && (
                        <a
                          href={item.youtubeUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white transition flex items-center gap-1"
                        >
                          <span>YouTube</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  )}

                  {/* Document Actions: PDF, Word, PPT */}
                  {(isPdf || isWord || isPpt) && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setActiveDocPreviewModal(item)}
                        className="px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white transition cursor-pointer flex items-center gap-1.5"
                      >
                        <Eye className="w-3.5 h-3.5 text-cyan-400" />
                        <span>Read</span>
                      </button>
                      <button
                        onClick={() => handleDownloadFile(item)}
                        className={`px-3 py-1.5 rounded-xl border transition cursor-pointer flex items-center gap-1.5 font-bold ${
                          isPdf
                            ? 'bg-red-500/20 hover:bg-red-500/30 text-red-300 border-red-500/30'
                            : isWord
                            ? 'bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 border-sky-500/30'
                            : 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border-amber-500/30'
                        }`}
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download {isPdf ? '.pdf' : isWord ? '.docx' : '.pptx'}</span>
                      </button>
                    </div>
                  )}

                  {/* Common Remove Button in Footer */}
                  <button
                    type="button"
                    onClick={() => requestDeleteUpdate(item.id, item.title, item.type)}
                    className="px-2.5 py-1.5 rounded-xl bg-red-600/10 hover:bg-red-600/20 text-rose-300 border border-rose-500/30 transition cursor-pointer flex items-center gap-1 shrink-0 ml-auto"
                    title={isUserOwner ? `Remove this ${item.type === 'photo' ? 'photo' : item.type === 'youtube' ? 'video' : 'update'}` : "Owner authentication required to remove"}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Remove</span>
                  </button>
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* MODAL 1: Photo Fullscreen Lightbox Modal */}
      {activePhotoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fadeIn">
          <div className="bg-zinc-950 border border-zinc-800 rounded-3xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden shadow-2xl">
            
            <div className="p-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-950 shrink-0">
              <div className="flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-emerald-400" />
                <span className="font-bold text-white text-sm truncate max-w-md">{activePhotoModal.title}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleDownloadFile(activePhotoModal)}
                  className="px-3 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 font-mono text-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Image</span>
                </button>
                <button
                  onClick={() => requestDeleteUpdate(activePhotoModal.id, activePhotoModal.title, activePhotoModal.type)}
                  className="px-3 py-1.5 rounded-xl bg-red-600/80 hover:bg-red-600 text-white font-mono text-xs flex items-center gap-1.5 cursor-pointer shadow transition"
                  title="Remove this photo update"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Remove Photo</span>
                </button>
                <button
                  onClick={() => setActivePhotoModal(null)}
                  className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-900 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-black/60">
              <img 
                src={activePhotoModal.imageUrl} 
                alt={activePhotoModal.title} 
                className="max-w-full max-h-[70vh] object-contain rounded-2xl shadow-2xl"
              />
            </div>

            <div className="p-4 border-t border-zinc-800 bg-zinc-950 shrink-0 space-y-1">
              <p className="text-xs text-zinc-300 leading-relaxed font-sans">{activePhotoModal.description}</p>
              <div className="text-[11px] font-mono text-zinc-500 flex items-center justify-between">
                <span>Date: {activePhotoModal.date} • Tag: #{activePhotoModal.tag}</span>
                <span>Photographed by: {activePhotoModal.author}</span>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* MODAL 2: YouTube Video Player Modal */}
      {activeVideoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fadeIn">
          <div className="bg-zinc-950 border border-zinc-800 rounded-3xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col">
            
            <div className="p-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-950 shrink-0">
              <div className="flex items-center gap-2">
                <Video className="w-4 h-4 text-rose-500" />
                <span className="font-bold text-white text-sm truncate max-w-md">{activeVideoModal.title}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => requestDeleteUpdate(activeVideoModal.id, activeVideoModal.title, activeVideoModal.type)}
                  className="px-3 py-1.5 rounded-xl bg-red-600/80 hover:bg-red-600 text-white font-mono text-xs flex items-center gap-1.5 cursor-pointer shadow transition"
                  title="Remove this video update"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Remove Video</span>
                </button>
                <button
                  onClick={() => setActiveVideoModal(null)}
                  className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-900 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="aspect-video w-full bg-black">
              {activeVideoModal.youtubeVideoId ? (
                <iframe
                  className="w-full h-full"
                  src={`https://www.youtube-nocookie.com/embed/${activeVideoModal.youtubeVideoId}?autoplay=1&rel=0`}
                  title={activeVideoModal.title}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-zinc-400 space-y-2 p-6 text-center">
                  <Video className="w-10 h-10 text-rose-500/50" />
                  <p>External Video Link:</p>
                  <a
                    href={activeVideoModal.youtubeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-amber-400 underline font-mono text-xs flex items-center gap-1"
                  >
                    <span>{activeVideoModal.youtubeUrl}</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-zinc-800 bg-zinc-950 shrink-0 space-y-2">
              <p className="text-xs text-zinc-300 font-sans leading-relaxed">{activeVideoModal.description}</p>
              <div className="flex items-center justify-between text-[11px] font-mono text-zinc-500">
                <span>Duration: {activeVideoModal.duration || '04:18'} • {activeVideoModal.date}</span>
                {activeVideoModal.youtubeUrl && (
                  <a
                    href={activeVideoModal.youtubeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-rose-400 hover:text-rose-300 flex items-center gap-1"
                  >
                    <span>Open in YouTube</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* MODAL 3: Document Preview & Read Modal */}
      {activeDocPreviewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fadeIn">
          <div className="bg-zinc-950 border border-zinc-800 rounded-3xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
            
            <div className="p-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-950 shrink-0">
              <div className="flex items-center gap-2.5">
                {activeDocPreviewModal.type === 'pdf' ? (
                  <FileText className="w-5 h-5 text-red-400" />
                ) : activeDocPreviewModal.type === 'word' ? (
                  <FileCode className="w-5 h-5 text-sky-400" />
                ) : (
                  <Presentation className="w-5 h-5 text-amber-400" />
                )}
                <div>
                  <h3 className="font-bold text-white text-sm">{activeDocPreviewModal.title}</h3>
                  <div className="text-[10px] font-mono text-zinc-400">
                    {activeDocPreviewModal.fileSize || '1.5 MB'} • {activeDocPreviewModal.filePagesOrSlides || 'Document'} • {activeDocPreviewModal.author}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleDownloadFile(activeDocPreviewModal)}
                  className="px-3.5 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold font-mono text-xs flex items-center gap-1.5 cursor-pointer shadow-md"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download {activeDocPreviewModal.type.toUpperCase()}</span>
                </button>
                <button
                  onClick={() => requestDeleteUpdate(activeDocPreviewModal.id, activeDocPreviewModal.title, activeDocPreviewModal.type)}
                  className="px-3 py-1.5 rounded-xl bg-red-600/80 hover:bg-red-600 text-white font-mono text-xs flex items-center gap-1.5 cursor-pointer shadow transition"
                  title="Remove this document update"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Remove Document</span>
                </button>
                <button
                  onClick={() => setActiveDocPreviewModal(null)}
                  className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-900 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 bg-zinc-950 font-mono text-xs text-zinc-300 space-y-4 custom-scrollbar">
              <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800 font-sans text-xs text-zinc-400 leading-relaxed">
                <strong>Executive Summary:</strong> {activeDocPreviewModal.description}
              </div>

              <div className="p-5 rounded-2xl bg-black border border-zinc-800 space-y-3">
                <div className="flex items-center justify-between text-zinc-500 text-[11px] pb-2 border-b border-zinc-900">
                  <span>DOCUMENT PREVIEW & VERIFIED CONTENT</span>
                  <span>FORMAT: {activeDocPreviewModal.type.toUpperCase()}</span>
                </div>
                <pre className="whitespace-pre-wrap font-mono text-xs text-cyan-200/90 leading-relaxed font-normal">
                  {activeDocPreviewModal.documentContent || 'Technical documentation contents.'}
                </pre>
              </div>
            </div>

            <div className="p-4 border-t border-zinc-800 bg-zinc-950 shrink-0 flex items-center justify-between text-xs font-mono">
              <span className="text-zinc-500">Document ID: {activeDocPreviewModal.id}</span>
              <button
                onClick={() => handleDownloadFile(activeDocPreviewModal)}
                className="text-amber-400 hover:underline flex items-center gap-1"
              >
                <span>Save file locally</span>
                <Download className="w-3.5 h-3.5" />
              </button>
            </div>

          </div>
        </div>
      )}

      {/* MODAL 4: Owner Post New Update Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md animate-fadeIn">
          <div className="bg-zinc-950 border border-zinc-800 rounded-3xl w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
            
            <div className="shrink-0 p-5 border-b border-zinc-800 flex items-center justify-between bg-zinc-950">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
                  <Plus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Publish New Project Update</h3>
                  <p className="text-[11px] text-zinc-400 font-mono">Add photos, YouTube videos, or technical documents</p>
                </div>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-900 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateUpdate} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4 text-xs font-mono custom-scrollbar">
              
              {formError && (
                <div className="p-3 rounded-2xl bg-rose-950/60 border border-rose-500/50 text-rose-300 text-xs">
                  {formError}
                </div>
              )}

              {/* Update Type Selector */}
              <div className="space-y-1.5">
                <label className="text-zinc-300 font-bold">Select Update Category</label>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  <button
                    type="button"
                    onClick={() => setNewType('photo')}
                    className={`p-2.5 rounded-xl border text-center transition cursor-pointer flex flex-col items-center gap-1 ${
                      newType === 'photo' 
                        ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 font-bold' 
                        : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:bg-zinc-800'
                    }`}
                  >
                    <ImageIcon className="w-4 h-4 text-emerald-400" />
                    <span>Photo</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setNewType('youtube')}
                    className={`p-2.5 rounded-xl border text-center transition cursor-pointer flex flex-col items-center gap-1 ${
                      newType === 'youtube' 
                        ? 'bg-rose-500/20 border-rose-500 text-rose-300 font-bold' 
                        : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:bg-zinc-800'
                    }`}
                  >
                    <Video className="w-4 h-4 text-rose-400" />
                    <span>YouTube</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setNewType('pdf')}
                    className={`p-2.5 rounded-xl border text-center transition cursor-pointer flex flex-col items-center gap-1 ${
                      newType === 'pdf' 
                        ? 'bg-red-500/20 border-red-500 text-red-300 font-bold' 
                        : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:bg-zinc-800'
                    }`}
                  >
                    <FileText className="w-4 h-4 text-red-400" />
                    <span>PDF</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setNewType('word')}
                    className={`p-2.5 rounded-xl border text-center transition cursor-pointer flex flex-col items-center gap-1 ${
                      newType === 'word' 
                        ? 'bg-sky-500/20 border-sky-500 text-sky-300 font-bold' 
                        : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:bg-zinc-800'
                    }`}
                  >
                    <FileCode className="w-4 h-4 text-sky-400" />
                    <span>Word</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setNewType('ppt')}
                    className={`p-2.5 rounded-xl border text-center transition cursor-pointer flex flex-col items-center gap-1 ${
                      newType === 'ppt' 
                        ? 'bg-amber-500/20 border-amber-500 text-amber-300 font-bold' 
                        : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:bg-zinc-800'
                    }`}
                  >
                    <Presentation className="w-4 h-4 text-amber-400" />
                    <span>PPT</span>
                  </button>
                </div>
              </div>

              {/* Title */}
              <div className="space-y-1">
                <label className="text-zinc-300 font-bold">Title</label>
                <input
                  type="text"
                  placeholder="e.g. Wiper Mechanism Testing or Technical Whitepaper"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-400"
                  required
                />
              </div>

              {/* Description */}
              <div className="space-y-1">
                <label className="text-zinc-300 font-bold">Summary Description</label>
                <textarea
                  rows={2}
                  placeholder="Describe this update or document..."
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              {/* Specific inputs for Photo */}
              {newType === 'photo' && (
                <div className="p-3.5 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-emerald-400 font-bold flex items-center gap-1.5">
                      <ImageIcon className="w-3.5 h-3.5" />
                      <span>Upload Local Photo</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => photoFileInputRef.current?.click()}
                      className="px-3 py-1 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-xs cursor-pointer flex items-center gap-1"
                    >
                      <Upload className="w-3 h-3" />
                      <span>Choose File</span>
                    </button>
                  </div>

                  <input
                    ref={photoFileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleLocalPhotoUpload}
                    className="hidden"
                  />

                  {newImageUrl && (
                    <div className="relative aspect-video rounded-xl overflow-hidden border border-zinc-800 mt-2">
                      <img src={newImageUrl} alt="Preview" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setNewImageUrl('')}
                        className="absolute top-2 right-2 p-1 rounded-full bg-black/80 text-white hover:text-rose-400"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}

                  <div className="text-[10px] text-zinc-500 font-sans">
                    Or paste an image web link below:
                  </div>
                  <input
                    type="text"
                    placeholder="https://example.com/photo.jpg"
                    value={newImageUrl.startsWith('data:') ? '' : newImageUrl}
                    onChange={(e) => setNewImageUrl(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-1.5 text-white focus:outline-none focus:border-emerald-400 text-xs"
                  />
                </div>
              )}

              {/* Specific inputs for YouTube */}
              {newType === 'youtube' && (
                <div className="p-3.5 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-2">
                  <label className="text-rose-400 font-bold flex items-center gap-1.5">
                    <Video className="w-3.5 h-3.5" />
                    <span>YouTube Video URL or ID</span>
                  </label>
                  <input
                    type="text"
                    placeholder="https://www.youtube.com/watch?v=... or Video ID"
                    value={newYoutubeUrl}
                    onChange={(e) => setNewYoutubeUrl(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-rose-400 text-xs"
                  />
                </div>
              )}

              {/* Specific inputs for Documents: PDF, Word, PPT */}
              {(newType === 'pdf' || newType === 'word' || newType === 'ppt') && (
                <div className="p-3.5 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-amber-300">
                      {newType === 'pdf' ? 'PDF Content & Download Settings' : newType === 'word' ? 'Word .docx Content & Settings' : 'PowerPoint .pptx Content & Settings'}
                    </span>
                    <span className="text-[10px] text-zinc-500">Auto-Generates real download</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <label className="text-zinc-400 text-[10px]">File Size Label</label>
                      <input
                        type="text"
                        value={newFileSize}
                        onChange={(e) => setNewFileSize(e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-1.5 text-white focus:outline-none focus:border-amber-400"
                      />
                    </div>
                    <div>
                      <label className="text-zinc-400 text-[10px]">{newType === 'ppt' ? 'Slide Count' : 'Page Count'}</label>
                      <input
                        type="text"
                        value={newPages}
                        onChange={(e) => setNewPages(e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-1.5 text-white focus:outline-none focus:border-amber-400"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-zinc-400 text-[10px]">Document Text / Spec Content (included in downloaded file)</label>
                    <textarea
                      rows={4}
                      placeholder="Write technical details, specifications, or chapter text to be bundled into the download file..."
                      value={newDocContent}
                      onChange={(e) => setNewDocContent(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-400 text-xs"
                    />
                  </div>
                </div>
              )}

              {/* Tag & Author */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-zinc-300 font-bold">Tag / Topic</label>
                  <input
                    type="text"
                    placeholder="e.g. Hardware, Firmware"
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-400"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-zinc-300 font-bold">Author</label>
                  <input
                    type="text"
                    value={newAuthor}
                    onChange={(e) => setNewAuthor(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="shrink-0 pt-4 border-t border-zinc-800 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-300 hover:to-orange-400 text-slate-950 font-bold cursor-pointer shadow-lg flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>Publish Update</span>
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* In-App Deletion Confirmation Modal (Guaranteed to work inside iframe without browser blocking) */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fadeIn">
          <div className="bg-zinc-950 border border-zinc-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">
                  Remove {deleteTarget.type === 'photo' ? 'Photo' : deleteTarget.type === 'youtube' ? 'Video' : 'Update'}?
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Confirm permanent removal from feed and Firebase.
                </p>
              </div>
            </div>

            <div className="p-3 bg-black/60 rounded-xl border border-zinc-800 text-xs font-mono text-zinc-300">
              <span className="text-zinc-500">Target:</span> <strong className="text-white">{deleteTarget.title}</strong>
            </div>

            <p className="text-xs text-zinc-400 leading-relaxed">
              This action will immediately delete this item from the project timeline and synchronize the change to Google Cloud Firestore.
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
                onClick={handleConfirmDeleteUpdate}
                className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-lg shadow-red-600/30 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Yes, Remove {deleteTarget.type === 'photo' ? 'Photo' : deleteTarget.type === 'youtube' ? 'Video' : 'Item'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Admin Required Sign-In Modal */}
      {showAdminRequiredModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fadeIn">
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
              To protect project timeline documentation, deleting updates requires signing in with an authorized administrator account.
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
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-300 hover:to-orange-400 text-slate-950 font-bold text-xs transition flex items-center gap-1.5 shadow-lg cursor-pointer"
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
