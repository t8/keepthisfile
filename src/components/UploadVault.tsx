import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UploadZone } from './UploadZone';
import { UploadProgress } from './UploadProgress';
import { FilePreview } from './FilePreview';
import { ShareOptions } from './ShareOptions';
import { FileText, Lock, ShieldCheck, RefreshCw, AlertCircle } from 'lucide-react';
import { uploadFree, uploadPaid, createUploadSession, getAuthToken } from '../lib/api';
import { FREE_MAX_BYTES } from '../lib/constants';

interface UploadResult {
  txId: string;
  arweaveUrl: string;
  fileName: string;
  mimeType?: string;
  sizeBytes?: number;
  fileId?: string;
}

interface UploadVaultProps {
  onUploadSuccess?: () => void;
  onLoginRequest?: () => void;
}

export function UploadVault({ onUploadSuccess, onLoginRequest }: UploadVaultProps) {
  const [status, setStatus] = useState<'idle' | 'uploading' | 'complete' | 'error' | 'payment-required'>('idle');
  const [progress, setProgress] = useState(0);
  const [fileName, setFileName] = useState<string>('');
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [error, setError] = useState<string>('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileMimeType, setFileMimeType] = useState<string>('');

  // Check authentication by checking if token exists (no API call needed)
  const isAuthenticated = !!getAuthToken();

  const handleFileSelect = async (file: File) => {
    setFileName(file.name);
    setSelectedFile(file);
    setFileMimeType(file.type || 'application/octet-stream');
    setError('');
    setStatus('idle');

    const fileSize = file.size;

    // Check if file exceeds free tier
    if (fileSize > FREE_MAX_BYTES) {
      // Require authentication and payment
      if (!isAuthenticated) {
        setError('Authentication required for files over 100KB. Please sign in first.');
        setStatus('error');
        return;
      }

      // Create payment session
      try {
        setStatus('uploading');
        setProgress(10);
        const sessionResult = await createUploadSession(fileSize);
        
        if (sessionResult.error) {
          setError(sessionResult.error);
          setStatus('error');
          return;
        }

        if (sessionResult.data?.url) {
          // Redirect to Stripe checkout
          window.location.href = sessionResult.data.url;
          setStatus('payment-required');
          return;
        }
      } catch (err) {
        setError('Failed to create payment session');
        setStatus('error');
        return;
      }
    } else {
      // Free upload
      await uploadFile(file, null);
    }
  };

  const uploadFile = async (file: File, sessionId: string | null) => {
    console.log('uploadFile called with:', { fileName: file.name, sessionId });
    setStatus('uploading');
    setProgress(20);

    try {
      let result;
      
      if (sessionId) {
        // Paid upload
        console.log('Calling uploadPaid...');
        result = await uploadPaid(file, sessionId);
      } else {
        // Free upload
        console.log('Calling uploadFree...');
        result = await uploadFree(file);
      }

      console.log('Upload result received:', result);
      console.log('Result type:', typeof result);
      console.log('Result keys:', Object.keys(result || {}));
      
      if (result?.error) {
        console.error('Upload API error:', result.error);
        setError(result.error);
        setStatus('error');
        setProgress(0);
        return;
      }

      // Handle both response formats for compatibility
      const fileData = result?.data?.file || result?.file;
      
      console.log('Extracted fileData:', fileData);
      
      if (fileData && fileData.txId && fileData.arweaveUrl) {
        console.log('Upload successful! Setting state...');
        setProgress(100);
        setUploadResult({
          txId: fileData.txId,
          arweaveUrl: fileData.arweaveUrl,
          fileName: fileData.fileName || file.name,
          mimeType: file.type || fileData.mimeType || 'application/octet-stream',
          sizeBytes: fileData.sizeBytes || file.size,
          fileId: fileData.id,
        });
        setStatus('complete');
        console.log('State updated to complete');
        
        // Notify parent component of successful upload (refresh library)
        if (onUploadSuccess && isAuthenticated) {
          console.log('Calling onUploadSuccess callback');
          setTimeout(() => {
            console.log('Executing onUploadSuccess');
            onUploadSuccess();
          }, 1000);
        }
      } else {
        console.error('Unexpected response format:', result);
        console.error('File data check:', {
          hasFileData: !!fileData,
          hasTxId: !!fileData?.txId,
          hasArweaveUrl: !!fileData?.arweaveUrl,
          fileDataKeys: fileData ? Object.keys(fileData) : 'null',
        });
        setError('Unexpected response from server. Check console for details.');
        setStatus('error');
        setProgress(0);
      }
    } catch (err: any) {
      console.error('Upload exception:', err);
      console.error('Error stack:', err?.stack);
      setError(err?.message || 'Upload failed. Please try again.');
      setStatus('error');
      setProgress(0);
    }
  };

  // Check if returning from Stripe payment
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const sessionId = urlParams.get('session_id');
    
    if (sessionId && selectedFile) {
      uploadFile(selectedFile, sessionId);
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [selectedFile]);

  const resetUpload = () => {
    setStatus('idle');
    setProgress(0);
    setFileName('');
    setUploadResult(null);
    setError('');
    setSelectedFile(null);
    setFileMimeType('');
  };
  return <motion.div initial={{
    opacity: 0,
    y: 20
  }} animate={{
    opacity: 1,
    y: 0
  }} transition={{
    duration: 0.8,
    ease: 'easeOut'
  }} className="relative w-full max-w-2xl mx-auto">
      {/* Vault Container */}
      <div className="relative bg-white/80 backdrop-blur-xl rounded-2xl shadow-vault border border-white/50 overflow-hidden">
        {/* Header Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-white/50">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${status === 'complete' ? 'bg-neonGreen/10 text-neonGreen' : 'bg-neonPurple/10 text-neonPurple'}`}>
              {status === 'complete' ? <ShieldCheck size={20} /> : <Lock size={20} />}
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-wider text-gray-900 uppercase font-display">
                Digital Vault
              </h2>
              <p className="text-[10px] font-mono text-gray-400 tracking-widest">
                SECURE_UPLINK_V2.4
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <div className="w-2 h-2 rounded-full bg-red-400/30" />
            <div className="w-2 h-2 rounded-full bg-yellow-400/30" />
            <div className="w-2 h-2 rounded-full bg-green-400/30" />
          </div>
        </div>

        {/* Main Content Area */}
        <div className="p-8 min-h-[400px] flex flex-col justify-center">
          <AnimatePresence mode="wait">
            {status === 'idle' && <motion.div key="idle" initial={{
            opacity: 0,
            scale: 0.95
          }} animate={{
            opacity: 1,
            scale: 1
          }} exit={{
            opacity: 0,
            scale: 1.05,
            filter: 'blur(10px)'
          }} transition={{
            duration: 0.3
          }}>
                <UploadZone onFileSelect={handleFileSelect} />
              </motion.div>}

            {(status === 'uploading' || status === 'complete') && <motion.div key="process" initial={{
            opacity: 0
          }} animate={{
            opacity: 1
          }} className="space-y-8">
                {/* File Info Card */}
                <motion.div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl border border-gray-100" initial={{
              y: 20,
              opacity: 0
            }} animate={{
              y: 0,
              opacity: 1
            }} transition={{
              delay: 0.2
            }}>
                  <div className="p-3 bg-white rounded-lg shadow-sm text-neonPurple">
                    <FileText size={24} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate font-sans">
                      {fileName}
                    </p>
                    <p className="text-xs text-gray-500 font-mono">
                      {status === 'uploading' ? 'ENCRYPTING & SEALING...' : 'SECURELY STORED'}
                    </p>
                  </div>
                </motion.div>

                {/* Error Display */}
                {status === 'error' && error && <motion.div initial={{
              opacity: 0,
              y: 10
            }} animate={{
              opacity: 1,
              y: 0
            }} className="p-4 bg-red-50 border border-red-200 rounded-xl">
                    <div className="flex items-center gap-2 text-red-600">
                      <AlertCircle size={16} />
                      <p className="text-sm font-medium">{error}</p>
                    </div>
                  </motion.div>}

                {/* Progress Animation */}
                {status === 'uploading' && <UploadProgress progress={progress} status={status} />}

                {/* Success Display */}
                {status === 'complete' && uploadResult && <motion.div initial={{
              opacity: 0,
              y: 10
            }} animate={{
              opacity: 1,
              y: 0
            }} transition={{
              delay: 0.3
            }} className="space-y-4">
                    <div className="p-4 bg-neonGreen/10 border border-neonGreen/20 rounded-xl">
                      <p className="text-sm font-medium text-gray-900 mb-2">Upload Complete!</p>
                      {isAuthenticated ? (
                        <>
                          <a 
                            href={uploadResult.arweaveUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-xs font-mono text-neonPurple hover:underline break-all"
                          >
                            {uploadResult.arweaveUrl}
                          </a>
                          <p className="text-xs text-gray-500 mt-2 font-mono">
                            TX ID: {uploadResult.txId}
                          </p>
                        </>
                      ) : (
                        <div className="space-y-2">
                          <p className="text-xs text-gray-600">
                            Your file has been securely uploaded to Arweave.
                          </p>
                          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                            <div className="flex items-start gap-2">
                              <Lock size={16} className="text-amber-600 mt-0.5 flex-shrink-0" />
                              <div className="flex-1">
                                <p className="text-xs font-medium text-amber-900 mb-1">
                                  Sign in to view your file URL and access sharing options
                                </p>
                                <p className="text-xs text-amber-700 mb-2">
                                  Your file is safely stored and will be added to your library once you sign in.
                                </p>
                                {onLoginRequest && (
                                  <button
                                    onClick={onLoginRequest}
                                    className="text-xs font-medium text-amber-700 hover:text-amber-900 underline"
                                  >
                                    Sign In Now
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {/* File Preview - Only show if authenticated */}
                    {isAuthenticated && (
                      <FilePreview
                        url={uploadResult.arweaveUrl}
                        mimeType={uploadResult.mimeType || fileMimeType}
                        fileName={uploadResult.fileName}
                        sizeBytes={uploadResult.sizeBytes}
                      />
                    )}
                    
                    {/* Share Options - Only show if authenticated */}
                    {isAuthenticated && (
                      <ShareOptions
                        arweaveUrl={uploadResult.arweaveUrl}
                        fileId={uploadResult.fileId}
                        isAuthenticated={isAuthenticated}
                        onLoginRequest={onLoginRequest}
                      />
                    )}
                    
                    <UploadProgress progress={100} status="complete" />
                  </motion.div>}

                {/* Success Actions */}
                {status === 'complete' && <motion.div initial={{
              opacity: 0,
              y: 10
            }} animate={{
              opacity: 1,
              y: 0
            }} transition={{
              delay: 0.5
            }} className="flex justify-center pt-4">
                    <button onClick={resetUpload} className="flex items-center gap-2 px-6 py-3 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-full hover:bg-gray-50 hover:text-neonPurple hover:border-neonPurple/30 transition-all shadow-sm group font-display tracking-wide">
                      <RefreshCw size={16} className="group-hover:rotate-180 transition-transform duration-500" />
                      Process Another File
                    </button>
                  </motion.div>}
              </motion.div>}
          </AnimatePresence>
        </div>

        {/* Decorative Footer */}
        <div className="px-6 py-3 bg-gray-50 border-t border-gray-100 flex justify-between items-center text-[10px] font-mono text-gray-400">
          <span>SYSTEM_READY</span>
          <span className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-neonGreen animate-pulse" />
            CONNECTED
          </span>
        </div>
      </div>

      {/* Ambient Glow Under Vault */}
      <div className="absolute -inset-4 bg-gradient-to-r from-neonPurple/20 to-neonGreen/20 rounded-[2rem] blur-2xl -z-10 opacity-50" />
    </motion.div>;
}