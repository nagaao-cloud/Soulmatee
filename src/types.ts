export type Language =
  | "en"
  | "fr"
  | "ar"
  | "am"
  | "om"
  | "sw"
  | "es"
  | "hi"
  | "pt"
  | "de"
  | "zu";

export interface Category {
  id: string;
  name: Record<Language, string>;
  description: Record<Language, string>;
  icon: string;
  abstractMeaning: Record<Language, string>;
}

export interface Quote {
  id: string;
  text: string;
  translations?: Record<Language, string>;
  author: string;
  category: string;
  language: Language;
  isDaily?: boolean;
  isTrending?: boolean;
}

export interface MoodAnalysis {
  needsMoreInfo: boolean;
  emotion?: string;
  supportiveMessage: string;
  quotes?: Quote[];
  religiousQuotes?: Quote[];
}

export const LANGUAGES: {
  id: Language;
  name: string;
  flag: string;
  dir: "ltr" | "rtl";
}[] = [
  { id: "en", name: "English", flag: "🇺🇸", dir: "ltr" },
  { id: "fr", name: "Français", flag: "🇫🇷", dir: "ltr" },
  { id: "es", name: "Español", flag: "🇪🇸", dir: "ltr" },
  { id: "de", name: "Deutsch", flag: "🇩🇪", dir: "ltr" },
  { id: "pt", name: "Português", flag: "🇵🇹", dir: "ltr" },
  { id: "hi", name: "हिन्दी", flag: "🇮🇳", dir: "ltr" },
  { id: "ar", name: "العربية", flag: "🇸🇦", dir: "rtl" },
  { id: "sw", name: "Kiswahili", flag: "🇰🇪", dir: "ltr" },
  { id: "am", name: "አማርኛ", flag: "🇪🇹", dir: "ltr" },
  { id: "om", name: "Afaan Oromoo", flag: "🇪🇹", dir: "ltr" },
  { id: "zu", name: "isiZulu", flag: "🇿🇦", dir: "ltr" },
];

export type UITranslationKeys =
  | "appName"
  | "categories"
  | "exploreWisdom"
  | "soulInsight"
  | "moodPlaceholder"
  | "analyze"
  | "dailyQuote"
  | "trending"
  | "randomQuote"
  | "copied"
  | "generating"
  | "analyzing"
  | "noQuotes"
  | "favorites"
  | "back"
  | "generateMore"
  | "detectedEmotion"
  | "personalizedForYou"
  | "setAsWallpaper"
  | "homeScreen"
  | "lockScreen"
  | "downloading"
  | "wallpaperSaved"
  | "streak"
  | "offlineMode"
  | "notifications"
  | "enableNotifications"
  | "newQuoteAvailable"
  | "religiousWisdom"
  | "dailyQuoteNotification"
  | "selectLanguage"
  | "premiumCustomization"
  | "alignment"
  | "position"
  | "typography"
  | "styleAtmosphere"
  | "styleMinimal"
  | "styleNature"
  | "styleCalm"
  | "styleWarm"
  | "styleDeep"
  | "styleLuxury"
  | "styleCreative"
  | "aiBackground"
  | "styleAbstract"
  | "styleSerene"
  | "styleVibrant"
  | "generateBackground"
  | "fontModern"
  | "fontPremium"
  | "fontTech"
  | "fontBold"
  | "fontElegant"
  | "chooseLanguage"
  | "selectLanguageSub"
  | "notificationMood"
  | "notificationFavorites"
  | "copyText"
  | "notificationsEnabledMessage"
  | "notificationsDeniedMessage"
  | "onboardingTitle1"
  | "onboardingSub1"
  | "onboardingTitle2"
  | "onboardingSub2"
  | "onboardingTitle3"
  | "onboardingSub3"
  | "getStarted"
  | "next"
  | "skip"
  | "goPremium"
  | "premiumTitle"
  | "premiumSub"
  | "premiumFeature1"
  | "premiumFeature2"
  | "premiumFeature3"
  | "premiumFeature4"
  | "upgradeNow"
  | "restorePurchases"
  | "settings"
  | "rateApp"
  | "feedback"
  | "privacyPolicy"
  | "termsOfService"
  | "about"
  | "version"
  | "shareApp";
