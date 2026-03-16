import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiRequest } from '../api';

export default function RegisterPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setLoading(true);
    setError('');

    try {
      const result = await apiRequest('/register', {
        method: 'POST',
        body: JSON.stringify(form),
      });

      sessionStorage.setItem('setupData', JSON.stringify(result));
      navigate('/setup-2fa');
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="card">
      <h2>Create account</h2>
      <p className="section-copy">
        Register with an email address and password. The backend hashes the password,
        generates a TOTP secret, and sends back a QR code for your authenticator app.
      </p>

      <form className="stack" onSubmit={handleSubmit}>
        <label>
          Email
          <input
            type="email"
            value={form.email}
            onChange={(event) => setForm({ ...form, email: event.target.value })}
            placeholder="you@example.com"
            required
          />
        </label>

        <label>
          Password
          <input
            type="password"
            value={form.password}
            onChange={(event) => setForm({ ...form, password: event.target.value })}
            placeholder="At least 8 characters"
            minLength={8}
            required
          />
        </label>

        <button type="submit" disabled={loading}>
          {loading ? 'Creating account...' : 'Register'}
        </button>
      </form>

      {error ? <p className="error-message">{error}</p> : null}
    </section>
  );
}
