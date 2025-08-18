// Simple i18n implementation for Hindi/English
export type Language = 'en' | 'hi';

export const translations = {
  en: {
    // Navigation
    home: 'Home',
    query: 'Ask AI',
    weather: 'Weather',
    market: 'Market',
    schemes: 'Schemes',
    diagnostics: 'Diagnostics',
    community: 'Community',
    profile: 'Profile',
    about: 'About',
    admin: 'Admin',

    // Common
    search: 'Search',
    submit: 'Submit',
    cancel: 'Cancel',
    save: 'Save',
    loading: 'Loading...',
    error: 'Something went wrong',
    retry: 'Retry',
    language: 'Language',

    // Home page
    heroTitle: 'AI-Powered Agricultural Assistant',
    heroSubtitle: 'Get instant answers to your farming questions with expert AI guidance',
    voiceCTA: 'Ask with Voice',
    quickPrompts: 'Quick Questions',

    // Query page
    askQuestion: 'Ask your farming question',
    speakNow: 'Speak now...',
    uploadImage: 'Upload crop image',
    confidence: 'Confidence',
    sources: 'Sources',

    // Weather
    weatherForecast: 'Weather Forecast',
    temperature: 'Temperature',
    humidity: 'Humidity',
    rainfall: 'Rainfall',
    irrigationAdvice: 'Irrigation Advice',

    // Market
    commodityPrices: 'Commodity Prices',
    priceChart: 'Price Chart',
    buySignal: 'BUY',
    holdSignal: 'HOLD',
    sellSignal: 'SELL',

    // Schemes
    govSchemes: 'Government Schemes',
    eligibility: 'Eligibility',
    requiredDocs: 'Required Documents',
    applyNow: 'Apply Now',

    // Community
    communityForum: 'Community Forum',
    createPost: 'Create Post',
    shareExperience: 'Share your farming experience',

    // Profile
    myProfile: 'My Profile',
    savedQueries: 'Saved Queries',
    preferences: 'Preferences',
  },
  hi: {
    // Navigation
    home: 'होम',
    query: 'AI से पूछें',
    weather: 'मौसम',
    market: 'बाजार',
    schemes: 'योजनाएं',
    diagnostics: 'निदान',
    community: 'समुदाय',
    profile: 'प्रोफाइल',
    about: 'के बारे में',
    admin: 'एडमिन',

    // Common
    search: 'खोजें',
    submit: 'भेजें',
    cancel: 'रद्द करें',
    save: 'सेव करें',
    loading: 'लोड हो रहा है...',
    error: 'कुछ गलत हुआ',
    retry: 'पुन: प्रयास',
    language: 'भाषा',

    // Home page
    heroTitle: 'AI-संचालित कृषि सहायक',
    heroSubtitle: 'विशेषज्ञ AI मार्गदर्शन के साथ अपने कृषि प्रश्नों के तुरंत उत्तर प्राप्त करें',
    voiceCTA: 'आवाज से पूछें',
    quickPrompts: 'त्वरित प्रश्न',

    // Query page
    askQuestion: 'अपना कृषि प्रश्न पूछें',
    speakNow: 'अब बोलें...',
    uploadImage: 'फसल की तस्वीर अपलोड करें',
    confidence: 'विश्वास',
    sources: 'स्रोत',

    // Weather
    weatherForecast: 'मौसम पूर्वानुमान',
    temperature: 'तापमान',
    humidity: 'आर्द्रता',
    rainfall: 'वर्षा',
    irrigationAdvice: 'सिंचाई सलाह',

    // Market
    commodityPrices: 'कमोडिटी कीमतें',
    priceChart: 'मूल्य चार्ट',
    buySignal: 'खरीदें',
    holdSignal: 'रोकें',
    sellSignal: 'बेचें',

    // Schemes
    govSchemes: 'सरकारी योजनाएं',
    eligibility: 'पात्रता',
    requiredDocs: 'आवश्यक दस्तावेज',
    applyNow: 'अभी आवेदन करें',

    // Community
    communityForum: 'कम्युनिटी फोरम',
    createPost: 'पोस्ट बनाएं',
    shareExperience: 'अपना कृषि अनुभव साझा करें',

    // Profile
    myProfile: 'मेरी प्रोफाइल',
    savedQueries: 'सेव किए गए प्रश्न',
    preferences: 'प्राथमिकताएं',
  },
} as const;

// Simple i18n hook
export function useTranslation() {
  const language = (localStorage.getItem('language') as Language) || 'en';
  
  const setLanguage = (lang: Language) => {
    localStorage.setItem('language', lang);
    window.location.reload(); // Simple reload for now
  };

  const t = (key: keyof typeof translations.en): string => {
    return translations[language][key] || translations.en[key] || key;
  };

  return { t, language, setLanguage };
}