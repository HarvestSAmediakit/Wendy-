import React, { useState, useEffect, useRef } from 'react';
import { Bot, Send, X, Mic, MicOff, Loader2, FileText, Paperclip } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import { cn } from '../lib/utils';
import { GeminiLiveSession } from '../lib/geminiLive';
import { collection, addDoc, updateDoc, doc, getDocs, query, where, limit } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { handleFirestoreError, OperationType } from '../lib/utils';
import { Lead } from '../types';

export default function AIAssistant({ isOpen, onClose, magazineContext = 'All', liveSession, toggleLiveVoice }: { isOpen: boolean, onClose: () => void, magazineContext?: string, liveSession: {active: boolean, connecting: boolean, phase: string}, toggleLiveVoice: (persona?: string) => Promise<void> }) {
  const [messages, setMessages] = useState([
    { role: 'ai', text: "Hi Terrence, WENDY here. I've found two warm leads from Farmer's Weekly. Top pick John Deere wants a media kit. Shall I draft the email now for your review?" }
  ]);
  const [input, setInput] = useState('');

  useEffect(() => {
    const handleProactiveAction = (e: Event) => {
      console.log('Wendy received action:', (e as CustomEvent).detail);
      const { name, args } = (e as CustomEvent).detail;
      const normalizedName = name.toLowerCase();

      if (normalizedName === 'deep_scrape_triggered') {
         setMessages(prev => [...prev, { role: 'ai', text: `Initiating strategic harvest for ${args.context || magazineContext} context. I'm scanning for competitor patterns and high-value signals now.` }]);
      }

      if (normalizedName === 'plan_strike_list') {
         // This could also trigger an AI logic to find best call times
         setMessages(prev => [...prev, { role: 'ai', text: `Analyzing your current vault of ${args.context || magazineContext} leads to optimize today's strike sequence. I'll prioritize high-probability converts.` }]);
      }
    };

    window.addEventListener('wendy-action', handleProactiveAction);
    return () => window.removeEventListener('wendy-action', handleProactiveAction);
  }, [magazineContext]);

  useEffect(() => {
    // Cleanup on unmount or drawer close
    return () => {
      // Session is now managed globally in App.tsx
    };
  }, []);

  const handleToolCall = async (name: string, args: any) => {
    console.log(`Assistant executing tool: ${name}`, args);
    const { executeWendyTool } = await import('../lib/toolHandlers');
    return await executeWendyTool(name, args, magazineContext);
  };

  const toggleLiveVoiceProps = async () => {
    await toggleLiveVoice(); 
  };

  const [isThinking, setIsThinking] = useState(false);
  const [isPlayingTts, setIsPlayingTts] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const playWendyVoice = async (text: string) => {
    try {
      setIsPlayingTts(true);
      const response = await fetch('/api/wendy-tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
      });
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      
      if (audioRef.current) {
        audioRef.current.src = url;
        audioRef.current.play();
      } else {
        const audio = new Audio(url);
        audioRef.current = audio;
        audio.onended = () => setIsPlayingTts(false);
        audio.play();
      }
    } catch (err) {
      console.error('TTS Playback Error:', err);
      setIsPlayingTts(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || file.type !== 'application/pdf') return;

    setMessages(prev => [...prev, { role: 'user', text: `Uploading magazine issue: ${file.name}` }]);
    setIsThinking(true);

    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = (reader.result as string).split(',')[1];
      
      try {
        const { extractLeadsFromMagazine } = await import('../services/geminiService');
        const extractedLeads = await extractLeadsFromMagazine(base64);

        if (extractedLeads && extractedLeads.length > 0) {
          const leadsPath = 'leads';
          const allowedPubs = ["Harvest SA", "Black Business Quarterly", "Leadership Magazine"];
          for (const lead of extractedLeads) {
            try {
              const validatedPub = allowedPubs.includes(lead.publication) ? lead.publication : "Leadership Magazine";
              await addDoc(collection(db, leadsPath), {
                ...lead,
                publication: validatedPub,
                status: 'New',
                score: lead.score || 85,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                ownerId: auth.currentUser?.uid || ''
              });
            } catch (error) {
              handleFirestoreError(error, OperationType.CREATE, leadsPath);
            }
          }
          setMessages(prev => [...prev, { role: 'ai', text: `Analysis complete, Terrence. WENDY here — I've extracted ${extractedLeads.length} leads from "${file.name}" and matched them to our publications. You can review them in the CRM.` }]);
        } else {
          setMessages(prev => [...prev, { role: 'ai', text: "WENDY here — I analyzed the PDF but couldn't find any clear lead contacts. Shall we try another issue?" }]);
        }
      } catch (error) {
        console.error("PDF Processing Error:", error);
        setMessages(prev => [...prev, { role: 'ai', text: "Terrence, WENDY here — I'm sorry, I had trouble processing that PDF. Let's give it another go?" }]);
      } finally {
        setIsThinking(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSend = async () => {
    if (!input.trim() || isThinking) return;
    
    const userText = input;
    console.log("handleSend userText:", userText);
    
    const newMessages = [...messages, { role: 'user', text: userText }];
    setMessages(newMessages);
    setInput('');
    setIsThinking(true);
    
    try {
      console.log("Calling chatWithAssistant...");
      const { chatWithAssistant } = await import('../services/geminiService');
      const responseText = await chatWithAssistant(userText, newMessages, handleToolCall, magazineContext);
      
      // Parse for spatial UI intents: |||{ "intent": "...", "params": {...} }|||
      const intentMatch = responseText.match(/\|\|\|([\s\S]*?)\|\|\|/);
      if (intentMatch) {
         try {
            const intent = JSON.parse(intentMatch[1]);
            window.dispatchEvent(new CustomEvent('wendy-action', { detail: { name: intent.intent, args: intent.params } }));
         } catch (e) {
            console.error("Failed to parse Wendy intent:", e);
         }
      }

      const cleanResponse = responseText.replace(/\|\|\|[\s\S]*?\|\|\|/g, '').trim();
      setMessages(prev => [...prev, { role: 'ai', text: cleanResponse }]);
      playWendyVoice(cleanResponse);
    } catch (error) {
      console.error("handleSend Error:", error);
      setMessages(prev => [...prev, { role: 'ai', text: "Terrence, I'm having trouble connecting to the AI brain. Please try again." }]);
    } finally {
      setIsThinking(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.aside
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="fixed top-0 right-0 w-full sm:w-80 h-[100dvh] bg-bg-element sm:border-l border-border-subtle shadow-2xl z-[60] flex flex-col pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]"
        >
          <div className="flex items-center justify-between p-4 border-b border-border-subtle bg-bg-element/50 backdrop-blur-md">
            <div className="flex items-center space-x-2">
              <div className="p-2 bg-acc-gold/20 text-acc-gold rounded-lg">
                <Bot size={20} />
              </div>
              <h3 className="font-serif font-bold text-lg text-text-primary">Terrence's PA</h3>
            </div>
            <div className="flex items-center space-x-2">
              <button 
                onClick={() => toggleLiveVoice()}
                className={cn(
                  "p-2 rounded-full transition-all duration-300", 
                  liveSession.active ? "bg-red-500/20 text-red-500 shadow-[0_0_15px_rgba(239,68,68,0.5)]" : "bg-bg-surface text-text-muted hover:text-acc-gold"
                )}
                title={liveSession.active ? "End Voice Session" : "Start Voice Session"}
              >
                {liveSession.connecting ? <Loader2 size={16} className="animate-spin" /> : (liveSession.active ? <Mic size={16} className="animate-pulse" /> : <MicOff size={16} />)}
              </button>
              <button onClick={onClose} className="text-text-muted hover:text-text-primary">
                <X size={24} />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <div className="space-y-2">
              <p className="text-xs font-mono uppercase text-text-muted font-bold tracking-widest">Suggested Strategic Actions</p>
               <button onClick={() => setInput("Scrape farmersweekly.co.za and find new advertisers for Harvest SA.")} className="w-full text-left p-2 rounded-lg bg-bg-surface border border-acc-gold/30 text-[10px] uppercase font-bold tracking-widest text-acc-gold hover:bg-acc-gold/5 transition-colors">
                 "🔍 Scan Competitor Ad Index"
               </button>
               <button onClick={() => setInput("Search the web for the latest corporate shifts in SA Agriculture.")} className="w-full text-left p-2 rounded-lg bg-bg-surface border border-border-subtle text-[10px] uppercase font-bold tracking-widest text-text-secondary hover:border-acc-gold/5 transition-colors">
                 "🌐 Run Market Intelligence"
               </button>
               <button onClick={() => setInput("Prep a strategic briefing for my strike list today.")} className="w-full text-left p-2 rounded-lg bg-bg-surface border border-border-subtle text-[10px] uppercase font-bold tracking-widest text-text-secondary hover:border-acc-gold/5 transition-colors">
                 "📄 Prep Strike Briefing"
               </button>
            </div>

            <div className="border-t border-border-subtle pt-4 space-y-4">
              {messages.map((msg, idx) => (
                <div key={idx} className={cn("flex flex-col", (msg.role === 'user' || msg.role === 'system') ? 'items-end' : 'items-start')}>
                   <div className={cn(
                     "max-w-[85%] p-3 rounded-xl text-sm leading-relaxed",
                     msg.role === 'user' 
                       ? "bg-acc-gold text-[#1A1A1A] rounded-tr-sm font-medium" 
                       : msg.role === 'system'
                       ? "bg-bg-panel border border-border-subtle text-text-dim text-xs italic rounded-tr-sm"
                       : "bg-bg-surface border border-border-subtle text-text-secondary rounded-tl-sm"
                   )}>
                     <div className="prose prose-invert prose-sm max-w-none">
                       <ReactMarkdown>{msg.text}</ReactMarkdown>
                     </div>
                   </div>
                </div>
              ))}
              {isThinking && (
                <div className="flex flex-col items-start">
                   <div className="max-w-[85%] p-3 rounded-xl text-sm leading-relaxed bg-bg-surface border border-border-subtle text-text-dim rounded-tl-sm flex items-center justify-center space-x-1 w-16 h-10">
                     <span className="w-1.5 h-1.5 bg-text-dim rounded-full animate-bounce"></span>
                     <span className="w-1.5 h-1.5 bg-text-dim rounded-full animate-bounce [animation-delay:0.2s]"></span>
                     <span className="w-1.5 h-1.5 bg-text-dim rounded-full animate-bounce [animation-delay:0.4s]"></span>
                   </div>
                </div>
              )}
            </div>
          </div>

          <div className="p-4 border-t border-border-subtle bg-bg-element">
            <div className="flex space-x-2">
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileUpload} 
                accept="application/pdf" 
                className="hidden" 
              />
              <button 
                onClick={() => fileInputRef.current?.click()}
                disabled={isThinking}
                className="p-2 bg-bg-surface border border-border-subtle rounded-xl text-text-muted hover:text-acc-gold transition-colors"
                title="Upload Magazine Issue (PDF)"
              >
                <Paperclip size={18} />
              </button>
              <div className="relative flex-1">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  placeholder="Talk to your assistant..."
                  className="w-full bg-bg-surface border border-border-subtle rounded-xl py-3 pl-4 pr-12 text-sm focus:outline-none focus:border-acc-gold/50 focus:ring-1 focus:ring-acc-gold/50 transition-colors text-text-primary"
                />
                <button 
                  onClick={handleSend}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-acc-gold hover:bg-acc-gold/10 rounded-lg transition-colors"
                  disabled={!input.trim() || isThinking}
                >
                  <Send size={16} />
                </button>
              </div>
            </div>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
