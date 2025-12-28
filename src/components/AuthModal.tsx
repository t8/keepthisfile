import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Mail, Loader2 } from 'lucide-react';
import { requestMagicLink, getCurrentUser, setAuthToken, getAuthToken } from '../lib/api';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogin: () => void;
}

export function AuthModal({ isOpen, onClose, onLogin }: AuthModalProps) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [emailSent, setEmailSent] = useState(false);

  const handleRequestMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const result = await requestMagicLink(email);
      
      if (result.error) {
        setMessage({ type: 'error', text: result.error });
      } else {
        setEmailSent(true);
        setMessage({ type: 'success', text: 'Magic link sent! Check your email.' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to send magic link. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  // Check for auth token in URL (from magic link redirect)
  React.useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    
    if (token) {
      setAuthToken(token);
      onLogin();
      onClose();
    }
  }, [onLogin, onClose]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full p-6"
        >
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={20} />
          </button>

          <div className="mt-4">
            <h2 className="text-2xl font-bold text-gray-900 mb-2 font-display">
              Sign In
            </h2>
            <p className="text-sm text-gray-600 mb-6">
              Enter your email to receive a magic link
            </p>

            {emailSent ? (
              <div className="space-y-4">
                <div className="p-4 bg-neonGreen/10 border border-neonGreen/20 rounded-xl">
                  <p className="text-sm text-gray-900">
                    Check your email for the magic link. Click it to sign in.
                  </p>
                </div>
                <button
                  onClick={() => {
                    setEmailSent(false);
                    setEmail('');
                    setMessage(null);
                  }}
                  className="w-full px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Use Different Email
                </button>
              </div>
            ) : (
              <form onSubmit={handleRequestMagicLink} className="space-y-4">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-neonPurple focus:border-transparent"
                      placeholder="you@example.com"
                    />
                  </div>
                </div>

                {message && (
                  <div
                    className={`p-3 rounded-lg text-sm ${
                      message.type === 'success'
                        ? 'bg-neonGreen/10 text-neonGreen border border-neonGreen/20'
                        : 'bg-red-50 text-red-600 border border-red-200'
                    }`}
                  >
                    {message.text}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full px-4 py-2 bg-neonPurple text-white rounded-lg font-medium hover:bg-neonPurple/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Sending...
                    </>
                  ) : (
                    'Send Magic Link'
                  )}
                </button>
              </form>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

