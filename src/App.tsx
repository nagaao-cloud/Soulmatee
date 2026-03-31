import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
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
  Compass as SoulIcon,
  Search,
  CheckCircle2,
  TrendingUp,
  Shuffle,
  Image as ImageIcon,
  Wind,
  Settings,
  Bell,
  LogOut,
  ExternalLink,
} from "lucide-react";
import { CATEGORIES, UI_TRANSLATIONS } from "./constants";
import { LANGUAGES, Language, Quote, Category, MoodAnalysis } from "./types";
import {
  generateQuotes,
  analyzeMood,
  generateDailyQuote,
} from "./services/gemini";
import WallpaperModal from "./components/WallpaperModal";
import QuoteViewer from "./components/QuoteViewer";
import { auth, db } from "./firebase";
import {
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  signOut,
  User,
} from "firebase/auth";
import {
  doc,
  setDoc,
  getDoc,
  collection,
  query,
  where,
  onSnapshot,
  deleteDoc,
} from "firebase/firestore";

const iconMap: Record<string, any> = {
  Heart,
  CloudRain,
  Zap,
  Trophy,
  Compass: SoulIcon,
  Users,
  BookOpen,
  Moon,
  Wind,
};

export default function App() {
  const [currentLang, setCurrentLang] = useState<Language>(() => {
    const saved = localStorage.getItem("app_language");
    return (saved as Language) || "en";
  });
  const [isFirstLaunch, setIsFirstLaunch] = useState(() => {
    return !localStorage.getItem("app_language");
  });
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(
    null,
  );
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(false);
  const [favorites, setFavorites] = useState<Quote[]>([]);
  const [showLangMenu, setShowLangMenu] = useState(false);
  const [moodInput, setMoodInput] = useState("");
  const [moodResult, setMoodResult] = useState<MoodAnalysis | null>(null);
  const [analyzingMood, setAnalyzingMood] = useState(false);
  const [chatHistory, setChatHistory] = useState<{ role: 'user' | 'model', parts: { text: string }[] }[]>([]);
  const [dailyQuote, setDailyQuote] = useState<Quote | null>(null);
  const [showToast, setShowToast] = useState(false);
  const [view, setView] = useState<
    "home" | "category" | "mood" | "favorites" | "settings"
  >("home");
  const [showOnboarding, setShowOnboarding] = useState(() => {
    return !localStorage.getItem("onboarding_completed");
  });
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [isPremium, setIsPremium] = useState(() => {
    return localStorage.getItem("is_premium") === "true";
  });
  const [onboardingStep, setOnboardingStep] = useState(0);
  const [wallpaperQuote, setWallpaperQuote] = useState<Quote | null>(null);
  const [streak, setStreak] = useState(0);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [activeQuoteViewer, setActiveQuoteViewer] = useState<{
    quotes: Quote[];
    index: number;
  } | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);

  const t = (key: keyof (typeof UI_TRANSLATIONS)["en"]) =>
    UI_TRANSLATIONS[currentLang]?.[key] || UI_TRANSLATIONS["en"][key];
  const langConfig = LANGUAGES.find((l) => l.id === currentLang)!;

  const completeOnboarding = () => {
    localStorage.setItem("onboarding_completed", "true");
    setShowOnboarding(false);
  };

  const upgradeToPremium = () => {
    // Simulate payment
    localStorage.setItem("is_premium", "true");
    setIsPremium(true);
    setShowPremiumModal(false);
    setShowToast(true);
  };

  // Load favorites and streak from local storage
  useEffect(() => {
    const saved = localStorage.getItem("favorites_full");
    if (saved) setFavorites(JSON.parse(saved));

    const savedNotifications = localStorage.getItem("notifications_enabled");
    if (savedNotifications)
      setNotificationsEnabled(JSON.parse(savedNotifications));

    // Streak Logic
    const lastVisit = localStorage.getItem("last_visit");
    const savedStreak = localStorage.getItem("streak_count");
    const today = new Date().toDateString();

    if (lastVisit === today) {
      setStreak(Number(savedStreak) || 1);
    } else {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      if (lastVisit === yesterday.toDateString()) {
        const newStreak = (Number(savedStreak) || 0) + 1;
        setStreak(newStreak);
        localStorage.setItem("streak_count", newStreak.toString());
      } else {
        setStreak(1);
        localStorage.setItem("streak_count", "1");
      }
      localStorage.setItem("last_visit", today);
    }

    // Fetch daily quote
    fetchDailyQuote();

    // Firebase Auth Listener
    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setIsAuthReady(true);

      if (currentUser) {
        // Create or update user document
        const userRef = doc(db, "users", currentUser.uid);
        const userDoc = await getDoc(userRef);

        if (!userDoc.exists()) {
          try {
            await setDoc(userRef, {
              uid: currentUser.uid,
              email: currentUser.email,
              displayName: currentUser.displayName,
              photoURL: currentUser.photoURL,
              createdAt: new Date(),
              isPremium: isPremium,
              notificationsEnabled: notificationsEnabled,
            });
          } catch (error) {
            console.error("Error creating user document:", error);
          }
        } else {
          // Sync local state with remote
          const data = userDoc.data();
          if (data.isPremium !== undefined) {
            setIsPremium(data.isPremium);
            localStorage.setItem("is_premium", String(data.isPremium));
          }
          if (data.notificationsEnabled !== undefined) {
            setNotificationsEnabled(data.notificationsEnabled);
            localStorage.setItem(
              "notifications_enabled",
              String(data.notificationsEnabled),
            );
          }
        }
      }
    });

    // Daily Notification Check
    const checkDailyNotification = async () => {
      const enabled = localStorage.getItem("notifications_enabled") === "true";
      if (!enabled) return;

      const lastNotifyDate = localStorage.getItem("last_notification_date");
      const now = new Date();
      const today = now.toDateString();
      const hour = now.getHours();

      // Only notify if it's 9 AM or later and hasn't been sent today
      if (lastNotifyDate !== today && hour >= 9) {
        if ("Notification" in window && Notification.permission === "granted") {
          // Personalization logic
          const savedMood = localStorage.getItem("last_detected_emotion");
          const favoritesCount = JSON.parse(
            localStorage.getItem("favorites_full") || "[]",
          ).length;

          let body = t("dailyQuoteNotification");
          if (savedMood) {
            body = t("notificationMood").replace("{mood}", savedMood);
          } else if (favoritesCount > 5) {
            body = t("notificationFavorites");
          }

          new Notification(t("appName"), {
            body: body,
            icon: "/favicon.ico",
            badge: "/favicon.ico",
          });
          localStorage.setItem("last_notification_date", today);
        }
      }
    };

    // Small delay to ensure translations and state are ready
    setTimeout(checkDailyNotification, 2000);

    return () => {
      unsubscribeAuth();
    };
  }, [currentLang]);

  // Firebase Favorites Sync
  useEffect(() => {
    if (!isAuthReady || !user) return;

    const q = query(
      collection(db, "favorites"),
      where("userId", "==", user.uid),
    );
    const unsubscribeFavorites = onSnapshot(
      q,
      (snapshot) => {
        const remoteFavorites: Quote[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          remoteFavorites.push({
            id: data.quoteId,
            text: data.text,
            author: data.author,
            category: data.category,
            language: currentLang,
          });
        });
        setFavorites(remoteFavorites);
        localStorage.setItem("favorites_full", JSON.stringify(remoteFavorites));
      },
      (error) => {
        console.error("Error syncing favorites:", error);
      },
    );

    return () => unsubscribeFavorites();
  }, [user, isAuthReady]);

  const handleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Login failed:", error);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setFavorites([]);
      localStorage.removeItem("favorites_full");
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const toggleNotifications = async () => {
    if (!notificationsEnabled) {
      if ("Notification" in window) {
        const permission = await Notification.requestPermission();
        if (permission === "granted") {
          setNotificationsEnabled(true);
          localStorage.setItem("notifications_enabled", "true");
          alert(t("notificationsEnabledMessage"));
          new Notification(t("appName"), {
            body: t("dailyQuoteNotification"),
            icon: "/favicon.ico",
          });
        } else {
          alert(t("notificationsDeniedMessage"));
        }
      } else {
        alert("Notifications not supported");
      }
    } else {
      setNotificationsEnabled(false);
      localStorage.setItem("notifications_enabled", "false");
    }
  };

  useEffect(() => {
    if (selectedCategory) {
      fetchQuotes();
    }
  }, [selectedCategory, currentLang]);

  const fetchDailyQuote = async () => {
    try {
      const quote = await generateDailyQuote(currentLang);
      if (quote) {
        setDailyQuote(quote);
        localStorage.setItem(
          `daily_quote_${currentLang}`,
          JSON.stringify(quote),
        );
      }
    } catch (error) {
      const cached = localStorage.getItem(`daily_quote_${currentLang}`);
      if (cached) setDailyQuote(JSON.parse(cached));
    }
  };

  const fetchQuotes = async () => {
    if (!selectedCategory) return;
    triggerHaptic();
    setLoading(true);
    const newQuotes = await generateQuotes(
      selectedCategory.id,
      currentLang,
      10,
    );
    setQuotes(newQuotes);
    setLoading(false);
  };

  const handleAnalyzeMood = async () => {
    if (!moodInput.trim()) return;

    // Premium check
    if (!isPremium) {
      const usageCount = Number(
        localStorage.getItem("mood_analysis_count") || 0,
      );
      if (usageCount >= 3) {
        setShowPremiumModal(true);
        return;
      }
      localStorage.setItem("mood_analysis_count", (usageCount + 1).toString());
    }

    triggerHaptic();
    setAnalyzingMood(true);
    setView("mood");

    const newHistory = [...chatHistory, { role: 'user' as const, parts: [{ text: moodInput }] }];
    setChatHistory(newHistory);
    setMoodInput("");

    try {
      const result = await analyzeMood(
        newHistory,
        currentLang
      );
      if (result) {
        setMoodResult(result);
        setChatHistory([...newHistory, { role: 'model' as const, parts: [{ text: result.supportiveMessage }] }]);
        localStorage.setItem(
          `last_mood_analysis_${currentLang}`,
          JSON.stringify(result),
        );
        if (result.emotion) {
          localStorage.setItem("last_detected_emotion", result.emotion);
        }
      }
    } catch (error) {
      const cached = localStorage.getItem(`last_mood_analysis_${currentLang}`);
      if (cached) setMoodResult(JSON.parse(cached));
    } finally {
      setAnalyzingMood(false);
    }
  };

  const handleRandomQuote = async () => {
    triggerHaptic();
    setLoading(true);
    const randomCat = CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)];
    setSelectedCategory(randomCat);
    setView("category");
    const newQuotes = await generateQuotes(randomCat.id, currentLang, 1);
    setQuotes(newQuotes);
    setLoading(false);
  };

  const triggerHaptic = () => {
    if (navigator.vibrate) {
      navigator.vibrate(50);
    }
  };

  const toggleFavorite = async (quote: Quote) => {
    triggerHaptic();
    const isFav = favorites.some((f) => f.id === quote.id);
    const newFavs = isFav
      ? favorites.filter((f) => f.id !== quote.id)
      : [...favorites, quote];
    setFavorites(newFavs);
    localStorage.setItem("favorites_full", JSON.stringify(newFavs));

    if (user) {
      try {
        if (isFav) {
          // Delete from Firestore
          const q = query(
            collection(db, "favorites"),
            where("userId", "==", user.uid),
            where("quoteId", "==", quote.id),
          );
          const snapshot = await getDoc(
            doc(db, "favorites", `${user.uid}_${quote.id}`),
          ); // Or use query
          await deleteDoc(doc(db, "favorites", `${user.uid}_${quote.id}`));
        } else {
          // Add to Firestore
          await setDoc(doc(db, "favorites", `${user.uid}_${quote.id}`), {
            userId: user.uid,
            quoteId: quote.id,
            text: quote.text,
            author: quote.author,
            category: quote.category || "general",
            createdAt: new Date(),
          });
        }
      } catch (error) {
        console.error("Error updating favorite in Firestore:", error);
      }
    }
  };

  const copyToClipboard = (text: string) => {
    triggerHaptic();
    navigator.clipboard.writeText(text);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 2000);
  };

  const shareQuote = async (quote: Quote) => {
    const shareText = `"${quote.text}"\n\n— ${t("appName")}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: t("appName"),
          text: shareText,
        });
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          console.error("Error sharing:", err);
        }
      }
    } else {
      copyToClipboard(shareText);
    }
  };

  const QuoteCard = ({
    quote,
    idx,
  }: {
    quote: Quote;
    idx: number;
    key?: any;
  }) => {
    const styles = [
      {
        // Calm (Purple → Blue)
        container:
          "bg-gradient-to-br from-indigo-900/90 via-blue-900/60 to-[#050505] border-indigo-500/30 shadow-[0_20px_80px_rgba(99,102,241,0.15)]",
        accent: "text-indigo-400",
        glow: "bg-indigo-500/20",
        patternSvg: `url("data:image/svg+xml,%3Csvg width='80' height='80' viewBox='0 0 80 80' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%236366f1' fill-opacity='0.05'%3E%3Cpath d='M50 50c0-5.523 4.477-10 10-10s10 4.477 10 10-4.477 10-10 10-10-4.477-10-10zM10 10c0-5.523 4.477-10 10-10s10 4.477 10 10-4.477 10-10 10-10-4.477-10-10z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
      },
      {
        // Warm (Orange → Pink)
        container:
          "bg-gradient-to-br from-orange-900/90 via-pink-900/60 to-[#050505] border-orange-500/30 shadow-[0_20px_80px_rgba(249,115,22,0.15)]",
        accent: "text-orange-400",
        glow: "bg-orange-500/20",
        patternSvg: `url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M11 18c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm48 25c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm-43-7c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm63 31c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM34 90c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm56-76c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM12 86c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zm66-3c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zm-46-45c.552 0 1-.448 1-1s-.448-1-1-1-1 .448-1 1 .448 1 1 1zm26 26c.552 0 1-.448 1-1s-.448-1-1-1-1 .448-1 1 .448 1 1 1zm-1-48c.552 0 1-.448 1-1s-.448-1-1-1-1 .448-1 1 .448 1 1 1zm-54 46c.552 0 1-.448 1-1s-.448-1-1-1-1 .448-1 1 .448 1 1 1zM45 6c.552 0 1-.448 1-1s-.448-1-1-1-1 .448-1 1 .448 1 1 1zm6 51c.552 0 1-.448 1-1s-.448-1-1-1-1 .448-1 1 .448 1 1 1zm-1-2c.552 0 1-.448 1-1s-.448-1-1-1-1 .448-1 1 .448 1 1 1z' fill='%23f97316' fill-opacity='0.05' fill-rule='evenodd'/%3E%3C/svg%3E")`,
      },
      {
        // Deep (Dark Black → Grey)
        container:
          "bg-gradient-to-br from-zinc-800/90 via-gray-900/60 to-[#050505] border-white/10 shadow-[0_20px_80px_rgba(0,0,0,0.5)]",
        accent: "text-white/60",
        glow: "bg-white/10",
        patternSvg: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.03'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
      },
    ];

    const style = styles[idx % styles.length];

    return (
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ margin: "-50px" }}
        transition={{ duration: 0.6, delay: (idx % 10) * 0.1 }}
        onClick={() => {
          let list = quotes;
          if (view === "favorites") list = favorites;
          else if (view === "mood") list = moodResult?.quotes || [];
          else if (view === "home" && dailyQuote) list = [dailyQuote];

          setActiveQuoteViewer({ quotes: list, index: idx });
        }}
        className={`p-12 ${style.container} border rounded-[3.5rem] space-y-12 relative group overflow-hidden cursor-pointer`}
      >
        {/* Dynamic Glow Orb */}
        <div
          className={`absolute -top-32 -right-32 w-80 h-80 ${style.glow} blur-[120px] rounded-full pointer-events-none group-hover:scale-150 transition-transform duration-[2s]`}
        />

        {/* Abstract Pattern Overlay */}
        <div
          className="absolute inset-0 pointer-events-none mix-blend-overlay"
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
            <SoulIcon
              className={`w-8 h-8 ${style.accent} opacity-30 mx-auto`}
            />
            <button
              onClick={(e) => {
                e.stopPropagation();
                copyToClipboard(quote.text);
              }}
              className="group/text relative active:scale-[0.99] transition-transform w-full"
            >
              <p className="text-3xl sm:text-4xl md:text-5xl font-serif font-semibold leading-snug text-white tracking-tight text-glow drop-shadow-[0_4px_16px_rgba(0,0,0,1)]">
                "{quote.text}"
              </p>
              <div className="mt-6 opacity-0 group-hover/text:opacity-40 transition-opacity flex justify-center">
                <Copy className="w-4 h-4 text-white" />
              </div>
            </button>
          </div>

          <div className="flex flex-col items-center space-y-8 w-full">
            <div className="space-y-2">
              <div
                className={`w-12 h-0.5 ${style.accent} bg-current opacity-20 mx-auto rounded-full`}
              />
              <p className="text-xl text-white/70 font-light tracking-wide italic">
                — {quote.author}
              </p>
            </div>

            <div className="flex items-center gap-3">
              {[
                {
                  icon: Copy,
                  action: () => copyToClipboard(quote.text),
                  title: "Copy",
                },
                {
                  icon: Share2,
                  action: () => shareQuote(quote),
                  title: "Share",
                },
                {
                  icon: ImageIcon,
                  action: () => setWallpaperQuote(quote),
                  title: t("setAsWallpaper"),
                },
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
                  favorites.some((f) => f.id === quote.id)
                    ? "text-orange-500 bg-orange-500/10 border-orange-500/30 shadow-[0_0_30px_rgba(249,115,22,0.2)]"
                    : "bg-white/5 border-white/10 text-white/40 hover:text-white hover:bg-white/10"
                }`}
              >
                <Star
                  className={`w-5 h-5 ${favorites.some((f) => f.id === quote.id) ? "fill-current" : ""}`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Branding */}
        <div className="absolute bottom-8 left-0 w-full flex justify-center opacity-10 pointer-events-none">
          <span className="text-[10px] font-black uppercase tracking-[1em] text-white">
            {t("appName")}
          </span>
        </div>
      </motion.div>
    );
  };

  const handleLanguageSelect = (langId: Language) => {
    setCurrentLang(langId);
    localStorage.setItem("app_language", langId);
    setIsFirstLaunch(false);
  };

  if (showOnboarding) {
    const steps = [
      {
        title: t("onboardingTitle1"),
        sub: t("onboardingSub1"),
        icon: <SoulIcon className="w-16 h-16 text-orange-500" />,
        color: "from-orange-500/20 to-transparent",
      },
      {
        title: t("onboardingTitle2"),
        sub: t("onboardingSub2"),
        icon: <Zap className="w-16 h-16 text-blue-500" />,
        color: "from-blue-500/20 to-transparent",
      },
      {
        title: t("onboardingTitle3"),
        sub: t("onboardingSub3"),
        icon: <Moon className="w-16 h-16 text-purple-500" />,
        color: "from-purple-500/20 to-transparent",
      },
    ];

    return (
      <div className="min-h-screen bg-[#050505] text-white font-sans flex flex-col overflow-hidden">
        <div className="flex-1 relative flex flex-col items-center justify-center p-8 text-center space-y-12">
          <AnimatePresence mode="wait">
            <motion.div
              key={onboardingStep}
              initial={{ opacity: 0, x: 50, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: -50, scale: 0.9 }}
              transition={{ type: "spring", damping: 20, stiffness: 100 }}
              className="space-y-8 max-w-sm"
            >
              <div
                className={`w-32 h-32 rounded-[2.5rem] bg-gradient-to-b ${steps[onboardingStep].color} flex items-center justify-center mx-auto shadow-2xl border border-white/5`}
              >
                {steps[onboardingStep].icon}
              </div>
              <div className="space-y-4">
                <h1 className="text-4xl font-black tracking-tighter leading-none">
                  {steps[onboardingStep].title}
                </h1>
                <p className="text-white/40 text-lg font-medium leading-relaxed">
                  {steps[onboardingStep].sub}
                </p>
              </div>
            </motion.div>
          </AnimatePresence>

          <div className="flex gap-2">
            {steps.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all duration-500 ${i === onboardingStep ? "w-8 bg-orange-500" : "w-2 bg-white/10"}`}
              />
            ))}
          </div>
        </div>

        <div className="p-8 space-y-4">
          <button
            onClick={() => {
              if (onboardingStep < steps.length - 1) {
                setOnboardingStep(onboardingStep + 1);
              } else {
                completeOnboarding();
              }
            }}
            className="w-full py-6 bg-orange-500 rounded-[2rem] font-black uppercase tracking-[0.2em] text-sm shadow-[0_20px_40px_rgba(249,115,22,0.3)] active:scale-95 transition-transform"
          >
            {onboardingStep === steps.length - 1 ? t("getStarted") : t("next")}
          </button>
          {onboardingStep < steps.length - 1 && (
            <button
              onClick={completeOnboarding}
              className="w-full py-4 text-white/30 font-black uppercase tracking-[0.2em] text-[10px] hover:text-white transition-colors"
            >
              {t("skip")}
            </button>
          )}
        </div>
      </div>
    );
  }

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
            <h1 className="text-3xl font-black tracking-tight">
              {t("chooseLanguage")}
            </h1>
            <p className="text-white/40 font-medium">
              {t("selectLanguageSub")}
            </p>
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
            <span className="font-bold tracking-tight">{t("copied")}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Premium Modal */}
      <AnimatePresence>
        {showPremiumModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-xl flex items-center justify-center p-6"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="w-full max-w-md bg-[#111] border border-white/10 rounded-[3rem] overflow-hidden shadow-2xl relative"
            >
              <button
                onClick={() => setShowPremiumModal(false)}
                className="absolute top-6 right-6 p-2 hover:bg-white/5 rounded-full text-white/40"
              >
                <ChevronLeft className="w-6 h-6 rotate-90" />
              </button>

              <div className="p-10 space-y-8">
                <div className="text-center space-y-4">
                  <div className="w-20 h-20 bg-orange-500/10 rounded-3xl flex items-center justify-center text-orange-500 mx-auto">
                    <SoulIcon className="w-10 h-10" />
                  </div>
                  <h2 className="text-3xl font-black tracking-tight">
                    {t("premiumTitle")}
                  </h2>
                  <p className="text-white/40 font-medium">{t("premiumSub")}</p>
                </div>

                <div className="space-y-4">
                  {[1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className="flex items-center gap-4 p-4 bg-white/5 rounded-2xl border border-white/5"
                    >
                      <div className="w-8 h-8 bg-orange-500/10 rounded-xl flex items-center justify-center text-orange-500">
                        <CheckCircle2 className="w-4 h-4" />
                      </div>
                      <span className="font-bold text-sm text-white/80">
                        {t(`premiumFeature${i}` as any)}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="space-y-4">
                  <button
                    onClick={upgradeToPremium}
                    className="w-full py-6 bg-orange-500 rounded-[2rem] font-black uppercase tracking-[0.2em] text-sm shadow-[0_20px_40px_rgba(249,115,22,0.3)] active:scale-95 transition-transform"
                  >
                    {t("upgradeNow")} - $4.99
                  </button>
                  <button
                    onClick={() => setShowPremiumModal(false)}
                    className="w-full py-4 text-white/30 font-black uppercase tracking-[0.2em] text-[10px] hover:text-white transition-colors"
                  >
                    {t("restorePurchases")}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#050505]/40 backdrop-blur-2xl border-b border-white/5 px-6 py-5 flex justify-between items-center">
        <div className="flex items-center gap-4">
          {view !== "home" && (
            <button
              onClick={() => {
                setView("home");
                setSelectedCategory(null);
                setMoodResult(null);
              }}
              className="p-3 hover:bg-white/5 rounded-2xl transition-all active:scale-90 border border-transparent hover:border-white/10"
            >
              <ChevronLeft
                className={`w-6 h-6 ${langConfig.dir === "rtl" ? "rotate-180" : ""}`}
              />
            </button>
          )}
          <div className="flex flex-col">
            {/* Streak removed */}
            <h1 className="text-2xl font-black tracking-tighter text-glow">
              {view === "category" && selectedCategory
                ? selectedCategory.name[currentLang]
                : t("appName")}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={() => setView("favorites")}
            className={`p-3 hover:bg-white/5 rounded-2xl transition-all active:scale-90 border border-transparent hover:border-white/10 ${view === "favorites" ? "text-orange-500 bg-orange-500/5 border-orange-500/20" : "text-white/40"}`}
          >
            <Star
              className={`w-6 h-6 ${view === "favorites" ? "fill-current" : ""}`}
            />
          </button>

          <button
            onClick={() => setView("settings")}
            className={`p-3 hover:bg-white/5 rounded-2xl transition-all active:scale-90 border border-transparent hover:border-white/10 ${view === "settings" ? "text-orange-500 bg-orange-500/5 border-orange-500/20" : "text-white/40"}`}
          >
            <Settings className="w-6 h-6" />
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
                  className={`absolute ${langConfig.dir === "rtl" ? "left-0" : "right-0"} mt-2 w-56 bg-[#1a1a1a] border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-50`}
                >
                  <div className="p-2 border-b border-white/5">
                    <button
                      onClick={toggleNotifications}
                      className="w-full px-4 py-3 text-left hover:bg-white/5 transition-colors flex flex-col gap-2"
                    >
                      <div className="flex items-center justify-between w-full text-white/70">
                        <div className="flex items-center gap-3">
                          <Bell
                            className={`w-4 h-4 ${notificationsEnabled ? "text-orange-500 fill-current" : "text-white/40"}`}
                          />
                          <span className="text-sm">{t("notifications")}</span>
                        </div>
                        <div
                          className={`w-10 h-5 rounded-full transition-all duration-300 ease-in-out relative ${notificationsEnabled ? "bg-orange-500 shadow-[0_0_15px_rgba(249,115,22,0.5)]" : "bg-white/10"}`}
                        >
                          <div
                            className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all duration-300 ease-in-out ${notificationsEnabled ? "left-[22px]" : "left-0.5"}`}
                          />
                        </div>
                      </div>
                      <AnimatePresence>
                        {notificationsEnabled && (
                          <motion.p
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
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
                        localStorage.setItem("app_language", lang.id);
                        setShowLangMenu(false);
                      }}
                      className={`w-full px-4 py-3 text-left hover:bg-white/5 transition-colors flex items-center justify-between ${currentLang === lang.id ? "text-orange-500" : "text-white/70"}`}
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
        {view === "home" && (
          <div className="space-y-10">
            {/* Soul Insight Entry */}
            <section className="space-y-6">
              <motion.button
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                onClick={() => setView("mood")}
                className="w-full p-8 bg-gradient-to-br from-orange-500/10 to-purple-500/10 backdrop-blur-xl border border-white/10 rounded-[3rem] text-left relative overflow-hidden group hover:border-orange-500/30 transition-all shadow-2xl"
              >
                <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform">
                  <Wind className="w-24 h-24 text-orange-500" />
                </div>
                <div className="relative z-10 space-y-3">
                  <div className="flex items-center gap-3 text-orange-500">
                    <SoulIcon className="w-5 h-5" />
                    <span className="text-[10px] font-black uppercase tracking-[0.4em]">
                      {t("soulInsight")}
                    </span>
                  </div>
                  <h3 className="text-2xl font-black tracking-tight">
                    {t("onboardingTitle2")}
                  </h3>
                  <p className="text-white/40 text-sm font-medium">
                    {t("onboardingSub2")}
                  </p>
                </div>
              </motion.button>
            </section>

            {/* Daily Quote */}
            {dailyQuote && (
              <section className="space-y-6">
                <div className="flex items-center justify-between px-2">
                  <div className="flex items-center gap-3 text-white/40">
                    <TrendingUp className="w-5 h-5" />
                    <h2 className="text-xs font-black uppercase tracking-[0.4em]">
                      {t("dailyQuote")}
                    </h2>
                  </div>
                  <div className="w-24 h-px bg-gradient-to-r from-white/10 to-transparent" />
                </div>
                <QuoteCard quote={dailyQuote} idx={0} />
              </section>
            )}

            {/* Categories */}
            <section className="space-y-8">
              <header className="space-y-2 px-2">
                <h2 className="text-3xl font-black text-white tracking-tighter text-glow">
                  {t("categories")}
                </h2>
                <p className="text-white/30 text-sm font-medium tracking-wide">
                  {t("exploreWisdom")}
                </p>
              </header>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {CATEGORIES.map((cat) => {
                  const Icon = iconMap[cat.icon];
                  const emotionalEmojis: Record<string, string> = {
                    love: "❤️",
                    sadness: "😢",
                    success: "🚀",
                    motivation: "🔥",
                  };
                  return (
                    <motion.button
                      key={cat.id}
                      whileHover={{ scale: 1.03, y: -8 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => {
                        setSelectedCategory(cat);
                        setView("category");
                      }}
                      className="group relative p-10 bg-white/5 backdrop-blur-xl border border-white/10 rounded-[3rem] text-left overflow-hidden transition-all hover:bg-white/10 hover:border-orange-500/30 shadow-lg hover:shadow-[0_30px_60px_rgba(249,115,22,0.15)]"
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
              className="w-full py-6 bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2.5rem] text-white/40 hover:text-white hover:bg-white/10 transition-all flex items-center justify-center gap-4 font-black uppercase tracking-[0.3em] text-xs group active:scale-95 shadow-lg"
            >
              <Shuffle className="w-5 h-5 group-hover:rotate-180 transition-transform duration-700" />
              {t("randomQuote")}
            </button>
          </div>
        )}

        {view === "category" && selectedCategory && (
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
                <p className="text-white/20 text-xs font-black uppercase tracking-[0.4em] animate-pulse">
                  {t("generating")}
                </p>
              </motion.div>
            ) : (
              <div className="space-y-8">
                {quotes.map((quote, idx) => (
                  <QuoteCard key={quote.id} quote={quote} idx={idx} />
                ))}

                <button
                  onClick={fetchQuotes}
                  className="w-full py-6 bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2.5rem] text-white/40 hover:text-white hover:bg-white/10 transition-all flex items-center justify-center gap-4 font-black uppercase tracking-[0.3em] text-xs group active:scale-95 shadow-lg"
                >
                  <RefreshCw className="w-5 h-5 group-hover:rotate-180 transition-transform duration-700" />
                  {t("generateMore")}
                </button>
              </div>
            )}
          </div>
        )}

        {view === "mood" && (
          <div className="space-y-8 flex flex-col h-[calc(100vh-12rem)]">
            <header className="space-y-2 px-2 shrink-0">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-orange-500/10 rounded-2xl flex items-center justify-center text-orange-500">
                  <Wind className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-2xl font-black tracking-tight text-white">
                    {t("soulInsight")}
                  </h2>
                  <p className="text-white/40 text-xs font-medium uppercase tracking-widest">
                    {t("onboardingSub2")}
                  </p>
                </div>
              </div>
            </header>

            <div className="flex-1 overflow-y-auto space-y-6 px-2 pb-32 scrollbar-hide">
              {chatHistory.length === 0 && !analyzingMood && (
                <div className="text-center py-20 space-y-6 opacity-50">
                  <SoulIcon className="w-16 h-16 mx-auto text-white/20" />
                  <p className="text-white/40 font-medium text-sm">
                    How are you feeling today? I'm here to listen.
                  </p>
                </div>
              )}

              {chatHistory.map((msg, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${
                    msg.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-[85%] p-5 rounded-3xl ${
                      msg.role === "user"
                        ? "bg-orange-500 text-white rounded-br-sm"
                        : "bg-white/10 text-white/90 rounded-bl-sm backdrop-blur-md border border-white/5"
                    }`}
                  >
                    <p className="text-[15px] leading-relaxed font-medium">
                      {msg.parts[0].text}
                    </p>
                  </div>
                </motion.div>
              ))}

              {analyzingMood && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex justify-start"
                >
                  <div className="bg-white/5 p-5 rounded-3xl rounded-bl-sm backdrop-blur-md border border-white/5 flex items-center gap-3">
                    <Loader2 className="w-4 h-4 text-orange-500 animate-spin" />
                    <span className="text-white/40 text-xs font-black uppercase tracking-widest">
                      {t("analyzing")}
                    </span>
                  </div>
                </motion.div>
              )}

              {moodResult && !moodResult.needsMoreInfo && moodResult.quotes && moodResult.quotes.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-6 pt-4"
                >
                  <div className="flex items-center gap-3 text-white/20 px-4">
                    <div className="w-8 h-px bg-current" />
                    <h3 className="text-[10px] font-black uppercase tracking-[0.4em]">
                      Curated Quotes
                    </h3>
                    <div className="w-8 h-px bg-current" />
                  </div>
                  <div className="space-y-6">
                    {moodResult.quotes.map((quote, idx) => (
                      <QuoteCard key={quote.id} quote={quote} idx={idx} />
                    ))}
                  </div>
                </motion.div>
              )}

              {moodResult && !moodResult.needsMoreInfo && moodResult.religiousQuotes && moodResult.religiousQuotes.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-6 pt-4"
                >
                  <div className="flex items-center gap-3 text-white/20 px-4">
                    <BookOpen className="w-4 h-4" />
                    <h3 className="text-[10px] font-black uppercase tracking-[0.4em]">
                      {t("religiousWisdom")}
                    </h3>
                  </div>
                  <div className="space-y-6">
                    {moodResult.religiousQuotes.map((quote, idx) => (
                      <QuoteCard key={quote.id} quote={quote} idx={idx} />
                    ))}
                  </div>
                </motion.div>
              )}
            </div>

            <div className="absolute bottom-24 left-0 right-0 p-4 bg-gradient-to-t from-black via-black/80 to-transparent">
              <div className="max-w-md mx-auto relative group">
                <textarea
                  value={moodInput}
                  onChange={(e) => setMoodInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleAnalyzeMood();
                    }
                  }}
                  placeholder={t("moodPlaceholder")}
                  className="w-full h-16 pl-6 pr-16 py-5 bg-white/10 backdrop-blur-xl border border-white/20 rounded-full text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-orange-500/50 transition-all resize-none font-medium text-[15px]"
                />
                <button
                  onClick={handleAnalyzeMood}
                  disabled={!moodInput.trim() || analyzingMood}
                  className="absolute right-2 top-2 bottom-2 aspect-square bg-orange-500 rounded-full flex items-center justify-center text-white disabled:opacity-50 transition-all hover:scale-105 active:scale-95"
                >
                  <Zap className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        )}

        {view === "favorites" && (
          <div className="space-y-10">
            <header className="space-y-2 px-2">
              <div className="flex items-center justify-between">
                <h2 className="text-3xl font-black text-white tracking-tighter text-glow">
                  {t("favorites")}
                </h2>
                <div className="flex items-center gap-3 px-4 py-2 bg-green-500/5 border border-green-500/10 rounded-2xl">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(34,197,94,0.5)]" />
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-green-500/80">
                    {t("offlineMode")}
                  </span>
                </div>
              </div>
              <p className="text-white/30 text-sm font-medium tracking-wide">
                {favorites.length} {t("favorites").toLowerCase()}
              </p>
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
                  <p className="text-white/20 font-black uppercase tracking-[0.3em] text-xs">
                    {t("noQuotes")}
                  </p>
                  <p className="text-white/10 text-sm">{t("exploreWisdom")}</p>
                </div>
              </div>
            )}
          </div>
        )}
        {view === "settings" && (
          <div className="space-y-10">
            <header className="space-y-2 px-2">
              <h2 className="text-3xl font-black text-white tracking-tighter text-glow">
                {t("settings")}
              </h2>
              <p className="text-white/30 text-sm font-medium tracking-wide">
                {t("about")}
              </p>
            </header>

            {!isPremium && (
              <button
                onClick={() => setShowPremiumModal(true)}
                className="w-full p-8 bg-gradient-to-br from-orange-500 to-orange-600 rounded-[2.5rem] text-left relative overflow-hidden group shadow-2xl active:scale-95 transition-transform"
              >
                <div className="absolute top-0 right-0 p-8 opacity-20 group-hover:scale-110 transition-transform">
                  <SoulIcon className="w-24 h-24" />
                </div>
                <div className="relative z-10 space-y-2">
                  <h3 className="text-2xl font-black tracking-tight">
                    {t("goPremium")}
                  </h3>
                  <p className="text-white/80 text-sm font-medium">
                    {t("premiumSub")}
                  </p>
                </div>
              </button>
            )}

            <div className="space-y-4">
              <div className="bg-white/5 border border-white/10 rounded-[2.5rem] overflow-hidden">
                <button
                  onClick={user ? handleLogout : handleLogin}
                  className="w-full p-6 flex items-center justify-between hover:bg-white/5 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={`w-12 h-12 ${user ? "bg-red-500/10 text-red-500" : "bg-green-500/10 text-green-500"} rounded-2xl flex items-center justify-center`}
                    >
                      {user ? (
                        <LogOut className="w-6 h-6" />
                      ) : (
                        <Users className="w-6 h-6" />
                      )}
                    </div>
                    <div className="text-left">
                      <p className="font-bold">
                        {user ? "Sign Out" : "Sign In"}
                      </p>
                      <p className="text-xs text-white/30">
                        {user ? user.email : "Sync your data"}
                      </p>
                    </div>
                  </div>
                  <ChevronLeft
                    className={`w-5 h-5 text-white/20 ${langConfig.dir === "rtl" ? "" : "rotate-180"}`}
                  />
                </button>

                <div className="h-px bg-white/5 mx-6" />

                <button
                  onClick={toggleNotifications}
                  className="w-full p-6 flex items-center justify-between hover:bg-white/5 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-orange-500/10 rounded-2xl flex items-center justify-center text-orange-500">
                      <Bell className="w-6 h-6" />
                    </div>
                    <div className="text-left">
                      <p className="font-bold">{t("notifications")}</p>
                      <p className="text-xs text-white/30">
                        {notificationsEnabled ? "Enabled" : "Disabled"}
                      </p>
                    </div>
                  </div>
                  <div
                    className={`w-12 h-6 rounded-full relative transition-colors ${notificationsEnabled ? "bg-orange-500" : "bg-white/10"}`}
                  >
                    <div
                      className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${notificationsEnabled ? "right-1" : "left-1"}`}
                    />
                  </div>
                </button>

                <div className="h-px bg-white/5 mx-6" />

                <button
                  onClick={async () => {
                    if (navigator.share) {
                      await navigator.share({
                        title: t("appName"),
                        text: `Check out FeelSync - Daily Inspiration & Soul Insight!`,
                        url: window.location.href,
                      });
                    }
                  }}
                  className="w-full p-6 flex items-center justify-between hover:bg-white/5 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-500/10 rounded-2xl flex items-center justify-center text-blue-500">
                      <Share2 className="w-6 h-6" />
                    </div>
                    <div className="text-left">
                      <p className="font-bold">{t("shareApp")}</p>
                      <p className="text-xs text-white/30">Spread the wisdom</p>
                    </div>
                  </div>
                  <ExternalLink className="w-4 h-4 text-white/20" />
                </button>

                <div className="h-px bg-white/5 mx-6" />

                <button
                  onClick={() => setShowLangMenu(true)}
                  className="w-full p-6 flex items-center justify-between hover:bg-white/5 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-purple-500/10 rounded-2xl flex items-center justify-center text-purple-500">
                      <Languages className="w-6 h-6" />
                    </div>
                    <div className="text-left">
                      <p className="font-bold">{t("chooseLanguage")}</p>
                      <p className="text-xs text-white/30">{langConfig.name}</p>
                    </div>
                  </div>
                  <ChevronLeft
                    className={`w-5 h-5 text-white/20 ${langConfig.dir === "rtl" ? "" : "rotate-180"}`}
                  />
                </button>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-[2.5rem] overflow-hidden">
                <button className="w-full p-6 flex items-center justify-between hover:bg-white/5 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-green-500/10 rounded-2xl flex items-center justify-center text-green-500">
                      <Star className="w-6 h-6" />
                    </div>
                    <p className="font-bold">{t("rateApp")}</p>
                  </div>
                  <ChevronLeft
                    className={`w-5 h-5 text-white/20 ${langConfig.dir === "rtl" ? "" : "rotate-180"}`}
                  />
                </button>

                <div className="h-px bg-white/5 mx-6" />

                <button className="w-full p-6 flex items-center justify-between hover:bg-white/5 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-yellow-500/10 rounded-2xl flex items-center justify-center text-yellow-500">
                      <Share2 className="w-6 h-6" />
                    </div>
                    <p className="font-bold">{t("feedback")}</p>
                  </div>
                  <ChevronLeft
                    className={`w-5 h-5 text-white/20 ${langConfig.dir === "rtl" ? "" : "rotate-180"}`}
                  />
                </button>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-[2.5rem] overflow-hidden">
                <button className="w-full p-6 flex items-center justify-between hover:bg-white/5 transition-colors">
                  <p className="font-bold text-white/60">
                    {t("privacyPolicy")}
                  </p>
                  <ChevronLeft
                    className={`w-5 h-5 text-white/20 ${langConfig.dir === "rtl" ? "" : "rotate-180"}`}
                  />
                </button>
                <div className="h-px bg-white/5 mx-6" />
                <button className="w-full p-6 flex items-center justify-between hover:bg-white/5 transition-colors">
                  <p className="font-bold text-white/60">
                    {t("termsOfService")}
                  </p>
                  <ChevronLeft
                    className={`w-5 h-5 text-white/20 ${langConfig.dir === "rtl" ? "" : "rotate-180"}`}
                  />
                </button>
              </div>
            </div>

            <div className="text-center space-y-2 py-8">
              <p className="text-white/20 text-xs font-black uppercase tracking-[0.4em]">
                {t("appName")}
              </p>
              <p className="text-white/10 text-[10px] uppercase tracking-widest">
                {t("version")}
              </p>
            </div>
          </div>
        )}
      </main>

      <AnimatePresence>
        {wallpaperQuote && (
          <WallpaperModal
            quote={wallpaperQuote}
            language={currentLang}
            isPremium={isPremium}
            onUpgrade={() => setShowPremiumModal(true)}
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
            isFavorite={(q) => favorites.some((f) => f.id === q.id)}
            onCopy={copyToClipboard}
            onShare={shareQuote}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
