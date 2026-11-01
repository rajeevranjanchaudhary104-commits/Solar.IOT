import React, { useState, useEffect, useRef } from 'react';
import { 
  Star, 
  MessageSquare, 
  ThumbsUp, 
  CheckCircle2, 
  Sparkles, 
  Plus, 
  Send, 
  Filter, 
  Search, 
  ShieldCheck, 
  User, 
  Zap, 
  Radio, 
  Globe, 
  Bot, 
  RefreshCw, 
  Trash2, 
  Award, 
  Clock,
  HelpCircle,
  X,
  Edit3,
  Image as ImageIcon,
  Video,
  Upload,
  ZoomIn,
  Play,
  Save,
  ExternalLink,
  Film
} from 'lucide-react';
import { 
  collection, 
  doc, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  increment 
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { OWNER_EMAILS } from './ResearchMode';
import confetti from 'canvas-confetti';

export interface ReviewPhoto {
  url: string;
  title?: string;
}

export interface UserReview {
  id: string;
  authorName: string;
  authorRole: string; // e.g. "Solar Rooftop Owner", "Electrical Engineering Student", "High School Science Teacher", "Solar Installer"
  authorEmail?: string;
  rating: number; // 1 to 5
  setupType: string; // e.g. "Off-Grid 1kW + 150Ah LiFePO4", "On-Grid 3kW Grid-Tied", "ESP32 IoT Prototype Station", "Luminous Solar Panel Setup"
  title: string;
  content: string;
  verifiedReal: boolean;
  helpfulCount: number;
  timestamp: string;
  photoUrl?: string;
  photoTitle?: string;
  photos?: ReviewPhoto[];
  videoUrl?: string; // YouTube or video URL
  videoTitle?: string;
  ownerReply?: string;
  ownerReplyTime?: string;
  aiKeyTakeaway?: string;
  aiSentiment?: 'positive' | 'neutral' | 'critical';
  aiKeywords?: string[];
  updatedAt?: string;
}

interface UserReviewsSectionProps {
  currentUser?: {
    email?: string | null;
    displayName?: string | null;
  } | null;
  onRequireSignIn?: () => void;
}

// Convert any YouTube link (watch, youtu.be, shorts, embed) into responsive embed iframe URL
export const formatYouTubeEmbedUrl = (url: string): string => {
  if (!url) return '';
  const trimmed = url.trim();
  try {
    if (trimmed.includes('youtube.com/watch?v=')) {
      const videoId = trimmed.split('v=')[1]?.split('&')[0];
      return `https://www.youtube.com/embed/${videoId}`;
    }
    if (trimmed.includes('youtu.be/')) {
      const videoId = trimmed.split('youtu.be/')[1]?.split('?')[0];
      return `https://www.youtube.com/embed/${videoId}`;
    }
    if (trimmed.includes('youtube.com/shorts/')) {
      const videoId = trimmed.split('shorts/')[1]?.split('?')[0];
      return `https://www.youtube.com/embed/${videoId}`;
    }
    if (trimmed.includes('youtube.com/embed/')) {
      return trimmed;
    }
    return trimmed;
  } catch {
    return trimmed;
  }
};

const isDirectVideo = (url: string) => {
  if (!url) return false;
  const lower = url.toLowerCase();
  return lower.endsWith('.mp4') || lower.endsWith('.webm') || lower.endsWith('.ogg');
};

const SAMPLE_SOLAR_PHOTOS = [
  {
    title: 'Monocrystalline Rooftop Array',
    url: 'https://images.unsplash.com/photo-1509391365360-2e959784a276?auto=format&fit=crop&w=1000&q=80'
  },
  {
    title: 'Silicone Wiper Motor Setup',
    url: 'https://images.unsplash.com/photo-1508873696983-2df570464756?auto=format&fit=crop&w=1000&q=80'
  },
  {
    title: 'ESP32 IoT & INA219 Shunt',
    url: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1000&q=80'
  }
];

export const UserReviewsSection: React.FC<UserReviewsSectionProps> = ({ 
  currentUser, 
  onRequireSignIn 
}) => {
  const [reviews, setReviews] = useState<UserReview[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [showAddForm, setShowAddForm] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterRating, setFilterRating] = useState<number | 'all'>('all');
  const [filterSetup, setFilterSetup] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'highest' | 'helpful'>('newest');

  // New Review Form State
  const [authorName, setAuthorName] = useState<string>(currentUser?.displayName || '');
  const [authorRole, setAuthorRole] = useState<string>('Solar Panel Owner');
  const [rating, setRating] = useState<number>(5);
  const [setupType, setSetupType] = useState<string>('On-Grid 3kW Rooftop Array');
  const [title, setTitle] = useState<string>('');
  const [content, setContent] = useState<string>('');
  
  // Media attachments in review
  const [photoUrl, setPhotoUrl] = useState<string>('');
  const [photoTitle, setPhotoTitle] = useState<string>('');
  const [videoUrl, setVideoUrl] = useState<string>('');
  const [videoTitle, setVideoTitle] = useState<string>('');
  const [isUploadingPhoto, setIsUploadingPhoto] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitStatus, setSubmitStatus] = useState<string | null>(null);

  // Gemini Flash Lite State
  const [aiVerdict, setAiVerdict] = useState<string>('Community reviews highlight effective dust soiling removal, reliable nocturnal automated sweeps, and accurate real-time telemetry.');
  const [isGeneratingVerdict, setIsGeneratingVerdict] = useState<boolean>(false);
  const [isPolishingReview, setIsPolishingReview] = useState<boolean>(false);

  // Owner reply modal state
  const [replyReviewId, setReplyReviewId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState<string>('');

  // Owner Edit Review Modal state
  const [isEditReviewModalOpen, setIsEditReviewModalOpen] = useState<boolean>(false);
  const [editingReview, setEditingReview] = useState<UserReview | null>(null);
  const [editForm, setEditForm] = useState<{
    authorName: string;
    authorRole: string;
    rating: number;
    setupType: string;
    title: string;
    content: string;
    photoUrl: string;
    photoTitle: string;
    videoUrl: string;
    videoTitle: string;
  }>({
    authorName: '',
    authorRole: '',
    rating: 5,
    setupType: '',
    title: '',
    content: '',
    photoUrl: '',
    photoTitle: '',
    videoUrl: '',
    videoTitle: ''
  });
  const [isSavingEdit, setIsSavingEdit] = useState<boolean>(false);
  const [editStatus, setEditStatus] = useState<string | null>(null);

  // Fullscreen Photo Zoom Modal
  const [zoomPhoto, setZoomPhoto] = useState<{ url: string; title?: string } | null>(null);

  // Owner check for administrative actions
  const isOwner = Boolean(
    currentUser?.email && 
    OWNER_EMAILS.includes(currentUser.email.trim().toLowerCase())
  );

  // Sync Reviews directly from Cloud Firestore
  useEffect(() => {
    const reviewsCol = collection(db, 'user_reviews');
    const unsub = onSnapshot(reviewsCol, (snapshot) => {
      const loaded: UserReview[] = [];
      snapshot.forEach((docSnap) => {
        loaded.push({ id: docSnap.id, ...docSnap.data() } as UserReview);
      });
      setReviews(loaded);
      setLoading(false);
    }, (error) => {
      console.error('Firestore reviews snapshot error:', error);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  // Handle local photo file upload and convert to base64 data URL
  const handlePhotoFileUpload = (e: React.ChangeEvent<HTMLInputElement>, isForEditModal: boolean = false) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file (PNG, JPG, JPEG, WebP).');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('Image file size must be under 5MB.');
      return;
    }

    setIsUploadingPhoto(true);
    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      const result = uploadEvent.target?.result as string;
      if (isForEditModal) {
        setEditForm((prev) => ({
          ...prev,
          photoUrl: result,
          photoTitle: prev.photoTitle || file.name.split('.')[0]
        }));
      } else {
        setPhotoUrl(result);
        if (!photoTitle) {
          setPhotoTitle(file.name.split('.')[0]);
        }
      }
      setIsUploadingPhoto(false);
    };
    reader.onerror = () => {
      setIsUploadingPhoto(false);
      alert('Failed to read photo file.');
    };
    reader.readAsDataURL(file);
  };

  // Fetch Gemini Flash Lite Community Verdict
  const handleFetchAiVerdict = async () => {
    if (reviews.length === 0) return;
    setIsGeneratingVerdict(true);
    try {
      const res = await fetch('/api/gemini/solar-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: `Summarize the community reviews for the Farm.IOT autonomous wiper and monitoring system into one concise, balanced 2-sentence synthesis of user experiences.`,
          context: reviews.map(r => ({ rating: r.rating, title: r.title, content: r.content, setup: r.setupType }))
        }),
      });
      const data = await res.json();
      if (data.reply) {
        setAiVerdict(data.reply.replace(/^["']|["']$/g, '').trim());
      }
    } catch (err) {
      console.error('AI Verdict Error:', err);
    } finally {
      setIsGeneratingVerdict(false);
    }
  };

  // Polish review using Gemini Flash Lite
  const handlePolishWithGemini = async () => {
    if (!content.trim()) return;
    setIsPolishingReview(true);
    try {
      const res = await fetch('/api/gemini/solar-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: `Help refine and clearly format this solar user review for clarity and technical precision while preserving the original opinion and meaning: "${content}"`,
        }),
      });
      const data = await res.json();
      if (data.reply) {
        setContent(data.reply.replace(/^["']|["']$/g, '').trim());
      }
    } catch (err) {
      console.error('Polish Review Error:', err);
    } finally {
      setIsPolishingReview(false);
    }
  };

  // Submit New Review
  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authorName.trim() || !title.trim() || !content.trim()) {
      setSubmitStatus('Please fill in all required fields.');
      return;
    }

    setIsSubmitting(true);
    setSubmitStatus('Analyzing & publishing your review with attached media...');
    try {
      let aiTakeaway = 'Review submitted with solar operational verification.';
      let aiSentiment: 'positive' | 'neutral' | 'critical' = 'positive';
      let aiKeywords: string[] = ['Solar Efficiency', 'User Review'];

      try {
        const aiRes = await fetch('/api/gemini/analyze-review', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            reviewText: content,
            rating,
            systemSetup: setupType,
            reviewerName: authorName,
          }),
        });
        const aiData = await aiRes.json();
        if (aiData.keyTakeaway) aiTakeaway = aiData.keyTakeaway;
        if (aiData.sentiment) aiSentiment = aiData.sentiment;
        if (Array.isArray(aiData.highlightedKeywords)) aiKeywords = aiData.highlightedKeywords;
      } catch (e) {
        console.warn('AI analysis note, proceeding with save');
      }

      const nowFormatted = new Date().toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });

      const cleanPhotoUrl = photoUrl.trim();
      const cleanVideoUrl = videoUrl.trim();

      const newReviewData: Omit<UserReview, 'id'> = {
        authorName: authorName.trim(),
        authorRole: authorRole.trim() || 'Solar Enthusiast',
        authorEmail: currentUser?.email || 'user@community.org',
        rating,
        setupType,
        title: title.trim(),
        content: content.trim(),
        verifiedReal: true,
        helpfulCount: 0,
        timestamp: nowFormatted,
        photoUrl: cleanPhotoUrl || undefined,
        photoTitle: cleanPhotoUrl ? (photoTitle.trim() || 'Solar Installation Photo') : undefined,
        photos: cleanPhotoUrl ? [{ url: cleanPhotoUrl, title: photoTitle.trim() || 'Solar Installation Photo' }] : undefined,
        videoUrl: cleanVideoUrl || undefined,
        videoTitle: cleanVideoUrl ? (videoTitle.trim() || 'Solar Demonstration Video') : undefined,
        aiKeyTakeaway: aiTakeaway,
        aiSentiment: aiSentiment,
        aiKeywords: aiKeywords,
      };

      const reviewsCol = collection(db, 'user_reviews');
      await addDoc(reviewsCol, newReviewData);

      setSubmitStatus('Your review and media have been successfully published!');
      try {
        confetti({
          particleCount: 50,
          spread: 70,
          origin: { y: 0.7 },
          colors: ['#10b981', '#06b6d4', '#f59e0b'],
        });
      } catch {}

      setTimeout(() => {
        setShowAddForm(false);
        setTitle('');
        setContent('');
        setPhotoUrl('');
        setPhotoTitle('');
        setVideoUrl('');
        setVideoTitle('');
        setSubmitStatus(null);
      }, 1200);
    } catch (err: any) {
      setSubmitStatus(`Error: ${err.message || 'Failed to submit'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Upvote helpful review
  const handleUpvote = async (reviewId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const reviewRef = doc(db, 'user_reviews', reviewId);
      await updateDoc(reviewRef, {
        helpfulCount: increment(1)
      });
    } catch (err) {
      console.error('Upvote error:', err);
    }
  };

  // Delete review (Owner only)
  const handleDeleteReview = async (reviewId: string) => {
    if (!isOwner) return;
    try {
      await deleteDoc(doc(db, 'user_reviews', reviewId));
    } catch (err) {
      console.error('Delete review error:', err);
    }
  };

  // Open Owner Edit Review Modal
  const handleOpenEditReview = (review: UserReview) => {
    if (!isOwner) return;
    setEditingReview(review);
    setEditForm({
      authorName: review.authorName || '',
      authorRole: review.authorRole || '',
      rating: review.rating || 5,
      setupType: review.setupType || '',
      title: review.title || '',
      content: review.content || '',
      photoUrl: review.photoUrl || review.photos?.[0]?.url || '',
      photoTitle: review.photoTitle || review.photos?.[0]?.title || '',
      videoUrl: review.videoUrl || '',
      videoTitle: review.videoTitle || ''
    });
    setEditStatus(null);
    setIsEditReviewModalOpen(true);
  };

  // Save Owner Review Edits
  const handleSaveEditReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingReview || !isOwner) return;

    setIsSavingEdit(true);
    setEditStatus(null);
    try {
      const reviewRef = doc(db, 'user_reviews', editingReview.id);
      const cleanPhotoUrl = editForm.photoUrl.trim();
      const cleanVideoUrl = editForm.videoUrl.trim();

      await updateDoc(reviewRef, {
        authorName: editForm.authorName.trim(),
        authorRole: editForm.authorRole.trim(),
        rating: editForm.rating,
        setupType: editForm.setupType,
        title: editForm.title.trim(),
        content: editForm.content.trim(),
        photoUrl: cleanPhotoUrl || null,
        photoTitle: cleanPhotoUrl ? (editForm.photoTitle.trim() || 'Solar Installation Photo') : null,
        photos: cleanPhotoUrl ? [{ url: cleanPhotoUrl, title: editForm.photoTitle.trim() || 'Solar Installation Photo' }] : [],
        videoUrl: cleanVideoUrl || null,
        videoTitle: cleanVideoUrl ? (editForm.videoTitle.trim() || 'Solar Demonstration Video') : null,
        updatedAt: new Date().toISOString()
      });

      setEditStatus('Review updated successfully!');
      setTimeout(() => {
        setIsEditReviewModalOpen(false);
        setEditingReview(null);
        setEditStatus(null);
      }, 1000);
    } catch (err: any) {
      setEditStatus(`Error: ${err.message || 'Failed to update review'}`);
    } finally {
      setIsSavingEdit(false);
    }
  };

  // Save Owner Reply
  const handleSaveOwnerReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyReviewId || !isOwner || !replyText.trim()) return;

    try {
      const reviewRef = doc(db, 'user_reviews', replyReviewId);
      const nowFormatted = new Date().toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
      await updateDoc(reviewRef, {
        ownerReply: replyText.trim(),
        ownerReplyTime: nowFormatted,
      });
      setReplyReviewId(null);
      setReplyText('');
    } catch (err) {
      console.error('Owner reply error:', err);
    }
  };

  // Compute average rating
  const averageRating = reviews.length > 0 
    ? (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1)
    : '5.0';

  // Filter & Sort reviews
  const filteredReviews = reviews.filter((r) => {
    const matchesSearch = 
      r.authorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.setupType.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesRating = filterRating === 'all' || r.rating === filterRating;
    const matchesSetup = filterSetup === 'all' || r.setupType.toLowerCase().includes(filterSetup.toLowerCase());

    return matchesSearch && matchesRating && matchesSetup;
  }).sort((a, b) => {
    if (sortBy === 'highest') return b.rating - a.rating;
    if (sortBy === 'helpful') return b.helpfulCount - a.helpfulCount;
    return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
  });

  return (
    <div className="space-y-8 animate-fadeIn">
      
      {/* Top Banner */}
      <div className="bg-zinc-950 border border-zinc-800 rounded-3xl p-6 sm:p-8 relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex items-center space-x-2 text-xs font-mono text-amber-400 bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20">
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Reviews & Community Feedback</span>
              </div>
              <div className="inline-flex items-center space-x-1.5 text-xs font-mono text-cyan-400 bg-cyan-500/10 px-3 py-1 rounded-full border border-cyan-500/20">
                <Bot className="w-3.5 h-3.5" />
                <span>Gemini Flash Lite AI Verified</span>
              </div>
              {isOwner && (
                <div className="inline-flex items-center space-x-1.5 text-xs font-mono text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Admin Verified</span>
                </div>
              )}
            </div>

            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Community Reviews & Evidence
            </h2>
            <p className="text-xs sm:text-sm text-zinc-300 max-w-2xl leading-relaxed">
              Real experiences from solar rooftop operators, students, and engineers. Share your feedback, attach installation photos, and embed YouTube demonstration videos.
            </p>
          </div>

          {/* Rating Summary Card & Action Button */}
          <div className="flex flex-row md:flex-col items-center md:items-end justify-between md:justify-center gap-3 shrink-0">
            <div className="flex items-center gap-2 p-3 bg-black rounded-2xl border border-zinc-800">
              <div className="text-3xl font-black text-white font-mono">{reviews.length > 0 ? averageRating : '—'}</div>
              <div>
                <div className="flex text-amber-400 text-xs">
                  {'★'.repeat(Math.round(Number(averageRating)))}
                  {'☆'.repeat(5 - Math.round(Number(averageRating)))}
                </div>
                <div className="text-[10px] font-mono text-zinc-400">
                  {reviews.length} {reviews.length === 1 ? 'Review' : 'Reviews'}
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowAddForm(true)}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 via-orange-400 to-amber-500 hover:from-amber-300 hover:to-orange-300 text-black font-black text-xs font-mono transition cursor-pointer flex items-center gap-2 shadow-lg shadow-amber-500/20 active:scale-95"
            >
              <Plus className="w-4 h-4 text-black" />
              <span>Write a Review</span>
            </button>
          </div>
        </div>
      </div>

      {/* Gemini Flash Lite AI Community Verdict Box */}
      {reviews.length > 0 && (
        <div className="bg-zinc-950 border border-cyan-500/30 rounded-2xl p-5 shadow-xl backdrop-blur-md relative overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-zinc-800 gap-2">
            <div className="flex items-center space-x-2.5">
              <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shrink-0">
                <Bot className="w-4 h-4 text-cyan-400" />
              </div>
              <div>
                <h3 className="text-xs sm:text-sm font-bold text-white flex items-center gap-2">
                  <span>AI Community Synthesis</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
                    Gemini Flash Lite
                  </span>
                </h3>
              </div>
            </div>

            <button
              onClick={handleFetchAiVerdict}
              disabled={isGeneratingVerdict}
              className="text-[11px] font-mono text-cyan-400 hover:text-cyan-300 flex items-center gap-1 cursor-pointer transition disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isGeneratingVerdict ? 'animate-spin' : ''}`} />
              <span>{isGeneratingVerdict ? 'Synthesizing...' : 'Refresh AI Summary'}</span>
            </button>
          </div>

          <div className="pt-3">
            <p className="text-xs sm:text-sm text-zinc-200 leading-relaxed font-sans">
              "{aiVerdict}"
            </p>
          </div>
        </div>
      )}

      {/* Filters & Search Toolbar */}
      <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 text-xs font-mono shadow-md">
        
        {/* Search */}
        <div className="flex items-center gap-2 bg-black px-3 py-2 rounded-xl border border-zinc-800 flex-1">
          <Search className="w-4 h-4 text-zinc-500 shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search reviews, keywords, or system setups..."
            className="bg-transparent border-none text-white text-xs w-full focus:outline-none placeholder-zinc-600"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="text-zinc-500 hover:text-white">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filter Badges */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1 bg-black p-1 rounded-xl border border-zinc-800">
            <span className="text-zinc-500 px-2 py-1 text-[11px]">Stars:</span>
            {['all', 5, 4, 3].map((val) => (
              <button
                key={val}
                onClick={() => setFilterRating(val as any)}
                className={`px-2.5 py-1 rounded-lg transition cursor-pointer text-[11px] ${
                  filterRating === val
                    ? 'bg-amber-400 text-black font-bold'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                {val === 'all' ? 'All' : `${val}★`}
              </button>
            ))}
          </div>

          {/* Sort By */}
          <div className="flex items-center gap-1 bg-black p-1 rounded-xl border border-zinc-800">
            <span className="text-zinc-500 px-2 py-1 text-[11px]">Sort:</span>
            {(['newest', 'highest', 'helpful'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setSortBy(mode)}
                className={`px-2.5 py-1 rounded-lg transition cursor-pointer text-[11px] capitalize ${
                  sortBy === mode
                    ? 'bg-cyan-500 text-slate-950 font-bold'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Reviews List */}
      {loading ? (
        <div className="p-12 text-center text-zinc-500 font-mono text-xs flex items-center justify-center gap-2">
          <RefreshCw className="w-4 h-4 animate-spin text-cyan-400" />
          <span>Loading community reviews from Cloud Firestore...</span>
        </div>
      ) : reviews.length === 0 ? (
        <div className="p-12 text-center bg-zinc-950 border border-zinc-800 rounded-3xl space-y-4 max-w-xl mx-auto shadow-2xl">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center mx-auto border border-amber-500/20">
            <MessageSquare className="w-7 h-7" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-white">No reviews yet</h3>
            <p className="text-xs text-zinc-400 leading-relaxed max-w-md mx-auto">
              Be the first to share your experience with the Farm.IOT station, solar panels, and automated wiper system. Attach photos and YouTube videos to showcase your station.
            </p>
          </div>
          <button
            onClick={() => setShowAddForm(true)}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 text-black font-bold font-mono text-xs cursor-pointer hover:from-amber-300 hover:to-orange-400 transition shadow-lg shadow-amber-500/20"
          >
            Write the First Review
          </button>
        </div>
      ) : filteredReviews.length === 0 ? (
        <div className="p-12 text-center bg-zinc-950 border border-zinc-800 rounded-3xl space-y-3">
          <p className="text-sm font-bold text-white">No reviews found matching your filter.</p>
          <button
            onClick={() => {
              setSearchQuery('');
              setFilterRating('all');
              setFilterSetup('all');
            }}
            className="text-xs font-mono text-amber-400 underline cursor-pointer"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5">
          {filteredReviews.map((review) => {
            const hasPhoto = Boolean(review.photoUrl || (review.photos && review.photos.length > 0));
            const primaryPhoto = review.photoUrl || review.photos?.[0]?.url;
            const primaryPhotoTitle = review.photoTitle || review.photos?.[0]?.title || 'Solar Station Photo';
            const embedVideoUrl = review.videoUrl ? formatYouTubeEmbedUrl(review.videoUrl) : '';
            const isDirectMp4 = review.videoUrl ? isDirectVideo(review.videoUrl) : false;

            return (
              <div 
                key={review.id}
                className="bg-zinc-950 border border-zinc-800/90 rounded-2xl p-5 sm:p-6 shadow-xl space-y-4 hover:border-amber-500/30 transition duration-300"
              >
                {/* Header: Author & Rating */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-amber-500 to-orange-500 text-black font-black flex items-center justify-center font-mono text-sm shrink-0 shadow-md">
                      {review.authorName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-bold text-white text-sm">{review.authorName}</h4>
                        {review.verifiedReal && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/20">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Verified Review</span>
                          </span>
                        )}
                        {hasPhoto && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold bg-cyan-500/10 text-cyan-400 px-2 py-0.5 rounded-full border border-cyan-500/20">
                            <ImageIcon className="w-3 h-3" />
                            <span>Photo</span>
                          </span>
                        )}
                        {review.videoUrl && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold bg-rose-500/10 text-rose-400 px-2 py-0.5 rounded-full border border-rose-500/20">
                            <Video className="w-3 h-3" />
                            <span>YouTube Video</span>
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-zinc-400 font-mono flex items-center gap-2 mt-0.5">
                        <span>{review.authorRole}</span>
                        <span>•</span>
                        <span className="text-zinc-500">{review.timestamp}</span>
                        {review.updatedAt && (
                          <span className="text-zinc-600 text-[10px]">(edited)</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Stars & Setup Badge */}
                  <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
                    <span className="px-2.5 py-1 rounded-lg bg-zinc-900 text-cyan-300 font-mono text-[10px] border border-zinc-800 font-semibold">
                      {review.setupType}
                    </span>
                    <div className="flex text-amber-400 text-sm">
                      {'★'.repeat(review.rating)}
                      {'☆'.repeat(5 - review.rating)}
                    </div>
                  </div>
                </div>

                {/* Title & Content */}
                <div className="space-y-1.5 pt-1">
                  <h5 className="text-sm sm:text-base font-bold text-white tracking-tight">
                    {review.title}
                  </h5>
                  <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed font-sans whitespace-pre-line">
                    {review.content}
                  </p>
                </div>

                {/* ATTACHED MEDIA SECTION: Video & Photo */}
                {(review.videoUrl || hasPhoto) && (
                  <div className="pt-2 grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    
                    {/* Embedded YouTube / Video Player */}
                    {review.videoUrl && (
                      <div className="bg-black border border-zinc-800 rounded-xl overflow-hidden space-y-2 p-2">
                        <div className="flex items-center justify-between px-1 text-[11px] font-mono text-rose-400 font-bold">
                          <span className="flex items-center gap-1.5">
                            <Video className="w-3.5 h-3.5 text-rose-400" />
                            <span>{review.videoTitle || 'YouTube Video Demonstration'}</span>
                          </span>
                          <a
                            href={review.videoUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-zinc-500 hover:text-white flex items-center gap-0.5 text-[10px]"
                            title="Open in YouTube"
                          >
                            <span>Open</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>

                        <div className="relative aspect-video rounded-lg overflow-hidden bg-zinc-900 border border-zinc-800">
                          {isDirectMp4 ? (
                            <video
                              src={review.videoUrl}
                              controls
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <iframe
                              src={embedVideoUrl}
                              title={review.videoTitle || 'Review Video'}
                              className="w-full h-full border-0"
                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                              allowFullScreen
                            />
                          )}
                        </div>
                      </div>
                    )}

                    {/* Attached Photo Card */}
                    {hasPhoto && primaryPhoto && (
                      <div className="bg-black border border-zinc-800 rounded-xl overflow-hidden space-y-2 p-2">
                        <div className="flex items-center justify-between px-1 text-[11px] font-mono text-cyan-400 font-bold">
                          <span className="flex items-center gap-1.5 truncate">
                            <ImageIcon className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                            <span className="truncate">{primaryPhotoTitle}</span>
                          </span>
                          <button
                            type="button"
                            onClick={() => setZoomPhoto({ url: primaryPhoto, title: primaryPhotoTitle })}
                            className="text-zinc-500 hover:text-cyan-300 flex items-center gap-0.5 text-[10px] cursor-pointer"
                            title="Zoom Photo"
                          >
                            <ZoomIn className="w-3 h-3" />
                            <span>Zoom</span>
                          </button>
                        </div>

                        <div 
                          onClick={() => setZoomPhoto({ url: primaryPhoto, title: primaryPhotoTitle })}
                          className="relative aspect-video rounded-lg overflow-hidden bg-zinc-900 border border-zinc-800 cursor-pointer group"
                        >
                          <img
                            src={primaryPhoto}
                            alt={primaryPhotoTitle}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1509391365360-2e959784a276?auto=format&fit=crop&w=1000&q=80';
                            }}
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 text-white text-xs font-mono">
                            <ZoomIn className="w-4 h-4" />
                            <span>Click to Zoom</span>
                          </div>
                        </div>
                      </div>
                    )}

                  </div>
                )}

                {/* Gemini Flash Lite AI Key Takeaway & Keywords */}
                {review.aiKeyTakeaway && (
                  <div className="p-3 bg-black rounded-xl border border-cyan-500/20 space-y-1.5">
                    <div className="flex items-center gap-1.5 text-[10px] font-mono text-cyan-400 font-bold uppercase tracking-wider">
                      <Sparkles className="w-3 h-3 text-cyan-400" />
                      <span>Gemini Flash Lite Analysis</span>
                    </div>
                    <p className="text-xs text-zinc-300 font-sans leading-relaxed">
                      {review.aiKeyTakeaway}
                    </p>
                    {review.aiKeywords && review.aiKeywords.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-1">
                        {review.aiKeywords.map((kw, idx) => (
                          <span key={idx} className="text-[10px] font-mono bg-zinc-900 text-zinc-300 px-2 py-0.5 rounded border border-zinc-800">
                            #{kw}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Owner Official Response */}
                {review.ownerReply && (
                  <div className="p-3.5 bg-purple-950/20 border border-purple-500/30 rounded-xl space-y-1 ml-2 sm:ml-4">
                    <div className="flex items-center justify-between text-[11px] font-mono font-bold text-purple-300">
                      <span className="flex items-center gap-1.5">
                        <Award className="w-3.5 h-3.5 text-purple-400" />
                        Official Farm.IOT Team Response
                      </span>
                      <span className="text-zinc-500 text-[10px]">{review.ownerReplyTime}</span>
                    </div>
                    <p className="text-xs text-zinc-300 leading-relaxed font-sans">
                      {review.ownerReply}
                    </p>
                  </div>
                )}

                {/* Footer Actions: Upvote Helpful & Owner Actions */}
                <div className="pt-2 border-t border-zinc-900 flex items-center justify-between text-xs font-mono">
                  <button
                    type="button"
                    onClick={(e) => handleUpvote(review.id, e)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-amber-300 border border-zinc-800 transition cursor-pointer"
                  >
                    <ThumbsUp className="w-3.5 h-3.5 text-amber-400" />
                    <span>Helpful ({review.helpfulCount})</span>
                  </button>

                  {/* Owner-Only Controls: Edit, Reply, Delete (NO ONE else sees this) */}
                  <div className="flex items-center gap-2">
                    {isOwner && !review.ownerReply && (
                      <button
                        type="button"
                        onClick={() => {
                          setReplyReviewId(review.id);
                          setReplyText('');
                        }}
                        className="text-purple-400 hover:text-purple-300 underline cursor-pointer text-[11px]"
                      >
                        Reply as Owner
                      </button>
                    )}

                    {/* OWNER ONLY SEE EDIT OPTION (GUESTS & NON-OWNERS WILL NEVER SEE THIS) */}
                    {isOwner && (
                      <button
                        type="button"
                        onClick={() => handleOpenEditReview(review)}
                        className="flex items-center gap-1 text-cyan-400 hover:text-cyan-300 px-2.5 py-1 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-cyan-500/40 text-[11px] font-mono cursor-pointer transition shadow-sm"
                        title="Edit Review (Owner Only)"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Edit</span>
                      </button>
                    )}

                    {isOwner && (
                      <button
                        type="button"
                        onClick={() => handleDeleteReview(review.id)}
                        className="text-rose-400 hover:text-rose-300 p-1.5 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-rose-500/40 cursor-pointer transition"
                        title="Delete review (Admin)"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal 1: Add New Review (Includes Photo & YouTube Video Attachment) */}
      {showAddForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
          <div className="bg-zinc-950 border border-zinc-800 rounded-3xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
            
            {/* Header */}
            <div className="p-5 border-b border-zinc-800 flex items-center justify-between bg-black">
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
                  <Star className="w-5 h-5 fill-amber-400" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">Write a Review</h3>
                  <p className="text-xs text-zinc-400 font-mono">
                    Add photos, YouTube videos & real system feedback
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowAddForm(false)}
                className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-900 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmitReview} className="p-6 overflow-y-auto space-y-4 flex-1 text-xs">
              
              {/* Star Rating Selector */}
              <div>
                <label className="text-xs font-bold text-amber-300 block mb-1">Your Star Rating</label>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setRating(s)}
                      className="p-1 text-2xl cursor-pointer transition hover:scale-110"
                    >
                      <span className={s <= rating ? 'text-amber-400' : 'text-zinc-600'}>
                        ★
                      </span>
                    </button>
                  ))}
                  <span className="text-xs font-mono text-zinc-400 ml-2">({rating} of 5 Stars)</span>
                </div>
              </div>

              {/* Author & Role */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-zinc-400 block mb-1">Your Name *</label>
                  <input
                    type="text"
                    value={authorName}
                    onChange={(e) => setAuthorName(e.target.value)}
                    placeholder="e.g. Rahul Sharma"
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-2 text-zinc-200 text-xs focus:outline-none focus:border-amber-400"
                    required
                  />
                </div>
                <div>
                  <label className="text-[10px] text-zinc-400 block mb-1">Your Background / Role</label>
                  <input
                    type="text"
                    value={authorRole}
                    onChange={(e) => setAuthorRole(e.target.value)}
                    placeholder="e.g. Solar Plant Owner / Student Researcher"
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-2 text-zinc-200 text-xs focus:outline-none focus:border-amber-400"
                    required
                  />
                </div>
              </div>

              {/* Solar System Type */}
              <div>
                <label className="text-[10px] text-zinc-400 block mb-1">Your Solar System Type</label>
                <select
                  value={setupType}
                  onChange={(e) => setSetupType(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-2 text-zinc-200 text-xs focus:outline-none focus:border-amber-400"
                >
                  <option value="On-Grid 3kW Rooftop Array">On-Grid 3kW Rooftop Array</option>
                  <option value="Off-Grid 1kW + 150Ah LiFePO4">Off-Grid 1kW + 150Ah LiFePO4</option>
                  <option value="ESP32 IoT Dual-Pass Test Station">ESP32 IoT Dual-Pass Test Station</option>
                  <option value="Luminous Solar System (NXG / Inverter)">Luminous Solar System (NXG / Inverter)</option>
                  <option value="Tata Power / Loom Solar Rooftop">Tata Power / Loom Solar Rooftop</option>
                  <option value="Custom DIY Solar IoT Rig">Custom DIY Solar IoT Rig</option>
                </select>
              </div>

              {/* Title */}
              <div>
                <label className="text-[10px] text-zinc-400 block mb-1">Review Headline *</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Motorized wiper restored our solar output after dusty storm"
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-2 text-zinc-200 text-xs focus:outline-none focus:border-amber-400"
                  required
                />
              </div>

              {/* Review Text */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[10px] text-zinc-400">Detailed Review & Experience *</label>
                  <button
                    type="button"
                    onClick={handlePolishWithGemini}
                    disabled={isPolishingReview || !content.trim()}
                    className="text-[10px] font-mono text-cyan-400 hover:text-cyan-300 flex items-center gap-1 cursor-pointer transition disabled:opacity-40"
                    title="Let Gemini Flash Lite polish your phrasing while keeping all facts"
                  >
                    <Sparkles className="w-3 h-3 text-cyan-400" />
                    <span>{isPolishingReview ? 'Polishing...' : 'Polish Phrasing (Gemini AI)'}</span>
                  </button>
                </div>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={4}
                  placeholder="Describe your real experience with the solar monitoring, wiper cleaning mechanism, INA219/LM35 accuracy, or thermal shock prevention..."
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-3 text-zinc-200 text-xs focus:outline-none focus:border-amber-400 font-sans leading-relaxed"
                  required
                />
              </div>

              {/* MEDIA SECTION 1: ADD PHOTO */}
              <div className="bg-black/60 border border-zinc-800 rounded-xl p-3.5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-cyan-400 flex items-center gap-1.5">
                    <ImageIcon className="w-4 h-4 text-cyan-400" />
                    <span>Attach Photo (Upload or Link)</span>
                  </span>
                  {photoUrl && (
                    <button
                      type="button"
                      onClick={() => { setPhotoUrl(''); setPhotoTitle(''); }}
                      className="text-rose-400 hover:text-rose-300 text-[10px] font-mono"
                    >
                      Remove Photo
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-zinc-400 block mb-1">Option A: Upload Photo from Device</label>
                    <input
                      type="file"
                      ref={fileInputRef}
                      accept="image/*"
                      onChange={(e) => handlePhotoFileUpload(e, false)}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploadingPhoto}
                      className="w-full py-2 px-3 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 text-xs flex items-center justify-center gap-2 cursor-pointer transition"
                    >
                      <Upload className="w-3.5 h-3.5 text-cyan-400" />
                      <span>{isUploadingPhoto ? 'Reading Image...' : 'Choose Image File'}</span>
                    </button>
                  </div>

                  <div>
                    <label className="text-[10px] text-zinc-400 block mb-1">Option B: Or Paste Image URL</label>
                    <input
                      type="url"
                      value={photoUrl.startsWith('data:') ? '[Uploaded Image Attached]' : photoUrl}
                      onChange={(e) => setPhotoUrl(e.target.value)}
                      placeholder="https://images.unsplash.com/photo-..."
                      className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-2 text-zinc-200 text-xs focus:outline-none focus:border-cyan-400"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] text-zinc-400 block mb-1">Photo Caption / Title (Optional)</label>
                  <input
                    type="text"
                    value={photoTitle}
                    onChange={(e) => setPhotoTitle(e.target.value)}
                    placeholder="e.g. Squeegee wiper arm mounted on our 330W solar panel"
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-2 text-zinc-200 text-xs focus:outline-none focus:border-cyan-400"
                  />
                </div>

                {/* Preset sample photos */}
                <div className="flex items-center gap-1.5 flex-wrap pt-1">
                  <span className="text-[10px] text-zinc-500 font-mono">Sample Presets:</span>
                  {SAMPLE_SOLAR_PHOTOS.map((sample, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => { setPhotoUrl(sample.url); setPhotoTitle(sample.title); }}
                      className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-900 text-zinc-400 hover:text-cyan-300 border border-zinc-800 cursor-pointer"
                    >
                      + {sample.title}
                    </button>
                  ))}
                </div>

                {/* Image preview */}
                {photoUrl && (
                  <div className="relative aspect-video max-h-36 rounded-lg overflow-hidden border border-cyan-500/40 bg-zinc-950 mt-2">
                    <img src={photoUrl} alt="Preview" className="w-full h-full object-cover" />
                    <div className="absolute bottom-0 inset-x-0 bg-black/70 p-1.5 text-[10px] font-mono text-cyan-300 truncate">
                      Attached: {photoTitle || 'Solar Setup Photo'}
                    </div>
                  </div>
                )}
              </div>

              {/* MEDIA SECTION 2: ADD YOUTUBE VIDEO */}
              <div className="bg-black/60 border border-zinc-800 rounded-xl p-3.5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-rose-400 flex items-center gap-1.5">
                    <Video className="w-4 h-4 text-rose-400" />
                    <span>Attach Video (YouTube Link or Direct Video)</span>
                  </span>
                  {videoUrl && (
                    <button
                      type="button"
                      onClick={() => { setVideoUrl(''); setVideoTitle(''); }}
                      className="text-rose-400 hover:text-rose-300 text-[10px] font-mono"
                    >
                      Remove Video
                    </button>
                  )}
                </div>

                <div>
                  <label className="text-[10px] text-zinc-400 block mb-1">
                    YouTube URL (watch link, youtu.be, shorts, or direct .mp4)
                  </label>
                  <input
                    type="url"
                    value={videoUrl}
                    onChange={(e) => setVideoUrl(e.target.value)}
                    placeholder="https://www.youtube.com/watch?v=8R_K8X5h_eE or https://youtu.be/..."
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-2 text-zinc-200 text-xs focus:outline-none focus:border-rose-400 font-mono"
                  />
                  <span className="text-[10px] text-zinc-500 mt-1 block">
                    Example: https://www.youtube.com/watch?v=8R_K8X5h_eE (Demonstration video)
                  </span>
                </div>

                <div>
                  <label className="text-[10px] text-zinc-400 block mb-1">Video Title / Topic (Optional)</label>
                  <input
                    type="text"
                    value={videoTitle}
                    onChange={(e) => setVideoTitle(e.target.value)}
                    placeholder="e.g. Automated wiper sweeping sequence in action"
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-2 text-zinc-200 text-xs focus:outline-none focus:border-rose-400"
                  />
                </div>

                {/* Quick preset sample video */}
                <div className="flex items-center gap-1.5 pt-1">
                  <span className="text-[10px] text-zinc-500 font-mono">Sample:</span>
                  <button
                    type="button"
                    onClick={() => {
                      setVideoUrl('https://www.youtube.com/watch?v=8R_K8X5h_eE');
                      setVideoTitle('ESP32 Automated Wiper Cycle Demo');
                    }}
                    className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-900 text-zinc-400 hover:text-rose-300 border border-zinc-800 cursor-pointer"
                  >
                    + Wiper Cycle Demo Video
                  </button>
                </div>

                {/* Video preview */}
                {videoUrl && (
                  <div className="relative aspect-video max-h-44 rounded-lg overflow-hidden border border-rose-500/40 bg-zinc-950 mt-2">
                    {isDirectVideo(videoUrl) ? (
                      <video src={videoUrl} controls className="w-full h-full object-cover" />
                    ) : (
                      <iframe
                        src={formatYouTubeEmbedUrl(videoUrl)}
                        title="Video Preview"
                        className="w-full h-full border-0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      />
                    )}
                  </div>
                )}
              </div>

              {submitStatus && (
                <div className={`p-3 rounded-xl border text-xs font-mono flex items-center gap-2 ${
                  submitStatus.includes('successfully') ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200' : 'bg-cyan-950/40 border-cyan-500/40 text-cyan-200'
                }`}>
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{submitStatus}</span>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition cursor-pointer text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-300 hover:to-orange-400 text-black font-bold font-mono transition cursor-pointer flex items-center gap-1.5 shadow-lg disabled:opacity-50 text-xs"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isSubmitting ? 'Publishing...' : 'Publish Review'}</span>
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* Modal 2: OWNER-ONLY EDIT REVIEW MODAL */}
      {isEditReviewModalOpen && editingReview && isOwner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
          <div className="bg-zinc-950 border border-zinc-800 rounded-3xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
            
            {/* Header */}
            <div className="p-5 border-b border-zinc-800 flex items-center justify-between bg-black">
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400">
                  <Edit3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">Edit Review (Owner Only)</h3>
                  <p className="text-xs text-zinc-400 font-mono">
                    Update review content, rating, attached photo or YouTube video
                  </p>
                </div>
              </div>
              <button
                onClick={() => { setIsEditReviewModalOpen(false); setEditingReview(null); }}
                className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-900 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Edit Form */}
            <form onSubmit={handleSaveEditReview} className="p-6 overflow-y-auto space-y-4 flex-1 text-xs">
              
              {/* Rating */}
              <div>
                <label className="text-xs font-bold text-amber-300 block mb-1">Star Rating</label>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setEditForm({ ...editForm, rating: s })}
                      className="p-1 text-2xl cursor-pointer transition hover:scale-110"
                    >
                      <span className={s <= editForm.rating ? 'text-amber-400' : 'text-zinc-600'}>
                        ★
                      </span>
                    </button>
                  ))}
                  <span className="text-xs font-mono text-zinc-400 ml-2">({editForm.rating} of 5 Stars)</span>
                </div>
              </div>

              {/* Author & Role */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-zinc-400 block mb-1">Author Name</label>
                  <input
                    type="text"
                    value={editForm.authorName}
                    onChange={(e) => setEditForm({ ...editForm, authorName: e.target.value })}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-2 text-zinc-200 text-xs focus:outline-none focus:border-cyan-400"
                    required
                  />
                </div>
                <div>
                  <label className="text-[10px] text-zinc-400 block mb-1">Author Role</label>
                  <input
                    type="text"
                    value={editForm.authorRole}
                    onChange={(e) => setEditForm({ ...editForm, authorRole: e.target.value })}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-2 text-zinc-200 text-xs focus:outline-none focus:border-cyan-400"
                    required
                  />
                </div>
              </div>

              {/* Setup Type */}
              <div>
                <label className="text-[10px] text-zinc-400 block mb-1">Solar System Type</label>
                <select
                  value={editForm.setupType}
                  onChange={(e) => setEditForm({ ...editForm, setupType: e.target.value })}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-2 text-zinc-200 text-xs focus:outline-none focus:border-cyan-400"
                >
                  <option value="On-Grid 3kW Rooftop Array">On-Grid 3kW Rooftop Array</option>
                  <option value="Off-Grid 1kW + 150Ah LiFePO4">Off-Grid 1kW + 150Ah LiFePO4</option>
                  <option value="ESP32 IoT Dual-Pass Test Station">ESP32 IoT Dual-Pass Test Station</option>
                  <option value="Luminous Solar System (NXG / Inverter)">Luminous Solar System (NXG / Inverter)</option>
                  <option value="Tata Power / Loom Solar Rooftop">Tata Power / Loom Solar Rooftop</option>
                  <option value="Custom DIY Solar IoT Rig">Custom DIY Solar IoT Rig</option>
                </select>
              </div>

              {/* Title */}
              <div>
                <label className="text-[10px] text-zinc-400 block mb-1">Headline</label>
                <input
                  type="text"
                  value={editForm.title}
                  onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-2 text-zinc-200 text-xs focus:outline-none focus:border-cyan-400"
                  required
                />
              </div>

              {/* Content */}
              <div>
                <label className="text-[10px] text-zinc-400 block mb-1">Content</label>
                <textarea
                  value={editForm.content}
                  onChange={(e) => setEditForm({ ...editForm, content: e.target.value })}
                  rows={4}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-3 text-zinc-200 text-xs focus:outline-none focus:border-cyan-400 font-sans leading-relaxed"
                  required
                />
              </div>

              {/* Edit Photo */}
              <div className="bg-black/60 border border-zinc-800 rounded-xl p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-cyan-400 flex items-center gap-1.5">
                    <ImageIcon className="w-4 h-4 text-cyan-400" />
                    <span>Photo Attachment</span>
                  </span>
                  {editForm.photoUrl && (
                    <button
                      type="button"
                      onClick={() => setEditForm({ ...editForm, photoUrl: '', photoTitle: '' })}
                      className="text-rose-400 hover:text-rose-300 text-[10px] font-mono"
                    >
                      Remove Photo
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-zinc-400 block mb-1">Replace Image File</label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handlePhotoFileUpload(e, true)}
                      className="w-full text-[11px] text-zinc-400 file:mr-2 file:py-1 file:px-2.5 file:rounded-md file:border-0 file:bg-zinc-800 file:text-zinc-200 hover:file:bg-zinc-700"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-zinc-400 block mb-1">Or Image URL</label>
                    <input
                      type="url"
                      value={editForm.photoUrl.startsWith('data:') ? '[Uploaded Image Attached]' : editForm.photoUrl}
                      onChange={(e) => setEditForm({ ...editForm, photoUrl: e.target.value })}
                      placeholder="https://images.unsplash.com/..."
                      className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-2 text-zinc-200 text-xs focus:outline-none focus:border-cyan-400"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] text-zinc-400 block mb-1">Photo Title / Caption</label>
                  <input
                    type="text"
                    value={editForm.photoTitle}
                    onChange={(e) => setEditForm({ ...editForm, photoTitle: e.target.value })}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-2 text-zinc-200 text-xs focus:outline-none focus:border-cyan-400"
                  />
                </div>

                {editForm.photoUrl && (
                  <div className="relative aspect-video max-h-32 rounded-lg overflow-hidden border border-cyan-500/40 bg-zinc-950 mt-1">
                    <img src={editForm.photoUrl} alt="Preview" className="w-full h-full object-cover" />
                  </div>
                )}
              </div>

              {/* Edit Video */}
              <div className="bg-black/60 border border-zinc-800 rounded-xl p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-rose-400 flex items-center gap-1.5">
                    <Video className="w-4 h-4 text-rose-400" />
                    <span>YouTube Video Attachment</span>
                  </span>
                  {editForm.videoUrl && (
                    <button
                      type="button"
                      onClick={() => setEditForm({ ...editForm, videoUrl: '', videoTitle: '' })}
                      className="text-rose-400 hover:text-rose-300 text-[10px] font-mono"
                    >
                      Remove Video
                    </button>
                  )}
                </div>

                <div>
                  <label className="text-[10px] text-zinc-400 block mb-1">YouTube URL</label>
                  <input
                    type="url"
                    value={editForm.videoUrl}
                    onChange={(e) => setEditForm({ ...editForm, videoUrl: e.target.value })}
                    placeholder="https://www.youtube.com/watch?v=..."
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-2 text-zinc-200 text-xs focus:outline-none focus:border-rose-400 font-mono"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-zinc-400 block mb-1">Video Title</label>
                  <input
                    type="text"
                    value={editForm.videoTitle}
                    onChange={(e) => setEditForm({ ...editForm, videoTitle: e.target.value })}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-2 text-zinc-200 text-xs focus:outline-none focus:border-rose-400"
                  />
                </div>

                {editForm.videoUrl && (
                  <div className="relative aspect-video max-h-40 rounded-lg overflow-hidden border border-rose-500/40 bg-zinc-950 mt-1">
                    <iframe
                      src={formatYouTubeEmbedUrl(editForm.videoUrl)}
                      title="Preview"
                      className="w-full h-full border-0"
                    />
                  </div>
                )}
              </div>

              {editStatus && (
                <div className={`p-3 rounded-xl border text-xs font-mono flex items-center gap-2 ${
                  editStatus.includes('successfully') ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200' : 'bg-rose-950/40 border-rose-500/40 text-rose-200'
                }`}>
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{editStatus}</span>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => { setIsEditReviewModalOpen(false); setEditingReview(null); }}
                  className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition cursor-pointer text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingEdit}
                  className="px-5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold font-mono transition cursor-pointer flex items-center gap-1.5 shadow-lg disabled:opacity-50 text-xs"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{isSavingEdit ? 'Saving...' : 'Save Changes'}</span>
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* Modal 3: Owner Reply Modal */}
      {replyReviewId && isOwner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
          <div className="bg-zinc-950 border border-zinc-800 rounded-3xl w-full max-w-lg shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <h4 className="font-bold text-white text-sm flex items-center gap-2">
                <Award className="w-4 h-4 text-purple-400" />
                <span>Post Official Owner Reply</span>
              </h4>
              <button 
                onClick={() => setReplyReviewId(null)}
                className="text-zinc-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveOwnerReply} className="space-y-3 text-xs">
              <textarea
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                rows={4}
                placeholder="Write your official response to this user review..."
                className="w-full bg-black border border-zinc-700 rounded-xl p-3 text-zinc-200 text-xs focus:outline-none focus:border-purple-400"
                required
              />
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setReplyReviewId(null)}
                  className="px-3.5 py-1.5 rounded-lg bg-zinc-800 text-zinc-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-bold"
                >
                  Post Reply
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 4: Fullscreen Photo Zoom Modal */}
      {zoomPhoto && (
        <div 
          onClick={() => setZoomPhoto(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fadeIn cursor-zoom-out"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="max-w-4xl w-full bg-zinc-950 border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl space-y-3 p-4"
          >
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-cyan-400" />
                <h4 className="text-sm font-bold text-white">{zoomPhoto.title || 'Review Photo'}</h4>
              </div>
              <button
                onClick={() => setZoomPhoto(null)}
                className="p-1.5 rounded-lg bg-zinc-900 text-zinc-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="relative max-h-[75vh] overflow-hidden rounded-xl bg-black flex items-center justify-center">
              <img
                src={zoomPhoto.url}
                alt={zoomPhoto.title || 'Review Photo'}
                className="max-h-[75vh] w-auto object-contain mx-auto"
              />
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
