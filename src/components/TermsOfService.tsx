import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export function TermsOfService() {
  return (
    <div className="w-full max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
      <Link
        to="/"
        className="inline-flex items-center gap-2 text-neonPurple hover:text-neonPurple/80 transition-colors mb-8 text-sm font-medium"
      >
        <ArrowLeft size={16} />
        Back to Home
      </Link>

      <div className="bg-white/80 backdrop-blur-sm rounded-lg border border-gray-200 p-6 sm:p-8 shadow-vault">
        <h1 className="text-3xl sm:text-4xl font-bold font-display text-gray-900 mb-6">
          Terms of Service
        </h1>
        
        <div className="prose prose-sm sm:prose-base max-w-none text-gray-700 font-sans space-y-6">
          <p className="text-xs text-gray-500 italic">
            Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>

          <section>
            <h2 className="text-xl font-bold font-display text-gray-900 mt-8 mb-4">1. Acceptance of Terms</h2>
            <p>
              By accessing and using KeepThisFile ("the Service"), you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to abide by the above, please do not use this service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold font-display text-gray-900 mt-8 mb-4">2. Description of Service</h2>
            <p>
              KeepThisFile is a file storage service that enables users to upload and store files permanently on the Arweave blockchain network. The Service provides:
            </p>
            <ul className="list-disc pl-6 space-y-2 mt-2">
              <li>Free storage for files up to 100KB (login required)</li>
              <li>Paid storage for larger files (over 100KB) with payment required</li>
              <li>Permanent storage on the Arweave permaweb</li>
              <li>File management and access through a web interface</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold font-display text-gray-900 mt-8 mb-4">3. Data Storage on Arweave</h2>
            <p>
              All files uploaded through KeepThisFile are stored permanently on the Arweave blockchain network. By using this Service, you acknowledge that:
            </p>
            <ul className="list-disc pl-6 space-y-2 mt-2">
              <li>Files stored on Arweave are permanent and cannot be deleted or modified once uploaded</li>
              <li>Arweave is a decentralized blockchain network, and Not Community Labs Inc. does not control the Arweave network</li>
              <li>Files are accessible via Arweave transaction IDs and URLs</li>
              <li>You are solely responsible for ensuring you have the right to upload and permanently store any content</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold font-display text-gray-900 mt-8 mb-4">4. User Responsibilities</h2>
            <p>You agree to:</p>
            <ul className="list-disc pl-6 space-y-2 mt-2">
              <li>Only upload files for which you have the legal right to store permanently</li>
              <li>Not upload any illegal, harmful, or malicious content</li>
              <li>Not upload content that violates intellectual property rights, privacy rights, or any applicable laws</li>
              <li>Maintain the confidentiality of your account credentials</li>
              <li>Be responsible for all activities that occur under your account</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold font-display text-gray-900 mt-8 mb-4">5. Payment Terms</h2>
            <p>
              For files larger than 100KB, payment is required through our integrated payment processor (Stripe). By making a payment, you agree to:
            </p>
            <ul className="list-disc pl-6 space-y-2 mt-2">
              <li>Pay the displayed price for your file upload</li>
              <li>Understand that payments are non-refundable once the file has been uploaded to Arweave</li>
              <li>Provide accurate payment information</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold font-display text-gray-900 mt-8 mb-4">6. Prohibited Content</h2>
            <p>You may not upload content that:</p>
            <ul className="list-disc pl-6 space-y-2 mt-2">
              <li>Is illegal, harmful, or promotes illegal activities</li>
              <li>Violates intellectual property rights of others</li>
              <li>Contains malware, viruses, or other harmful code</li>
              <li>Is defamatory, harassing, or violates privacy rights</li>
              <li>Violates any applicable local, state, national, or international law</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold font-display text-gray-900 mt-8 mb-4">7. Service Availability</h2>
            <p>
              Not Community Labs Inc. strives to provide reliable service but does not guarantee uninterrupted or error-free operation. The Service may be unavailable due to maintenance, technical issues, or circumstances beyond our control.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold font-display text-gray-900 mt-8 mb-4">8. Limitation of Liability</h2>
            <p>
              To the maximum extent permitted by law, Not Community Labs Inc. shall not be liable for any indirect, incidental, special, consequential, or punitive damages, or any loss of profits or revenues, whether incurred directly or indirectly, or any loss of data, use, goodwill, or other intangible losses resulting from your use of the Service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold font-display text-gray-900 mt-8 mb-4">9. Indemnification</h2>
            <p>
              You agree to indemnify and hold harmless Not Community Labs Inc. and its officers, directors, employees, and agents from any claims, damages, losses, liabilities, and expenses (including legal fees) arising out of or relating to your use of the Service or violation of these Terms.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold font-display text-gray-900 mt-8 mb-4">10. Changes to Terms</h2>
            <p>
              Not Community Labs Inc. reserves the right to modify these Terms of Service at any time. We will notify users of any material changes by updating the "Last updated" date at the top of this page. Your continued use of the Service after such modifications constitutes acceptance of the updated terms.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold font-display text-gray-900 mt-8 mb-4">11. Termination</h2>
            <p>
              We reserve the right to suspend or terminate your access to the Service at any time, with or without cause or notice, for any reason, including violation of these Terms.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold font-display text-gray-900 mt-8 mb-4">12. Governing Law</h2>
            <p>
              These Terms shall be governed by and construed in accordance with the laws of the jurisdiction in which Not Community Labs Inc. is incorporated, without regard to its conflict of law provisions.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold font-display text-gray-900 mt-8 mb-4">13. Contact Information</h2>
            <p>
              If you have any questions about these Terms of Service, please contact us through the Service's contact mechanisms.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}

