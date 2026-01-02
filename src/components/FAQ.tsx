import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';

interface FAQItem {
  question: string;
  answer: string;
}

const faqData: FAQItem[] = [
  {
    question: "How long will my file stay online?",
    answer: "Your file is stored permanently, not for a month or a year, but indefinitely. It's saved on a global network designed so that even if some computers disappear, your file still lives on. Think of it like putting something in hundreds of digital vaults at once."
  },
  {
    question: "Is my data private?",
    answer: "All data uploaded to our platform is publicly available. Once a file is uploaded, it can be accessed by anyone who has the link. If you're interested in private data uploads, please reach out to us and we'd be happy to discuss options for your use case."
  },
  {
    question: "Why does it cost money to upload larger files?",
    answer: "Files smaller than 100KB are free to upload (login required). For larger files, we charge a one-time fee proportional to the file size. Storing data permanently has a real cost because it's saved in many locations around the world for decades. After that one-time payment, you never pay again. No subscriptions, no rent, no renewal fees."
  },
  {
    question: "Can I delete a file after I upload it?",
    answer: "This kind of storage is designed to be forever, so files can't be deleted once published. If you're unsure, try uploading a very small file first. We also support free uploads up to 100KB (login required) so you can experiment safely."
  },
  {
    question: "What happens if your company disappears? Will I lose my files?",
    answer: "No. The files do not live on our servers. Once they're uploaded, they exist independently on the permanent storage network. Even if our website goes offline, your links and files still work. That's the power of permanent storage: no single company controls your data."
  }
];

export function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggleQuestion = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4, duration: 0.6 }}
      className="w-full max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12"
    >
      <div className="text-center mb-8 sm:mb-12">
        <h2 className="text-2xl sm:text-4xl font-bold font-display text-gray-900 mb-4">
          FAQ
        </h2>
        <p className="text-sm sm:text-base text-gray-600 font-sans">
          Common questions about permanent storage
        </p>
      </div>

      <div className="space-y-3 sm:space-y-4">
        {faqData.map((item, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 + index * 0.1 }}
            className="bg-white/80 backdrop-blur-xl rounded-xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow"
          >
            <button
              onClick={() => toggleQuestion(index)}
              className="w-full px-4 sm:px-6 py-4 sm:py-5 text-left flex items-center justify-between gap-4 hover:bg-gray-50/50 transition-colors"
            >
              <span className="text-sm sm:text-base font-medium text-gray-900 font-sans flex-1">
                {item.question}
              </span>
              <motion.div
                animate={{ rotate: openIndex === index ? 180 : 0 }}
                transition={{ duration: 0.3 }}
                className="flex-shrink-0 text-gray-400"
              >
                <ChevronDown size={20} />
              </motion.div>
            </button>
            <AnimatePresence>
              {openIndex === index && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="overflow-hidden"
                >
                  <div className="px-4 sm:px-6 pb-4 sm:pb-5 text-sm sm:text-base text-gray-600 leading-relaxed font-sans">
                    {item.answer}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}

