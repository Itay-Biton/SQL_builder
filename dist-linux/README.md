# SQL Builder - Quick Start (Linux x86_64)

This package is for **Intel/AMD 64-bit Linux** (`x86_64`).

For ARM Linux (`aarch64`) — e.g. Linux VM on Apple Silicon — use the `dist-linux-arm64` package instead.

## 1. Configure

1. Rename `.env.example` to `.env`.
2. Fill in MySQL and app settings:

```env
PORT=3000
MYSQL_HOST=127.0.0.1
MYSQL_PORT=3306
MYSQL_DATABASE=sqlbuilder
MYSQL_USER=sqlbuilder_user
MYSQL_PASSWORD=change_me
MYSQL_SSL=false
MYSQL_SSL_REJECT_UNAUTHORIZED=true
JWT_SECRET=change_this_to_a_strong_random_secret_32_chars_minimum
```

## 2. Run

Verify your architecture (should print `x86_64`):

```bash
uname -m
```

Make the executable and start it:

```bash
chmod +x sql-builder-server
./sql-builder-server
```

The app validates MySQL, then serves the UI on `http://localhost:3000`.

## 3. Login

Default first-run users:

- `admin` / `adminpass` (admin)
- `user` / `userpass` (user)

Change passwords immediately.

## Notes

- Use `POST /api/schema/refresh` as admin after first login to build schema cache.
- The backend accepts only single `SELECT` queries.
- Logs are stored in `logs/`.
- Main config template is `.env.example`.

## Common issues

- **exec format error** — you may be on ARM Linux (`aarch64`); use `dist-linux-arm64` instead.
- MySQL connection errors: verify host/port/credentials/database.
- App port in use: change `PORT`.
- Empty tables/schema: refresh schema as admin.
