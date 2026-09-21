# YU💠 Store

Full-stack blue glassmorphism digital store using Node.js, Express, SQLite, JWT cookies, bcrypt, and vanilla JavaScript. Sensitive state is server-side; no localStorage is used for authentication, orders, inventory, or keys.

## Setup
1. Install Node.js 20 or newer.
2. Copy `.env.example` to `.env`.
3. Set a random `JWT_SECRET` of at least 32 characters, plus an `ADMIN_USERNAME` and `ADMIN_PASSWORD` of at least 12 characters. Never commit `.env`.
4. Run `npm install`.
5. Run `npm start`.
6. Open `http://localhost:3000/` for the storefront and `http://localhost:3000/admin` for the protected admin area.

The first start creates `yu-store.db`, tables for users, products, orders, keys, and site settings, and seeds three sample products. Delete the database only when you intentionally want a fresh development seed.

## Payment and key workflow
Customers create orders as `Pending`; no payment is faked. An authenticated admin changes an order to `Paid`. The server transaction verifies stock, decrements it once, and then an admin generates one cryptographically random key. Only a SHA-256 hash is used for validation; the raw key is returned once to the admin. Redemption atomically changes the key to redeemed and returns the product download URL. A key cannot be redeemed twice.

Supported admin order statuses are `Pending`, `Paid`, and `Cancelled`. Admin APIs require an HttpOnly JWT cookie and return 401 when unauthenticated. Product IDs, prices, stock, order status, and key operations are validated server-side with parameterized SQLite statements.

## API summary
Public: `GET /api/site`, `POST /api/orders`, `GET /api/orders/:id`, `POST /api/redeem`.
Admin: `POST /api/admin/login`, `POST /api/admin/logout`, `GET/POST/PUT/DELETE /api/admin/products`, `PATCH /api/admin/products/:id/stock`, `GET /api/admin/orders`, `PATCH /api/admin/orders/:id/status`, `POST/GET /api/admin/keys`, `GET /api/admin/dashboard`, `PUT /api/admin/settings`.

## Production checklist
Use HTTPS, a secret manager, backups, a managed SQLite-compatible deployment for multiple instances, CSRF protection for cookie-authenticated deployments, real payment-provider webhooks, and real download storage/access controls. The included manual payment workflow deliberately requires human confirmation.

## Verification note
This repository can be verified locally with the commands above. Runtime/browser tests were not executed by the repository API editing session, so no unexecuted test is represented as passing here.
