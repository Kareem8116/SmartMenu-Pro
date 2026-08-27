import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import LanguageToggle from '../../components/LanguageToggle';

export default function Unauthorized() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <div className="unauthorized-container">
      <LanguageToggle />
      
      <div className="icon">🚫</div>
      <h1>{t('unauthorized.title')}</h1>
      <p>{t('unauthorized.message')}</p>
      <button 
        className="btn btn-primary"
        onClick={() => navigate(-1)}
      >
        {t('unauthorized.goBack')}
      </button>
    </div>
  );
}
