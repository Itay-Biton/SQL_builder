# SQL Builder - Quick Start (Linux ARM64)

This package is for **64-bit ARM Linux** (`aarch64`), for example:

- Linux VM on Apple Silicon Mac (Ubuntu ARM64, etc.)
- Raspberry Pi 4/5 (64-bit OS)
- AWS Graviton and other ARM cloud instances

For Intel/AMD Linux (`x86_64`), use the `dist-linux` package instead.

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

Verify your architecture (should print `aarch64`):

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
- See `How-To-Use.md` for a full user guide.

## Common issues

- **exec format error** — you may be on x86_64 Linux; use `dist-linux` instead.
- MySQL connection errors: verify host/port/credentials/database.
- App port in use: change `PORT`.
- Empty tables/schema: refresh schema as admin.
