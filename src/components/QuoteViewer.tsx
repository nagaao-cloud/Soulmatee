import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence, PanInfo } from 'motion/react';
import { 
  Heart, 
  Copy, 
  Share2, 
  X,
  Sparkles,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { Quote, Language } from '../types';
import { UI_TRANSLATIONS } from '../constants';

interface QuoteViewerProps {
  quotes: Quote[];
  initialIndex?: number;
  currentLang: Language;
  onClose: () => void;
  onToggleFavorite: (quote: Quote) => void;
  isFavorite: (quote: Quote) => boolean;
  onCopy: (text: string) => void;
  onShare: (quote: Quote) => void;
}

const swipeConfidenceThreshold = 2000;
const swipePower = (offset: number, velocity: number) => {
  return offset * velocity;
};

export default function QuoteViewer({
  quotes,
  initialIndex = 0,
  currentLang,
  onClose,
  onToggleFavorite,
  isFavorite,
  onCopy,
  onShare
}: QuoteViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [[page, direction], setPage] = useState([initialIndex, 0]);

  if (!quotes || quotes.length === 0) return null;

  const t = (key: keyof typeof UI_TRANSLATIONS['en']) => 
    UI_TRANSLATIONS[currentLang]?.[key] || UI_TRANSLATIONS['en'][key];

  const paginate = (newDirection: number) => {
    const nextIndex = currentIndex + newDirection;
    if (nextIndex >= 0 && nextIndex < quotes.length) {
      setPage([nextIndex, newDirection]);
      setCurrentIndex(nextIndex);
    }
  };

  const quote = quotes[currentIndex];

  const variants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 1000 : -1000,
      opacity: 0,
      scale: 0.9
    }),
    center: {
      zIndex: 1,
      x: 0,
      opacity: 1,
      scale: 1
    },
    exit: (direction: number) => ({
      zIndex: 0,
      x: direction < 0 ? 1000 : -1000,
      opacity: 0,
      scale: 0.9
    })
  };

  const backgrounds = [
    "from-indigo-950 via-blue-900 to-black",
    "from-orange-950 via-pink-900 to-black",
    "from-emerald-950 via-teal-900 to-black",
    "from-purple-950 via-fuchsia-900 to-black",
    "from-rose-950 via-red-900 to-black"
  ];

  const currentBg = backgrounds[currentIndex % backgrounds.length];

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-black overflow-hidden flex flex-col"
    >
      {/* Background Layer */}
      <div className={`absolute inset-0 bg-gradient-to-br ${currentBg} transition-colors duration-1000`} />
      
      <div className="absolute inset-0 opacity-40">
        <img 
          key={quote.id}
          src={`https://picsum.photos/seed/${quote.id}/1200/1800?blur=10`}
          alt=""
          className="w-full h-full object-cover"
          referrerPolicy="no-referrer"
        />
      </div>
      
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />

      {/* Header */}
      <header className="relative z-10 p-6 flex justify-between items-center">
        <button 
          onClick={onClose}
          className="p-3 bg-white/10 backdrop-blur-xl rounded-2xl text-white/70 hover:text-white transition-all active:scale-90 border border-white/10"
        >
          <X className="w-6 h-6" />
        </button>
        <div className="flex items-center gap-2 px-4 py-2 bg-white/5 backdrop-blur-xl rounded-full border border-white/10">
          <Sparkles className="w-4 h-4 text-orange-500" />
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/60">
            {currentIndex + 1} / {quotes.length}
          </span>
        </div>
      </header>

      {/* Quote Content */}
      <main className="relative z-10 flex-1 flex items-center justify-center p-8">
        <div className="relative w-full max-w-2xl aspect-[3/4] flex items-center justify-center">
          <AnimatePresence initial={false} custom={direction} mode="wait">
            <motion.div
              key={currentIndex}
              custom={direction}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{
                x: { type: "spring", stiffness: 300, damping: 30 },
                opacity: { duration: 0.2 }
              }}
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={1}
              whileDrag={{ scale: 0.95, opacity: 0.8 }}
              onDragEnd={(e, { offset, velocity }) => {
                const swipe = swipePower(offset.x, velocity.x);
                if (swipe < -swipeConfidenceThreshold) {
                  paginate(1);
                } else if (swipe > swipeConfidenceThreshold) {
                  paginate(-1);
                }
              }}
              className="absolute inset-0 flex flex-col items-center justify-center text-center space-y-8 cursor-grab active:cursor-grabbing"
            >
              <div className="space-y-6 px-4">
                <motion.p 
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="text-4xl sm:text-5xl md:text-6xl font-serif font-semibold leading-snug text-white tracking-tight text-glow drop-shadow-[0_4px_16px_rgba(0,0,0,1)]"
                >
                  "{quote.text}"
                </motion.p>
                <motion.div 
                  initial={{ y: 10, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="space-y-2"
                >
                  <div className="w-12 h-0.5 bg-orange-500 mx-auto rounded-full opacity-50" />
                  <p className="text-xl text-white/60 font-light italic">— {quote.author}</p>
                </motion.div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Navigation Arrows (Desktop) */}
        <div className="hidden md:block">
          {currentIndex > 0 && (
            <button 
              onClick={() => paginate(-1)}
              className="absolute left-8 top-1/2 -translate-y-1/2 p-4 bg-white/5 hover:bg-white/10 backdrop-blur-xl rounded-full text-white/40 hover:text-white transition-all border border-white/10"
            >
              <ChevronLeft className="w-8 h-8" />
            </button>
          )}
          {currentIndex < quotes.length - 1 && (
            <button 
              onClick={() => paginate(1)}
              className="absolute right-8 top-1/2 -translate-y-1/2 p-4 bg-white/5 hover:bg-white/10 backdrop-blur-xl rounded-full text-white/40 hover:text-white transition-all border border-white/10"
            >
              <ChevronRight className="w-8 h-8" />
            </button>
          )}
        </div>
      </main>

      {/* Footer Actions */}
      <footer className="relative z-10 p-12 flex flex-col items-center space-y-12">
        <div className="flex items-center gap-6">
          <button 
            onClick={() => onCopy(quote.text)}
            className="p-5 bg-white/5 hover:bg-white/10 backdrop-blur-2xl rounded-3xl text-white/40 hover:text-white border border-white/10 transition-all active:scale-90"
            title="Copy"
          >
            <Copy className="w-6 h-6" />
          </button>
          
          <button 
            onClick={() => onToggleFavorite(quote)}
            className={`p-6 backdrop-blur-2xl rounded-[2rem] transition-all border active:scale-90 shadow-2xl ${
              isFavorite(quote)
                ? 'text-orange-500 bg-orange-500/10 border-orange-500/30' 
                : 'bg-white/5 border-white/10 text-white/40 hover:text-white hover:bg-white/10'
            }`}
          >
            <Heart className={`w-8 h-8 ${isFavorite(quote) ? 'fill-current' : ''}`} />
          </button>

          <button 
            onClick={() => onShare(quote)}
            className="p-5 bg-orange-500/10 hover:bg-orange-500/20 backdrop-blur-2xl rounded-3xl text-orange-500 hover:text-orange-400 border border-orange-500/30 transition-all active:scale-90"
            title="Share"
          >
            <Share2 className="w-6 h-6" />
          </button>
        </div>

        {/* Watermark */}
        <div className="opacity-20 flex flex-col items-center space-y-1">
          <span className="text-[10px] font-black uppercase tracking-[0.8em] text-white">
            FeelSync
          </span>
          <div className="w-8 h-px bg-white/30" />
        </div>
      </footer>
    </motion.div>
  );
}
