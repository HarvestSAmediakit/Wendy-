import React, { useState, useEffect } from 'react';
import { Phone, X, Clock } from 'lucide-react';
import { collection, query, where, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { Lead } from '../types';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

export default function GlobalCallReminder() {
  const [nextCall, setNextCall] = useState<Lead | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!auth.currentUser) return;

    const q = query(
      collection(db, 'leads'),
      where('ownerId', '==', auth.currentUser.uid),
      where('status', 'in', ['New', 'In Progress', 'Follow-up']),
      orderBy('score', 'desc'),
      limit(1)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const lead = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as Lead;
        setNextCall(lead);
      } else {
        setNextCall(null);
      }
    });

    return () => unsubscribe();
  }, []);

  if (dismissed || !nextCall) return null;

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -50, opacity: 0 }}
        className="fixed top-[74px] sm:top-[100px] left-1/2 -translate-x-1/2 z-[45] w-full max-w-4xl px-4 pointer-events-none"
      >
        <div className="bg-acc-gold text-bg-deep rounded-full px-6 py-2.5 flex items-center justify-between shadow-[0_0_40px_rgba(245,158,11,0.4)] border border-acc-gold/50 backdrop-blur-xl pointer-events-auto">
          <div className="flex items-center space-x-4 overflow-hidden">
            <div className="w-8 h-8 rounded-full bg-bg-deep flex items-center justify-center shrink-0">
              <Phone size={14} className="text-acc-gold animate-bounce" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-[10px] font-black uppercase tracking-widest leading-none opacity-80">WENDY Priority Call</span>
              <span className="text-sm font-bold truncate">Phone {nextCall.companyName} ({nextCall.decisionMaker.split(' ')[0]})</span>
            </div>
          </div>
          
          <div className="flex items-center space-x-3 ml-4">
             <button 
               onClick={() => window.location.href = `tel:${nextCall.phone}`}
               className="bg-bg-deep text-acc-gold px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest hover:brightness-125 transition-all"
             >
               Call Now
             </button>
             <button 
               onClick={() => setDismissed(true)}
               className="p-1 hover:bg-bg-deep/10 rounded-full transition-colors"
             >
               <X size={16} />
             </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
