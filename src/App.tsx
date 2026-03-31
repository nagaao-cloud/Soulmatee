import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Heart, 
  CloudRain, 
  Zap, 
  Trophy, 
  Compass, 
  Users, 
  BookOpen, 
  Moon,
  Copy,
  Share2,
  Star,
  ChevronLeft,
  Languages,
  Loader2,
  RefreshCw,
  Sparkles,
  Search,
  CheckCircle2,
  TrendingUp,
  Shuffle,
  Image as ImageIcon
} from 'lucide-react';
import { CATEGORIES, UI_TRANSLATIONS } from './constants';
import { LANGUAGES, Language, Quote, Category, MoodAnalysis } from './types';
import { generateQuotes, analyzeMood, generateDailyQuote } from './services/gemini';
import WallpaperModal from './components/WallpaperModal';
import QuoteViewer from './components/QuoteViewer';

const iconMap: Record<string, any> = {
  Heart,
  CloudRain,
  Zap,
  Trophy,
  Compass,
  Users,
  BookOpen,
  Moon
};

export default function App() {
  const [currentLang, setCurrentLang] = useState<Language>(() => {
    const saved = localStorage.getItem('app_language');
    return (saved as Language) || 'en';
  });
  const [isFirstLaunch, setIsFirstLaunch] = useState(() => {
    return !localStorage.getItem('app_language');
  });
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(false);
  const [favorites, setFavorites] = useState<Quote[]>([]);
  const [showLangMenu, setShowLangMenu] = useState(false);
  const [moodInput, setMoodInput] = useState('');
  const [moodResult, setMoodResult] = useState<MoodAnalysis | null>(null);
  const [analyzingMood, setAnalyzingMood] = useState(false);
  const [dailyQuote, setDailyQuote] = useState<Quote | null>(null);
  const [showToast, setShowToast] = useState(false);
  const [view, setView] = useState<'home' | 'category' | 'mood' | 'favorites'>('home');
  const [wallpaperQuote, setWallpaperQuote] = useState<Quote | null>(null);
  const [streak, setStreak] = useState(0);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [includeReligious, setIncludeReligious] = useState(false);
  const [activeQuoteViewer, setActiveQuoteViewer] = useState<{ quotes: Quote[], index: number } | null>(null);

  const t = (key: keyof typeof UI_TRANSLATIONS['en']) => 
    UI_TRANSLATIONS[currentLang]?.[key] || UI_TRANSLATIONS['en'][key];
  const langConfig = LANGUAGES.find(l => l.id === currentLang)!;

  // Load favorites and streak from local storage
  useEffect(() => {
    const saved = localStorage.getItem('favorites_full');
    if (saved) setFavorites(JSON.parse(saved));
    
    const savedNotifications = localStorage.getItem('notifications_enabled');
    if (savedNotifications) setNotificationsEnabled(JSON.parse(savedNotifications));

    const savedReligious = localStorage.getItem('include_religious');
    if (savedReligious) setIncludeReligious(JSON.parse(savedReligious));

    // Streak Logic
    const lastVisit = localStorage.getItem('last_visit');
    const savedStreak = localStorage.getItem('streak_count');
    const today = new Date().toDateString();
    
    if (lastVisit === today) {
      setStreak(Number(savedStreak) || 1);
    } else {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      if (lastVisit === yesterday.toDateString()) {
        const newStreak = (Number(savedStreak) || 0) + 1;
        setStreak(newStreak);
        localStorage.setItem('streak_count', newStreak.toString());
      } else {
        setStreak(1);
        localStorage.setItem('streak_count', '1');
      }
      localStorage.setItem('last_visit', today);
    }
    
    // Fetch daily quote
    fetchDailyQuote();

    // Daily Notification Check
    const checkDailyNotification = async () => {
      const enabled = localStorage.getItem('notifications_enabled') === 'true';
      if (!enabled) return;

      const lastNotifyDate = localStorage.getItem('last_notification_date');
      const now = new Date();
      const today = now.toDateString();
      const hour = now.getHours();

      // Only notify if it's 9 AM or later and hasn't been sent today
      if (lastNotifyDate !== today && hour >= 9) {
        if ('Notification' in window && Notification.permission === 'granted') {
          // Personalization logic
          const savedMood = localStorage.getItem('last_detected_emotion');
          const favoritesCount = JSON.parse(localStorage.getItem('favorites_full') || '[]').length;
          
          let body = t('dailyQuoteNotification');
          if (savedMood) {
            body = t('notificationMood').replace('{mood}', savedMood);
          } else if (favoritesCount > 5) {
            body = t('notificationFavorites');
          }

          new Notification(t('appName'), {
            body: body,
            icon: '/favicon.ico',
            badge: '/favicon.ico'
          });
          localStorage.setItem('last_notification_date', today);
        }
      }
    };

    // Small delay to ensure translations and state are ready
    setTimeout(checkDailyNotification, 2000);
  }, [currentLang]);

  const toggleNotifications = async () => {
    if (!notificationsEnabled) {
      if ('Notification' in window) {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
          setNotificationsEnabled(true);
          localStorage.setItem('notifications_enabled', 'true');
          alert(t('notificationsEnabledMessage'));
          new Notification(t('appName'), {
            body: t('dailyQuoteNotification'),
            icon: '/favicon.ico'
          });
        } else {
          alert(t('notificationsDeniedMessage'));
        }
      } else {
        alert('Notifications not supported');
      }
    } else {
      setNotificationsEnabled(false);
      localStorage.setItem('notifications_enabled', 'false');
    }
  };

  useEffect(() => {
    if (selectedCategory) {
      fetchQuotes();
    }
  }, [selectedCategory, currentLang]);

  const fetchDailyQuote = async () => {
    const quote = await generateDailyQuote(currentLang);
    if (quote) setDailyQuote(quote);
  };

  const fetchQuotes = async () => {
    if (!selectedCategory) return;
    triggerHaptic();
    setLoading(true);
    const newQuotes = await generateQuotes(selectedCategory.id, currentLang, 10);
    setQuotes(newQuotes);
    setLoading(false);
  };

  const handleAnalyzeMood = async () => {
    if (!moodInput.trim()) return;
    triggerHaptic();
    setAnalyzingMood(true);
    setView('mood');
    const result = await analyzeMood(moodInput, currentLang, includeReligious);
    setMoodResult(result);
    if (result?.emotion) {
      localStorage.setItem('last_detected_emotion', result.emotion);
    }
    setAnalyzingMood(false);
  };

  const handleRandomQuote = async () => {
    triggerHaptic();
    setLoading(true);
    const randomCat = CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)];
    setSelectedCategory(randomCat);
    setView('category');
    const newQuotes = await generateQuotes(randomCat.id, currentLang, 1);
    setQuotes(newQuotes);
    setLoading(false);
  };

  const triggerHaptic = () => {
    if (navigator.vibrate) {
      navigator.vibrate(50);
    }
  };

  const toggleFavorite = (quote: Quote) => {
    triggerHaptic();
    const isFav = favorites.some(f => f.id === quote.id);
    const newFavs = isFav
      ? favorites.filter(f => f.id !== quote.id)
      : [...favorites, quote];
    setFavorites(newFavs);
    localStorage.setItem('favorites_full', JSON.stringify(newFavs));
  };

  const copyToClipboard = (text: string) => {
    triggerHaptic();
    navigator.clipboard.writeText(text);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 2000);
  };

  const shareQuote = async (quote: Quote) => {
    const shareText = `"${quote.text}"\n\n— ${t('appName')}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: t('appName'),
          text: shareText,
        });
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          console.error('Error sharing:', err);
        }
      }
    } else {
      copyToClipboard(shareText);
    }
  };

  const QuoteCard = ({ quote, idx }: { quote: Quote; idx: number; key?: any }) => {
    const styles = [
      { // Calm (Purple → Blue)
        container: "bg-gradient-to-br from-indigo-950/80 via-blue-950/50 to-[#050505] border-indigo-500/30 shadow-[0_20px_80px_rgba(99,102,241,0.15)]",
        accent: "text-indigo-400",
        glow: "bg-indigo-500/20",
        patternSvg: `url("data:image/svg+xml,%3Csvg width='80' height='80' viewBox='0 0 80 80' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%236366f1' fill-opacity='0.05'%3E%3Cpath d='M50 50c0-5.523 4.477-10 10-10s10 4.477 10 10-4.477 10-10 10-10-4.477-10-10zM10 10c0-5.523 4.477-10 10-10s10 4.477 10 10-4.477 10-10 10-10-4.477-10-10z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
      },
      { // Warm (Orange → Pink)
        container: "bg-gradient-to-br from-orange-950/80 via-pink-950/50 to-[#050505] border-orange-500/30 shadow-[0_20px_80px_rgba(249,115,22,0.15)]",
        accent: "text-orange-400",
        glow: "bg-orange-500/20",
        patternSvg: `url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M11 18c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm48 25c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm-43-7c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm63 31c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM34 90c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm56-76c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM12 86c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zm66-3c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zm-46-45c.552 0 1-.448 1-1s-.448-1-1-1-1 .448-1 1 .448 1 1 1zm26 26c.552 0 1-.448 1-1s-.448-1-1-1-1 .448-1 1 .448 1 1 1zm-1-48c.552 0 1-.448 1-1s-.448-1-1-1-1 .448-1 1 .448 1 1 1zm-54 46c.552 0 1-.448 1-1s-.448-1-1-1-1 .448-1 1 .448 1 1 1zM45 6c.552 0 1-.448 1-1s-.448-1-1-1-1 .448-1 1 .448 1 1 1zm6 51c.552 0 1-.448 1-1s-.448-1-1-1-1 .448-1 1 .448 1 1 1zm-1-2c.552 0 1-.448 1-1s-.448-1-1-1-1 .448-1 1 .448 1 1 1z' fill='%23f97316' fill-opacity='0.05' fill-rule='evenodd'/%3E%3C/svg%3E")`
      },
      { // Deep (Dark Black → Grey)
        container: "bg-gradient-to-br from-zinc-900/80 via-gray-900/50 to-[#050505] border-white/10 shadow-[0_20px_80px_rgba(0,0,0,0.5)]",
        accent: "text-white/60",
        glow: "bg-white/10",
        patternSvg: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.03'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
      }
    ];

    const style = styles[idx % styles.length];

    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: idx * 0.1, duration: 0.5 }}
        onClick={() => {
          let list = quotes;
          if (view === 'favorites') list = favorites;
          else if (view === 'mood') list = moodResult?.quotes || [];
          else if (view === 'home' && dailyQuote) list = [dailyQuote];
          
          setActiveQuoteViewer({ quotes: list, index: idx });
        }}
        className={`p-12 ${style.container} border rounded-[3.5rem] space-y-12 relative group overflow-hidden cursor-pointer`}
      >
        {/* Dynamic Glow Orb */}
        <div className={`absolute -top-32 -right-32 w-80 h-80 ${style.glow} blur-[120px] rounded-full pointer-events-none group-hover:scale-150 transition-transform duration-[2s]`} />
        
        {/* Abstract Pattern Overlay */}
        <div className="absolute inset-0 pointer-events-none mix-blend-overlay" 
             style={{ backgroundImage: style.patternSvg }} 
        />
        
        {/* Nature Background (Subtle & Atmospheric) */}
        <div className="absolute inset-0 opacity-[0.08] pointer-events-none mix-blend-soft-light group-hover:scale-110 transition-transform duration-[10s] ease-out">
          <img 
            src={`https://picsum.photos/seed/${quote.id}-nature/1200/800?grayscale&blur=5`} 
            alt="" 
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col items-center text-center space-y-12">
          <div className="space-y-8 w-full">
            <Sparkles className={`w-8 h-8 ${style.accent} opacity-30 mx-auto`} />
            <button 
              onClick={(e) => {
                e.stopPropagation();
                copyToClipboard(quote.text);
              }}
              className="group/text relative active:scale-[0.99] transition-transform w-full"
            >
              <p className="text-3xl sm:text-4xl md:text-5xl font-serif font-medium leading-[1.2] text-white/95 tracking-tight text-glow drop-shadow-2xl">
                "{quote.text}"
              </p>
              <div className="mt-6 opacity-0 group-hover/text:opacity-40 transition-opacity flex justify-center">
                <Copy className="w-4 h-4 text-white" />
              </div>
            </button>
          </div>

          <div className="flex flex-col items-center space-y-8 w-full">
            <div className="space-y-2">
              <div className={`w-12 h-0.5 ${style.accent} bg-current opacity-20 mx-auto rounded-full`} />
              <p className="text-xl text-white/70 font-light tracking-wide italic">— {quote.author}</p>
            </div>

            <div className="flex items-center gap-3">
              {[
                { icon: Copy, action: () => copyToClipboard(quote.text), title: 'Copy' },
                { icon: Share2, action: () => shareQuote(quote), title: 'Share' },
                { icon: ImageIcon, action: () => setWallpaperQuote(quote), title: t('setAsWallpaper') },
              ].map((btn, i) => (
                <button 
                  key={i}
                  onClick={(e) => {
                    e.stopPropagation();
                    btn.action();
                  }}
                  title={btn.title}
                  className="p-4 bg-white/5 hover:bg-white/10 backdrop-blur-2xl rounded-2xl transition-all text-white/40 hover:text-white border border-white/10 hover:border-white/20 active:scale-90 shadow-lg hover:shadow-white/5"
                >
                  <btn.icon className="w-5 h-5" />
                </button>
              ))}
              
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  toggleFavorite(quote);
                }}
                className={`p-4 backdrop-blur-2xl rounded-2xl transition-all border active:scale-90 shadow-lg ${
                  favorites.some(f => f.id === quote.id) 
                    ? 'text-orange-500 bg-orange-500/10 border-orange-500/30 shadow-[0_0_30px_rgba(249,115,22,0.2)]' 
                    : 'bg-white/5 border-white/10 text-white/40 hover:text-white hover:bg-white/10'
                }`}
              >
                <Star className={`w-5 h-5 ${favorites.some(f => f.id === quote.id) ? 'fill-current' : ''}`} />
              </button>
            </div>
          </div>
        </div>

        {/* Branding */}
        <div className="absolute bottom-8 left-0 w-full flex justify-center opacity-10 pointer-events-none">
          <span className="text-[10px] font-black uppercase tracking-[1em] text-white">
            {t('appName')}
          </span>
        </div>
      </motion.div>
    );
  };

  const handleLanguageSelect = (langId: Language) => {
    setCurrentLang(langId);
    localStorage.setItem('app_language', langId);
    setIsFirstLaunch(false);
  };

  if (isFirstLaunch) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white font-sans flex flex-col items-center justify-center p-6 overflow-y-auto">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md space-y-8 py-12"
        >
          <div className="text-center space-y-4">
            <div className="w-20 h-20 bg-orange-500/10 rounded-3xl flex items-center justify-center text-orange-500 mx-auto shadow-inner">
              <Languages className="w-10 h-10" />
            </div>
            <h1 className="text-3xl font-black tracking-tight">{t('chooseLanguage')}</h1>
            <p className="text-white/40 font-medium">{t('selectLanguageSub')}</p>
          </div>

          <div className="grid grid-cols-1 gap-3 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
            {LANGUAGES.map((lang) => (
              <button
                key={lang.id}
                onClick={() => handleLanguageSelect(lang.id)}
                className="w-full p-5 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-between hover:bg-white/10 hover:border-orange-500/50 transition-all group"
              >
                <div className="flex items-center gap-4">
                  <span className="text-2xl">{lang.flag}</span>
                  <span className="text-lg font-bold tracking-tight group-hover:text-orange-500 transition-colors">
                    {lang.name}
                  </span>
                </div>
                <div className="w-6 h-6 rounded-full border-2 border-white/10 group-hover:border-orange-500/50" />
              </button>
            ))}
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div 
      className="min-h-screen bg-premium-dark text-white font-sans selection:bg-orange-500/30 overflow-x-hidden"
      dir={langConfig.dir}
    >
      {/* Toast Notification */}
      <AnimatePresence>
        {showToast && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] bg-orange-500 text-white px-8 py-4 rounded-full shadow-[0_10px_40px_rgba(249,115,22,0.3)] flex items-center gap-3"
          >
            <CheckCircle2 className="w-5 h-5" />
            <span className="font-bold tracking-tight">{t('copied')}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#050505]/40 backdrop-blur-2xl border-b border-white/5 px-6 py-5 flex justify-between items-center">
        <div className="flex items-center gap-4">
          {view !== 'home' && (
            <button 
              onClick={() => {
                setView('home');
                setSelectedCategory(null);
                setMoodResult(null);
              }}
              className="p-3 hover:bg-white/5 rounded-2xl transition-all active:scale-90 border border-transparent hover:border-white/10"
            >
              <ChevronLeft className={`w-6 h-6 ${langConfig.dir === 'rtl' ? 'rotate-180' : ''}`} />
            </button>
          )}
          <div className="flex flex-col">
            {/* Streak removed */}
            <h1 className="text-2xl font-black tracking-tighter text-glow">
              {view === 'category' && selectedCategory ? selectedCategory.name[currentLang] : t('appName')}
            </h1>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setView('favorites')}
            className={`p-3 hover:bg-white/5 rounded-2xl transition-all active:scale-90 border border-transparent hover:border-white/10 ${view === 'favorites' ? 'text-orange-500 bg-orange-500/5 border-orange-500/20' : 'text-white/40'}`}
          >
            <Star className={`w-6 h-6 ${view === 'favorites' ? 'fill-current' : ''}`} />
          </button>
          
          <div className="relative">
            <button 
              onClick={() => setShowLangMenu(!showLangMenu)}
              className="flex items-center gap-2 bg-white/5 px-4 py-2 rounded-2xl hover:bg-white/10 transition-all border border-white/10 active:scale-95"
            >
              <Languages className="w-4 h-4 text-orange-500" />
              <span className="text-xs font-bold uppercase tracking-widest">
                {langConfig.id}
              </span>
            </button>

            <AnimatePresence>
              {showLangMenu && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className={`absolute ${langConfig.dir === 'rtl' ? 'left-0' : 'right-0'} mt-2 w-56 bg-[#1a1a1a] border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-50`}
                >
                  <div className="p-2 border-b border-white/5">
                    <button
                      onClick={toggleNotifications}
                      className="w-full px-4 py-3 text-left hover:bg-white/5 transition-colors flex flex-col gap-2"
                    >
                      <div className="flex items-center justify-between w-full text-white/70">
                        <div className="flex items-center gap-3">
                          <Zap className={`w-4 h-4 ${notificationsEnabled ? 'text-orange-500 fill-current' : 'text-white/40'}`} />
                          <span className="text-sm">{t('notifications')}</span>
                        </div>
                        <div className={`w-10 h-5 rounded-full transition-all duration-300 ease-in-out relative ${notificationsEnabled ? 'bg-orange-500 shadow-[0_0_15px_rgba(249,115,22,0.5)]' : 'bg-white/10'}`}>
                          <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all duration-300 ease-in-out ${notificationsEnabled ? 'left-[22px]' : 'left-0.5'}`} />
                        </div>
                      </div>
                      <AnimatePresence>
                        {notificationsEnabled && (
                          <motion.p 
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="text-orange-500/70 text-[10px] uppercase tracking-widest font-black pl-7"
                          >
                            Daily inspiration enabled
                          </motion.p>
                        )}
                      </AnimatePresence>
                    </button>
                  </div>
                  {LANGUAGES.map((lang) => (
                    <button
                      key={lang.id}
                      onClick={() => {
                        setCurrentLang(lang.id);
                        localStorage.setItem('app_language', lang.id);
                        setShowLangMenu(false);
                      }}
                      className={`w-full px-4 py-3 text-left hover:bg-white/5 transition-colors flex items-center justify-between ${currentLang === lang.id ? 'text-orange-500' : 'text-white/70'}`}
                    >
                      <span>{lang.name}</span>
                      <span className="text-lg">{lang.flag}</span>
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto p-6 pb-24">
        {view === 'home' && (
          <div className="space-y-10">
            {/* Mood Analysis Section removed */}
            {/* Daily Quote */}
            {dailyQuote && (
              <section className="space-y-6">
                <div className="flex items-center justify-between px-2">
                  <div className="flex items-center gap-3 text-white/40">
                    <TrendingUp className="w-5 h-5" />
                    <h2 className="text-xs font-black uppercase tracking-[0.4em]">{t('dailyQuote')}</h2>
                  </div>
                  <div className="w-24 h-px bg-gradient-to-r from-white/10 to-transparent" />
                </div>
                <QuoteCard quote={dailyQuote} idx={0} />
              </section>
            )}

            {/* Categories */}
            <section className="space-y-8">
              <header className="space-y-2 px-2">
                <h2 className="text-3xl font-black text-white tracking-tighter text-glow">{t('categories')}</h2>
                <p className="text-white/30 text-sm font-medium tracking-wide">{t('exploreWisdom')}</p>
              </header>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {CATEGORIES.map((cat) => {
                  const Icon = iconMap[cat.icon];
                  const emotionalEmojis: Record<string, string> = {
                    love: '❤️',
                    sadness: '😢',
                    success: '🚀',
                    motivation: '🔥'
                  };
                  return (
                    <motion.button
                      key={cat.id}
                      whileHover={{ scale: 1.03, y: -8 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => {
                        setSelectedCategory(cat);
                        setView('category');
                      }}
                      className="group relative p-10 bg-white/5 border border-white/5 rounded-[3rem] text-left overflow-hidden transition-all hover:bg-white/10 hover:border-orange-500/30 hover:shadow-[0_30px_60px_rgba(249,115,22,0.1)]"
                    >
                      <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity">
                        <Icon className="w-40 h-40" />
                      </div>
                      <div className="relative z-10 space-y-8">
                        <div className="w-16 h-16 bg-white/5 rounded-[1.5rem] flex items-center justify-center text-white/40 group-hover:bg-orange-500 group-hover:text-white transition-all duration-500 shadow-xl border border-white/10">
                          <Icon className="w-8 h-8" />
                        </div>
                        <div className="space-y-3">
                          <h3 className="text-2xl font-black tracking-tight flex items-center gap-2">
                            {cat.name[currentLang]}
                            <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                              {emotionalEmojis[cat.id]}
                            </span>
                          </h3>
                          <p className="text-white/40 text-[10px] uppercase tracking-[0.2em] font-black leading-relaxed">
                            {cat.description[currentLang]}
                          </p>
                        </div>
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            </section>

            {/* Random Quote Button */}
            <button 
              onClick={handleRandomQuote}
              className="w-full py-6 bg-white/5 border border-white/10 rounded-[2.5rem] text-white/40 hover:text-white hover:bg-white/10 transition-all flex items-center justify-center gap-4 font-black uppercase tracking-[0.3em] text-xs group active:scale-95"
            >
              <Shuffle className="w-5 h-5 group-hover:rotate-180 transition-transform duration-700" />
              {t('randomQuote')}
            </button>
          </div>
        )}

        {view === 'category' && selectedCategory && (
          <div className="space-y-10">
            <div className="text-center space-y-2">
              <h2 className="text-4xl font-black uppercase tracking-[0.2em] text-white">
                {selectedCategory.name[currentLang]}
              </h2>
              <p className="text-xs text-white/40 uppercase tracking-[0.4em] font-black">
                {selectedCategory.description[currentLang]}
              </p>
            </div>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-orange-500/5 border border-orange-500/10 p-10 rounded-[3rem] shadow-inner"
            >
              <p className="text-orange-500/80 text-xl font-serif italic text-center leading-relaxed">
                {selectedCategory.abstractMeaning[currentLang]}
              </p>
            </motion.div>

            {loading ? (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center py-32 space-y-6"
              >
                <div className="relative">
                  <Loader2 className="w-12 h-12 text-orange-500 animate-spin" />
                  <div className="absolute inset-0 bg-orange-500/20 blur-xl rounded-full animate-pulse" />
                </div>
                <p className="text-white/20 text-xs font-black uppercase tracking-[0.4em] animate-pulse">{t('generating')}</p>
              </motion.div>
            ) : (
              <div className="space-y-8">
                {quotes.map((quote, idx) => (
                  <QuoteCard key={quote.id} quote={quote} idx={idx} />
                ))}
                
                <button 
                  onClick={fetchQuotes}
                  className="w-full py-6 bg-white/5 border border-white/10 rounded-[2.5rem] text-white/40 hover:text-white hover:bg-white/10 transition-all flex items-center justify-center gap-4 font-black uppercase tracking-[0.3em] text-xs group active:scale-95"
                >
                  <RefreshCw className="w-5 h-5 group-hover:rotate-180 transition-transform duration-700" />
                  {t('generateMore')}
                </button>
              </div>
            )}
          </div>
        )}

        {view === 'mood' && (
          <div className="space-y-12">
            {analyzingMood ? (
              <div className="flex flex-col items-center justify-center py-32 space-y-6">
                <div className="relative">
                  <Loader2 className="w-12 h-12 text-orange-500 animate-spin" />
                  <div className="absolute inset-0 bg-orange-500/20 blur-xl rounded-full animate-pulse" />
                </div>
                <p className="text-white/20 text-xs font-black uppercase tracking-[0.4em] animate-pulse">{t('analyzing')}</p>
              </div>
            ) : moodResult ? (
              <div className="space-y-12">
                <div className="text-center space-y-8">
                  <div className="space-y-2">
                    <p className="text-white/20 text-[10px] uppercase tracking-[0.5em] font-black">{t('detectedEmotion')}</p>
                    <h2 className="text-7xl font-black text-orange-500 capitalize tracking-tighter text-glow">{moodResult.emotion}</h2>
                  </div>
                  
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="relative px-12 py-10 bg-white/5 border border-white/10 rounded-[3.5rem] overflow-hidden group shadow-2xl"
                  >
                    <div className="absolute top-0 left-0 w-1.5 h-full bg-orange-500 opacity-40" />
                    <p className="text-2xl text-white/90 font-serif italic leading-relaxed relative z-10">
                      "{moodResult.supportiveMessage}"
                    </p>
                    <div className="mt-8 flex items-center justify-center gap-4 text-white/10 text-[10px] font-black uppercase tracking-[0.4em]">
                      <div className="w-12 h-px bg-current" />
                      <span>{t('personalizedForYou')}</span>
                      <div className="w-12 h-px bg-current" />
                    </div>
                  </motion.div>
                </div>

                {moodResult.religiousQuotes && moodResult.religiousQuotes.length > 0 && (
                  <div className="space-y-6">
                    <div className="flex items-center gap-3 text-white/20 px-4">
                      <BookOpen className="w-5 h-5" />
                      <h3 className="text-[10px] font-black uppercase tracking-[0.4em]">{t('religiousWisdom')}</h3>
                    </div>
                    <div className="space-y-8">
                      {moodResult.religiousQuotes.map((quote, idx) => (
                        <QuoteCard key={quote.id} quote={quote} idx={idx} />
                      ))}
                    </div>
                    <div className="h-px bg-white/5 mx-20" />
                  </div>
                )}

                <div className="space-y-8">
                  {moodResult.quotes.map((quote, idx) => (
                    <QuoteCard key={quote.id} quote={quote} idx={idx} />
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-32 space-y-6">
                <div className="w-20 h-20 bg-white/5 rounded-[2.5rem] flex items-center justify-center mx-auto border border-white/10">
                  <Search className="w-8 h-8 text-white/10" />
                </div>
                <p className="text-white/20 font-black uppercase tracking-widest text-xs">{t('noQuotes')}</p>
              </div>
            )}
          </div>
        )}

        {view === 'favorites' && (
          <div className="space-y-10">
            <header className="space-y-2 px-2">
              <div className="flex items-center justify-between">
                <h2 className="text-3xl font-black text-white tracking-tighter text-glow">{t('favorites')}</h2>
                <div className="flex items-center gap-3 px-4 py-2 bg-green-500/5 border border-green-500/10 rounded-2xl">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(34,197,94,0.5)]" />
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-green-500/80">{t('offlineMode')}</span>
                </div>
              </div>
              <p className="text-white/30 text-sm font-medium tracking-wide">{favorites.length} {t('favorites').toLowerCase()}</p>
            </header>
            
            {favorites.length > 0 ? (
              <div className="space-y-8">
                {favorites.map((quote, idx) => (
                  <QuoteCard key={quote.id} quote={quote} idx={idx} />
                ))}
              </div>
            ) : (
              <div className="text-center py-32 space-y-8">
                <div className="w-24 h-24 bg-white/5 rounded-[3rem] flex items-center justify-center mx-auto border border-white/10">
                  <Star className="w-10 h-10 text-white/5" />
                </div>
                <div className="space-y-2">
                  <p className="text-white/20 font-black uppercase tracking-[0.3em] text-xs">{t('noQuotes')}</p>
                  <p className="text-white/10 text-sm">{t('exploreWisdom')}</p>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      <AnimatePresence>
        {wallpaperQuote && (
          <WallpaperModal
            quote={wallpaperQuote}
            language={currentLang}
            onClose={() => setWallpaperQuote(null)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {activeQuoteViewer && (
          <QuoteViewer
            quotes={activeQuoteViewer.quotes}
            initialIndex={activeQuoteViewer.index}
            currentLang={currentLang}
            onClose={() => setActiveQuoteViewer(null)}
            onToggleFavorite={toggleFavorite}
            isFavorite={(q) => favorites.some(f => f.id === q.id)}
            onCopy={copyToClipboard}
            onShare={shareQuote}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
