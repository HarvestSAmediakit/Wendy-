import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Phone, Mail, Building, Target, Zap } from 'lucide-react';
import { Lead } from '../../types';
import { cn } from '../../lib/utils';
import { auth, db } from '../../lib/firebase';
import { updateDoc, doc } from 'firebase/firestore';

export interface LiveSourcingFeedProps {
  leads: Lead[];
  title?: string;
  onClose: () => void;
  onDraftPitch: (leadId: string) => void;
}

export function LiveSourcingFeed({ leads, title = 'Latest Leads', onClose, onDraftPitch }: LiveSourcingFeedProps) {
  if (!leads || leads.length === 0) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ x: '100%', opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: '100%', opacity: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="fixed top-24 right-4 sm:right-6 lg:right-10 w-full max-w-sm sm:max-w-md max-h-[70vh] z-50 flex flex-col pointer-events-none"
      >
        <div className="bg-bg-element/90 backdrop-blur-xl border border-border-subtle rounded-3xl shadow-2xl overflow-hidden pointer-events-auto flex flex-col h-full">
          {/* Header */}
          <div className="p-4 border-b border-white/5 flex items-center justify-between shrink-0">
            <h3 className="font-serif font-bold text-lg text-white">{title}</h3>
            <button onClick={onClose} className="p-2 bg-white/5 text-text-muted hover:text-white rounded-full transition-colors">
              <X size={16} />
            </button>
          </div>

          {/* Scrolling Feed */}
          <div className="p-4 overflow-y-auto space-y-4 flex-1 custom-scrollbar">
            {leads.map((lead, idx) => (
              <motion.div 
                key={lead.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1, duration: 0.4 }}
                className="bg-bg-surface border border-white/5 p-5 rounded-2xl flex flex-col gap-3 group hover:border-acc-gold/30 transition-colors"
              >
                <div className="flex justify-between items-start gap-4">
                  <div>
                    <h4 className="font-bold text-white text-base">{lead.companyName}</h4>
                    <span className="text-[10px] text-acc-gold uppercase tracking-widest font-black flex items-center gap-1 mt-1">
                      <Zap size={10} />
                      {lead.score} MATCH SCORE
                    </span>
                  </div>
                  <div className="p-2 border border-white/5 bg-black/20 rounded-xl">
                    <Building size={16} className="text-text-muted" />
                  </div>
                </div>

                <div className="space-y-1 mt-2">
                  <div className="flex items-center gap-2 text-sm text-text-secondary">
                    <Target size={14} className="text-text-muted shrink-0" />
                    <span>{lead.decisionMaker} <span className="text-text-disabled">({lead.title})</span></span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-text-secondary">
                    <Mail size={14} className="text-text-muted shrink-0" />
                    <span>{lead.email}</span>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-white/5 flex flex-wrap gap-2">
                  <button 
                    onClick={() => onDraftPitch(lead.id)}
                    className="flex-1 py-2 bg-acc-gold/10 text-acc-gold border border-acc-gold/20 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-acc-gold/20 transition-colors flex items-center justify-center gap-2"
                  >
                    <Zap size={12} />
                    Draft Pitch
                  </button>
                  <button className="p-2 border border-white/5 text-text-muted rounded-xl hover:text-white hover:bg-white/5 transition-colors">
                    <Phone size={14} />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
