import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mic, X, AlertTriangle, CheckCircle, Flame, ShieldAlert } from 'lucide-react';
import { Lead } from '../types';

interface LiveAssistOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  lead: Lead | null;
}

export default function LiveAssistOverlay({ isOpen, onClose, lead }: LiveAssistOverlayProps) {
  const [transcripts, setTranscripts] = useState<{speaker: string, text: string}[]>([]);
  const [suggestion, setSuggestion] = useState<{type: 'objection' | 'positive' | 'warning', text: string} | null>(null);

  useEffect(() => {
    if (isOpen) {
      // Simulate live conversation
      setTranscripts([]);
      setSuggestion(null);

      const script = [
        { speaker: 'Sales', text: `Hi ${lead?.decisionMaker?.split(' ')[0] || 'there'}, thanks for taking the time.` },
        { speaker: 'Prospect', text: `Sure, but honestly, we have pretty tight budget constraints this quarter.` },
      ];

      const timeouts: any[] = [];
      
      timeouts.push(setTimeout(() => {
        setTranscripts(prev => [...prev, script[0]]);
      }, 1500));

      timeouts.push(setTimeout(() => {
        setTranscripts(prev => [...prev, script[1]]);
      }, 4000));

      timeouts.push(setTimeout(() => {
        setSuggestion({
          type: 'objection',
          text: "Objection Detected: Budget. Respond with: 'We offer flexible terms and 3x ROI within a quarter. Open to a pilot?'"
        });
      }, 4500));

      return () => timeouts.forEach(clearTimeout);
    }
  }, [isOpen, lead]);

  if (!isOpen || !lead) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        className="fixed bottom-24 md:bottom-6 left-4 right-4 md:left-6 md:right-auto z-[100] md:w-96 bg-bg-panel/95 backdrop-blur-xl border border-border-subtle rounded-xl shadow-2xl p-0 overflow-hidden flex flex-col"
      >
        <div className="flex items-center justify-between p-3 border-b border-border-subtle bg-bg-element">
           <div className="flex items-center space-x-2 text-[10px] font-mono uppercase tracking-widest font-bold">
             <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
             <span className="text-red-400">Live Assist Active</span>
           </div>
           <button onClick={onClose} className="text-text-muted hover:text-text-primary p-1">
             <X size={14} />
           </button>
        </div>
        
        <div className="p-4 space-y-4 max-h-64 overflow-y-auto">
          {transcripts.map((t, i) => (
             <div key={i} className={`flex flex-col ${t.speaker === 'Sales' ? 'items-end' : 'items-start'}`}>
               <span className="text-[9px] uppercase tracking-wider text-text-dim mb-1 font-mono">{t.speaker}</span>
               <div className={`text-xs p-2 rounded-lg max-w-[85%] ${t.speaker === 'Sales' ? 'bg-acc-gold/20 text-text-primary' : 'bg-bg-element text-text-muted'}`}>
                 {t.text}
               </div>
             </div>
          ))}
        </div>

        <AnimatePresence>
          {suggestion && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="border-t border-border-subtle"
            >
              <div className="p-4 bg-red-500/10 border-l-2 border-red-500 relative">
                 <ShieldAlert size={14} className="text-red-500 absolute top-4 left-3" />
                 <p className="pl-6 text-xs text-text-primary font-medium leading-relaxed">
                   {suggestion.text}
                 </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </AnimatePresence>
  );
}
