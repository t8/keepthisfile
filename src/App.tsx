import React from 'react';
import { GridBackground } from './components/GridBackground';
import { UploadVault } from './components/UploadVault';
import { motion } from 'framer-motion';
import { Database, Globe } from 'lucide-react';
export function App() {
  return <div className="relative min-h-screen w-full bg-smokedWhite text-darkText overflow-hidden flex flex-col">
      <GridBackground />

      {/* Header */}
      <header className="relative z-10 w-full px-6 py-6 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-neonPurple/10 rounded-lg text-neonPurple">
            <Database size={20} />
          </div>
          <span className="font-display font-bold text-xl tracking-wider">
            ARWEAVE<span className="text-neonPurple">.VAULT</span>
          </span>
        </div>
        <button className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-neonPurple transition-colors font-display tracking-wide">
          Connect Wallet
        </button>
      </header>

      {/* Main Content */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 py-12">
        <div className="w-full max-w-4xl mx-auto text-center mb-12">
          <motion.div initial={{
          opacity: 0,
          y: 20
        }} animate={{
          opacity: 1,
          y: 0
        }} transition={{
          duration: 0.6
        }}>
            <span className="inline-block px-3 py-1 mb-4 text-xs font-mono text-neonPurple bg-neonPurple/10 rounded-full border border-neonPurple/20">
              PERMANENT_STORAGE_PROTOCOL
            </span>
            <h1 className="text-5xl md:text-7xl font-bold mb-6 font-display tracking-tight text-gray-900">
              Store Data <span className="text-neonPurple">Forever</span>
            </h1>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto font-sans leading-relaxed">
              Upload your files to the permaweb. Secured by cryptography, stored
              redundantly across the globe, and accessible for centuries.
            </p>
          </motion.div>
        </div>

        <UploadVault />

        {/* Footer Stats */}
        <motion.div initial={{
        opacity: 0
      }} animate={{
        opacity: 1
      }} transition={{
        delay: 0.8,
        duration: 0.8
      }} className="mt-16 grid grid-cols-2 md:grid-cols-3 gap-8 text-center">
          <div>
            <p className="text-2xl font-bold font-display text-gray-900">
              200+
            </p>
            <p className="text-xs font-mono text-gray-500 uppercase mt-1">
              Years Guaranteed
            </p>
          </div>
          <div>
            <p className="text-2xl font-bold font-display text-gray-900">
              100%
            </p>
            <p className="text-xs font-mono text-gray-500 uppercase mt-1">
              Uptime
            </p>
          </div>
          <div className="col-span-2 md:col-span-1">
            <p className="text-2xl font-bold font-display text-gray-900">
              Global
            </p>
            <p className="text-xs font-mono text-gray-500 uppercase mt-1">
              Redundancy
            </p>
          </div>
        </motion.div>
      </main>
    </div>;
}