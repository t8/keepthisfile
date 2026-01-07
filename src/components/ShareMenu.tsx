import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Copy, Check, Share2, X } from 'lucide-react';
import { useError } from '../contexts/ErrorContext';

interface ShareMenuProps {
  arweaveUrl: string;
  fileName: string;
  isOpen: boolean;
  onClose: () => void;
  anchorElement?: HTMLElement | null;
}

export function ShareMenu({ arweaveUrl, fileName, isOpen, onClose, anchorElement }: ShareMenuProps) {
  const { showError } = useError();
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [canShare, setCanShare] = useState(false);
  const [menuDimensions, setMenuDimensions] = useState({ width: 200, height: 100 });
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Check if Web Share API is available
    setCanShare(typeof navigator !== 'undefined' && 'share' in navigator);
  }, []);

  // Measure menu dimensions after render
  useEffect(() => {
    if (isOpen && menuRef.current) {
      const rect = menuRef.current.getBoundingClientRect();
      setMenuDimensions({ width: rect.width, height: rect.height });
    }
  }, [isOpen]);

  useEffect(() => {
    // Close menu when clicking outside
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        if (anchorElement && anchorElement.contains(event.target as Node)) {
          return; // Don't close if clicking the anchor
        }
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen, onClose, anchorElement]);

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
    } catch (err: any) {
      console.error('Failed to copy:', err);
      showError('Failed to copy to clipboard. Please try again.');
    }
  };

  const handleNativeShare = async () => {
    if (!canShare) return;

    try {
      await navigator.share({
        title: fileName || 'Arweave File',
        text: 'Check out this file on Arweave',
        url: arweaveUrl,
      });
      onClose();
    } catch (err: any) {
      // User cancelled or error occurred
      if (err.name !== 'AbortError') {
        console.error('Failed to share:', err);
        showError('Failed to share. Please try again.');
      }
    }
  };

  // Calculate position relative to anchor element
  const getMenuPosition = () => {
    if (!anchorElement) {
      return { top: 'auto', right: '1rem', bottom: '1rem' };
    }
    
    const rect = anchorElement.getBoundingClientRect();
    const scrollY = window.scrollY || window.pageYOffset;
    const scrollX = window.scrollX || window.pageXOffset;
    
    // Use measured dimensions or fallback to safe estimates
    const menuWidth = menuDimensions.width || 200;
    const menuHeight = menuDimensions.height || 120;
    
    const spacing = 8;
    const padding = 16; // Minimum padding from screen edges
    
    // Available space calculations
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    const spaceRight = window.innerWidth - rect.right;
    const spaceLeft = rect.left;
    
    // Determine vertical position
    let top: string | undefined;
    let bottom: string | undefined;
    
    const minSpaceNeeded = menuHeight + spacing + padding;
    
    if (spaceBelow >= minSpaceNeeded) {
      // Position below with padding check
      top = `${rect.bottom + scrollY + spacing}px`;
      bottom = 'auto';
    } else if (spaceAbove >= minSpaceNeeded) {
      // Position above
      top = 'auto';
      bottom = `${window.innerHeight - rect.top - scrollY + spacing}px`;
    } else {
      // Not enough space above or below, position with constraints
      // Try to fit it below first, but ensure it doesn't go off-screen
      const maxTop = window.innerHeight - menuHeight - padding + scrollY;
      const minTop = padding + scrollY;
      const preferredTop = rect.bottom + scrollY + spacing;
      top = `${Math.max(minTop, Math.min(preferredTop, maxTop))}px`;
      bottom = 'auto';
    }
    
    // Determine horizontal position
    let left: string | undefined;
    let right: string | undefined;
    
    // On mobile, prefer centering or aligning to screen edges with padding
    const isMobile = window.innerWidth < 640; // sm breakpoint
    
    if (isMobile) {
      // On mobile, center horizontally with padding constraints
      const centerX = window.innerWidth / 2;
      const menuCenterX = menuWidth / 2;
      const calculatedLeft = centerX - menuCenterX + scrollX;
      const maxLeft = window.innerWidth - menuWidth - padding + scrollX;
      const minLeft = padding + scrollX;
      left = `${Math.max(minLeft, Math.min(calculatedLeft, maxLeft))}px`;
      right = 'auto';
    } else {
      // On desktop, align to button
      const minHorizontalSpace = menuWidth + padding;
      if (spaceRight >= minHorizontalSpace) {
        // Align to right edge of button
        right = `${window.innerWidth - rect.right - scrollX}px`;
        left = 'auto';
      } else if (spaceLeft >= minHorizontalSpace) {
        // Align to left edge of button
        left = `${rect.left + scrollX}px`;
        right = 'auto';
      } else {
        // Not enough space on either side, position with constraints
        // Try to align to button but ensure it doesn't go off-screen
        const maxLeft = window.innerWidth - menuWidth - padding + scrollX;
        const minLeft = padding + scrollX;
        const preferredLeft = rect.left + scrollX;
        left = `${Math.max(minLeft, Math.min(preferredLeft, maxLeft))}px`;
        right = 'auto';
      }
    }
    
    return { top, bottom, left, right };
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40"
            onClick={onClose}
          />
          
          {/* Menu */}
          <motion.div
            ref={menuRef}
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            transition={{ duration: 0.15 }}
            className="fixed z-50 bg-white rounded-lg shadow-lg border border-gray-200 p-2 min-w-[200px] max-w-[90vw]"
            style={getMenuPosition()}
          >
            <div className="space-y-1">
              {/* Native Share (iOS/Mobile) */}
              {canShare && (
                <button
                  onClick={handleNativeShare}
                  className="w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md flex items-center gap-2 transition-colors"
                >
                  <Share2 size={16} className="text-neonPurple" />
                  <span>Share</span>
                </button>
              )}
              
              {/* Copy URL */}
              <button
                onClick={() => copyToClipboard(arweaveUrl)}
                className="w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md flex items-center gap-2 transition-colors"
              >
                {copiedUrl ? (
                  <>
                    <Check size={16} className="text-green-600" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy size={16} className="text-neonPurple" />
                    <span>Copy URL</span>
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

