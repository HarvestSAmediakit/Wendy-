import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { 
  Search, 
  Filter, 
  Phone, 
  Mail, 
  ExternalLink, 
  MoreVertical,
  Plus,
  RefreshCw,
  Building,
  Target,
  User,
  Globe,
  ArrowUpDown,
  ShieldCheck,
  ChevronRight,
  Linkedin,
  Clock,
  Sparkles,
  Loader2,
  Bot,
  Zap
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Lead, PublicationType, LeadStatus } from '../types';
import { cn, handleFirestoreError, OperationType } from '../lib/utils';
import { db, auth } from '../lib/firebase';
import { collection, query, where, getDocs, orderBy, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { enrichWithLinkedIn, generateQuickPitch } from '../services/geminiService';
import SourceLeadsModal from './SourceLeadsModal';

interface LeadListProps {
  initialPublication: PublicationType | 'All';
  initialSearchQuery?: string;
  magazineContext?: 'All' | PublicationType;
}

export default function LeadList({ initialPublication, initialSearchQuery = "", magazineContext = 'All' }: LeadListProps) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState(initialSearchQuery);
  const [filterPub, setFilterPub] = useState<PublicationType | 'All'>(magazineContext !== 'All' ? magazineContext : initialPublication);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [loadingEnrichment, setLoadingEnrichment] = useState(false);
  const [showSourceModal, setShowSourceModal] = useState(false);
  const [isGeneratingPitch, setIsGeneratingPitch] = useState<string | null>(null);
  const [sortCriteria, setSortCriteria] = useState<'score' | 'companyName' | 'updatedAt'>('score');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    if (magazineContext !== 'All') {
      setFilterPub(magazineContext);
    } else {
      setFilterPub(initialPublication);
    }
  }, [initialPublication, magazineContext]);

  useEffect(() => {
    setSearchTerm(initialSearchQuery);
  }, [initialSearchQuery]);

  const [isVerifyingApollo, setIsVerifyingApollo] = useState(false);

  const handleVerifyApollo = async () => {
    if (!selectedLead || !selectedLead.id) return;
    setIsVerifyingApollo(true);
    
    try {
      const response = await fetch('/api/apollo-match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          firstName: selectedLead.decisionMaker.split(' ')[0], 
          lastName: selectedLead.decisionMaker.split(' ').slice(1).join(' ') || ' ',
          companyName: selectedLead.companyName,
          email: selectedLead.email
        })
      });
      
      const data = await response.json();
      if (data.success && data.person) {
        const leadRef = doc(db, 'leads', selectedLead.id);
        const updates: any = {
          updatedAt: new Date().toISOString(),
          apolloVerified: true
        };
        
        if (data.person.email) updates.email = data.person.email;
        if (data.person.phone) updates.phone = data.person.phone;
        if (data.person.linkedin) updates.linkedinUrl = data.person.linkedin;
        
        await updateDoc(leadRef, updates);
        setSelectedLead({ ...selectedLead, ...updates });
      }
    } catch (error) {
      console.error("Apollo Verification Error:", error);
    } finally {
      setIsVerifyingApollo(false);
    }
  };

  const handleUpdateFollowUp = async (newDate: string | null) => {
    if (!selectedLead || !selectedLead.id) return;
    try {
      const newStatus = newDate ? 'Follow-up' : 'New';
      const leadPath = `leads/${selectedLead.id}`;
      try {
        await updateDoc(doc(db, 'leads', selectedLead.id), {
          nextFollowUp: newDate,
          status: newStatus,
          updatedAt: new Date().toISOString()
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, leadPath);
      }
      setSelectedLead({ ...selectedLead, nextFollowUp: newDate === null ? undefined : newDate, status: newStatus });
    } catch (error) {
      console.error("Error updating follow-up:", error);
    }
  };

  const handleEnrichLinkedIn = async () => {
    if (!selectedLead || !selectedLead.id) return;
    setLoadingEnrichment(true);
    
    try {
      const insights = await enrichWithLinkedIn(selectedLead);
      
      const leadRef = doc(db, 'leads', selectedLead.id);
      await updateDoc(leadRef, {
        linkedInInsights: insights,
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingEnrichment(false);
    }
  };

  const handleQuickPitch = async (lead: Lead) => {
    if (!lead.id) return;
    setIsGeneratingPitch(lead.id);
    try {
      const pitch = await generateQuickPitch(lead);
      const leadPath = `leads/${lead.id}`;
      try {
        await updateDoc(doc(db, 'leads', lead.id), {
          quickPitch: pitch,
          updatedAt: new Date().toISOString()
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, leadPath);
      }
      if (selectedLead?.id === lead.id) {
        setSelectedLead({ ...selectedLead, quickPitch: pitch });
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsGeneratingPitch(null);
    }
  };

  useEffect(() => {
    if (!auth.currentUser) return;

    const leadsPath = 'leads';
    let q = query(
      collection(db, leadsPath),
      where('ownerId', '==', auth.currentUser.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const leadsData: Lead[] = [];
      const seenCompanies = new Set();
      snapshot.forEach((doc) => {
        const data = doc.data();
        const companyNameLower = (data.companyName || '').toLowerCase().trim();
        if (!seenCompanies.has(companyNameLower)) {
          seenCompanies.add(companyNameLower);
          leadsData.push({ id: doc.id, ...data } as Lead);
        }
      });
      setLeads(leadsData);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, leadsPath);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const filteredLeads = leads
    .filter(lead => {
      const company = lead.companyName || '';
      const sector = lead.sector || '';
      const matchesSearch = company.toLowerCase().includes(searchTerm.toLowerCase()) || 
                           sector.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesPub = filterPub === 'All' || lead.publication === filterPub;
      return matchesSearch && matchesPub;
    })
    .sort((a, b) => {
      let comparison = 0;
      if (sortCriteria === 'score') {
        comparison = (a.score || 0) - (b.score || 0);
      } else if (sortCriteria === 'companyName') {
        comparison = (a.companyName || '').localeCompare(b.companyName || '');
      } else if (sortCriteria === 'updatedAt') {
        comparison = new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

  return (
    <div className="w-full flex flex-col space-y-8">
      <header className="flex flex-col md:flex-row md:items-end md:justify-between space-y-4 md:space-y-0">
        <div className="space-y-1 sm:space-y-2">
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-serif italic text-text-primary tracking-tight leading-none mb-1 sm:mb-2">Intelligence Database</h2>
          <p className="font-sans text-[8px] sm:text-xs text-text-muted uppercase tracking-[0.2em] font-medium">Curated Prospects • Node Harvesting Active</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <button 
            onClick={() => setShowSourceModal(true)}
            className="btn-outline flex items-center space-x-2 text-[9px] sm:text-[10px] py-1.5 sm:py-2 px-3 sm:px-4 rounded-lg sm:rounded-xl"
            title="Extract leads via web scraping or APIs"
          >
            <Target size={12} className="text-acc-gold sm:w-3.5 sm:h-3.5" />
            <span>Deep Scrape</span>
          </button>
          <button className="btn-outline flex items-center space-x-2 text-[9px] sm:text-[10px] py-1.5 sm:py-2 px-3 sm:px-4 rounded-lg sm:rounded-xl" title="Refresh data for existing leads">
            <RefreshCw size={12} className="text-acc-gold sm:w-3.5 sm:h-3.5" />
            <span>Rescan</span>
          </button>
          <button className="btn-gold flex items-center space-x-2 text-[9px] sm:text-[10px] py-1.5 sm:py-2 px-3 sm:px-4 rounded-lg sm:rounded-xl" title="Add a new custom lead manually">
            <Plus size={12} className="sm:w-3.5 sm:h-3.5" />
            <span>Manual</span>
          </button>
        </div>
      </header>

      {/* Filters Bar */}
      <div className="flex flex-col md:flex-row gap-4 sm:gap-6">
        <div className="flex-1 relative group min-w-0 flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-4 sm:left-6 top-1/2 -translate-y-1/2 text-text-tertiary group-focus-within:text-acc-blue transition-colors shrink-0 sm:w-5 sm:h-5" size={18} />
            <input 
              type="text" 
              placeholder="Search by nexus, sector..."
              className="w-full glass-panel border border-white/5 rounded-xl sm:rounded-2xl pl-12 sm:pl-16 pr-4 sm:pr-6 py-3 sm:py-5 font-sans text-xs sm:text-sm focus:border-acc-blue/40 focus:ring-0 focus:outline-none transition-all placeholder:text-text-tertiary truncate"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div className="flex items-center gap-2">
            <select className="glass-panel border border-white/5 rounded-xl py-3 px-4 text-xs" value={sortCriteria} onChange={(e) => setSortCriteria(e.target.value as any)}>
               <option value="score">Sort by Score</option>
               <option value="companyName">Sort by Name</option>
               <option value="updatedAt">Sort by Date</option>
            </select>
            <button className="glass-panel border border-white/5 rounded-xl py-3 px-4" onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}>
               <ArrowUpDown size={16} />
            </button>
          </div>
        </div>
        
        <div className="flex p-1 glass-panel rounded-xl sm:rounded-2xl border border-white/5 overflow-x-auto scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0">
          <div className="inline-flex items-center space-x-1 shrink-0">
            {(['All', 'Harvest SA', 'Black Business Quarterly', 'Leadership Magazine'] as const).map((pub) => (
              <button 
                key={pub}
                onClick={() => setFilterPub(pub)}
                title={`Filter by ${pub}`}
                className={cn(
                  "px-4 sm:px-6 py-2 sm:py-3 rounded-lg sm:rounded-xl font-sans text-[10px] sm:text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap",
                  filterPub === pub 
                    ? "bg-white text-bg-deep shadow-xl" 
                    : "text-text-tertiary hover:text-text-secondary hover:bg-white/5"
                )}
              >
                {pub}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 pb-12">
            <div className="space-y-6">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="glass-panel p-8 rounded-[2rem] animate-pulse h-32" />
              ))}
            </div>
            <div className="hidden lg:block glass-panel p-10 rounded-[3rem] animate-pulse h-[600px]" />
        </div>
      ) : filteredLeads.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-32 glass-panel rounded-[3rem] text-center">
          <Building size={64} className="text-white/5 mb-8" />
          <h3 className="text-3xl italic font-serif text-text-primary">No active nodes detected</h3>
          <p className="body-default text-text-tertiary mt-4 max-w-xs">Adjust your retrieval parameters or initiate a fresh market scrape.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_450px] gap-12 pb-12">
           {/* Leads List */}
           <div className="space-y-6">
              {filteredLeads.map((lead) => (
                <LeadCard 
                  key={lead.id} 
                  lead={lead} 
                  active={selectedLead?.id === lead.id}
                  onClick={() => setSelectedLead(lead)}
                  onGeneratePitch={() => handleQuickPitch(lead)}
                  isGeneratingPitch={isGeneratingPitch === lead.id}
                />
              ))}
           </div>

           {/* Detail Panel */}
           <div className="lg:sticky lg:top-12 self-start">
              <AnimatePresence mode="wait">
                {selectedLead ? (
                  <motion.div 
                    key={selectedLead.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="glass-panel rounded-3xl sm:rounded-[3rem] shadow-2xl overflow-hidden relative"
                  >
                     <div className="absolute top-0 right-0 w-64 h-64 bg-acc-gold/5 rounded-full blur-[80px] -mr-32 -mt-32" />
                     <div className="p-6 sm:p-10 space-y-6 sm:space-y-10 relative z-10">
                        <header className="flex flex-col sm:flex-row justify-between items-start gap-4">
                          <div className="space-y-2 sm:space-y-4">
                            <div className="flex items-center space-x-2 sm:space-x-3">
                              <Target size={14} className="text-acc-gold sm:w-4 sm:h-4" />
                              <span className="text-[9px] sm:text-[10px] uppercase tracking-[0.2em] font-black text-acc-gold">{selectedLead.publication}</span>
                            </div>
                            <h3 className="text-2xl sm:text-4xl font-serif italic text-text-primary leading-tight flex items-center gap-2 sm:gap-3">
                              {selectedLead.companyName}
                              {selectedLead.apolloVerified && (
                                <ShieldCheck size={18} className="text-emerald-500 sm:w-5 sm:h-5" />
                              )}
                            </h3>
                            <p className="text-[9px] sm:text-[10px] uppercase tracking-[0.3em] font-black text-text-tertiary">{selectedLead.sector}</p>
                          </div>
                          <div className="text-left sm:text-right w-full sm:w-auto">
                             <div className="text-3xl sm:text-5xl font-sans font-black tracking-tighter text-white">{selectedLead.score || 0}</div>
                             <div className="text-[9px] sm:text-[10px] uppercase tracking-[0.2em] font-black text-acc-gold">Nodescore</div>
                          </div>
                        </header>

                        <div className="grid grid-cols-1 gap-6 sm:gap-8">
                          <div className="space-y-6 sm:space-y-8">
                             <InfoItem label="Decision Maker" value={selectedLead.decisionMaker} sub={selectedLead.title} />
                             
                             <div className="flex flex-wrap gap-2 sm:gap-4 pt-4 border-t border-white/5">
                                <div 
                                  onClick={() => selectedLead.phone && navigator.clipboard.writeText(selectedLead.phone)}
                                  className="cursor-pointer p-3 sm:p-4 glass-high rounded-xl sm:rounded-2xl flex items-center gap-2 sm:gap-3 hover:bg-acc-gold/10 transition-all relative group flex-1 sm:flex-none justify-center sm:justify-start" 
                                  title="Copy phone number"
                                >
                                   <Phone size={16} className="text-acc-gold sm:w-5 sm:h-5" />
                                   <span className="font-mono text-[10px] sm:text-xs">{selectedLead.phone}</span>
                                </div>
                                <div 
                                  onClick={() => selectedLead.email && navigator.clipboard.writeText(selectedLead.email)}
                                  className="cursor-pointer p-3 sm:p-4 glass-high rounded-xl sm:rounded-2xl flex items-center gap-2 sm:gap-3 hover:bg-acc-blue/10 transition-all relative group flex-1 sm:flex-none justify-center sm:justify-start" 
                                  title="Copy email address"
                                >
                                   <Mail size={16} className="text-acc-blue sm:w-5 sm:h-5" />
                                   <span className="font-mono text-[10px] sm:text-xs truncate max-w-[120px] sm:max-w-[150px]">{selectedLead.email}</span>
                                </div>
                                {!selectedLead.apolloVerified && (
                                  <button 
                                    onClick={handleVerifyApollo}
                                    disabled={isVerifyingApollo}
                                    className="p-3 sm:p-4 glass-high rounded-xl sm:rounded-2xl flex items-center gap-2 sm:gap-3 hover:bg-emerald-500/10 transition-all border border-emerald-500/20 group w-full sm:w-auto justify-center sm:justify-start"
                                    title="Verify contact data via Apollo Intelligence"
                                  >
                                    {isVerifyingApollo ? <Loader2 size={16} className="text-emerald-500 animate-spin sm:w-5 sm:h-5" /> : <ShieldCheck size={16} className="text-emerald-500 sm:w-5 sm:h-5" />}
                                    <span className="font-mono text-[9px] sm:text-[10px] uppercase font-black text-emerald-500 tracking-widest">{isVerifyingApollo ? 'Verifying...' : 'Verify Intel'}</span>
                                  </button>
                                )}
                             </div>

                             {(selectedLead.angle || selectedLead.feature || selectedLead.benefit) && (
                               <div className="space-y-4 sm:space-y-6 pt-4 border-t border-white/5">
                                 <h4 className="text-[9px] sm:text-[10px] uppercase tracking-[0.2em] font-black text-text-tertiary">Strategic Blueprint</h4>
                                 <div className="grid grid-cols-1 gap-3 sm:gap-4">
                                   {selectedLead.angle && <InfoItem label="The Angle" value={selectedLead.angle} size="small" />}
                                   {selectedLead.feature && <InfoItem label="Killer Feature" value={selectedLead.feature} size="small" />}
                                   {selectedLead.benefit && <InfoItem label="Core Benefit" value={selectedLead.benefit} size="small" />}
                                 </div>
                               </div>
                             )}
                          </div>

                          <div className="space-y-6 sm:space-y-8">
                             <div className="space-y-3 sm:space-y-4 bg-white/5 p-6 sm:p-8 rounded-2xl sm:rounded-[2rem] border border-white/5 italic">
                                <div className="flex items-center justify-between mb-1 sm:mb-2 text-acc-gold">
                                   <Bot size={18} className="sm:w-5 sm:h-5" />
                                   <span className="text-[9px] sm:text-[10px] uppercase tracking-[0.2em] font-black opacity-60">WENDY'S Strategy</span>
                                </div>
                                <p className="text-xs sm:text-sm text-text-secondary leading-relaxed">"{selectedLead.sourceReasoning}"</p>
                             </div>

                             <div className="space-y-4">
                               <div className="flex items-center justify-between">
                                 <h4 className="body-caption uppercase tracking-[0.2em] font-black text-text-tertiary flex items-center gap-3">
                                    <Linkedin size={18} className="text-acc-blue" /> 
                                    Graph Intelligence
                                 </h4>
                                 {!selectedLead.linkedInInsights && (
                                   <button 
                                     onClick={handleEnrichLinkedIn}
                                     disabled={loadingEnrichment}
                                     className="text-[10px] font-mono text-acc-blue uppercase font-black hover:underline disabled:opacity-50"
                                     title="Extract additional context from public LinkedIn graphs"
                                   >
                                     {loadingEnrichment ? 'Processing...' : 'Harvest'}
                                   </button>
                                 )}
                               </div>
                               
                               {loadingEnrichment ? (
                                 <div className="space-y-3 py-4">
                                    <div className="h-4 bg-white/5 rounded-full animate-pulse w-full" />
                                    <div className="h-4 bg-white/5 rounded-full animate-pulse w-5/6" />
                                    <div className="h-4 bg-white/5 rounded-full animate-pulse w-4/6" />
                                 </div>
                               ) : selectedLead.linkedInInsights ? (
                                  <div className="glass-high p-6 rounded-2xl border-acc-blue/20">
                                    <div className="markdown-body text-sm text-text-secondary leading-relaxed font-sans prose-invert">
                                       <ReactMarkdown>{selectedLead.linkedInInsights}</ReactMarkdown>
                                    </div>
                                  </div>
                               ) : (
                                  <div className="p-6 rounded-2xl border border-dashed border-white/10 text-center">
                                    <p className="text-[10px] font-mono uppercase text-text-tertiary tracking-widest">Invoke harvest to decode professional network coordinates.</p>
                                  </div>
                               )}
                             </div>

                             <div className="space-y-4">
                                <h4 className="body-caption uppercase tracking-[0.2em] font-black text-text-tertiary flex items-center gap-3">
                                   <Search size={18} className="text-acc-gold" /> 
                                   Captured Evidence
                                </h4>
                                <div className="grid grid-cols-1 gap-3">
                                  {selectedLead.evidence && selectedLead.evidence.length > 0 ? (
                                    selectedLead.evidence.map((ev, i) => (
                                      <a 
                                        key={i} 
                                        href={ev.url} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="p-4 glass-high border border-white/5 rounded-2xl flex items-center justify-between group hover:border-acc-gold/50 transition-all"
                                      >
                                        <div className="flex items-center gap-3">
                                          <div className="w-10 h-10 bg-acc-gold/10 rounded-lg flex items-center justify-center text-acc-gold">
                                            <Globe size={18} />
                                          </div>
                                          <div>
                                            <div className="text-sm font-bold text-white group-hover:text-acc-gold transition-colors">{ev.source}</div>
                                            <div className="text-[10px] text-text-tertiary font-mono">{ev.date} • {ev.spendEstimate || 'Est. R0'}</div>
                                          </div>
                                        </div>
                                        <ExternalLink size={16} className="text-text-tertiary group-hover:translate-x-1 transition-transform" />
                                      </a>
                                    ))
                                  ) : (
                                    <div className="p-6 rounded-2xl border border-dashed border-white/10 text-center">
                                      <p className="text-[10px] font-mono uppercase text-text-tertiary tracking-widest">No direct visual evidence captured yet.</p>
                                    </div>
                                  )}
                                </div>
                             </div>

                             <div className="flex flex-col gap-3 pt-6">
                                <button className="btn-primary w-full flex items-center justify-center gap-2">
                                   <span>Contact Now</span>
                                   <Phone size={16} />
                                </button>
                                <button className="w-full py-3 btn-outline flex items-center justify-center gap-2">
                                   <span>Schedule Meeting</span>
                                   <Clock size={16} className="text-text-secondary" />
                                </button>
                             </div>
                          </div>
                        </div>
                      </div>
                  </motion.div>
                ) : (
                  <div className="h-[500px] glass-panel rounded-2xl border-dashed flex flex-col items-center justify-center text-center p-12">
                     <Target size={48} className="text-border-subtle mb-6 animate-pulse" />
                     <h3 className="text-lg font-semibold text-text-tertiary">Select a Lead</h3>
                     <p className="text-sm text-text-tertiary mt-2 max-w-xs leading-relaxed">Select a target from the list to view detailed intelligence analysis.</p>
                  </div>
                )}
              </AnimatePresence>
           </div>
        </div>
      )}

      <SourceLeadsModal 
        isOpen={showSourceModal} 
        onClose={() => setShowSourceModal(false)}
        targetPublication={filterPub === 'All' ? 'Harvest SA' : filterPub as 'Harvest SA' | 'Black Business Quarterly' | 'Leadership Magazine'}
      />
    </div>
  );
}

const getPublicationColor = (pub: string) => {
  switch (pub) {
    case 'Harvest SA': return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
    case 'Black Business Quarterly': return 'bg-orange-500/10 text-orange-500 border-orange-500/20';
    case 'Leadership Magazine': return 'bg-purple-500/10 text-purple-500 border-purple-500/20';
    default: return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
  }
};const LeadCard: React.FC<{ 
  lead: Lead, 
  active: boolean, 
  onClick: () => void,
  onGeneratePitch: () => void,
  isGeneratingPitch: boolean
}> = ({ lead, active, onClick, onGeneratePitch, isGeneratingPitch }) => {

  return (
    <motion.div 
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "glass-panel group overflow-hidden transition-all duration-300 rounded-2xl sm:rounded-[2rem]",
        active ? "border-text-dim ring-1 ring-text-dim/20" : "border-border-subtle hover:border-text-dim/50",
        // Magazine specific border glow
        active && lead.publication === 'Black Business Quarterly' && "ring-acc-gold/30",
        active && lead.publication === 'Harvest SA' && "ring-acc-green/30",
        active && lead.publication === 'Leadership Magazine' && "ring-acc-blue/30"
      )}
    >
      <div 
        onClick={onClick}
        className="p-4 sm:p-6 sm:p-8 cursor-pointer flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6 relative"
      >
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-transparent to-white/[0.02] pointer-events-none" />
        <div className="flex items-center gap-3 sm:gap-6 w-full sm:w-auto z-10">
          <div className={cn(
            "w-10 h-10 sm:w-16 sm:h-16 rounded-xl flex items-center justify-center shrink-0 border border-border-subtle group-hover:opacity-90 transition-all",
            lead.publication === 'Black Business Quarterly' ? "bg-acc-gold/10 border-acc-gold/20" : 
            lead.publication === 'Harvest SA' ? "bg-acc-green/10 border-acc-green/20" : "bg-acc-blue/10 border-acc-blue/20"
          )}>
             <span className={cn(
               "font-bold text-xl sm:text-2xl",
               lead.publication === 'Black Business Quarterly' ? "text-acc-gold" : 
               lead.publication === 'Harvest SA' ? "text-acc-green" : "text-acc-blue"
             )}>
                {lead.companyName.charAt(0)}
             </span>
          </div>
          
          <div className="flex-1 min-w-0 sm:hidden">
            <h5 className="text-base font-bold text-text-primary truncate leading-tight">{lead.companyName}</h5>
            <div className="flex items-center gap-2 mt-1">
               <span className={cn("text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded border leading-none", getPublicationColor(lead.publication))}>{lead.publication.split(' ')[0]}</span>
               <span className="text-[10px] text-text-tertiary truncate">{lead.sector}</span>
            </div>
          </div>
        </div>

        <div className="hidden sm:block flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-2">
             <span className={cn("text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded border", getPublicationColor(lead.publication))}>{lead.publication}</span>
          </div>
          <h5 className="text-xl font-bold text-text-primary truncate">
             {lead.companyName}
          </h5>
          <p className="text-sm text-text-tertiary truncate mt-1.5 flex items-center gap-2 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-acc-gold/40" />
            {lead.sector}
          </p>
        </div>

        <div className="absolute top-4 right-4 sm:static flex items-center gap-4 sm:gap-8 shrink-0">
          <div className="text-right flex flex-col items-end">
             <div className="flex items-baseline gap-1">
                <span className="text-2xl sm:text-4xl font-black text-text-primary leading-none tracking-tighter">{lead.score || 0}</span>
             </div>
             <span className="text-[8px] sm:text-[10px] font-black text-acc-gold uppercase tracking-[0.2em] mt-1 sm:mt-2">Nodescore</span>
          </div>
          
          <div className="hidden sm:flex relative w-12 h-12 items-center justify-center">
             <svg className="w-full h-full -rotate-90">
                <circle cx="24" cy="24" r="20" className="stroke-white/5 fill-none" strokeWidth="4" />
                <motion.circle 
                  cx="24" cy="24" r="20" 
                  className={cn("fill-none transition-colors", (lead.score || 0) > 80 ? "stroke-acc-gold" : "stroke-acc-blue")}
                  strokeWidth="4" 
                  strokeDasharray="125.6"
                  initial={{ strokeDashoffset: 125.6 }}
                  animate={{ strokeDashoffset: 125.6 - (125.6 * (lead.score || 0) / 100) }}
                  strokeLinecap="round"
                />
             </svg>
          </div>
        </div>
      </div>

      {/* Expanded Actions */}
      <AnimatePresence>
        {active && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-white/5"
          >
            <div className="p-6 space-y-6">
              <div className="flex flex-wrap gap-4">
                 <button 
                   onClick={(e) => { e.stopPropagation(); onGeneratePitch(); }}
                   disabled={isGeneratingPitch}
                   className="btn-outline py-2 px-4 text-xs flex items-center gap-2 group/btn"
                   title="Use AI to automatically draft 3 multithreaded pitch variants"
                 >
                   {isGeneratingPitch ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} className="text-acc-gold" />}
                   <span>A/B Pitch Generator (3 Variants)</span>
                 </button>
                 <button className="btn-outline py-2 px-4 text-xs flex items-center gap-2" title="Sync insights from LinkedIn profile">
                   <Linkedin size={14} className="text-acc-blue" />
                   <span>Sync Intel</span>
                 </button>
                 <button className="btn-outline py-2 px-4 text-xs flex items-center gap-2" title="Remind me to review this lead later">
                   <Clock size={14} className="text-acc-tertiary" />
                   <span>Later</span>
                 </button>
              </div>

              {/* Pitch Display */}
              <AnimatePresence>
                {isGeneratingPitch && (
                   <motion.div 
                     initial={{ opacity: 0 }}
                     animate={{ opacity: 1 }}
                     className="space-y-2"
                   >
                      <div className="h-3 w-full glass-high animate-pulse rounded" />
                      <div className="h-3 w-5/6 glass-high animate-pulse rounded" />
                      <div className="h-3 w-4/6 glass-high animate-pulse rounded" />
                   </motion.div>
                )}
                {lead.quickPitch && !isGeneratingPitch && (
                   <motion.div 
                     initial={{ opacity: 0, y: 10 }}
                     animate={{ opacity: 1, y: 0 }}
                     className="space-y-3"
                   >
                      <div className="p-4 bg-bg-glass-high border border-white/5 rounded-xl text-sm italic text-text-secondary leading-relaxed relative flex gap-4 items-start group">
                         <div className="flex-1">
                           <span className="text-[10px] font-bold text-acc-gold uppercase tracking-widest block mb-2">AI Recommended Pitch Strategy</span>
                           "{lead.quickPitch}"
                         </div>
                         <button className="btn-outline text-[10px] shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">Select</button>
                      </div>
                      <div className="p-4 bg-bg-glass-high border border-white/5 rounded-xl text-sm italic text-text-secondary leading-relaxed relative flex gap-4 items-start group">
                         <div className="flex-1">
                           <span className="text-[10px] font-bold text-acc-blue uppercase tracking-widest block mb-2"></span>
                           
                         </div>
                         <button className="btn-outline text-[10px] shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">Select</button>
                      </div>
                      <div className="p-4 bg-bg-glass-high border border-white/5 rounded-xl text-sm italic text-text-secondary leading-relaxed relative flex gap-4 items-start group">
                         <div className="flex-1">
                           <span className="text-[10px] font-bold text-purple-400 uppercase tracking-widest block mb-2"></span>
                           
                         </div>
                         <button className="btn-outline text-[10px] shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">Select</button>
                      </div>
                   </motion.div>
                )}
              </AnimatePresence>

              <div className="grid grid-cols-2 gap-4">
                 <div className="flex items-center gap-3 text-text-tertiary">
                    <User size={14} />
                    <span className="body-caption font-bold truncate">{lead.decisionMaker}</span>
                 </div>
                 <div className="flex items-center gap-3 text-text-tertiary">
                    <Globe size={14} />
                    <span className="body-caption font-bold truncate">{lead.publication}</span>
                 </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

function InfoItem({ label, value, sub, size = 'large' }: { label: string, value: React.ReactNode, sub?: string, size?: 'small' | 'large' }) {
  return (
    <div className="space-y-1 sm:space-y-2">
      <span className="font-sans text-[8px] sm:text-[10px] uppercase text-text-muted font-black tracking-[0.2em] block mb-0.5 sm:mb-1 opacity-70">{label}</span>
      <div className={cn(
        "font-sans font-black text-text-primary tracking-tight leading-tight",
        size === 'large' ? "text-xl sm:text-3xl" : "text-sm sm:text-lg"
      )}>
        {value}
      </div>
      {sub && <p className="font-sans text-[10px] sm:text-[11px] uppercase text-acc-gold font-black tracking-wider mt-1">{sub}</p>}
    </div>
  );
}

