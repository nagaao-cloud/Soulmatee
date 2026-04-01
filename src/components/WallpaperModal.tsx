import React, { useRef, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Smartphone, Lock, Loader2, CheckCircle2, Palette, Leaf, Compass as SoulIcon, Crown, Type as TypeIcon, RefreshCw, AlignLeft, AlignCenter, AlignRight, ChevronUp, ChevronDown, Eye, Copy, Share2, Sparkles } from 'lucide-react';
import { toPng } from 'html-to-image';
import { Quote, Language } from '../types';
import { UI_TRANSLATIONS } from '../constants';
import { generateBackgroundImage } from '../services/gemini';

interface WallpaperModalProps {
  quote: Quote;
  language: Language;
  onClose: () => void;
  isPremium: boolean;
  onUpgrade: () => void;
}

type WallpaperStyle = 'minimal' | 'nature' | 'abstract' | 'warm' | 'calm' | 'dark' | 'luxury' | 'creative';
type PreviewMode = 'raw' | 'lock' | 'home';
type TextAlignment = 'left' | 'center' | 'right';
type TextPosition = 'top' | 'center' | 'bottom';

interface FontConfig {
  id: string;
  name: string;
  class: string;
}

const FONTS: FontConfig[] = [
  { id: 'sans', name: 'fontModern', class: 'font-sans' },
  { id: 'serif', name: 'fontPremium', class: 'font-serif' },
  { id: 'mono', name: 'fontTech', class: 'font-mono' },
  { id: 'display', name: 'fontBold', class: 'font-black uppercase tracking-tighter' },
  { id: 'light', name: 'fontElegant', class: 'font-light tracking-widest' },
];

interface StyleConfig {
  id: WallpaperStyle;
  name: string;
  icon: any;
  bgClass: string;
  overlayClass?: string;
  textClass: string;
  authorClass: string;
  imageUrl?: string;
  patternSvg?: string;
  isPremium?: boolean;
}

const STYLES: StyleConfig[] = [
  {
    id: 'minimal',
    name: 'styleMinimal',
    icon: Palette,
    bgClass: 'bg-[#050505]',
    textClass: 'text-3xl font-medium',
    authorClass: 'text-white/30 font-black uppercase tracking-[0.4em] text-[10px]'
  },
  {
    id: 'nature',
    name: 'styleNature',
    icon: Leaf,
    bgClass: 'bg-cover bg-center',
    imageUrl: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?q=80&w=1080&h=1920&auto=format&fit=crop',
    overlayClass: 'bg-black/50 backdrop-blur-[1px]',
    textClass: 'text-3xl drop-shadow-2xl font-serif italic',
    authorClass: 'text-white/60 font-bold tracking-wide'
  },
  {
    id: 'calm',
    name: 'styleCalm',
    icon: Palette,
    bgClass: 'bg-gradient-to-br from-indigo-950 via-blue-950 to-[#050505]',
    overlayClass: 'bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-from)_0%,_transparent_70%)] from-indigo-500/20',
    textClass: 'text-3xl drop-shadow-2xl text-glow',
    authorClass: 'text-indigo-400/60 font-black uppercase tracking-[0.3em] text-[10px]',
    patternSvg: `url("data:image/svg+xml,%3Csvg width='80' height='80' viewBox='0 0 80 80' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%236366f1' fill-opacity='0.05'%3E%3Cpath d='M50 50c0-5.523 4.477-10 10-10s10 4.477 10 10-4.477 10-10 10-10-4.477-10-10zM10 10c0-5.523 4.477-10 10-10s10 4.477 10 10-4.477 10-10 10-10-4.477-10-10z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
  },
  {
    id: 'warm',
    name: 'styleWarm',
    icon: Palette,
    bgClass: 'bg-gradient-to-br from-orange-950 via-pink-950 to-[#050505]',
    overlayClass: 'bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-from)_0%,_transparent_70%)] from-orange-500/20',
    textClass: 'text-3xl drop-shadow-2xl text-glow',
    authorClass: 'text-orange-400/60 font-black uppercase tracking-[0.3em] text-[10px]',
    patternSvg: `url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M11 18c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm48 25c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm-43-7c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm63 31c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM34 90c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm56-76c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM12 86c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zm66-3c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zm-46-45c.552 0 1-.448 1-1s-.448-1-1-1-1 .448-1 1 .448 1 1 1zm26 26c.552 0 1-.448 1-1s-.448-1-1-1-1 .448-1 1 .448 1 1 1zm-1-48c.552 0 1-.448 1-1s-.448-1-1-1-1 .448-1 1 .448 1 1 1zm-54 46c.552 0 1-.448 1-1s-.448-1-1-1-1 .448-1 1 .448 1 1 1zM45 6c.552 0 1-.448 1-1s-.448-1-1-1-1 .448-1 1 .448 1 1 1zm6 51c.552 0 1-.448 1-1s-.448-1-1-1-1 .448-1 1 .448 1 1 1zm-1-2c.552 0 1-.448 1-1s-.448-1-1-1-1 .448-1 1 .448 1 1 1z' fill='%23f97316' fill-opacity='0.05' fill-rule='evenodd'/%3E%3C/svg%3E")`
  },
  {
    id: 'dark',
    name: 'styleDeep',
    icon: Palette,
    bgClass: 'bg-gradient-to-br from-zinc-900 via-gray-900 to-[#050505]',
    overlayClass: 'bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-from)_0%,_transparent_70%)] from-white/5',
    textClass: 'text-3xl drop-shadow-2xl font-light tracking-tight',
    authorClass: 'text-white/20 font-black uppercase tracking-[0.5em] text-[8px]',
    patternSvg: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.03'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
  },
  {
    id: 'luxury',
    name: 'styleLuxury',
    icon: Crown,
    bgClass: 'bg-[#050505]',
    overlayClass: 'bg-[radial-gradient(circle_at_center,_var(--tw-gradient-from)_0%,_transparent_100%)] from-amber-500/20',
    textClass: 'text-amber-100/90 italic drop-shadow-[0_4px_20px_rgba(251,191,36,0.3)] text-3xl font-serif',
    authorClass: 'text-amber-500/40 font-black tracking-[0.6em] uppercase text-[8px]',
    isPremium: true
  },
  {
    id: 'creative',
    name: 'styleCreative',
    icon: RefreshCw,
    bgClass: 'bg-gradient-to-br from-orange-500 via-pink-500 to-rose-500',
    textClass: 'text-white text-4xl font-black tracking-tighter drop-shadow-2xl',
    authorClass: 'text-white/40 font-black uppercase tracking-widest text-[10px]',
    isPremium: true
  }
];

const natureImages = [
  'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?q=80&w=1080&h=1920&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?q=80&w=1080&h=1920&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1501854140801-50d01698950b?q=80&w=1080&h=1920&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1447752875215-b2761acb3c5d?q=80&w=1080&h=1920&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1472214103451-9374bd1c798e?q=80&w=1080&h=1920&auto=format&fit=crop',
];

const colorVariations = [
  'from-indigo-950 via-blue-950 to-[#050505]',
  'from-orange-950 via-pink-950 to-[#050505]',
  'from-zinc-900 via-gray-900 to-[#050505]',
  'from-emerald-950 via-teal-950 to-[#050505]',
  'from-rose-950 via-purple-950 to-[#050505]',
  'from-amber-950 via-orange-950 to-[#050505]',
];

export default function WallpaperModal({ quote, language, onClose, isPremium, onUpgrade }: WallpaperModalProps) {
  const wallpaperRef = useRef<HTMLDivElement>(null);
  const [selectedStyle, setSelectedStyle] = useState<WallpaperStyle>('minimal');
  const [selectedFont, setSelectedFont] = useState(FONTS[0].id);
  const [selectedColor, setSelectedColor] = useState(colorVariations[0]);
  const [selectedImage, setSelectedImage] = useState(natureImages[0]);
  const [customImages, setCustomImages] = useState<string[]>([]);
  const [previewMode, setPreviewMode] = useState<PreviewMode>('raw');
  const [textAlignment, setTextAlignment] = useState<TextAlignment>('center');
  const [textPosition, setTextPosition] = useState<TextPosition>('center');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [currentGeneratingStyle, setCurrentGeneratingStyle] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showCopyToast, setShowCopyToast] = useState(false);

  const t = (key: any) => UI_TRANSLATIONS[language][key as keyof typeof UI_TRANSLATIONS['en']];

  const currentStyle = useMemo(() => STYLES.find(s => s.id === selectedStyle)!, [selectedStyle]);
  const currentFont = useMemo(() => FONTS.find(f => f.id === selectedFont)!, [selectedFont]);

  const handleDownload = async (type: 'home' | 'lock') => {
    if (!wallpaperRef.current) return;
    
    setIsGenerating(true);
    const originalPadding = wallpaperRef.current.style.padding;
    
    try {
      // Adjust padding and position to simulate cropping/optimal layout for Home vs Lock screen
      // Home screen: More padding at bottom to avoid icon obstruction
      // Lock screen: More padding at top for clock
      const originalJustify = wallpaperRef.current.style.justifyContent;
      
      if (type === 'home') {
        wallpaperRef.current.style.padding = '80px 40px 160px 40px';
        // For home screen, center or top is usually better
      } else {
        wallpaperRef.current.style.padding = '240px 40px 80px 40px';
        // For lock screen, bottom or center is usually better to avoid clock
      }

      // Ensure images are loaded before capturing
      const images = Array.from(wallpaperRef.current.getElementsByTagName('img')) as HTMLImageElement[];
      await Promise.all(images.map(img => {
        if (img.complete) return Promise.resolve();
        return new Promise(resolve => { img.onload = resolve; img.onerror = resolve; });
      }));

      const dataUrl = await toPng(wallpaperRef.current, {
        width: 1080,
        height: 1920,
        pixelRatio: 2,
        style: {
          transform: 'scale(1)',
          borderRadius: '0',
        }
      });
      
      const link = document.createElement('a');
      link.download = `feelsync-${selectedStyle}-${type}-${Date.now()}.png`;
      link.href = dataUrl;
      link.click();
      
      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        onClose();
      }, 2000);
    } catch (err) {
      console.error('Failed to generate wallpaper:', err);
    } finally {
      wallpaperRef.current.style.padding = originalPadding;
      setIsGenerating(false);
    }
  };

  const handleShare = async () => {
    if (!wallpaperRef.current) return;
    
    setIsGenerating(true);
    try {
      const dataUrl = await toPng(wallpaperRef.current, {
        width: 1080,
        height: 1920,
        pixelRatio: 2,
      });
      
      const response = await fetch(dataUrl);
      const blob = await response.blob();
      const file = new File([blob], 'quote.png', { type: 'image/png' });
      
      if (navigator.share) {
        await navigator.share({
          files: [file],
          title: 'Quote',
          text: quote.text,
        });
      } else {
        // Fallback for browsers that don't support sharing files
        const link = document.createElement('a');
        link.download = `feelsync-quote-${Date.now()}.png`;
        link.href = dataUrl;
        link.click();
      }
    } catch (err) {
      console.log("Share error:", err);
      if ((err as Error).name !== "AbortError" && (err as Error).name !== "NotAllowedError") {
        console.error('Failed to share:', err);
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(quote.text);
    setShowCopyToast(true);
    setTimeout(() => setShowCopyToast(false), 2000);
  };

  const handleGenerateAIBackground = async (style: string) => {
    if (!isPremium) {
      onUpgrade();
      return;
    }

    if (!(await (window as any).aistudio.hasSelectedApiKey())) {
      await (window as any).aistudio.openSelectKey();
    }

    setIsGeneratingAI(true);
    setCurrentGeneratingStyle(style);
    try {
      const imageUrl = await generateBackgroundImage(quote.text, style);
      if (imageUrl) {
        setCustomImages(prev => [imageUrl, ...prev]);
        setSelectedImage(imageUrl);
        setSelectedStyle('nature'); // Switch to nature style to display the image
      }
    } catch (error) {
      console.error("Failed to generate AI background", error);
    } finally {
      setIsGeneratingAI(false);
      setCurrentGeneratingStyle(null);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-[#050505]/95 backdrop-blur-3xl flex flex-col items-center justify-center p-4 overflow-y-auto no-scrollbar"
    >
      <button 
        onClick={onClose}
        className="absolute top-8 right-8 p-4 bg-white/5 rounded-[1.5rem] hover:bg-white/10 transition-all z-[110] border border-white/10 active:scale-90"
      >
        <X className="w-6 h-6" />
      </button>

      <div className="w-full max-w-md space-y-10 py-12">
        <div className="text-center space-y-2">
          <h2 className="text-3xl font-black tracking-tighter text-white text-glow">{t('setAsWallpaper')}</h2>
          <p className="text-white/20 text-xs font-black uppercase tracking-[0.3em]">{t('premiumCustomization')}</p>
        </div>

        {/* Preview Container */}
        <div className="relative aspect-[9/16] w-full max-w-[280px] mx-auto rounded-[3.5rem] overflow-hidden border-[12px] border-[#111] shadow-[0_40px_100px_rgba(0,0,0,0.8)] group/preview">
          <div 
            ref={wallpaperRef}
            className={`relative w-full h-full flex flex-col p-12 overflow-hidden ${currentStyle.bgClass} ${
              (selectedStyle === 'abstract' || selectedStyle === 'minimal' || selectedStyle === 'creative' || selectedStyle === 'calm' || selectedStyle === 'warm' || selectedStyle === 'dark') ? `bg-gradient-to-br ${selectedColor}` : ''
            } ${
              textPosition === 'top' ? 'justify-start pt-32' : 
              textPosition === 'bottom' ? 'justify-end pb-32' : 
              'justify-center'
            } ${
              textAlignment === 'left' ? 'text-left items-start' : 
              textAlignment === 'right' ? 'text-right items-end' : 
              'text-center items-center'
            }`}
            style={selectedStyle === 'nature' ? { backgroundImage: `url(${selectedImage})` } : {}}
          >
            {selectedStyle === 'nature' && (
              <img 
                src={selectedImage} 
                alt="" 
                className="absolute inset-0 w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            )}
            
            {currentStyle.overlayClass && (
              <div className={`absolute inset-0 z-0 ${currentStyle.overlayClass}`} />
            )}

            {currentStyle.patternSvg && (
              <div 
                className="absolute inset-0 z-0 opacity-20 pointer-events-none mix-blend-overlay"
                style={{ backgroundImage: currentStyle.patternSvg }}
              />
            )}

            {/* Mock UI Overlays */}
            <AnimatePresence>
              {previewMode === 'lock' && (
                <motion.div 
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="absolute inset-0 z-20 flex flex-col items-center pt-16 pointer-events-none"
                >
                  <p className="text-6xl font-light text-white/90 tracking-tighter">09:41</p>
                  <p className="text-sm font-bold text-white/40 mt-2 uppercase tracking-[0.2em]">Tuesday, March 31</p>
                </motion.div>
              )}
              {previewMode === 'home' && (
                <motion.div 
                  initial={{ opacity: 0, scale: 1.1 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 1.1 }}
                  className="absolute inset-0 z-20 grid grid-cols-4 gap-4 p-8 pt-24 pointer-events-none opacity-20"
                >
                  {[...Array(20)].map((_, i) => (
                    <div key={i} className="aspect-square bg-white/40 rounded-2xl" />
                  ))}
                </motion.div>
              )}
            </AnimatePresence>

            <div className="relative z-10 space-y-8 w-full">
              <p className={`${currentStyle.textClass} ${currentFont.class} leading-[1.2] drop-shadow-2xl`}>
                "{quote.text}"
              </p>
              <div className={`w-16 h-0.5 bg-white/20 rounded-full ${textAlignment === 'left' ? 'mr-auto' : textAlignment === 'right' ? 'ml-auto' : 'mx-auto'}`} />
              <p className={`${currentStyle.authorClass} drop-shadow-md`}>
                — {quote.author}
              </p>
            </div>

            <div className="absolute bottom-12 left-0 w-full text-center opacity-10 z-10">
              <p className="text-[8px] font-black tracking-[1em] uppercase text-white">{t('appName')}</p>
            </div>
          </div>

          {/* Preview Mode Toggle Button */}
          <button 
            onClick={() => setPreviewMode(prev => prev === 'raw' ? 'lock' : prev === 'lock' ? 'home' : 'raw')}
            className="absolute top-6 right-6 z-30 p-3 bg-black/40 backdrop-blur-xl rounded-2xl text-white/80 hover:text-white transition-all border border-white/10 opacity-0 group-hover/preview:opacity-100 active:scale-90"
          >
            <Eye className="w-5 h-5" />
          </button>
        </div>

        {/* Customization Controls */}
        <div className="space-y-10 px-4">
          {/* Layout Controls */}
          <div className="grid grid-cols-2 gap-8">
            <div className="space-y-4">
              <div className="flex items-center gap-3 text-white/20">
                <AlignCenter className="w-4 h-4" />
                <span className="text-[10px] font-black uppercase tracking-[0.3em]">{t('alignment')}</span>
              </div>
              <div className="flex bg-white/5 p-1.5 rounded-2xl border border-white/10 shadow-inner">
                {(['left', 'center', 'right'] as const).map((align) => (
                  <button
                    key={align}
                    onClick={() => setTextAlignment(align)}
                    className={`flex-1 flex items-center justify-center py-3 rounded-xl transition-all ${
                      textAlignment === align ? 'bg-white text-black shadow-xl' : 'text-white/20 hover:text-white'
                    }`}
                  >
                    {align === 'left' ? <AlignLeft className="w-4 h-4" /> : align === 'center' ? <AlignCenter className="w-4 h-4" /> : <AlignRight className="w-4 h-4" />}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-3 text-white/20">
                <ChevronUp className="w-4 h-4" />
                <span className="text-[10px] font-black uppercase tracking-[0.3em]">{t('position')}</span>
              </div>
              <div className="flex bg-white/5 p-1.5 rounded-2xl border border-white/10 shadow-inner">
                {(['top', 'center', 'bottom'] as const).map((pos) => (
                  <button
                    key={pos}
                    onClick={() => setTextPosition(pos)}
                    className={`flex-1 flex items-center justify-center py-3 rounded-xl transition-all ${
                      textPosition === pos ? 'bg-white text-black shadow-xl' : 'text-white/20 hover:text-white'
                    }`}
                  >
                    {pos === 'top' ? <ChevronUp className="w-4 h-4" /> : pos === 'center' ? <AlignCenter className="w-4 h-4 rotate-90" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Font Selector */}
          <div className="space-y-4">
            <div className="flex items-center gap-3 text-white/20">
              <TypeIcon className="w-4 h-4" />
              <span className="text-[10px] font-black uppercase tracking-[0.3em]">{t('typography')}</span>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-4 no-scrollbar">
              {FONTS.map((font) => (
                <button
                  key={font.id}
                  onClick={() => setSelectedFont(font.id)}
                  className={`flex-shrink-0 px-6 py-3 rounded-2xl border transition-all active:scale-95 ${
                    selectedFont === font.id
                      ? 'bg-white text-black border-white shadow-xl'
                      : 'bg-white/5 border-white/10 text-white/40 hover:bg-white/10'
                  }`}
                >
                  <span className={`text-xs font-black uppercase tracking-widest ${font.class}`}>{t(font.name)}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Style Selector */}
          <div className="space-y-4">
            <div className="flex items-center gap-3 text-white/20">
              <Palette className="w-4 h-4" />
              <span className="text-[10px] font-black uppercase tracking-[0.3em]">{t('styleAtmosphere')}</span>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-4 no-scrollbar">
              {STYLES.map((style) => {
                const Icon = style.icon;
                const isLocked = style.isPremium && !isPremium;
                return (
                  <button
                    key={style.id}
                    onClick={() => {
                      if (isLocked) {
                        onUpgrade();
                      } else {
                        setSelectedStyle(style.id);
                      }
                    }}
                    className={`flex-shrink-0 flex items-center gap-3 px-6 py-4 rounded-2xl border transition-all active:scale-95 relative ${
                      selectedStyle === style.id 
                        ? 'bg-orange-500 border-orange-400 text-white shadow-[0_10px_30px_rgba(249,115,22,0.3)]' 
                        : 'bg-white/5 border-white/10 text-white/40 hover:bg-white/10'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="text-xs font-black uppercase tracking-[0.2em]">{t(style.name)}</span>
                    {isLocked && (
                      <div className="absolute -top-2 -right-2 w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center shadow-lg border-2 border-[#111]">
                        <Lock className="w-3 h-3 text-white" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* AI Background Generator */}
          <div className="space-y-4">
            <div className="flex items-center gap-3 text-white/20">
              <Sparkles className="w-4 h-4" />
              <span className="text-[10px] font-black uppercase tracking-[0.3em]">{t('aiBackground') || 'AI Background'}</span>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-4 no-scrollbar">
              {(['abstract', 'serene', 'vibrant'] as const).map((aiStyle) => {
                const isLocked = !isPremium;
                return (
                  <button
                    key={aiStyle}
                    onClick={() => handleGenerateAIBackground(aiStyle)}
                    disabled={isGeneratingAI}
                    className={`flex-shrink-0 flex items-center gap-3 px-6 py-4 rounded-2xl border transition-all active:scale-95 relative ${
                      isGeneratingAI && currentGeneratingStyle === aiStyle
                        ? 'bg-orange-500/20 border-orange-500/50 text-orange-400'
                        : isLocked
                          ? 'bg-white/5 border-white/5 text-white/20 hover:bg-white/5'
                          : 'bg-white/5 border-white/10 text-white/40 hover:bg-white/10'
                    }`}
                  >
                    {isGeneratingAI && currentGeneratingStyle === aiStyle ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Sparkles className="w-4 h-4" />
                    )}
                    <span className="text-xs font-black uppercase tracking-[0.2em]">
                      {isGeneratingAI && currentGeneratingStyle === aiStyle ? t('generating') : t(`style${aiStyle.charAt(0).toUpperCase() + aiStyle.slice(1)}`) || aiStyle}
                    </span>
                    {isLocked && (
                      <div className="absolute -top-2 -right-2 flex items-center gap-1 bg-orange-500 px-2 py-0.5 rounded-full shadow-lg border-2 border-[#111]">
                        <Lock className="w-3 h-3 text-white" />
                        <span className="text-[8px] font-black text-white uppercase">Premium</span>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Contextual Options (Colors or Images) */}
          <AnimatePresence mode="wait">
            {(selectedStyle === 'abstract' || selectedStyle === 'minimal' || selectedStyle === 'creative' || selectedStyle === 'calm' || selectedStyle === 'warm' || selectedStyle === 'dark') && (
              <motion.div 
                key="colors"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex justify-center gap-4"
              >
                {colorVariations.map((color, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedColor(color)}
                    className={`w-10 h-10 rounded-full border-2 transition-all bg-gradient-to-br ${color} active:scale-90 ${
                      selectedColor === color ? 'border-white scale-125 shadow-2xl shadow-white/20' : 'border-white/10'
                    }`}
                  />
                ))}
              </motion.div>
            )}

            {selectedStyle === 'nature' && (
              <motion.div 
                key="images"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex justify-center gap-4 overflow-x-auto pb-4 no-scrollbar"
              >
                {[...customImages, ...natureImages].map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedImage(img)}
                    className={`flex-shrink-0 w-16 h-16 rounded-2xl border-2 overflow-hidden transition-all active:scale-90 ${
                      selectedImage === img ? 'border-white scale-110 shadow-2xl' : 'border-transparent opacity-40'
                    }`}
                  >
                  <div className="relative w-full h-full">
                    <img src={img} alt="" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noiseFilter\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.65\' numOctaves=\'3\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noiseFilter)\'/%3E%3C/svg%3E")' }}></div>
                  </div>
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-1 gap-4 px-4">
          <button
            onClick={handleShare}
            disabled={isGenerating}
            className="flex items-center justify-center gap-4 py-6 bg-orange-500 backdrop-blur-xl border border-orange-400 rounded-[2rem] hover:bg-orange-600 transition-all group active:scale-95 disabled:opacity-30 shadow-lg"
          >
            <Share2 className="w-5 h-5 text-white" />
            <span className="text-xs font-black uppercase tracking-[0.3em] text-white">{t('shareImage')}</span>
          </button>
          
          <button
            onClick={copyToClipboard}
            className="flex items-center justify-center gap-4 py-6 bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2rem] hover:bg-white/10 transition-all group active:scale-95 shadow-lg"
          >
            <Copy className="w-5 h-5 text-orange-500" />
            <span className="text-xs font-black uppercase tracking-[0.3em] text-white/60 group-hover:text-white">{t('copyText')}</span>
          </button>
        </div>

        <div className="grid grid-cols-2 gap-6 px-4">
          <button
            onClick={() => handleDownload('home')}
            disabled={isGenerating}
            className="flex flex-col items-center justify-center gap-4 p-8 bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2.5rem] hover:bg-white/10 transition-all group disabled:opacity-30 active:scale-95 shadow-lg"
          >
            <Smartphone className="w-6 h-6 text-orange-500" />
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40 group-hover:text-white">{t('homeScreen')}</span>
          </button>

          <button
            onClick={() => handleDownload('lock')}
            disabled={isGenerating}
            className="flex flex-col items-center justify-center gap-4 p-8 bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2.5rem] hover:bg-white/10 transition-all group disabled:opacity-30 active:scale-95 shadow-lg"
          >
            <Lock className="w-6 h-6 text-orange-500" />
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40 group-hover:text-white">{t('lockScreen')}</span>
          </button>
        </div>
      </div>

      {/* Generating Overlay */}
      <AnimatePresence>
        {isGenerating && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[120] bg-[#050505]/90 backdrop-blur-2xl flex flex-col items-center justify-center space-y-6"
          >
            <div className="relative">
              <Loader2 className="w-16 h-16 text-orange-500 animate-spin" />
              <div className="absolute inset-0 bg-orange-500/20 blur-2xl rounded-full animate-pulse" />
            </div>
            <p className="text-xl font-black tracking-tighter text-white animate-pulse uppercase tracking-[0.2em]">{t('downloading')}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Success Overlay */}
      <AnimatePresence>
        {showCopyToast && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-12 left-1/2 -translate-x-1/2 z-[130] bg-orange-500 text-white px-10 py-5 rounded-full shadow-[0_20px_50px_rgba(249,115,22,0.4)] flex items-center gap-4"
          >
            <CheckCircle2 className="w-6 h-6" />
            <span className="font-black uppercase tracking-widest text-xs">{t('copied')}</span>
          </motion.div>
        )}
        {showSuccess && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="fixed inset-0 z-[120] bg-[#050505]/90 backdrop-blur-2xl flex flex-col items-center justify-center space-y-8"
          >
            <motion.div 
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="w-32 h-32 bg-orange-500 rounded-full flex items-center justify-center shadow-[0_0_60px_rgba(249,115,22,0.5)]"
            >
              <CheckCircle2 className="w-16 h-16 text-white" />
            </motion.div>
            <p className="text-3xl font-black tracking-tighter text-white text-glow">{t('wallpaperSaved')}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
