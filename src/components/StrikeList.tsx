import React, { useState, useEffect } from 'react';
import { PhoneCall, Clock, ChevronRight, Zap, Target, Phone, AlertCircle } from 'lucide-react';
import { collection, query, where, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { Lead } from '../types';
import { cn } from '../lib/utils';
import { format, isSameDay } from 'date-fns';

export default function StrikeList() {
  const [priorityLeads, setPriorityLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth.currentUser) return;

    const q = query(
      collection(db, 'leads'),
      where('ownerId', '==', auth.currentUser.uid),
      where('status', 'in', ['New', 'In Progress', 'Follow-up']),
      orderBy('score', 'desc'),
      limit(5)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const leads: Lead[] = [];
      const seenCompanies = new Set();
      
      snapshot.forEach(doc => {
        const data = doc.data();
        const companyNameLower = (data.companyName || '').toLowerCase().trim();
        if (!seenCompanies.has(companyNameLower)) {
          seenCompanies.add(companyNameLower);
          leads.push({ id: doc.id, ...data } as Lead);
        }
      });
      
      const now = new Date();
      leads.sort((a, b) => {
        const aFollowUp = a.nextFollowUp ? new Date(a.nextFollowUp).getTime() : Infinity;
        const bFollowUp = b.nextFollowUp ? new Date(b.nextFollowUp).getTime() : Infinity;
        
        const aIsDue = aFollowUp <= now.getTime();
        const bIsDue = bFollowUp <= now.getTime();
        
        if (aIsDue && !bIsDue) return -1;
        if (!aIsDue && bIsDue) return 1;
        
        return (b.score || 0) - (a.score || 0);
      });

      setPriorityLeads(leads);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) return null;
  if (priorityLeads.length === 0) return null;

  const topTarget = priorityLeads[0];

  return (
    <div className="w-full glass-panel rounded-[2rem] p-8 sm:p-12 mb-16 relative overflow-hidden group border-white/5">
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-acc-gold/10 rounded-full blur-[120px] -mr-64 -mt-64 transition-all duration-1000 group-hover:bg-acc-gold/20" />
      <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-acc-blue/5 rounded-full blur-[100px] -ml-32 -mb-32" />
      
      <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-12">
        <div className="flex-1 space-y-8 text-center lg:text-left">
          <div className="flex items-center justify-center lg:justify-start space-x-3">
            <div className="p-2 bg-acc-gold/10 rounded-lg">
              <Zap size={16} className="text-acc-gold animate-pulse" />
            </div>
            <span className="text-[11px] font-black uppercase tracking-[0.3em] text-acc-gold">Strategic Strike Order — {topTarget.nextFollowUp ? format(new Date(topTarget.nextFollowUp), 'HH:mm') : 'LIVE'} Window Active</span>
          </div>
          
          <div className="space-y-3">
            <h3 className="text-4xl sm:text-6xl font-serif italic text-text-primary tracking-tight leading-tight">
              Initiate contact with {topTarget.decisionMaker.split(' ')[0]} at <span className="text-acc-gold">{topTarget.companyName}</span>
            </h3>
            <p className="text-base sm:text-lg text-text-secondary max-w-2xl mx-auto lg:mx-0 font-light">
              High-intent signal detected via {topTarget.publication}. Strategic alignment score is <span className="text-text-primary font-bold">{topTarget.score}%</span>.
            </p>
          </div>

          <div className="flex flex-wrap justify-center lg:justify-start items-center gap-6 pt-4">
            <div className="flex items-center space-x-3 bg-white/5 px-5 py-2.5 rounded-full border border-white/10 group-hover:border-acc-gold/30 transition-colors">
              <Phone size={14} className="text-acc-gold" />
              <span className="text-sm font-mono font-bold tracking-wider text-text-primary">{topTarget.phone}</span>
            </div>
            {topTarget.nextFollowUp && (
              <div className="flex items-center space-x-3 bg-acc-gold/20 px-5 py-2.5 rounded-full border border-acc-gold/30">
                <Clock size={14} className="text-acc-gold" />
                <span className="text-[11px] uppercase font-black tracking-widest text-acc-gold">
                   Window Active {isSameDay(new Date(topTarget.nextFollowUp), new Date()) ? 'Now' : `on ${format(new Date(topTarget.nextFollowUp), 'MMM d')}`}
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row lg:flex-col gap-4 w-full lg:w-72">
          <button 
            className="bg-acc-gold text-bg-deep px-10 py-5 rounded-2xl flex items-center justify-center gap-4 shadow-[0_20px_50px_rgba(212,175,55,0.3)] hover:shadow-[0_20px_60px_rgba(212,175,55,0.5)] hover:-translate-y-1 transition-all active:scale-95 group/btn overflow-hidden relative"
            onClick={() => {
              window.dispatchEvent(new CustomEvent('wendy-action', { 
                detail: { name: 'trigger_call', args: { lead: topTarget } } 
              }));
            }}
          >
            <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover/btn:translate-x-[100%] transition-transform duration-700" />
            <PhoneCall size={20} />
            <span className="text-xs font-black uppercase tracking-widest">View Lead</span>
          </button>
          <button 
            className="bg-white/5 hover:bg-white/10 border border-white/10 text-text-primary px-10 py-5 rounded-2xl flex items-center justify-center gap-3 transition-all group/intel"
          >
            <Target size={18} className="text-text-tertiary group-hover/intel:text-acc-gold transition-colors" />
            <span className="text-xs font-black uppercase tracking-widest">View Deep Intel</span>
          </button>
        </div>
      </div>
      
      <div className="mt-16 pt-8 border-t border-white/5">
        <div className="flex items-center justify-between mb-6">
          <h4 className="text-[10px] font-black uppercase tracking-[0.4em] text-text-dim">Battle Sequence</h4>
          <div className="h-[1px] flex-1 mx-8 bg-white/5" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {priorityLeads.slice(1).map((lead) => {
            return (
              <div key={lead.id} className="group/item bg-white/[0.02] border border-white/5 p-6 rounded-2xl hover:border-acc-gold/20 hover:bg-white/[0.05] transition-all cursor-pointer relative overflow-hidden">
                <div className="flex justify-between items-start mb-4">
                  <span className="text-[9px] font-black text-acc-gold uppercase tracking-[0.2em]">{lead.publication}</span>
                  <div className="text-[9px] font-mono text-text-muted">{lead.nextFollowUp ? format(new Date(lead.nextFollowUp), 'HH:mm') : 'LIVE'}</div>
                </div>
                <h5 className="text-lg font-bold text-text-primary truncate mb-1">{lead.companyName}</h5>
                <p className="text-xs text-text-tertiary font-medium">{lead.decisionMaker}</p>
                <div className="flex items-center space-x-2 mt-4 opacity-40 group-hover/item:opacity-100 transition-opacity">
                  <Clock size={12} className="text-text-tertiary" />
                  <span className="text-[10px] font-black text-text-secondary uppercase tracking-widest text-acc-gold">Scheduled Slot</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
