# YU💠 Store

A full-stack blue-glass digital creator store using Express, SQLite, JWT authentication, and server-side purchase-key validation.

## Setup
1. Install Node.js 20+.
2. Copy `.env.example` to `.env`.
3. Set a long random `JWT_SECRET`, a strong `ADMIN_PASSWORD`, and your `ADMIN_EMAIL`. Do not commit `.env`.
4. Run `npm install`.
5. Run `npm start` (or `npm run dev` during development).
6. Open `http://localhost:3000`; the protected admin app is at `/admin`.

The first server start creates the SQLite schema and seeds sample products. The database file is `yu-store.db` by default and is intentionally not served as a static file.

## Store flow
Customers create an order through the server API. New orders are `Pending`; payment is intentionally modular and currently manual. An authenticated admin changes an order to `Paid`, then generates one server-side key. The key is stored only as a SHA-256 hash, and redemption uses an atomic update so a key cannot be redeemed twice. A successful redemption returns the configured download URL.

Supported order states are `Pending`, `Paid`, `Completed`, `Failed`, and `Cancelled`. Product price, stock, payment status, and key validity are always checked by the server.

## Production checklist
Use HTTPS, a managed secrets manager, backups, a real payment-provider webhook, CSRF protection appropriate to your deployment, and a managed database or a single durable SQLite host. Replace placeholder image/download/payment URLs and change the seeded admin credentials. Never put secrets in frontend JavaScript.
