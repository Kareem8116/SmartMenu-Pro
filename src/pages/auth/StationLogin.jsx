import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { signIn } from '../../services/auth';
import LanguageToggle from '../../components/LanguageToggle';

export default function StationLogin() {
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
      
      if (userData.role === 'station') {
        // Station login successful — go to PIN screen
        navigate('/pin');
      } else if (userData.role === 'owner') {
        navigate('/owner/dashboard');
      } else if (userData.role === 'superadmin') {
        navigate('/super-admin/dashboard');
      } else {
        setError(t('auth.loginError'));
      }
    } catch (err) {
      console.error('Login error:', err);
      if (err.code === 'auth/user-disabled') {
        setError(t('auth.accountDisabled'));
      } else {
        setError(t('auth.loginError'));
      }
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
          <h1>{t('app.name')}</h1>
          <p>{t('auth.stationLoginDesc')}</p>
        </div>

        {error && (
          <div className="alert alert-error">
            <span>⚠️</span>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="station-email">
              {t('auth.email')}
            </label>
            <input
              id="station-email"
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
            <label className="form-label" htmlFor="station-password">
              {t('auth.password')}
            </label>
            <input
              id="station-password"
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

        <div style={{ 
          textAlign: 'center', 
          marginTop: '1.5rem',
          paddingTop: '1.5rem',
          borderTop: `1px solid var(--color-border-light)`,
          display: 'flex',
          flexDirection: 'column',
          gap: '0.5rem'
        }}>
          <Link 
            to="/owner/login" 
            style={{ 
              color: 'var(--color-accent)', 
              textDecoration: 'none', 
              fontSize: '0.875rem',
              fontWeight: '500'
            }}
          >
            {t('auth.switchToOwner')} →
          </Link>
        </div>
      </div>
    </div>
  );
}
