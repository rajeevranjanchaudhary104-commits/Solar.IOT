import React, { useState } from 'react';
import { 
  Play, 
  ExternalLink, 
  Video, 
  Edit3, 
  Check, 
  ChevronDown, 
  ChevronUp, 
  HelpCircle,
  Copy,
  Sparkles
} from 'lucide-react';

interface VideoTutorialSlotProps {
  customVideoUrl?: string;
  onUpdateVideoUrl?: (newUrl: string) => void;
  allowEdit?: boolean;
  defaultExpanded?: boolean;
}

// Convert standard YouTube or video URLs into safe embeddable iframe URLs
export const getEmbedUrl = (rawUrl: string): string => {
  if (!rawUrl || !rawUrl.trim()) {
    // Official / reliable Firebase quickstart setup tutorial embed:
    return 'https://www.youtube.com/embed/9k8KeqTz9cM';
  }

  const trimmed = rawUrl.trim();

  // If already an embed URL
  if (trimmed.includes('/embed/')) {
    return trimmed;
  }

  // Handle youtu.be/<id>
  const shortMatch = trimmed.match(/youtu\.be\/([a-zA-Z0-9_-]+)/);
  if (shortMatch && shortMatch[1]) {
    return `https://www.youtube.com/embed/${shortMatch[1]}`;
  }

  // Handle youtube.com/watch?v=<id>
  const watchMatch = trimmed.match(/[?&]v=([a-zA-Z0-9_-]+)/);
  if (watchMatch && watchMatch[1]) {
    return `https://www.youtube.com/embed/${watchMatch[1]}`;
  }

  // Handle youtube.com/shorts/<id>
  const shortsMatch = trimmed.match(/youtube\.com\/shorts\/([a-zA-Z0-9_-]+)/);
  if (shortsMatch && shortsMatch[1]) {
    return `https://www.youtube.com/embed/${shortsMatch[1]}`;
  }

  return trimmed;
};

export const VideoTutorialSlot: React.FC<VideoTutorialSlotProps> = ({
  customVideoUrl,
  onUpdateVideoUrl,
  allowEdit = true,
  defaultExpanded = false,
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(defaultExpanded);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [inputUrl, setInputUrl] = useState<string>(customVideoUrl || '');
  const [copiedLink, setCopiedLink] = useState<boolean>(false);

  const activeEmbedUrl = getEmbedUrl(customVideoUrl || '');

  const handleSaveVideoUrl = () => {
    if (onUpdateVideoUrl) {
      onUpdateVideoUrl(inputUrl.trim());
    }
    setIsEditing(false);
  };

  const handleCopyConsoleLink = () => {
    navigator.clipboard.writeText('https://console.firebase.google.com');
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div className="rounded-2xl border border-indigo-500/30 bg-indigo-950/20 overflow-hidden transition-all duration-300">
      {/* Header bar / Toggle Button */}
      <div 
        onClick={() => setIsExpanded(!isExpanded)}
        className="px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-indigo-900/20 transition select-none"
      >
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-indigo-600/30 border border-indigo-400/40 flex items-center justify-center text-indigo-300 shrink-0">
            <Video className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-bold text-white flex items-center gap-2">
              <span>Video Guide: How to Get Your Firebase Project ID</span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                1 Min Guide
              </span>
            </div>
            <p className="text-[11px] text-zinc-400 font-mono">
              Watch step-by-step video tutorial to create your free Firebase project
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono text-indigo-300 hidden sm:inline">
            {isExpanded ? 'Hide Video' : 'Watch Video'}
          </span>
          <div className="w-6 h-6 rounded-lg bg-zinc-800/80 flex items-center justify-center text-zinc-400">
            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </div>
        </div>
      </div>

      {/* Expanded Video Content */}
      {isExpanded && (
        <div className="p-4 pt-1 space-y-4 border-t border-indigo-500/20">
          {/* Video Player */}
          <div className="relative aspect-video w-full rounded-xl overflow-hidden bg-black border border-zinc-800 shadow-2xl">
            <iframe
              src={activeEmbedUrl}
              title="Firebase Project ID Tutorial"
              className="w-full h-full border-0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>

          {/* Action Row: Edit custom video link + Console link */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs font-mono">
            <div className="flex items-center gap-2">
              <a
                href="https://console.firebase.google.com"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-200 border border-indigo-400/30 transition text-[11px]"
              >
                <span>Open Firebase Console</span>
                <ExternalLink className="w-3 h-3" />
              </a>

              <button
                type="button"
                onClick={handleCopyConsoleLink}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 transition text-[11px]"
              >
                {copiedLink ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copiedLink ? 'Copied' : 'Copy Link'}</span>
              </button>
            </div>
          </div>

          {/* Quick 3-step checklist */}
          <div className="p-3 rounded-xl bg-black/60 border border-zinc-800 text-[11px] font-mono text-zinc-300 space-y-1.5">
            <div className="text-indigo-300 font-bold flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              <span>3 Quick Steps to Connect:</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 text-zinc-400">
              <div className="p-2 rounded-lg bg-zinc-900/60 border border-zinc-800/80">
                <span className="text-white font-bold block mb-0.5">1. Sign In</span>
                Go to console.firebase.google.com with your Google account.
              </div>
              <div className="p-2 rounded-lg bg-zinc-900/60 border border-zinc-800/80">
                <span className="text-white font-bold block mb-0.5">2. Create Project</span>
                Click &ldquo;Add project&rdquo; (takes ~15 seconds, totally free).
              </div>
              <div className="p-2 rounded-lg bg-zinc-900/60 border border-zinc-800/80">
                <span className="text-white font-bold block mb-0.5">3. Copy Project ID</span>
                Copy Project ID from Project Settings &amp; paste it below.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
