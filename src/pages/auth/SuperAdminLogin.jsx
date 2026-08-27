import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { signIn } from '../../services/auth';
import LanguageToggle from '../../components/LanguageToggle';

export default function SuperAdminLogin() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const userData = await signIn(email, password);
      
      if (userData.role === 'superadmin') {
        navigate('/super-admin/dashboard', { replace: true });
      } else {
        setError(t('auth.loginError'));
      }
    } catch (err) {
      console.error('Login error:', err);
      setError(t('auth.loginError'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <LanguageToggle />
      
      <div className="auth-card">
        <div className="logo-section">
          <div className="landing-logo-icon">S</div>
          <h1>{t('auth.superAdminLogin')}</h1>
          <p>{t('auth.superAdminLoginDesc')}</p>
        </div>

        {error && (
          <div className="alert alert-error">
            <span>⚠️</span>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="admin-email">
              {t('auth.email')}
            </label>
            <input
              id="admin-email"
              type="email"
              className={`form-input ${error ? 'error' : ''}`}
              placeholder={t('auth.enterEmail')}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              dir="ltr"
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="admin-password">
              {t('auth.password')}
            </label>
            <input
              id="admin-password"
              type="password"
              className={`form-input ${error ? 'error' : ''}`}
              placeholder={t('auth.enterPassword')}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              dir="ltr"
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-full btn-lg"
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="spinner"></span>
                {t('auth.signingIn')}
              </>
            ) : (
              t('auth.login')
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
