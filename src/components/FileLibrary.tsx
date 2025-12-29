import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FileText, ExternalLink, Copy, Check, Loader2, FolderOpen, Image as ImageIcon } from 'lucide-react';
import { getUserFiles, getAuthToken } from '../lib/api';
import { ShareOptions } from './ShareOptions';

interface File {
  id: string;
  arweaveTxId: string;
  arweaveUrl: string;
  sizeBytes: number;
  mimeType: string;
  originalFileName: string;
  createdAt: string;
}

export function FileLibrary() {
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const isAuthenticated = !!getAuthToken();
  
  const isImage = (mimeType: string) => mimeType.startsWith('image/');

  useEffect(() => {
    loadFiles();
  }, []);

  const loadFiles = async () => {
    try {
      setLoading(true);
      const result = await getUserFiles();
      
      if (result.error) {
        setError(result.error);
      } else if (result.data?.files) {
        setFiles(result.data.files);
      }
    } catch (err: any) {
      setError('Failed to load files');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="animate-spin text-neonPurple" size={32} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-xl">
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  if (files.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center p-12"
      >
        <FolderOpen className="mx-auto text-gray-400 mb-4" size={48} />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">No files yet</h3>
        <p className="text-gray-600">Upload your first file to get started!</p>
      </motion.div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900 font-display">Your Files</h2>
        <button
          onClick={loadFiles}
          className="px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
        >
          Refresh
        </button>
      </div>

      <div className="grid gap-4">
        {files.map((file) => (
          <motion.div
            key={file.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start gap-4">
              {/* Image Preview or File Icon */}
              {isImage(file.mimeType) ? (
                <div className="flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border border-gray-200 bg-gray-50">
                  <img
                    src={file.arweaveUrl}
                    alt={file.originalFileName}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      // Fallback to icon if image fails to load
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                      const parent = target.parentElement;
                      if (parent) {
                        parent.innerHTML = `<div class="w-full h-full flex items-center justify-center bg-gray-100"><svg class="text-neonPurple" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg></div>`;
                      }
                    }}
                  />
                </div>
              ) : (
                <div className="p-3 bg-neonPurple/10 rounded-lg text-neonPurple flex-shrink-0">
                  <FileText size={24} />
                </div>
              )}
              
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-gray-900 truncate mb-1">
                  {file.originalFileName}
                </h3>
                <div className="flex flex-wrap gap-4 text-sm text-gray-600 mb-3">
                  <span>{formatFileSize(file.sizeBytes)}</span>
                  <span>•</span>
                  <span>{formatDate(file.createdAt)}</span>
                  <span>•</span>
                  <span className="font-mono text-xs">{file.mimeType}</span>
                </div>
                
                <div className="flex items-center gap-2 flex-wrap mb-3">
                  <a
                    href={file.arweaveUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-neonPurple bg-neonPurple/10 rounded-lg hover:bg-neonPurple/20 transition-colors"
                  >
                    <ExternalLink size={14} />
                    View on Arweave
                  </a>
                  
                  <button
                    onClick={() => copyToClipboard(file.arweaveUrl, file.id)}
                    className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    {copiedId === file.id ? (
                      <>
                        <Check size={14} />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy size={14} />
                        Copy URL
                      </>
                    )}
                  </button>
                  
                  <span className="font-mono text-xs text-gray-500 px-2 py-1 bg-gray-50 rounded">
                    {file.arweaveTxId.substring(0, 16)}...
                  </span>
                </div>
                
                {/* Share Options */}
                {isAuthenticated && (
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <ShareOptions
                      arweaveUrl={file.arweaveUrl}
                      fileId={file.id}
                      isAuthenticated={isAuthenticated}
                    />
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

