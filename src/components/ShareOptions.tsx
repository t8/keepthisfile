import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Copy, Check, Share2, Lock, Loader2 } from 'lucide-react';
import { createShareLink, getAuthToken } from '../lib/api';

interface ShareOptionsProps {
  arweaveUrl: string;
  fileId?: string;
  isAuthenticated: boolean;
  onLoginRequest?: () => void;
}

export function ShareOptions({ arweaveUrl, fileId, isAuthenticated, onLoginRequest }: ShareOptionsProps) {
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [shareLink, setShareLink] = useState<string | null>(null);
  const [creatingShareLink, setCreatingShareLink] = useState(false);
  const [shareError, setShareError] = useState<string | null>(null);
  const [copiedShareLink, setCopiedShareLink] = useState(false);

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

  const handleCopyShareLink = () => {
    if (shareLink) {
      copyToClipboard(shareLink, setCopiedShareLink);
    }
  };

  const handleCreateShareLink = async () => {
    if (!isAuthenticated) {
      if (onLoginRequest) {
        onLoginRequest();
      }
      return;
    }

    setCreatingShareLink(true);
    setShareError(null);

    try {
      const result = await createShareLink(
        fileId || arweaveUrl,
        fileId ? 'fileId' : 'arweaveUrl'
      );
      
      if (result.error) {
        setShareError(result.error);
      } else if (result.data?.shareUrl) {
        setShareLink(result.data.shareUrl);
      } else {
        setShareError('Unexpected response from server');
      }
    } catch (err: any) {
      setShareError(err?.message || 'Failed to create shareable link');
    } finally {
      setCreatingShareLink(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
      className="space-y-4"
    >
      <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
        <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <Share2 size={16} className="text-neonPurple" />
          Share File
        </h3>

        {/* Copy Arweave URL */}
        <div className="mb-4">
          <label className="block text-xs font-medium text-gray-700 mb-2">
            Arweave URL
          </label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={arweaveUrl}
              readOnly
              className="flex-1 px-3 py-2 text-xs font-mono bg-white border border-gray-300 rounded-lg text-gray-600 truncate"
            />
            <button
              onClick={handleCopyArweaveUrl}
              className="px-3 py-2 text-xs font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:text-neonPurple transition-colors flex items-center gap-2 flex-shrink-0"
            >
              {copiedUrl ? (
                <>
                  <Check size={14} />
                  Copied!
                </>
              ) : (
                <>
                  <Copy size={14} />
                  Copy
                </>
              )}
            </button>
          </div>
        </div>

        {/* Shareable Link Section */}
        {isAuthenticated ? (
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-2">
              Shareable Link
            </label>
            {shareLink ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={shareLink}
                    readOnly
                    className="flex-1 px-3 py-2 text-xs font-mono bg-white border border-gray-300 rounded-lg text-gray-600 truncate"
                  />
                  <button
                    onClick={handleCopyShareLink}
                    className="px-3 py-2 text-xs font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:text-neonPurple transition-colors flex items-center gap-2 flex-shrink-0"
                  >
                    {copiedShareLink ? (
                      <>
                        <Check size={14} />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy size={14} />
                        Copy
                      </>
                    )}
                  </button>
                </div>
                <p className="text-xs text-gray-500">
                  This link redirects to your file on Arweave
                </p>
              </div>
            ) : (
              <button
                onClick={handleCreateShareLink}
                disabled={creatingShareLink}
                className="w-full px-4 py-2 text-sm font-medium text-white bg-neonPurple rounded-lg hover:bg-neonPurple/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {creatingShareLink ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Share2 size={16} />
                    Create Shareable Link
                  </>
                )}
              </button>
            )}
            {shareError && (
              <p className="mt-2 text-xs text-red-600">{shareError}</p>
            )}
          </div>
        ) : (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex items-start gap-2">
              <Lock size={16} className="text-amber-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-xs font-medium text-amber-900 mb-1">
                  Sign in to create shareable links
                </p>
                <p className="text-xs text-amber-700 mb-2">
                  Shareable links make it easier to share your files with others.
                </p>
                {onLoginRequest && (
                  <button
                    onClick={onLoginRequest}
                    className="text-xs font-medium text-amber-700 hover:text-amber-900 underline"
                  >
                    Sign In
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}

