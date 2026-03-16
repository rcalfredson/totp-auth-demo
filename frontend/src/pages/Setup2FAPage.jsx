import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiRequest } from '../api';

export default function Setup2FAPage() {
  const navigate = useNavigate();
  const [setupData, setSetupData] = useState(null);
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const rawData = sessionStorage.getItem('setupData');

    if (!rawData) {
      return;
    }

    setSetupData(JSON.parse(rawData));
  }, []);

  async function handleSubmit(event) {
    event.preventDefault();

    if (!setupData?.setupToken) {
      setError('Register first so the app can create a QR code and setup session.');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const result = await apiRequest('/2fa/verify-setup', {
        method: 'POST',
        body: JSON.stringify({
          setupToken: setupData.setupToken,
          code,
        }),
      });

      setSuccess(result.message);
      sessionStorage.removeItem('setupData');
      window.setTimeout(() => navigate('/login'), 900);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  if (!setupData) {
    return (
      <section className="card">
        <h2>2FA setup</h2>
        <p className="section-copy">
          No pending setup was found. Start by creating an account so the backend can
          generate a TOTP secret and QR code.
        </p>
        <Link className="link-button" to="/">
          Go to registration
        </Link>
      </section>
    );
  }

  return (
    <section className="card">
      <h2>Set up your authenticator app</h2>
      <p className="section-copy">
        Scan this QR code with Google Authenticator, 1Password, Authy, or another TOTP
        app. Then enter the current 6-digit code below to finish enabling 2FA.
      </p>

      <div className="qr-panel">
        <img className="qr-image" src={setupData.qrCodeDataUrl} alt="TOTP QR code" />
        <div>
          <p>
            <strong>Account:</strong> {setupData.email}
          </p>
          <p>
            <strong>Manual key:</strong> <code>{setupData.manualEntryKey}</code>
          </p>
        </div>
      </div>

      <form className="stack" onSubmit={handleSubmit}>
        <label>
          6-digit code
          <input
            type="text"
            inputMode="numeric"
            pattern="\d{6}"
            maxLength={6}
            value={code}
            onChange={(event) => setCode(event.target.value.replace(/\D/g, ''))}
            placeholder="123456"
            required
          />
        </label>

        <button type="submit" disabled={loading}>
          {loading ? 'Verifying...' : 'Enable 2FA'}
        </button>
      </form>

      {error ? <p className="error-message">{error}</p> : null}
      {success ? <p className="success-message">{success}</p> : null}
    </section>
  );
}
