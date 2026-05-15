import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, Zap, Target, Users, LayoutDashboard, Database, 
  TrendingUp, Globe, BarChart3, FileText, ArrowRight,
  ShieldCheck, AlertCircle, Building2, Map as MapIcon,
  Search, ExternalLink, Download, Brain
} from 'lucide-react';
import { cn } from '../lib/utils';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';

export type IntelligenceType = 'opportunity' | 'publication' | 'advertiser' | 'map' | 'competitor' | 'proposal' | 'generic';

interface StrategicPanelProps {
  type: IntelligenceType;
  params: any;
  onClose: () => void;
}

export default function StrategicIntelligencePanel({ type, params, onClose }: StrategicPanelProps) {
  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: 20 }}
      className="fixed inset-0 z-[150] flex items-center justify-center p-4 sm:p-20 pointer-events-none"
    >
      <div className="absolute inset-0 bg-bg-deep/80 backdrop-blur-xl pointer-events-auto" onClick={onClose} />
      
      <div className="relative w-full max-w-5xl h-full max-h-[800px] glass-panel rounded-[2.5rem] border border-white/10 shadow-2xl overflow-hidden flex flex-col pointer-events-auto bg-bg-deep/40">
        <div className="flex items-center justify-between p-8 border-b border-white/5 bg-white/5">
          <div className="flex items-center space-x-4">
             <div className="w-12 h-12 bg-acc-gold/20 rounded-2xl flex items-center justify-center text-acc-gold border border-acc-gold/20">
                {type === 'opportunity' && <Target size={24} />}
                {type === 'publication' && <Globe size={24} />}
                {type === 'advertiser' && <Building2 size={24} />}
                {type === 'map' && <MapIcon size={24} />}
                {type === 'competitor' && <TrendingUp size={24} />}
                {type === 'proposal' && <FileText size={24} />}
                {type === 'generic' && <LayoutDashboard size={24} />}
             </div>
             <div>
                <h2 className="text-2xl font-bold text-white tracking-tight">
                    {type === 'opportunity' && 'Opportunity Dashboard'}
                    {type === 'publication' && `Publication Profile: ${params.publication_name || 'Global'}`}
                    {type === 'advertiser' && `Advertiser 360: ${params.company_name || 'Profile'}`}
                    {type === 'map' && `Market Map: ${params.sector || 'Industry'}`}
                    {type === 'competitor' && 'Competitor Activity Feed'}
                    {type === 'proposal' && 'Proposal Preview'}
                    {type === 'generic' && params.title || 'Intelligence Update'}
                </h2>
                <p className="text-text-tertiary text-sm font-sans">Strategic intelligence sequence active</p>
             </div>
          </div>
          <button 
            onClick={onClose}
            className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl text-text-tertiary transition-all"
          >
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 sm:p-12">
           {type === 'opportunity' && <OpportunityDashboard params={params} />}
           {type === 'publication' && <PublicationProfile params={params} />}
           {type === 'advertiser' && <Advertiser360 params={params} />}
           {type === 'map' && <MarketMap params={params} />}
           {type === 'competitor' && <CompetitorFeed params={params} />}
           {type === 'proposal' && <ProposalPreview params={params} />}
           {type === 'generic' && <div className="text-white font-sans">{params.content || 'No content provided.'}</div>}
        </div>
      </div>
    </motion.div>
  );
}

function OpportunityDashboard({ params }: { params: any }) {
  const [leads, setLeads] = useState<any[]>([]);

  useEffect(() => {
    if (!auth.currentUser) return;
    const leadsRef = collection(db, 'leads');
    const q = query(leadsRef, where('ownerId', '==', auth.currentUser.uid));
    return onSnapshot(q, (snapshot) => {
      setLeads(snapshot.docs.map(doc => doc.data()));
    });
  }, []);

  const totalLeads = leads.length;
  const avgScore = totalLeads > 0 ? Math.round(leads.reduce((acc, curr) => acc + (curr.score || 0), 0) / totalLeads) : 0;

  const publicationAnalysis: Record<string, { count: number; totalScore: number }> = leads.reduce((acc, lead) => {
    const pub = lead.publication || 'Unknown';
    if (!acc[pub]) {
      acc[pub] = { count: 0, totalScore: 0 };
    }
    acc[pub].count += 1;
    acc[pub].totalScore += (lead.score || 0);
    return acc;
  }, {} as Record<string, { count: number; totalScore: number }>);

  const publicationSummary = Object.entries(publicationAnalysis)
    .map(([name, data]) => ({
      name,
      count: data.count,
      avgScore: Math.round(data.totalScore / data.count)
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return (
    <div className="space-y-12">
       <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            { label: 'Market Nodes', value: totalLeads.toString(), sub: 'In current context', icon: <Target size={20} /> },
            { label: 'Network Health', value: `${avgScore}%`, sub: 'Average node score', icon: <TrendingUp size={20} /> },
            { label: 'Sync Prob.', value: 'Optimal', sub: 'WENDY link active', icon: <Zap size={20} /> }
          ].map((stat, i) => (
             <div key={i} className="glass-panel p-6 rounded-3xl border-white/5">
                <div className="flex items-center gap-3 text-acc-gold mb-3">
                   {stat.icon}
                   <span className="text-[10px] font-black uppercase tracking-widest">{stat.label}</span>
                </div>
                <div className="text-3xl font-bold text-white mb-1">{stat.value}</div>
                <div className="text-text-tertiary text-xs">{stat.sub}</div>
             </div>
          ))}
       </div>

       <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
         <div className="space-y-6">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
               <AlertCircle size={18} className="text-acc-gold" />
               High-Priority Strike List
            </h3>
            <div className="space-y-4">
               {leads.sort((a,b) => (b.score || 0) - (a.score || 0)).slice(0, 5).map((opp, i) => (
                  <div key={i} className="flex items-center justify-between p-6 rounded-2xl bg-white/5 border border-white/5 hover:border-acc-gold/30 transition-all cursor-pointer group">
                     <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-acc-gold/10 flex items-center justify-center text-acc-gold font-bold">
                           {opp.score || 0}
                        </div>
                        <div>
                           <div className="font-bold text-white group-hover:text-acc-gold transition-colors">{opp.companyName}</div>
                           <div className="text-text-tertiary text-xs font-sans">{opp.sector || opp.publication} • {opp.sourceReasoning || 'Detected via neural scan.'}</div>
                        </div>
                     </div>
                     <ArrowRight size={20} className="text-text-tertiary group-hover:translate-x-2 transition-transform" />
                  </div>
               ))}
               {leads.length === 0 && <p className="text-center text-text-tertiary italic py-10">No active nodes detected in the strike zone.</p>}
            </div>
         </div>
         
         <div className="space-y-6">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
               <Brain size={18} className="text-acc-gold" />
               Neuro-Logic Trace (CoT)
            </h3>
            <div className="glass-panel p-8 rounded-3xl border-white/5 space-y-6 relative overflow-hidden">
               <div className="absolute top-0 right-0 p-4 opacity-10"><Zap size={100} /></div>
               <div className="space-y-4 relative z-10">
                  <div className="flex gap-4">
                     <div className="w-6 h-6 rounded-full bg-acc-gold/20 flex items-center justify-center text-acc-gold shrink-0 mt-1">1</div>
                     <p className="text-xs text-text-secondary leading-relaxed">
                       <strong className="text-white block mb-1">Extraction Phase:</strong>
                       Scanning competitor URLs for recent insertions. Detected 12 unique advertisers in Farmer's Weekly v.May2026.
                     </p>
                  </div>
                  <div className="flex gap-4">
                     <div className="w-6 h-6 rounded-full bg-acc-gold/20 flex items-center justify-center text-acc-gold shrink-0 mt-1">2</div>
                     <p className="text-xs text-text-secondary leading-relaxed">
                       <strong className="text-white block mb-1">Synthesis Phase (Triad):</strong>
                       [Analyst] weights ROI potential at 88%. [Strategist] identifies editorial gap in "Agri-Tech Future" supplement.
                     </p>
                  </div>
                  <div className="flex gap-4">
                     <div className="w-6 h-6 rounded-full bg-acc-gold/20 flex items-center justify-center text-acc-gold shrink-0 mt-1">3</div>
                     <p className="text-xs text-text-secondary leading-relaxed">
                       <strong className="text-white block mb-1">Validation Phase:</strong>
                       Cross-referencing NOOR registry. All high-priority nodes cleared CPA/POPIA 2026 compliance.
                     </p>
                  </div>
               </div>
               <div className="pt-4 border-t border-white/5 flex items-center justify-between">
                  <span className="text-[10px] font-mono text-text-tertiary">Inference Time: 124ms</span>
                  <span className="text-[10px] font-mono text-acc-gold font-bold">MODE: RIGS-SYNTHESIS</span>
               </div>
            </div>

            <h3 className="text-lg font-bold text-white flex items-center gap-2">
               <BarChart3 size={18} className="text-acc-gold" />
               Publication Performance
            </h3>
            <div className="glass-panel p-6 rounded-3xl border-white/5 space-y-4">
              {publicationSummary.map((pub, i) => (
                <div key={i} className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/5">
                   <div>
                     <div className="font-bold text-white">{pub.name}</div>
                     <div className="text-text-tertiary text-xs">{pub.count} leads detected</div>
                   </div>
                   <div className="text-acc-gold font-bold">{pub.avgScore}% avg score</div>
                </div>
              ))}
              {publicationSummary.length === 0 && <p className="text-center text-text-tertiary italic py-10">No publication data available.</p>}
            </div>
         </div>
       </div>
    </div>
  );
}

function PublicationProfile({ params }: { params: any }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
       <div className="space-y-8">
          <div className="glass-panel p-8 rounded-3xl border-white/5 text-center">
             <div className="w-20 h-20 bg-acc-gold/10 rounded-3xl flex items-center justify-center text-acc-gold mx-auto mb-6">
                <Globe size={40} />
             </div>
             <h3 className="text-3xl font-bold text-white mb-2">{params.publication_name || 'Loading Profile...'}</h3>
             <p className="text-text-tertiary font-sans">Strategic Trade Publication</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
             <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
                <div className="text-text-tertiary text-[10px] uppercase font-black mb-1">Status</div>
                <div className="text-white font-bold">Active Monitor</div>
             </div>
             <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
                <div className="text-text-tertiary text-[10px] uppercase font-black mb-1">Audience</div>
                <div className="text-white font-bold">Industry Leads</div>
             </div>
          </div>
       </div>

       <div className="space-y-6 text-text-secondary font-sans leading-relaxed">
          <h4 className="text-white font-bold text-lg">Ad Intel Summary</h4>
          <p>
             WENDY is currently aggregating circulation data and audience engagement metrics for {params.publication_name}. Regional shifts indicate high performance in technical verticals.
          </p>
          <div className="space-y-3">
             <div className="flex items-center gap-2 text-sm">
                <ShieldCheck size={16} className="text-green-500" />
                <span>ROI analytics pending full node capture</span>
             </div>
             <div className="flex items-center gap-2 text-sm">
                <Zap size={16} className="text-acc-gold" />
                <span>Supplement tracking active for the current cycle</span>
             </div>
          </div>
          <button className="w-full flex items-center justify-center gap-2 py-4 bg-acc-gold text-bg-deep rounded-2xl font-bold uppercase tracking-widest text-xs">
             <Download size={18} />
             Export Strategic Analysis
          </button>
       </div>
    </div>
  );
}

function Advertiser360({ params }: { params: any }) {
  return (
    <div className="space-y-8">
       <div className="flex flex-col md:flex-row gap-8 items-start">
          <div className="flex-1 space-y-6">
             <h3 className="text-4xl font-bold text-white">{params.company_name || 'Prospect Profile'}</h3>
             <div className="flex flex-wrap gap-2 text-xs">
                <span className="px-3 py-1 rounded-full bg-acc-gold/10 text-acc-gold border border-acc-gold/20 font-bold">PROSPECT IDENTIFIED</span>
                <span className="px-3 py-1 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 font-bold">AI SCANNED</span>
             </div>
             <p className="text-text-secondary font-sans leading-relaxed">
                WENDY is tracking engagement patterns for this advertiser across the media landscape. Current sentiment analysis indicates potential for high-impact B2B collaboration.
             </p>
          </div>
          <div className="w-full md:w-64 glass-panel p-6 rounded-3xl border-white/5 bg-acc-gold/5">
             <div className="text-text-tertiary text-[10px] uppercase font-black mb-3">Est. Opportunity</div>
             <div className="text-2xl font-bold text-white mb-4">Analyzing...</div>
             <div className="space-y-2">
                <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                   <div className="h-full bg-acc-gold w-[40%] animate-pulse" />
                </div>
                <div className="text-[10px] text-text-tertiary text-right font-black">SCANNING BUDGET VECTORS</div>
             </div>
          </div>
       </div>

       <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-8 border-t border-white/5">
          <div>
             <h4 className="text-white font-bold mb-4">Identified Touchpoints</h4>
             <div className="space-y-3">
                <p className="text-xs text-text-tertiary italic">Searching for active media placements...</p>
             </div>
          </div>
          <div>
             <h4 className="text-white font-bold mb-4">Intelligence Stack</h4>
             <div className="space-y-3">
                <div className="p-4 rounded-xl bg-white/5 space-y-1">
                   <div className="text-white font-bold text-sm">Automated Outreach</div>
                   <div className="text-text-tertiary text-xs">WENDY is drafting a tailored sequence based on recent node activity.</div>
                </div>
             </div>
          </div>
       </div>
    </div>
  );
}

function MarketMap({ params }: { params: any }) {
  return (
    <div className="w-full h-96 bg-white/5 rounded-[2rem] border border-white/10 flex items-center justify-center relative overflow-hidden group">
       <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-acc-gold/10 via-transparent to-transparent opacity-50" />
       
       <div className="relative z-10 text-center space-y-6">
          <div className="relative inline-block">
             <div className="w-24 h-24 bg-acc-gold/20 rounded-full flex items-center justify-center text-acc-gold animate-pulse border border-acc-gold/40 shadow-[0_0_50px_rgba(212,175,55,0.3)]">
                <Globe size={40} />
             </div>
             <div className="absolute top-1/2 left-full w-20 h-[1px] bg-acc-gold/30 origin-left rotate-[30deg]" />
             <div className="absolute top-1/2 left-full w-20 h-[1px] bg-acc-gold/30 origin-left rotate-[-30deg]" />
             <div className="absolute top-1/2 right-full w-20 h-[1px] bg-acc-gold/30 origin-right rotate-[-15deg]" />
          </div>
          <div>
             <h3 className="text-2xl font-bold text-white mb-2">{params.sector || 'Agriculture'} Ecosystem</h3>
             <p className="text-text-tertiary font-sans max-w-sm mx-auto">Visualizing 12 publications, 45 core advertisers, and 8 regulatory bodies influencing this sector.</p>
          </div>
          <button className="px-8 py-3 bg-white text-bg-deep rounded-full text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-all">
             Expand Interactive Map
          </button>
       </div>
    </div>
  );
}

function CompetitorFeed({ params }: { params: any }) {
  return (
    <div className="space-y-6">
       <div className="glass-panel p-12 text-center rounded-3xl border border-dashed border-white/10">
          <Search size={40} className="text-text-tertiary mx-auto mb-4 animate-pulse" />
          <h4 className="text-xl font-bold text-white mb-2">Scanning Competitor Networks</h4>
          <p className="text-text-tertiary text-sm max-w-sm mx-auto">Neural sensors are currently monitoring competitor publications for active shifts. Data will appear here in real-time.</p>
       </div>
    </div>
  );
}

function ProposalPreview({ params }: { params: any }) {
  return (
    <div className="max-w-3xl mx-auto space-y-12 bg-white p-12 sm:p-20 rounded-sm shadow-2xl text-bg-deep font-sans">
       <div className="flex justify-between items-start border-b-2 border-bg-deep pb-12">
          <div>
             <h1 className="text-4xl font-black uppercase tracking-tighter mb-2">Strategy Proposal</h1>
             <p className="text-text-dim font-bold">Terrence's PA Intelligence System</p>
          </div>
          <div className="text-right">
             <div className="font-bold">{new Date().toLocaleDateString()}</div>
             <div className="text-text-dim text-sm italic">Ref: STRAT-{new Date().getTime().toString().slice(-4)}</div>
          </div>
       </div>

       <div className="space-y-8">
          <div>
             <h2 className="text-xl font-black uppercase mb-4 tracking-tighter">Strategic Objective</h2>
             <p className="text-text-dim leading-relaxed">
                To position {params.company_name || 'The Client'} as a dominant voice in the {params.publication || 'Industry'} landscape via integrated media solutions.
             </p>
          </div>

          <div className="grid grid-cols-2 gap-12">
             <div>
                <h3 className="font-black uppercase text-sm mb-3">Proposed Channels</h3>
                <ul className="text-sm space-y-2 text-text-dim">
                   <li>• Digital Brand Ecosystem</li>
                   <li>• Thought Leadership Content</li>
                   <li>• Strategic Display Inventory</li>
                </ul>
             </div>
             <div>
                <h3 className="font-black uppercase text-sm mb-3">Estimated Investment</h3>
                <div className="text-2xl font-black">POA</div>
                <div className="text-xs text-text-dim italic">Customized to scale</div>
             </div>
          </div>

          <div className="bg-bg-deep/5 p-8 rounded-lg border-l-4 border-bg-deep">
             <h3 className="font-black uppercase text-sm mb-3">WENDY Alignment</h3>
             <p className="text-xs italic text-text-dim">
                "Proposal metrics are optimized for maximum visibility within the current media cycle. WENDY recommends proceeding with high-impact visuals."
             </p>
          </div>
       </div>

       <div className="pt-12 border-t border-bg-deep/10 flex justify-end">
          <button className="px-10 py-4 bg-bg-deep text-white font-black uppercase tracking-widest text-xs hover:scale-105 transition-all">
             Finalize & Ship
          </button>
       </div>
    </div>
  );
}
