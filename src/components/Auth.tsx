import React, { useState } from 'react';
import { 
  signInWithPopup, 
  GoogleAuthProvider 
} from 'firebase/auth';
import { auth } from '../lib/firebase';
import { Zap, Globe } from 'lucide-react';
import { motion } from 'motion/react';

export default function Auth() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg-deep flex items-center justify-center p-6 relative overflow-hidden">
      {/* Dynamic Background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-acc-gold/10 rounded-full blur-[150px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-500/10 rounded-full blur-[150px]" />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-panel max-w-md w-full p-12 rounded-[2.5rem] border border-acc-gold/20 relative z-10 shadow-2xl text-center"
      >
        <div className="w-20 h-20 bg-acc-gold flex items-center justify-center rounded-2xl shadow-[0_0_40px_rgba(212,175,55,0.4)] mx-auto mb-10">
          <Zap className="text-bg-deep" size={40} />
        </div>

        <h1 className="text-5xl font-serif italic tracking-tight text-text-primary mb-4">Terrence's <span className="text-text-muted">PA</span></h1>
        <p className="text-text-muted text-sm leading-relaxed mb-12">
          Your Strategic Intelligence Node for <br/> 
          High-Value Media Sales & Acquisition.
        </p>

        <div className="space-y-6">
          <button 
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full bg-acc-gold text-bg-deep font-mono text-[10px] uppercase font-bold tracking-[0.2em] py-5 rounded-2xl hover:brightness-110 active:scale-[0.98] transition-all flex items-center justify-center space-x-3 shadow-[0_10px_30px_rgba(212,175,55,0.2)]"
          >
            {loading ? (
               <div className="w-5 h-5 border-2 border-bg-deep/30 border-t-bg-deep rounded-full animate-spin" />
            ) : (
               <>
                 <Globe size={18} />
                 <span>Strategic Entry (Google)</span>
               </>
            )}
          </button>

          {error && (
            <p className="text-red-400 text-[10px] font-mono font-bold uppercase tracking-widest bg-red-400/10 py-3 rounded-lg border border-red-400/20">
              {error}
            </p>
          )}
        </div>

        <div className="mt-12 flex items-center justify-center space-x-4 opacity-40">
           <div className="w-2 h-2 rounded-full bg-green-500" />
           <span className="text-[9px] font-mono uppercase tracking-[0.2em] font-bold">Node Ready</span>
        </div>
      </motion.div>
    </div>
  );
}
