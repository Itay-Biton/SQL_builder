# Demo DB - MySQL provisioning (Docker)

This folder contains a demo schema and seed data plus a Docker Compose setup for MySQL.

## Files

- `schema.sql` - demo table definitions
- `seed.sql` - demo seed data
- `docker-compose.yml` - MySQL container setup
- `create_db.js` - optional Node-based initializer using mysql2

## Quick start (Docker)

1. Copy and edit environment values:

```bash
cp Demo_DB/.env.example Demo_DB/.env
```

2. Start MySQL from the repository root:

```bash
docker compose -f Demo_DB/docker-compose.yml up -d
```

3. Wait until MySQL is healthy, then point the backend to the same credentials:

```env
MYSQL_HOST=127.0.0.1
MYSQL_PORT=3306
MYSQL_DATABASE=sqlbuilder
MYSQL_USER=sqlbuilder_user
MYSQL_PASSWORD=change_user_password
```

4. Start the backend:

```bash
cd SQL_Builder_Server
npm install
npm start
```

## Optional initializer script

If you want to apply `schema.sql` and `seed.sql` manually from Node:

```bash
cd Demo_DB
npm install mysql2 dotenv
node create_db.js
```

The script reads `Demo_DB/.env` and applies SQL files to the configured MySQL database.
