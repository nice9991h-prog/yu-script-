# YU💠 Store

Production-oriented full-stack starter for the YU💠 digital creator store. The browser never stores the database, admin password, or redeemable key: products, orders, payments, keys, and settings are managed by the Express API and SQLite database.

## Run
1. Copy `.env.example` to `.env` and set a long random `JWT_SECRET` and strong `ADMIN_PASSWORD`.
2. Run `npm install`.
3. Run `npm start` and open `http://localhost:3000`.
4. Admin is at `/admin` and uses the configured email/password.

For production, use HTTPS, a managed database, a secrets manager, backups, a real payment provider webhook, and replace the default SQLite adapter if deploying multiple server instances. The manual payment adapter intentionally leaves orders Pending until an authenticated admin marks them Paid; only then can a key be generated. Redeem is atomic and server-side, so a key can be used once.
