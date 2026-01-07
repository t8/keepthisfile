import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { Loader2, FolderOpen } from 'lucide-react';
import { getUserFiles } from '../lib/api';
import { FileCard } from './FileCard';
import { useError } from '../contexts/ErrorContext';

interface File {
  id: string;
  arweaveTxId: string;
  arweaveUrl: string;
  sizeBytes: number;
  mimeType: string;
  originalFileName: string;
  createdAt: string;
}

const FILES_PER_PAGE = 20;

export function FileLibrary() {
  const { showError } = useError();
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string>('');
  const [hasMore, setHasMore] = useState(true);
  const [total, setTotal] = useState(0);
  const observerTarget = useRef<HTMLDivElement>(null);

  const loadFiles = useCallback(async (offset: number = 0, append: boolean = false) => {
    try {
      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }

      const result = await getUserFiles(FILES_PER_PAGE, offset);
      
      if (result.error) {
        const errorMsg = result.error;
        setError(errorMsg);
        showError(errorMsg);
      } else if (result.data?.files) {
        if (append) {
          setFiles(prev => [...prev, ...result.data!.files]);
        } else {
          setFiles(result.data.files);
        }
        
        if (result.data.pagination) {
          setHasMore(result.data.pagination.hasMore);
          setTotal(result.data.pagination.total);
        }
      }
    } catch (err: any) {
      const errorMsg = err?.message || 'Failed to load files';
      setError(errorMsg);
      showError(errorMsg);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [showError]);

  useEffect(() => {
    loadFiles(0, false);
  }, [loadFiles]);

  // Infinite scroll observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore && !loading) {
          loadFiles(files.length, true);
        }
      },
      { threshold: 0.1 }
    );

    const currentTarget = observerTarget.current;
    if (currentTarget) {
      observer.observe(currentTarget);
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget);
      }
    };
  }, [files.length, hasMore, loadingMore, loading, loadFiles]);

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
    <div className="w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 font-display">Your Files</h2>
          {total > 0 && (
            <p className="text-sm text-gray-500 mt-1">{total} {total === 1 ? 'file' : 'files'}</p>
          )}
        </div>
      </div>

      {/* File Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
        {files.map((file) => (
          <FileCard key={file.id} file={file} />
        ))}
      </div>

      {/* Infinite Scroll Trigger */}
      {hasMore && (
        <div ref={observerTarget} className="flex justify-center items-center py-8">
          {loadingMore && (
            <Loader2 className="animate-spin text-neonPurple" size={24} />
          )}
        </div>
      )}
    </div>
  );
}
