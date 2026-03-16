import { NavLink, Route, Routes } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import Setup2FAPage from './pages/Setup2FAPage';

export default function App() {
  return (
    <div className="app-shell">
      <header className="hero">
        <div>
          <p className="eyebrow">Minimal full-stack demo</p>
          <h1>TOTP-based two-factor authentication</h1>
          <p className="hero-copy">
            Create an account, scan the QR code with an authenticator app, then log in
            with your password and a time-based one-time passcode.
          </p>
        </div>
        <nav className="nav">
          <NavLink to="/" end>
            Register
          </NavLink>
          <NavLink to="/login">Login</NavLink>
          <NavLink to="/setup-2fa">2FA Setup</NavLink>
        </nav>
      </header>

      <main className="page-frame">
        <Routes>
          <Route path="/" element={<RegisterPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/setup-2fa" element={<Setup2FAPage />} />
        </Routes>
      </main>
    </div>
  );
}
