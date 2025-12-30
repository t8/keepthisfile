import React, { useState, useEffect } from 'react';
import { Routes, Route, useNavigate, useLocation, Link } from 'react-router-dom';
import { GridBackground } from './components/GridBackground';
import { UploadVault } from './components/UploadVault';
import { FileLibrary } from './components/FileLibrary';
import { AuthModal } from './components/AuthModal';
import { motion } from 'framer-motion';
import { Database, LogOut, Upload, FolderOpen } from 'lucide-react';
import { getCurrentUser, clearAuthToken, getAuthToken, linkFilesToUser } from './lib/api';

export function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    // Initial auth check on mount
    checkAuth().finally(() => {
      setAuthLoading(false);
    });
    
    // Link anonymous uploads helper function
    const linkAnonymousUploads = async () => {
      try {
        const anonymousUploads = JSON.parse(localStorage.getItem('anonymous-uploads') || '[]');
        if (anonymousUploads.length > 0) {
          console.log('[App] Linking', anonymousUploads.length, 'anonymous uploads to user account...');
          const linkResult = await linkFilesToUser(anonymousUploads);
          if (linkResult.data?.linkedCount) {
            console.log('[App] Successfully linked', linkResult.data.linkedCount, 'files to user account');
            localStorage.removeItem('anonymous-uploads');
          } else if (linkResult.error) {
            console.error('[App] Failed to link anonymous uploads:', linkResult.error);
          }
        }
      } catch (err) {
        console.error('[App] Error linking anonymous uploads:', err);
      }
    };
    
    // Listen for storage events (when token is set in another tab/window from magic link)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'auth-token' && e.newValue) {
        console.log('[App] Storage event detected, token set, checking auth...');
        checkAuth().then(() => {
          // Link anonymous uploads after auth check completes
          linkAnonymousUploads();
        });
      } else if (e.key === 'auth-token' && !e.newValue) {
        console.log('[App] Storage event detected, token removed');
        setIsAuthenticated(false);
        setUserEmail(null);
      }
    };
    window.addEventListener('storage', handleStorageChange);
    
    // Check for auth token in URL (from magic link redirect)
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    const authError = urlParams.get('auth_error');
    
    if (token) {
      // Token will be handled by AuthModal component
      // Just clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
    
    if (authError) {
      alert(authError);
      window.history.replaceState({}, document.title, window.location.pathname);
    }
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []); // Only run on mount

  const checkAuth = async () => {
    const token = getAuthToken();
    if (token) {
      try {
        const result = await getCurrentUser();
        
        if (result.data?.authenticated && result.data.user) {
          setIsAuthenticated(true);
          setUserEmail(result.data.user.email);
        } else {
          clearAuthToken();
          setIsAuthenticated(false);
          setUserEmail(null);
        }
      } catch (error) {
        console.error('[App] Auth check error:', error);
        clearAuthToken();
        setIsAuthenticated(false);
        setUserEmail(null);
      }
    } else {
      setIsAuthenticated(false);
      setUserEmail(null);
    }
  };

  const handleLogin = async () => {
    await checkAuth();
    
    // Link any anonymous uploads to the user's account
    // Check if we're authenticated by checking for token (checkAuth already updated state)
    const hasToken = !!getAuthToken();
    if (hasToken) {
      try {
        const anonymousUploads = JSON.parse(localStorage.getItem('anonymous-uploads') || '[]');
        if (anonymousUploads.length > 0) {
          console.log('[App] Linking', anonymousUploads.length, 'anonymous uploads to user account...');
          const linkResult = await linkFilesToUser(anonymousUploads);
          if (linkResult.data?.linkedCount) {
            console.log('[App] Successfully linked', linkResult.data.linkedCount, 'files to user account');
            // Clear the anonymous uploads from localStorage
            localStorage.removeItem('anonymous-uploads');
          } else if (linkResult.error) {
            console.error('[App] Failed to link anonymous uploads:', linkResult.error);
            // Keep them in localStorage to try again later
          }
        }
      } catch (err) {
        console.error('[App] Error linking anonymous uploads:', err);
        // Non-critical error, continue with login
      }
    }
    
    setIsAuthModalOpen(false);
  };

  const handleLogout = () => {
    clearAuthToken();
    setIsAuthenticated(false);
    setUserEmail(null);
  };

  // Show loading state during initial auth check to prevent UI flashing
  if (authLoading) {
    return (
      <div className="relative min-h-screen w-full bg-smokedWhite text-darkText overflow-hidden flex items-center justify-center">
        <GridBackground />
        <div className="relative z-10 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-neonPurple mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return <div className="relative min-h-screen w-full bg-smokedWhite text-darkText overflow-x-hidden flex flex-col">
      <GridBackground />

      {/* Header */}
      <header className="relative z-10 w-full px-4 sm:px-6 py-4 sm:py-6 flex items-center gap-3 sm:gap-4 overflow-x-auto">
        <Link to="/" className="flex items-center gap-2 flex-shrink-0 hover:opacity-80 transition-opacity">
          <div className="p-2 bg-neonPurple/10 rounded-lg text-neonPurple">
            <Database size={20} />
          </div>
          <span className="hidden md:inline font-display font-bold text-lg lg:text-xl tracking-wider">
            KeepThis<span className="text-neonPurple">File</span>
          </span>
        </Link>
        <div className="flex items-center gap-2 sm:gap-4 flex-1 min-w-0 justify-end">
          {isAuthenticated && (
            <nav className="flex items-center gap-1 sm:gap-2 bg-white/50 backdrop-blur-sm rounded-lg p-1 border border-gray-200 flex-shrink-0">
              <Link
                to="/"
                className={`px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium rounded-md transition-colors flex items-center gap-1 sm:gap-2 ${
                  location.pathname === '/'
                    ? 'bg-neonPurple text-white'
                    : 'text-gray-600 hover:text-neonPurple'
                }`}
              >
                <Upload size={14} className="sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">Upload</span>
              </Link>
              <Link
                to="/files"
                className={`px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium rounded-md transition-colors flex items-center gap-1 sm:gap-2 ${
                  location.pathname === '/files'
                    ? 'bg-neonPurple text-white'
                    : 'text-gray-600 hover:text-neonPurple'
                }`}
              >
                <FolderOpen size={14} className="sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">Files</span>
              </Link>
            </nav>
          )}
          {isAuthenticated ? (
            <>
              <span className="text-xs sm:text-sm text-gray-600 font-sans truncate max-w-[100px] sm:max-w-[150px] md:max-w-none flex-shrink-0">{userEmail}</span>
              <button 
                onClick={handleLogout}
                className="px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium text-gray-600 hover:text-neonPurple transition-colors font-display tracking-wide flex items-center gap-1 sm:gap-2 flex-shrink-0"
              >
                <LogOut size={14} className="sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">Sign Out</span>
              </button>
            </>
          ) : (
            <button 
              onClick={() => setIsAuthModalOpen(true)}
              className="px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium text-gray-600 hover:text-neonPurple transition-colors font-display tracking-wide flex-shrink-0"
            >
              Sign In
            </button>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 sm:px-6 py-8 sm:py-12 overflow-x-hidden">
        <div className="w-full max-w-4xl mx-auto text-center mb-8 sm:mb-12">
          <motion.div initial={{
          opacity: 0,
          y: 20
        }} animate={{
          opacity: 1,
          y: 0
        }} transition={{
          duration: 0.6
        }}>
            <span className="inline-block px-2 sm:px-3 py-1 mb-4 text-[10px] sm:text-xs font-mono text-neonPurple bg-neonPurple/10 rounded-full border border-neonPurple/20">
              PERMANENT_STORAGE_PROTOCOL
            </span>
            <h1 className="text-3xl sm:text-5xl md:text-7xl font-bold mb-4 sm:mb-6 font-display tracking-tight text-gray-900 px-2">
              Store Data <span className="text-neonPurple">Forever</span>
            </h1>
            <p className="text-sm sm:text-lg text-gray-600 max-w-2xl mx-auto font-sans leading-relaxed px-2">
              Upload your files to the permaweb. Secured by cryptography, stored
              redundantly across the globe, and accessible for centuries.
            </p>
          </motion.div>
        </div>

        <Routes>
          <Route
            path="/"
            element={
              <UploadVault 
                onUploadSuccess={() => {
                  // Don't redirect - stay on upload page to show success/share options
                }}
                onLoginRequest={() => setIsAuthModalOpen(true)}
              />
            }
          />
          <Route
            path="/files"
            element={
              isAuthenticated ? (
                <div className="w-full max-w-4xl mx-auto px-4 sm:px-6">
                  <FileLibrary />
                </div>
              ) : (
                <div className="text-center p-8 sm:p-12 px-4">
                  <p className="text-sm sm:text-base text-gray-600 mb-4">Please sign in to view your files.</p>
                  <button
                    onClick={() => setIsAuthModalOpen(true)}
                    className="px-4 sm:px-6 py-2 sm:py-3 text-sm sm:text-base bg-neonPurple text-white rounded-lg font-medium hover:bg-neonPurple/90 transition-colors"
                  >
                    Sign In
                  </button>
                </div>
              )
            }
          />
        </Routes>

        {/* Footer Stats */}
        <motion.div initial={{
        opacity: 0
      }} animate={{
        opacity: 1
      }} transition={{
        delay: 0.8,
        duration: 0.8
      }} className="mt-12 sm:mt-16 grid grid-cols-2 md:grid-cols-3 gap-4 sm:gap-8 text-center px-2 w-full max-w-4xl">
          <div>
            <p className="text-xl sm:text-2xl font-bold font-display text-gray-900">
              200+
            </p>
            <p className="text-[10px] sm:text-xs font-mono text-gray-500 uppercase mt-1">
              Years Guaranteed
            </p>
          </div>
          <div>
            <p className="text-xl sm:text-2xl font-bold font-display text-gray-900">
              100%
            </p>
            <p className="text-[10px] sm:text-xs font-mono text-gray-500 uppercase mt-1">
              Uptime
            </p>
          </div>
          <div className="col-span-2 md:col-span-1">
            <p className="text-xl sm:text-2xl font-bold font-display text-gray-900">
              Global
            </p>
            <p className="text-[10px] sm:text-xs font-mono text-gray-500 uppercase mt-1">
              Redundancy
            </p>
          </div>
        </motion.div>
      </main>

      <AuthModal 
        isOpen={isAuthModalOpen} 
        onClose={() => setIsAuthModalOpen(false)}
        onLogin={handleLogin}
      />
    </div>;
}