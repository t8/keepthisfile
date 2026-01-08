import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { FileText, Image, File, Loader2, AlertCircle, Clock } from 'lucide-react';

interface FilePreviewProps {
  url: string;
  mimeType: string;
  fileName: string;
  sizeBytes?: number;
}

// Check if Arweave URL is accessible by trying to fetch actual content
async function checkUrlAccessibility(url: string): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 second timeout
    
    try {
      // Try to fetch with range request to get just the first bytes (lighter weight)
      // This will actually verify the file exists and is accessible
      const response = await fetch(url, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          'Range': 'bytes=0-1023', // Just request first 1KB
        },
      });
      clearTimeout(timeoutId);
      
      // Check if we got a successful response (200 or 206 for partial content)
      if (response.ok || response.status === 206) {
        return true;
      }
      
      // If not OK, check if it's a 404 (file not found) or other error
      if (response.status === 404) {
        return false;
      }
      
      // For other status codes, try without range header (some servers don't support range)
      const fullResponse = await fetch(url, {
        method: 'HEAD',
        signal: controller.signal,
      });
      return fullResponse.ok;
    } catch (error: any) {
      clearTimeout(timeoutId);
      
      // Check if error is specifically a 404 or "not found"
      if (error?.message?.includes('404') || error?.message?.includes('Not Found')) {
        return false;
      }
      
      // For network errors or timeouts, assume file might not be ready yet
      return false;
    }
  } catch {
    return false;
  }
}

export function FilePreview({ url, mimeType, fileName, sizeBytes }: FilePreviewProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [imageError, setImageError] = useState(false);
  const [gatewayAvailable, setGatewayAvailable] = useState<boolean | null>(null);
  const [fileActuallyLoaded, setFileActuallyLoaded] = useState(false);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const checkCountRef = useRef(0);
  const maxChecks = 200; // Check for up to 20 minutes (200 checks * 6 seconds)

  const isImage = mimeType.startsWith('image/');
  const isPDF = mimeType === 'application/pdf';

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  // Check gateway availability when component mounts
  useEffect(() => {
    let isMounted = true;

    const checkGateway = async () => {
      const isAvailable = await checkUrlAccessibility(url);
      if (isMounted) {
        setGatewayAvailable(isAvailable);
        
        if (!isAvailable) {
          // Start polling if not available yet
          startPolling();
        }
      }
    };

    const startPolling = () => {
      if (pollingIntervalRef.current) return; // Already polling

      pollingIntervalRef.current = setInterval(async () => {
        // Only continue polling if file hasn't actually loaded yet
        if (fileActuallyLoaded) {
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
          }
          return;
        }

        checkCountRef.current += 1;
        
        if (checkCountRef.current >= maxChecks) {
          // Stop polling after max checks, but keep notification showing if file still not loaded
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
          }
          // Don't change gatewayAvailable - keep showing notification
          return;
        }

        const isAvailable = await checkUrlAccessibility(url);
        if (isMounted) {
          setGatewayAvailable(isAvailable);
          // Only stop polling if file actually loaded (checked via onLoad handlers)
        }
      }, 6000); // Check every 6 seconds
    };

    // Initial check
    checkGateway();

    return () => {
      isMounted = false;
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, [url, fileActuallyLoaded]);

  // For non-image files, mark as loaded once gateway is confirmed available
  useEffect(() => {
    if (!isImage && !isPDF && gatewayAvailable === true && !fileActuallyLoaded) {
      // For non-image files, if gateway check says it's available, 
      // wait a moment then mark as loaded
      const timer = setTimeout(() => {
        setFileActuallyLoaded(true);
        setLoading(false);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [gatewayAvailable, fileActuallyLoaded, isImage, isPDF]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="w-full space-y-3"
    >
      {/* Gateway Status Notification - Show persistently until file actually loads */}
      {!fileActuallyLoaded && (gatewayAvailable === false || gatewayAvailable === null) && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-3 sm:p-4 bg-amber-50 border border-amber-200 rounded-xl"
        >
          <div className="flex items-start gap-3">
            <Clock className="text-amber-600 mt-0.5 flex-shrink-0" size={18} />
            <div className="flex-1 min-w-0">
              <p className="text-xs sm:text-sm font-medium text-amber-900 mb-1">
                Gateway processing your file
              </p>
              <p className="text-xs text-amber-700">
                The Arweave gateway is picking up your file. It will be available shortly. This usually takes less than a minute, but can take longer during peak times.
              </p>
            </div>
          </div>
        </motion.div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {/* Preview Content */}
        <div className="relative bg-gray-50 min-h-[200px] sm:min-h-[300px] max-h-[400px] sm:max-h-[500px] flex items-center justify-center overflow-hidden">
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
                  className="w-full h-full object-contain"
                  onLoad={() => {
                    setLoading(false);
                    setFileActuallyLoaded(true);
                    setGatewayAvailable(true);
                  }}
                  onError={() => {
                    setLoading(false);
                    setImageError(true);
                    setFileActuallyLoaded(false);
                    setGatewayAvailable(false);
                  }}
                />
              ) : isPDF ? (
                <iframe
                  src={url}
                  className="w-full h-full min-h-[300px] sm:min-h-[400px] border-0"
                  onLoad={() => {
                    setLoading(false);
                    setFileActuallyLoaded(true);
                    setGatewayAvailable(true);
                  }}
                  onError={() => {
                    setLoading(false);
                    setError('Failed to load PDF preview');
                    setFileActuallyLoaded(false);
                    setGatewayAvailable(false);
                  }}
                  title={fileName}
                />
              ) : (
                <div className="text-center p-8 w-full">
                  <div className="inline-flex items-center justify-center w-20 h-20 bg-neonPurple/10 rounded-full mb-4">
                    <File className="text-neonPurple" size={40} />
                  </div>
                  <p className="text-sm font-medium text-gray-900 mb-1">{fileName}</p>
                  <p className="text-xs text-gray-500 font-mono">{mimeType}</p>
                  {sizeBytes && (
                    <p className="text-xs text-gray-400 mt-2">{formatFileSize(sizeBytes)}</p>
                  )}
                </div>
              )}

              {isImage && imageError && !loading && (
                <div className="text-center p-8 w-full">
                  <div className="inline-flex items-center justify-center w-20 h-20 bg-gray-100 rounded-full mb-4">
                    <Image className="text-gray-400" size={40} />
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* File Info Footer - Only show for non-images, or for images that failed to load */}
        {(!isImage || imageError) && (
          <div className="px-3 sm:px-4 py-2 sm:py-3 bg-white border-t border-gray-100 flex items-center justify-between gap-2 sm:gap-4 flex-wrap">
            <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
              <div className="p-1.5 sm:p-2 bg-neonPurple/10 rounded-lg text-neonPurple flex-shrink-0">
                <FileText size={14} className="sm:w-4 sm:h-4" />
              </div>
              <div className="flex-1 min-w-0 overflow-hidden">
                <p className="text-xs sm:text-sm font-medium text-gray-900 truncate">{fileName}</p>
                <div className="flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs text-gray-500 flex-wrap">
                  <span className="font-mono break-all">{mimeType}</span>
                  {sizeBytes && (
                    <>
                      <span className="hidden sm:inline">•</span>
                      <span className="whitespace-nowrap">{formatFileSize(sizeBytes)}</span>
                    </>
                  )}
                </div>
              </div>
            </div>
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="px-2.5 sm:px-3 py-1.5 text-xs font-medium text-neonPurple bg-neonPurple/10 rounded-lg hover:bg-neonPurple/20 transition-colors flex-shrink-0 whitespace-nowrap"
            >
              Open
            </a>
          </div>
        )}
        
        {/* Minimal footer for images - just the Open link */}
        {isImage && !imageError && (
          <div className="px-3 sm:px-4 py-2 sm:py-3 bg-white border-t border-gray-100 flex items-center justify-end">
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="px-2.5 sm:px-3 py-1.5 text-xs font-medium text-neonPurple bg-neonPurple/10 rounded-lg hover:bg-neonPurple/20 transition-colors flex-shrink-0 whitespace-nowrap"
            >
              Open Full Size
            </a>
          </div>
        )}
      </div>
    </motion.div>
  );
}

