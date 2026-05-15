import React, { useState } from 'react';
import { CollectionReference, collection, addDoc } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { PublicationType, LeadStatus } from '../types';
import { X, Globe, Search, Loader2, Target } from 'lucide-react';
import { handleFirestoreError, OperationType } from '../lib/utils';

interface SourceLeadsModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetPublication: PublicationType | 'All';
}

const COMPETITOR_SOURCES: Record<string, string[]> = {
  'Harvest SA': ['Farmers Weekly', 'Landbouweekblad', 'Food For Mzansi', 'African Farming', 'Farmers Magazine'],
  'Black Business Quarterly': ['African Decisions', 'Business Brief', 'Entrepreneur SA', 'Financial Mail', 'Forbes Africa', 'African Leader'],
  'Leadership Magazine': ['Financial Mail', 'Forbes Africa', 'BusinessTech', 'Daily Investor', 'CEO Magazine']
};

export default function SourceLeadsModal({ isOpen, onClose, targetPublication }: SourceLeadsModalProps) {
  const [selectedPublication, setSelectedPublication] = useState<PublicationType | ''>(
    targetPublication !== 'All' ? targetPublication : ''
  );
  const [selectedSource, setSelectedSource] = useState<string>('');
  const [isScraping, setIsScraping] = useState(false);
  const [error, setError] = useState('');
  
  // Reset when modal opens/closes or targetPublication changes
  React.useEffect(() => {
    if (isOpen) {
      setSelectedPublication(targetPublication !== 'All' ? targetPublication : '');
      setSelectedSource('');
      setError('');
    }
  }, [isOpen, targetPublication]);

  if (!isOpen) return null;
  
  const sources = selectedPublication ? (COMPETITOR_SOURCES[selectedPublication] || []) : [];

  const handleSource = async () => {
    if (!selectedPublication) {
      setError('Please select a target publication first');
      return;
    }
    if (!selectedSource) {
      setError('Please select a competitor source first');
      return;
    }

    let finalSource = selectedSource;
    if (selectedSource === 'custom') {
      const customInput = document.getElementById('custom-source-input') as HTMLInputElement;
      if (customInput && customInput.value.trim()) {
        finalSource = customInput.value.trim();
      } else {
         setError('Please enter a custom competitor name');
         return;
      }
    }
    
    setIsScraping(true);
    setError('');
    
    const updateStatus = (message: string, thinking: boolean) => {
      window.dispatchEvent(new CustomEvent('wendy-action', { 
        detail: { name: 'update_status', args: { message, isThinking: thinking } } 
      }));
    };

    updateStatus(`Wendy is scanning ${finalSource}...`, true);
    
    if (!auth.currentUser) {
      setError('You must be logged in to source leads');
      return;
    }
    
    try {
      const response = await fetch('/api/source-leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          publication: targetPublication,
          userId: auth.currentUser?.uid || 'system'
        })
      });
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.message || 'Scraping failed');
      }

      updateStatus(`✅ Synced market signals!`, false);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error syncing leads');
    } finally {
      setIsScraping(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-bg-deep/80 backdrop-blur-sm p-4">
      <div className="bg-bg-panel border border-border-subtle rounded-xl w-full max-w-lg shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-border-subtle">
           <div className="min-w-0">
             <h3 className="font-serif italic text-xl sm:text-2xl text-text-primary">Source Competitor Leads</h3>
             <p className="font-sans text-[8px] sm:text-[10px] uppercase tracking-[0.2em] text-text-muted mt-1 sm:mt-1.5 font-black">Intercepting competitors</p>
           </div>
           <button onClick={onClose} className="text-text-muted hover:text-text-primary transition-colors p-1 shrink-0">
             <X size={18} className="sm:w-5 sm:h-5" />
           </button>
        </div>
        
        <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
           {error && (
             <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-2 sm:p-3 rounded font-mono text-[10px] sm:text-xs">
               {error}
             </div>
           )}
           
           <div className="space-y-4 sm:space-y-6">
             {targetPublication === 'All' && (
               <div className="space-y-1.5 sm:space-y-2">
                 <label className="font-sans text-[10px] uppercase tracking-[0.2em] text-text-muted font-black opacity-80">Target Internal Publication</label>
                 <div className="relative">
                   <select
                     value={selectedPublication}
                     onChange={(e) => {
                       setSelectedPublication(e.target.value as PublicationType);
                       setSelectedSource('');
                     }}
                     className="w-full appearance-none bg-bg-element border border-border-subtle rounded-lg sm:rounded-xl py-2.5 sm:py-3 px-3 sm:px-4 text-text-primary text-xs sm:text-sm focus:outline-none focus:border-acc-gold/50 transition-colors"
                   >
                     <option value="" disabled>Choose your magazine...</option>
                     {Object.keys(COMPETITOR_SOURCES).map(pub => (
                       <option key={pub} value={pub}>{pub}</option>
                     ))}
                   </select>
                   <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-text-muted">
                     <Target size={14} className="sm:w-4 sm:h-4" />
                   </div>
                 </div>
               </div>
             )}

             <div className="space-y-1.5 sm:space-y-2">
               <label className="font-sans text-[10px] uppercase tracking-[0.2em] text-text-muted font-black opacity-80">Select Competitor Magazine</label>
               <div className="relative">
                 <select
                   value={selectedSource}
                   onChange={(e) => setSelectedSource(e.target.value)}
                   className="w-full appearance-none bg-bg-element border border-border-subtle rounded-lg sm:rounded-xl py-2.5 sm:py-3 px-3 sm:px-4 text-text-primary text-xs sm:text-sm focus:outline-none focus:border-acc-gold/50 transition-colors"
                 >
                   <option value="" disabled>Choose source...</option>
                   {sources.map(source => (
                     <option key={source} value={source}>{source}</option>
                   ))}
                   <option value="custom">Other (Custom Source)</option>
                 </select>
                 <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-text-muted">
                   <Globe size={14} className="sm:w-4 sm:h-4" />
                 </div>
               </div>
             </div>

             {selectedSource === 'custom' && (
               <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                 <label className="font-sans text-xs uppercase tracking-widest text-text-muted font-bold">Custom Competitor Name</label>
                 <input
                   type="text"
                   id="custom-source-input"
                   placeholder="e.g. Industry Specific Journal"
                   className="w-full bg-bg-element border border-border-subtle rounded-lg py-3 px-4 text-text-primary text-sm focus:outline-none focus:border-acc-gold/50 focus:ring-1 focus:ring-acc-gold/50 transition-colors"
                 />
               </div>
             )}
           </div>
           
           <div className="pt-4 border-t border-border-subtle">
             <button
                onClick={handleSource}
                disabled={!selectedSource || isScraping}
                className="w-full py-3 sm:py-4 bg-acc-gold text-bg-deep rounded-lg sm:rounded-xl font-mono text-[10px] sm:text-xs uppercase tracking-[0.2em] font-black hover:brightness-110 shadow-xl shadow-acc-gold/20 disabled:opacity-50 transition-all flex items-center justify-center space-x-2 sm:space-x-3"
             >
                {isScraping ? (
                  <>
                     <Loader2 size={16} className="animate-spin" />
                     <span>Scraping {selectedSource}...</span>
                  </>
                ) : (
                  <>
                     <Search size={16} />
                     <span>Execute Deep Scrape</span>
                  </>
                )}
             </button>
             <p className="text-center font-mono text-[9px] text-text-dim uppercase tracking-widest mt-4">
                Will extract high-value targets via AI analysis
             </p>
           </div>
        </div>
      </div>
    </div>
  );
}
