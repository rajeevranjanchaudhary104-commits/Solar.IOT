import React, { useState, useRef, useEffect } from 'react';
import { 
  Sparkles, 
  Send, 
  Bot, 
  User, 
  X, 
  Minimize2, 
  Maximize2, 
  Loader2, 
  BarChart3, 
  Cpu, 
  Sun, 
  RefreshCw,
  Copy,
  Check,
  Zap,
  Clock,
  Thermometer,
  Layers,
  HelpCircle,
  TrendingUp,
  Table,
  ExternalLink,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Play,
  Square,
  Radio
} from 'lucide-react';

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
}

const VISUAL_PROMPTS = [
  { label: '📊 Dust Loss Chart', prompt: 'Explain dust soiling power loss with a visual comparison chart and numbers' },
  { label: '🌡️ Temp Derating Chart', prompt: 'Show solar panel temperature derating from 25°C to 65°C in a comparison table and chart' },
  { label: '⏰ 3 AM vs Noon Clean', prompt: 'Compare 3:00 AM nocturnal dry squeegee cleaning vs 12:00 PM water spray in a comparison table' },
  { label: '🔌 ESP32 Pinout Table', prompt: 'Show complete ESP32 GPIO pinout wiring table for INA219, LM35, FC-37, and wiper relay' },
  { label: '🔋 Battery Sizing Formula', prompt: 'Show step-by-step mathematical formula and table for sizing a solar inverter and battery' }
];

// Clean up raw LaTeX syntax and math expressions into clean readable unicode text
export function cleanLatex(input: string): string {
  if (!input) return '';
  let str = input;

  // 1. Math block delimiters $$...$$ and $...$
  str = str.replace(/\$\$([\s\S]*?)\$\$/g, (_, content) => content.trim());
  str = str.replace(/\$([^\$\n]+)\$/g, (_, content) => content.trim());

  // 2. \text{...} -> ...
  str = str.replace(/\\text\{([^}]*)\}/g, '$1');

  // 3. Fractions \frac{a}{b} -> (a) / (b)
  str = str.replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '($1) / ($2)');

  // 4. Common symbols
  str = str.replace(/\\times/g, '×');
  str = str.replace(/\\approx/g, '≈');
  str = str.replace(/\^\\circ\s*C/gi, '°C');
  str = str.replace(/\\circ/g, '°');
  str = str.replace(/\\gamma/g, 'γ');
  str = str.replace(/\\mu/g, 'µ');
  str = str.replace(/\\leq?/g, '≤');
  str = str.replace(/\\geq?/g, '≥');
  str = str.replace(/\\left\[/g, '[');
  str = str.replace(/\\right\]/g, ']');
  str = str.replace(/\\left\(/g, '(');
  str = str.replace(/\\right\)/g, ')');
  str = str.replace(/\\%/g, '%');

  // 5. Subscripts like V_{\text{mp}} or V_{mp} or V_mp -> Vmp
  str = str.replace(/([A-Za-z]+)_\{?([A-Za-z0-9]+)\}?/g, '$1$2');

  // 6. Superscripts like I^2C or I^{2}C -> I²C
  str = str.replace(/I\^\{?2\}?C/gi, 'I²C');
  str = str.replace(/\^2/g, '²');
  str = str.replace(/\^3/g, '³');

  // 7. Clean leftover backslashes in front of words or units
  str = str.replace(/\\([A-Za-z]+)/g, '$1');

  // 8. Clean double backslashes
  str = str.replace(/\\\\/g, '\\');

  return str;
}

// Prepare natural, fluent text for speech synthesis without reading messy table pipes or code blocks
export function cleanTextForSpeech(input: string): string {
  if (!input) return '';
  let str = input;

  // Replace code blocks
  str = str.replace(/```[\s\S]*?```/g, ' Technical code implementation and pinout wiring are shown on the screen. ');

  // Replace Markdown tables
  str = str.replace(/\|[^\n]+\|/g, ' ');

  // Replace progress bars like [████████░░]
  str = str.replace(/\[[█░]+\]/g, ' ');

  // Remove markdown headers #, ##, ###
  str = str.replace(/^#{1,6}\s+/gm, '');

  // Remove bold/italics
  str = str.replace(/\*\*([^*]+)\*\*/g, '$1');
  str = str.replace(/\*([^*]+)\*/g, '$1');
  str = str.replace(/__([^_]+)__/g, '$1');
  str = str.replace(/_([^_]+)_/g, '$1');

  // Remove backticks `code`
  str = str.replace(/`([^`]+)`/g, '$1');

  // Remove links [text](url) -> text
  str = str.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');

  // Convert technical symbols to spoken words
  str = str.replace(/P\s*=\s*V\s*[×*x]\s*I/gi, 'Power equals Voltage times Current');
  str = str.replace(/°C/g, ' degrees Celsius ');
  str = str.replace(/µ/g, ' micro ');
  str = str.replace(/Ω/g, ' ohms ');

  // Clean excessive whitespace & punctuation
  str = str.replace(/[:\-•*]{2,}/g, ' ');
  str = str.replace(/\s+/g, ' ').trim();

  return str;
}

// Helper to check if a row is a Markdown divider row like |:---|---|
const isTableDivider = (cells: string[]) => {
  return cells.length > 0 && cells.every(c => /^[:-\s]+$/.test(c));
};

// Helper to parse table cells safely
const parseTableCells = (str: string) => {
  let trimmed = str.trim();
  if (trimmed.startsWith('|')) trimmed = trimmed.slice(1);
  if (trimmed.endsWith('|')) trimmed = trimmed.slice(0, -1);
  return trimmed.split('|').map(c => cleanLatex(c.trim()));
};

// Helper to render markdown text with tables, code blocks, bold, lists, and visual progress bars
const FormattedMessage: React.FC<{ text: string }> = ({ text }) => {
  const renderFormattedText = (raw: string) => {
    // Split text by code blocks
    const parts = raw.split(/(```[\s\S]*?```)/g);

    return parts.map((part, pIdx) => {
      // Code Block
      if (part.startsWith('```') && part.endsWith('```')) {
        const lines = part.slice(3, -3).trim().split('\n');
        const firstLine = lines[0].trim();
        const hasLang = /^[a-zA-Z0-9_-]+$/.test(firstLine);
        const lang = hasLang ? firstLine : '';
        const code = hasLang ? lines.slice(1).join('\n') : lines.join('\n');

        return (
          <div key={pIdx} className="my-2.5 rounded-xl overflow-hidden border border-slate-700/80 bg-slate-950 font-mono text-[11px] shadow-lg">
            <div className="bg-slate-900 px-3 py-1.5 border-b border-slate-800 flex items-center justify-between text-[10px] text-slate-400">
              <span className="uppercase text-cyan-400 font-bold">{lang || 'Code / Pinout'}</span>
              <button
                type="button"
                onClick={() => navigator.clipboard.writeText(code)}
                className="hover:text-white transition flex items-center gap-1 cursor-pointer"
                title="Copy code"
              >
                <Copy className="w-3 h-3" />
                <span>Copy</span>
              </button>
            </div>
            <pre className="p-3 overflow-x-auto text-emerald-300 leading-relaxed">
              <code>{code}</code>
            </pre>
          </div>
        );
      }

      // Process normal text for Markdown tables, headers, lists, and bold text
      const lines = part.split('\n');
      const elements: React.ReactNode[] = [];
      let inTable = false;
      let tableRows: string[][] = [];

      const flushTable = (key: number) => {
        if (tableRows.length === 0) return null;
        const [headers, ...rows] = tableRows;
        // Filter out markdown divider row e.g. |:---|---|
        const dataRows = rows.filter(r => !isTableDivider(r));

        const tableNode = (
          <div key={`table_${key}`} className="my-2.5 overflow-x-auto rounded-xl border border-slate-700/80 bg-slate-950 shadow-md">
            <table className="w-full text-[11px] text-left border-collapse">
              <thead>
                <tr className="bg-slate-900/90 border-b border-slate-700 text-cyan-300 font-mono">
                  {headers.map((h, hIdx) => (
                    <th key={hIdx} className="px-3 py-2 font-bold whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 font-sans">
                {dataRows.map((r, rIdx) => (
                  <tr key={rIdx} className="hover:bg-slate-900/50 transition">
                    {r.map((c, cIdx) => (
                      <td key={cIdx} className="px-3 py-2 text-slate-300 whitespace-nowrap">
                        {c}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
        tableRows = [];
        inTable = false;
        return tableNode;
      };

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmedLine = line.trim();

        // Check if line is part of a markdown table (starts and ends with | or contains |)
        if (trimmedLine.includes('|') && trimmedLine.startsWith('|')) {
          inTable = true;
          tableRows.push(parseTableCells(trimmedLine));
          continue;
        } else if (inTable) {
          const tableElem = flushTable(i);
          if (tableElem) elements.push(tableElem);
        }

        // Markdown Headers ###
        if (trimmedLine.startsWith('### ')) {
          elements.push(
            <h4 key={i} className="font-bold text-sm text-cyan-300 mt-2.5 mb-1.5 flex items-center gap-1.5 font-mono">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              <span>{renderInlineFormatting(trimmedLine.replace('### ', ''))}</span>
            </h4>
          );
        } else if (trimmedLine.startsWith('#### ')) {
          elements.push(
            <h5 key={i} className="font-semibold text-xs text-amber-300 mt-2 mb-1 font-mono">
              {renderInlineFormatting(trimmedLine.replace('#### ', ''))}
            </h5>
          );
        }
        // Unordered bullet points
        else if (trimmedLine.startsWith('- ') || trimmedLine.startsWith('* ')) {
          elements.push(
            <div key={i} className="flex items-start space-x-2 my-1 pl-1">
              <span className="text-cyan-400 text-xs shrink-0 mt-0.5">•</span>
              <span className="text-slate-200 leading-relaxed">{renderInlineFormatting(trimmedLine.slice(2))}</span>
            </div>
          );
        }
        // Ordered lists e.g. 1. 2.
        else if (/^\d+\.\s+/.test(trimmedLine)) {
          const match = trimmedLine.match(/^(\d+)\.\s+(.*)/);
          if (match) {
            elements.push(
              <div key={i} className="flex items-start space-x-2 my-1 pl-1">
                <span className="text-amber-400 font-mono text-[11px] font-bold shrink-0 mt-0.5">{match[1]}.</span>
                <span className="text-slate-200 leading-relaxed">{renderInlineFormatting(match[2])}</span>
              </div>
            );
          }
        }
        // Empty lines
        else if (trimmedLine === '') {
          elements.push(<div key={i} className="h-1.5" />);
        }
        // Regular paragraphs
        else {
          elements.push(
            <p key={i} className="my-1 text-slate-200 leading-relaxed">
              {renderInlineFormatting(line)}
            </p>
          );
        }
      }

      if (inTable) {
        const tableElem = flushTable(lines.length + 100);
        if (tableElem) elements.push(tableElem);
      }

      return <div key={pIdx}>{elements}</div>;
    });
  };

  // Helper for inline bold, code, math symbols, links, and highlight badges
  const renderInlineFormatting = (rawText: string) => {
    const text = cleanLatex(rawText);

    // Parse inline code `code`
    const codeParts = text.split(/(`[^`]+`)/g);

    return codeParts.map((part, idx) => {
      if (part.startsWith('`') && part.endsWith('`')) {
        return (
          <code key={idx} className="px-1.5 py-0.5 mx-0.5 rounded bg-slate-900 border border-slate-700 text-cyan-300 font-mono text-[11px]">
            {part.slice(1, -1)}
          </code>
        );
      }

      // Parse Markdown links [label](url)
      const linkParts = part.split(/(\[[^\]]+\]\([^)]+\))/g);

      return linkParts.map((lPart, lIdx) => {
        const linkMatch = lPart.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
        if (linkMatch) {
          const [, label, url] = linkMatch;
          return (
            <a
              key={`link_${idx}_${lIdx}`}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 px-1.5 py-0.5 mx-0.5 rounded bg-cyan-950/80 text-cyan-300 hover:text-white border border-cyan-500/40 font-semibold underline underline-offset-2 transition text-[11px]"
            >
              <span>{label}</span>
              <ExternalLink className="w-2.5 h-2.5 inline" />
            </a>
          );
        }

        // Parse bold **text**
        const boldParts = lPart.split(/(\*\*[^*]+\*\*)/g);
        return boldParts.map((bPart, bIdx) => {
          if (bPart.startsWith('**') && bPart.endsWith('**')) {
            return (
              <strong key={`b_${idx}_${lIdx}_${bIdx}`} className="font-bold text-white">
                {bPart.slice(2, -2)}
              </strong>
            );
          }
          return bPart;
        });
      });
    });
  };

  return <div className="space-y-1 text-xs">{renderFormattedText(text)}</div>;
};

export const SolarAiAssistant: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Voice Options State
  const [isListening, setIsListening] = useState<boolean>(false);
  const [speechLang, setSpeechLang] = useState<'en-IN' | 'en-US' | 'hi-IN'>('en-IN');
  const [speechError, setSpeechError] = useState<string | null>(null);
  const [isAutoSpeak, setIsAutoSpeak] = useState<boolean>(false);
  const [currentlySpeakingId, setCurrentlySpeakingId] = useState<string | null>(null);
  const [speechRate, setSpeechRate] = useState<number>(1.0);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceUri, setSelectedVoiceUri] = useState<string>('');

  const recognitionRef = useRef<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome_1',
      sender: 'assistant',
      text: "👋 Hello! I am **Farm.Ai**, your intelligent solar engineering & IoT assistant powered by Google Gemini.\n\nI can explain solar engineering with **visual charts, comparison tables, mathematical formulas, and ESP32 pinouts**.\n\n🎙️ **Voice Option Active**: You can ask questions by clicking the microphone button to speak, or listen to any answer read aloud with voice narration!\n\nTry asking me a question or tap the microphone below:",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }
  ]);

  // Load browser speech synthesis voices
  useEffect(() => {
    if ('speechSynthesis' in window) {
      const updateVoices = () => {
        const vList = window.speechSynthesis.getVoices();
        setAvailableVoices(vList);
        if (!selectedVoiceUri && vList.length > 0) {
          const defaultVoice = vList.find(v => v.lang.includes('en-IN')) || 
                               vList.find(v => v.lang.startsWith('en')) || 
                               vList[0];
          if (defaultVoice) setSelectedVoiceUri(defaultVoice.voiceURI);
        }
      };
      updateVoices();
      window.speechSynthesis.onvoiceschanged = updateVoices;
    }
  }, [selectedVoiceUri]);

  // Initialize Speech Recognition for Voice Input
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = speechLang;

      recognition.onstart = () => {
        setIsListening(true);
        setSpeechError(null);
      };

      recognition.onresult = (event: any) => {
        let currentTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          currentTranscript += event.results[i][0].transcript;
        }
        if (currentTranscript) {
          setPrompt(currentTranscript);
        }
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition error event:', event.error);
        if (event.error !== 'no-speech') {
          setSpeechError(`Voice input: ${event.error}`);
        }
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {}
      }
    };
  }, [speechLang]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (isOpen && !isMinimized) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen, isMinimized]);

  // Speak text aloud using browser SpeechSynthesis
  const speakText = (msgId: string, rawText: string) => {
    if (!('speechSynthesis' in window)) return;

    if (currentlySpeakingId === msgId) {
      window.speechSynthesis.cancel();
      setCurrentlySpeakingId(null);
      return;
    }

    window.speechSynthesis.cancel();
    const spokenText = cleanTextForSpeech(rawText);
    if (!spokenText) return;

    const utterance = new SpeechSynthesisUtterance(spokenText);
    utterance.rate = speechRate;
    utterance.pitch = 1.0;

    if (selectedVoiceUri && availableVoices.length > 0) {
      const matched = availableVoices.find(v => v.voiceURI === selectedVoiceUri);
      if (matched) utterance.voice = matched;
    }

    utterance.onstart = () => {
      setCurrentlySpeakingId(msgId);
    };

    utterance.onend = () => {
      setCurrentlySpeakingId(null);
    };

    utterance.onerror = () => {
      setCurrentlySpeakingId(null);
    };

    window.speechSynthesis.speak(utterance);
  };

  const stopSpeaking = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setCurrentlySpeakingId(null);
  };

  // Toggle Microphone Listening
  const toggleListening = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setSpeechError('Web Speech API is not supported in this browser. Please use Chrome, Edge or Safari.');
      setTimeout(() => setSpeechError(null), 4000);
      return;
    }

    if (isListening) {
      try {
        recognitionRef.current?.stop();
      } catch {}
      setIsListening(false);
    } else {
      try {
        setSpeechError(null);
        // Stop any active speech before listening
        stopSpeaking();
        recognitionRef.current?.start();
      } catch (err: any) {
        console.warn('Speech start error:', err);
        setIsListening(false);
      }
    }
  };

  const handleSend = async (customPrompt?: string) => {
    const textToSend = (customPrompt || prompt).trim();
    if (!textToSend || loading) return;

    if (isListening) {
      try {
        recognitionRef.current?.stop();
      } catch {}
      setIsListening(false);
    }

    const userMsg: ChatMessage = {
      id: `user_${Date.now()}`,
      sender: 'user',
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!customPrompt) setPrompt('');
    setLoading(true);

    try {
      const response = await fetch('/api/gemini/solar-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          prompt: textToSend,
          context: {
            app: "Farm.Ai Smart Energy & IoT Microgrid",
            schedule: "03:00 AM Daily Auto-Clean",
            hardware: "ESP32, INA219 (0x40), LM35, BMP280, Windmill Hall Sensor (GPIO 34), Wiper (GPIO 27)",
            model: "gemini-3.1-flash-lite"
          }
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to get response from Farm.Ai');
      }

      const botReply = data.reply || "I couldn't generate a response at this moment.";
      const botMsgId = `bot_${Date.now()}`;
      const botMsg: ChatMessage = {
        id: botMsgId,
        sender: 'assistant',
        text: botReply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, botMsg]);

      // If Auto-Speak voice option is enabled, read aloud the response
      if (isAutoSpeak) {
        speakText(botMsgId, botReply);
      }
    } catch (err: any) {
      let friendlyError = err.message || 'Unable to communicate with the Farm.Ai server. Please try again in a moment.';
      try {
        if (friendlyError.includes('{')) {
          const parsed = JSON.parse(friendlyError);
          if (parsed?.error?.message) {
            friendlyError = parsed.error.message;
          }
        }
      } catch {}

      if (friendlyError.includes('503') || friendlyError.includes('high demand') || friendlyError.includes('UNAVAILABLE')) {
        friendlyError = 'The AI model is experiencing heavy traffic right now. Please wait a few seconds and try again.';
      }

      const errorMsg: ChatMessage = {
        id: `err_${Date.now()}`,
        sender: 'assistant',
        text: `⚠️ **Farm.Ai Notice**: ${friendlyError}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <>
      {/* Floating Trigger Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-40 flex items-center space-x-2 sm:space-x-2.5 px-3.5 py-2.5 sm:px-4 sm:py-3 rounded-full bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-slate-950 font-bold shadow-2xl shadow-cyan-500/30 transition-all duration-300 hover:scale-105 cursor-pointer border border-cyan-300/40"
          title="Ask Farm.Ai Engineering Assistant with Voice Option & Visual Charts"
        >
          <div className="relative">
            <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-slate-950 animate-spin" style={{ animationDuration: '4s' }} />
            <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          </div>
          <span className="text-xs font-mono font-black tracking-wide flex items-center gap-1.5">
            <span>Ask Farm.Ai</span>
            <span className="text-slate-950/80 text-[10px]">🎙️</span>
          </span>
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className={`fixed bottom-3 right-3 sm:bottom-6 sm:right-6 z-50 bg-slate-900/95 border border-cyan-500/40 rounded-2xl sm:rounded-3xl shadow-2xl backdrop-blur-xl flex flex-col overflow-hidden transition-all duration-300 ${
          isMinimized 
            ? 'w-[calc(100vw-24px)] sm:w-80 h-16' 
            : 'w-[calc(100vw-24px)] sm:w-[500px] max-w-[calc(100vw-24px)] sm:max-w-none h-[620px] sm:h-[650px] max-h-[88vh]'
        }`}>
          
          {/* Header */}
          <div className="p-3 px-4 bg-gradient-to-r from-slate-950 via-slate-900 to-cyan-950/40 border-b border-slate-800 flex items-center justify-between shrink-0">
            <div className="flex items-center space-x-2.5">
              <div className="p-2 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 text-slate-950 shadow-md">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white flex items-center gap-1.5 font-mono">
                  <span>Farm.Ai</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-cyan-400/20 text-cyan-300 border border-cyan-400/30">
                    Gemini Flash
                  </span>
                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-0.5">
                    <Mic className="w-2.5 h-2.5" />
                    Voice Ready
                  </span>
                </h4>
                <p className="text-[10px] text-slate-400 font-sans flex items-center gap-1">
                  <span>Smart Solar & IoT Engineering Assistant</span>
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-1">
              {/* Auto-Speak Narration Toggle */}
              <button
                type="button"
                onClick={() => {
                  const nextState = !isAutoSpeak;
                  setIsAutoSpeak(nextState);
                  if (!nextState) stopSpeaking();
                }}
                className={`p-1.5 px-2 rounded-lg text-[10px] font-mono flex items-center gap-1 transition cursor-pointer ${
                  isAutoSpeak 
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 font-bold' 
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
                title={isAutoSpeak ? "Auto-Speak Narration ON: Farm.Ai reads answers aloud automatically" : "Auto-Speak Narration OFF"}
              >
                {isAutoSpeak ? <Volume2 className="w-3.5 h-3.5 text-cyan-400" /> : <VolumeX className="w-3.5 h-3.5" />}
                <span className="hidden sm:inline">Voice {isAutoSpeak ? 'ON' : 'OFF'}</span>
              </button>

              {/* Stop Speaking button if active */}
              {currentlySpeakingId && (
                <button
                  type="button"
                  onClick={stopSpeaking}
                  className="p-1.5 text-rose-400 hover:text-rose-300 rounded-lg hover:bg-rose-950/50 transition cursor-pointer flex items-center gap-1 text-[10px]"
                  title="Stop voice speech playback"
                >
                  <Square className="w-3 h-3 fill-current" />
                  <span className="hidden sm:inline">Stop</span>
                </button>
              )}

              {/* Minimize */}
              <button
                onClick={() => setIsMinimized(!isMinimized)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
                title={isMinimized ? "Maximize" : "Minimize"}
              >
                {isMinimized ? <Maximize2 className="w-3.5 h-3.5" /> : <Minimize2 className="w-3.5 h-3.5" />}
              </button>
              {/* Close */}
              <button
                onClick={() => {
                  stopSpeaking();
                  setIsOpen(false);
                }}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {!isMinimized && (
            <>
              {/* Messages Body */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
                {messages.map((msg) => {
                  const isSpeakingThis = currentlySpeakingId === msg.id;

                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
                    >
                      <div className="flex items-center space-x-1.5 text-[10px] font-mono text-slate-500 mb-1">
                        {msg.sender === 'assistant' ? (
                          <>
                            <Bot className="w-3 h-3 text-cyan-400" />
                            <span className="text-cyan-300 font-semibold">Farm.Ai</span>
                            {isSpeakingThis && (
                              <span className="text-emerald-400 font-bold flex items-center gap-1 animate-pulse">
                                <Radio className="w-3 h-3" />
                                <span>Speaking...</span>
                              </span>
                            )}
                          </>
                        ) : (
                          <>
                            <span className="text-slate-300 font-semibold">You</span>
                            <User className="w-3 h-3 text-emerald-400" />
                          </>
                        )}
                        <span>• {msg.timestamp}</span>
                      </div>

                      <div className={`p-3.5 rounded-2xl max-w-[92%] text-xs leading-relaxed group relative shadow-lg ${
                        msg.sender === 'user'
                          ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-tr-sm'
                          : isSpeakingThis
                            ? 'bg-slate-950/95 border-2 border-cyan-400/80 text-slate-200 rounded-tl-sm ring-2 ring-cyan-500/20'
                            : 'bg-slate-950/90 border border-slate-800 text-slate-200 rounded-tl-sm'
                      }`}>
                        {msg.sender === 'assistant' ? (
                          <FormattedMessage text={msg.text} />
                        ) : (
                          <div className="whitespace-pre-wrap font-sans font-medium">
                            {msg.text}
                          </div>
                        )}

                        {/* Action buttons (Copy + Speak) */}
                        <div className="absolute bottom-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {/* Speak / Listen Aloud button for assistant */}
                          {msg.sender === 'assistant' && (
                            <button
                              type="button"
                              onClick={() => speakText(msg.id, msg.text)}
                              className={`p-1.5 rounded-lg text-slate-300 hover:text-white transition cursor-pointer shadow-md ${
                                isSpeakingThis 
                                  ? 'bg-rose-500/80 text-white' 
                                  : 'bg-slate-900/90 hover:bg-cyan-950 text-cyan-400'
                              }`}
                              title={isSpeakingThis ? "Stop Voice Narration" : "Listen / Read Aloud"}
                            >
                              {isSpeakingThis ? <Square className="w-3 h-3 fill-current" /> : <Volume2 className="w-3 h-3" />}
                            </button>
                          )}

                          {/* Quick copy message */}
                          <button
                            type="button"
                            onClick={() => handleCopy(msg.id, msg.text)}
                            className="p-1.5 rounded-lg bg-slate-900/90 text-slate-400 hover:text-white transition cursor-pointer shadow-md"
                            title="Copy text"
                          >
                            {copiedId === msg.id ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {loading && (
                  <div className="flex items-center space-x-2 text-xs text-cyan-400 p-2.5 bg-slate-950/80 rounded-xl border border-cyan-500/20 w-fit animate-pulse">
                    <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
                    <span className="font-mono text-[11px]">Farm.Ai is generating visual charts & answer...</span>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Speech Error Banner if permission or unsupported */}
              {speechError && (
                <div className="px-3 py-1.5 bg-rose-950/80 border-t border-rose-500/40 text-rose-300 text-[11px] font-mono flex items-center justify-between">
                  <span>{speechError}</span>
                  <button onClick={() => setSpeechError(null)} className="text-rose-400 hover:text-white">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}

              {/* Listening Active Indicator Banner */}
              {isListening && (
                <div className="px-3 py-2 bg-gradient-to-r from-red-950 via-rose-950 to-slate-950 border-t border-rose-500/50 flex items-center justify-between text-xs font-mono text-rose-200 animate-pulse">
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <Mic className="w-4 h-4 text-rose-400" />
                      <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                    </div>
                    <span className="font-bold">Farm.Ai is listening... Speak now</span>
                    {/* Animated sound wave bars */}
                    <div className="flex items-center gap-0.5 ml-1">
                      <span className="w-0.5 h-3 bg-rose-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-0.5 h-5 bg-rose-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-0.5 h-2 bg-rose-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      <span className="w-0.5 h-4 bg-rose-400 rounded-full animate-bounce" style={{ animationDelay: '75ms' }} />
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={toggleListening}
                    className="px-2 py-0.5 rounded bg-rose-500 text-slate-950 font-bold text-[10px] hover:bg-rose-400 transition"
                  >
                    Done Speaking
                  </button>
                </div>
              )}

              {/* Quick Visual Chart Prompts Toolbar */}
              <div className="px-3 py-2 border-t border-slate-800/80 bg-slate-950/60 shrink-0">
                <div className="text-[10px] font-mono text-slate-400 mb-1 flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <BarChart3 className="w-3 h-3 text-cyan-400" />
                    <span>Instant Visual Charts & Explanations:</span>
                  </span>
                  <div className="flex items-center gap-2">
                    {/* Voice Language Selector */}
                    <button
                      type="button"
                      onClick={() => setSpeechLang(speechLang === 'en-IN' ? 'hi-IN' : 'en-IN')}
                      className="text-[9px] px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700 text-cyan-300 hover:border-cyan-400 transition cursor-pointer"
                      title="Toggle Voice Speech Language between English & Hindi"
                    >
                      Mic: {speechLang === 'en-IN' ? 'English (IN)' : 'Hindi (IN)'}
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 overflow-x-auto py-0.5 scrollbar-none text-[10px]">
                  {VISUAL_PROMPTS.map((vp, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSend(vp.prompt)}
                      disabled={loading}
                      className="whitespace-nowrap px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-cyan-950 text-cyan-300 hover:text-cyan-200 border border-cyan-500/30 hover:border-cyan-400/60 transition cursor-pointer shrink-0 disabled:opacity-50 font-mono shadow-sm"
                    >
                      {vp.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Input Bar with Voice Input & Send */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSend();
                }}
                className="p-3 border-t border-slate-800 bg-slate-950 flex items-center space-x-2 shrink-0"
              >
                <input
                  type="text"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder={isListening ? "Listening to your voice... Speak now" : "Ask Farm.Ai anything or tap mic to speak..."}
                  className={`flex-1 bg-slate-900 border rounded-xl px-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none transition ${
                    isListening ? 'border-rose-500 ring-1 ring-rose-500/40 bg-rose-950/20' : 'border-slate-700 focus:border-cyan-400'
                  }`}
                  disabled={loading}
                />

                {/* Microphone Voice Input Button */}
                <button
                  type="button"
                  onClick={toggleListening}
                  disabled={loading}
                  className={`p-2.5 px-3 rounded-xl transition cursor-pointer shadow-md flex items-center justify-center ${
                    isListening
                      ? 'bg-rose-500 hover:bg-rose-600 text-white animate-pulse ring-2 ring-rose-400/50'
                      : 'bg-slate-900 hover:bg-cyan-950 text-cyan-400 border border-cyan-500/40 hover:border-cyan-400'
                  }`}
                  title={isListening ? "Click to stop voice recording" : "Speak to Farm.Ai (Voice Speech-to-Text)"}
                >
                  {isListening ? (
                    <MicOff className="w-4 h-4 text-white" />
                  ) : (
                    <Mic className="w-4 h-4 text-cyan-400" />
                  )}
                </button>

                {/* Send Button */}
                <button
                  type="submit"
                  disabled={!prompt.trim() || loading}
                  className="p-2.5 px-3.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold transition cursor-pointer disabled:opacity-40 shadow-md shadow-cyan-500/20"
                  title="Send to Farm.Ai"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </>
          )}

        </div>
      )}
    </>
  );
};

// Backwards-compatibility alias for existing code
export const GeminiAssistant = SolarAiAssistant;
