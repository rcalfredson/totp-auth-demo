import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import QRCode from 'qrcode';
import speakeasy from 'speakeasy';
import db, { initializeDatabase } from './db.js';

dotenv.config();

const app = express();
const HOST = process.env.HOST || '127.0.0.1';
const PORT = Number(process.env.PORT) || 4000;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173';
const JWT_SECRET = process.env.JWT_SECRET || 'development-jwt-secret';
const JWT_EXPIRES_IN = '1h';
const TEMP_TOKEN_EXPIRES_IN = '5m';
const BCRYPT_ROUNDS = 10;

app.use(
  cors({
    origin: CLIENT_ORIGIN,
  })
);
app.use(express.json());

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function signJwt(payload, expiresIn) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn });
}

function verifyTotpToken(secret, token) {
  return speakeasy.totp.verify({
    secret,
    encoding: 'base32',
    token,
    window: 1,
    step: 30,
  });
}

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

app.post('/api/register', async (req, res) => {
  const email = normalizeEmail(req.body.email);
  const password = String(req.body.password || '');

  if (!isValidEmail(email)) {
    return res.status(400).json({ error: 'Please provide a valid email address.' });
  }

  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters long.' });
  }

  try {
    const existingUser = db
      .prepare('SELECT id FROM users WHERE email = ?')
      .get(email);

    if (existingUser) {
      return res.status(409).json({ error: 'An account with that email already exists.' });
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const secret = speakeasy.generateSecret({
      name: `TOTP Auth Demo (${email})`,
      issuer: 'TOTP Auth Demo',
      length: 20,
    });

    const insertResult = db
      .prepare(
        'INSERT INTO users (email, password_hash, totp_secret, twofa_enabled) VALUES (?, ?, ?, 0)'
      )
      .run(email, passwordHash, secret.base32);

    const qrCodeDataUrl = await QRCode.toDataURL(secret.otpauth_url);
    const userId = Number(insertResult.lastInsertRowid);
    const setupToken = signJwt({ purpose: '2fa_setup', userId }, TEMP_TOKEN_EXPIRES_IN);

    return res.status(201).json({
      message: 'Account created. Scan the QR code to finish setting up 2FA.',
      userId,
      setupToken,
      qrCodeDataUrl,
      manualEntryKey: secret.base32,
      email,
    });
  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({ error: 'Unable to create account.' });
  }
});

app.post('/api/2fa/verify-setup', async (req, res) => {
  const code = String(req.body.code || '').trim();
  const setupToken = String(req.body.setupToken || '');

  if (!/^\d{6}$/.test(code)) {
    return res.status(400).json({ error: 'Enter a valid 6-digit code.' });
  }

  try {
    const decoded = jwt.verify(setupToken, JWT_SECRET);

    if (decoded.purpose !== '2fa_setup') {
      return res.status(401).json({ error: 'Invalid setup token.' });
    }

    const user = db
      .prepare('SELECT id, totp_secret FROM users WHERE id = ?')
      .get(decoded.userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const isValidCode = verifyTotpToken(user.totp_secret, code);

    if (!isValidCode) {
      return res.status(401).json({ error: 'The authenticator code is incorrect.' });
    }

    db.prepare('UPDATE users SET twofa_enabled = 1 WHERE id = ?').run(user.id);

    return res.json({ message: 'Two-factor authentication is enabled. You can now log in.' });
  } catch (error) {
    console.error('2FA setup verification error:', error);
    return res.status(401).json({ error: 'Setup session expired or invalid.' });
  }
});

app.post('/api/login/password', async (req, res) => {
  const email = normalizeEmail(req.body.email);
  const password = String(req.body.password || '');

  if (!isValidEmail(email) || password.length === 0) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  try {
    const user = db
      .prepare('SELECT id, email, password_hash, twofa_enabled FROM users WHERE email = ?')
      .get(email);

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const passwordMatches = await bcrypt.compare(password, user.password_hash);

    if (!passwordMatches) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    if (!user.twofa_enabled) {
      return res.status(403).json({
        error: 'Two-factor authentication has not been enabled for this account yet.',
      });
    }

    const tempToken = signJwt({ purpose: 'login_2fa', userId: user.id }, TEMP_TOKEN_EXPIRES_IN);

    return res.json({
      message: 'Password accepted. Enter your authenticator code.',
      tempToken,
    });
  } catch (error) {
    console.error('Password login error:', error);
    return res.status(500).json({ error: 'Unable to process login.' });
  }
});

app.post('/api/login/totp', async (req, res) => {
  const code = String(req.body.code || '').trim();
  const tempToken = String(req.body.tempToken || '');

  if (!/^\d{6}$/.test(code)) {
    return res.status(400).json({ error: 'Enter a valid 6-digit code.' });
  }

  try {
    const decoded = jwt.verify(tempToken, JWT_SECRET);

    if (decoded.purpose !== 'login_2fa') {
      return res.status(401).json({ error: 'Invalid login token.' });
    }

    const user = db
      .prepare('SELECT id, email, totp_secret, twofa_enabled FROM users WHERE id = ?')
      .get(decoded.userId);

    if (!user || !user.twofa_enabled) {
      return res.status(401).json({ error: '2FA is not enabled for this user.' });
    }

    const isValidCode = verifyTotpToken(user.totp_secret, code);

    if (!isValidCode) {
      return res.status(401).json({ error: 'The authenticator code is incorrect.' });
    }

    const token = signJwt({ sub: user.id, email: user.email }, JWT_EXPIRES_IN);

    return res.json({
      message: 'Login successful.',
      token,
    });
  } catch (error) {
    console.error('TOTP login error:', error);
    return res.status(401).json({ error: 'Login session expired or invalid.' });
  }
});

initializeDatabase()
  .then(() => {
    app.listen(PORT, HOST, () => {
      console.log(`Backend listening on http://${HOST}:${PORT}`);
    });
  })
  .catch((error) => {
    console.error('Failed to initialize database:', error);
    process.exit(1);
  });
