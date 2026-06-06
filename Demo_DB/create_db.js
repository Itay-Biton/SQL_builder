// Initialize a MySQL database using Demo_DB/schema.sql and Demo_DB/seed.sql
// Usage:
//   cd Demo_DB
//   npm install mysql2 dotenv
//   node create_db.js

const fs = require("fs");
const path = require("path");
const mysql = require("mysql2/promise");

try {
  require("dotenv").config({ path: path.join(__dirname, ".env") });
} catch (_e) {
  // dotenv is optional if env vars are already provided
}

const DIR = __dirname;
const SCHEMA_FILE = path.join(DIR, "schema.sql");
const SEED_FILE = path.join(DIR, "seed.sql");

const config = {
  host: process.env.MYSQL_HOST || "127.0.0.1",
  port: process.env.MYSQL_PORT ? parseInt(process.env.MYSQL_PORT, 10) : 3306,
  database: process.env.MYSQL_DATABASE || "sqlbuilder",
  user: process.env.MYSQL_USER || "root",
  password: process.env.MYSQL_PASSWORD || process.env.MYSQL_ROOT_PASSWORD || "",
  multipleStatements: true,
};

async function main() {
  if (!fs.existsSync(SCHEMA_FILE)) {
    console.error("Missing schema.sql in Demo_DB");
    process.exit(1);
  }

  const schemaSql = fs.readFileSync(SCHEMA_FILE, "utf8");
  const seedSql = fs.existsSync(SEED_FILE) ? fs.readFileSync(SEED_FILE, "utf8") : "";

  const connection = await mysql.createConnection(config);

  try {
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${config.database}\``);
    await connection.query(`USE \`${config.database}\``);

    console.log("Applying schema.sql...");
    await connection.query(schemaSql);

    if (seedSql.trim()) {
      console.log("Applying seed.sql...");
      await connection.query(seedSql);
    }

    console.log(`Done. MySQL database initialized: ${config.host}:${config.port}/${config.database}`);
  } finally {
    await connection.end();
  }
}

main().catch((err) => {
  console.error("Database initialization failed:", err.message);
  process.exit(1);
});
