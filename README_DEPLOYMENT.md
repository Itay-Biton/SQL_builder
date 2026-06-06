# SQL Builder - Production Deployment Guide (MySQL)

## Overview

This guide explains how to build and deploy SQL Builder as a single Windows executable that serves:

- React frontend
- Express backend API
- Authentication and audit logging

The backend is configured for MySQL.

## Prerequisites

### Build machine

- Node.js 18+
- npm

### Deployment machine

- Windows 10/11 or Windows Server
- Network access to a MySQL 8.0+ instance
- A MySQL user with read/schema metadata permissions

## Required environment configuration

Create `.env` in the same folder as the executable:

```env
PORT=3000

MYSQL_HOST=127.0.0.1
MYSQL_PORT=3306
MYSQL_DATABASE=sqlbuilder
MYSQL_USER=sqlbuilder_user
MYSQL_PASSWORD=change_me

# Set to true when TLS is required by your MySQL server
MYSQL_SSL=false
MYSQL_SSL_REJECT_UNAUTHORIZED=true

JWT_SECRET=change_this_to_a_strong_random_secret_minimum_32_characters
```

## Optional environment variables

```env
JWT_EXPIRATION=24h

DB_CONNECTION_RETRY_COUNT=3
DB_CONNECTION_RETRY_DELAY_MS=2000

MYSQL_CONNECTION_TIMEOUT=15000
MYSQL_POOL_MAX=10

USERS_FILE_PATH=./users.json
SCHEMA_CACHE_PATH=./schema_cache.json
LOG_DIR=./logs

LOG_RETENTION_DAYS=30
COMPRESSION_THRESHOLD_DAYS=1
```

## Build

From workspace root:

```bash
npm install
npm run build
```

Output executable:

- `dist/sql-builder-server.exe`

## Deploy

1. Create a folder, for example `C:\SQL_Builder`.
2. Copy:
   - `sql-builder-server.exe`
   - `.env`
3. Start:

```cmd
cd C:\SQL_Builder
sql-builder-server.exe
```

Expected startup includes:

- MySQL connection validation
- server listen URL
- selected database target

## First run behavior

The server creates local files if missing:

- `users.json`
- `logs/`
- `schema_cache.json` (after first refresh)

Default users are created in `users.json`:

- `admin` / `adminpass`
- `user` / `userpass`

Change both passwords immediately after first login.

## MySQL permissions

The configured MySQL user should have only what is needed.

Minimum typical grants:

```sql
GRANT SELECT ON sqlbuilder.* TO 'sqlbuilder_user'@'%';
GRANT SHOW VIEW ON sqlbuilder.* TO 'sqlbuilder_user'@'%';
GRANT SELECT ON information_schema.* TO 'sqlbuilder_user'@'%';
FLUSH PRIVILEGES;
```

Adjust host/database names to your environment.

## Security recommendations

- Use a strong `JWT_SECRET`.
- Restrict MySQL user to `SELECT`/metadata only.
- Prefer HTTPS via reverse proxy (IIS/nginx).
- Do not expose app port directly to the internet.
- Keep `.env` out of source control.

## Troubleshooting

### Connection failed

- Verify `MYSQL_HOST`, `MYSQL_PORT`, credentials, and DB name.
- Confirm MySQL is reachable from the deployment machine.
- Check firewall rules for MySQL port (default `3306`).
- If TLS is required, set `MYSQL_SSL=true` and verify cert policy.

### Login failed for app user

- Verify `MYSQL_USER` and `MYSQL_PASSWORD`.
- Confirm the user has access to `MYSQL_DATABASE`.

### Port already in use

- Change `PORT` in `.env`.
- Or stop the process already bound to that port.

## Optional: run as service (NSSM)

```cmd
nssm install SQLBuilder "C:\SQL_Builder\sql-builder-server.exe"
nssm set SQLBuilder AppDirectory "C:\SQL_Builder"
nssm set SQLBuilder Start SERVICE_AUTO_START
nssm start SQLBuilder
```
