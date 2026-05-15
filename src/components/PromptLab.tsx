import React, { useState, useEffect } from 'react';
import { X, Bot, Sparkles, Shield, Database, Settings, RefreshCw, Layers, Brain, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { collection, query, orderBy, limit, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { PromptVersion } from '../types';
import { cn } from '../lib/utils';

interface PromptLabProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function PromptLab({ isOpen, onClose }: PromptLabProps) {
  const [activeVersion, setActiveVersion] = useState<PromptVersion | null>(null);
  const [history, setHistory] = useState<PromptVersion[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const q = query(
      collection(db, 'prompt_versions'),
      orderBy('createdAt', 'desc'),
      limit(5)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const versions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PromptVersion));
      setHistory(versions);
      if (versions.length > 0 && !activeVersion) {
        setActiveVersion(versions[0]);
      } else if (versions.length === 0) {
        // Default initial version
        setActiveVersion({
          id: 'initial',
          role: 'Elite AI Sales Co-Pilot',
          instruction: 'Autonomously scrape competitor media platforms in South Africa...',
          guardrails: 'Zero fluff, strict POPIA compliance for 2025-2026...',
          specifics: 'Focus on Leadership Magazine, Harvest SA, and BBQ...',
          triadFlags: { analyst: true, profiler: true, strategist: true },
          cotEnabled: true,
          createdBy: 'system',
          createdAt: new Date().toISOString()
        });
      }
    });

    return () => unsubscribe();
  }, []);

  const handleSave = async () => {
    if (!activeVersion || !auth.currentUser) return;
    setIsSaving(true);
    try {
      await addDoc(collection(db, 'prompt_versions'), {
        ...activeVersion,
        createdBy: auth.currentUser.uid,
        createdAt: serverTimestamp(),
      });
      window.dispatchEvent(new CustomEvent('wendy-notification', { 
        detail: { message: "Neural Logic Updated Successfully", type: 'success' } 
      }));
    } catch (error) {
      console.error('Failed to save prompt:', error);
    } finally {
      setIsSaving(false);
    }
  };

  if (!activeVersion) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-bg-deep/90 backdrop-blur-md"
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="w-full max-w-5xl h-[90vh] bg-bg-panel border border-white/5 rounded-[3rem] shadow-2xl overflow-hidden flex"
          >
            {/* Sidebar: History */}
            <div className="w-64 border-r border-white/5 bg-white/[0.01] flex flex-col">
              <div className="p-8 border-b border-white/5">
                <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-acc-gold">Neural History</h4>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {history.map((v) => (
                  <button
                    key={v.id}
                    onClick={() => setActiveVersion(v)}
                    className={cn(
                      "w-full p-4 rounded-2xl text-left transition-all group",
                      activeVersion.id === v.id ? "bg-white/5 border border-white/10" : "hover:bg-white/[0.02]"
                    )}
                  >
                    <div className="text-xs font-bold text-white mb-1">v.{v.id.slice(0, 4)}</div>
                    <div className="text-[10px] text-text-tertiary truncate">{v.role}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col">
              <header className="p-8 border-b border-white/5 flex justify-between items-center">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-acc-gold/10 rounded-2xl">
                    <Brain className="text-acc-gold" size={24} />
                  </div>
                  <div>
                    <h3 className="text-2xl font-serif italic text-white">Wendy Prompt Lab</h3>
                    <p className="text-[10px] uppercase tracking-widest text-text-tertiary font-bold mt-1">Configure System Architecture & RIGS Parameters</p>
                  </div>
                </div>
                <button onClick={onClose} className="p-2 text-text-muted hover:text-white transition-colors">
                  <X size={24} />
                </button>
              </header>

              <div className="flex-1 overflow-y-auto p-8 space-y-12">
                {/* Triad of Experts */}
                <section className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-black uppercase tracking-[0.2em] text-white flex items-center gap-3">
                      <Layers size={16} className="text-acc-gold" /> Triad of Experts Framework
                    </h4>
                    <div className="flex items-center gap-4">
                      <span className="text-[10px] font-mono text-text-tertiary uppercase">Inference Mode: Parallel</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-6">
                    {(['analyst', 'profiler', 'strategist'] as const).map(expert => (
                      <button
                        key={expert}
                        onClick={() => setActiveVersion({
                          ...activeVersion,
                          triadFlags: { ...activeVersion.triadFlags, [expert]: !activeVersion.triadFlags[expert] }
                        })}
                        className={cn(
                          "p-6 rounded-[2rem] border transition-all text-left group",
                          activeVersion.triadFlags[expert] 
                            ? "bg-acc-gold/10 border-acc-gold/50 shadow-lg shadow-acc-gold/5" 
                            : "bg-white/[0.02] border-white/5 opacity-50 grayscale hover:grayscale-0 hover:opacity-100"
                        )}
                      >
                        <Bot className={cn("mb-4 transition-colors", activeVersion.triadFlags[expert] ? "text-acc-gold" : "text-text-muted")} />
                        <div className="text-sm font-bold text-white uppercase tracking-widest mb-2">{expert}</div>
                        <p className="text-[10px] text-text-tertiary leading-relaxed">
                          {expert === 'analyst' && 'Market mapping & spend analysis focus.'}
                          {expert === 'profiler' && 'Behavioral profiling & objection handling.'}
                          {expert === 'strategist' && 'FAB pitch & editorial alignment logic.'}
                        </p>
                      </button>
                    ))}
                  </div>
                </section>

                {/* RIGS Components */}
                <section className="space-y-8">
                  <div className="grid grid-cols-2 gap-8">
                    <div className="space-y-4">
                      <label className="text-[10px] font-black uppercase tracking-widest text-text-tertiary">Role (The Persona)</label>
                      <textarea 
                        value={activeVersion.role}
                        onChange={(e) => setActiveVersion({ ...activeVersion, role: e.target.value })}
                        className="w-full bg-white/[0.02] border border-white/5 rounded-2xl p-4 text-sm text-white h-24 focus:border-acc-gold transition-all"
                      />
                    </div>
                    <div className="space-y-4">
                      <label className="text-[10px] font-black uppercase tracking-widest text-text-tertiary">Instructions (The Core Task)</label>
                      <textarea 
                        value={activeVersion.instruction}
                        onChange={(e) => setActiveVersion({ ...activeVersion, instruction: e.target.value })}
                        className="w-full bg-white/[0.02] border border-white/5 rounded-2xl p-4 text-sm text-white h-24 focus:border-acc-gold transition-all"
                      />
                    </div>
                    <div className="space-y-4">
                      <label className="text-[10px] font-black uppercase tracking-widest text-text-tertiary">Guardrails (The Boundaries)</label>
                      <textarea 
                        value={activeVersion.guardrails}
                        onChange={(e) => setActiveVersion({ ...activeVersion, guardrails: e.target.value })}
                        className="w-full bg-white/[0.02] border border-white/5 rounded-2xl p-4 text-sm text-white h-24 focus:border-acc-gold transition-all"
                      />
                    </div>
                    <div className="space-y-4">
                      <label className="text-[10px] font-black uppercase tracking-widest text-text-tertiary">Specifics (The Context)</label>
                      <textarea 
                        value={activeVersion.specifics}
                        onChange={(e) => setActiveVersion({ ...activeVersion, specifics: e.target.value })}
                        className="w-full bg-white/[0.02] border border-white/5 rounded-2xl p-4 text-sm text-white h-24 focus:border-acc-gold transition-all"
                      />
                    </div>
                  </div>
                </section>

                {/* Advanced Settings */}
                <section className="bg-white/[0.02] border border-white/5 rounded-[2.5rem] p-8 space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-white flex items-center gap-2">
                        <Zap size={16} className="text-acc-gold" /> Chain-of-Thought Reasoning
                      </h4>
                      <p className="text-[10px] text-text-tertiary mt-1">Force Wendy to output self-correction and reasoning traces.</p>
                    </div>
                    <button
                      onClick={() => setActiveVersion({ ...activeVersion, cotEnabled: !activeVersion.cotEnabled })}
                      className={cn(
                        "w-12 h-6 rounded-full transition-all relative",
                        activeVersion.cotEnabled ? "bg-acc-gold" : "bg-white/10"
                      )}
                    >
                      <div className={cn(
                        "absolute top-1 w-4 h-4 rounded-full bg-white transition-all",
                        activeVersion.cotEnabled ? "left-7" : "left-1"
                      )} />
                    </button>
                  </div>
                </section>
              </div>

              <footer className="p-8 border-t border-white/5 bg-white/[0.01] flex justify-between items-center text-xs">
                <div className="text-text-tertiary flex items-center gap-4">
                  <span className="flex items-center gap-2"><Shield size={12} /> POPIA 2026 Compliant</span>
                  <span className="flex items-center gap-2"><Settings size={12} /> Auto-Sync Active</span>
                </div>
                <button 
                  onClick={handleSave}
                  disabled={isSaving}
                  className="px-8 py-3 bg-white text-black rounded-xl font-black uppercase tracking-widest flex items-center gap-3 hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
                >
                  <RefreshCw size={14} className={isSaving ? "animate-spin" : ""} />
                  Deploy Model Updates
                </button>
              </footer>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
