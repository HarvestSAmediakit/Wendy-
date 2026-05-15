import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Users, 
  FileText, 
  Search, 
  Settings, 
  LogOut, 
  Menu, 
  X,
  Bell,
  User,
  Activity,
  Zap,
  Globe,
  PlusCircle,
  Command,
  Database,
  Send,
  MessageSquare,
  Bot,
  Sparkles,
  Mic,
  TrendingUp,
  PhoneCall,
  Phone,
  Maximize2,
  Minimize2,
  Calendar
} from 'lucide-react';
import { 
  onAuthStateChanged, 
  signOut, 
  User as FirebaseUser 
} from 'firebase/auth';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { useRef } from 'react';
import { GeminiLiveSession } from './lib/geminiLive';
import { auth, db } from './lib/firebase';
import Dashboard from './components/Dashboard';
import LeadList from './components/LeadList';
import Diary from './components/Diary';
import Auth from './components/Auth';
import GlobalCallReminder from './components/GlobalCallReminder';
import AIAssistant from './components/AIAssistant';
import WendyOrb from './components/WendyOrb';
import OnboardingTour from './components/OnboardingTour';
import StrategicIntelligencePanel, { IntelligenceType } from './components/StrategicIntelligencePanel';
import CallInterface from './components/CallInterface';
import WendyLab from './components/WendyLab';
import { LiveSourcingFeed } from './components/panels/LiveSourcingFeed';
import { cn } from './lib/utils';
import { PublicationType, Lead } from './types';
import { InteractionType, logInteraction } from './services/interactionService';
import { getDocs } from 'firebase/firestore';

export default function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'leads' | 'diary'>('dashboard');
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showAISidebar, setShowAISidebar] = useState(false);
  const [liveFeedLeads, setLiveFeedLeads] = useState<Lead[] | null>(null);
  const [statusMessage, setStatusMessage] = useState('Idle – ready to assist');
  const [isThinking, setIsThinking] = useState(false);
  const [omniInput, setOmniInput] = useState('');
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string | null>(null);
  const [magazineContext, setMagazineContext] = useState<'All' | PublicationType>('All');
  const [isSwitching, setIsSwitching] = useState(false);
  const [lastNotification, setLastNotification] = useState<{message: string, type: 'success' | 'alert'} | null>(null);
  const [showConversationPane, setShowConversationPane] = useState(false);
  const [showGlobalSourceModal, setShowGlobalSourceModal] = useState(false);
  const [conversationItems, setConversationItems] = useState<{role: 'user' | 'ai', content: string, type?: 'prep' | 'normal'}[]>([]);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [userKpis, setUserKpis] = useState({ huddleScore: '0', marketNodes: '0', commsSyncs: '0', forecasted: '0' });

  const [activeLeadForCall, setActiveLeadForCall] = useState<Lead | null>(null);
  const [showWendyLab, setShowWendyLab] = useState(false);

  // Command Palette State
  const [showCommandPalette, setShowCommandPalette] = useState(false);

  useEffect(() => {
    const handleKeydown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setShowCommandPalette(true);
      }
      if (e.key === 'Escape') {
        setShowCommandPalette(false);
      }
    };
    window.addEventListener('keydown', handleKeydown);
    return () => window.removeEventListener('keydown', handleKeydown);
  }, []);

  // Mock Active Signals for each magazine
  const [magazineSignals, setMagazineSignals] = useState({
    'Black Business Quarterly': 3,
    'Harvest SA': 5,
    'Leadership Magazine': 2,
    'All': 0
  });

  // Dynamic Theme injection
  useEffect(() => {
    const root = document.documentElement;
    const themes = {
      'Black Business Quarterly': { accent: '#fbbf24', glow: 'rgba(251, 191, 36, 0.2)', bg: 'rgba(251, 191, 36, 0.05)', border: 'rgba(251, 191, 36, 0.15)' },
      'Harvest SA': { accent: '#10b981', glow: 'rgba(16, 185, 129, 0.2)', bg: 'rgba(16, 185, 129, 0.05)', border: 'rgba(16, 185, 129, 0.15)' },
      'Leadership Magazine': { accent: '#3b82f6', glow: 'rgba(59, 130, 246, 0.2)', bg: 'rgba(59, 130, 246, 0.05)', border: 'rgba(59, 130, 246, 0.15)' },
      'All': { accent: '#fbbf24', glow: 'rgba(251, 191, 36, 0.2)', bg: 'rgba(251, 191, 36, 0.05)', border: 'rgba(251, 191, 36, 0.15)' }
    };
    
    const theme = themes[magazineContext] || themes.All;
    root.style.setProperty('--theme-accent', theme.accent);
    root.style.setProperty('--theme-glow', theme.glow);
    root.style.setProperty('--theme-bg-accent', theme.bg);
    root.style.setProperty('--theme-border', theme.border);
  }, [magazineContext]);

  // Strategic Intelligence Panel State
  const [strategicPanel, setStrategicPanel] = useState<{ type: IntelligenceType; params: any } | null>(null);

  useEffect(() => {
    if (!user) return;
    const leadsRef = collection(db, 'leads');
    const q = query(leadsRef, where('ownerId', '==', user.uid));
    
    return onSnapshot(q, (snapshot) => {
      const leads = snapshot.docs.map(doc => doc.data() as Lead);
      const totalNodes = leads.length;
      const avgScore = totalNodes > 0 ? Math.round(leads.reduce((acc, curr) => acc + (curr.score || 0), 0) / totalNodes) : 0;
      // Mocking revenue for now based on score if no spend field exists
      const totalRevenue = leads.reduce((acc, curr) => acc + ((curr.score || 0) * 1.5), 0) / 10;
      
      setUserKpis({
        huddleScore: avgScore.toString(),
        marketNodes: totalNodes.toString(),
        commsSyncs: leads.filter(l => l.status === 'In Progress').length.toString(),
        forecasted: totalRevenue.toFixed(1)
      });
    });
  }, [user]);

  // Global live session management
  const [liveSession, setLiveSession] = useState({ 
    active: false, 
    connecting: false,
    phase: 'idle' as 'idle' | 'listening' | 'processing' | 'speaking'
  });
  const liveSessionRef = useRef<GeminiLiveSession | null>(null);
  
  const toggleLiveVoice = async (persona: string = 'polished') => {
    if (liveSession.active) {
      if (liveSessionRef.current) {
        await liveSessionRef.current.stop();
        liveSessionRef.current = null;
      }
      setLiveSession({active: false, connecting: false, phase: 'idle'});
      return;
    }

    setLiveSession({active: false, connecting: true, phase: 'idle'});

    liveSessionRef.current = new GeminiLiveSession(
      () => {
        setLiveSession({active: true, connecting: false, phase: 'listening'});
      },
      (err) => {
        console.error(err);
        setLiveSession({active: false, connecting: false, phase: 'idle'});
        window.dispatchEvent(new CustomEvent('wendy-notification', { 
            detail: { message: err.message || "Failed to start voice.", type: 'alert' } 
        }));
      },
      (role, text) => {
         console.log("AI says:", text);
      },
      async (name, args) => {
        setLiveSession(prev => ({ ...prev, phase: 'processing' }));
        const { executeWendyTool } = await import('./lib/toolHandlers');
        return await executeWendyTool(name, args, magazineContext);
      },
      (isSpeaking) => {
        setLiveSession(prev => ({ ...prev, phase: isSpeaking ? 'speaking' : 'listening' }));
      },
      magazineContext,
      persona
    );

    await liveSessionRef.current.start();
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable full-screen mode: ${err.message}`);
      });
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handleFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  useEffect(() => {
    const handleWendyAction = (e: Event) => {
      const { name, args } = (e as CustomEvent).detail;
      console.log('App interpreting Wendy action:', name, args);
      
      const normalizedName = name.toLowerCase();
      console.log('App received Wendy action:', normalizedName, args);
      
      switch (normalizedName) {
        case 'show_dashboard':
          if (args.dashboard_type === 'opportunities' || args.dashboard_type === 'competitor') {
             setStrategicPanel({ type: args.dashboard_type === 'opportunities' ? 'opportunity' : 'competitor', params: args });
          } else {
             setActiveTab('dashboard');
             setLastNotification({ message: `Accessing ${args.dashboard_type} Intelligence`, type: 'success' });
          }
          break;
        
        case 'show_publication_profile':
          setStrategicPanel({ type: 'publication', params: args });
          break;
        
        case 'show_generic':
          setStrategicPanel({ type: 'generic', params: args });
          break;

        case 'show_advertiser_360':
          setStrategicPanel({ type: 'advertiser', params: args });
          break;
        
        case 'show_market_map':
          setStrategicPanel({ type: 'map', params: args });
          break;
        
        case 'show_proposal':
          setStrategicPanel({ type: 'proposal', params: args });
          break;

        case 'navigate_to':
          if (args.tab && ['dashboard', 'leads', 'diary'].includes(args.tab)) {
            setActiveTab(args.tab as any);
            logInteraction(InteractionType.TAB_SWITCH, args.tab);
          }
          break;

        case 'update_status':
          if (args.message) setStatusMessage(args.message);
          if (args.isThinking !== undefined) setIsThinking(args.isThinking);
          break;
          
        case 'switch_context':
          if (['All', 'Harvest SA', 'Black Business Quarterly', 'Leadership Magazine'].includes(args.context)) {
            setIsSwitching(true);
            setMagazineContext(args.context as any);
            setLastNotification({ message: `Switched focus to ${args.context}`, type: 'success' });
            logInteraction(InteractionType.CONTEXT_SWITCH, args.context);
            setTimeout(() => setIsSwitching(false), 2000); // Highlight for 2 seconds
          }
          break;

        case 'show_leads':
          setActiveTab('leads');
          logInteraction(InteractionType.TAB_SWITCH, 'leads');
          if (args.source) setActiveFilter(args.source);
          if (args.sector) setActiveFilter(args.sector);
          if (args.magazine_context) {
            setMagazineContext(args.magazine_context as any);
            logInteraction(InteractionType.CONTEXT_SWITCH, args.magazine_context);
          }
          if (args.leads && args.leads.length > 0) {
            // Show the spatial panel overlay with matching leads
            setLiveFeedLeads(args.leads);
          }
          break;

        case 'add_to_strike_list':
          setLastNotification({ 
            message: `Locked ${args.contact_name} for ${args.time} (${args.action})`, 
            type: 'alert' 
          });
          break;

        case 'draft_pitch':
          setActiveTab('leads');
          logInteraction(InteractionType.TAB_SWITCH, 'leads');
          setSearchQuery(args.lead_id);
          setLastNotification({ 
            message: `Strategizing pitch angle: ${args.angle}`, 
            type: 'success' 
          });
          break;

        case 'prep_call_brief':
          setShowConversationPane(true);
          setConversationItems(prev => [...prev, { 
            role: 'ai', 
            content: `Compiling deep brief for ${args.lead_id}...`, 
            type: 'prep' 
          }]);
          break;

        case 'show_calendar':
          setActiveTab('diary');
          logInteraction(InteractionType.TAB_SWITCH, 'diary');
          setLastNotification({ 
            message: `Retrieving Smart Diary for ${args.timeframe || 'this week'}`, 
            type: 'success' 
          });
          break;

        case 'search_web':
          setLastNotification({ message: `Accessing Open Intel: ${args.query}`, type: 'success' });
          break;

        case 'churn_alert': // Internal proactive trigger
          setLastNotification({ message: `PROACTIVE ALERT: Market shift detected!`, type: 'alert' });
          window.dispatchEvent(new CustomEvent('wendy-notification', { detail: { type: 'alert' } }));
          break;

        case 'trigger_call':
          setActiveLeadForCall(args.lead);
          break;

        default:
          console.log('Unhandled Wendy action:', name);
      }
    };

    window.addEventListener('wendy-action', handleWendyAction);
    return () => window.removeEventListener('wendy-action', handleWendyAction);
  }, []);

  useEffect(() => {
    if (lastNotification) {
      const timer = setTimeout(() => setLastNotification(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [lastNotification]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleLogout = () => signOut(auth);

  if (loading) {
    return (
      <div className="min-h-screen bg-bg-deep flex items-center justify-center">
        <Zap className="text-acc-gold animate-pulse" size={48} />
      </div>
    );
  }

  if (!user) {
    return <Auth />;
  }

  return (
    <div className="min-h-screen bg-bg-deep text-text-primary selection:bg-acc-gold/30 selection:text-acc-gold overflow-x-hidden font-sans relative">
      <AnimatePresence>
        {showCommandPalette && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[10000] bg-black/60 backdrop-blur-sm p-4 sm:p-20 flex justify-center items-start"
            onClick={() => setShowCommandPalette(false)}
          >
            <motion.div 
              initial={{ scale: 0.95, y: -20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: -20 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-2xl bg-bg-panel border border-white/10 rounded-2xl shadow-2xl overflow-hidden mt-10 sm:mt-20"
            >
              <div className="p-4 border-b border-white/5 flex items-center gap-4">
                <Search className="theme-text" size={18} />
                <input 
                  autoFocus
                  placeholder="Type a command (Switch Harvest, Launch Scraper...)"
                  className="bg-transparent border-none focus:ring-0 w-full text-lg text-text-primary placeholder:text-text-dim"
                />
              </div>
              <div className="p-2 max-h-[60vh] overflow-y-auto">
                <div className="px-3 py-2 text-[10px] uppercase tracking-widest text-text-dim font-black">Neural Channels</div>
                {(['All', 'Black Business Quarterly', 'Harvest SA', 'Leadership Magazine'] as const).map(pub => (
                  <button 
                    key={pub}
                    onClick={() => {
                      setMagazineContext(pub);
                      setShowCommandPalette(false);
                      setLastNotification({ message: `Context switched: ${pub}`, type: 'success' });
                      logInteraction(InteractionType.CONTEXT_SWITCH, pub);
                    }}
                    className="w-full flex items-center gap-4 px-4 py-3 hover:bg-white/5 rounded-xl transition-colors text-left group"
                  >
                    <Globe className="text-text-tertiary group-hover:theme-text" size={14} />
                    <span className="text-sm font-bold text-text-secondary group-hover:text-text-primary">{pub}</span>
                  </button>
                ))}
                
                <div className="mt-4 px-3 py-2 text-[10px] uppercase tracking-widest text-text-dim font-black">Strategic Operations</div>
                {[
                  { label: 'Market Deep Scrape', icon: <Zap size={14} />, action: () => { setShowCommandPalette(false); window.dispatchEvent(new CustomEvent('wendy-action', { detail: { name: 'deep_scrape_triggered' } })); } },
                  { label: 'Apollo Extraction', icon: <Database size={14} />, action: () => { setShowCommandPalette(false); window.dispatchEvent(new CustomEvent('wendy-action', { detail: { name: 'pull_apollo_data' } })); } }
                ].map((op, idx) => (
                  <button 
                    key={idx}
                    onClick={op.action}
                    className="w-full flex items-center gap-4 px-4 py-3 hover:bg-white/5 rounded-xl transition-colors text-left group"
                  >
                    <span className="text-text-tertiary group-hover:theme-text">{op.icon}</span>
                    <span className="text-sm font-bold text-text-secondary group-hover:text-text-primary">{op.label}</span>
                  </button>
                ))}
              </div>
              <div className="p-3 border-t border-white/5 bg-black/20 flex justify-between items-center text-[9px] text-text-dim font-black uppercase tracking-widest">
                <div className="flex items-center gap-2">
                   <span className="px-1.5 py-0.5 bg-white/5 rounded border border-white/10 text-white">ESC</span> to Close
                </div>
                <div className="flex items-center gap-2">
                   Power Sourcer Mode <Sparkles size={10} className="theme-text" />
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <CallInterface 
        isOpen={!!activeLeadForCall} 
        onClose={() => setActiveLeadForCall(null)} 
        lead={activeLeadForCall} 
      />

      {showWendyLab && (
        <WendyLab 
          onClose={() => setShowWendyLab(false)} 
        />
      )}

      {strategicPanel && (
        <StrategicIntelligencePanel 
          type={strategicPanel.type}
          params={strategicPanel.params}
          onClose={() => setStrategicPanel(null)}
        />
      )}

      {liveFeedLeads && (
        <LiveSourcingFeed 
          leads={liveFeedLeads} 
          onClose={() => setLiveFeedLeads(null)} 
          onDraftPitch={(leadId) => {
             setActiveTab('leads');
             setSearchQuery(leadId);
             setLiveFeedLeads(null);
          }}
        />
      )}

      {/* Refined Dynamic Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-acc-gold/5 rounded-full blur-[160px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-acc-blue/5 rounded-full blur-[160px]" />
      </div>

      {/* Sticky Neural Header */}
      <header className="sticky top-0 z-[100] w-full bg-black/80 backdrop-blur-3xl border-b border-white/5 shadow-2xl">
        <div className="max-w-7xl mx-auto px-4 h-14 sm:h-20 flex items-center justify-between">
          <div className="flex items-center space-x-2 sm:space-x-4">
             <div className="w-7 h-7 sm:w-8 h-8 bg-white text-black flex items-center justify-center rounded-lg sm:rounded-xl shadow-[0_0_20px_rgba(255,255,255,0.2)] shrink-0">
                <Zap size={14} className="sm:w-4 sm:h-4" />
             </div>
             <div className="flex flex-col min-w-0">
                <h1 className="text-xs sm:text-base font-black tracking-[0.2em] sm:tracking-[0.3em] text-white truncate">WENDY</h1>
                <span className="text-[7px] sm:text-[8px] font-black uppercase tracking-widest text-text-tertiary hidden xs:block sm:block truncate">Neural Lead Sourcer</span>
             </div>
          </div>

          <nav id="tour-nav" className="hidden lg:flex items-center space-x-1">
            <HeaderNavTab 
              id="tour-nav-dashboard"
              icon={<LayoutDashboard size={16} />} 
              label="Intelligence" 
              active={activeTab === 'dashboard'} 
              onClick={() => {
                setActiveTab('dashboard');
                logInteraction(InteractionType.TAB_SWITCH, 'dashboard');
              }} 
            />
            <HeaderNavTab 
              id="tour-vault-btn"
              icon={<Users size={16} />} 
              label="The Vault" 
              active={activeTab === 'leads'} 
              onClick={() => {
                setActiveTab('leads');
                logInteraction(InteractionType.TAB_SWITCH, 'leads');
              }} 
            />
            <HeaderNavTab 
              icon={<Calendar size={16} />} 
              label="The Diary" 
              active={activeTab === 'diary'} 
              onClick={() => {
                setActiveTab('diary');
                logInteraction(InteractionType.TAB_SWITCH, 'diary');
              }} 
            />
          </nav>

          <div className="flex items-center space-x-4">
             <div className="hidden sm:flex items-center space-x-3 bg-white/5 rounded-full px-3 py-1 border border-white/10">
                <div className={cn("w-1.5 h-1.5 rounded-full", isThinking ? "bg-acc-gold animate-pulse" : "bg-emerald-500")} />
                <span className="text-[9px] font-black uppercase tracking-widest text-text-secondary truncate max-w-[120px]">
                  {statusMessage}
                </span>
             </div>
             
             <button 
               onClick={() => setShowMobileMenu(!showMobileMenu)}
               className="lg:hidden p-2 rounded-xl bg-white/5 text-text-tertiary hover:text-white transition-all"
             >
                {showMobileMenu ? <X size={20} /> : <Menu size={20} />}
             </button>

             <div className="hidden lg:flex items-center space-x-4">
               <button 
                 onClick={() => setShowWendyLab(true)}
                 className="p-2 rounded-xl text-text-tertiary hover:bg-white/5 hover:text-text-primary transition-all group"
                 title="Wendy Prompt Lab"
               >
                  <Bot size={18} />
               </button>
               <button 
                 onClick={toggleFullscreen}
                 className="p-2 rounded-xl text-text-tertiary hover:bg-white/5 hover:text-text-primary transition-all group"
                 title="Toggle Fullscreen"
               >
                  {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
               </button>
               <button 
                 onClick={handleLogout}
                 className="p-2 rounded-xl text-text-tertiary hover:bg-white/5 hover:text-text-primary transition-all group"
               >
                  <LogOut size={18} />
               </button>
               
               <div className="w-8 h-8 rounded-xl border border-white/10 p-0.5 overflow-hidden group hover:border-acc-gold/50 transition-colors cursor-pointer">
                  <img 
                    src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user.email}`} 
                    alt="Avatar" 
                    className="w-full h-full rounded-xl object-cover grayscale group-hover:grayscale-0 transition-all"
                  />
               </div>
             </div>
          </div>
        </div>
      </header>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {showMobileMenu && (
          <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-0 top-16 z-[90] lg:hidden bg-black/95 backdrop-blur-2xl"
          >
            <div className="flex flex-col p-6 space-y-8">
               <div className="space-y-2">
                 <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-text-tertiary px-4">Navigation</h3>
                 <div className="grid grid-cols-1 gap-2">
                    <MobileNavTab 
                      icon={<LayoutDashboard size={20} />} 
                      label="Dashboard" 
                      active={activeTab === 'dashboard'} 
                      onClick={() => { 
                        setActiveTab('dashboard'); 
                        setShowMobileMenu(false); 
                        logInteraction(InteractionType.TAB_SWITCH, 'dashboard');
                      }} 
                    />
                    <MobileNavTab 
                      icon={<Users size={20} />} 
                      label="Lead Vault" 
                      active={activeTab === 'leads'} 
                      onClick={() => { 
                        setActiveTab('leads'); 
                        setShowMobileMenu(false); 
                        logInteraction(InteractionType.TAB_SWITCH, 'leads');
                      }} 
                    />
                    <MobileNavTab 
                      icon={<Calendar size={20} />} 
                      label="Strategic Diary" 
                      active={activeTab === 'diary'} 
                      onClick={() => { 
                        setActiveTab('diary'); 
                        setShowMobileMenu(false); 
                        logInteraction(InteractionType.TAB_SWITCH, 'diary');
                      }} 
                    />
                 </div>
               </div>

               <div className="space-y-4">
                 <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-text-tertiary px-4">Operations</h3>
                 <div className="grid grid-cols-1 gap-4">
                    <button 
                      onClick={() => {
                        setShowMobileMenu(false);
                        window.dispatchEvent(new CustomEvent('wendy-action', { 
                          detail: { name: 'deep_scrape_triggered', args: { context: magazineContext } } 
                        }));
                        // Also open modal if we're on dashboard
                        if (activeTab === 'dashboard') {
                           // Triggering a global event to show modal since setShowCompetitorModal is local to Dashboard
                           window.dispatchEvent(new CustomEvent('app-ui-trigger', { detail: { type: 'show_competitor_modal' } }));
                        }
                      }}
                      className="w-full py-4 bg-white text-black rounded-2xl font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-3"
                    >
                       <Zap size={14} />
                       Scrape Competitors
                    </button>
                    <button 
                      onClick={() => {
                        setShowMobileMenu(false);
                        window.dispatchEvent(new CustomEvent('wendy-action', { 
                          detail: { name: 'plan_strike_list', args: { context: magazineContext } } 
                        }));
                        setActiveTab('diary');
                        logInteraction(InteractionType.TAB_SWITCH, 'diary');
                      }}
                      className="w-full py-4 bg-white/5 border border-white/10 rounded-2xl font-black uppercase tracking-widest text-[10px] text-text-muted flex items-center justify-center gap-3"
                    >
                       <Calendar size={14} />
                       Plan Today's Strike List
                    </button>
                    <button 
                      onClick={handleLogout}
                      className="w-full py-4 bg-white/5 border border-white/10 rounded-2xl font-black uppercase tracking-widest text-[10px] text-text-muted flex items-center justify-center gap-3"
                    >
                       <LogOut size={14} />
                       Sign Out
                    </button>
                 </div>
               </div>

               <div className="pt-12 flex flex-col items-center">
                  <div className="w-20 h-20 rounded-full bg-acc-gold/10 flex items-center justify-center shadow-[0_0_50px_rgba(212,175,55,0.1)] mb-4">
                     <Zap size={32} className="text-acc-gold" />
                  </div>
                  <p className="text-center text-xs text-text-tertiary max-w-[200px] font-light leading-relaxed">
                    WENDY is active. Secure high-tier strategic PA protocol engaged.
                  </p>
               </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      <GlobalCallReminder />
      <OnboardingTour />

      {/* Main Content Area */}
      <main className="pt-6 sm:pt-12 md:pt-16 px-4 sm:px-6 md:px-12 lg:px-20 w-full pb-48 relative z-10 max-w-7xl mx-auto">
        {/* Magazine Context Switcher */}
        <div id="tour-magazine-switcher" className="flex justify-start sm:justify-center mb-8 sm:mb-12 overflow-x-auto pb-4 sm:pb-0 scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0">
          <div className="inline-flex items-center space-x-2 sm:space-x-4 glass-panel border border-white/5 p-1.5 rounded-2xl sm:rounded-[2rem] shrink-0">
            {(['All', 'Black Business Quarterly', 'Harvest SA', 'Leadership Magazine'] as const).map(pub => (
              <button
                key={pub}
                onClick={() => {
                  setMagazineContext(pub);
                  setLastNotification({ message: `Switched focus to ${pub}`, type: 'success' });
                  logInteraction(InteractionType.CONTEXT_SWITCH, pub);
                }}
                className={cn(
                  "relative px-4 sm:px-8 py-2.5 sm:py-3.5 rounded-xl sm:rounded-[1.5rem] text-[10px] sm:text-[11px] font-black uppercase tracking-widest transition-all whitespace-nowrap overflow-hidden group",
                  magazineContext === pub 
                    ? "bg-white text-black shadow-2xl scale-[1.02]" 
                    : "text-text-tertiary hover:text-text-primary hover:bg-white/5",
                  isSwitching && magazineContext === pub && "animate-pulse"
                )}
              >
                <div className="relative z-10 flex items-center gap-2">
                  {pub}
                  {pub !== 'All' && magazineSignals[pub] > 0 && (
                    <span className={cn(
                      "flex h-4 w-4 sm:h-5 sm:w-5 items-center justify-center rounded-full text-[8px] sm:text-[9px] font-bold text-white",
                      pub === 'Black Business Quarterly' ? "bg-acc-gold" : 
                      pub === 'Harvest SA' ? "bg-acc-green" : "bg-acc-blue"
                    )}>
                      {magazineSignals[pub]}
                    </span>
                  )}
                </div>
                {magazineContext === pub && (
                  <motion.div 
                    layoutId="magazine-glow"
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer"
                  />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Global KPI Strip - Strategic Overview */}
        <div id="tour-kpis" className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-8 mb-12 sm:mb-20 px-4 sm:px-8 py-6 sm:py-10 glass-panel border border-white/5 rounded-2xl sm:rounded-[2.5rem] shadow-2xl">
           <GlobalKpiItem label="Huddle Score" value={userKpis.huddleScore} icon={<TrendingUp size={18} className="text-acc-gold" />} suffix="%" />
           <GlobalKpiItem label="Market Nodes" value={userKpis.marketNodes} icon={<Users size={18} className="text-white" />} />
           <GlobalKpiItem label="Comms Syncs" value={userKpis.commsSyncs} icon={<PhoneCall size={18} className="text-white" />} />
           <GlobalKpiItem label="Forecasted" value={userKpis.forecasted} icon={<Zap size={18} className="text-acc-gold" />} prefix="R" suffix="k" />
        </div>

        <motion.div
           key={activeTab}
           initial={{ opacity: 0, y: 20 }}
           animate={{ opacity: 1, y: 0 }}
           transition={{ duration: 0.5, ease: "easeOut" }}
        >
          {activeTab === 'dashboard' ? (
            <Dashboard magazineContext={magazineContext} />
          ) : activeTab === 'diary' ? (
            <Diary />
          ) : (
            <LeadList 
              initialPublication={(activeFilter as PublicationType | 'All') || "All"} 
              initialSearchQuery={searchQuery || ""}
              magazineContext={magazineContext}
            />
          )}
        </motion.div>
      </main>

      {/* The Omni-Bar (Floating Bottom Navigation & Command) */}
      <div id="tour-omni-bar" className="fixed bottom-4 sm:bottom-10 left-1/2 -translate-x-1/2 z-[100] w-full max-w-2xl px-4 sm:px-6">
          <motion.div 
            layout
            className="glass-panel p-2 rounded-2xl shadow-lg border border-border-subtle flex items-center gap-3 sm:gap-4 pr-4 sm:pr-6"
          >
             <button 
               onClick={() => {
                 setShowAISidebar(true);
                 if (!liveSession.active && !liveSession.connecting) {
                   toggleLiveVoice();
                 }
               }}
               className="w-10 h-10 sm:w-12 sm:h-12 bg-acc-pink text-white rounded-xl flex items-center justify-center hover:scale-105 transition-transform active:scale-95 shrink-0 shadow-[0_0_20px_rgba(236,72,153,0.3)]"
             >
                <div className="relative">
                  <Mic className="w-5 h-5 sm:w-6 sm:h-6" />
                  <motion.div 
                    animate={{ scale: [1, 1.3, 1], opacity: [0.1, 0, 0.1] }}
                    transition={{ repeat: Infinity, duration: 2 }}
                    className="absolute inset-0 bg-white rounded-xl"
                  />
                </div>
             </button>

             <div className="flex-1 relative">
                <input 
                  type="text" 
                  value={omniInput}
                  onChange={(e) => setOmniInput(e.target.value)}
                  placeholder="Ask WENDY to source, brief or pitch..."
                  className="w-full bg-transparent border-none py-3 px-2 text-sm focus:outline-none transition-all text-text-primary placeholder:text-text-tertiary font-sans font-medium"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && omniInput.trim()) {
                      setShowAISidebar(true);
                      setOmniInput('');
                    }
                  }}
                />
             </div>

             <div className="hidden sm:flex items-center space-x-2">
                <div className="p-1.5 bg-bg-glass-high rounded border border-border-subtle flex items-center justify-center">
                   <Command size={14} className="text-text-secondary" />
                </div>
                <span className="text-xs font-semibold text-text-secondary">K</span>
             </div>
          </motion.div>
      </div>

      {/* Global Status HUD */}
      <div className="fixed bottom-6 right-6 z-40 hidden xl:block">
         <div className="bg-bg-glass-high px-4 py-3 rounded-lg flex items-center space-x-4 border border-border-subtle">
            <div className="flex items-center space-x-3">
               <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
               <span className="text-[10px] font-semibold uppercase tracking-widest text-text-secondary">System Ready</span>
            </div>
            <div className="w-[1px] h-4 bg-border-subtle" />
            <div className="flex items-center space-x-3">
               <Activity className="text-text-primary" size={14} />
               <span className="text-[10px] font-semibold uppercase tracking-widest text-text-secondary">High Priority</span>
            </div>
         </div>
      </div>

      {/* AI Assistant Overlay */}
      <AnimatePresence>
        {showAISidebar && (
          <AIAssistant 
        isOpen={showAISidebar} 
        onClose={() => setShowAISidebar(false)} 
        magazineContext={magazineContext} 
        liveSession={liveSession} 
        toggleLiveVoice={toggleLiveVoice} 
      />
        )}
      </AnimatePresence>

      <WendyOrb 
        magazineContext={magazineContext} 
        liveSession={liveSession} 
        toggleLiveVoice={toggleLiveVoice} 
      />

      {/* Wendy Notification HUD (Proactive Alert) */}
      <AnimatePresence>
        {lastNotification && (
          <motion.div 
            initial={{ opacity: 0, y: -20, x: '100%' }}
            animate={{ opacity: 1, y: 0, x: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className={cn(
              "fixed top-28 right-6 z-[120] w-[320px] bg-bg-glass-high rounded-xl p-4 shadow-lg flex items-center gap-4 border-l-4",
              lastNotification.type === 'alert' ? "border-text-primary" : "border-emerald-500"
            )}
          >
            <div className={cn(
              "w-10 h-10 rounded-lg flex items-center justify-center shrink-0 border border-border-subtle",
              lastNotification.type === 'alert' ? "bg-bg-element text-text-primary" : "bg-emerald-500/10 text-emerald-500"
            )}>
              <div className="relative">
                <Activity size={20} />
              </div>
            </div>
            
            <div className="flex-1 min-w-0">
               <h6 className="text-[10px] font-semibold uppercase tracking-widest text-text-secondary mb-0.5">Alert Triggered</h6>
               <p className="text-sm text-text-primary text-bold truncate font-medium">{lastNotification.message}</p>
            </div>

            <button 
              onClick={() => {
                if (lastNotification.type === 'alert') setActiveTab('leads');
                setLastNotification(null);
              }}
              className="px-3 py-1.5 btn-outline text-xs bg-bg-deep"
            >
              Solve
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Wendy Conversation Pane (Journal Journey 6) */}
      <AnimatePresence>
        {showConversationPane && (
          <motion.div 
            initial={{ x: '100%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0 }}
            className="fixed inset-y-0 right-0 w-full sm:w-[450px] z-[150] bg-bg-deep border-l border-border-subtle shadow-2xl p-0 flex flex-col"
          >
             <div className="p-6 border-b border-border-subtle flex items-center justify-between">
                <div className="flex items-center space-x-4">
                   <div className="w-10 h-10 rounded-lg bg-bg-glass-high border border-border-subtle flex items-center justify-center">
                      <Bot className="text-text-primary" size={20} />
                   </div>
                   <div>
                      <h3 className="text-lg font-semibold text-text-primary">Conversation</h3>
                      <p className="text-[10px] font-semibold uppercase tracking-widest text-text-secondary mt-0.5">Live Intelligence Link</p>
                   </div>
                </div>
                <button 
                  onClick={() => setShowConversationPane(false)}
                  className="w-10 h-10 rounded-full hover:bg-bg-glass-high transition-colors flex items-center justify-center text-text-secondary hover:text-text-primary"
                >
                   <X size={20} />
                </button>
             </div>

             <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {conversationItems.map((item, i) => (
                   <motion.div 
                     key={i}
                     initial={{ opacity: 0, y: 10 }}
                     animate={{ opacity: 1, y: 0 }}
                     className={cn(
                       "flex flex-col space-y-2",
                       item.role === 'user' ? "items-end" : "items-start"
                     )}
                   >
                      <div className={cn(
                         "max-w-[85%] p-4 rounded-xl",
                         item.role === 'user' 
                           ? "bg-text-primary text-bg-deep font-medium" 
                           : "bg-bg-glass-high border border-border-subtle"
                      )}>
                         {item.type === 'prep' ? (
                            <div className="space-y-6">
                               <div className="flex items-center space-x-2 border-b border-border-subtle pb-3">
                                  <Sparkles className="text-emerald-500" size={14} />
                                  <span className="text-xs font-semibold tracking-widest text-text-primary uppercase">Smart Brief: John Deere</span>
                               </div>
                               <div className="space-y-4">
                                  <section>
                                     <h5 className="text-[10px] font-semibold uppercase text-text-tertiary tracking-widest mb-2">Key Points</h5>
                                     <ul className="space-y-2">
                                        <li className="flex items-start gap-3">
                                           <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                                           <p className="text-sm leading-relaxed text-text-secondary">Focus on their new <span className="text-text-primary font-semibold">ESG initiative</span> featured in Farmer's Weekly.</p>
                                        </li>
                                        <li className="flex items-start gap-3">
                                           <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                                           <p className="text-sm leading-relaxed text-text-secondary">Competitor (Massey Ferguson) just launched a budget cut campaign.</p>
                                        </li>
                                     </ul>
                                  </section>
                                  <section>
                                     <h5 className="text-[10px] font-semibold uppercase text-text-tertiary tracking-widest mb-2">Suggested Opener</h5>
                                     <div className="p-3 bg-bg-deep rounded-lg border border-border-subtle text-sm leading-relaxed text-text-secondary italic">
                                        "Sarah, I saw the John Deere sustainability piece in the Agri-Tech roundup—the pivot toward drone-led coverage is bold."
                                     </div>
                                  </section>
                               </div>
                            </div>
                         ) : (
                            <p className="text-sm leading-relaxed text-text-secondary">{item.content}</p>
                         )}
                      </div>
                   </motion.div>
                ))}
             </div>

             <div className="p-6 border-t border-border-subtle space-y-3">
                <div className="flex gap-2">
                   <button className="flex-1 py-2 btn-outline text-xs">
                      Summarize
                   </button>
                   <button className="flex-1 py-2 btn-outline text-xs">
                      Draft Email
                   </button>
                </div>
                <div className="relative group">
                   <input 
                     placeholder="Type or speak to WENDY..."
                     className="w-full bg-bg-deep border border-border-subtle rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-text-dim transition-all text-text-primary placeholder:text-text-tertiary"
                   />
                   <div className="absolute right-3 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-primary cursor-pointer transition-colors">
                      <Mic size={18} />
                   </div>
                </div>
             </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function GlobalKpiItem({ label, value, icon, prefix, suffix }: { label: string, value: string, icon: React.ReactNode, prefix?: string, suffix?: string }) {
  return (
    <div className="flex flex-col items-center sm:items-start space-y-2 sm:space-y-4 group cursor-default" title={`View details for ${label}`}>
      <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-white/5 flex items-center justify-center border border-white/5 group-hover:border-acc-gold/50 transition-all duration-500 overflow-hidden shadow-inner shrink-0">
        <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent" />
        <div className="relative z-10">{icon}</div>
      </div>
      <div className="text-center sm:text-left min-w-0 w-full">
        <div className="text-[8px] sm:text-[10px] font-black uppercase tracking-[0.2em] sm:tracking-[0.3em] text-text-tertiary mb-0.5 sm:mb-1 truncate">{label}</div>
        <div className="text-xl sm:text-3xl font-black text-text-primary flex items-baseline justify-center sm:justify-start truncate">
           {prefix && <span className="text-text-tertiary text-sm sm:text-lg font-light mr-0.5 sm:mr-1">{prefix}</span>}
           {value}
           {suffix && <span className="text-text-tertiary text-sm sm:text-lg font-light ml-0.5 sm:mr-1">{suffix}</span>}
        </div>
      </div>
    </div>
  );
}

function MobileNavTab({ icon, label, active, onClick }: { icon: React.ReactNode, label: string, active: boolean, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "flex items-center space-x-4 w-full p-4 rounded-2xl transition-all duration-300",
        active 
          ? "bg-white/10 text-white" 
          : "text-text-tertiary hover:bg-white/5"
      )}
    >
      <div className={active ? "text-acc-gold" : "text-text-tertiary"}>
        {icon}
      </div>
      <span className="text-xs font-black uppercase tracking-widest">{label}</span>
    </button>
  );
}

function HeaderNavTab({ id, icon, label, active, onClick, title }: { id?: string, icon: React.ReactNode, label: string, active: boolean, onClick: () => void, title?: string }) {
  return (
    <button 
      id={id}
      onClick={onClick}
      title={title}
      className={cn(
        "flex flex-col items-center justify-center sm:flex-row sm:items-center space-y-1 sm:space-y-0 sm:space-x-3 px-3 py-2 sm:px-6 sm:py-3 rounded-2xl transition-all duration-300 relative group",
        active 
          ? "text-white" 
          : "text-text-tertiary hover:text-white"
      )}
    >
      <div className={cn("transition-all duration-500", active ? "scale-110" : "scale-100 opacity-60 group-hover:opacity-100")}>
        {icon}
      </div>
      <span className="text-[9px] sm:text-[11px] font-black uppercase tracking-[0.15em]">{label}</span>
      {active && (
        <motion.div 
          layoutId="header-active-pill"
          className="absolute inset-0 bg-white/5 rounded-2xl border border-white/10 -z-10"
          transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
        />
      )}
    </button>
  );
}
