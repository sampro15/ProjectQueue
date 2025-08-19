// src/i18n.js
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import HttpBackend from 'i18next-http-backend';
import LanguageDetector from 'i18next-browser-languagedetector';

// i18n
//   .use(HttpBackend)
//   .use(LanguageDetector)
//   .use(initReactI18next)
  
//   .init({
//     fallbackLng: 'en',
//     debug: true,
//     interpolation: {
//       escapeValue: false, // not needed for react as it escapes by default
//     },
//     backend: {
//       loadPath: '/locales/{{lng}}/{{ns}}.json',
//     },
//   });

// export default i18n;

// Function to initialize i18next with a specific language
const initializeI18n = (lang = 'en') => {
  i18n
    .use(HttpBackend)
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
      lng: lang, // Set the language dynamically
      fallbackLng: 'en', // Fallback language if the given one is not available
      debug: true,
      interpolation: {
        escapeValue: false, // not needed for react as it escapes by default
      },
      backend: {
        loadPath: '/locales/{{lng}}/{{ns}}.json', // Path to your translation files
      },
    });
};

export default initializeI18n;