import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { FileText, MoreVertical } from 'lucide-react';
import { ShareMenu } from './ShareMenu';

interface FileCardProps {
  file: {
    id: string;
    arweaveTxId: string;
    arweaveUrl: string;
    sizeBytes: number;
    mimeType: string;
    originalFileName: string;
    createdAt: string;
  };
}

export function FileCard({ file }: FileCardProps) {
  const [isShareMenuOpen, setIsShareMenuOpen] = useState(false);
  const shareButtonRef = useRef<HTMLButtonElement>(null);
  const [imageError, setImageError] = useState(false);

  const isImage = file.mimeType.startsWith('image/');

  const handleClick = () => {
    window.open(file.arweaveUrl, '_blank', 'noopener,noreferrer');
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsShareMenuOpen(true);
  };

  const handleShareClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsShareMenuOpen(!isShareMenuOpen);
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return 'Today';
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
      });
    }
  };

  const truncateFileName = (fileName: string, maxLength: number = 20): string => {
    if (fileName.length <= maxLength) return fileName;
    const extension = fileName.substring(fileName.lastIndexOf('.'));
    const nameWithoutExt = fileName.substring(0, fileName.lastIndexOf('.'));
    const truncatedName = nameWithoutExt.substring(0, maxLength - extension.length - 3);
    return `${truncatedName}...${extension}`;
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-lg border border-gray-200 hover:border-neonPurple/50 hover:shadow-md transition-all cursor-pointer group relative"
        onClick={handleClick}
        onContextMenu={handleContextMenu}
      >
        {/* Card Content */}
        <div className="p-3 flex flex-col h-full">
          {/* Preview/Icon Area */}
          <div className="relative w-full aspect-square mb-2 rounded-md overflow-hidden bg-gray-50 flex items-center justify-center">
            {isImage && !imageError ? (
              <img
                src={file.arweaveUrl}
                alt={file.originalFileName}
                className="w-full h-full object-cover"
                onError={() => setImageError(true)}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-neonPurple/10 to-neonPurple/5">
                <FileText size={32} className="text-neonPurple" />
              </div>
            )}
            
            {/* Share Button - Top Right */}
            <button
              ref={shareButtonRef}
              onClick={handleShareClick}
              className="absolute top-2 right-2 p-1.5 bg-white/90 backdrop-blur-sm rounded-full opacity-100 sm:opacity-0 sm:group-hover:opacity-100 hover:bg-white transition-opacity shadow-sm"
              aria-label="Share file"
            >
              <MoreVertical size={14} className="text-gray-700" />
            </button>
          </div>

          {/* File Name */}
          <h3 
            className="text-sm font-medium text-gray-900 truncate mb-1"
            title={file.originalFileName}
          >
            {truncateFileName(file.originalFileName)}
          </h3>

          {/* Metadata */}
          <div className="mt-auto space-y-1">
            <p className="text-xs text-gray-500">
              {formatDate(file.createdAt)}
            </p>
            <p className="text-xs font-mono text-gray-400 truncate">
              {file.arweaveTxId.substring(0, 8)}...
            </p>
          </div>
        </div>
      </motion.div>

      {/* Share Menu */}
      <ShareMenu
        arweaveUrl={file.arweaveUrl}
        fileName={file.originalFileName}
        isOpen={isShareMenuOpen}
        onClose={() => setIsShareMenuOpen(false)}
        anchorElement={shareButtonRef.current}
      />
    </>
  );
}

