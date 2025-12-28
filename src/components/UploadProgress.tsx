import React from 'react';
import { motion } from 'framer-motion';
import { Check, Loader2 } from 'lucide-react';
interface UploadProgressProps {
  progress: number;
  status: 'idle' | 'uploading' | 'complete';
}
export function UploadProgress({
  progress,
  status
}: UploadProgressProps) {
  return <div className="w-full space-y-2">
      <div className="flex justify-between items-center text-xs font-mono uppercase tracking-wider">
        <span className="text-gray-500">
          {status === 'complete' ? 'Transmission Complete' : 'Uploading to Arweave...'}
        </span>
        <span className={status === 'complete' ? 'text-neonGreen' : 'text-neonPurple'}>
          {Math.round(progress)}%
        </span>
      </div>

      <div className="relative h-2 bg-gray-100 rounded-full overflow-hidden">
        <motion.div className={`absolute top-0 left-0 h-full ${status === 'complete' ? 'bg-neonGreen shadow-neon-green' : 'bg-neonPurple shadow-neon-purple'}`} initial={{
        width: 0
      }} animate={{
        width: `${progress}%`
      }} transition={{
        duration: 0.2
      }} />

        {/* Scanning effect on progress bar */}
        {status === 'uploading' && <motion.div className="absolute top-0 bottom-0 w-20 bg-gradient-to-r from-transparent via-white/50 to-transparent" animate={{
        x: ['-100%', '500%']
      }} transition={{
        duration: 1.5,
        repeat: Infinity,
        ease: 'linear'
      }} />}
      </div>

      <div className="flex justify-between items-center pt-2">
        <div className="flex gap-2">
          {[1, 2, 3, 4].map(i => <motion.div key={i} className={`w-1 h-1 rounded-full ${progress > i * 20 ? status === 'complete' ? 'bg-neonGreen' : 'bg-neonPurple' : 'bg-gray-200'}`} animate={status === 'uploading' ? {
          opacity: [0.5, 1, 0.5]
        } : {}} transition={{
          duration: 1,
          repeat: Infinity,
          delay: i * 0.1
        }} />)}
        </div>

        {status === 'complete' && <motion.div initial={{
        opacity: 0,
        scale: 0.8
      }} animate={{
        opacity: 1,
        scale: 1
      }} className="flex items-center gap-1 text-xs font-bold text-neonGreen font-display tracking-wide">
            <Check size={12} strokeWidth={3} />
            VERIFIED PERMANENT
          </motion.div>}
      </div>
    </div>;
}