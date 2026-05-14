import { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send, Bot, User, Loader2 } from 'lucide-react';
import api from '../api';

interface ChatMessage {
  role: 'bot' | 'user';
  text: string;
}

export default function GlobalChatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputVal, setInputVal] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([
        { role: 'bot', text: 'Hello! I am the AgriSmart AI Assistant. How can I help you today?' }
      ]);
    }
  }, [isOpen, messages.length]);

  const sendMessage = async () => {
    if (!inputVal.trim()) return;
    const userMsg = inputVal.trim();
    setInputVal('');
    
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setIsTyping(true);

    try {
      const currentPage = window.location.pathname;
      const res = await api.post('/chatbot', { message: userMsg, context: currentPage });
      if (res.data.success) {
        setMessages(prev => [...prev, { role: 'bot', text: res.data.reply }]);
      } else {
        setMessages(prev => [...prev, { role: 'bot', text: 'Sorry, I am having trouble connecting to the network right now.' }]);
      }
    } catch (e) {
      setMessages(prev => [...prev, { role: 'bot', text: 'Sorry, the AI network is currently unreachable.' }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="fixed z-50 bottom-6 right-6 flex flex-col items-end pointer-events-none">
      
      {/* ── Chat Window ────────────────────────────── */}
      {isOpen && (
        <div 
          className="bg-[#0f172a] border border-green-500/30 rounded-2xl w-[320px] sm:w-[380px] h-[480px] mb-4 shadow-[0_10px_40px_rgba(34,197,94,0.15)] flex flex-col overflow-hidden animate-scale-in pointer-events-auto"
          style={{ backdropFilter: 'blur(20px)' }}
        >
          {/* Header */}
          <div className="p-4 bg-[#1e293b] border-b border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-green-500/20 rounded-lg border border-green-500/30">
                <Bot className="w-5 h-5 text-green-400" />
              </div>
              <h3 className="text-white font-bold text-sm">AgriSmart AI</h3>
            </div>
            <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-white transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-gradient-to-b from-[#0f172a] to-[#0a0f1e]">
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex gap-3 max-w-[85%] ${msg.role === 'user' ? 'ml-auto flex-row-reverse' : ''}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 border ${msg.role === 'user' ? 'bg-blue-500/20 border-blue-500/30 text-blue-400' : 'bg-green-500/20 border-green-500/30 text-green-400'}`}>
                  {msg.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                </div>
                <div 
                  className={`p-3 rounded-2xl text-sm ${
                    msg.role === 'user' 
                      ? 'bg-blue-600 text-white rounded-tr-sm' 
                      : 'bg-slate-800 text-slate-200 border border-white/5 rounded-tl-sm'
                  }`}
                  style={{ wordBreak: 'break-word' }}
                >
                  {msg.text}
                </div>
              </div>
            ))}
            
            {isTyping && (
              <div className="flex gap-3 max-w-[80%]">
                <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 border bg-green-500/20 border-green-500/30 text-green-400">
                  <Bot className="w-4 h-4" />
                </div>
                <div className="p-4 rounded-2xl bg-slate-800 border border-white/5 rounded-tl-sm flex items-center gap-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-slate-500 animate-bounce" />
                  <div className="w-1.5 h-1.5 rounded-full bg-slate-500 animate-bounce" style={{ animationDelay: '0.15s' }} />
                  <div className="w-1.5 h-1.5 rounded-full bg-slate-500 animate-bounce" style={{ animationDelay: '0.3s' }} />
                </div>
              </div>
            )}
            <div ref={endRef} />
          </div>

          {/* Input Area */}
          <div className="p-3 bg-[#1e293b] border-t border-white/10">
            <form 
              onSubmit={(e) => { e.preventDefault(); sendMessage(); }}
              className="relative flex items-center"
            >
              <input
                type="text"
                value={inputVal}
                onChange={e => setInputVal(e.target.value)}
                placeholder="Ask me anything..."
                className="w-full bg-[#0f172a] border border-white/10 text-white text-sm rounded-full pl-4 pr-12 py-3 focus:outline-none focus:border-green-500/50 transition-colors"
              />
              <button 
                type="submit"
                disabled={!inputVal.trim() || isTyping}
                className="absolute right-2 p-1.5 bg-green-500 rounded-full text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-green-600 transition-colors"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── Toggle Button (Float right, positioned left of Cart if present) ──────────────────────── */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-14 h-14 rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(34,197,94,0.3)] transition-transform hover:scale-110 pointer-events-auto"
        style={{ background: 'linear-gradient(135deg, #1e293b, #0f172a)', border: '1px solid #22c55e' }}
      >
        {isOpen ? <X className="w-6 h-6 text-slate-400" /> : <MessageSquare className="w-6 h-6 text-green-400" />}
      </button>

    </div>
  );
}
