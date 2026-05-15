import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mic, Loader2, Zap, AlertCircle, Bell, AlertTriangle, Bot, Sparkles } from 'lucide-react';
import { GeminiLiveSession } from '../lib/geminiLive';
import { cn } from '../lib/utils';

const personas = {
  calm: { label: 'Calm', icon: <Bot size={14} /> },
  energetic: { label: 'Energetic', icon: <Zap size={14} /> },
  polished: { label: 'Polished', icon: <Sparkles size={14} /> }
};

export type OrbState = 'idle' | 'listening' | 'processing' | 'speaking' | 'alert' | 'error' | 'connecting';
export type WendyPersona = 'calm' | 'energetic' | 'polished';

export default function WendyOrb({ magazineContext = 'All', liveSession, toggleLiveVoice }: { magazineContext?: string, liveSession: {active: boolean, connecting: boolean, phase: OrbState}, toggleLiveVoice: (persona?: string) => Promise<void> }) {
  const [persona, setPersona] = useState<WendyPersona>('polished');
  const [showPersonaMenu, setShowPersonaMenu] = useState(false);
  const [state, setState] = useState<OrbState>('idle');

  useEffect(() => {
    if (liveSession.connecting) setState('connecting');
    else if (liveSession.active) {
      setState(liveSession.phase);
    }
    else setState('idle');
  }, [liveSession]);

  const handleAction = (name: string, args: any) => {
    console.log('WENDY Action:', name, args);
    const event = new CustomEvent('wendy-action', { 
      detail: { name, args } 
    });
    window.dispatchEvent(event);
    return { status: 'success', message: 'Action triggered' };
  };

  const toggleVoice = async () => {
     await toggleLiveVoice(persona);
  };

  useEffect(() => {
    const handleManualAlert = (e: any) => {
      if (e.detail?.type === 'alert') {
        setState('alert');
        setTimeout(() => setState(prev => prev === 'alert' ? 'idle' : prev), 5000);
      }
    };
    window.addEventListener('wendy-notification', handleManualAlert);
    return () => window.removeEventListener('wendy-notification', handleManualAlert);
  }, []);

  return (
    <div id="tour-assistant" className="fixed bottom-12 left-1/2 -translate-x-1/2 z-[1000] flex flex-col items-center">
      <AnimatePresence>
        {showPersonaMenu && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 10 }}
            className="mb-6 bg-black/80 backdrop-blur-3xl border border-white/10 rounded-2xl p-2 flex items-center gap-2 shadow-2xl"
          >
            {(Object.entries(personas) as [WendyPersona, typeof personas['calm']][]).map(([id, p]) => (
              <button
                key={id}
                onClick={() => {
                  setPersona(id);
                  setShowPersonaMenu(false);
                }}
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all",
                  persona === id ? "bg-white text-black" : "text-text-tertiary hover:text-white"
                )}
              >
                {p.icon}
                <span>{p.label}</span>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {state === 'alert' && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            className="mb-6 bg-acc-gold text-bg-deep px-5 py-2.5 rounded-full text-xs font-bold shadow-[0_0_40px_rgba(245,158,11,0.6)] flex items-center space-x-2 border border-acc-gold/50 backdrop-blur-xl"
          >
            <Bell size={14} className="animate-bounce" />
            <span className="tracking-wider uppercase">Priority Intel Detected</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div 
        onClick={toggleVoice}
        onContextMenu={(e) => {
          e.preventDefault();
          setShowPersonaMenu(!showPersonaMenu);
        }}
        className="relative group focus:outline-none cursor-pointer"
      >
        <div className="absolute -top-12 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
           <div 
             onClick={(e) => {
               e.stopPropagation();
               setShowPersonaMenu(!showPersonaMenu);
             }}
             className="bg-white/5 backdrop-blur-xl border border-white/10 p-2 rounded-full text-text-tertiary hover:text-white cursor-pointer"
             title="Change Neural Matrix"
           >
              <Bot size={14} />
           </div>
        </div>

        <motion.div 
          animate={{
            background: [
              "radial-gradient(circle at 50% 50%, rgba(212,175,55,0.08) 0%, transparent 60%)",
              "radial-gradient(circle at 30% 70%, rgba(59,130,246,0.08) 0%, transparent 60%)",
              "radial-gradient(circle at 70% 30%, rgba(212,175,55,0.08) 0%, transparent 60%)",
              "radial-gradient(circle at 50% 50%, rgba(212,175,55,0.08) 0%, transparent 60%)",
            ]
          }}
          transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
          className={cn(
            "fixed inset-0 pointer-events-none opacity-40 z-[-1]"
          )}
        >
          <svg width="100%" height="100%">
            <defs>
              <pattern id="neural-grid" width="60" height="60" patternUnits="userSpaceOnUse">
                <circle cx="2" cy="2" r="0.5" fill="rgba(255,255,255,0.05)" />
                <path d="M 60 0 L 0 0 0 60" fill="none" stroke="rgba(255,255,255,0.02)" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#neural-grid)" />
          </svg>
        </motion.div>

        {/* Layered Neon Glows */}
        <motion.div 
          animate={{
            scale: state === 'speaking' ? [1, 1.2, 1] : 1,
            opacity: state === 'idle' ? 0.3 : 0.6
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className={cn(
            "absolute inset-[-80px] rounded-full blur-[80px] transition-colors duration-1000",
            state === 'idle' ? "bg-[var(--theme-accent)]/10" :
            state === 'listening' ? "bg-acc-pink/30 shadow-[0_0_120px_rgba(236,72,153,0.4)]" :
            state === 'processing' ? "bg-acc-gold/30 shadow-[0_0_120px_rgba(251,191,36,0.4)]" :
            state === 'speaking' ? "bg-acc-blue shadow-[0_0_120px_rgba(59,130,246,0.4)]" :
            state === 'alert' ? "bg-acc-gold shadow-[0_0_120px_rgba(212,175,55,0.4)]" :
            state === 'error' ? "bg-acc-red/30 shadow-[0_0_120px_rgba(239,68,68,0.4)]" :
            "bg-[var(--theme-accent)]/10"
          )}
        />
        
        <motion.div 
          animate={{
            scale: state === 'idle' ? [1, 1.15, 1] : 
                   state === 'listening' ? [1.1, 1.5, 1.1] :
                   state === 'processing' ? [1.2, 1.6, 1.2] : 
                   state === 'speaking' ? [1.1, 1.8, 1.1] : [1, 1.15, 1],
            opacity: state === 'idle' ? [0.3, 0.5, 0.3] : 
                     state === 'listening' ? [0.6, 0.9, 0.6] :
                     state === 'processing' ? [0.5, 0.8, 0.5] :
                     state === 'speaking' ? [0.7, 1, 0.7] : [0.3, 0.6, 0.3]
          }}
          transition={{
            duration: state === 'processing' ? 1 : state === 'listening' ? 1.5 : state === 'speaking' ? 0.8 : 4,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className={cn(
            "absolute inset-[-20px] rounded-full blur-2xl transition-colors duration-700",
            state === 'idle' ? "bg-[var(--theme-accent)]/20 shadow-[0_0_40px_var(--theme-glow)]" :
            state === 'listening' ? "bg-acc-pink/60" :
            state === 'processing' ? "bg-acc-gold/40" :
            state === 'speaking' ? "bg-acc-blue/80" :
            state === 'alert' ? "bg-acc-gold/80" :
            state === 'error' ? "bg-acc-red/60" :
            "bg-[var(--theme-accent)]/20"
          )}
        />

        {/* The Orb with Plasma Effect */}
        <motion.div 
          animate={{
             scale: state === 'listening' ? 1.15 : 
                    state === 'processing' ? 1.05 : 
                    state === 'speaking' ? 1.25 :
                    state === 'alert' ? 1.2 : 
                    state === 'idle' ? [1, 1.05, 1] : 1,
             y: state === 'idle' ? [0, -4, 0] : 0,
             boxShadow: state === 'speaking' 
              ? "0 0 50px rgba(59, 130, 246, 0.6), inset 0 0 20px rgba(59, 130, 246, 0.4)" 
              : state === 'listening'
              ? "0 0 50px rgba(236, 72, 153, 0.6), inset 0 0 20px rgba(236, 72, 153, 0.4)"
              : "0 0 30px rgba(255, 255, 255, 0.1), inset 0 0 10px rgba(255, 255, 255, 0.05)"
          }}
          transition={{
             scale: state === 'idle' ? { duration: 3, repeat: Infinity, ease: 'easeInOut' } 
                  : state === 'alert' ? { type: "spring", stiffness: 400, damping: 10, mass: 1, repeat: 3, repeatType: "reverse" } 
                  : { type: "spring", stiffness: 300, damping: 15, mass: 0.8 },
             y: { duration: 4, repeat: Infinity, ease: 'easeInOut' }
          }}
          className={cn(
            "relative w-20 h-20 sm:w-24 sm:h-24 rounded-full glass-panel border-2 transition-all duration-500 flex items-center justify-center overflow-hidden cursor-pointer",
            state === 'speaking' && "border-acc-blue shadow-[0_0_60px_rgba(59,130,246,0.5)] bg-acc-blue/10",
            state === 'listening' && "border-acc-pink shadow-[0_0_60px_rgba(236,72,153,0.5)] bg-acc-pink/10",
            state === 'idle' && "border-acc-blue/20 bg-acc-blue/5",
            state === 'processing' && "border-acc-gold shadow-[0_0_60px_rgba(251,191,36,0.4)]",
            state === 'alert' && "border-acc-gold shadow-[0_0_60px_rgba(245,158,11,0.6)] animate-pulse",
            state === 'error' && "border-acc-red shadow-[0_0_60px_rgba(239,68,68,0.4)]"
          )}
          title="WENDY AI Assistant"
          whileHover={{ scale: 1.15, rotate: 5 }}
          whileTap={{ scale: 0.9 }}
        >
          {/* Internal Plasma Gradient */}
          <div className={cn(
            "absolute inset-0 opacity-40 transition-opacity duration-1000",
            state === 'speaking' ? "opacity-70" : "opacity-40"
          )}>
            <motion.div 
              animate={{
                rotate: 360,
                scale: [1, 1.5, 1]
              }}
              transition={{
                duration: 10,
                repeat: Infinity,
                ease: "linear"
              }}
              className={cn(
                "w-[200%] h-[200%] absolute top-[-50%] left-[-50%] bg-[radial-gradient(circle,rgba(59,130,246,0.4)_0%,transparent_70%)]",
                state === 'idle' && "bg-[radial-gradient(circle,rgba(255,255,255,0.2)_0%,transparent_70%)]"
              )}
            />
          </div>

          <AnimatePresence mode="wait">
            {state === 'idle' && (
              <motion.div 
                key="idle"
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.5 }}
                transition={{ type: "spring", stiffness: 300, damping: 25 }}
                className="w-full h-full flex items-center justify-center"
              >
                <motion.div
                   animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.6, 0.3] }}
                   transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                   className="w-3 h-3 rounded-full bg-white shadow-[0_0_15px_rgba(255,255,255,0.8)]"
                />
              </motion.div>
            )}

            {state === 'listening' && (
              <motion.div 
                key="listening"
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.5 }}
                transition={{ type: "spring", stiffness: 300, damping: 25 }}
                className="absolute inset-0 flex items-center justify-center"
              >
                {[1, 2, 3].map(i => (
                  <motion.div 
                    key={i}
                    animate={{ scale: [1, 2.5], opacity: [0.6, 0] }}
                    transition={{ duration: 2, repeat: Infinity, delay: i * 0.6, ease: "easeOut" }}
                    className="absolute w-6 h-6 border-[1.5px] border-acc-blue/40 rounded-full"
                  />
                ))}
                <div className="w-5 h-5 rounded-full bg-acc-blue/20 flex items-center justify-center shadow-[0_0_15px_rgba(59,130,246,0.5)]">
                   <div className="w-2 h-2 rounded-full bg-acc-blue" />
                </div>
              </motion.div>
            )}

            {state === 'processing' && (
               <motion.div 
                 key="processing"
                 initial={{ opacity: 0, scale: 0.5 }}
                 animate={{ opacity: 1, scale: 1 }}
                 exit={{ opacity: 0, scale: 1.5 }}
                 transition={{ type: "spring", stiffness: 300, damping: 25 }}
                 className="absolute inset-0 flex items-center justify-center"
               >
                 <motion.div 
                   animate={{ rotate: 360 }}
                   transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                   className="w-10 h-10 border-[3px] border-transparent border-t-white/80 border-r-white/20 rounded-full"
                 />
                 <motion.div 
                   animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
                   transition={{ duration: 1, repeat: Infinity, ease: "easeInOut" }}
                   className="absolute w-2 h-2 bg-white rounded-full blur-[1px]" 
                 />
               </motion.div>
            )}

            {state === 'speaking' && (
               <motion.div 
                 key="speaking"
                 initial={{ opacity: 0, scale: 0.5 }}
                 animate={{ opacity: 1, scale: 1 }}
                 exit={{ opacity: 0, scale: 1.5 }}
                 transition={{ type: "spring", stiffness: 300, damping: 25 }}
                 className="flex items-center justify-center gap-1 h-6"
               >
                  {[1, 2, 3, 2, 4, 1, 3].map((_, i) => (
                    <motion.div 
                      key={i}
                      animate={{ height: [4, 16, 4] }}
                      transition={{ 
                        duration: 0.4 + (Math.random() * 0.2), 
                        repeat: Infinity, 
                        delay: i * 0.05,
                        ease: "easeInOut"
                      }}
                      className="w-[3px] bg-acc-blue rounded-full shadow-[0_0_8px_rgba(59,130,246,0.8)]"
                    />
                  ))}
               </motion.div>
            )}

            {state === 'alert' && (
              <motion.div 
                key="alert" 
                initial={{ opacity: 0, scale: 0.5, rotate: -20 }} 
                animate={{ opacity: 1, scale: 1, rotate: 0 }} 
                exit={{ opacity: 0, scale: 1.5 }}
                transition={{ type: "spring", stiffness: 400, damping: 15 }}
              >
                <Bell className="text-acc-gold" size={24} />
              </motion.div>
            )}

            {state === 'error' && (
              <motion.div 
                key="error" 
                initial={{ opacity: 0, scale: 0.5, rotate: 20 }} 
                animate={{ opacity: 1, scale: 1, rotate: 0 }}
                exit={{ opacity: 0, scale: 1.5 }}
                transition={{ type: "spring", stiffness: 400, damping: 15 }}
              >
                <AlertTriangle className="text-acc-red" size={24} />
              </motion.div>
            )}
            
            {state === 'connecting' && (
               <motion.div 
                 key="connecting" 
                 initial={{ opacity: 0, scale: 0.5 }} 
                 animate={{ opacity: 1, scale: 1 }}
                 exit={{ opacity: 0, scale: 1.5 }}
                 transition={{ type: "spring", stiffness: 300, damping: 25 }}
                 className="flex items-center justify-center"
               >
                  <motion.div
                    animate={{ rotate: 360 }} 
                    transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                  >
                     <Loader2 className="text-white/80" size={20} />
                  </motion.div>
               </motion.div>
            )}
          </AnimatePresence>

          {/* Alert Badge */}
          {state === 'alert' && (
             <div className="absolute top-1 right-1 w-4 h-4 bg-acc-red rounded-full flex items-center justify-center border border-bg-deep shadow-lg">
                <span className="text-[8px] font-bold text-white">3</span>
             </div>
          )}
        </motion.div>
      </div>

      <motion.span 
        animate={{ opacity: [0.4, 0.8, 0.4] }}
        transition={{ duration: 2, repeat: Infinity }}
        className="mt-3 text-[9px] font-mono font-bold tracking-[0.25em] text-white/40 uppercase"
      >
        {state === 'connecting' ? 'Initializing' :
         state === 'processing' ? 'Processing' :
         state === 'speaking' ? 'WENDY Speaking' :
         state === 'listening' ? 'Listening' :
         state === 'alert' ? 'Priority Alert' :
         liveSession.active ? 'Online' : 'WENDY'}
      </motion.span>
    </div>
  );
}
