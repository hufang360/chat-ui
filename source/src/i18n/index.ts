import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import zh from './locales/zh.json'
import en from './locales/en.json'

const savedLanguage = (() => {
  try {
    const storage = localStorage.getItem('chat-storage')
    if (storage) {
      const parsed = JSON.parse(storage)
      return parsed?.state?.uiConfig?.language || 'zh'
    }
  } catch {}
  return 'zh'
})()

i18n.use(initReactI18next).init({
  resources: {
    zh: { translation: zh },
    en: { translation: en },
  },
  lng: savedLanguage,
  fallbackLng: 'zh',
  interpolation: { escapeValue: false },
})

export default i18n
