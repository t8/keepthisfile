import React, { useCallback, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UploadCloud, File, AlertCircle } from 'lucide-react';
interface UploadZoneProps {
  onFileSelect: (file: File) => void;
  disabled?: boolean;
}
export function UploadZone({
  onFileSelect,
  disabled
}: UploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (disabled) return;
    setIsDragging(true);
  }, [disabled]);
  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (disabled) return;
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      onFileSelect(files[0]);
    }
  }, [disabled, onFileSelect]);
  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFileSelect(e.target.files[0]);
    }
  }, [onFileSelect]);
  return <div className="relative group">
      {/* Corner Accents */}
      <div className={`absolute -top-2 -left-2 w-6 h-6 border-t-2 border-l-2 transition-colors duration-300 ${isDragging ? 'border-neonGreen' : 'border-gray-300'}`} />
      <div className={`absolute -top-2 -right-2 w-6 h-6 border-t-2 border-r-2 transition-colors duration-300 ${isDragging ? 'border-neonGreen' : 'border-gray-300'}`} />
      <div className={`absolute -bottom-2 -left-2 w-6 h-6 border-b-2 border-l-2 transition-colors duration-300 ${isDragging ? 'border-neonGreen' : 'border-gray-300'}`} />
      <div className={`absolute -bottom-2 -right-2 w-6 h-6 border-b-2 border-r-2 transition-colors duration-300 ${isDragging ? 'border-neonGreen' : 'border-gray-300'}`} />

      <motion.label htmlFor="file-upload" className={`
          relative flex flex-col items-center justify-center w-full h-64 
          border-2 border-dashed rounded-lg cursor-pointer overflow-hidden
          transition-all duration-300 ease-out
          ${isDragging ? 'border-neonGreen bg-neonGreen/5 shadow-[inset_0_0_40px_rgba(74,222,128,0.1)]' : 'border-gray-300 hover:border-neonPurple hover:bg-neonPurple/5'}
        `} onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop} whileHover={{
      scale: 1.01
    }} whileTap={{
      scale: 0.99
    }}>
        <div className="flex flex-col items-center justify-center pt-5 pb-6 text-center z-10">
          <motion.div animate={isDragging ? {
          scale: 1.2,
          rotate: 10
        } : {
          scale: 1,
          rotate: 0
        }} className={`mb-4 p-4 rounded-full ${isDragging ? 'bg-neonGreen/20 text-neonGreen' : 'bg-gray-100 text-gray-400 group-hover:text-neonPurple group-hover:bg-neonPurple/10'}`}>
            <UploadCloud size={40} strokeWidth={1.5} />
          </motion.div>

          <p className="mb-2 text-lg font-medium text-gray-700 font-sans">
            <span className="font-bold text-neonPurple font-display tracking-wide">
              Click to upload
            </span>{' '}
            or drag and drop
          </p>
          <p className="text-sm text-gray-500 font-mono">
            SVG, PNG, JPG or GIF (MAX. 800x400px)
          </p>
        </div>

        {/* Animated Grid Background inside Drop Zone */}
        <div className={`absolute inset-0 pointer-events-none transition-opacity duration-500 ${isDragging ? 'opacity-20' : 'opacity-0'}`}>
          <div className="w-full h-full bg-[linear-gradient(45deg,transparent_25%,rgba(74,222,128,0.2)_50%,transparent_75%,transparent_100%)] bg-[length:20px_20px]" />
        </div>

        <input id="file-upload" type="file" className="hidden" onChange={handleFileInput} disabled={disabled} />
      </motion.label>
    </div>;
}