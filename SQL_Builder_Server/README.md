# SQL_Builder_Server

Backend server for the Visual SQL Builder UI.

This server exposes REST endpoints for authentication, schema browsing, table previews, and read-only query execution against a MySQL database.

## Requirements

- Node.js 18+
- A reachable MySQL 8.0+ instance

## Quick start

1. Install dependencies:

```bash
cd SQL_Builder_Server
npm install
```

2. Create your environment file:

```bash
cp .env.example .env
```

3. Edit `.env` with your MySQL values:

```env
PORT=3000
MYSQL_HOST=127.0.0.1
MYSQL_PORT=3306
MYSQL_DATABASE=sqlbuilder
MYSQL_USER=sqlbuilder_user
MYSQL_PASSWORD=change_me
MYSQL_SSL=false
JWT_SECRET=change_this_to_a_strong_random_secret_key_for_production
```

4. Start the server:

```bash
npm start
```

## API summary

- `GET /api/tables` - list table names
- `GET /api/tables/:name?limit=100&offset=0` - paged table data preview
- `GET /api/tables/:name/count` - row count
- `GET /api/schema` - cached schema metadata
- `POST /api/schema/refresh` - refresh schema cache (admin only)
- `POST /api/query` - run a single SELECT statement
- `POST /api/auth/login` - login and receive JWT token
- `GET /api/auth/me` - current user info

## Security model

- Only single `SELECT` statements are allowed by `POST /api/query`.
- Multi-statement SQL and semicolons are rejected.
- API routes require JWT authentication unless explicitly public.
- User and role management is admin-only.

## Demo database

Use the MySQL demo setup in [../Demo_DB/README.md](../Demo_DB/README.md).
