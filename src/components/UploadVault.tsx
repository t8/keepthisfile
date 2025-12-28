import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UploadZone } from './UploadZone';
import { UploadProgress } from './UploadProgress';
import { FileText, Lock, ShieldCheck, RefreshCw } from 'lucide-react';
export function UploadVault() {
  const [status, setStatus] = useState<'idle' | 'uploading' | 'complete'>('idle');
  const [progress, setProgress] = useState(0);
  const [fileName, setFileName] = useState<string>('');
  const handleFileSelect = (file: File) => {
    setFileName(file.name);
    setStatus('uploading');
    // Simulate upload
    let p = 0;
    const interval = setInterval(() => {
      p += Math.random() * 5;
      if (p >= 100) {
        p = 100;
        clearInterval(interval);
        setStatus('complete');
      }
      setProgress(p);
    }, 100);
  };
  const resetUpload = () => {
    setStatus('idle');
    setProgress(0);
    setFileName('');
  };
  return <motion.div initial={{
    opacity: 0,
    y: 20
  }} animate={{
    opacity: 1,
    y: 0
  }} transition={{
    duration: 0.8,
    ease: 'easeOut'
  }} className="relative w-full max-w-2xl mx-auto">
      {/* Vault Container */}
      <div className="relative bg-white/80 backdrop-blur-xl rounded-2xl shadow-vault border border-white/50 overflow-hidden">
        {/* Header Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-white/50">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${status === 'complete' ? 'bg-neonGreen/10 text-neonGreen' : 'bg-neonPurple/10 text-neonPurple'}`}>
              {status === 'complete' ? <ShieldCheck size={20} /> : <Lock size={20} />}
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-wider text-gray-900 uppercase font-display">
                Digital Vault
              </h2>
              <p className="text-[10px] font-mono text-gray-400 tracking-widest">
                SECURE_UPLINK_V2.4
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <div className="w-2 h-2 rounded-full bg-red-400/30" />
            <div className="w-2 h-2 rounded-full bg-yellow-400/30" />
            <div className="w-2 h-2 rounded-full bg-green-400/30" />
          </div>
        </div>

        {/* Main Content Area */}
        <div className="p-8 min-h-[400px] flex flex-col justify-center">
          <AnimatePresence mode="wait">
            {status === 'idle' && <motion.div key="idle" initial={{
            opacity: 0,
            scale: 0.95
          }} animate={{
            opacity: 1,
            scale: 1
          }} exit={{
            opacity: 0,
            scale: 1.05,
            filter: 'blur(10px)'
          }} transition={{
            duration: 0.3
          }}>
                <UploadZone onFileSelect={handleFileSelect} />
              </motion.div>}

            {(status === 'uploading' || status === 'complete') && <motion.div key="process" initial={{
            opacity: 0
          }} animate={{
            opacity: 1
          }} className="space-y-8">
                {/* File Info Card */}
                <motion.div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl border border-gray-100" initial={{
              y: 20,
              opacity: 0
            }} animate={{
              y: 0,
              opacity: 1
            }} transition={{
              delay: 0.2
            }}>
                  <div className="p-3 bg-white rounded-lg shadow-sm text-neonPurple">
                    <FileText size={24} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate font-sans">
                      {fileName}
                    </p>
                    <p className="text-xs text-gray-500 font-mono">
                      {status === 'uploading' ? 'ENCRYPTING & SEALING...' : 'SECURELY STORED'}
                    </p>
                  </div>
                </motion.div>

                {/* Progress Animation */}
                <UploadProgress progress={progress} status={status} />

                {/* Success Actions */}
                {status === 'complete' && <motion.div initial={{
              opacity: 0,
              y: 10
            }} animate={{
              opacity: 1,
              y: 0
            }} transition={{
              delay: 0.5
            }} className="flex justify-center pt-4">
                    <button onClick={resetUpload} className="flex items-center gap-2 px-6 py-3 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-full hover:bg-gray-50 hover:text-neonPurple hover:border-neonPurple/30 transition-all shadow-sm group font-display tracking-wide">
                      <RefreshCw size={16} className="group-hover:rotate-180 transition-transform duration-500" />
                      Process Another File
                    </button>
                  </motion.div>}
              </motion.div>}
          </AnimatePresence>
        </div>

        {/* Decorative Footer */}
        <div className="px-6 py-3 bg-gray-50 border-t border-gray-100 flex justify-between items-center text-[10px] font-mono text-gray-400">
          <span>SYSTEM_READY</span>
          <span className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-neonGreen animate-pulse" />
            CONNECTED
          </span>
        </div>
      </div>

      {/* Ambient Glow Under Vault */}
      <div className="absolute -inset-4 bg-gradient-to-r from-neonPurple/20 to-neonGreen/20 rounded-[2rem] blur-2xl -z-10 opacity-50" />
    </motion.div>;
}