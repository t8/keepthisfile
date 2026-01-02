import React from 'react';
import { Link } from 'react-router-dom';
import { ExternalLink } from 'lucide-react';

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="relative z-10 w-full border-t border-gray-200 bg-white/50 backdrop-blur-sm mt-auto">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-gray-600">
          <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4">
            <p className="font-sans">
              © {currentYear} Not Community Labs Inc. All rights reserved.
            </p>
            <Link
              to="/terms"
              className="text-neonPurple hover:text-neonPurple/80 transition-colors font-medium"
            >
              Terms of Service
            </Link>
          </div>
          <div className="flex items-center gap-2 text-xs sm:text-sm">
            <span className="font-sans">Data stored on</span>
            <a
              href="https://arweave.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-neonPurple hover:text-neonPurple/80 transition-colors font-medium flex items-center gap-1"
            >
              Arweave
              <ExternalLink size={14} className="inline" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}

