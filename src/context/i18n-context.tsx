
'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';

type I18nContextType = {
  language: string;
  setLanguage: (language: string) => void;
  t: (key: string) => string;
  t_raw: (key: string) => string | string[];
};

const I18nContext = createContext<I18nContextType | undefined>(undefined);

export const I18nProvider = ({ children }: { children: ReactNode }) => {
  const [language, setLanguage] = useState('en');
  const [translations, setTranslations] = useState<Record<string, string | string[]>>({});

  useEffect(() => {
    const savedLanguage = localStorage.getItem('sudhaarsetu_lang') || 'en';
    setLanguage(savedLanguage);
  }, []);
  
  useEffect(() => {
    const loadTranslations = async () => {
      try {
        const module = await import(`../../locales/${language}.json`);
        setTranslations(module.default);
      } catch (error) {
        console.error(`Could not load translations for ${language}. Falling back to 'en'.`, error);
        try {
            const module = await import(`../../locales/en.json`);
            setTranslations(module.default);
        } catch (fallbackError) {
            console.error('Could not load fallback English translations.', fallbackError);
            setTranslations({});
        }
      }
    };
    loadTranslations();
    localStorage.setItem('sudhaarsetu_lang', language);
  }, [language]);

  const t_raw = useCallback((key: string): string | string[] => {
    const keys = key.split('.');
    let result: any = translations;
    for (const k of keys) {
      if (result && typeof result === 'object' && k in result) {
        result = result[k];
      } else {
        return key;
      }
    }
    return result || key;
  }, [translations]);
  
  const t = useCallback((key: string): string => {
    const result = t_raw(key);
    if (Array.isArray(result)) {
        return result[0] || key;
    }
    return result;
  }, [t_raw]);

  return (
    <I18nContext.Provider value={{ language, setLanguage, t, t_raw }}>
      {children}
    </I18nContext.Provider>
  );
};

export const useI18n = (): I18nContextType => {
  const context = useContext(I18nContext);
  if (context === undefined) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
};
