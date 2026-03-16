# TOTP Auth Demo

A minimal full-stack web application that demonstrates authenticator-app-based
two-factor authentication using:

- Backend: Node.js, Express, SQLite
- Frontend: React with Vite
- Security libraries: `bcrypt`, `speakeasy`, `qrcode`, `jsonwebtoken`

## Features

- Account creation with hashed password storage
- TOTP secret generation and QR code setup
- Two-step login with password verification followed by TOTP verification
- SQLite-backed user storage

## Project Structure

```text
backend/   Express API + SQLite database
frontend/  React Vite app
```

## Backend Setup

1. Install dependencies:

   ```bash
   cd backend
   npm install
   ```

2. Create an environment file:

   ```bash
   cp .env.example .env
   ```

3. Update `JWT_SECRET` in `backend/.env` to a long random value.

4. Start the backend:

   ```bash
   npm run dev
   ```

The API runs on `http://localhost:4000`.

## Frontend Setup

1. Install dependencies:

   ```bash
   cd frontend
   npm install
   ```

2. Create an environment file:

   ```bash
   cp .env.example .env
   ```

3. Start the frontend:

   ```bash
   npm run dev
   ```

The app runs on `http://localhost:5173`.

## Demo Flow

1. Open the Register page and create an account.
2. Scan the QR code on the 2FA Setup page with Google Authenticator, Authy,
   1Password, or another TOTP app.
3. Enter the current 6-digit authenticator code to enable 2FA.
4. Go to the Login page.
5. Submit your email and password.
6. Enter the current TOTP code to receive a JWT token.

## Resetting the Demo

To start over from a clean state, delete `backend/database.sqlite` and restart
the backend. If you also want to clear browser-side demo state, remove the
stored `localStorage` and `sessionStorage` values in your browser.

## API Endpoints

- `POST /api/register`
  - Body: `{ "email": "user@example.com", "password": "password123" }`
- `POST /api/2fa/verify-setup`
  - Body: `{ "setupToken": "...", "code": "123456" }`
- `POST /api/login/password`
  - Body: `{ "email": "user@example.com", "password": "password123" }`
- `POST /api/login/totp`
  - Body: `{ "tempToken": "...", "code": "123456" }`

## Security Notes

- Passwords are hashed with `bcrypt`.
- TOTP secrets are stored in base32 format.
- TOTP verification uses a 30-second step with a one-step clock window.
- Plaintext passwords are never stored.
- Input validation is intentionally basic to keep the demo focused.
