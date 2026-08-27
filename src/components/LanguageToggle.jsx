import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';

export default function LanguageToggle() {
  const { i18n } = useTranslation();

  const toggleLang = (lang) => {
    i18n.changeLanguage(lang);
  };

  return (
    <div className="lang-toggle">
      <Globe size={16} className="text-secondary mx-1" />
      <button
        className={`lang-btn ${i18n.language === 'ar' ? 'active' : ''}`}
        onClick={() => toggleLang('ar')}
        aria-label="العربية"
      >
        عربي
      </button>
      <button
        className={`lang-btn ${i18n.language === 'en' ? 'active' : ''}`}
        onClick={() => toggleLang('en')}
        aria-label="English"
      >
        EN
      </button>
    </div>
  );
}
