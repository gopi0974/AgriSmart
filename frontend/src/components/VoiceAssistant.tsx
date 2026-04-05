import { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Loader2, Volume2, X, Languages, Check } from 'lucide-react';
import api from '../api';

interface VoiceAssistantProps {
  onCommand: (command: any) => void;
  contextDistrict?: string;
}

declare global {
  interface Window {
    webkitSpeechRecognition: any;
  }
}

export default function VoiceAssistant({ onCommand, contextDistrict }: VoiceAssistantProps) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showOverlay, setShowOverlay] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  const [currentLang, setCurrentLang] = useState('en-IN');
  const [showLangMenu, setShowLangMenu] = useState(false);
  
  const langs = [
    { code: 'en-IN', label: 'English', flag: '🇺🇸' },
    { code: 'te-IN', label: 'తెలుగు', flag: '🇮🇳' },
    { code: 'hi-IN', label: 'हिन्दी', flag: '🇮🇳' },
  ];
  
  const recognitionRef = useRef<any>(null);
  const transcriptRef = useRef('');

  useEffect(() => {
    const SpeechRecognition = window.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      setIsSupported(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = currentLang;

    recognition.onstart = () => {
      setIsListening(true);
      setShowOverlay(true);
      setTranscript('');
      transcriptRef.current = '';
    };

    recognition.onresult = (event: any) => {
      let finalTranscript = '';
      let interimTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }
      const currentText = finalTranscript || interimTranscript;
      if (currentText) {
        setTranscript(currentText);
        transcriptRef.current = currentText;
      }
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error', event.error);
      setIsListening(false);
      if (event.error === 'not-allowed') {
        alert('Microphone access denied. Please enable it in browser settings.');
      }
    };

    recognition.onend = () => {
      setIsListening(false);
      // Use the ref because the state might be stale in this closure
      const finalVal = transcriptRef.current;
      if (finalVal) {
        handleVoiceCommand(finalVal);
      } else {
        // If nothing was said, close after a delay
        setTimeout(() => setShowOverlay(false), 1500);
      }
    };

    recognitionRef.current = recognition;
  }, [onCommand, currentLang]); 

  const startListening = () => {
    if (!isSupported) {
      alert('Voice features are not supported in this browser. Please use Chrome or Edge.');
      return;
    }
    try {
      recognitionRef.current?.start();
    } catch (e) {
      console.error('Recognition already started');
    }
  };

  const stopListening = () => {
    recognitionRef.current?.stop();
    setIsListening(false);
  };

  const speak = (text: string) => {
    window.speechSynthesis.cancel(); // Stop any current speaking
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = currentLang;
    utterance.rate = 1.0;
    window.speechSynthesis.speak(utterance);
  };

  const handleVoiceCommand = async (text: string) => {
    setIsProcessing(true);
    try {
      const res = await api.post('/voice-command', { text, context_district: contextDistrict });
      if (res.data.success) {
        if (res.data.speech) speak(res.data.speech);
        onCommand(res.data);
        
        // Success feedback
        setTimeout(() => {
          setShowOverlay(false);
          setIsProcessing(false);
        }, 2000);
      } else {
        setIsProcessing(false);
        setShowOverlay(false);
      }
    } catch (err) {
      console.error('Voice command error:', err);
      setIsProcessing(false);
      setShowOverlay(false);
    }
  };

  return (
    <>
      <div className="relative">
        <button
          onClick={isListening ? stopListening : startListening}
          className={`p-6 rounded-full shadow-2xl transition-all duration-500 z-50 group flex flex-col items-center gap-1 ${
            isListening ? 'bg-red-500 scale-110' : 'bg-green-500 hover:scale-110'
          }`}
          style={{
            boxShadow: isListening 
              ? '0 0 60px rgba(239, 68, 68, 0.4)' 
              : '0 0 40px rgba(34, 197, 94, 0.25)',
          }}
        >
          {isListening ? (
            <MicOff className="w-8 h-8 text-white" />
          ) : (
            <Mic className="w-8 h-8 text-white animate-pulse" />
          )}
          
          <span className="text-[8px] font-black uppercase text-white/80 tracking-widest leading-none">
            {isListening ? 'Stop' : 'Voice'}
          </span>

          {isListening && (
            <div className="absolute inset-0 rounded-full animate-ping bg-red-400 opacity-20" />
          )}
        </button>

        {/* Language Picker Toggle */}
        <button 
          onClick={() => setShowLangMenu(!showLangMenu)}
          className="absolute -top-2 -right-2 w-8 h-8 bg-slate-800 border border-white/10 rounded-full flex items-center justify-center text-white hover:bg-slate-700 transition-all shadow-lg"
        >
          <Languages className="w-4 h-4 text-blue-400" />
        </button>

        {/* Language Menu */}
        {showLangMenu && (
          <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 w-32 glass rounded-2xl p-2 z-[200] overflow-hidden animate-scale-in">
            {langs.map(l => (
              <button 
                key={l.code}
                onClick={() => { setCurrentLang(l.code); setShowLangMenu(false); }}
                className={`w-full p-2 text-[10px] font-bold uppercase flex items-center justify-between rounded-lg hover:bg-white/5 transition-all ${currentLang === l.code ? 'text-green-400' : 'text-slate-400'}`}
              >
                <span>{l.flag} {l.label}</span>
                {currentLang === l.code && <Check className="w-3 h-3" />}
              </button>
            ))}
          </div>
        )}
      </div>

      {showOverlay && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] flex items-center justify-center p-6 animate-fade-in">
          <div 
            className="bg-slate-900/90 border border-green-500/30 p-8 rounded-3xl max-w-md w-full shadow-2xl relative overflow-hidden"
            style={{ boxShadow: '0 0 50px rgba(34, 197, 94, 0.1)' }}
          >
            {/* Visualizer pattern */}
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-green-500 to-transparent animate-shimmer" />
            
            <button 
              onClick={() => setShowOverlay(false)}
              className="absolute top-4 right-4 text-slate-500 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex flex-col items-center text-center space-y-6">
              <div className={`p-4 rounded-full ${isListening ? 'bg-red-500/20' : 'bg-green-500/20'}`}>
                {isProcessing ? (
                  <Loader2 className="w-12 h-12 text-green-400 animate-spin" />
                ) : isListening ? (
                  <Mic className="w-12 h-12 text-red-500 animate-bounce" />
                ) : (
                  <Volume2 className="w-12 h-12 text-green-400" />
                )}
              </div>

              <div>
                <h3 className="text-xl font-black text-white mb-2">
                  {isProcessing ? 'Processing Intent...' : isListening ? 'Listening to you...' : 'Processing...'}
                </h3>
                <p className="text-slate-400 text-sm h-12 overflow-hidden italic">
                  "{transcript || 'Say something like..."Add 100kg Tomato in Guntur"'}"
                </p>
              </div>

              {isListening && (
                <div className="flex gap-1.5 h-8 items-center">
                  {[1, 2, 3, 4, 5].map(i => (
                    <div 
                      key={i} 
                      className="w-1.5 bg-green-500/60 rounded-full animate-wave" 
                      style={{ animationDelay: `${i * 0.1}s`, height: `${20 + Math.random() * 60}%` }}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
