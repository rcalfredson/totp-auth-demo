import { useState } from 'react';
import { apiRequest } from '../api';

export default function LoginPage() {
  const [credentials, setCredentials] = useState({ email: '', password: '' });
  const [totpCode, setTotpCode] = useState('');
  const [tempToken, setTempToken] = useState('');
  const [sessionToken, setSessionToken] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handlePasswordSubmit(event) {
    event.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');
    setSessionToken('');

    try {
      const result = await apiRequest('/login/password', {
        method: 'POST',
        body: JSON.stringify(credentials),
      });

      setTempToken(result.tempToken);
      setMessage(result.message);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleTotpSubmit(event) {
    event.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    try {
      const result = await apiRequest('/login/totp', {
        method: 'POST',
        body: JSON.stringify({
          tempToken,
          code: totpCode,
        }),
      });

      setSessionToken(result.token);
      setMessage(result.message);
      localStorage.setItem('demoJwt', result.token);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="card">
      <h2>Login</h2>
      <p className="section-copy">
        This demo uses a two-step login flow. First the backend validates the password,
        then it asks for a TOTP code before issuing a JWT session token.
      </p>

      <form className="stack" onSubmit={handlePasswordSubmit}>
        <label>
          Email
          <input
            type="email"
            value={credentials.email}
            onChange={(event) =>
              setCredentials({ ...credentials, email: event.target.value })
            }
            required
          />
        </label>

        <label>
          Password
          <input
            type="password"
            value={credentials.password}
            onChange={(event) =>
              setCredentials({ ...credentials, password: event.target.value })
            }
            required
          />
        </label>

        <button type="submit" disabled={loading || Boolean(tempToken)}>
          {loading && !tempToken ? 'Checking password...' : 'Step 1: Verify password'}
        </button>
      </form>

      <form className="stack secondary-form" onSubmit={handleTotpSubmit}>
        <label>
          Authenticator code
          <input
            type="text"
            inputMode="numeric"
            pattern="\d{6}"
            maxLength={6}
            value={totpCode}
            onChange={(event) => setTotpCode(event.target.value.replace(/\D/g, ''))}
            placeholder="123456"
            required
            disabled={!tempToken}
          />
        </label>

        <button type="submit" disabled={loading || !tempToken}>
          {loading && tempToken ? 'Verifying TOTP...' : 'Step 2: Verify TOTP'}
        </button>
      </form>

      {message ? <p className="success-message">{message}</p> : null}
      {error ? <p className="error-message">{error}</p> : null}

      {sessionToken ? (
        <div className="token-panel">
          <p>
            <strong>JWT token issued</strong>
          </p>
          <code>{sessionToken}</code>
        </div>
      ) : null}
    </section>
  );
}
