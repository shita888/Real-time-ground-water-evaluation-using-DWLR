import { createContext, useContext, useState, ReactNode } from 'react';

export type Language = 'en' | 'hi' | 'ta' | 'te' | 'bn' | 'mr' | 'gu';

interface Translations {
  [key: string]: {
    [K in Language]: string;
  };
}

const translations: Translations = {
  'groundwater_monitoring': {
    en: 'Groundwater Monitoring',
    hi: 'भूजल निगरानी',
    ta: 'நிலத்தடி நீர் கண்காணிப்பு',
    te: 'భూగర్భ జల పర్యవేక్షణ',
    bn: 'ভূগর্ভস্থ জল পর্যবেক্ষণ',
    mr: 'भूजल निरीक्षण',
    gu: 'ભૂજળ નિરીક્ષણ'
  },
  'realtime_data': {
    en: 'Real-time data from 5,260 DWLR stations across India',
    hi: 'भारत भर में 5,260 DWLR स्टेशनों से वास्तविक समय डेटा',
    ta: 'இந்தியா முழுவதும் உள்ள 5,260 DWLR நிலையங்களிலிருந்து நிகழ்நேர தரவு',
    te: 'భారతదేశం అంతటా 5,260 DWLR స్టేషన్లనుండి నిజ సమయ డేటా',
    bn: 'ভারত জুড়ে 5,260 DWLR স্টেশন থেকে রিয়েল-টাইম ডেটা',
    mr: 'संपूर्ण भारतातील 5,260 DWLR स्टेशन्सकडून रियल-टाइम डेटा',
    gu: 'સમગ્ર ભારતમાં 5,260 DWLR સ્ટેશનોથી રીઅલ-ટાઇમ ડેટા'
  },
  'live_location_data': {
    en: 'Live Location Data',
    hi: 'लाइव स्थान डेटा',
    ta: 'நேரடி இடம் தரவு',
    te: 'ప్రత్యక్ష స్థాన డేటా',
    bn: 'লাইভ অবস্থান ডেটা',
    mr: 'लाइव्ह स्थान डेटा',
    gu: 'લાઇવ સ્થાન ડેટા'
  },
  'enable_location': {
    en: 'Enable Location Access',
    hi: 'स्थान पहुंच सक्षम करें',
    ta: 'இடம் அணுகலை இயக்கவும்',
    te: 'స్థాన యాక్సెస్ని ప్రారంభించండి',
    bn: 'অবস্থান অ্যাক্সেস সক্ষম করুন',
    mr: 'स्थान प्रवेश सक्षम करा',
    gu: 'સ્થાન પ્રવેશ સક્ષમ કરો'
  },
  'allow_location': {
    en: 'Allow location access to see real-time groundwater data for your area',
    hi: 'अपने क्षेत्र के लिए वास्तविक समय भूजल डेटा देखने के लिए स्थान पहुंच की अनुमति दें',
    ta: 'உங்கள் பகுதிக்கான நிகழ்நேர நிலத்தடி நீர் தரவைப் பார்க்க இடம் அணுகலை அனுமதிக்கவum',
    te: 'మీ ప్రాంతానికి రియల్ టైమ్ భూగర్భ జల డేటాను చూడటానికి స్థాన యాక్సెస్ను అనుమతించండి',
    bn: 'আপনার এলাকার জন্য রিয়েল-টাইম ভূগর্ভস্থ জলের ডেটা দেখতে অবস্থান অ্যাক্সেসের অনুমতি দিন',
    mr: 'तुमच्या क्षेत्रासाठी रियल-टाइम भूजल डेटा पाहण्यासाठी स्थान प्रवेशाची परवानगी द्या',
    gu: 'તમારા વિસ્તાર માટે રીઅલ-ટાઇમ ભૂગર્ભ જળ ડેટા જોવા માટે સ્થાન ઍક્સેસની મંજૂરી આપો'
  },
  'nearby_stations': {
    en: 'Nearby Stations',
    hi: 'निकटवर्ती स्टेशन',
    ta: 'அருகிலுள்ள நிலையங்கள்',
    te: 'సమీప స్టేషన్లు',
    bn: 'কাছাকাছি স্টেশন',
    mr: 'जवळचे स्टेशन',
    gu: 'નજીકના સ્ટેશન'
  },
  'active_stations': {
    en: 'Active Stations',
    hi: 'सक्रिय स्टेशन',
    ta: 'செயலில் உள்ள நிலையங்கள்',
    te: 'క్రియాశీల స్టేషన్లు',
    bn: 'সক্রিয় স্টেশন',
    mr: 'सक्रिय स्टेशन',
    gu: 'સક્રિય સ્ટેશન'
  },
  'avg_water_level': {
    en: 'Avg Water Level',
    hi: 'औसत जल स्तर',
    ta: 'சராசரி நீர் மட்டம்',
    te: 'సగటు నీటి స్థాయి',
    bn: 'গড় জল স্তর',
    mr: 'सरासरी पाणी पातळी',
    gu: 'સરેરાશ પાણીનું સ્તર'
  },
  'critical_stations': {
    en: 'Critical Stations',
    hi: 'गंभीर स्टेशन',
    ta: 'முக்கியமான நிலையங்கள்',
    te: 'క్లిష్టమైన స్టేషన్లు',
    bn: 'জটিল স্টেশন',
    mr: 'गंभीर स्टेशन',
    gu: 'ગંભીર સ્ટેશન'
  },
  'recharge_rate': {
    en: 'Recharge Rate',
    hi: 'रिचार्ज दर',
    ta: 'ரீசார்ஜ் வீதம்',
    te: 'రీచార్జ్ రేట్',
    bn: 'রিচার্জ হার',
    mr: 'रिचार्ज दर',
    gu: 'રીચાર્જ દર'
  },
  'search_stations': {
    en: 'Search stations by ID or location...',
    hi: 'ID या स्थान द्वारा स्टेशन खोजें...',
    ta: 'ID அல்லது இடம் மூலம் நிலையங்களைத் தேடுங்கள்...',
    te: 'ID లేదా స్థానం ద్వారా స్టేషన్లను వెతకండి...',
    bn: 'ID বা অবস্থান দ্বারা স্টেশন অনুসন্ধান করুন...',
    mr: 'ID किंवा स्थानानुसार स्टेशन शोधा...',
    gu: 'ID અથવા સ્થાન દ્વારા સ્ટેશન શોધો...'
  }
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>('en');

  const t = (key: string): string => {
    return translations[key]?.[language] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}