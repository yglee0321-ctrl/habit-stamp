import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { Language, TranslationDict, translations } from '../lib/translations';
import { getState, setSettings, subscribeStore } from '../lib/cloud';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
  t: TranslationDict;
  isKorean: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = getState().settings.language;
    return saved === 'en' ? 'en' : 'ko';
  });
  useEffect(() => subscribeStore(() => {
    const l = getState().settings.language;
    if (l === 'ko' || l === 'en') setLanguageState((prev) => (prev === l ? prev : l));
  }), []);

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const toggleLanguage = () => {
    const next = language === 'ko' ? 'en' : 'ko';
    setLanguageState(next);
    setSettings({ language: next });
  };

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    setSettings({ language: lang });
  };

  const t = useMemo(() => translations[language], [language]);
  const isKorean = language === 'ko';

  return (
    <LanguageContext.Provider
      value={{
        language,
        setLanguage,
        toggleLanguage,
        t,
        isKorean,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
