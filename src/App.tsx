import React, { useState, useEffect } from 'react';
import { GridBackground } from './components/GridBackground';
import { UploadVault } from './components/UploadVault';
import { AuthModal } from './components/AuthModal';
import { motion } from 'framer-motion';
import { Database, LogOut } from 'lucide-react';
import { getCurrentUser, clearAuthToken, getAuthToken } from './lib/api';

export function App() {
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    checkAuth();
    
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
  }, []);

  const checkAuth = async () => {
    const token = getAuthToken();
    if (token) {
      const result = await getCurrentUser();
      if (result.data?.authenticated && result.data.user) {
        setIsAuthenticated(true);
        setUserEmail(result.data.user.email);
      } else {
        clearAuthToken();
        setIsAuthenticated(false);
        setUserEmail(null);
      }
    }
  };

  const handleLogin = async () => {
    await checkAuth();
    setIsAuthModalOpen(false);
  };

  const handleLogout = () => {
    clearAuthToken();
    setIsAuthenticated(false);
    setUserEmail(null);
  };

  return <div className="relative min-h-screen w-full bg-smokedWhite text-darkText overflow-hidden flex flex-col">
      <GridBackground />

      {/* Header */}
      <header className="relative z-10 w-full px-6 py-6 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-neonPurple/10 rounded-lg text-neonPurple">
            <Database size={20} />
          </div>
          <span className="font-display font-bold text-xl tracking-wider">
            ARWEAVE<span className="text-neonPurple">.VAULT</span>
          </span>
        </div>
        {isAuthenticated ? (
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-600 font-sans">{userEmail}</span>
            <button 
              onClick={handleLogout}
              className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-neonPurple transition-colors font-display tracking-wide flex items-center gap-2"
            >
              <LogOut size={16} />
              Sign Out
            </button>
          </div>
        ) : (
          <button 
            onClick={() => setIsAuthModalOpen(true)}
            className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-neonPurple transition-colors font-display tracking-wide"
          >
            Sign In
          </button>
        )}
      </header>

      {/* Main Content */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 py-12">
        <div className="w-full max-w-4xl mx-auto text-center mb-12">
          <motion.div initial={{
          opacity: 0,
          y: 20
        }} animate={{
          opacity: 1,
          y: 0
        }} transition={{
          duration: 0.6
        }}>
            <span className="inline-block px-3 py-1 mb-4 text-xs font-mono text-neonPurple bg-neonPurple/10 rounded-full border border-neonPurple/20">
              PERMANENT_STORAGE_PROTOCOL
            </span>
            <h1 className="text-5xl md:text-7xl font-bold mb-6 font-display tracking-tight text-gray-900">
              Store Data <span className="text-neonPurple">Forever</span>
            </h1>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto font-sans leading-relaxed">
              Upload your files to the permaweb. Secured by cryptography, stored
              redundantly across the globe, and accessible for centuries.
            </p>
          </motion.div>
        </div>

        <UploadVault />

        {/* Footer Stats */}
        <motion.div initial={{
        opacity: 0
      }} animate={{
        opacity: 1
      }} transition={{
        delay: 0.8,
        duration: 0.8
      }} className="mt-16 grid grid-cols-2 md:grid-cols-3 gap-8 text-center">
          <div>
            <p className="text-2xl font-bold font-display text-gray-900">
              200+
            </p>
            <p className="text-xs font-mono text-gray-500 uppercase mt-1">
              Years Guaranteed
            </p>
          </div>
          <div>
            <p className="text-2xl font-bold font-display text-gray-900">
              100%
            </p>
            <p className="text-xs font-mono text-gray-500 uppercase mt-1">
              Uptime
            </p>
          </div>
          <div className="col-span-2 md:col-span-1">
            <p className="text-2xl font-bold font-display text-gray-900">
              Global
            </p>
            <p className="text-xs font-mono text-gray-500 uppercase mt-1">
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