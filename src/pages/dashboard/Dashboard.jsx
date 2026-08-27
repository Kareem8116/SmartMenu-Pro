import { useTranslation } from 'react-i18next';
import { useAuth } from '../../hooks/useAuth';
import LanguageToggle from '../../components/LanguageToggle';

export default function Dashboard() {
  const { t } = useTranslation();
  const { user, staffInfo, signOut } = useAuth();

  const getRoleBadgeClass = () => {
    if (user?.role === 'superadmin') return 'superadmin';
    if (user?.role === 'owner') return 'owner';
    if (staffInfo?.role) return staffInfo.role;
    return 'admin';
  };

  const getRoleLabel = () => {
    if (user?.role === 'superadmin') return t('roles.superadmin');
    if (user?.role === 'owner') return t('roles.owner');
    if (staffInfo?.role) return t(`roles.${staffInfo.role}`);
    if (user?.stationType) return user.stationType.toUpperCase();
    return '';
  };

  return (
    <div className="dashboard-container">
      <LanguageToggle />

      <div className="dashboard-header">
        <div>
          <h1 style={{ marginBottom: '0.25rem' }}>
            {t('dashboard.welcome')}{staffInfo ? `, ${staffInfo.name}` : ''} 👋
          </h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span className={`role-badge ${getRoleBadgeClass()}`}>
              {getRoleLabel()}
            </span>
            {user?.branchId && (
              <span style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem' }}>
                Branch: {user.branchId}
              </span>
            )}
          </div>
        </div>

        <button className="btn btn-secondary" onClick={signOut}>
          {t('common.logout')}
        </button>
      </div>

      {/* Placeholder content — will be replaced in Phase 1+ */}
      <div style={{
        background: 'var(--color-bg)',
        borderRadius: 'var(--radius-xl)',
        border: '2px dashed var(--color-border)',
        padding: '3rem',
        textAlign: 'center',
        marginTop: '2rem',
      }}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🚧</div>
        <h2 style={{ color: 'var(--color-text-secondary)', marginBottom: '0.5rem' }}>
          Phase 0 Complete
        </h2>
        <p style={{ color: 'var(--color-text-muted)', maxWidth: '400px', margin: '0 auto' }}>
          Authentication is working. POS, KDS, and other features will be built in the next phases.
        </p>
      </div>

      {/* Debug info — remove in production */}
      <div style={{
        marginTop: '2rem',
        padding: '1rem',
        background: 'var(--color-bg-tertiary)',
        borderRadius: 'var(--radius-md)',
        fontSize: '0.8rem',
        fontFamily: 'monospace',
        color: 'var(--color-text-secondary)',
      }}>
        <strong>Debug Info:</strong>
        <pre style={{ marginTop: '0.5rem', whiteSpace: 'pre-wrap' }}>
          {JSON.stringify({ user, staffInfo }, null, 2)}
        </pre>
      </div>
    </div>
  );
}
