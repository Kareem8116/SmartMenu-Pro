import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../hooks/useAuth';
import { verifyStaffPIN } from '../../services/auth';
import LanguageToggle from '../../components/LanguageToggle';

export default function StaffPIN() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, setStaff, isAuthenticated, isStation } = useAuth();
  const [pin, setPin] = useState(['', '', '', '']);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [shake, setShake] = useState(false);
  const inputRefs = useRef([]);

  // Redirect if not a station account
  useEffect(() => {
    if (!isAuthenticated || !isStation) {
      navigate('/login', { replace: true });
    }
  }, [isAuthenticated, isStation, navigate]);

  const handlePinChange = (index, value) => {
    if (!/^\d*$/.test(value)) return; // Numbers only

    const newPin = [...pin];
    newPin[index] = value.slice(-1); // Single digit
    setPin(newPin);
    setError('');

    // Auto-focus next input
    if (value && index < 3) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all 4 digits entered
    if (value && index === 3 && newPin.every(d => d !== '')) {
      handleSubmit(newPin.join(''));
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !pin[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleKeypadPress = (digit) => {
    const emptyIndex = pin.findIndex(d => d === '');
    if (emptyIndex === -1) return;

    const newPin = [...pin];
    newPin[emptyIndex] = digit.toString();
    setPin(newPin);
    setError('');

    // Auto-submit when all 4 digits entered
    if (emptyIndex === 3) {
      handleSubmit(newPin.join(''));
    }
  };

  const handleDelete = () => {
    const lastFilledIndex = pin.reduce((last, d, i) => (d !== '' ? i : last), -1);
    if (lastFilledIndex === -1) return;

    const newPin = [...pin];
    newPin[lastFilledIndex] = '';
    setPin(newPin);
    setError('');
  };

  const handleSubmit = async (pinCode) => {
    if (!pinCode || pinCode.length !== 4) return;

    setLoading(true);
    setError('');

    try {
      const result = await verifyStaffPIN(user.branchId, pinCode);
      
      if (result.valid) {
        setStaff(result.staff);
        
        // Navigate based on station type
        if (user.stationType === 'pos') {
          navigate('/dashboard', { replace: true });
        } else if (user.stationType === 'kds') {
          navigate('/kds', { replace: true });
        } else {
          navigate('/dashboard', { replace: true });
        }
      } else {
        triggerError();
      }
    } catch (err) {
      console.error('PIN verification error:', err);
      triggerError();
    } finally {
      setLoading(false);
    }
  };

  const triggerError = () => {
    setError(t('auth.pinError'));
    setShake(true);
    setPin(['', '', '', '']);
    inputRefs.current[0]?.focus();
    setTimeout(() => setShake(false), 500);
  };

  return (
    <div className="auth-container">
      <LanguageToggle />
      
      <div className={`auth-card ${shake ? 'shake' : ''}`}>
        <div className="logo-section">
          <div className="landing-logo-icon">S</div>
          <h1>{t('auth.pinTitle')}</h1>
          <p>{t('auth.pinDesc')}</p>
        </div>

        {error && (
          <div className="alert alert-error">
            <span>⚠️</span>
            {error}
          </div>
        )}

        {/* PIN Input Boxes */}
        <div className="pin-container">
          {pin.map((digit, index) => (
            <input
              key={index}
              ref={(el) => (inputRefs.current[index] = el)}
              type="text"
              inputMode="numeric"
              className="pin-digit"
              value={digit}
              onChange={(e) => handlePinChange(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              maxLength={1}
              autoFocus={index === 0}
              disabled={loading}
              aria-label={`PIN digit ${index + 1}`}
            />
          ))}
        </div>

        {/* Touch-friendly Keypad */}
        <div className="pin-keypad">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
            <button
              key={num}
              className="pin-key"
              onClick={() => handleKeypadPress(num)}
              disabled={loading}
              type="button"
            >
              {num}
            </button>
          ))}
          <button
            className="pin-key delete"
            onClick={handleDelete}
            disabled={loading}
            type="button"
            aria-label="Delete"
          >
            ⌫
          </button>
          <button
            className="pin-key"
            onClick={() => handleKeypadPress(0)}
            disabled={loading}
            type="button"
          >
            0
          </button>
          <button
            className="pin-key submit"
            onClick={() => handleSubmit(pin.join(''))}
            disabled={loading || pin.some(d => d === '')}
            type="button"
            aria-label="Submit"
          >
            {loading ? '...' : '✓'}
          </button>
        </div>

        {/* Loading indicator */}
        {loading && (
          <div style={{ textAlign: 'center', marginTop: '1rem' }}>
            <span className="spinner" style={{ display: 'inline-block' }}></span>
            <p style={{ color: 'var(--color-text-secondary)', marginTop: '0.5rem', fontSize: '0.875rem' }}>
              {t('auth.verifying')}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
