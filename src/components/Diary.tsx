import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { 
  Calendar as CalendarIcon, 
  Clock, 
  Trash2, 
  PhoneCall, 
  Mail, 
  CheckCircle2, 
  XCircle,
  MoreHorizontal,
  ChevronRight,
  ChevronLeft,
  TrendingUp,
  AlertCircle,
  List
} from 'lucide-react';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, startOfMonth, endOfMonth, isSameMonth, isSameDay, addMonths, subMonths } from 'date-fns';
import { Lead, CallLog, CallOutcome } from '../types';
import { cn, handleFirestoreError, OperationType } from '../lib/utils';
import { db, auth } from '../lib/firebase';
import { collection, query, where, getDocs, addDoc, updateDoc, doc, serverTimestamp, orderBy } from 'firebase/firestore';
import { getPitchScript } from '../services/geminiService';
import LiveAssistOverlay from './LiveAssistOverlay';

export default function Diary() {
  const [diaryLeads, setDiaryLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [activeCall, setActiveCall] = useState<Lead | null>(null);
  const [activeScript, setActiveScript] = useState<string>('');
  const [isEditingScript, setIsEditingScript] = useState(false);
  const [loadingScript, setLoadingScript] = useState(false);
  const [showLogModal, setShowLogModal] = useState(false);
  const [showLiveAssist, setShowLiveAssist] = useState(false);
  const [savingLog, setSavingLog] = useState(false);
  const [outcome, setOutcome] = useState<CallOutcome>('Interested');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    fetchDiaryLeads();
  }, []);

  useEffect(() => {
    if (activeCall) {
      generateScript(activeCall);
    }
  }, [activeCall]);

  const generateScript = async (lead: Lead) => {
    setLoadingScript(true);
    try {
      const script = await getPitchScript(lead);
      setActiveScript(script || '');
    } catch (e) {
      console.error(e);
      setActiveScript('"Hi ' + (lead.decisionMaker || 'there').split(' ')[0] + ', target identified. Please use manual pitch context."');
    } finally {
      setLoadingScript(false);
    }
  };

  const fetchDiaryLeads = async () => {
    if (!auth.currentUser) return;
    setLoading(true);
    const leadsPath = 'leads';
    try {
      const q = query(
        collection(db, leadsPath),
        where('ownerId', '==', auth.currentUser.uid),
        where('status', 'in', ['New', 'In Progress', 'Follow-up']),
        orderBy('score', 'desc')
      );
      const snapshot = await getDocs(q);
      const data: Lead[] = [];
      snapshot.forEach(doc => data.push({ id: doc.id, ...doc.data() } as Lead));
      
      const now = new Date();
      // Sort in JS: Follow-ups that are passed or within 24 hours at the top
      data.sort((a, b) => {
        const aFollowUp = a.nextFollowUp ? new Date(a.nextFollowUp).getTime() : 0;
        const bFollowUp = b.nextFollowUp ? new Date(b.nextFollowUp).getTime() : 0;
        const aIsDue = aFollowUp > 0 && aFollowUp <= now.getTime() + 86400000;
        const bIsDue = bFollowUp > 0 && bFollowUp <= now.getTime() + 86400000;
        
        if (aIsDue && !bIsDue) return -1;
        if (!aIsDue && bIsDue) return 1;
        if (aIsDue && bIsDue) return aFollowUp - bFollowUp; // Earliest first
        
        return (b.score || 0) - (a.score || 0);
      });
      
      setDiaryLeads(data);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, leadsPath);
    } finally {
      setLoading(false);
    }
  };

  const handleLogCall = async () => {
    if (!activeCall || !auth.currentUser) return;
    
    setSavingLog(true);
    try {
      // 1. Create Call Log
      try {
        await addDoc(collection(db, 'calls'), {
          leadId: activeCall.id,
          outcome,
          notes,
          timestamp: new Date().toISOString(),
          ownerId: auth.currentUser.uid
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, 'calls');
      }

      // 2. Update Lead Status
      const newStatus = outcome === 'Interested' ? 'Interested' : outcome === 'Declined' ? 'Declined' : 'In Progress';
      const leadPath = `leads/${activeCall.id}`;
      try {
        await updateDoc(doc(db, 'leads', activeCall.id), {
          status: newStatus,
          updatedAt: new Date().toISOString()
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, leadPath);
      }

      // 3. Reset UI
      setShowLogModal(false);
      setActiveCall(null);
      setNotes('');
      fetchDiaryLeads();

      if (outcome === 'Interested' && activeCall.email) {
        if (window.confirm(`Lead is interested! Do you want to copy their email (${activeCall.email}) to clipboard?`)) {
            navigator.clipboard.writeText(activeCall.email);
        }
      }

    } catch (error) {
       console.error("Error logging call:", error);
    } finally {
       setSavingLog(false);
    }
  };

  const getStrategicSlots = (leads: Lead[]) => {
    const slots: { time: string; lead?: Lead; type: 'work' | 'lunch' | 'break' }[] = [];
    const workStart = 9;
    const workEnd = 16.5; // 4:30pm
    const lunchStart = 13;
    const lunchEnd = 14;
    
    let currentSlot = workStart;
    let leadIndex = 0;

    while (currentSlot < workEnd) {
      const hour = Math.floor(currentSlot);
      const minutes = (currentSlot % 1) * 60;
      const timeStr = `${hour.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;

      if (currentSlot >= lunchStart && currentSlot < lunchEnd) {
        if (currentSlot === lunchStart) {
          slots.push({ time: '13:00', type: 'lunch' });
        }
        currentSlot += 0.25;
        continue;
      }

      slots.push({ 
        time: timeStr, 
        lead: leads[leadIndex], 
        type: 'work' 
      });
      
      if (leads[leadIndex]) leadIndex++;
      currentSlot += 0.25; // 15 min slots
    }
    return slots;
  };

  const strategicSlots = getStrategicSlots(diaryLeads);

  const renderCalendar = () => {
    // Generate week days (Mon-Fri) based on current month/week
    const startWeek = startOfWeek(currentMonth, { weekStartsOn: 1 });
    const weekDays = [0, 1, 2, 3, 4].map(offset => {
      const d = new Date(startWeek);
      d.setDate(d.getDate() + offset);
      return d;
    });

    const timeSlots: string[] = [];
    for (let h = 9; h <= 16; h++) {
      for (let m = 0; m < 60; m += 15) {
        if (h === 16 && m > 40) break; // End at 4:40pm
        timeSlots.push(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`);
      }
    }

    const getLeadForSlot = (date: Date, time: string) => {
      return diaryLeads.find(lead => {
        if (!lead.nextFollowUp) return false;
        const d = new Date(lead.nextFollowUp);
        return isSameDay(d, date) && format(d, 'HH:mm') === time;
      });
    };

    return (
      <div className="bg-bg-panel border border-border-subtle rounded-xl p-6 shadow-xl relative animate-in fade-in zoom-in-95 duration-200 overflow-hidden">
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-serif italic text-xl text-text-primary">
            Week of {format(weekDays[0], 'MMMM d, yyyy')}
          </h3>
          <div className="flex items-center space-x-2">
            <button 
              onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} // To jump weeks we can just use setWeek/subWeeks, but subMonths is fine for now
              className="p-1 hover:bg-bg-element rounded text-text-muted hover:text-text-primary transition-colors"
            >
              <ChevronLeft size={20} />
            </button>
            <button 
              onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
              className="p-1 hover:bg-bg-element rounded text-text-muted hover:text-text-primary transition-colors"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        </div>

        <div className="max-h-[600px] overflow-y-auto scroll-hide">
          <div className="grid grid-cols-6 gap-2 text-center font-sans min-w-[600px]">
            {/* Header */}
            <div className="text-[10px] uppercase tracking-widest font-bold text-text-dim mb-4" />
            {weekDays.map(day => (
              <div key={day.toISOString()} className={cn("text-[10px] uppercase tracking-widest font-bold mb-4", isSameDay(day, new Date()) ? "text-acc-gold" : "text-text-dim")}>
                {format(day, 'EEE')}<br/>
                <span className="text-text-muted">{format(day, 'MMM d')}</span>
              </div>
            ))}

            {/* Time Grid */}
            {timeSlots.map(time => (
              <React.Fragment key={time}>
                {/* Time Label */}
                <div className="text-[10px] font-mono font-semibold text-text-tertiary flex items-center justify-end pr-2 border-r border-border-subtle/50 h-10">
                  {time}
                </div>
                
                {/* Days across */}
                {weekDays.map(day => {
                  const lead = getLeadForSlot(day, time);
                  return (
                    <div 
                      key={`${day.toISOString()}-${time}`}
                      onClick={() => lead && setActiveCall(lead)}
                      className={cn(
                        "h-10 border border-border-subtle/30 rounded flex items-center justify-center p-1 transition-colors relative group",
                        lead ? "bg-bg-element border-acc-gold/20 hover:border-acc-gold cursor-pointer shadow-[0_0_10px_rgba(0,0,0,0.1)]" : "hover:bg-bg-element/50",
                        time === '13:00' || time === '13:15' || time === '13:30' || time === '13:45' ? "bg-bg-deep/50 border-dashed" : ""
                      )}
                    >
                      {lead ? (
                        <div className="w-full text-left truncate px-1">
                          <p className="text-[9px] font-bold text-text-primary truncate">{lead.companyName}</p>
                          <p className="text-[8px] text-acc-gold/70 truncate">{lead.decisionMaker}</p>
                          {/* Tooltip */}
                          <div className="absolute left-0 bottom-full mb-2 w-48 bg-bg-deep border border-border-subtle rounded-lg p-2 shadow-2xl z-50 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity">
                            <p className="text-[10px] font-bold text-text-primary mb-1">{lead.companyName}</p>
                            <p className="text-[9px] text-text-muted mb-1 line-clamp-2">{lead.angle || (lead as any).pitchAngle || 'No pitch angle generated'}</p>
                            <p className="text-[8px] text-acc-gold/80 uppercase">Click to open Call Workspace</p>
                          </div>
                        </div>
                      ) : (
                        (time === '13:00' || time === '13:15' || time === '13:30' || time === '13:45') ? (
                          <span className="text-[8px] uppercase tracking-widest text-text-tertiary/30">Lunch</span>
                        ) : null
                      )}
                    </div>
                  );
                })}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-6xl mx-auto space-y-12">
      <header className="flex flex-col md:flex-row md:items-end md:justify-between space-y-4 md:space-y-0">
        <div className="space-y-2">
          <h2 className="text-4xl md:text-5xl font-serif italic text-text-primary tracking-tight leading-none mb-2">Call Diary</h2>
          <p className="font-sans text-xs text-text-muted uppercase tracking-[0.2em] font-medium mt-3">Priority Queued • {new Date().toLocaleDateString('en-ZA', { dateStyle: 'full' })}</p>
        </div>
        <div className="bg-bg-panel border border-acc-gold/20 rounded-lg px-4 py-2 flex items-center space-x-3 shadow-[0_0_15px_rgba(212,175,55,0.05)]">
          <Clock size={16} className="text-acc-gold/60" />
          <span className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] leading-none text-text-muted">Next Window: 14:00 SAST</span>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        {/* Priority List */}
        <div className="lg:col-span-6 space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-border-subtle">
             <div className="flex items-center space-x-6">
               <button 
                 onClick={() => setViewMode('list')}
                 className={cn("flex items-center space-x-2 font-sans text-xs font-semibold uppercase tracking-[0.15em] transition-all pb-1", viewMode === 'list' ? "text-acc-gold border-b-2 border-acc-gold" : "text-text-muted hover:text-text-primary border-b-2 border-transparent")}
               >
                 <List size={14} />
                 <span>Queue</span>
               </button>
               <button 
                 onClick={() => setViewMode('calendar')}
                 className={cn("flex items-center space-x-2 font-sans text-xs font-semibold uppercase tracking-[0.15em] transition-all pb-1", viewMode === 'calendar' ? "text-acc-gold border-b-2 border-acc-gold" : "text-text-muted hover:text-text-primary border-b-2 border-transparent")}
               >
                 <CalendarIcon size={14} />
                 <span>Calendar</span>
               </button>
             </div>
             <span className="font-sans text-[10px] bg-bg-element text-acc-gold border border-acc-gold/20 px-3 py-1 rounded-full uppercase tracking-wider font-semibold">{diaryLeads.length} Nodes</span>
          </div>

          {/* Today's Schedule Override */}
          {viewMode === 'list' && (
            <div className="bg-white/[0.02] border border-white/5 rounded-3xl p-8 shadow-2xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-acc-gold/5 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-acc-gold/10 transition-all" />
              <h4 className="font-sans text-[10px] font-black uppercase tracking-[0.3em] text-text-tertiary mb-8">Strategic Order of Battle</h4>
              
              <div className="space-y-4">
                {strategicSlots.map((slot, i) => (
                  <div 
                    key={i} 
                    className={cn(
                      "flex items-center gap-6 p-5 rounded-2xl border transition-all duration-300",
                      slot.type === 'lunch' 
                        ? "bg-white/[0.01] border-white/5 opacity-40 grayscale" 
                        : slot.lead 
                          ? "bg-white/[0.03] border-white/10 hover:border-acc-gold/30 hover:bg-white/[0.05] cursor-pointer"
                          : "bg-white/[0.01] border-white/5 border-dashed"
                    )}
                    onClick={() => slot.lead && setActiveCall(slot.lead)}
                  >
                    <div className="w-16 shrink-0">
                      <span className="font-mono text-xs font-black text-acc-gold tracking-widest">{slot.time}</span>
                    </div>
                    
                    <div className="flex-1">
                      {slot.type === 'lunch' ? (
                        <div className="flex items-center gap-3">
                           <div className="w-1.5 h-1.5 rounded-full bg-white/20" />
                           <span className="text-[10px] font-black uppercase tracking-widest text-text-dim/60">Recuperation Window (Lunch)</span>
                        </div>
                      ) : slot.lead ? (
                        <div className="flex flex-col">
                           <span className="text-sm font-bold text-text-primary tracking-tight">{slot.lead.companyName}</span>
                           <span className="text-[9px] font-black uppercase tracking-widest text-text-tertiary mt-1">{slot.lead.decisionMaker}</span>
                        </div>
                      ) : (
                        <span className="text-[10px] font-black uppercase tracking-widest text-text-dim/40 italic">Open Intel Slot</span>
                      )}
                    </div>

                    {slot.lead && (
                      <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-acc-gold group-hover:bg-acc-gold group-hover:text-black transition-all">
                        <ChevronRight size={14} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="flex items-center space-x-6">
                  <span className="w-8 font-mono text-xs font-bold text-text-dim/20 opacity-0">0{i}</span>
                  <div className="flex-1 bg-bg-panel/50 border border-border-subtle p-5 rounded-lg animate-pulse min-h-[90px] flex flex-col justify-center space-y-2">
                     <div className="flex justify-between items-center">
                        <div className="h-4 bg-bg-element rounded w-1/3"></div>
                        <div className="h-4 bg-bg-element rounded w-16"></div>
                     </div>
                     <div className="h-3 bg-bg-element rounded w-1/4 mt-2"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : viewMode === 'calendar' ? (
             renderCalendar()
          ) : diaryLeads.length > 0 ? (
            <div className="space-y-4 scroll-hide max-h-[600px] overflow-y-auto pr-2">
               {diaryLeads.map((lead, idx) => (
                 <div 
                   key={lead.id}
                   className={cn(
                     "flex items-center space-x-6 group transition-all",
                     activeCall?.id === lead.id ? "opacity-30 pointer-events-none scale-95" : ""
                   )}
                 >
                    <span className="font-mono text-xs font-bold text-text-dim/20 w-8 group-hover:text-acc-gold/40 transition-colors">0{idx + 1}</span>
                    <div className="flex-1 bg-bg-panel border border-border-subtle p-5 rounded-lg hover:border-acc-gold/40 hover:bg-bg-element transition-all cursor-pointer shadow-lg group-hover:shadow-acc-gold/5 flex flex-col justify-center">
                       <div className="flex items-center justify-between">
                          <div className="space-y-1">
                             <div className="flex items-center space-x-3">
                               <h4 className="font-serif italic text-lg tracking-tight text-text-primary group-hover:text-acc-gold transition-colors">{lead.companyName}</h4>
                               <span className="text-[8px] font-mono border border-acc-gold/20 text-acc-gold px-1.5 uppercase font-bold rounded">{lead.publication}</span>
                             </div>
                             <p className="font-mono text-[9px] uppercase text-text-dim font-bold tracking-widest">{lead.decisionMaker} · {lead.title}</p>
                          </div>
                          <button 
                            onClick={() => setActiveCall(lead)}
                            className="bg-bg-element text-acc-gold p-3 rounded border border-border-subtle hover:bg-acc-gold hover:text-bg-deep transition-all shadow-lg"
                          >
                            <PhoneCall size={18} />
                          </button>
                       </div>
                       {lead.nextFollowUp && (
                         <div className={cn(
                           "mt-3 flex items-center space-x-2 text-[10px] font-sans uppercase font-semibold tracking-wider",
                           new Date(lead.nextFollowUp).getTime() < new Date().getTime() 
                             ? "text-red-400" 
                             : "text-acc-gold/70"
                         )}>
                           <Clock size={12} />
                           <span>Due: {new Date(lead.nextFollowUp).toLocaleString('en-ZA', { dateStyle: 'short', timeStyle: 'short' })}</span>
                         </div>
                       )}
                    </div>
                 </div>
               ))}
            </div>
          ) : (
            <div className="p-20 text-center border-2 border-dashed border-border-subtle rounded-xl bg-bg-panel/50">
               <CheckCircle2 size={40} className="mx-auto text-green-500/20 mb-6" />
               <p className="font-serif italic text-xl text-text-primary">Queue Depleted</p>
               <p className="font-mono text-[10px] text-text-dim uppercase tracking-[0.2em] mt-3">All scheduled intelligence pulses for today are resolved.</p>
            </div>
          )}
        </div>

        {/* Call Workspace */}
        <div className="lg:col-span-6 space-y-8">
           <div className="pb-4 border-b border-border-subtle">
             <h3 className="font-sans text-xs font-semibold uppercase tracking-[0.15em] text-text-muted">Call Workspace</h3>
           </div>

           {activeCall ? (
              <div className="space-y-8">
                <div className="bg-bg-panel border border-border-subtle rounded-xl p-8 shadow-2xl relative overflow-hidden border-t-4 border-t-acc-gold">
                   <div className="absolute top-0 right-0 w-32 h-32 bg-acc-gold/5 rounded-full blur-3xl -mr-16 -mt-16" />
                   
                   <div className="space-y-4 relative z-10">
                      <p className="font-sans text-[10px] uppercase font-semibold text-acc-gold tracking-[0.15em]">Active Intelligence Session</p>
                      <h3 className="text-4xl font-serif italic text-text-primary tracking-tight leading-tight">{activeCall.companyName}</h3>
                      <div className="flex flex-wrap items-center gap-4 font-sans text-xs uppercase bg-bg-element px-4 py-3 rounded border border-border-subtle w-fit">
                        <span className="font-semibold text-text-primary">{activeCall.decisionMaker}</span>
                        <span className="text-text-dim">|</span>
                        <span className="font-semibold text-acc-gold">{activeCall.phone}</span>
                        {activeCall.nextFollowUp && (
                          <>
                            <span className="text-text-dim">|</span>
                            <span className={cn(
                              "font-semibold flex items-center space-x-1",
                              new Date(activeCall.nextFollowUp).getTime() < new Date().getTime() ? "text-red-400" : "text-acc-gold/80"
                            )}>
                              <Clock size={12} />
                              <span>Due: {new Date(activeCall.nextFollowUp).toLocaleString('en-ZA', { dateStyle: 'short', timeStyle: 'short' })}</span>
                            </span>
                          </>
                        )}
                      </div>
                      <div className="pt-2">
                        <button 
                          onClick={() => setShowLiveAssist(true)}
                          className="flex items-center gap-2 px-4 py-2 bg-blue-500/10 text-blue-400 border border-blue-500/30 rounded font-sans text-[10px] uppercase font-bold tracking-widest shadow-lg shadow-blue-500/10 hover:bg-blue-500/20 transition-all font-bold"
                        >
                          <PhoneCall size={14} /> Start Call w/ Live Assist
                        </button>
                      </div>
                   </div>

                   <div className="space-y-4 pt-8 relative z-10">
                      <div className="flex items-center justify-between">
                         <h4 className="font-sans text-[10px] font-semibold uppercase tracking-[0.15em] text-text-muted">Dynamic Pitch Generator</h4>
                         <div className="flex space-x-3 items-center">
                           {activeScript && !loadingScript && (
                             <button
                               onClick={() => setIsEditingScript(!isEditingScript)}
                               className="text-[10px] font-sans text-text-muted hover:text-text-primary border-b border-transparent hover:border-text-primary transition-all"
                             >
                               {isEditingScript ? 'Done Editing' : 'Edit Script'}
                             </button>
                           )}
                           <button 
                              onClick={() => {
                                setIsEditingScript(false);
                                generateScript(activeCall);
                              }}
                              className="text-[10px] font-sans text-acc-gold border-b border-acc-gold/20 font-semibold uppercase tracking-wider hover:border-acc-gold transition-all disabled:opacity-50"
                              disabled={loadingScript}
                           >
                              {loadingScript ? 'Rerouting Node...' : 'Regenerate Script'}
                           </button>
                         </div>
                      </div>
                      <div className="bg-bg-deep text-text-muted p-6 rounded-lg border border-border-subtle leading-relaxed text-sm font-sans relative group min-h-[200px]">
                         <div className="absolute top-4 right-4 animate-pulse">
                           <div className="w-1.5 h-1.5 bg-acc-gold rounded-full shadow-[0_0_8px_rgba(212,175,55,1)]" />
                         </div>
                         {loadingScript ? (
                           <div className="animate-pulse space-y-4 opacity-60">
                             <div className="flex items-center space-x-3 mb-6">
                               <div className="w-2 h-2 bg-acc-gold/50 rounded-full animate-ping" />
                               <p className="font-mono text-[10px] uppercase font-bold tracking-widest text-acc-gold/80">Processing Context...</p>
                             </div>
                             <div className="h-4 bg-bg-element rounded w-1/4"></div>
                             <div className="h-4 bg-bg-element rounded w-full"></div>
                             <div className="h-4 bg-bg-element rounded w-5/6"></div>
                             <div className="h-4 bg-bg-element rounded w-1/3 mt-6"></div>
                             <div className="h-4 bg-bg-element rounded w-11/12"></div>
                           </div>
                         ) : isEditingScript ? (
                           <textarea
                             value={activeScript}
                             onChange={(e) => setActiveScript(e.target.value)}
                             className="w-full h-[300px] bg-transparent border-none focus:ring-0 focus:outline-none resize-y text-sm font-sans text-text-primary"
                             placeholder="Edit your pitch script here..."
                             autoFocus
                           />
                         ) : (
                           <div className="markdown-body text-sm font-sans [&>h3]:text-acc-gold [&>h3]:text-[10px] [&>h3]:uppercase [&>h3]:tracking-[0.15em] [&>h3]:mt-6 [&>h3]:mb-2 [&>p]:mb-4 first:mt-0 italic">
                             {activeScript ? <ReactMarkdown>{activeScript}</ReactMarkdown> : <p>"Hi {activeCall.decisionMaker.split(' ')[0]}, target identified..."</p>}
                           </div>
                         )}
                      </div>
                   </div>

                   <div className="pt-8 relative z-10">
                      <button 
                        onClick={() => setShowLogModal(true)}
                        className="btn-gold w-full py-5 text-[11px] shadow-lg shadow-acc-gold/20"
                      >
                        Resolve Session & Log Analytics
                      </button>
                   </div>
                </div>

                <div className="flex items-center justify-center space-x-3 p-4 bg-bg-panel border border-border-subtle rounded-lg">
                   <AlertCircle className="text-acc-gold/60" size={16} />
                   <p className="text-[9px] font-mono uppercase tracking-[0.2em] font-bold text-text-dim">Rule 14: No cold outreach post 15:00 SAST on Fridays</p>
                </div>
              </div>
           ) : (
              <div className="h-[450px] border-2 border-dashed border-border-subtle rounded-xl flex flex-col items-center justify-center text-center p-12 bg-bg-panel/30">
                 <PhoneCall size={48} className="text-bg-element mb-6 rotate-12 opacity-50" />
                 <p className="font-serif italic text-xl text-text-dim">Call Journal</p>
                 <p className="font-mono text-[9px] text-text-dim uppercase tracking-[0.2em] mt-4 max-w-xs leading-relaxed">Select a scheduled call from the list to view details and pitch scripts.</p>
              </div>
           )}
        </div>
      </div>

      {/* Outcome Modal */}
      {showLogModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-bg-deep/90 backdrop-blur-md">
           <div className="max-w-md w-full bg-bg-panel border border-border-subtle rounded-xl shadow-2xl p-8 space-y-8 border-t-4 border-t-acc-gold animate-in fade-in zoom-in duration-300">
              <header className="space-y-2">
                 <h3 className="text-3xl font-serif italic text-text-primary tracking-tight">Session Resolution</h3>
                 <p className="font-mono text-[9px] uppercase text-text-dim tracking-[0.2em] font-bold">Node State Transition · Global Sync</p>
              </header>

              <div className="grid grid-cols-1 gap-2">
                 {(['Interested', 'Send Media Kit', 'Callback', 'Declined', 'Not Right Person'] as CallOutcome[]).map((oc) => (
                    <button 
                      key={oc}
                      onClick={() => setOutcome(oc)}
                      className={cn(
                        "p-4 text-left font-mono text-[10px] uppercase tracking-[0.2em] font-bold border rounded group transition-all",
                        outcome === oc 
                          ? "bg-acc-gold text-bg-deep border-acc-gold shadow-[0_0_15px_rgba(212,175,55,0.2)]" 
                          : "bg-bg-element text-text-muted border-border-subtle hover:border-acc-gold/40 hover:text-text-primary"
                      )}
                    >
                      {oc}
                    </button>
                 ))}
              </div>

              <div className="space-y-3">
                 <label className="font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-text-dim">Node Observations</label>
                 <textarea 
                   className="w-full bg-bg-deep border border-border-subtle rounded-lg p-4 text-sm text-text-muted focus:outline-none focus:border-acc-gold/40 transition-all h-32 resize-none placeholder:text-text-dim/30"
                   placeholder="Log objections, callback schedules, or specific node context..."
                   value={notes}
                   onChange={(e) => setNotes(e.target.value)}
                 />
              </div>

              <div className="flex space-x-3 pt-4">
                 <button 
                   onClick={() => setShowLogModal(false)}
                   className="flex-1 px-4 py-4 bg-transparent border border-border-subtle text-text-dim rounded-lg font-mono text-[10px] uppercase font-bold tracking-[0.2em] hover:bg-bg-element"
                 >
                   Abort
                 </button>
                 <button 
                   onClick={handleLogCall}
                   disabled={savingLog}
                   className="flex-1 px-4 py-4 bg-acc-gold border border-acc-gold text-bg-deep rounded-lg font-mono text-[10px] uppercase font-bold tracking-[0.2em] hover:brightness-110 shadow-lg shadow-acc-gold/20 disabled:opacity-50 flex items-center justify-center space-x-2 transition-all"
                 >
                   {savingLog ? (
                     <>
                        <div className="w-3 h-3 border-2 border-bg-deep border-t-transparent rounded-full animate-spin" />
                        <span>Syncing...</span>
                     </>
                   ) : (
                     <span>Sync Analytics</span>
                   )}
                 </button>
              </div>
           </div>
        </div>
      )}

      {/* Live Assist Overlay */}
      <LiveAssistOverlay 
        isOpen={showLiveAssist} 
        onClose={() => setShowLiveAssist(false)} 
        lead={activeCall} 
      />
    </div>
  );
}
