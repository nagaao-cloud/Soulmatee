import React from 'react';
import { motion } from 'motion/react';
import { X } from 'lucide-react';

interface LegalModalProps {
  title: string;
  content: string;
  onClose: () => void;
}

export default function LegalModal({ title, content, onClose }: LegalModalProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-[#111] border border-white/10 rounded-3xl w-full max-w-lg max-h-[80vh] flex flex-col overflow-hidden shadow-2xl"
      >
        <div className="p-6 border-b border-white/10 flex justify-between items-center shrink-0">
          <h3 className="text-xl font-bold text-white">{title}</h3>
          <button
            onClick={onClose}
            className="p-2 bg-white/5 rounded-full hover:bg-white/10 text-white/50 hover:text-white transition-colors active:scale-95"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 overflow-y-auto text-white/70 space-y-4 text-sm leading-relaxed scrollbar-hide">
          {content.split('\n').map((paragraph, i) => (
            <p key={i} className={paragraph.startsWith(String(Number(paragraph[0]))) ? "font-bold text-white mt-6" : ""}>
              {paragraph}
            </p>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}
