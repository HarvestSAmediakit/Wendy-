import React, { useState } from 'react';
import { X, Shield, CheckCircle2, Phone, PhoneOff, Mic, MicOff, AlertCircle, FileText, Info, Building2, User, Mail } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Lead } from '../types';
import { cn } from '../lib/utils';
import { doc, updateDoc, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';

interface CallInterfaceProps {
  isOpen: boolean;
  onClose: () => void;
  lead: Lead | null;
}

export default function CallInterface({ isOpen, onClose, lead }: CallInterfaceProps) {
  const [consentGiven, setConsentGiven] = useState(false);
  const [notes, setNotes] = useState('');
  const [isForm4Read, setIsForm4Read] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!lead) return null;

  const handleLogCall = async (outcome: string) => {
    if (!auth.currentUser) return;
    setIsSubmitting(true);
    try {
      // Log interaction
      await addDoc(collection(db, 'calls'), {
        leadId: lead.id,
        ownerId: auth.currentUser.uid,
        type: 'call',
        outcome,
        notes,
        consentGiven,
        timestamp: serverTimestamp(),
        duration: 0,
      });

      // Update lead status
      const leadRef = doc(db, 'leads', lead.id);
      await updateDoc(leadRef, {
        status: outcome === 'Interested' ? 'Interested' : 'Follow-up',
        updatedAt: serverTimestamp()
      });

      if (outcome === 'Interested' && lead.email) {
        if (window.confirm(`Lead is interested! Do you want to copy their email (${lead.email}) to clipboard?`)) {
          navigator.clipboard.writeText(lead.email);
        }
      }

      onClose();
    } catch (error) {
      console.error('Failed to log call outcome:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-bg-deep/95 backdrop-blur-md"
        >
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 20, opacity: 0 }}
            className="w-full max-w-2xl bg-bg-panel border border-white/5 rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="p-8 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
              <div className="flex items-center gap-4">
                <div className="w-3 h-3 rounded-full bg-acc-blue animate-pulse" />
                <div>
                  <h3 className="text-xl font-serif italic text-white">{lead.companyName}</h3>
                  <p className="text-[10px] uppercase tracking-widest text-text-tertiary font-bold mt-1">
                    Lead Details & Contact Info
                  </p>
                </div>
              </div>
              <button 
                onClick={onClose} 
                className="p-2 text-text-muted hover:text-white transition-colors"
                disabled={isSubmitting}
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-8 space-y-8">
              {/* Contact Info Card */}
              <div className="bg-bg-deep/50 border border-border-subtle rounded-3xl p-6 space-y-4">
                 <h4 className="flex items-center gap-2 text-xs font-bold text-text-muted uppercase tracking-widest mb-4">
                   <User size={14} /> Decision Maker Profile
                 </h4>
                 
                 <div className="grid grid-cols-2 gap-6">
                    <div>
                      <p className="text-[10px] text-text-dim uppercase tracking-wider mb-1">Name</p>
                      <p className="text-sm text-text-primary font-medium">{lead.decisionMaker || 'Unknown'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-text-dim uppercase tracking-wider mb-1">Title</p>
                      <p className="text-sm text-text-primary font-medium">{lead.title || 'Decision Maker'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-text-dim uppercase tracking-wider mb-1">Phone</p>
                      <div className="flex items-center gap-2">
                        <Phone size={14} className="text-acc-gold" />
                        <p className="text-sm text-text-primary font-mono">{lead.phone || 'Not available'}</p>
                      </div>
                    </div>
                    <div>
                      <p className="text-[10px] text-text-dim uppercase tracking-wider mb-1">Email</p>
                      <div className="flex items-center gap-2">
                        <Mail size={14} className="text-acc-blue" />
                        <p className="text-sm text-text-primary font-medium break-all">{lead.email || 'Not available'}</p>
                      </div>
                    </div>
                 </div>
              </div>

              {/* Pitch Helper */}
              <div className="space-y-4">
                <h4 className="text-[10px] uppercase font-black text-acc-gold tracking-[0.3em] flex items-center gap-2">
                  <FileText size={14} /> Recommended Opening Angle
                </h4>
                <div className="p-6 bg-white/[0.02] border border-white/5 rounded-3xl">
                  <p className="text-lg text-white leading-relaxed italic">
                    "{lead.angle || 'Resilience Through Innovation during shifting market conditions.'}"
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-[10px] uppercase font-black text-text-muted tracking-[0.2em]">Log Interaction Notes</h4>
                <textarea 
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add notes about your call..."
                  className="w-full bg-white/[0.02] border border-white/5 rounded-3xl p-6 text-sm text-white placeholder:text-text-dim focus:border-acc-gold/50 outline-none transition-all min-h-[120px]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <button 
                  onClick={() => handleLogCall('Declined')}
                  className="p-6 bg-white/5 border border-white/10 rounded-3xl text-text-muted font-bold text-xs uppercase tracking-widest hover:bg-white/10 transition-all flex items-center justify-center gap-3"
                >
                  <PhoneOff size={18} />
                  Log as Declined
                </button>
                <button 
                  onClick={() => handleLogCall('Interested')}
                  className="p-6 bg-acc-gold text-bg-deep rounded-3xl font-black text-xs uppercase tracking-widest hover:brightness-110 transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:grayscale shadow-lg shadow-acc-gold/20"
                >
                  <CheckCircle2 size={18} />
                  Log as Interested
                </button>
              </div>

            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
