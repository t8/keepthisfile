import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UploadZone } from './UploadZone';
import { UploadProgress } from './UploadProgress';
import { FilePreview } from './FilePreview';
import { ShareOptions } from './ShareOptions';
import { FileText, Lock, ShieldCheck, RefreshCw, AlertCircle } from 'lucide-react';
import { uploadFree, uploadPaid, createUploadSession, getAuthToken, verifyUploadSession } from '../lib/api';
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
        console.log('[UPLOAD-VAULT] Creating upload session for file size:', fileSize);
        const sessionResult = await createUploadSession(fileSize);
        console.log('[UPLOAD-VAULT] Session result received:', sessionResult);
        
        if (sessionResult.error) {
          console.error('[UPLOAD-VAULT] Session creation error:', sessionResult.error);
          setError(sessionResult.error);
          setStatus('error');
          return;
        }

        if (sessionResult.data?.url) {
          console.log('[UPLOAD-VAULT] Storing file in sessionStorage before payment redirect');
          // Store file info in sessionStorage so we can retrieve it after payment
          try {
            const fileData = {
              name: file.name,
              size: file.size,
              type: file.type || 'application/octet-stream',
              sessionId: sessionResult.data.sessionId,
            };
            sessionStorage.setItem('pending-upload', JSON.stringify(fileData));
            
            // Store file as base64 in sessionStorage (for files up to a reasonable size)
            // For very large files, we might need a different approach
            if (file.size <= 10 * 1024 * 1024) { // 10MB limit for sessionStorage
              const arrayBuffer = await file.arrayBuffer();
              const uint8Array = new Uint8Array(arrayBuffer);
              let binary = '';
              const chunkSize = 8192;
              for (let i = 0; i < uint8Array.length; i += chunkSize) {
                binary += String.fromCharCode.apply(null, Array.from(uint8Array.slice(i, i + chunkSize)));
              }
              const base64 = btoa(binary);
              sessionStorage.setItem('pending-upload-file', base64);
            } else {
              console.warn('[UPLOAD-VAULT] File too large for sessionStorage, will need user to re-upload');
            }
          } catch (err) {
            console.error('[UPLOAD-VAULT] Failed to store file in sessionStorage:', err);
            // Continue anyway - user might need to re-upload
          }
          
          console.log('[UPLOAD-VAULT] Redirecting to Stripe checkout:', sessionResult.data.url);
          // Redirect to Stripe checkout
          window.location.href = sessionResult.data.url;
          setStatus('payment-required');
          return;
        } else {
          console.error('[UPLOAD-VAULT] No URL in response data:', sessionResult);
          setError('Failed to get checkout URL from server');
          setStatus('error');
          return;
        }
      } catch (err) {
        console.error('[UPLOAD-VAULT] Exception creating payment session:', err);
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
        
        // Store anonymous uploads in localStorage for later linking
        if (!isAuthenticated && fileData.arweaveUrl) {
          try {
            const anonymousUploads = JSON.parse(localStorage.getItem('anonymous-uploads') || '[]');
            // Only add if not already in the list
            if (!anonymousUploads.includes(fileData.arweaveUrl)) {
              anonymousUploads.push(fileData.arweaveUrl);
              localStorage.setItem('anonymous-uploads', JSON.stringify(anonymousUploads));
              console.log('Stored anonymous upload for later linking:', fileData.arweaveUrl);
            }
          } catch (err) {
            console.error('Failed to store anonymous upload:', err);
          }
        }
        
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
    const handlePaymentReturn = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const sessionId = urlParams.get('session_id');
      
      if (!sessionId) {
        return;
      }

      console.log('[UPLOAD-VAULT] Detected payment return with session_id:', sessionId);
      
      // Clean up URL immediately
      window.history.replaceState({}, document.title, window.location.pathname);
      
      try {
        // Verify payment was completed
        setStatus('uploading');
        setProgress(20);
        console.log('[UPLOAD-VAULT] Verifying payment session...');
        const verifyResult = await verifyUploadSession(sessionId);
        
        if (verifyResult.error) {
          console.error('[UPLOAD-VAULT] Payment verification failed:', verifyResult.error);
          setError(verifyResult.error || 'Payment verification failed');
          setStatus('error');
          return;
        }

        // Check both status and paymentStatus from Stripe
        const isPaid = verifyResult.data?.status === 'paid' || 
                      verifyResult.data?.paymentStatus === 'paid';
        
        if (!isPaid) {
          console.error('[UPLOAD-VAULT] Payment not completed, status:', verifyResult.data?.status, 'paymentStatus:', verifyResult.data?.paymentStatus);
          
          // If payment is still pending, wait a bit and retry (webhook might be processing)
          if (verifyResult.data?.status === 'pending' || verifyResult.data?.stripeStatus === 'open') {
            console.log('[UPLOAD-VAULT] Payment still processing, waiting 2 seconds and retrying...');
            setProgress(30);
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // Retry verification
            const retryResult = await verifyUploadSession(sessionId);
            const retryIsPaid = retryResult.data?.status === 'paid' || 
                               retryResult.data?.paymentStatus === 'paid';
            
            if (!retryIsPaid) {
              setError('Payment is still processing. Please wait a moment and refresh the page.');
              setStatus('error');
              return;
            }
            
            // Payment confirmed on retry, continue
            console.log('[UPLOAD-VAULT] Payment confirmed on retry');
          } else {
            setError('Payment not completed. Please try again.');
            setStatus('error');
            return;
          }
        }

        console.log('[UPLOAD-VAULT] Payment verified, retrieving file from sessionStorage...');
        
        // Try to get file from sessionStorage
        const pendingUploadStr = sessionStorage.getItem('pending-upload');
        const pendingFileBase64 = sessionStorage.getItem('pending-upload-file');
        
        if (!pendingUploadStr) {
          console.error('[UPLOAD-VAULT] No pending upload found in sessionStorage');
          setError('File not found. Please select your file again.');
          setStatus('error');
          return;
        }

        const pendingUpload = JSON.parse(pendingUploadStr);
        
        // Reconstruct file from base64
        let file: File | null = null;
        if (pendingFileBase64) {
          try {
            const binary = atob(pendingFileBase64);
            const bytes = new Uint8Array(binary.length);
            for (let i = 0; i < binary.length; i++) {
              bytes[i] = binary.charCodeAt(i);
            }
            const blob = new Blob([bytes], { type: pendingUpload.type });
            file = new File([blob], pendingUpload.name, { type: pendingUpload.type });
            console.log('[UPLOAD-VAULT] File reconstructed from sessionStorage');
          } catch (err) {
            console.error('[UPLOAD-VAULT] Failed to reconstruct file:', err);
          }
        }

        if (!file) {
          console.error('[UPLOAD-VAULT] Could not reconstruct file');
          setError('File not found. Please select your file again.');
          setStatus('error');
          return;
        }

        // Set file info
        setFileName(file.name);
        setSelectedFile(file);
        setFileMimeType(file.type || 'application/octet-stream');

        // Upload the file
        console.log('[UPLOAD-VAULT] Uploading file after payment...');
        await uploadFile(file, sessionId);
        
        // Clean up sessionStorage
        sessionStorage.removeItem('pending-upload');
        sessionStorage.removeItem('pending-upload-file');
      } catch (err: any) {
        console.error('[UPLOAD-VAULT] Error handling payment return:', err);
        setError(err?.message || 'Failed to process payment return');
        setStatus('error');
      }
    };

    handlePaymentReturn();
  }, []); // Only run once on mount

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
  }} className="relative w-full max-w-2xl mx-auto px-2 sm:px-4">
      {/* Vault Container */}
      <div className="relative bg-white/80 backdrop-blur-xl rounded-2xl shadow-vault border border-white/50 overflow-hidden">
        {/* Header Bar */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-100 bg-white/50 flex-wrap gap-2">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className={`p-1.5 sm:p-2 rounded-lg ${status === 'complete' ? 'bg-neonGreen/10 text-neonGreen' : 'bg-neonPurple/10 text-neonPurple'}`}>
              {status === 'complete' ? <ShieldCheck size={18} className="sm:w-5 sm:h-5" /> : <Lock size={18} className="sm:w-5 sm:h-5" />}
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold tracking-wider text-gray-900 uppercase font-display">
                Digital Vault
              </h2>
              <p className="text-[9px] sm:text-[10px] font-mono text-gray-400 tracking-widest">
                SECURE_UPLINK_V2.4
              </p>
            </div>
          </div>
          <div className="flex gap-1.5 sm:gap-2">
            <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-red-400/30" />
            <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-yellow-400/30" />
            <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-green-400/30" />
          </div>
        </div>

        {/* Main Content Area */}
        <div className="p-4 sm:p-8 min-h-[300px] sm:min-h-[400px] flex flex-col justify-center">
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
          }} className="space-y-4 sm:space-y-8">
                {/* File Info Card */}
                <motion.div className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 bg-gray-50 rounded-xl border border-gray-100" initial={{
              y: 20,
              opacity: 0
            }} animate={{
              y: 0,
              opacity: 1
            }} transition={{
              delay: 0.2
            }}>
                  <div className="p-2 sm:p-3 bg-white rounded-lg shadow-sm text-neonPurple flex-shrink-0">
                    <FileText size={20} className="sm:w-6 sm:h-6" />
                  </div>
                  <div className="flex-1 min-w-0 overflow-hidden">
                    <p className="text-xs sm:text-sm font-medium text-gray-900 truncate font-sans">
                      {fileName}
                    </p>
                    <p className="text-[10px] sm:text-xs text-gray-500 font-mono">
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
            }} className="p-3 sm:p-4 bg-red-50 border border-red-200 rounded-xl">
                    <div className="flex items-center gap-2 text-red-600">
                      <AlertCircle size={14} className="sm:w-4 sm:h-4 flex-shrink-0" />
                      <p className="text-xs sm:text-sm font-medium break-words">{error}</p>
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
            }} className="space-y-3 sm:space-y-4">
                    <div className="p-3 sm:p-4 bg-neonGreen/10 border border-neonGreen/20 rounded-xl">
                      <p className="text-xs sm:text-sm font-medium text-gray-900 mb-2">Upload Complete!</p>
                      {isAuthenticated ? (
                        <>
                          <a 
                            href={uploadResult.arweaveUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-[10px] sm:text-xs font-mono text-neonPurple hover:underline break-all block"
                          >
                            {uploadResult.arweaveUrl}
                          </a>
                          <p className="text-[10px] sm:text-xs text-gray-500 mt-2 font-mono break-all">
                            TX ID: {uploadResult.txId}
                          </p>
                        </>
                      ) : (
                        <div className="space-y-2">
                          <p className="text-xs text-gray-600">
                            Your file has been securely uploaded to Arweave.
                          </p>
                          <div className="p-2.5 sm:p-3 bg-amber-50 border border-amber-200 rounded-lg">
                            <div className="flex items-start gap-2">
                              <Lock size={14} className="sm:w-4 sm:h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                              <div className="flex-1 min-w-0">
                                <p className="text-[11px] sm:text-xs font-medium text-amber-900 mb-1">
                                  Sign in to view your file URL and access sharing options
                                </p>
                                <p className="text-[11px] sm:text-xs text-amber-700 mb-2">
                                  Your file is safely stored and will be added to your library once you sign in.
                                </p>
                                {onLoginRequest && (
                                  <button
                                    onClick={onLoginRequest}
                                    className="text-[11px] sm:text-xs font-medium text-amber-700 hover:text-amber-900 underline"
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
                    <button onClick={resetUpload} className="flex items-center gap-2 px-4 sm:px-6 py-2 sm:py-3 text-xs sm:text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-full hover:bg-gray-50 hover:text-neonPurple hover:border-neonPurple/30 transition-all shadow-sm group font-display tracking-wide">
                      <RefreshCw size={14} className="sm:w-4 sm:h-4 group-hover:rotate-180 transition-transform duration-500" />
                      <span className="whitespace-nowrap">Process Another File</span>
                    </button>
                  </motion.div>}
              </motion.div>}
          </AnimatePresence>
        </div>

        {/* Decorative Footer */}
        <div className="px-4 sm:px-6 py-2 sm:py-3 bg-gray-50 border-t border-gray-100 flex justify-between items-center text-[9px] sm:text-[10px] font-mono text-gray-400 gap-2">
          <span className="truncate">SYSTEM_READY</span>
          <span className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
            <span className="w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full bg-neonGreen animate-pulse" />
            <span className="whitespace-nowrap">CONNECTED</span>
          </span>
        </div>
      </div>

      {/* Ambient Glow Under Vault */}
      <div className="absolute -inset-4 bg-gradient-to-r from-neonPurple/20 to-neonGreen/20 rounded-[2rem] blur-2xl -z-10 opacity-50" />
    </motion.div>;
}