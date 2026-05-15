import React from 'react';
import { X, Target, Briefcase, FileText, Bot, Trophy, PhoneCall, Link } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Lead } from '../types';
import { cn } from '../lib/utils';
import ReactMarkdown from 'react-markdown';

interface PreCallBriefModalProps {
  isOpen: boolean;
  onClose: () => void;
  lead: Lead | null;
}

export default function PreCallBriefModal({ isOpen, onClose, lead }: PreCallBriefModalProps) {
  if (!lead) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-bg-deep/80 backdrop-blur-sm"
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="w-full max-w-4xl max-h-[90vh] bg-bg-panel border border-border-subtle rounded-xl shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start p-4 sm:p-6 border-b border-border-subtle bg-bg-element/50 relative overflow-hidden">
               <div className="relative z-10 flex flex-col sm:flex-row gap-3 sm:gap-4 md:gap-6 items-start">
                  <div className="w-12 h-12 sm:w-16 sm:h-16 shrink-0 bg-bg-deep border border-border-subtle rounded-lg flex items-center justify-center font-bold text-acc-gold font-sans text-xl sm:text-2xl shadow-inner text-center leading-none">
                     {lead.score || 0}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                      <Target size={12} className="text-acc-gold sm:w-3.5 sm:h-3.5" />
                      <span className="text-[8px] sm:text-[10px] font-sans uppercase font-black tracking-[0.2em] text-acc-gold">Pre-call Brief</span>
                      <span className="text-[8px] sm:text-[10px] font-sans text-text-muted opacity-80">• Generated {new Date().toLocaleDateString()}</span>
                    </div>
                    <h3 className="text-xl sm:text-2xl md:text-3xl font-serif italic text-text-primary leading-tight mt-1 sm:mt-2 truncate">{lead.companyName}</h3>
                    <p className="font-sans text-[10px] sm:text-xs text-text-tertiary uppercase tracking-[0.25em] font-black mt-0.5">{lead.sector}</p>
                  </div>
               </div>
               <button onClick={onClose} className="absolute sm:static top-4 right-4 p-2 text-text-muted hover:text-text-primary transition-colors relative z-10 bg-bg-deep/40 sm:bg-transparent rounded-full backdrop-blur-md sm:backdrop-blur-none">
                 <X size={20} className="sm:w-6 sm:h-6" />
               </button>
               <div className="absolute right-0 top-0 w-64 h-64 bg-acc-gold/5 blur-[100px] rounded-full translate-x-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 sm:space-y-8 font-sans scroll-smooth">
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                 {/* Left Column: Context & Hooks */}
                 <div className="md:col-span-2 space-y-6">
                    <section className="space-y-3">
                       <h4 className="text-[10px] uppercase font-semibold text-acc-gold tracking-[0.15em] flex items-center gap-2 border-b border-border-subtle pb-2">
                         <Bot size={14} /> AI Context Snapshot
                       </h4>
                       <p className="text-sm text-text-primary leading-relaxed">
                         {lead.companyName} is actively appearing in {lead.publication} and expanding their marketing footprint in the {lead.sector} sector. Their recent activities suggest they are open to competitive placements. They are a high-value target with a relevance score of {lead.score || 0}%.
                       </p>
                       <div className="bg-bg-element/50 p-4 border-l-2 border-acc-gold rounded text-xs text-text-secondary italic">
                         "{lead.sourceReasoning}"
                       </div>
                    </section>
                    
                    <section className="space-y-4">
                       <h4 className="text-[10px] uppercase font-semibold text-acc-gold tracking-[0.15em] flex items-center gap-2 border-b border-border-subtle pb-2">
                         <Bot size={14} /> The AFB Dossier
                       </h4>
                       <div className="space-y-3">
                         <div className="p-4 bg-bg-element border border-border-subtle rounded group hover:border-acc-gold/30 transition-colors">
                           <div className="flex justify-between items-start mb-2">
                             <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest group-hover:text-acc-gold transition-colors">Angle</span>
                           </div>
                           <p className="text-sm text-text-primary leading-relaxed">{lead.angle || 'Resilience Through Innovation during shifting market conditions.'}</p>
                         </div>
                         <div className="p-4 bg-bg-element border border-border-subtle rounded group hover:border-acc-gold/30 transition-colors">
                           <div className="flex justify-between items-start mb-2">
                             <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest group-hover:text-acc-gold transition-colors">Feature</span>
                           </div>
                           <p className="text-sm text-text-primary leading-relaxed">{lead.feature || 'Interactive digital ecosystems and targeted content.'}</p>
                         </div>
                         <div className="p-4 bg-bg-element border border-border-subtle rounded group hover:border-acc-gold/30 transition-colors">
                           <div className="flex justify-between items-start mb-2">
                             <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest group-hover:text-acc-gold transition-colors">Benefit</span>
                           </div>
                           <p className="text-sm text-text-primary leading-relaxed">{lead.benefit || 'Higher win rate and direct engagement compared to traditional print.'}</p>
                         </div>
                       </div>
                    </section>

                    <section className="space-y-3">
                       <h4 className="text-[10px] uppercase font-semibold text-acc-gold tracking-[0.15em] flex items-center gap-2 border-b border-border-subtle pb-2">
                         <Briefcase size={14} /> Competitor Spend Analysis
                       </h4>
                       <div className="bg-bg-element/50 p-4 border-l-2 border-acc-gold rounded text-sm text-text-primary leading-relaxed">
                         {lead.competitorSpendAnalysis || `Currently advertising in competitors. Weakness: Static print-only reach lacks direct engagement.`}
                       </div>
                    </section>

                    <section className="space-y-3">
                       <h4 className="text-[10px] uppercase font-semibold text-red-400 tracking-[0.15em] flex items-center gap-2 border-b border-border-subtle pb-2">
                         <X size={14} /> Likely Objections & Rebuttals
                       </h4>
                       <div className="space-y-2">
                         <div className="flex flex-col sm:flex-row gap-2 items-start text-sm p-2 bg-red-500/5 border border-red-500/10 rounded">
                           <span className="font-bold text-red-400 shrink-0 w-32">"No budget"</span>
                           <span className="text-text-secondary">"I understand. We offer flexible payment terms and our ROI is typically 3x within a quarter. Can we explore a pilot?"</span>
                         </div>
                         <div className="flex flex-col sm:flex-row gap-2 items-start text-sm p-2 bg-red-500/5 border border-red-500/10 rounded">
                           <span className="font-bold text-red-400 shrink-0 w-32">"Already with competitor"</span>
                           <span className="text-text-secondary">"That's great. We aren't asking you to switch, but to add an exclusive channel they don't have access to."</span>
                         </div>
                       </div>
                    </section>
                 </div>

                 {/* Right Column: Contact & Logistics */}
                 <div className="space-y-6">
                    <section className="p-5 bg-bg-element border border-border-subtle rounded-xl shadow-inner space-y-4">
                       <h4 className="text-[10px] uppercase font-semibold text-text-muted tracking-[0.15em]">Decision Maker</h4>
                       <div>
                         <p className="text-lg font-bold text-text-primary">{lead.decisionMaker}</p>
                         <p className="text-xs font-mono uppercase tracking-widest text-text-dim mt-1">{lead.title}</p>
                       </div>
                       
                       <div className="pt-4 border-t border-border-subtle space-y-3">
                         <a href={`tel:${lead.phone}`} className="flex items-center gap-3 text-sm text-text-primary hover:text-acc-gold transition-colors group">
                           <div className="w-8 h-8 rounded bg-bg-deep border border-border-subtle flex items-center justify-center group-hover:border-acc-gold/50"><PhoneCall size={14} /></div>
                           {lead.phone}
                         </a>
                         <a href={`mailto:${lead.email}`} className="flex items-center gap-3 text-sm text-text-primary hover:text-acc-gold transition-colors group">
                           <div className="w-8 h-8 rounded bg-bg-deep border border-border-subtle flex items-center justify-center group-hover:border-acc-gold/50"><FileText size={14} /></div>
                           <span className="truncate">{lead.email}</span>
                         </a>
                       </div>
                       
                       <div className="pt-4 border-t border-border-subtle">
                         <h4 className="text-[10px] uppercase font-semibold text-acc-blue tracking-[0.15em] mb-2">Comms Style: Direct & Data-Driven</h4>
                         <p className="text-xs text-text-secondary leading-relaxed">
                            Responds best to emails exactly 3-4 sentences long. Do not use emojis. Focus entirely on ROI and metrics.
                         </p>
                       </div>
                    </section>

                    <section className="space-y-3">
                       <h4 className="text-[10px] uppercase font-semibold text-text-muted tracking-[0.15em] border-b border-border-subtle pb-2">
                         KPI Hooks to Drop
                       </h4>
                       <ul className="text-xs text-text-secondary space-y-2 list-inside list-disc pl-2 marker:text-acc-gold">
                         <li>Audience Match: 85% overlap with their ICP.</li>
                         <li>Recent wins in {lead.sector}.</li>
                         <li>Exclusive ad real estate opening soon.</li>
                       </ul>
                    </section>
                 </div>
              </div>

            </div>
            
            {/* Footer Actions */}
            <div className="p-4 sm:p-6 border-t border-border-subtle bg-bg-deep flex flex-col sm:flex-row justify-between items-center gap-4">
              <button 
                onClick={onClose}
                className="btn-outline text-xs px-4 py-2 w-full sm:w-auto"
                title="Close the briefing space"
              >
                Close Brief
              </button>
              <button 
                onClick={() => {
                  window.dispatchEvent(new CustomEvent('wendy-action', { 
                    detail: { name: 'trigger_call', args: { lead } } 
                  }));
                  onClose();
                }}
                className="bg-acc-gold text-bg-deep px-6 py-2 rounded font-sans text-xs uppercase font-bold tracking-widest hover:brightness-110 shadow-lg shadow-acc-gold/20 flex items-center justify-center gap-2 transition-all w-full sm:w-auto"
                title="Initiate phone call to this lead"
              >
                <PhoneCall size={14} />
                <span>Call Now</span>
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
