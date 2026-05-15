import React, { useState, useEffect, useRef } from 'react';
import { 
  TrendingUp, 
  Target, 
  FileText, 
  Bot, 
  Sparkles, 
  Loader2, 
  PhoneCall, 
  UploadCloud, 
  X, 
  CheckCircle2, 
  Zap,
  ChevronRight,
  Calendar,
  Phone,
  Users,
  Globe,
  Database,
  Search,
  ArrowRight,
  Activity
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  collection, 
  query, 
  orderBy, 
  limit, 
  where,
  onSnapshot, 
  addDoc, 
  updateDoc, 
  doc 
} from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { 
  extractLeadsFromMagazine, 
  sourceFromCompetitors, 
  generateQuickPitch,
  generateMarketIntelligence 
} from '../services/geminiService';
import { cn, handleFirestoreError, OperationType } from '../lib/utils';
import ReactMarkdown from 'react-markdown';
import { Lead, PublicationType } from '../types';
import { isSameDay, format } from 'date-fns';
import PreCallBriefModal from './PreCallBriefModal';
import StrikeList from './StrikeList';

import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell,
  PieChart,
  Pie
} from 'recharts';

interface DashboardProps {
  magazineContext?: 'All' | PublicationType;
}

function CapabilityCard({ title, desc, icon, onAction, actionLabel }: { title: string, desc: string, icon: React.ReactNode, onAction?: () => void, actionLabel?: string }) {
  return (
    <div className="p-6 sm:p-8 rounded-2xl sm:rounded-[2rem] bg-white/[0.02] border border-white/5 hover:border-acc-gold/20 transition-all duration-500 group/cap backdrop-blur-sm self-stretch flex flex-col">
      <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-white/5 flex items-center justify-center mb-4 sm:mb-6 group-hover/cap:scale-110 group-hover/cap:bg-acc-gold/10 transition-all duration-500 shadow-inner">
        {icon}
      </div>
      <h5 className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.3em] text-text-primary mb-2 sm:mb-3">{title}</h5>
      <p className="text-xs sm:text-sm text-text-tertiary leading-relaxed font-light mb-4 sm:mb-6 flex-1">{desc}</p>
      {onAction && (
        <button 
          onClick={onAction}
          className="w-full py-2.5 sm:py-3 bg-white/5 border border-white/10 rounded-lg sm:rounded-xl font-mono text-[8px] sm:text-[9px] uppercase tracking-widest text-text-muted hover:bg-white hover:text-black transition-all"
        >
          {actionLabel || 'Execute Operation'}
        </button>
      )}
    </div>
  );
}

export default function Dashboard({ magazineContext = 'All' }: DashboardProps) {
  const [topLeads, setTopLeads] = useState<Lead[]>([]);
  const [todayAgenda, setTodayAgenda] = useState<Lead[]>([]);
  
  // Sector Data for chart
  const sectorData = React.useMemo(() => {
    const counts: Record<string, number> = {};
    topLeads.forEach(l => {
      counts[l.sector] = (counts[l.sector] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value })).sort((a,b) => b.value - a.value);
  }, [topLeads]);
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [showCompetitorModal, setShowCompetitorModal] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isSourcing, setIsSourcing] = useState(false);
  const [isGeneratingPitch, setIsGeneratingPitch] = useState<string | null>(null);
  const [competitorName, setCompetitorName] = useState('');
  const [sourcingPub, setSourcingPub] = useState<PublicationType>('Harvest SA');
  const [pdfResult, setPdfResult] = useState<{ success: boolean; message: string } | null>(null);
  const [sourcingResult, setSourcingResult] = useState<{ success: boolean; message: string } | null>(null);
  const [selectedLeadForBrief, setSelectedLeadForBrief] = useState<Lead | null>(null);
  const [logLines, setLogLines] = useState<{ id: string; text: string; type: 'default' | 'amber' | 'dim' | 'red' | 'blue' }[]>([]);
  const [intelligenceBrief, setIntelligenceBrief] = useState<string | null>(null);
  const [loadingBrief, setLoadingBrief] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const logEndRef = useRef<HTMLDivElement>(null);

  const fetchIntelligence = async (leads: Lead[]) => {
    if (leads.length === 0 || loadingBrief) return;
    setLoadingBrief(true);
    try {
      const brief = await generateMarketIntelligence(magazineContext, leads);
      setIntelligenceBrief(brief);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingBrief(false);
    }
  };

  useEffect(() => {
    if (topLeads.length > 0 && !intelligenceBrief) {
       fetchIntelligence(topLeads);
    }
  }, [topLeads]);

  useEffect(() => {
    const handleUiTrigger = (e: Event) => {
      const { type } = (e as CustomEvent).detail;
      if (type === 'show_competitor_modal') {
        setShowCompetitorModal(true);
      }
    };
    window.addEventListener('app-ui-trigger', handleUiTrigger);
    return () => window.removeEventListener('app-ui-trigger', handleUiTrigger);
  }, []);

  useEffect(() => {
    if (logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logLines]);

  const addLog = (text: string, type: 'default' | 'amber' | 'dim' | 'red' | 'blue' = 'default') => {
    setLogLines(prev => [...prev, { id: Math.random().toString(), text, type }]);
  };

  useEffect(() => {
    if (!auth.currentUser) return;

    const leadsPath = 'leads';
    let q = query(
      collection(db, leadsPath), 
      where('ownerId', '==', auth.currentUser.uid),
      orderBy('score', 'desc'), 
      limit(8)
    );

    if (magazineContext !== 'All') {
      q = query(
        collection(db, leadsPath),
        where('ownerId', '==', auth.currentUser.uid),
        where('publication', '==', magazineContext),
        orderBy('score', 'desc'),
        limit(8)
      );
    }

    const unsub = onSnapshot(q, (snapshot) => {
      const docs: Lead[] = [];
      const seenCompanies = new Set();
      
      snapshot.forEach(doc => {
        const data = doc.data();
        const companyNameLower = (data.companyName || '').toLowerCase().trim();
        if (!seenCompanies.has(companyNameLower)) {
          seenCompanies.add(companyNameLower);
          docs.push({ id: doc.id, ...data } as Lead);
        }
      });
      
      setTopLeads(docs);
      
      // Filter for today's agenda
      const today = new Date();
      const agenda = docs.filter(lead => 
        lead.nextFollowUp && isSameDay(new Date(lead.nextFollowUp), today)
      ).sort((a,b) => new Date(a.nextFollowUp!).getTime() - new Date(b.nextFollowUp!).getTime());
      
      setTodayAgenda(agenda);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, leadsPath);
    });
    return () => unsub();
  }, [magazineContext, auth.currentUser]);

  const handleSourceFromCompetitor = async () => {
    setIsSourcing(true);
    setSourcingResult(null);

    try {
      const response = await fetch('/api/source-leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          publication: sourcingPub,
          userId: auth.currentUser?.uid || 'system'
        })
      });
      
      const result = await response.json();
      
      if (result.success) {
        setSourcingResult({ 
          success: true, 
          message: result.message || `Successfully synced marketplace signals.` 
        });
        setCompetitorName('');
      } else {
        setSourcingResult({ success: false, message: 'Intelligence extraction failed.' });
      }
    } catch (e) {
      console.error(e);
      setSourcingResult({ success: false, message: 'Critical error during intelligence extraction.' });
    } finally {
      setIsSourcing(false);
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
    } catch (error) {
      console.error(error);
    } finally {
      setIsGeneratingPitch(null);
    }
  };

  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== "application/pdf") {
      setPdfResult({ success: false, message: "Only PDF files are supported." });
      return;
    }

    setIsUploading(true);
    setPdfResult(null);
    setLogLines([]);
    
    addLog(`[PDF] Loading: ${file.name}`, 'amber');
    addLog(`[PDF] Size: ${(file.size / 1024 / 1024).toFixed(2)} MB`, 'dim');

    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          addLog(`[OCR] Parsing document structure...`);
          const base64String = (event.target?.result as string).split(',')[1];
          if (!base64String) throw new Error("Failed to read file.");

          await new Promise(r => setTimeout(r, 600));
          addLog(`[AI] Handing off to Strategic Intelligence Node...`, 'amber');
          
          await new Promise(r => setTimeout(r, 800));
          addLog(`[AI] Scanning for advertisers, sponsors, editorial features...`, 'dim');

          const generatedLeads = await extractLeadsFromMagazine(base64String);
          
          if (generatedLeads && Array.isArray(generatedLeads) && auth.currentUser) {
            addLog(`[AI] Structuring entities and scoring compatibility...`);
            
            for (const data of generatedLeads) {
               addLog(`  -> Found: ${data.companyName} (${data.publication})`, 'dim');
                const leadDoc: Omit<Lead, 'id'> = {
                  companyName: data.companyName,
                  decisionMaker: data.decisionMaker,
                  title: data.title,
                  email: data.email,
                  phone: data.phone,
                  sector: data.sector,
                  publication: (["Harvest SA", "Black Business Quarterly", "Leadership Magazine"] as string[]).includes(data.publication) ? (data.publication as PublicationType) : "Leadership Magazine",
                  status: "New",
                  score: data.score || 85,
                  sourceReasoning: data.sourceReasoning,
                  evidence: data.evidence || [],
                  source: `PDF Scan: ${file.name}`,
                  ownerId: auth.currentUser.uid,
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString()
                };

               try {
                 await addDoc(collection(db, 'leads'), leadDoc);
               } catch (err) {
                 handleFirestoreError(err, OperationType.CREATE, 'leads');
               }
            }
            addLog(`[DONE] ${generatedLeads.length} leads successfully extracted and added to CRM.`, 'blue');
            setPdfResult({ success: true, message: `Successfully extracted ${generatedLeads.length} leads from PDF.` });
          } else {
            addLog(`[WARN] No viable leads extracted from this document.`, 'red');
            setPdfResult({ success: false, message: 'No viable leads extracted from this document.' });
          }
        } catch (error) {
           console.error(error);
           addLog(`[ERROR] Processing failed. Check logs.`, 'red');
           setPdfResult({ success: false, message: 'Error processing PDF.' });
        } finally {
           setIsUploading(false);
           if (fileInputRef.current) fileInputRef.current.value = '';
        }
      };
      reader.readAsDataURL(file);
    } catch (e) {
      console.error(e);
      addLog(`[ERROR] Critical error during read.`, 'red');
      setPdfResult({ success: false, message: 'Critical error reading file.' });
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-8 sm:space-y-12 pb-32">
      {/* Magazine Intelligence Tiles (Strategic Focus) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
        {[
          { name: 'Black Business Quarterly', leads: 12, revenue: 'R18k', color: 'text-acc-gold', bg: 'bg-acc-gold/10', link: 'https://issuu.com/capemediabranding/docs/bbq_first_edition_2024' },
          { name: 'Harvest SA', leads: 8, revenue: 'R12k', color: 'text-acc-green', bg: 'bg-acc-green/10', link: 'https://issuu.com/capemediabranding/docs/harvest_sa_vol_32' },
          { name: 'Leadership Magazine', leads: 15, revenue: 'R22k', color: 'text-acc-blue', bg: 'bg-acc-blue/10', link: 'https://issuu.com/capemediabranding/docs/leadership_edition_448' }
        ].map((mag) => (
          <motion.div
            key={mag.name}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ scale: 1.02 }}
            onClick={() => {
              window.dispatchEvent(new CustomEvent('wendy-action', { 
                detail: { 
                  name: 'show_leads', 
                  args: { publication: mag.name } 
                } 
              }));
            }}
            className={cn(
              "p-6 sm:p-8 glass-panel border border-white/5 rounded-2xl sm:rounded-[2rem] flex flex-col justify-between transition-all cursor-pointer group",
              magazineContext === mag.name ? "border-white/20 ring-1 ring-white/10" : "opacity-60 hover:opacity-100 hover:ring-1 hover:ring-white/10"
            )}
          >
            <div>
              <div className="flex justify-between items-start mb-4 sm:mb-6">
                <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", mag.bg)}>
                  <Globe className={mag.color} size={16} />
                </div>
                <div className="text-right cursor-pointer group/link hover:opacity-80 transition-opacity" onClick={(e) => {
                  e.stopPropagation();
                  window.open(mag.link, '_blank');
                }}>
                  <span className="text-[8px] sm:text-[10px] font-black text-text-tertiary uppercase tracking-widest block mb-0.5 sm:mb-1 group-hover/link:text-white transition-colors">Active Signals</span>
                  <span className={cn("text-xs sm:text-sm font-black", mag.color)}>+{mag.leads}</span>
                </div>
              </div>
              <h4 className="text-sm sm:text-base font-black text-text-primary mb-1 uppercase tracking-wider">{mag.name}</h4>
              <p className="text-[10px] sm:text-xs text-text-tertiary font-medium">Market Intelligence Summary</p>
            </div>
            
            <div className="mt-8 sm:mt-10 pt-6 sm:pt-8 border-t border-white/5 flex items-end justify-between">
              <div>
                <span className="text-[8px] sm:text-[9px] font-black text-text-tertiary uppercase tracking-widest block mb-1">Pipeline</span>
                <span className="text-lg sm:text-xl font-black text-text-primary">{mag.revenue}</span>
              </div>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  window.open(mag.link, '_blank');
                }}
                className="text-[9px] sm:text-[10px] font-black text-acc-gold uppercase tracking-[0.2em] group-hover:translate-x-1 transition-transform"
              >
                Explore <ChevronRight className="inline ml-1" size={12} />
              </button>
            </div>
          </motion.div>
        ))}
      </div>

      <StrikeList />
      
      <div className="flex flex-col xl:flex-row gap-6 sm:gap-12">
        <div className="flex-1 min-w-0">
             {/* Stand-Up Card: The Strategic Pulse */}
              <div id="tour-dashboard" className="glass-panel p-6 sm:p-10 lg:p-12 rounded-2xl sm:rounded-[2.5rem] relative overflow-hidden group transition-all duration-500 border-white/5" title="Daily strategic overview">
                <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-6 sm:gap-10">
                   <div className="min-w-0">
                      <div className="flex items-center space-x-3 mb-4 sm:mb-6">
                        <div className="w-2 h-2 rounded-full theme-bg animate-neural" />
                        <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] sm:tracking-[0.3em] text-text-tertiary">Mission Clock Active</span>
                      </div>
                      <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-text-primary mb-3 sm:mb-4 tracking-tighter leading-tight truncate">Good morning, Terrence.</h2>
                      <p className="text-base sm:text-lg text-text-secondary font-light max-w-xl">WENDY has processed <span className="text-text-primary font-bold">{topLeads.length} active signals</span> from <span className="theme-text font-black">{magazineContext}</span>.</p>
                   </div>
                </div>

                {/* Intelligence Brief Section */}
                <div className="mt-8 sm:mt-12 relative z-10">
                   <div className="glass-panel p-4 sm:p-6 md:p-8 rounded-xl sm:rounded-[2rem] border-acc-gold/20 bg-acc-gold/[0.02]">
                      <div className="flex items-center justify-between mb-4 sm:mb-6">
                         <div className="flex items-center space-x-3 min-w-0">
                            <Bot size={18} className="text-acc-gold shrink-0" />
                            <h4 className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] sm:tracking-[0.3em] text-acc-gold truncate">Strategic Intelligence Brief</h4>
                         </div>
                         <button 
                            onClick={() => fetchIntelligence(topLeads)}
                            className="p-1.5 sm:p-2 hover:bg-white/5 rounded-full text-text-muted hover:text-acc-gold transition-all shrink-0"
                            title="Refresh Intelligence"
                            disabled={loadingBrief}
                         >
                            <Zap size={14} className={cn(loadingBrief && "animate-spin")} />
                         </button>
                      </div>
                      
                      {loadingBrief ? (
                        <div className="space-y-3 py-2 sm:py-4">
                           <div className="h-3 sm:h-4 bg-white/5 rounded-full animate-pulse w-full" />
                           <div className="h-3 sm:h-4 bg-white/5 rounded-full animate-pulse w-5/6" />
                           <div className="h-3 sm:h-4 bg-white/5 rounded-full animate-pulse w-4/6" />
                        </div>
                      ) : intelligenceBrief ? (
                         <div className="markdown-body text-xs sm:text-sm text-text-secondary leading-relaxed font-sans prose-invert prose-p:mb-3">
                            <ReactMarkdown>{intelligenceBrief}</ReactMarkdown>
                         </div>
                      ) : (
                         <p className="text-[10px] sm:text-xs text-text-tertiary italic">Awaiting neural sync...</p>
                      )}
                   </div>
                </div>

                <div className="mt-8 sm:mt-12 grid grid-cols-1 md:grid-cols-2 gap-4 relative z-10">
                   {/* Proactive Events List */}
                   {topLeads.length > 0 ? (
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-5 p-4 sm:p-5 rounded-2xl sm:rounded-3xl bg-white/[0.03] border border-white/5 hover:border-acc-gold/20 transition-all cursor-pointer group/note" title="Proactive notification: Market signal">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-acc-gold/10 flex items-center justify-center shrink-0 group-hover/note:scale-105 transition-transform">
                        <Sparkles size={16} className="text-acc-gold" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[9px] sm:text-[11px] font-black uppercase tracking-widest text-acc-gold mb-0.5 sm:mb-1">Intelligence Alert</p>
                        <p className="text-xs sm:text-sm font-medium text-text-primary leading-snug truncate">{topLeads[0].companyName} appeared in tracking.</p>
                      </div>
                      <button 
                        onClick={() => handleQuickPitch(topLeads[0])}
                        className="w-full sm:w-auto bg-acc-gold/10 text-acc-gold px-4 py-2 rounded-xl text-[9px] sm:text-[10px] font-black uppercase tracking-widest hover:bg-acc-gold hover:text-black transition-all"
                      >
                        Pitch
                      </button>
                    </div>
                   ) : (
                    <div className="flex items-center gap-4 sm:gap-5 p-4 sm:p-5 rounded-2xl sm:rounded-3xl bg-white/[0.03] border border-white/5 opacity-50">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-white/5 flex items-center justify-center shrink-0">
                         <Sparkles size={16} className="text-text-tertiary" />
                      </div>
                      <div className="flex-1">
                        <p className="text-[9px] sm:text-[11px] font-black uppercase tracking-widest text-text-tertiary mb-0.5 sm:mb-1">Intelligence Alert</p>
                        <p className="text-xs sm:text-sm font-medium text-text-tertiary">Monitoring market signals...</p>
                      </div>
                    </div>
                   )}
                   
                   <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-5 p-4 sm:p-5 rounded-2xl sm:rounded-3xl bg-white/[0.03] border border-white/5 hover:border-acc-blue/20 transition-all cursor-pointer group/note" title="Proactive notification: Pipeline health">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-acc-blue/10 flex items-center justify-center shrink-0 group-hover/note:scale-105 transition-transform">
                       <Target size={16} className="text-acc-blue" />
                    </div>
                    <div className="flex-1 min-w-0">
                       <p className="text-[9px] sm:text-[11px] font-black uppercase tracking-widest text-acc-blue mb-0.5 sm:mb-1">Pipeline Pulse</p>
                       <p className="text-xs sm:text-sm font-medium text-text-primary leading-snug truncate">Alignment at {topLeads.length > 0 ? Math.round(topLeads.reduce((acc, l) => acc + (l.score || 0), 0) / topLeads.length) : 0}%.</p>
                    </div>
                    <button className="w-full sm:w-auto bg-white/5 text-white/40 px-4 py-2 rounded-xl text-[9px] sm:text-[10px] font-black uppercase tracking-widest border border-white/10 hover:bg-white/10 hover:text-white transition-all">Optimize</button>
                  </div>
                </div>

                 <div className="mt-8 sm:mt-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 relative z-10">
                    {/* Visualizing Strategic Nexus (Sector Chart) */}
                    <div className="lg:col-span-2 hidden md:block glass-panel p-6 sm:p-8 rounded-2xl sm:rounded-[2rem] bg-white/[0.01] border border-white/5">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                                <Activity className="text-acc-blue" size={16} />
                                <h4 className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] text-text-tertiary">Sector Nexus Connectivity</h4>
                            </div>
                            <span className="text-[10px] font-mono text-acc-blue">Live Distribution</span>
                        </div>
                        <div className="h-[200px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={sectorData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                                    <defs>
                                        <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor="var(--theme-accent)" stopOpacity={0.8} />
                                            <stop offset="100%" stopColor="var(--theme-accent)" stopOpacity={0.1} />
                                        </linearGradient>
                                    </defs>
                                    <XAxis 
                                        dataKey="name" 
                                        stroke="#64748b" 
                                        fontSize={8} 
                                        tickLine={false} 
                                        axisLine={false}
                                        interval={0}
                                        tick={{ fill: '#64748b' }}
                                    />
                                    <Tooltip 
                                        cursor={{ fill: 'transparent' }}
                                        contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #ffffff10', borderRadius: '12px', fontSize: '10px' }}
                                    />
                                    <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                                        {sectorData.map((entry, index) => (
                                            <Cell 
                                                key={`cell-${index}`} 
                                                fill={entry.name === 'Harvest SA' ? '#10b981' : "url(#barGradient)"} 
                                                className="transition-all duration-300 hover:opacity-80"
                                            />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    <CapabilityCard 
                      title="Intelligence Harvesting" 
                      desc="Real-time scraping of competitor signals across Black Business Quarterly, Harvest SA, and Leadership."
                      icon={<Globe size={18} className="text-acc-blue" />}
                      onAction={() => {
                        setShowCompetitorModal(true);
                        window.dispatchEvent(new CustomEvent('wendy-action', { 
                          detail: { name: 'deep_scrape_triggered', args: { context: magazineContext } } 
                        }));
                      }}
                      actionLabel="Launch Scraper"
                    />

                    <CapabilityCard 
                      title="Apollo Integration" 
                      desc="Enrich the vault with verified global B2B data using advanced filtering."
                      icon={<Database size={18} className="text-acc-gold" />}
                      onAction={() => {
                         window.dispatchEvent(new CustomEvent('wendy-action', { 
                           detail: { name: 'pull_apollo_data', args: { context: magazineContext, apiKey: "4jy3md7x55mNDWSQRrtBig" } } 
                         }));
                         window.dispatchEvent(new CustomEvent('wendy-action', { detail: { name: 'navigate_to', args: { tab: 'leads' } } }));
                      }}
                      actionLabel="Run Apollo Extraction"
                    />
                    <CapabilityCard 
                      title="Strategic Scheduling" 
                      desc="Automated call windows respecting your operational periods and physiological breaks."
                      icon={<Calendar size={18} className="text-white" />}
                      onAction={() => {
                        window.dispatchEvent(new CustomEvent('wendy-action', { 
                          detail: { name: 'plan_strike_list', args: { context: magazineContext } } 
                        }));
                        window.dispatchEvent(new CustomEvent('wendy-action', { detail: { name: 'navigate_to', args: { tab: 'diary' } } }));
                      }}
                      actionLabel="Plan & View Diary"
                    />
                 </div>

              <div className="mt-12 sm:mt-20 space-y-12 sm:space-y-20 relative z-10">
                 <section>
                    <div className="flex items-center justify-between mb-6 sm:mb-8">
                       <div className="flex items-center space-x-3 sm:space-x-4">
                          <h4 className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.3em] sm:tracking-[0.4em] text-text-dim">High-Value Targets</h4>
                          <div className="w-8 sm:w-12 h-[1px] bg-white/10" />
                       </div>
                       <span className="text-[8px] sm:text-[10px] font-black text-text-secondary hover:text-acc-gold transition-colors cursor-pointer uppercase tracking-widest truncate max-w-[120px] sm:max-w-none" title="View all your current active opportunities">Global Intelligence Map</span>
                    </div>
                    <div className="flex gap-4 sm:gap-8 overflow-x-auto pb-6 scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0">
                       {topLeads.map(lead => (
                          <div key={lead.id} className="min-w-[280px] sm:min-w-[320px] bg-white/[0.02] p-6 sm:p-8 rounded-2xl sm:rounded-[2rem] border border-white/5 hover:border-acc-gold/30 transition-all cursor-pointer group/card flex flex-col justify-between min-h-[180px] sm:min-h-[200px]" title={`View details for ${lead.companyName}`}>
                             <div>
                                <div className="flex justify-between items-start mb-4 sm:mb-6">
                                   <div className="px-2.5 py-0.5 sm:px-3 sm:py-1 bg-white/5 rounded-full border border-white/10">
                                      <span className="text-[8px] sm:text-[9px] font-black tracking-widest text-text-tertiary uppercase">{lead.publication}</span>
                                   </div>
                                   <div className={cn("w-2 h-2 rounded-full", (lead.score || 0) > 80 ? "bg-acc-gold shadow-[0_0_12px_rgba(212,175,55,0.8)]" : "bg-acc-blue/40")} title="Strategic Health Indicator" />
                                </div>
                                <h5 className="text-xl sm:text-2xl font-bold text-text-primary truncate tracking-tight">{lead.companyName}</h5>
                                <p className="text-[10px] sm:text-xs text-text-tertiary mt-1 sm:mt-2 font-medium tracking-wide">{lead.sector}</p>
                                
                                {lead.angle && (
                                   <div className="mt-4 sm:mt-6 space-y-2 sm:space-y-3">
                                      <div className="p-2 sm:p-3 bg-white/5 rounded-lg sm:rounded-xl border border-white/5">
                                         <p className="text-[8px] sm:text-[10px] font-black uppercase tracking-widest text-acc-gold mb-0.5 sm:mb-1">Strategic Angle</p>
                                         <p className="text-[10px] sm:text-xs text-text-secondary leading-relaxed line-clamp-2">{lead.angle}</p>
                                      </div>
                                   </div>
                                )}
                             </div>
                             <div className="mt-6 sm:mt-8 flex items-center justify-between">
                                <div className="flex flex-col">
                                   <span className="text-[8px] sm:text-[9px] font-black text-text-tertiary uppercase tracking-widest mb-0.5 sm:mb-1">Alignment</span>
                                   <span className="text-lg sm:text-xl font-black text-text-primary">{lead.score}%</span>
                                </div>
                                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full border border-white/10 flex items-center justify-center group-hover/card:border-acc-gold group-hover/card:bg-acc-gold group-hover/card:text-black transition-all">
                                   <ChevronRight size={16} className="sm:w-4 sm:h-4" />
                                </div>
                             </div>
                          </div>
                       ))}
                    </div>
                 </section>

                 <section className="grid grid-cols-1 md:grid-cols-2 gap-12 sm:gap-20 pt-12 sm:pt-16 border-t border-white/5">
                    <div className="space-y-6 sm:space-y-10">
                       <div className="flex items-center justify-between">
                          <h4 className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.3em] sm:tracking-[0.4em] text-text-dim">Operational Window</h4>
                          <Calendar size={14} className="text-text-tertiary sm:w-4 sm:h-4" />
                       </div>
                       <div className="space-y-3 sm:space-y-4">
                          {todayAgenda.length > 0 ? todayAgenda.map((item, i) => (
                             <div key={i} className="bg-white/[0.02] p-4 sm:p-6 rounded-xl sm:rounded-2xl flex items-center gap-4 sm:gap-6 border border-white/5 transition-all cursor-pointer group hover:bg-white/5 hover:border-white/10" 
                                  onClick={() => setSelectedLeadForBrief(item)}
                                  title={`Agenda item: ${item.companyName}`}>
                                <div className="text-[10px] sm:text-xs font-black text-acc-gold w-10 sm:w-14 shrink-0 tracking-widest">
                                   {item.nextFollowUp ? format(new Date(item.nextFollowUp), 'HH:mm') : '--:--'}
                                </div>
                                <div className="flex-1 text-xs sm:text-sm font-bold text-text-primary tracking-tight truncate">{item.companyName}</div>
                                <div className="text-text-tertiary group-hover:text-white transition-colors shrink-0">
                                   {item.status === 'Follow-up' ? <Phone size={12} className="sm:w-3.5 sm:h-3.5" /> : <Target size={12} className="sm:w-3.5 sm:h-3.5" />}
                                </div>
                             </div>
                          )) : (
                             <p className="text-[10px] sm:text-xs text-text-tertiary italic p-4 sm:p-6 border border-dashed border-white/5 rounded-xl sm:rounded-2xl">No strategic windows locked for today.</p>
                          )}
                       </div>
                    </div>
                    <div className="space-y-6 sm:space-y-10">
                       <div className="flex items-center justify-between">
                          <h4 className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.3em] sm:tracking-[0.4em] text-text-dim">Neural Feed</h4>
                          <div className="flex items-center gap-2">
                             <div className="w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                             <span className="text-[8px] sm:text-[9px] font-black text-emerald-500 uppercase tracking-widest">Active Link</span>
                          </div>
                       </div>
                       <div className="space-y-4 sm:space-y-6 relative">
                          <div className="absolute left-0 top-2 bottom-2 w-[1px] bg-white/5" />
                          {topLeads.slice(0, 3).map((node, i) => (
                             <div key={i} className="pl-4 sm:pl-6 relative group cursor-pointer" 
                                  onClick={() => setSelectedLeadForBrief(node)}
                                  title={`Activity log: ${node.sourceReasoning}`}>
                                <div className="absolute left-[-2px] sm:left-[-3px] top-1/2 -translate-y-1/2 w-1 sm:w-1.5 h-1 sm:h-1.5 rounded-full bg-white/20 group-hover:bg-acc-gold transition-colors" />
                                <div className="bg-white/[0.01] p-4 sm:p-5 rounded-xl sm:rounded-2xl border border-white/5 group-hover:border-white/20 group-hover:bg-white/[0.03] transition-all">
                                   <div className="flex justify-between items-center gap-4">
                                      <div className="min-w-0">
                                         <h5 className="text-xs sm:text-sm font-bold text-text-primary truncate">{node.companyName}</h5>
                                         <p className="text-[8px] sm:text-[10px] text-text-tertiary uppercase tracking-widest mt-0.5 sm:mt-1 truncate">Node Detected</p>
                                      </div>
                                      <div className="text-right shrink-0">
                                         <div className="text-xs sm:text-sm font-black text-text-primary">{node.score}%</div>
                                      </div>
                                   </div>
                                </div>
                             </div>
                          ))}
                          {topLeads.length === 0 && (
                            <p className="text-[10px] sm:text-xs text-text-tertiary italic pl-4 sm:pl-6">Waiting for neural signals...</p>
                          )}
                       </div>
                    </div>
                 </section>

                 <section className="grid grid-cols-1 md:grid-cols-2 gap-12 sm:gap-20 pt-12 sm:pt-16 border-t border-white/5">
                     <div className="space-y-6 sm:space-y-10">
                        <div className="flex items-center justify-between">
                           <h4 className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.3em] sm:tracking-[0.4em] text-text-dim">Peer Ranking</h4>
                           <TrendingUp size={14} className="theme-text sm:w-4 sm:h-4" />
                        </div>
                        <div className="bg-white/[0.02] p-6 sm:p-8 rounded-2xl sm:rounded-[2rem] border border-white/5 space-y-6 sm:space-y-8 theme-glow-border transition-all duration-500">
                           <p className="text-[10px] sm:text-xs text-text-tertiary font-medium leading-relaxed">
                             Neural alignment: <span className="theme-text font-black">+14%</span> vs monthly average. High-tier status confirmed.
                           </p>
                           <div className="space-y-3 sm:space-y-4">
                              {[
                                { name: 'Terrence (You)', score: 94, active: true },
                                { name: 'Sarah J.', score: 88, active: false },
                                { name: 'Marcus L.', score: 82, active: false }
                              ].map((peer, idx) => (
                                <motion.div 
                                  key={peer.name}
                                  whileHover={{ x: 5 }}
                                  className={cn(
                                    "flex items-center justify-between p-3 sm:p-4 rounded-lg sm:rounded-xl transition-all border",
                                    peer.active 
                                      ? "theme-bg text-black shadow-2xl scale-[1.02] border-transparent" 
                                      : "bg-white/[0.02] border-white/5 text-text-secondary"
                                  )}
                                >
                                 <div className="flex items-center gap-3 sm:gap-4 truncate">
                                    <span className={cn("text-[10px] sm:text-xs font-black w-3 sm:w-4", peer.active ? "text-black/40" : "text-text-dim")}>{idx + 1}.</span>
                                    <span className="text-xs sm:text-sm font-black uppercase tracking-widest truncate">{peer.name}</span>
                                 </div>
                                 <span className="text-xs sm:text-sm font-black shrink-0">{peer.score}</span>
                                </motion.div>
                              ))}
                              <p className="text-[8px] sm:text-[10px] text-text-tertiary text-center italic opacity-50">Syncing with Regional Cluster 04...</p>
                           </div>
                        </div>
                     </div>
                     <div className="space-y-6 sm:space-y-10">
                        <div className="flex items-center justify-between">
                           <h4 className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.3em] sm:tracking-[0.4em] text-text-dim">Revenue Projection</h4>
                           <Target size={14} className="text-acc-blue sm:w-4 sm:h-4" />
                        </div>
                        <div className="bg-white/[0.02] p-6 sm:p-8 rounded-2xl sm:rounded-[2rem] border border-white/5 h-full flex flex-col justify-center theme-glow-border transition-all duration-500">
                           <div className="text-center space-y-2 sm:space-y-4 mb-6 sm:mb-10">
                              <div className="text-3xl sm:text-5xl font-black text-text-primary tracking-tighter">R{Math.round(topLeads.length * 1.5)}k <span className="text-sm sm:text-lg text-text-tertiary font-light tracking-normal">/ R60k</span></div>
                              <p className="text-[9px] sm:text-[11px] text-text-tertiary uppercase tracking-[0.2em] sm:tracking-[0.3em] font-black">Strategic Pipeline Value</p>
                           </div>
                           <div className="w-full bg-white/5 rounded-full h-1.5 sm:h-2.5 mb-2 relative overflow-hidden">
                              <motion.div 
                                initial={{ width: 0 }}
                                animate={{ width: `${Math.min(100, (topLeads.length * 1.5 / 60) * 100)}%` }}
                                transition={{ duration: 1.5, ease: "easeOut" }}
                                className="theme-bg h-full rounded-full absolute left-0 top-0 shadow-[0_0_20px_var(--theme-glow)]" 
                              />
                           </div>
                           <div className="flex justify-between items-center mt-3 sm:mt-4">
                              <p className="text-[8px] sm:text-[9px] theme-text uppercase tracking-widest font-black">Quota: {Math.round((topLeads.length * 1.5 / 60) * 100)}%</p>
                              <p className="text-[8px] sm:text-[9px] text-text-tertiary uppercase tracking-widest font-black">Rem: R{Math.max(0, 60 - Math.round(topLeads.length * 1.5))}k</p>
                           </div>
                        </div>
                     </div>
                 </section>
              </div>

              <button 
                onClick={() => topLeads[0] && setSelectedLeadForBrief(topLeads[0])}
                className="bg-white text-black w-full py-4 sm:py-6 mt-12 sm:mt-20 flex items-center justify-center gap-3 sm:gap-4 rounded-xl sm:rounded-2xl text-[10px] sm:text-xs font-black uppercase tracking-[0.2em] sm:tracking-[0.3em] hover:scale-[1.01] active:scale-[0.99] transition-all shadow-2xl"
                title="Generate a strategic pre-call brief"
              >
                 <span>Initiate Briefing Protocol</span>
                 <Zap size={16} className="sm:w-4 sm:h-4" />
              </button>
            </div></div>
        </div>
        
        <div className="w-full xl:w-80 flex flex-col sm:flex-row xl:flex-col gap-4 sm:gap-6 shrink-0">
           <IntelligenceButton 
              onClick={() => setShowCompetitorModal(true)}
              icon={<Target size={18} className="sm:w-5 sm:h-5" />}
              label="Competitor Analysis"
              sub="Extract target accounts"
              color="text-text-primary"
              title="Run competitive analysis to extract new actionable leads"
           />
           <IntelligenceButton 
              onClick={() => setShowPdfModal(true)}
              icon={<FileText size={18} className="sm:w-5 sm:h-5" />}
              label="Extract Leads"
              sub="Parse PDFs & lists"
              color="text-text-primary"
              title="Upload PDF files to automatically extract and enrich leads"
           />
           
           <div className="flex-1 glass-panel p-5 sm:p-6 rounded-2xl flex flex-col justify-center border-border-subtle group transition-all">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center mb-3 sm:mb-4">
                 <Zap size={18} className="sm:w-5 sm:h-5" />
              </div>
              <h4 className="text-sm sm:text-base font-semibold text-text-primary mb-1">AI Assistant Active</h4>
              <p className="text-[10px] sm:text-sm text-text-tertiary">Monitoring market signals and enriching leads in background.</p>
           </div>
        </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 pt-10 sm:pt-12 border-t border-border-subtle">
        <div className="lg:col-span-4 space-y-6">
           <div className="flex items-center justify-between">
              <h3 className="text-base sm:text-lg font-semibold text-text-primary">Schedule</h3>
              <div className="flex items-center space-x-2">
                 <div className="w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full bg-emerald-500" />
                 <div className="text-[9px] sm:text-[11px] font-medium text-emerald-500 uppercase tracking-[0.2em] sm:tracking-widest">Live Sync</div>
              </div>
           </div>
           
           <div className="glass-panel p-5 sm:p-6 rounded-2xl relative">
              <div className="absolute left-6 top-8 bottom-8 w-[1px] bg-border-subtle" />
              
              <div className="space-y-8 pl-4">
                 <TimelineItem 
                   time="09:00" 
                   title={todayAgenda.length > 0 ? todayAgenda[0].companyName : "Strategic Sync"}                   desc="Strategy Pitch Call" 
                   status="completed" 
                 />
                 <TimelineItem 
                   time="10:30" 
                   title="Naledi" 
                   desc="Follow-up Interview" 
                   status="upcoming" 
                 />
                 <TimelineItem 
                   time="14:00" 
                   title="John Deere" 
                   desc="Media Kit Review" 
                   status="pending" 
                 />
              </div>
              
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-8 p-5 bg-bg-glass-high border border-border-subtle rounded-xl relative overflow-hidden group"
              >
                 <div className="flex items-center space-x-2 mb-2">
                    <Sparkles size={14} className="text-acc-blue" />
                    <p className="text-xs font-semibold text-text-primary">Smart Scheduling</p>
                 </div>
                 <p className="text-sm text-text-secondary leading-relaxed">
                    Time slot available: <span className="text-text-primary font-medium">11:00</span> for Themba Dlamini. Schedule now?
                 </p>
                 <div className="mt-4 flex space-x-2">
                    <button title="Accept AI-suggested schedule slot" className="px-4 py-1.5 bg-text-primary text-bg-deep text-xs font-medium rounded hover:bg-white/90 transition-all">
                       Accept
                    </button>
                    <button title="Dismiss this scheduling suggestion" className="px-4 py-1.5 bg-transparent border border-border-subtle text-text-primary text-xs font-medium rounded hover:bg-bg-glass-high transition-all">
                       Dismiss
                    </button>
                 </div>
              </motion.div>
           </div>
        </div>

           <div className="lg:col-span-8 space-y-6">
           <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base sm:text-lg font-semibold text-text-primary">Task Overview</h3>
                <p className="text-[10px] sm:text-sm text-text-tertiary mt-0.5 sm:mt-1">High-value interactions for today</p>
              </div>
              <div className="flex items-center space-x-3 shrink-0">
                 <div className="px-2 py-0.5 sm:px-3 sm:py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-[9px] sm:text-xs font-medium rounded-md flex items-center gap-1.5 sm:gap-2">
                    <div className="w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full bg-emerald-500" />
                    3 Scheduled
                 </div>
              </div>
           </div>

           <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {todayAgenda.slice(0, 2).map((item, i) => (
                <InteractionCard 
                  key={item.id}
                  time={item.nextFollowUp ? format(new Date(item.nextFollowUp), 'HH:mm') : '--:--'}
                  company={item.companyName}
                  person={item.decisionMaker}
                  title={item.title}
                  action={item.status === 'Follow-up' ? 'Follow-up' : 'Discovery'}
                  publication={item.publication}
                  status={i === 0 ? 'ready' : 'upcoming'}
                  onPrep={() => setSelectedLeadForBrief(item)}
                />
              ))}
              <button 
                   onClick={() => window.dispatchEvent(new CustomEvent('wendy-action', { detail: { name: 'navigate_to', args: { tab: 'leads' } } }))}
                   className="w-full glass-panel p-6 rounded-xl border-dashed border-border-subtle flex flex-col items-center justify-center text-center group cursor-pointer hover:bg-bg-glass-high transition-all" 
                   title="Explore the interactive lead vault">
                 <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full border border-border-subtle flex items-center justify-center text-text-secondary group-hover:text-text-primary transition-all mb-2 sm:mb-3">
                    <Zap size={16} className="sm:w-5 sm:h-5" />
                 </div>
                 <p className="text-xs sm:text-sm font-medium text-text-secondary group-hover:text-text-primary">Explore Vault</p>
              </button>
           </div>

           <div className="pt-10 sm:pt-12">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-base sm:text-lg font-semibold text-text-primary">Source Feed</h3>
                <p className="text-[9px] sm:text-[11px] uppercase tracking-widest text-text-tertiary font-bold">Real-Time Alerts</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                 {topLeads.map(lead => (
                   <div key={lead.id} className="glass-panel p-5 sm:p-6 rounded-xl hover:border-text-dim transition-all group flex flex-col justify-between min-h-[240px] sm:min-h-[260px]">
                      <div>
                        <div className="flex items-start justify-between mb-4 sm:mb-6">
                          <div className="flex items-center space-x-3 sm:space-x-4 min-w-0">
                             <div className="w-10 h-10 sm:w-12 sm:h-12 bg-bg-glass-high flex items-center justify-center rounded-lg font-black text-text-primary shrink-0 text-sm sm:text-base">
                                {lead.score || '--'}
                             </div>
                             <div className="min-w-0">
                                <h4 className="font-bold text-text-primary text-sm sm:text-base leading-tight group-hover:text-acc-gold transition-colors truncate">{lead.companyName}</h4>
                                <p className="text-[10px] sm:text-xs text-text-tertiary mt-0.5 sm:mt-1 truncate">{lead.sector}</p>
                             </div>
                          </div>
                          <div className="px-2 py-0.5 sm:px-3 sm:py-1 bg-white/5 text-text-secondary text-[8px] sm:text-[10px] font-black uppercase tracking-widest rounded border border-white/5 shrink-0">
                             {lead.publication.split(' ')[0]}
                          </div>
                        </div>

                        <div className="space-y-4">
                          <div className="text-xs sm:text-sm text-text-secondary leading-relaxed border-l-2 border-acc-blue/30 pl-3 sm:pl-4 py-1 italic">
                             <span>"{lead.sourceReasoning}"</span>
                          </div>
                        </div>
                      </div>

                      <div className="mt-6 sm:mt-8 space-y-4">
                        <div className="flex flex-col sm:flex-row items-stretch gap-2 sm:gap-3">
                           <button 
                             onClick={() => setSelectedLeadForBrief(lead)}
                             className="flex-1 py-1.5 sm:py-2.5 bg-white/5 border border-white/10 rounded-lg text-[10px] sm:text-xs font-black uppercase tracking-widest hover:bg-white/10 transition-all"
                             title="Prep pitch for this lead"
                           >
                               Prep
                           </button>
                           <button 
                             onClick={() => handleQuickPitch(lead)}
                             disabled={isGeneratingPitch === lead.id}
                             className="flex-1 py-1.5 sm:py-2.5 bg-text-primary text-bg-deep rounded-lg text-[10px] sm:text-xs font-black uppercase tracking-widest flex justify-center items-center gap-2 hover:bg-white transition-all disabled:opacity-50"
                             title="Quick pitch for this lead"
                           >
                              {isGeneratingPitch === lead.id ? <Loader2 size={12} className="animate-spin" /> : <Zap size={12} />}
                              Quick Pitch
                           </button>
                        </div>

                        {lead.quickPitch && (
                          <motion.div 
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="mt-3 sm:mt-4"
                          >
                             <div className="p-3 sm:p-4 bg-bg-glass-high rounded-lg sm:rounded-xl text-[11px] sm:text-sm leading-relaxed text-text-secondary italic">
                                "{lead.quickPitch}"
                             </div>
                          </motion.div>
                        )}
                      </div>
                   </div>
                 ))}
              </div>
           </div>
        </div>
      </div>

      <AnimatePresence>
        {showPdfModal && (
          <IntelligenceModal 
            title="Asset Intelligence Engine" 
            onClose={() => setShowPdfModal(false)}
            isUploading={isUploading}
            logLines={logLines}
            pdfResult={pdfResult}
            fileInputRef={fileInputRef}
            onFileUpload={handlePdfUpload}
            logEndRef={logEndRef}
          />
        )}
        {showCompetitorModal && (
          <CompetitorModal 
            onClose={() => setShowCompetitorModal(false)}
            competitorName={competitorName}
            setCompetitorName={setCompetitorName}
            sourcingPub={sourcingPub}
            setSourcingPub={setSourcingPub}
            isSourcing={isSourcing}
            sourcingResult={sourcingResult}
            onRun={handleSourceFromCompetitor}
          />
        )}
      </AnimatePresence>

      <PreCallBriefModal 
         isOpen={!!selectedLeadForBrief} 
         onClose={() => setSelectedLeadForBrief(null)} 
         lead={selectedLeadForBrief} 
      />
    </div>
  );
}

function KpiCard({ label, value, icon }: { label: string, value: string, icon: React.ReactNode }) {
  return (
    <div className="flex items-center space-x-4 px-4 py-2">
       <div className="w-10 h-10 rounded-xl glass-high flex items-center justify-center border border-white/5">
          {icon}
       </div>
       <div className="flex flex-col">
          <span className="body-caption text-text-tertiary uppercase tracking-widest font-bold">{label}</span>
          <span className="heading-medium text-text-primary mt-1">{value}</span>
       </div>
    </div>
  );
}

function CallItem({ time, name }: { time: string, name: string }) {
  return (
    <div className="flex items-center space-x-6 p-4 glass-high rounded-2xl border-white/5 hover:border-acc-blue/20 transition-all cursor-pointer group">
       <span className="body-caption font-bold text-acc-blue w-12 text-right">{time}</span>
       <div className="w-[2px] h-6 bg-border-subtle group-hover:bg-acc-blue/40 transition-colors" />
       <p className="body-default font-medium text-text-primary">{name}</p>
    </div>
  );
}

function TimelineItem({ time, title, desc, status }: { time: string, title: string, desc: string, status: 'completed' | 'upcoming' | 'pending' }) {
  return (
    <div className="flex items-start space-x-4 sm:space-x-6 relative z-10 group cursor-pointer">
       <div className={cn(
         "w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center shrink-0 border transition-all duration-300",
         status === 'completed' ? "border-emerald-500/30 text-emerald-500 bg-emerald-500/5" : 
         status === 'upcoming' ? "border-text-primary text-text-primary bg-bg-glass-high" : "border-border-subtle text-text-tertiary"
       )}>
          {status === 'completed' ? <CheckCircle2 size={16} className="sm:w-4 sm:h-4" /> : <div className="text-[10px] sm:text-sm font-semibold">{time}</div>}
       </div>
       <div className="flex flex-col pt-0.5 border-b border-border-subtle pb-4 sm:pb-6 flex-1 group-hover:border-text-dim transition-colors min-w-0">
          <div className="flex items-center justify-between gap-2 overflow-hidden">
             <h5 className={cn("text-sm sm:text-base font-semibold truncate", status === 'completed' ? "text-text-tertiary line-through" : "text-text-primary")}>{title}</h5>
             {status === 'upcoming' && <div className="text-[8px] sm:text-[10px] bg-bg-glass-high text-text-secondary px-1.5 py-0.5 rounded font-black uppercase tracking-widest border border-white/10 shrink-0">LOCKED</div>}
          </div>
          <p className="text-[10px] sm:text-sm text-text-tertiary mt-0.5 sm:mt-1 truncate">{desc}</p>
       </div>
    </div>
  );
}
function StatItem({ label, value, trend }: { label: string, value: string, trend?: string }) {
  return (
    <div className="flex flex-col">
       <span className="text-xs text-text-tertiary font-medium mb-1">{label}</span>
       <div className="flex items-baseline space-x-3">
          <span className="text-2xl font-bold text-text-primary">{value}</span>
          {trend && (
            <div className="flex items-center text-xs font-medium text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
               {trend}
            </div>
          )}
       </div>
    </div>
  );
}

function IntelligenceButton({ onClick, icon, label, sub, color, title }: { onClick: () => void, icon: React.ReactNode, label: string, sub: string, color: string, title?: string }) {
  return (
    <button 
      onClick={onClick}
      title={title}
      className={cn(
        "w-full glass-panel p-4 rounded-xl flex items-center space-x-4 group text-left hover:border-text-dim transition-all active:scale-[0.98]"
      )}
    >
      <div className={cn("w-10 h-10 bg-bg-glass-high flex items-center justify-center rounded-lg transition-transform text-text-secondary", color)}>
        {icon}
      </div>
      <div>
         <h4 className="text-sm font-medium text-text-primary">{label}</h4>
         <p className="text-xs text-text-tertiary mt-0.5">{sub}</p>
      </div>
    </button>
  );
}

function InteractionCard({ time, company, person, title, action, status, onPrep, publication }: { 
  time: string, 
  company: string, 
  person: string, 
  title: string, 
  action: string, 
  status: 'ready' | 'upcoming',
  onPrep: () => void,
  publication: string
}) {
  const isPrep = status === 'ready';

  return (
    <div className={cn(
      "glass-panel relative rounded-xl overflow-hidden transition-all duration-200",
      isPrep ? "border-text-dim/50" : "border-border-subtle"
    )}>
       <div className="p-6">
          <div className="flex justify-between items-start mb-4">
             <div className="flex flex-col">
                <span className="text-base font-semibold text-text-primary">{person}</span>
                <span className="text-xs text-text-tertiary mt-1">{time} • {company}</span>
             </div>
          </div>

          <p className="text-xs text-text-secondary mb-6 truncate">{publication} Details</p>

          <div className="flex gap-2">
             <button 
               onClick={onPrep}
               className="btn-primary flex-1 py-2"
             >
               View Details
             </button>
             {!isPrep && (
                <button className="btn-outline flex-1 py-2">Reschedule</button>
             )}
          </div>
       </div>
    </div>
  );
}

function IntelligenceModal({ title, onClose, isUploading, logLines, pdfResult, fileInputRef, onFileUpload, logEndRef }: any) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-bg-deep/80 backdrop-blur-sm"
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 10 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 10 }}
        className="glass-panel max-w-lg w-full relative rounded-2xl"
      >
        <div className="p-5 sm:p-8 space-y-6 sm:space-y-8">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-xl font-semibold text-text-primary">{title}</h3>
              <p className="text-sm text-text-secondary mt-1">Extract lead data from documents</p>
            </div>
            <button 
              onClick={onClose}
              className="p-2 hover:bg-bg-glass-high rounded transition-colors text-text-secondary hover:text-text-primary"
            >
              <X size={20} />
            </button>
          </div>

          <div className="space-y-6">
            <div className="border border-dashed border-border-subtle rounded-xl p-6 sm:p-10 flex flex-col items-center justify-center text-center hover:border-text-dim hover:bg-bg-glass-high/50 transition-all cursor-pointer relative"
                 onClick={() => fileInputRef.current?.click()}
            >
              {isUploading && (
                 <div className="absolute inset-0 pointer-events-none opacity-20 overflow-hidden rounded-xl">
                    <div className="absolute left-0 right-0 h-[2px] bg-text-primary blur-[1px] animate-scanLine" />
                 </div>
              )}
              <input 
                type="file" 
                ref={fileInputRef}
                className="hidden"
                accept="application/pdf"
                onChange={onFileUpload}
                disabled={isUploading}
              />
              <div className="w-12 h-12 rounded-full border border-border-subtle flex items-center justify-center mb-4 transition-all relative z-10 bg-bg-glass-high">
                {isUploading ? <Loader2 className="animate-spin text-acc-gold" size={32} /> : <UploadCloud className="text-text-dim group-hover:text-acc-gold transition-colors" size={32} />}
              </div>
              <p className="font-serif italic text-2xl tracking-tight mb-3 relative z-10">
                 {isUploading ? "Extracting Strategic Nodes..." : "Injest Media Asset"}
              </p>
              <p className="font-sans text-[10px] uppercase tracking-[0.2em] text-text-dim relative z-10 font-bold">
                 PDF SOURCE • MAX 20MB
              </p>
            </div>

            {logLines.length > 0 && (
              <div className="bg-bg-deep border border-border-subtle rounded-xl p-4 font-mono text-[11px] h-60 overflow-y-auto leading-relaxed shadow-inner">
                {logLines.map((log: any) => (
                   <div 
                      key={log.id}
                      className={cn(
                        "mb-2 flex gap-3",
                        log.type === 'amber' && "text-text-primary",
                        log.type === 'dim' && "text-text-dim",
                        log.type === 'red' && "text-red-400",
                        log.type === 'blue' && "text-blue-400",
                        log.type === 'default' && "text-emerald-400"
                      )}
                   >
                      <span className="opacity-40 shrink-0">[{new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}]</span>
                      <span>{log.text}</span>
                   </div>
                ))}
                <div ref={logEndRef} />
              </div>
            )}
          </div>

          {pdfResult && (
            <div className={cn(
              "p-4 rounded-xl border text-sm font-medium flex items-center space-x-3",
              pdfResult.success 
                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500" 
                : "bg-red-500/10 border-red-500/20 text-red-500"
            )}>
              {pdfResult.success ? <CheckCircle2 size={16} /> : <X size={16} />}
              <span>{pdfResult.message}</span>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

function CompetitorModal({ onClose, competitorName, setCompetitorName, sourcingPub, setSourcingPub, isSourcing, sourcingResult, onRun }: any) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-bg-deep/80 backdrop-blur-sm"
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 10 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 10 }}
        className="glass-panel max-w-md w-full relative rounded-2xl"
      >
        <div className="p-5 sm:p-8 space-y-6 sm:space-y-8">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-xl font-semibold text-text-primary">Competitor Analysis</h3>
              <p className="text-sm text-text-secondary mt-1">Extract leads from competitor data</p>
            </div>
            <button 
              onClick={onClose}
              className="p-2 hover:bg-bg-glass-high rounded transition-colors text-text-secondary hover:text-text-primary"
            >
              <X size={20} />
            </button>
          </div>

          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-text-tertiary uppercase tracking-widest pl-1">Target Competitor</label>
              <input 
                type="text" 
                value={competitorName}
                onChange={(e) => setCompetitorName(e.target.value)}
                placeholder="e.g. Daily Maverick, Forbes"
                className="w-full bg-bg-deep border border-border-subtle rounded-xl px-4 py-3 text-text-primary placeholder:text-text-dim focus:outline-none focus:border-acc-blue transition-all font-sans text-sm shadow-sm"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-text-tertiary uppercase tracking-widest pl-1">Target Publication</label>
              <div className="relative">
                <select 
                  value={sourcingPub}
                  onChange={(e) => setSourcingPub(e.target.value as PublicationType)}
                  className="w-full bg-bg-deep border border-border-subtle rounded-xl px-4 py-3 text-text-primary focus:outline-none focus:border-acc-blue transition-all font-sans appearance-none text-sm shadow-sm"
                >
                  <option value="Harvest SA">Harvest SA</option>
                  <option value="Black Business Quarterly">Black Business Quarterly</option>
                  <option value="Leadership Magazine">Leadership Magazine</option>
                </select>
                <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 rotate-90 text-text-dim pointer-events-none" size={16} />
              </div>
            </div>
          </div>

          {sourcingResult && (
            <div className={cn(
              "p-4 rounded-xl border text-sm font-medium flex items-center space-x-3",
              sourcingResult.success 
                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500" 
                : "bg-red-500/10 border-red-500/20 text-red-500"
            )}>
              {sourcingResult.success ? <CheckCircle2 size={16} /> : <X size={16} />}
              <span>{sourcingResult.message}</span>
            </div>
          )}

          <div className="pt-2 flex gap-3">
             <button 
               onClick={onClose}
               className="btn-outline flex-1"
             >
               Cancel
             </button>
             <button 
               onClick={onRun}
               disabled={isSourcing || !competitorName.trim()}
               className="btn-primary flex-[2] flex justify-center items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
             >
               {isSourcing ? (
                 <>
                   <Loader2 size={16} className="animate-spin" />
                   <span>Processing...</span>
                 </>
               ) : (
                 <>
                   <Target size={16} />
                   <span>Extract Leads</span>
                 </>
               )}
             </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
