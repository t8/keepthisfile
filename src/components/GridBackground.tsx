import React from 'react';
import { motion } from 'framer-motion';
export function GridBackground() {
  return <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none w-full max-w-full">
      {/* Base Grid */}
      <div className="absolute inset-0 bg-grid-pattern bg-[size:40px_40px] opacity-30 w-full max-w-full" style={{
      maskImage: 'linear-gradient(to bottom, transparent, black, transparent)',
      WebkitMaskImage: 'linear-gradient(to bottom, transparent 5%, black 40%, black 60%, transparent 95%)'
    }} />

      {/* Floating Geometric Shapes */}
      <motion.div className="absolute top-1/4 left-1/4 w-64 h-64 border border-neonPurple/20 rounded-full" animate={{
      scale: [1, 1.2, 1],
      rotate: [0, 90, 0],
      opacity: [0.1, 0.3, 0.1]
    }} transition={{
      duration: 15,
      repeat: Infinity,
      ease: 'easeInOut'
    }} />

      <motion.div className="absolute bottom-1/3 right-1/4 w-96 h-96 border border-neonGreen/20 rotate-45" animate={{
      scale: [1.2, 1, 1.2],
      rotate: [45, 0, 45],
      opacity: [0.1, 0.2, 0.1]
    }} transition={{
      duration: 20,
      repeat: Infinity,
      ease: 'easeInOut'
    }} />

      {/* Ambient Glows */}
      <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-white/50 via-transparent to-white/50 pointer-events-none" />
    </div>;
}