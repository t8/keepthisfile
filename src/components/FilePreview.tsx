import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { FileText, Image, File, Loader2, AlertCircle } from 'lucide-react';

interface FilePreviewProps {
  url: string;
  mimeType: string;
  fileName: string;
  sizeBytes?: number;
}

export function FilePreview({ url, mimeType, fileName, sizeBytes }: FilePreviewProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [imageError, setImageError] = useState(false);

  const isImage = mimeType.startsWith('image/');
  const isPDF = mimeType === 'application/pdf';

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="w-full"
    >
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {/* Preview Content */}
        <div className="relative bg-gray-50 min-h-[200px] max-h-[400px] flex items-center justify-center overflow-hidden">
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-50/80 backdrop-blur-sm z-10">
              <Loader2 className="animate-spin text-neonPurple" size={32} />
            </div>
          )}

          {error && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-50 z-10">
              <div className="text-center p-6">
                <AlertCircle className="mx-auto text-red-400 mb-2" size={32} />
                <p className="text-sm text-gray-600">{error}</p>
              </div>
            </div>
          )}

          {!error && (
            <>
              {isImage && !imageError ? (
                <img
                  src={url}
                  alt={fileName}
                  className="max-w-full max-h-full object-contain"
                  onLoad={() => setLoading(false)}
                  onError={() => {
                    setLoading(false);
                    setImageError(true);
                  }}
                />
              ) : isPDF ? (
                <iframe
                  src={url}
                  className="w-full h-full min-h-[400px] border-0"
                  onLoad={() => setLoading(false)}
                  onError={() => {
                    setLoading(false);
                    setError('Failed to load PDF preview');
                  }}
                  title={fileName}
                />
              ) : (
                <div className="text-center p-8">
                  <div className="inline-flex items-center justify-center w-20 h-20 bg-neonPurple/10 rounded-full mb-4">
                    {mimeType.startsWith('image/') ? (
                      <Image className="text-neonPurple" size={40} />
                    ) : (
                      <File className="text-neonPurple" size={40} />
                    )}
                  </div>
                  <p className="text-sm font-medium text-gray-900 mb-1">{fileName}</p>
                  <p className="text-xs text-gray-500 font-mono">{mimeType}</p>
                  {sizeBytes && (
                    <p className="text-xs text-gray-400 mt-2">{formatFileSize(sizeBytes)}</p>
                  )}
                </div>
              )}

              {isImage && imageError && (
                <div className="text-center p-8">
                  <div className="inline-flex items-center justify-center w-20 h-20 bg-gray-100 rounded-full mb-4">
                    <Image className="text-gray-400" size={40} />
                  </div>
                  <p className="text-sm font-medium text-gray-900 mb-1">{fileName}</p>
                  <p className="text-xs text-gray-500 font-mono">{mimeType}</p>
                  {sizeBytes && (
                    <p className="text-xs text-gray-400 mt-2">{formatFileSize(sizeBytes)}</p>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* File Info Footer */}
        <div className="px-4 py-3 bg-white border-t border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="p-2 bg-neonPurple/10 rounded-lg text-neonPurple flex-shrink-0">
              <FileText size={16} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{fileName}</p>
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <span className="font-mono">{mimeType}</span>
                {sizeBytes && (
                  <>
                    <span>•</span>
                    <span>{formatFileSize(sizeBytes)}</span>
                  </>
                )}
              </div>
            </div>
          </div>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-4 px-3 py-1.5 text-xs font-medium text-neonPurple bg-neonPurple/10 rounded-lg hover:bg-neonPurple/20 transition-colors flex-shrink-0"
          >
            Open
          </a>
        </div>
      </div>
    </motion.div>
  );
}

