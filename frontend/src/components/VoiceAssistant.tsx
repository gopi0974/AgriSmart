import { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, Loader2, Volume2, AlertCircle } from 'lucide-react';
import api from '../api';

interface VoiceAssistantProps {
  onCommand: (command: any) => void;
  contextDistrict?: string;
}

declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
    responsiveVoice: any;
    __voiceObj: any;
  }
}

export default function VoiceAssistant({ onCommand, contextDistrict }: VoiceAssistantProps) {
  const [isListening, setIsListening]   = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSpeaking, setIsSpeaking]     = useState(false);
  const [transcript, setTranscript]     = useState('');
  const [language, setLanguage]         = useState('te-IN');
  const [errorMsg, setErrorMsg]         = useState('');
  const [supported, setSupported]       = useState(true);

  const rcRef = useRef<any>(null);
  const latestRef = useRef('');

  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) setSupported(false);
  }, []);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  const stopAllSpeech = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    // Also cancel any native speech as a fallback
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    setIsSpeaking(false);
  };

  const speak = (text: string) => {
    stopAllSpeech();
    
    // Stable Google TTS API
    const langCode = language.split('-')[0]; // "te", "hi", "en"
    const url = `https://translate.googleapis.com/translate_tts?ie=UTF-8&tl=${langCode}&client=gtx&q=${encodeURIComponent(text)}`;
    
    const audio = new Audio(url);
    audioRef.current = audio;
    
    audio.onplay = () => setIsSpeaking(true);
    audio.onended = () => {
      setIsSpeaking(false);
      audioRef.current = null;
    };
    audio.onerror = () => {
      // If audio fails, fallback to native (which may sound robotic if no voice pack is installed, but it's a safety net)
      setIsSpeaking(false);
      const u = new SpeechSynthesisUtterance(text);
      u.lang = language;
      u.onstart = () => setIsSpeaking(true);
      u.onend = () => setIsSpeaking(false);
      window.speechSynthesis.speak(u);
    };
    
    audio.play().catch(e => {
        console.error("Audio playback blocked", e);
        setIsSpeaking(false);
    });
  };

  const handleMicClick = () => {
    // 1. Instantly stop any currently playing voice so user can speak!
    stopAllSpeech();
    setErrorMsg('');

    if (isListening) {
      // If already listening, stop explicitly.
      setIsListening(false);
      rcRef.current?.stop();
    } else {
      // Start fresh!
      startListening();
    }
  };

  const startListening = () => {
    if (!supported) return;

    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    const rc = new SR();
    rc.continuous = false; // Auto-off enabled natively!
    rc.interimResults = true;
    rc.lang = language;

    setTranscript('');
    latestRef.current = '';

    rc.onstart = () => setIsListening(true);

    rc.onresult = (e: any) => {
      let currentResult = '';
      for (let i = 0; i < e.results.length; i++) {
        currentResult += e.results[i][0].transcript;
      }
      
      const best = currentResult.trim();
      if (best.length > 0) {
        setTranscript(best);
        latestRef.current = best;
      }
    };

    rc.onend = () => {
      setIsListening(false);
      rcRef.current = null;
      
      const spoken = latestRef.current.trim();
      latestRef.current = '';
      
      if (spoken.length > 0) {
        sendCommand(spoken);
      }
    };

    rc.onerror = (e: any) => {
      if (e.error === 'not-allowed') {
        setErrorMsg('Microphone blocked. Please allow mic in browser settings.');
      } else if (e.error !== 'no-speech') {
        setErrorMsg(`Mic Error: ${e.error}`);
      }
      setIsListening(false);
      rcRef.current = null;
    };

    try {
      rcRef.current = rc;
      rc.start();
    } catch (e) {
      console.error(e);
      setIsListening(false);
    }
  };

  const sendCommand = async (text: string) => {
    setIsProcessing(true);
    setTranscript(text);
    try {
      const res = await api.post('/voice-command', {
        text,
        context_district: contextDistrict || 'Guntur',
        language,
      });
      if (res.data.success && res.data.speech) {
        speak(res.data.speech);
        onCommand(res.data);
      }
    } catch (err) {
      console.error('Voice API error:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  if (!supported) {
    return (
      <div className="bg-slate-900/50 border border-red-500/30 p-5 rounded-3xl flex items-center gap-3">
        <AlertCircle className="text-red-400 w-5 h-5 flex-shrink-0" />
        <p className="text-red-400 text-sm font-bold">Browser doesn't support Voice. Use Chrome.</p>
      </div>
    );
  }

  return (
    <div
      className="bg-slate-900/50 border border-green-500/20 p-5 rounded-3xl shadow-xl overflow-hidden relative transition-all duration-300 hover:border-green-500/40"
      style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.3)' }}
    >
      <div className="flex items-center justify-between flex-wrap gap-4 relative z-10">
        
        {/* Mic Control */}
        <div className="flex items-center gap-5">
          <button
            type="button"
            onClick={handleMicClick}
            className={[
              'p-4 rounded-full shadow-xl transition-all duration-300 relative flex-shrink-0 outline-none',
              isListening ? 'bg-red-500 scale-105 hover:bg-red-600' : 'bg-green-500 hover:scale-105 hover:bg-green-400',
            ].join(' ')}
            style={{ boxShadow: isListening ? '0 0 30px rgba(239,68,68,0.4)' : '0 0 20px rgba(34,197,94,0.3)' }}
          >
            {isProcessing ? <Loader2 className="w-7 h-7 text-white animate-spin" /> : 
             isListening ? <MicOff className="w-7 h-7 text-white" /> : 
             isSpeaking ? <Volume2 className="w-7 h-7 text-white animate-pulse" /> : 
             <Mic className="w-7 h-7 text-white" />}
            {isListening && <span className="absolute inset-0 rounded-full animate-ping bg-red-400 opacity-20" />}
          </button>

          <div className="max-w-xl">
            <div className="flex items-center gap-3 mb-1">
              <h3 className="text-white font-black text-lg tracking-wide">AgriSmart Voice Assistant</h3>
              {isProcessing && <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-green-500/20 text-green-400 animate-pulse border border-green-500/30">Processing</span>}
              {isSpeaking && <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-500/20 text-blue-400 animate-pulse border border-blue-500/30">Speaking</span>}
              {isListening && !isProcessing && <span className="flex h-2.5 w-2.5 rounded-full bg-red-500 animate-ping" />}
            </div>
            
            {errorMsg ? (
              <p className="text-red-400 text-sm font-bold truncate flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5" /> {errorMsg}
              </p>
            ) : (
              <p className="text-slate-400 text-sm truncate transition-all duration-300">
                {isProcessing ? 'Translating and verifying command...' : 
                 isSpeaking ? 'Assistant is giving you an update... (Tap mic to interrupt)' : 
                 isListening ? (transcript ? `"${transcript}"` : 'Listening... speak now') : 
                 'Tap mic to start. Auto-stops when you finish speaking.'}
              </p>
            )}
          </div>
        </div>

        {/* Language Selection */}
        <div className="ml-auto">
          <select
            value={language}
            onChange={e => setLanguage(e.target.value)}
            disabled={isListening || isProcessing}
            className="bg-slate-800 text-white border border-green-500/30 px-4 py-2.5 rounded-xl text-sm font-bold outline-none cursor-pointer hover:border-green-500 transition-colors shadow-lg disabled:opacity-50"
          >
            <option value="te-IN">తెలుగు (Telugu)</option>
            <option value="hi-IN">हिन्दी (Hindi)</option>
            <option value="en-IN">English</option>
          </select>
        </div>
      </div>

      {isListening && (
        <div className="absolute bottom-0 left-0 w-full h-1.5 bg-gradient-to-r from-transparent via-red-500 to-transparent animate-shimmer" />
      )}
    </div>
  );
}
