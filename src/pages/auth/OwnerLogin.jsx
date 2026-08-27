import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { signIn } from '../../services/auth';
import LanguageToggle from '../../components/LanguageToggle';

export default function OwnerLogin() {
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
      
      if (userData.role === 'owner') {
        navigate('/owner/dashboard', { replace: true });
      } else if (userData.role === 'superadmin') {
        navigate('/super-admin/dashboard', { replace: true });
      } else {
        // Not an owner account — redirect to station flow
        navigate('/pin', { replace: true });
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
          <h1>{t('auth.ownerLogin')}</h1>
          <p>{t('auth.ownerLoginDesc')}</p>
        </div>

        {error && (
          <div className="alert alert-error">
            <span>⚠️</span>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="owner-email">
              {t('auth.email')}
            </label>
            <input
              id="owner-email"
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
            <label className="form-label" htmlFor="owner-password">
              {t('auth.password')}
            </label>
            <input
              id="owner-password"
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
        }}>
          <Link 
            to="/login" 
            style={{ 
              color: 'var(--color-accent)', 
              textDecoration: 'none', 
              fontSize: '0.875rem',
              fontWeight: '500'
            }}
          >
            {t('auth.switchToStation')} →
          </Link>
        </div>
      </div>
    </div>
  );
}
