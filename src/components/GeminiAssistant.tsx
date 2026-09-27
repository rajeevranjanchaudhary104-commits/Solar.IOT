import React, { useState, useRef, useEffect } from 'react';
import { 
  Sparkles, 
  Send, 
  Bot, 
  User, 
  X, 
  Minimize2, 
  Maximize2, 
  HelpCircle, 
  Loader2, 
  Cpu, 
  Sun, 
  RefreshCw,
  Copy,
  Check
} from 'lucide-react';

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
}

const SUGGESTED_PROMPTS = [
  "Why do we clean solar panels at 3:00 AM instead of noon?",
  "How do INA219 and LM35 connect to ESP32 / ESP-01?",
  "How does FC-37 rain sensor prevent water waste?",
  "Help me write an abstract for our student solar project",
];

export const GeminiAssistant: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome_1',
      sender: 'assistant',
      text: "👋 Hello! I am the **Solar.IOT Engineering Assistant**, powered by Google Gemini. I can assist you with photovoltaic physics, ESP32/ESP-01 wiring, 3:00 AM automated cleaning logic, sensor calibration (INA219, LM35, FC-37), or your school research project. How can I help you today?",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && !isMinimized) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen, isMinimized]);

  const handleSend = async (customPrompt?: string) => {
    const textToSend = (customPrompt || prompt).trim();
    if (!textToSend || loading) return;

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
            app: "Solar.IOT Automated Station",
            schedule: "03:00 AM Daily Auto-Clean",
            hardware: "ESP32, INA219, LM35, FC-37, Silicone Wiper on GPIO 27"
          }
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to get response from Gemini AI');
      }

      const botMsg: ChatMessage = {
        id: `bot_${Date.now()}`,
        sender: 'assistant',
        text: data.reply || "I couldn't generate a response at this moment.",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: `err_${Date.now()}`,
        sender: 'assistant',
        text: `⚠️ **AI Notice**: ${err.message || 'Unable to communicate with the Gemini server. Please ensure the server is running.'}`,
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
          className="fixed bottom-6 right-6 z-40 flex items-center space-x-2.5 px-4 py-3 rounded-full bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-slate-950 font-bold shadow-2xl shadow-cyan-500/30 transition-all duration-300 hover:scale-105 cursor-pointer border border-cyan-300/40"
          title="Ask Gemini AI Solar Assistant"
        >
          <div className="relative">
            <Sparkles className="w-5 h-5 text-slate-950 animate-spin" style={{ animationDuration: '4s' }} />
            <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          </div>
          <span className="text-xs font-mono font-black tracking-wide">Gemini AI Help</span>
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className={`fixed bottom-6 right-6 z-50 bg-slate-900/95 border border-cyan-500/40 rounded-3xl shadow-2xl backdrop-blur-xl flex flex-col overflow-hidden transition-all duration-300 ${
          isMinimized ? 'w-80 h-16' : 'w-[94vw] sm:w-[440px] h-[580px] max-h-[85vh]'
        }`}>
          
          {/* Header */}
          <div className="p-3.5 px-4 bg-gradient-to-r from-slate-950 via-slate-900 to-cyan-950/40 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <div className="p-2 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 text-slate-950 shadow-md">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white flex items-center gap-1.5 font-mono">
                  <span>Gemini Solar Assistant</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-cyan-400/20 text-cyan-300 border border-cyan-400/30">AI</span>
                </h4>
                <p className="text-[10px] text-slate-400 font-sans">Engineering & Research Support</p>
              </div>
            </div>

            <div className="flex items-center space-x-1">
              <button
                onClick={() => setIsMinimized(!isMinimized)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
                title={isMinimized ? "Maximize" : "Minimize"}
              >
                {isMinimized ? <Maximize2 className="w-3.5 h-3.5" /> : <Minimize2 className="w-3.5 h-3.5" />}
              </button>
              <button
                onClick={() => setIsOpen(false)}
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
              <div className="flex-1 overflow-y-auto p-4 space-y-3.5 text-xs">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
                  >
                    <div className="flex items-center space-x-1 text-[10px] font-mono text-slate-500 mb-1">
                      {msg.sender === 'assistant' ? (
                        <>
                          <Bot className="w-3 h-3 text-cyan-400" />
                          <span>Gemini AI</span>
                        </>
                      ) : (
                        <>
                          <span>You</span>
                          <User className="w-3 h-3 text-emerald-400" />
                        </>
                      )}
                      <span>• {msg.timestamp}</span>
                    </div>

                    <div className={`p-3 rounded-2xl max-w-[88%] text-xs leading-relaxed group relative shadow-md ${
                      msg.sender === 'user'
                        ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-tr-sm'
                        : 'bg-slate-950/80 border border-slate-800 text-slate-200 rounded-tl-sm'
                    }`}>
                      <div className="whitespace-pre-wrap font-sans">
                        {msg.text}
                      </div>

                      {/* Quick copy message */}
                      <button
                        onClick={() => handleCopy(msg.id, msg.text)}
                        className="absolute bottom-1.5 right-1.5 p-1 rounded bg-slate-900/80 text-slate-400 opacity-0 group-hover:opacity-100 hover:text-white transition cursor-pointer"
                        title="Copy text"
                      >
                        {copiedId === msg.id ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      </button>
                    </div>
                  </div>
                ))}

                {loading && (
                  <div className="flex items-center space-x-2 text-xs text-cyan-400 p-2 bg-slate-950/60 rounded-xl border border-cyan-500/20 w-fit">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span className="font-mono text-[11px]">Gemini is analyzing solar telemetry & physics...</span>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Quick Prompts */}
              <div className="px-3 py-1.5 border-t border-slate-800/80 bg-slate-950/40">
                <div className="flex items-center gap-1.5 overflow-x-auto py-1 scrollbar-none text-[10px]">
                  {SUGGESTED_PROMPTS.map((p, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSend(p)}
                      disabled={loading}
                      className="whitespace-nowrap px-2.5 py-1 rounded-full bg-slate-800/80 hover:bg-cyan-500/20 text-slate-300 hover:text-cyan-300 border border-slate-700/80 transition cursor-pointer shrink-0 disabled:opacity-50"
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              {/* Input Bar */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSend();
                }}
                className="p-3 border-t border-slate-800 bg-slate-950 flex items-center space-x-2"
              >
                <input
                  type="text"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Ask about 3AM clean, ESP32 pins, or science..."
                  className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 transition"
                  disabled={loading}
                />
                <button
                  type="submit"
                  disabled={!prompt.trim() || loading}
                  className="p-2 px-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold transition cursor-pointer disabled:opacity-40 shadow-md shadow-cyan-500/20"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </form>
            </>
          )}

        </div>
      )}
    </>
  );
};
