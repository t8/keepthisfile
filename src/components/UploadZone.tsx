import React, { useCallback, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UploadCloud, File, AlertCircle, Lock } from 'lucide-react';
interface UploadZoneProps {
  onFileSelect: (file: File) => void;
  disabled?: boolean;
  onLoginRequest?: () => void;
  requiresAuth?: boolean;
}
export function UploadZone({
  onFileSelect,
  disabled,
  onLoginRequest,
  requiresAuth
}: UploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (disabled || requiresAuth) return;
    setIsDragging(true);
  }, [disabled, requiresAuth]);
  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (disabled || requiresAuth) return;
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      onFileSelect(files[0]);
    }
  }, [disabled, requiresAuth, onFileSelect]);
  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (disabled || requiresAuth) {
      e.preventDefault();
      if (onLoginRequest) {
        onLoginRequest();
      }
      return;
    }
    if (e.target.files && e.target.files.length > 0) {
      onFileSelect(e.target.files[0]);
    }
  }, [disabled, requiresAuth, onFileSelect, onLoginRequest]);
  const handleClick = useCallback((e: React.MouseEvent) => {
    if (disabled || requiresAuth) {
      e.preventDefault();
      if (onLoginRequest) {
        onLoginRequest();
      }
    }
  }, [disabled, requiresAuth, onLoginRequest]);
  return <div className="relative group w-full">
      {/* Corner Accents */}
      <div className={`absolute -top-1 sm:-top-2 -left-1 sm:-left-2 w-4 h-4 sm:w-6 sm:h-6 border-t-2 border-l-2 transition-colors duration-300 ${isDragging && !requiresAuth ? 'border-neonGreen' : 'border-gray-300'}`} />
      <div className={`absolute -top-1 sm:-top-2 -right-1 sm:-right-2 w-4 h-4 sm:w-6 sm:h-6 border-t-2 border-r-2 transition-colors duration-300 ${isDragging && !requiresAuth ? 'border-neonGreen' : 'border-gray-300'}`} />
      <div className={`absolute -bottom-1 sm:-bottom-2 -left-1 sm:-left-2 w-4 h-4 sm:w-6 sm:h-6 border-b-2 border-l-2 transition-colors duration-300 ${isDragging && !requiresAuth ? 'border-neonGreen' : 'border-gray-300'}`} />
      <div className={`absolute -bottom-1 sm:-bottom-2 -right-1 sm:-right-2 w-4 h-4 sm:w-6 sm:h-6 border-b-2 border-r-2 transition-colors duration-300 ${isDragging && !requiresAuth ? 'border-neonGreen' : 'border-gray-300'}`} />

      <motion.label htmlFor="file-upload" className={`
          relative flex flex-col items-center justify-center w-full h-48 sm:h-64 
          border-2 border-dashed rounded-lg overflow-hidden
          transition-all duration-300 ease-out
          ${requiresAuth ? 'border-gray-200 bg-gray-50/50 cursor-not-allowed' : disabled ? 'border-gray-300 cursor-not-allowed' : isDragging ? 'border-neonGreen bg-neonGreen/5 shadow-[inset_0_0_40px_rgba(74,222,128,0.1)] cursor-pointer' : 'border-gray-300 hover:border-neonPurple hover:bg-neonPurple/5 cursor-pointer'}
        `} onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop} onClick={handleClick} whileHover={!requiresAuth && !disabled ? {
      scale: 1.01
    } : {}} whileTap={!requiresAuth && !disabled ? {
      scale: 0.99
    } : {}}>
        <div className="flex flex-col items-center justify-center pt-4 sm:pt-5 pb-4 sm:pb-6 text-center z-10 px-4">
          {requiresAuth ? (
            <>
              <motion.div className="mb-3 sm:mb-4 p-3 sm:p-4 rounded-full bg-gray-200 text-gray-400">
                <Lock size={32} className="sm:w-10 sm:h-10" strokeWidth={1.5} />
              </motion.div>
              <p className="mb-2 text-base sm:text-lg font-medium text-gray-600 font-sans">
                <span className="font-bold text-gray-700 font-display tracking-wide">
                  Sign in required
                </span>
              </p>
              <p className="text-xs sm:text-sm text-gray-500 mb-4">
                Please sign in to upload files
              </p>
              {onLoginRequest && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onLoginRequest();
                  }}
                  className="px-4 sm:px-6 py-2 sm:py-3 text-xs sm:text-sm font-medium bg-neonPurple text-white rounded-lg hover:bg-neonPurple/90 transition-colors"
                >
                  Sign In
                </button>
              )}
            </>
          ) : (
            <>
              <motion.div animate={isDragging ? {
            scale: 1.2,
            rotate: 10
          } : {
            scale: 1,
            rotate: 0
          }} className={`mb-3 sm:mb-4 p-3 sm:p-4 rounded-full ${isDragging ? 'bg-neonGreen/20 text-neonGreen' : 'bg-gray-100 text-gray-400 group-hover:text-neonPurple group-hover:bg-neonPurple/10'}`}>
                <UploadCloud size={32} className="sm:w-10 sm:h-10" strokeWidth={1.5} />
              </motion.div>

              <p className="mb-2 text-base sm:text-lg font-medium text-gray-700 font-sans">
                <span className="font-bold text-neonPurple font-display tracking-wide">
                  Click to upload
                </span>{' '}
                <span className="hidden sm:inline">or drag and drop</span>
              </p>
            </>
          )}
        </div>

        {/* Animated Grid Background inside Drop Zone */}
        {!requiresAuth && (
          <div className={`absolute inset-0 pointer-events-none transition-opacity duration-500 ${isDragging ? 'opacity-20' : 'opacity-0'}`}>
            <div className="w-full h-full bg-[linear-gradient(45deg,transparent_25%,rgba(74,222,128,0.2)_50%,transparent_75%,transparent_100%)] bg-[length:20px_20px]" />
          </div>
        )}

        {/* Overlay when authentication required */}
        {requiresAuth && (
          <div className="absolute inset-0 bg-white/30 backdrop-blur-[1px] pointer-events-none" />
        )}

        <input id="file-upload" type="file" className="hidden" onChange={handleFileInput} disabled={disabled || requiresAuth} />
      </motion.label>
    </div>;
}