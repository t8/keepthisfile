import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Copy, Check, Share2 } from 'lucide-react';

interface ShareOptionsProps {
  arweaveUrl: string;
  fileId?: string;
  isAuthenticated: boolean;
  onLoginRequest?: () => void;
}

export function ShareOptions({ arweaveUrl, fileId, isAuthenticated, onLoginRequest }: ShareOptionsProps) {
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [canShare, setCanShare] = useState(false);

  useEffect(() => {
    // Check if Web Share API is available
    setCanShare(typeof navigator !== 'undefined' && 'share' in navigator);
  }, []);

  const copyToClipboard = async (text: string, setCopied: (value: boolean) => void) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleCopyArweaveUrl = () => {
    copyToClipboard(arweaveUrl, setCopiedUrl);
  };

  const handleNativeShare = async () => {
    if (!canShare) return;

    try {
      await navigator.share({
        title: 'Arweave File',
        text: 'Check out this file on Arweave',
        url: arweaveUrl,
      });
    } catch (err: any) {
      // User cancelled or error occurred - silently fail
      if (err.name !== 'AbortError') {
        console.error('Failed to share:', err);
      }
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
      className="space-y-3 sm:space-y-4 w-full"
    >
      <div className="bg-gray-50 rounded-xl border border-gray-200">
        <div className="p-3 sm:p-4">
          <h3 className="text-xs sm:text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <Share2 size={14} className="sm:w-4 sm:h-4 text-neonPurple" />
            Share File
          </h3>

          {/* Copy Arweave URL */}
          <div>
          <label className="block text-xs font-medium text-gray-700 mb-2">
            Arweave URL
          </label>
          <div className="flex items-center gap-2 flex-wrap">
            <input
              type="text"
              value={arweaveUrl}
              readOnly
              className="flex-1 min-w-0 px-2 sm:px-3 py-1.5 sm:py-2 text-[10px] sm:text-xs font-mono bg-white border border-gray-300 rounded-lg text-gray-600 break-all"
            />
            <button
              onClick={handleCopyArweaveUrl}
              className="px-2 sm:px-3 py-1.5 sm:py-2 text-xs font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:text-neonPurple transition-colors flex items-center gap-1.5 sm:gap-2 flex-shrink-0"
            >
              {copiedUrl ? (
                <>
                  <Check size={12} className="sm:w-3.5 sm:h-3.5" />
                  <span className="hidden sm:inline">Copied!</span>
                  <span className="sm:hidden">Copied</span>
                </>
              ) : (
                <>
                  <Copy size={12} className="sm:w-3.5 sm:h-3.5" />
                  Copy
                </>
              )}
            </button>
          </div>
        </div>

          {/* Native Share Button - Mobile Only */}
          {canShare && (
            <div className="mt-3 sm:hidden">
              <button
                onClick={handleNativeShare}
                className="w-full px-3 py-2 text-xs font-medium text-white bg-neonPurple rounded-lg hover:bg-neonPurple/90 transition-colors flex items-center justify-center gap-2"
              >
                <Share2 size={14} />
                <span>Share</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
